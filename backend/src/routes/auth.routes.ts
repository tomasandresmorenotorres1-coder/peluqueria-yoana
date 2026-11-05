/**
 * Cuentas de usuario: registro de clientes con PIN vía email, inicio de sesión y datos propios.
 * Base: /api/auth
 */
import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { autenticar, firmarToken, Rol } from '../middleware/auth';
import { limitarIntentos } from '../middleware/limitador';
import {
    HASH_FALSO, comprobarPassword, emailValido, hashearPassword,
    nombreValido, normalizarEmail, telefonoValido, validarPassword,
} from '../utils/usuarios';
import { enviarPinRegistro } from '../utils/email';

const router = Router();

// Login y cambio de contraseña: máximo 10 intentos FALLIDOS cada 15 minutos por IP
const limitarLogin = limitarIntentos(10, 15 * 60 * 1000, 'fallos');
const limitarCambioPassword = limitarIntentos(10, 15 * 60 * 1000, 'fallos');
// Registro y solicitud de PIN: máximo 15 por hora por IP
const limitarRegistro = limitarIntentos(15, 60 * 60 * 1000, 'todos');

const datosPublicos = (u: any) => ({
    id: u.id,
    email: u.email,
    nombre_completo: u.nombre_completo,
    rol: u.rol as Rol,
    equipo_id: u.equipo_id,
    cliente_id: u.cliente_id,
    telefono: u.telefono,
});

// ---------------------------------------------------------------------
// 1. SOLICITAR PIN DE REGISTRO (CLIENTE)
//    Genera PIN de 6 dígitos numéricos, lo guarda temporalmente y lo envía por email
// ---------------------------------------------------------------------
router.post('/solicitar-pin-registro', limitarRegistro, async (req: Request, res: Response) => {
    try {
        const { nombre_completo, telefono_whatsapp, password } = req.body;
        const email = normalizarEmail(req.body.email);

        if (!nombreValido(nombre_completo)) {
            return res.status(400).json({ ok: false, error: 'El nombre debe tener entre 2 y 150 caracteres' });
        }
        if (!emailValido(email)) {
            return res.status(400).json({ ok: false, error: 'El correo electrónico no es válido' });
        }
        if (!telefonoValido(telefono_whatsapp)) {
            return res.status(400).json({ ok: false, error: 'El teléfono de WhatsApp no es válido' });
        }
        const errorPassword = validarPassword(password);
        if (errorPassword) return res.status(400).json({ ok: false, error: errorPassword });

        // Verificar si ya existe una cuenta con ese correo
        const { rows: existente } = await pool.query(
            'SELECT id FROM usuarios WHERE LOWER(email) = $1',
            [email]
        );
        if (existente.length > 0) {
            return res.status(409).json({ ok: false, error: 'Ya existe una cuenta registrada con este correo electrónico' });
        }

        // Generar PIN aleatorio de 6 dígitos numéricos
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        // Cifrado de contraseña con bcrypt (costo >= 10, usa 12 por defecto)
        const passwordHash = await hashearPassword(password);
        // Expiración en 15 minutos
        const expiraEn = new Date(Date.now() + 15 * 60 * 1000);

        // Desactivar pines anteriores no usados para este email
        await pool.query(
            'UPDATE registro_pines SET usado = TRUE WHERE LOWER(email) = $1 AND usado = FALSE',
            [email]
        );

        // Guardar nuevo PIN
        await pool.query(
            `INSERT INTO registro_pines (email, pin, nombre_completo, telefono_whatsapp, password_hash, expira_en)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [email, pin, nombre_completo.trim(), telefono_whatsapp.trim(), passwordHash, expiraEn]
        );

        // Enviar PIN por email usando Nodemailer
        await enviarPinRegistro(email, nombre_completo.trim(), pin);

        res.status(200).json({
            ok: true,
            mensaje: 'Hemos enviado un código PIN de 6 dígitos a tu correo electrónico. Por favor ingrésalo para verificar tu cuenta.',
            email,
        });
    } catch (error: any) {
        console.error('Error al solicitar PIN de registro:', error);
        res.status(500).json({ ok: false, error: 'Error interno al generar el PIN de verificación' });
    }
});

// ---------------------------------------------------------------------
// 2. VERIFICAR PIN Y COMPLETAR REGISTRO DE CLIENTE
// ---------------------------------------------------------------------
router.post('/verificar-pin', limitarRegistro, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const email = normalizarEmail(req.body.email);
        const pin = String(req.body.pin || '').trim();

        if (!email || !pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            return res.status(400).json({ ok: false, error: 'Debes ingresar el correo y el PIN numérico de 6 dígitos' });
        }

        const { rows } = await pool.query(
            `SELECT id, email, pin, nombre_completo, telefono_whatsapp, password_hash, expira_en, intentos, usado
             FROM registro_pines
             WHERE LOWER(email) = $1 AND usado = FALSE
             ORDER BY creado_en DESC
             LIMIT 1`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No hay ninguna solicitud de registro pendiente para este correo' });
        }

        const solicitud = rows[0];

        // Verificar expiración
        if (new Date() > new Date(solicitud.expira_en)) {
            await pool.query('UPDATE registro_pines SET usado = TRUE WHERE id = $1', [solicitud.id]);
            return res.status(400).json({ ok: false, error: 'El código PIN ha expirado. Por favor solicita uno nuevo.' });
        }

        // Verificar coincidencia de PIN
        if (solicitud.pin !== pin) {
            await pool.query('UPDATE registro_pines SET intentos = intentos + 1 WHERE id = $1', [solicitud.id]);
            if (solicitud.intentos + 1 >= 5) {
                await pool.query('UPDATE registro_pines SET usado = TRUE WHERE id = $1', [solicitud.id]);
                return res.status(400).json({ ok: false, error: 'Demasiados intentos fallidos. Debes solicitar un nuevo PIN.' });
            }
            return res.status(400).json({ ok: false, error: 'El código PIN ingresado es incorrecto' });
        }

        // PIN válido: iniciar transacción para insertar cliente y usuario
        await client.query('BEGIN');

        // Marcar PIN como usado
        await client.query('UPDATE registro_pines SET usado = TRUE WHERE id = $1', [solicitud.id]);

        // Verificar que no se haya registrado entretanto
        const checkUser = await client.query('SELECT id FROM usuarios WHERE LOWER(email) = $1', [email]);
        if (checkUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ ok: false, error: 'Este correo ya se encuentra registrado' });
        }

        // Insertar en clientes
        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email) VALUES ($1, $2, $3) RETURNING id`,
            [solicitud.nombre_completo, solicitud.telefono_whatsapp, email]
        );

        // Insertar en usuarios con rol 'CLIENTE'
        const usuarioRes = await client.query(
            `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, cliente_id, telefono)
             VALUES ($1, $2, $3, 'CLIENTE', $4, $5)
             RETURNING id, email, nombre_completo, rol, equipo_id, cliente_id, telefono`,
            [email, solicitud.password_hash, solicitud.nombre_completo, clienteRes.rows[0].id, solicitud.telefono_whatsapp]
        );

        await client.query('COMMIT');

        const usuario = usuarioRes.rows[0];
        res.status(201).json({
            ok: true,
            mensaje: '¡Cuenta verificada y creada exitosamente! Bienvenido a Peluquería Yohana.',
            token: firmarToken(usuario),
            usuario: datosPublicos(usuario),
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al verificar PIN de registro:', error);
        res.status(500).json({ ok: false, error: 'Error interno al verificar la cuenta' });
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------
// 3. REGISTRO DIRECTO (LEGACY/FALLBACK)
// ---------------------------------------------------------------------
router.post('/registro', limitarRegistro, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { nombre_completo, telefono_whatsapp, password } = req.body;
        const email = normalizarEmail(req.body.email);

        if (!nombreValido(nombre_completo)) {
            return res.status(400).json({ ok: false, error: 'El nombre debe tener entre 2 y 150 caracteres' });
        }
        if (!emailValido(email)) {
            return res.status(400).json({ ok: false, error: 'El correo no es válido' });
        }
        if (!telefonoValido(telefono_whatsapp)) {
            return res.status(400).json({ ok: false, error: 'El teléfono de WhatsApp no es válido' });
        }
        const errorPassword = validarPassword(password);
        if (errorPassword) return res.status(400).json({ ok: false, error: errorPassword });

        const hash = await hashearPassword(password);

        await client.query('BEGIN');
        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email) VALUES ($1, $2, $3) RETURNING id`,
            [nombre_completo.trim(), telefono_whatsapp.trim(), email]
        );
        const usuarioRes = await client.query(
            `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, cliente_id, telefono)
             VALUES ($1, $2, $3, 'CLIENTE', $4, $5)
             RETURNING id, email, nombre_completo, rol, equipo_id, cliente_id, telefono`,
            [email, hash, nombre_completo.trim(), clienteRes.rows[0].id, telefono_whatsapp.trim()]
        );
        await client.query('COMMIT');

        const usuario = usuarioRes.rows[0];
        res.status(201).json({ ok: true, token: firmarToken(usuario), usuario: datosPublicos(usuario) });
    } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese correo' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ ok: false, error: 'Error interno al crear la cuenta' });
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------
// 4. INICIAR SESIÓN (CLIENTE, ESPECIALISTA, ADMIN)
// ---------------------------------------------------------------------
router.post('/login', limitarLogin, async (req: Request, res: Response) => {
    try {
        const email = normalizarEmail(req.body.email);
        const { password } = req.body;
        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ ok: false, error: 'Correo y contraseña son obligatorios' });
        }

        const { rows } = await pool.query(
            `SELECT id, email, password_hash, nombre_completo, rol, equipo_id, cliente_id, telefono, activo
             FROM usuarios WHERE LOWER(email) = $1`,
            [email]
        );
        const usuario = rows[0];

        // Se compara siempre con un hash (real o falso) para que tarde igual y no revele si el correo existe
        const coincide = await comprobarPassword(password, usuario ? usuario.password_hash : HASH_FALSO);
        if (!usuario || !coincide || !usuario.activo) {
            return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' });
        }

        await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [usuario.id]);
        res.json({ ok: true, token: firmarToken(usuario), usuario: datosPublicos(usuario) });
    } catch (error: any) {
        if (String(error.message).includes('JWT_SECRET')) {
            return res.status(503).json({ ok: false, error: 'El servidor no tiene configurada la seguridad (JWT_SECRET)' });
        }
        console.error('Error en login:', error);
        res.status(500).json({ ok: false, error: 'Error interno al iniciar sesión' });
    }
});

// ---------------------------------------------------------------------
// 5. DATOS DE LA SESIÓN ACTUAL
// ---------------------------------------------------------------------
router.get('/me', autenticar, (req: Request, res: Response) => {
    res.json({ ok: true, usuario: datosPublicos(req.usuario) });
});

// ---------------------------------------------------------------------
// 6. CAMBIAR CONTRASEÑA
// ---------------------------------------------------------------------
router.post('/cambiar-password', autenticar, limitarCambioPassword, async (req: Request, res: Response) => {
    try {
        const { password_actual, password_nueva } = req.body;
        if (typeof password_actual !== 'string') {
            return res.status(400).json({ ok: false, error: 'Indica tu contraseña actual' });
        }
        const errorPassword = validarPassword(password_nueva);
        if (errorPassword) return res.status(400).json({ ok: false, error: errorPassword });

        const { rows } = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario!.id]);
        if (!(await comprobarPassword(password_actual, rows[0].password_hash))) {
            return res.status(401).json({ ok: false, error: 'La contraseña actual no es correcta' });
        }
        await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [
            await hashearPassword(password_nueva),
            req.usuario!.id,
        ]);
        res.json({ ok: true, mensaje: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ ok: false, error: 'Error interno al cambiar la contraseña' });
    }
});

export default router;

/**
 * Cuentas de usuario: registro de clientes, inicio de sesión y datos propios.
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

const router = Router();

// Login y cambio de contraseña: máximo 10 intentos FALLIDOS cada 15 minutos por IP
const limitarLogin = limitarIntentos(10, 15 * 60 * 1000, 'fallos');
const limitarCambioPassword = limitarIntentos(10, 15 * 60 * 1000, 'fallos');
// Registro: máximo 10 cuentas nuevas por hora por IP
const limitarRegistro = limitarIntentos(10, 60 * 60 * 1000, 'todos');

const datosPublicos = (u: any) => ({
    id: u.id,
    email: u.email,
    nombre_completo: u.nombre_completo,
    rol: u.rol as Rol,
    equipo_id: u.equipo_id,
    cliente_id: u.cliente_id,
});

// 1. Crear cuenta de CLIENTE (solo clientes se registran solos; estilistas y admins los crea el administrador)
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
        // Siempre se crea un cliente nuevo para la cuenta: así nadie puede "reclamar" las reservas
        // que otra persona hizo sin cuenta usando solo su nombre y teléfono.
        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email) VALUES ($1, $2, $3) RETURNING id`,
            [nombre_completo.trim(), telefono_whatsapp.trim(), email]
        );
        const usuarioRes = await client.query(
            `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, cliente_id)
             VALUES ($1, $2, $3, 'CLIENTE', $4)
             RETURNING id, email, nombre_completo, rol, equipo_id, cliente_id`,
            [email, hash, nombre_completo.trim(), clienteRes.rows[0].id]
        );
        await client.query('COMMIT');

        const usuario = usuarioRes.rows[0];
        res.status(201).json({ ok: true, token: firmarToken(usuario), usuario: datosPublicos(usuario) });
    } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese correo' });
        }
        if (String(error.message).includes('JWT_SECRET')) {
            return res.status(503).json({ ok: false, error: 'El servidor no tiene configurada la seguridad (JWT_SECRET)' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ ok: false, error: 'Error interno al crear la cuenta' });
    } finally {
        client.release();
    }
});

// 2. Iniciar sesión (cualquier rol)
router.post('/login', limitarLogin, async (req: Request, res: Response) => {
    try {
        const email = normalizarEmail(req.body.email);
        const { password } = req.body;
        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ ok: false, error: 'Correo y contraseña son obligatorios' });
        }

        const { rows } = await pool.query(
            `SELECT id, email, password_hash, nombre_completo, rol, equipo_id, cliente_id, activo
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

// 3. Datos de la sesión actual (sirve para saber quién es y mostrar su panel)
router.get('/me', autenticar, (req: Request, res: Response) => {
    res.json({ ok: true, usuario: datosPublicos(req.usuario) });
});

// 4. Cambiar la propia contraseña
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

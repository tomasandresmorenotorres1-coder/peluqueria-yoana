/**
 * Panel del ADMINISTRADOR: puede gestionar todo el negocio.
 * Base: /api/admin  (solo rol ADMIN)
 *
 * Secciones: usuarios · servicios · productos · equipo · turnos · reseñas · horarios de estilistas
 */
import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { autenticar, requireRol } from '../middleware/auth';
import {
    crearBloqueo, esFechaValida, guardarHorariosSemana, listarBloqueos,
    obtenerHorariosSemana, validarHorariosSemana,
} from '../utils/horarios';
import {
    emailValido, hashearPassword, nombreValido, normalizarEmail, telefonoValido, validarPassword,
} from '../utils/usuarios';

const router = Router();
router.use(autenticar, requireRol('ADMIN'));

// ---------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------
const leerId = (valor: unknown): number | null => {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
};

/** Traduce los errores típicos de PostgreSQL a mensajes entendibles. */
const responderErrorBD = (error: any, res: Response, contexto: string) => {
    if (error.code === '23503') {
        return res.status(400).json({ ok: false, error: 'Un dato relacionado no existe (por ejemplo, la categoría o el estilista)' });
    }
    if (error.code === '23514' || error.code === '22P02') {
        return res.status(400).json({ ok: false, error: 'Algún valor no es válido o está fuera del rango permitido' });
    }
    if (error.code === '23505') {
        return res.status(409).json({ ok: false, error: 'Ya existe un registro con esos datos' });
    }
    console.error(`Error en admin (${contexto}):`, error);
    return res.status(500).json({ ok: false, error: `Error interno: ${contexto}` });
};

/**
 * Crea y edita registros de las tablas del catálogo.
 * Los nombres de tabla y de columna salen de las listas de abajo (nunca del usuario),
 * y los valores siempre viajan como parámetros ($1, $2...), así no hay inyección SQL.
 */
const crearCatalogo = (tabla: string, obligatorios: string[], opcionales: string[]) => {
    const permitidos = [...obligatorios, ...opcionales];

    const crear = async (req: Request, res: Response) => {
        try {
            const faltan = obligatorios.filter((c) => req.body[c] === undefined || req.body[c] === null || req.body[c] === '');
            if (faltan.length > 0) {
                return res.status(400).json({ ok: false, error: `Faltan campos obligatorios: ${faltan.join(', ')}` });
            }
            const columnas = permitidos.filter((c) => req.body[c] !== undefined);
            const valores = columnas.map((c) => req.body[c]);
            const { rows } = await pool.query(
                `INSERT INTO ${tabla} (${columnas.join(', ')})
                 VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
                valores
            );
            res.status(201).json({ ok: true, data: rows[0] });
        } catch (error) {
            responderErrorBD(error, res, `crear en ${tabla}`);
        }
    };

    const editar = async (req: Request, res: Response) => {
        try {
            const id = leerId(req.params.id);
            if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
            const columnas = permitidos.filter((c) => req.body[c] !== undefined);
            if (columnas.length === 0) {
                return res.status(400).json({ ok: false, error: `Envía al menos uno de: ${permitidos.join(', ')}` });
            }
            const { rows } = await pool.query(
                `UPDATE ${tabla} SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
                 WHERE id = $${columnas.length + 1} RETURNING *`,
                [...columnas.map((c) => req.body[c]), id]
            );
            if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Registro no encontrado' });
            res.json({ ok: true, data: rows[0] });
        } catch (error) {
            responderErrorBD(error, res, `editar en ${tabla}`);
        }
    };

    // Activar o desactivar (no se borra, para no perder el historial de turnos y órdenes)
    const activar = async (req: Request, res: Response) => {
        try {
            const id = leerId(req.params.id);
            if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
            if (typeof req.body.activo !== 'boolean') {
                return res.status(400).json({ ok: false, error: 'Envía "activo": true o false' });
            }
            const { rows } = await pool.query(
                `UPDATE ${tabla} SET activo = $1 WHERE id = $2 RETURNING id, activo`,
                [req.body.activo, id]
            );
            if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Registro no encontrado' });
            res.json({ ok: true, data: rows[0] });
        } catch (error) {
            responderErrorBD(error, res, `activar en ${tabla}`);
        }
    };

    return { crear, editar, activar };
};

// ---------------------------------------------------------------------
// 1. USUARIOS
// ---------------------------------------------------------------------
router.get('/usuarios', async (req: Request, res: Response) => {
    try {
        const rol = req.query.rol ? String(req.query.rol).toUpperCase() : null;
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.nombre_completo, u.rol, u.activo, u.equipo_id, e.nombre AS estilista,
                    u.cliente_id, u.ultimo_acceso, u.creado_en
             FROM usuarios u LEFT JOIN equipo e ON e.id = u.equipo_id
             WHERE ($1::text IS NULL OR u.rol = $1)
             ORDER BY u.creado_en DESC`,
            [rol]
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        responderErrorBD(error, res, 'listar usuarios');
    }
});

// Crear un usuario ADMIN, ESTILISTA o CLIENTE.
// Un ESTILISTA debe vincularse a un perfil existente del equipo (equipo_id).
router.post('/usuarios', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { nombre_completo, password, rol, equipo_id, telefono_whatsapp } = req.body;
        const email = normalizarEmail(req.body.email);
        const rolNormalizado = String(rol || '').toUpperCase();

        if (!['ADMIN', 'ESTILISTA', 'CLIENTE'].includes(rolNormalizado)) {
            return res.status(400).json({ ok: false, error: 'rol debe ser ADMIN, ESTILISTA o CLIENTE' });
        }
        if (!nombreValido(nombre_completo)) return res.status(400).json({ ok: false, error: 'Nombre inválido' });
        if (!emailValido(email)) return res.status(400).json({ ok: false, error: 'Correo inválido' });
        const errorPassword = validarPassword(password);
        if (errorPassword) return res.status(400).json({ ok: false, error: errorPassword });

        let equipoId: number | null = null;
        if (rolNormalizado === 'ESTILISTA') {
            equipoId = leerId(equipo_id);
            if (!equipoId) return res.status(400).json({ ok: false, error: 'Un estilista necesita equipo_id (su perfil del equipo)' });
        }
        if (rolNormalizado === 'CLIENTE' && !telefonoValido(telefono_whatsapp)) {
            return res.status(400).json({ ok: false, error: 'Un cliente necesita telefono_whatsapp' });
        }

        const hash = await hashearPassword(password);
        await client.query('BEGIN');

        let clienteId: number | null = null;
        if (rolNormalizado === 'CLIENTE') {
            const c = await client.query(
                `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email) VALUES ($1, $2, $3) RETURNING id`,
                [nombre_completo.trim(), telefono_whatsapp.trim(), email]
            );
            clienteId = c.rows[0].id;
        }

        const { rows } = await client.query(
            `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, equipo_id, cliente_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, nombre_completo, rol, equipo_id, cliente_id, activo`,
            [email, hash, nombre_completo.trim(), rolNormalizado, equipoId, clienteId]
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, data: rows[0] });
    } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ ok: false, error: 'Ese correo ya existe, o ese estilista ya tiene una cuenta' });
        }
        responderErrorBD(error, res, 'crear usuario');
    } finally {
        client.release();
    }
});

// Activar/desactivar, cambiar nombre o restablecer la contraseña de un usuario
router.patch('/usuarios/:id', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        const { activo, nombre_completo, nueva_password } = req.body;

        if (activo === undefined && nombre_completo === undefined && nueva_password === undefined) {
            return res.status(400).json({ ok: false, error: 'Envía activo, nombre_completo o nueva_password' });
        }
        if (activo !== undefined && typeof activo !== 'boolean') {
            return res.status(400).json({ ok: false, error: 'activo debe ser true o false' });
        }
        // Evita que el admin se deje a sí mismo sin acceso
        if (activo === false && id === req.usuario!.id) {
            return res.status(400).json({ ok: false, error: 'No puedes desactivar tu propia cuenta' });
        }
        if (nombre_completo !== undefined && !nombreValido(nombre_completo)) {
            return res.status(400).json({ ok: false, error: 'Nombre inválido' });
        }
        let hash: string | null = null;
        if (nueva_password !== undefined) {
            const errorPassword = validarPassword(nueva_password);
            if (errorPassword) return res.status(400).json({ ok: false, error: errorPassword });
            hash = await hashearPassword(nueva_password);
        }

        const { rows } = await pool.query(
            `UPDATE usuarios SET
                activo = COALESCE($1, activo),
                nombre_completo = COALESCE($2, nombre_completo),
                password_hash = COALESCE($3, password_hash)
             WHERE id = $4
             RETURNING id, email, nombre_completo, rol, activo`,
            [activo ?? null, nombre_completo ? nombre_completo.trim() : null, hash, id]
        );
        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        res.json({ ok: true, data: rows[0] });
    } catch (error) {
        responderErrorBD(error, res, 'editar usuario');
    }
});

// ---------------------------------------------------------------------
// 2. SERVICIOS, PRODUCTOS Y EQUIPO (crear, editar, activar/desactivar)
//    Los cambios de precio rápidos siguen en PATCH /api/catalogo/.../precio
// ---------------------------------------------------------------------
const servicios = crearCatalogo(
    'servicios',
    ['categoria_id', 'nombre', 'descripcion', 'precio_actual', 'duracion_minutos', 'texto_alternativo'],
    ['icono', 'genero']
);
router.post('/servicios', servicios.crear);
router.put('/servicios/:id', servicios.editar);
router.patch('/servicios/:id/activo', servicios.activar);

const productos = crearCatalogo(
    'productos',
    ['categoria_id', 'nombre', 'precio_actual', 'imagen_url', 'texto_alternativo'],
    ['marca', 'descripcion', 'stock', 'etiqueta', 'genero']
);
router.post('/productos', productos.crear);
router.put('/productos/:id', productos.editar);
router.patch('/productos/:id/activo', productos.activar);

const equipo = crearCatalogo(
    'equipo',
    ['nombre', 'especialidad', 'foto_url', 'texto_alternativo'],
    ['biografia', 'anios_experiencia', 'genero', 'capacitado_accesibilidad']
);
router.post('/equipo', equipo.crear);
router.put('/equipo/:id', equipo.editar);
router.patch('/equipo/:id/activo', equipo.activar);

// ---------------------------------------------------------------------
// 3. TURNOS (ver todos y cambiar su estado)
// ---------------------------------------------------------------------
const ESTADOS_TURNO = ['PENDIENTE', 'CONFIRMADO', 'COMPLETADO', 'CANCELADO'];

router.get('/turnos', async (req: Request, res: Response) => {
    try {
        const { fecha, estado, equipo_id } = req.query;
        const params: any[] = [];
        let filtro = '';

        if (fecha !== undefined) {
            if (!esFechaValida(fecha)) return res.status(400).json({ ok: false, error: 'fecha inválida (YYYY-MM-DD)' });
            params.push(fecha);
            filtro += ` AND t.fecha = $${params.length}`;
        }
        if (estado !== undefined) {
            params.push(String(estado).toUpperCase());
            filtro += ` AND t.estado = $${params.length}`;
        }
        if (equipo_id !== undefined) {
            const eid = leerId(equipo_id);
            if (!eid) return res.status(400).json({ ok: false, error: 'equipo_id inválido' });
            params.push(eid);
            filtro += ` AND t.equipo_id = $${params.length}`;
        }

        const { rows } = await pool.query(
            `SELECT t.id, to_char(t.fecha, 'YYYY-MM-DD') AS fecha,
                    to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS hora_fin,
                    t.estado, t.precio_aplicado, s.nombre AS servicio, e.nombre AS estilista,
                    c.nombre_completo AS cliente, c.telefono_whatsapp,
                    t.requiere_apoyo_accesibilidad, t.tipo_apoyo, t.notas_accesibilidad
             FROM turnos t
             JOIN servicios s ON s.id = t.servicio_id
             JOIN equipo e ON e.id = t.equipo_id
             JOIN clientes c ON c.id = t.cliente_id
             WHERE TRUE ${filtro}
             ORDER BY t.fecha DESC, t.hora_inicio
             LIMIT 500`,
            params
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        responderErrorBD(error, res, 'listar turnos');
    }
});

router.patch('/turnos/:id/estado', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        const estado = String(req.body.estado || '').toUpperCase();
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        if (!ESTADOS_TURNO.includes(estado)) {
            return res.status(400).json({ ok: false, error: `estado debe ser uno de: ${ESTADOS_TURNO.join(', ')}` });
        }
        const { rows } = await pool.query('UPDATE turnos SET estado = $1 WHERE id = $2 RETURNING id, estado', [estado, id]);
        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Turno no encontrado' });
        res.json({ ok: true, data: rows[0] });
    } catch (error) {
        responderErrorBD(error, res, 'cambiar estado de turno');
    }
});

// ---------------------------------------------------------------------
// 4. RESEÑAS (moderación: ocultar o volver a mostrar)
// ---------------------------------------------------------------------
router.get('/resenas', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, cliente_nombre, servicio_id, calificacion, comentario, aprobada, creado_en
             FROM resenas ORDER BY creado_en DESC LIMIT 500`
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        responderErrorBD(error, res, 'listar reseñas');
    }
});

router.patch('/resenas/:id', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        if (typeof req.body.aprobada !== 'boolean') {
            return res.status(400).json({ ok: false, error: 'Envía "aprobada": true o false' });
        }
        const { rows } = await pool.query('UPDATE resenas SET aprobada = $1 WHERE id = $2 RETURNING id, aprobada', [
            req.body.aprobada, id,
        ]);
        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Reseña no encontrada' });
        res.json({ ok: true, data: rows[0] });
    } catch (error) {
        responderErrorBD(error, res, 'moderar reseña');
    }
});

// ---------------------------------------------------------------------
// 5. HORARIOS Y BLOQUEOS DE CUALQUIER ESTILISTA
// ---------------------------------------------------------------------
router.get('/equipo/:id/horarios', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        res.json({ ok: true, data: await obtenerHorariosSemana(pool, id) });
    } catch (error) {
        responderErrorBD(error, res, 'leer horarios');
    }
});

router.put('/equipo/:id/horarios', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        const error = validarHorariosSemana(req.body.dias);
        if (error) return res.status(400).json({ ok: false, error });
        await guardarHorariosSemana(pool, id, req.body.dias);
        res.json({ ok: true, data: await obtenerHorariosSemana(pool, id) });
    } catch (error) {
        responderErrorBD(error, res, 'guardar horarios');
    }
});

router.get('/equipo/:id/bloqueos', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        res.json({ ok: true, data: await listarBloqueos(pool, id) });
    } catch (error) {
        responderErrorBD(error, res, 'listar bloqueos');
    }
});

router.post('/equipo/:id/bloqueos', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        const resultado = await crearBloqueo(pool, id, req.body);
        if ('error' in resultado) return res.status(400).json({ ok: false, error: resultado.error });
        res.status(201).json({ ok: true, data: resultado.bloqueo, citas_afectadas: resultado.citas_afectadas });
    } catch (error) {
        responderErrorBD(error, res, 'crear bloqueo');
    }
});

router.delete('/bloqueos/:id', async (req: Request, res: Response) => {
    try {
        const id = leerId(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
        const { rowCount } = await pool.query('DELETE FROM bloqueos_estilista WHERE id = $1', [id]);
        if (!rowCount) return res.status(404).json({ ok: false, error: 'Bloqueo no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderErrorBD(error, res, 'borrar bloqueo');
    }
});

export default router;

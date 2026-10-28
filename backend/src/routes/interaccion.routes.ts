import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();

// 1. Obtener reseñas aprobadas y promedio de valoración general
router.get('/resenas', async (_req: Request, res: Response) => {
    try {
        const resenasQuery = await pool.query(`
      SELECT r.id, r.cliente_nombre, s.nombre AS servicio_recibido,
             r.calificacion, r.comentario, r.creado_en
      FROM resenas r
      LEFT JOIN servicios s ON r.servicio_id = s.id
      WHERE r.aprobada = TRUE
      ORDER BY r.creado_en DESC
    `);

        const statsQuery = await pool.query(`
      SELECT ROUND(AVG(calificacion)::numeric, 1) AS promedio_calificacion,
             COUNT(*)::int AS total_resenas
      FROM resenas
      WHERE aprobada = TRUE
    `);

        res.json({
            ok: true,
            estadisticas: statsQuery.rows[0],
            data: resenasQuery.rows,
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener las reseñas' });
    }
});

// 2. Publicar una nueva reseña desde el formulario
router.post('/resenas', async (req: Request, res: Response) => {
    try {
        const { cliente_nombre, servicio_id, calificacion, comentario } = req.body;

        if (!cliente_nombre || !calificacion || !comentario) {
            return res.status(400).json({ ok: false, error: 'Nombre, calificación y comentario son obligatorios' });
        }

        const { rows } = await pool.query(
            `INSERT INTO resenas (cliente_nombre, servicio_id, calificacion, comentario)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [cliente_nombre, servicio_id || null, calificacion, comentario]
        );

        res.status(201).json({ ok: true, mensaje: 'Reseña publicada con éxito', data: rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al guardar la reseña' });
    }
});

// 3. Guardar o actualizar preferencias de accesibilidad de la interfaz (discapacidad visual/motriz)
router.post('/accesibilidad', async (req: Request, res: Response) => {
    try {
        const {
            token_dispositivo,
            alto_contraste = false,
            tamano_fuente = 'NORMAL',
            lector_pantalla_activo = false,
            reducir_animaciones = false,
            navegacion_teclado = false,
            espaciado_texto_aumentado = false,
        } = req.body;

        if (!token_dispositivo) {
            return res.status(400).json({ ok: false, error: 'Se requiere token_dispositivo' });
        }

        const { rows } = await pool.query(
            `INSERT INTO config_accesibilidad_ui (
         token_dispositivo, alto_contraste, tamano_fuente, lector_pantalla_activo,
         reducir_animaciones, navegacion_teclado, espaciado_texto_aumentado
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (token_dispositivo) DO UPDATE SET
         alto_contraste = EXCLUDED.alto_contraste,
         tamano_fuente = EXCLUDED.tamano_fuente,
         lector_pantalla_activo = EXCLUDED.lector_pantalla_activo,
         reducir_animaciones = EXCLUDED.reducir_animaciones,
         navegacion_teclado = EXCLUDED.navegacion_teclado,
         espaciado_texto_aumentado = EXCLUDED.espaciado_texto_aumentado,
         actualizado_en = CURRENT_TIMESTAMP
       RETURNING *`,
            [
                token_dispositivo,
                alto_contraste,
                tamano_fuente,
                lector_pantalla_activo,
                reducir_animaciones,
                navegacion_teclado,
                espaciado_texto_aumentado,
            ]
        );

        res.json({ ok: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al guardar configuración de accesibilidad' });
    }
});

// 4. Recuperar preferencias de accesibilidad de un dispositivo
router.get('/accesibilidad/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { rows } = await pool.query(
            'SELECT * FROM config_accesibilidad_ui WHERE token_dispositivo = $1',
            [token]
        );
        res.json({ ok: true, data: rows[0] || null });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al consultar configuración de accesibilidad' });
    }
});

export default router;
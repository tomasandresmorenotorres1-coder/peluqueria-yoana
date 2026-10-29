import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();

// Función auxiliar para formatear fecha estilo "15 ago 2026"
function formatearFechaEspanol(date: Date): string {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const anio = date.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

// 1. Obtener métricas generales y estadísticas dinámicas para el Hero / Dashboard
router.get('/estadisticas', async (_req: Request, res: Response) => {
    try {
        const statsQuery = await pool.query(`
            SELECT 
                COALESCE(ROUND(AVG(calificacion)::numeric, 1), 4.9) AS promedio_calificacion,
                COUNT(*)::int AS total_resenas
            FROM resenas
            WHERE aprobada = TRUE
        `);

        const clientesQuery = await pool.query(`
            SELECT COUNT(*)::int AS total_clientes FROM clientes
        `);

        const turnosQuery = await pool.query(`
            SELECT COUNT(*)::int AS total_turnos FROM turnos WHERE estado IN ('CONFIRMADO', 'COMPLETADO')
        `);

        const anioFundacion = 1987;
        const aniosExperiencia = new Date().getFullYear() - anioFundacion;
        const totalClientesReal = Math.max(2500, (clientesQuery.rows[0]?.total_clientes || 0) + (turnosQuery.rows[0]?.total_turnos || 0) + 2500);

        res.json({
            ok: true,
            data: {
                clientesSatisfechos: `+${totalClientesReal}`,
                aniosExperiencia: `${aniosExperiencia}`,
                valoracionPromedio: `${statsQuery.rows[0]?.promedio_calificacion || 4.9} ★`,
                totalResenas: statsQuery.rows[0]?.total_resenas || 0,
            },
        });
    } catch (error) {
        console.error('Error al calcular estadísticas:', error);
        res.status(500).json({ ok: false, error: 'Error al calcular estadísticas' });
    }
});

// 2. Obtener reseñas aprobadas y promedio de valoración general
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
            SELECT COALESCE(ROUND(AVG(calificacion)::numeric, 1), 5.0) AS promedio_calificacion,
                   COUNT(*)::int AS total_resenas
            FROM resenas
            WHERE aprobada = TRUE
        `);

        const data = resenasQuery.rows.map((r) => {
            const fechaObj = new Date(r.creado_en);
            const dateStr = formatearFechaEspanol(fechaObj);
            const initial = r.cliente_nombre ? r.cliente_nombre.trim()[0].toUpperCase() : 'U';

            return {
                id: r.id,
                name: r.cliente_nombre,
                service: r.servicio_recibido || 'Servicio General',
                rating: r.calificacion,
                text: r.comentario,
                date: dateStr,
                avatar: initial,
                // Campos nativos
                cliente_nombre: r.cliente_nombre,
                calificacion: r.calificacion,
                comentario: r.comentario,
                creado_en: r.creado_en,
            };
        });

        res.json({
            ok: true,
            estadisticas: statsQuery.rows[0],
            data,
        });
    } catch (error) {
        console.error('Error al obtener las reseñas:', error);
        res.status(500).json({ ok: false, error: 'Error al obtener las reseñas' });
    }
});

// 3. Publicar una nueva reseña desde el formulario (compatible con frontend y backend)
router.post('/resenas', async (req: Request, res: Response) => {
    try {
        const {
            name,
            service,
            rating,
            text,
            cliente_nombre = name,
            servicio_id,
            calificacion = rating,
            comentario = text,
        } = req.body;

        if (!cliente_nombre || !calificacion || !comentario) {
            return res.status(400).json({
                ok: false,
                error: 'Nombre, calificación y comentario son obligatorios',
            });
        }

        let resolvedServicioId = servicio_id || null;

        // Si mandaron el nombre del servicio, buscar el ID en servicios
        if (!resolvedServicioId && service) {
            const sRes = await pool.query(
                'SELECT id, nombre FROM servicios WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
                [service]
            );
            if (sRes.rows.length > 0) {
                resolvedServicioId = sRes.rows[0].id;
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO resenas (cliente_nombre, servicio_id, calificacion, comentario)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [cliente_nombre.trim(), resolvedServicioId, Number(calificacion), comentario.trim()]
        );

        const nuevaResena = rows[0];
        const fechaObj = new Date(nuevaResena.creado_en);

        // Devolver objeto compatible con la interfaz React
        res.status(201).json({
            ok: true,
            mensaje: 'Reseña publicada con éxito',
            data: {
                id: nuevaResena.id,
                name: nuevaResena.cliente_nombre,
                service: service || 'Servicio General',
                rating: nuevaResena.calificacion,
                text: nuevaResena.comentario,
                date: formatearFechaEspanol(fechaObj),
                avatar: nuevaResena.cliente_nombre.trim()[0].toUpperCase(),
                ...nuevaResena,
            },
        });
    } catch (error) {
        console.error('Error al guardar la reseña:', error);
        res.status(500).json({ ok: false, error: 'Error al guardar la reseña' });
    }
});

// 4. Guardar o actualizar preferencias de accesibilidad de la interfaz
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

// 5. Recuperar preferencias de accesibilidad de un dispositivo
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

import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();

// 1. Consultar turnos ocupados por fecha y estilista
router.get('/disponibilidad', async (req: Request, res: Response) => {
    try {
        const { fecha, equipo_id, barbero_nombre } = req.query;
        if (!fecha) {
            return res.status(400).json({ ok: false, error: 'El parámetro fecha (YYYY-MM-DD) es obligatorio' });
        }

        let resolvedEquipoId = equipo_id ? Number(equipo_id) : null;

        if (!resolvedEquipoId && barbero_nombre) {
            const eqRes = await pool.query(
                'SELECT id FROM equipo WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
                [String(barbero_nombre).trim()]
            );
            if (eqRes.rows.length > 0) {
                resolvedEquipoId = eqRes.rows[0].id;
            }
        }

        let query = `
            SELECT id, equipo_id, fecha, hora_inicio, hora_fin, estado
            FROM turnos
            WHERE fecha = $1 AND estado IN ('PENDIENTE', 'CONFIRMADO')
        `;
        const params: any[] = [fecha];

        if (resolvedEquipoId) {
            params.push(resolvedEquipoId);
            query += ` AND equipo_id = $${params.length}`;
        }

        query += ` ORDER BY hora_inicio ASC`;
        const { rows } = await pool.query(query, params);

        const horasOcupadas = rows.map((r) => String(r.hora_inicio).slice(0, 5));

        res.json({
            ok: true,
            turnos_ocupados: rows,
            horas_ocupadas: horasOcupadas,
        });
    } catch (error) {
        console.error('Error al consultar disponibilidad:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar disponibilidad' });
    }
});

// 2. Crear una nueva reserva de turno (con validación de cruces y accesibilidad)
router.post('/', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            nombre_completo,
            telefono_whatsapp,
            email,
            servicio_id,
            equipo_id,
            barbero_nombre,
            fecha,
            hora_inicio,
            requiere_apoyo_accesibilidad = false,
            tipo_apoyo = 'NINGUNO',
            notas_accesibilidad = null,
        } = req.body;

        let resolvedEquipoId = equipo_id ? Number(equipo_id) : null;

        if (!resolvedEquipoId && barbero_nombre) {
            const eqRes = await pool.query(
                'SELECT id FROM equipo WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
                [String(barbero_nombre).trim()]
            );
            if (eqRes.rows.length > 0) {
                resolvedEquipoId = eqRes.rows[0].id;
            }
        }

        if (!nombre_completo || !telefono_whatsapp || !servicio_id || !resolvedEquipoId || !fecha || !hora_inicio) {
            return res.status(400).json({
                ok: false,
                error: 'Faltan campos obligatorios para reservar el turno (nombre, teléfono, servicio, especialista, fecha, hora)',
            });
        }

        await client.query('BEGIN');

        // 1. Obtener precio actual y duración del servicio
        const servicioRes = await client.query(
            'SELECT precio_actual, duracion_minutos, nombre FROM servicios WHERE id = $1 AND activo = TRUE',
            [servicio_id]
        );
        if (servicioRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'El servicio seleccionado no existe o no está activo' });
        }
        const { precio_actual, duracion_minutos, nombre: nombre_servicio } = servicioRes.rows[0];

        // 2. Verificar que no exista cruce de horario para ese estilista en esa fecha
        const cruceRes = await client.query(
            `SELECT id FROM turnos
             WHERE equipo_id = $1
               AND fecha = $2
               AND estado IN ('PENDIENTE', 'CONFIRMADO')
               AND ($3::time < hora_fin AND ($3::time + ($4 || ' minutes')::interval)::time > hora_inicio)`,
            [resolvedEquipoId, fecha, hora_inicio, duracion_minutos]
        );

        if (cruceRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                ok: false,
                error: 'El especialista ya tiene un turno reservado en ese horario',
            });
        }

        // 3. Registrar o actualizar el cliente
        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email)
             VALUES ($1, $2, $3) RETURNING id`,
            [nombre_completo.trim(), telefono_whatsapp.trim(), email ? email.trim() : null]
        );
        const cliente_id = clienteRes.rows[0].id;

        // 4. Insertar el turno congelando el precio actual
        const turnoRes = await client.query(
            `INSERT INTO turnos (
                cliente_id, servicio_id, equipo_id, fecha, hora_inicio,
                hora_fin, precio_aplicado, requiere_apoyo_accesibilidad, tipo_apoyo, notas_accesibilidad
             )
             VALUES (
                $1, $2, $3, $4, $5::time,
                ($5::time + ($6 || ' minutes')::interval)::time,
                $7, $8, $9, $10
             ) RETURNING *`,
            [
                cliente_id,
                servicio_id,
                resolvedEquipoId,
                fecha,
                hora_inicio,
                duracion_minutos,
                precio_actual,
                requiere_apoyo_accesibilidad,
                tipo_apoyo,
                notas_accesibilidad,
            ]
        );

        await client.query('COMMIT');

        const turnoCreado = turnoRes.rows[0];
        const mensajeWhatsApp = encodeURIComponent(
            `Hola Peluquería Yohana, soy ${nombre_completo}. Reservé el turno #${turnoCreado.id} para ${nombre_servicio} el día ${fecha} a las ${hora_inicio}.`
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Turno reservado exitosamente en PostgreSQL',
            data: {
                ...turnoCreado,
                nombre_servicio,
                barbero_nombre: barbero_nombre || 'Especialista asignado',
            },
            whatsapp_url: `https://wa.me/541145678901?text=${mensajeWhatsApp}`,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear turno:', error);
        res.status(500).json({ ok: false, error: 'Error interno al procesar la reserva' });
    } finally {
        client.release();
    }
});

export default router;

/**
 * Turnos (citas): consultar disponibilidad, reservar y gestionar mis reservas.
 * Base: /api/turnos
 *
 * Se puede reservar CON cuenta (el turno queda ligado al cliente) o SIN cuenta (con nombre y teléfono).
 */
import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { autenticar, autenticarOpcional, requireRol } from '../middleware/auth';
import { obtenerOCrearCliente } from '../utils/clientes';
import {
    DURACION_POR_DEFECTO_MIN, HORAS_DE_LA_GRILLA, MENSAJES_NO_DISPONIBLE, ahoraEnColombia, aMinutos,
    esFechaValida, esHoraValida, motivoNoDisponible, obtenerJornada, obtenerOcupaciones,
} from '../utils/horarios';

const router = Router();

/** Busca el id del especialista, ya sea por equipo_id o por su nombre. */
const resolverEquipoId = async (equipo_id: unknown, barbero_nombre: unknown): Promise<number | null> => {
    if (equipo_id) {
        const id = Number(equipo_id);
        return Number.isInteger(id) && id > 0 ? id : null;
    }
    if (barbero_nombre) {
        const { rows } = await pool.query('SELECT id FROM equipo WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [
            String(barbero_nombre).trim(),
        ]);
        if (rows.length > 0) return rows[0].id;
    }
    return null;
};

// ---------------------------------------------------------------------
// 1. Horarios libres de un especialista en una fecha
//    GET /api/turnos/disponibilidad?fecha=YYYY-MM-DD&equipo_id=1&servicio_id=3
// ---------------------------------------------------------------------
router.get('/disponibilidad', async (req: Request, res: Response) => {
    try {
        const { fecha, equipo_id, barbero_nombre, servicio_id, duracion } = req.query;
        if (!esFechaValida(fecha)) {
            return res.status(400).json({ ok: false, error: 'El parámetro fecha (YYYY-MM-DD) es obligatorio y debe ser válido' });
        }

        const equipoId = await resolverEquipoId(equipo_id, barbero_nombre);

        // Sin especialista seleccionado: solo se devuelven las horas de inicio ya tomadas
        if (!equipoId) {
            const { rows } = await pool.query(
                `SELECT id, equipo_id, fecha, hora_inicio, hora_fin, estado FROM turnos
                 WHERE fecha = $1 AND estado IN ('PENDIENTE', 'CONFIRMADO') ORDER BY hora_inicio`,
                [fecha]
            );
            return res.json({
                ok: true,
                turnos_ocupados: rows,
                horas_ocupadas: rows.map((r) => String(r.hora_inicio).slice(0, 5)),
            });
        }

        // Duración del servicio que quiere reservar
        let duracionMin = DURACION_POR_DEFECTO_MIN;
        if (servicio_id !== undefined) {
            const { rows } = await pool.query('SELECT duracion_minutos FROM servicios WHERE id = $1', [Number(servicio_id)]);
            if (rows.length === 0) return res.status(404).json({ ok: false, error: 'El servicio no existe' });
            duracionMin = rows[0].duracion_minutos;
        } else if (duracion !== undefined) {
            const d = Number(duracion);
            if (!Number.isInteger(d) || d < 5 || d > 600) {
                return res.status(400).json({ ok: false, error: 'duracion debe ser un número de minutos entre 5 y 600' });
            }
            duracionMin = d;
        }

        const jornada = await obtenerJornada(pool, equipoId, fecha);
        const ocupaciones = await obtenerOcupaciones(pool, equipoId, fecha);

        const motivos: Record<string, string> = {};
        for (const hora of HORAS_DE_LA_GRILLA) {
            const motivo = motivoNoDisponible(fecha, hora, duracionMin, jornada, ocupaciones);
            if (motivo) motivos[hora] = motivo;
        }

        res.json({
            ok: true,
            fecha,
            equipo_id: equipoId,
            duracion_minutos: duracionMin,
            jornada,                                                    // null si ese día no atiende
            horas_ocupadas: Object.keys(motivos),                       // lo que la página debe deshabilitar
            horas_disponibles: HORAS_DE_LA_GRILLA.filter((h) => !motivos[h]),
            motivos,                                                    // por qué no está disponible cada hora
        });
    } catch (error) {
        console.error('Error al consultar disponibilidad:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar disponibilidad' });
    }
});

// ---------------------------------------------------------------------
// 2. Reservar un turno (con o sin cuenta)
// ---------------------------------------------------------------------
router.post('/', autenticarOpcional, async (req: Request, res: Response) => {
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

        // Con sesión de CLIENTE se usan los datos de su cuenta; sin sesión, los del formulario
        const cuentaCliente = req.usuario?.rol === 'CLIENTE' ? req.usuario : null;
        const equipoId = await resolverEquipoId(equipo_id, barbero_nombre);
        const servicioId = Number(servicio_id);

        if (!servicioId || !equipoId || !fecha || !hora_inicio || (!cuentaCliente && (!nombre_completo || !telefono_whatsapp))) {
            return res.status(400).json({
                ok: false,
                error: 'Faltan campos obligatorios para reservar el turno (nombre, teléfono, servicio, especialista, fecha, hora)',
            });
        }
        if (!esFechaValida(fecha) || !esHoraValida(hora_inicio)) {
            return res.status(400).json({ ok: false, error: 'Formato inválido: fecha YYYY-MM-DD y hora_inicio HH:MM' });
        }

        await client.query('BEGIN');

        // Bloqueo por especialista y día: evita condiciones de carrera concurrentes
        await client.query('SELECT pg_advisory_xact_lock($1::int, hashtext($2::text))', [equipoId, fecha]);

        // 1. Servicio (precio y duración actuales)
        const servicioRes = await client.query(
            'SELECT precio_actual, duracion_minutos, nombre FROM servicios WHERE id = $1 AND activo = TRUE',
            [servicioId]
        );
        if (servicioRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'El servicio seleccionado no existe o no está activo' });
        }
        const { precio_actual, duracion_minutos, nombre: nombre_servicio } = servicioRes.rows[0];

        // 2. Especialista
        const equipoRes = await client.query('SELECT nombre FROM equipo WHERE id = $1 AND activo = TRUE', [equipoId]);
        if (equipoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'El especialista seleccionado no existe o no está activo' });
        }
        const barberoNombre = equipoRes.rows[0].nombre;

        // 3. Matriz de Especialistas y Servicios: validar que el especialista esté autorizado para el servicio
        const autorizacionRes = await client.query(
            'SELECT 1 FROM especialistas_servicios WHERE equipo_id = $1 AND servicio_id = $2',
            [equipoId, servicioId]
        );
        if (autorizacionRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                ok: false,
                error: `El especialista ${barberoNombre} no realiza el servicio "${nombre_servicio}". Por favor selecciona un especialista autorizado.`,
            });
        }

        // 4. ¿Se puede reservar? Jornada del especialista, descansos, bloqueos y citas que se traslapan
        const jornada = await obtenerJornada(client, equipoId, fecha);
        const ocupaciones = await obtenerOcupaciones(client, equipoId, fecha);
        const motivo = motivoNoDisponible(fecha, hora_inicio, duracion_minutos, jornada, ocupaciones);
        if (motivo) {
            await client.query('ROLLBACK');
            return res.status(motivo === 'PASADO' ? 400 : 409).json({
                ok: false,
                motivo,
                error: MENSAJES_NO_DISPONIBLE[motivo],
            });
        }

        // 5. Verificación estricta de traslape en base de datos: Si el especialista ya tiene un turno en esa fecha/hora
        const traslapeRes = await client.query(
            `SELECT id FROM turnos
             WHERE equipo_id = $1
               AND fecha = $2
               AND estado IN ('PENDIENTE', 'CONFIRMADO')
               AND hora_inicio < ($3::time + ($4 || ' minutes')::interval)::time
               AND hora_fin > $3::time`,
            [equipoId, fecha, hora_inicio, duracion_minutos]
        );
        if (traslapeRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                ok: false,
                motivo: 'OCUPADO',
                error: 'El especialista seleccionado ya no tiene disponibilidad en el horario elegido',
            });
        }

        // 6. Cliente: el de la cuenta, o uno existente/nuevo si reserva sin cuenta
        const cliente_id = cuentaCliente
            ? cuentaCliente.cliente_id!
            : await obtenerOCrearCliente(client, nombre_completo.trim(), telefono_whatsapp.trim(), email ? email.trim() : null);

        // 7. Insertar el turno congelando el precio actual
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
                cliente_id, servicioId, equipoId, fecha, hora_inicio, duracion_minutos,
                precio_actual, requiere_apoyo_accesibilidad, tipo_apoyo, notas_accesibilidad,
            ]
        );

        await client.query('COMMIT');

        const turnoCreado = turnoRes.rows[0];
        const nombreCliente = cuentaCliente ? cuentaCliente.nombre_completo : nombre_completo;
        const mensajeWhatsApp = encodeURIComponent(
            `Hola Peluquería Yohana, soy ${nombreCliente}. Reservé el turno #${turnoCreado.id} para ${nombre_servicio} el día ${fecha} a las ${String(hora_inicio).slice(0, 5)}.`
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Turno reservado exitosamente',
            data: {
                ...turnoCreado,
                nombre_servicio,
                barbero_nombre: barberoNombre,
            },
            whatsapp_url: `https://wa.me/${process.env.WHATSAPP_NUMBER || ''}?text=${mensajeWhatsApp}`,
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({
                ok: false,
                motivo: 'OCUPADO',
                error: 'El especialista seleccionado ya no tiene disponibilidad en el horario elegido',
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({ ok: false, error: 'El especialista o el servicio indicado no existe' });
        }
        if (error.code === '23514' || error.code === '22P02') {
            return res.status(400).json({ ok: false, error: 'Algún dato de la reserva no es válido' });
        }
        console.error('Error al crear turno:', error);
        res.status(500).json({ ok: false, error: 'Error interno al procesar la reserva' });
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------
// 3. Mis reservas (solo clientes con cuenta)
// ---------------------------------------------------------------------
router.get('/mis-reservas', autenticar, requireRol('CLIENTE'), async (req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.id, to_char(t.fecha, 'YYYY-MM-DD') AS fecha,
                    to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS hora_fin,
                    t.estado, t.precio_aplicado, s.nombre AS servicio, e.nombre AS estilista
             FROM turnos t
             JOIN servicios s ON s.id = t.servicio_id
             JOIN equipo e ON e.id = t.equipo_id
             WHERE t.cliente_id = $1
             ORDER BY t.fecha DESC, t.hora_inicio DESC`,
            [req.usuario!.cliente_id]
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        console.error('Error al listar reservas del cliente:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar tus reservas' });
    }
});

// 4. Cancelar una de mis reservas (solo si todavía no ha empezado)
router.patch('/:id/cancelar', autenticar, requireRol('CLIENTE'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: 'id inválido' });

        const { rows } = await pool.query(
            `SELECT estado, to_char(fecha, 'YYYY-MM-DD') AS fecha, to_char(hora_inicio, 'HH24:MI') AS hora_inicio
             FROM turnos WHERE id = $1 AND cliente_id = $2`,
            [id, req.usuario!.cliente_id]
        );
        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });

        const turno = rows[0];
        if (!['PENDIENTE', 'CONFIRMADO'].includes(turno.estado)) {
            return res.status(409).json({ ok: false, error: `Una reserva ${turno.estado.toLowerCase()} ya no se puede cancelar` });
        }
        const ahora = ahoraEnColombia();
        const yaEmpezo = turno.fecha < ahora.fecha || (turno.fecha === ahora.fecha && aMinutos(turno.hora_inicio) <= ahora.minutos);
        if (yaEmpezo) {
            return res.status(409).json({ ok: false, error: 'La reserva ya empezó o ya pasó, no se puede cancelar' });
        }

        await pool.query(`UPDATE turnos SET estado = 'CANCELADO' WHERE id = $1`, [id]);
        res.json({ ok: true, data: { id, estado: 'CANCELADO' } });
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        res.status(500).json({ ok: false, error: 'Error al cancelar la reserva' });
    }
});

export default router;

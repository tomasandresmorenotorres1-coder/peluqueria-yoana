/**
 * Panel del ESTILISTA: ver sus propias citas y ajustar sus horarios.
 * Base: /api/estilista  (solo rol ESTILISTA; cada uno ve únicamente lo suyo)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { autenticar, requireRol } from '../middleware/auth';
import {
    crearBloqueo, esFechaValida, guardarHorariosSemana, listarBloqueos,
    obtenerHorariosSemana, validarHorariosSemana,
} from '../utils/horarios';

const router = Router();
router.use(autenticar, requireRol('ESTILISTA'));

// El estilista siempre trabaja sobre su propio equipo_id (viene de su cuenta, nunca del cliente HTTP)
const exigirEquipo = (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario?.equipo_id) {
        return res.status(403).json({ ok: false, error: 'Tu cuenta no está vinculada a un perfil del equipo' });
    }
    next();
};
router.use(exigirEquipo);

const ESTADOS_PERMITIDOS = ['CONFIRMADO', 'COMPLETADO', 'CANCELADO'];

// 1. Mis citas (por defecto, de hoy en adelante). Filtros: ?fecha=YYYY-MM-DD  ?estado=PENDIENTE
router.get('/mis-citas', async (req: Request, res: Response) => {
    try {
        const equipoId = req.usuario!.equipo_id;
        const { fecha, estado } = req.query;
        const params: any[] = [equipoId];
        let filtro = '';

        if (fecha !== undefined) {
            if (!esFechaValida(fecha)) return res.status(400).json({ ok: false, error: 'fecha inválida (YYYY-MM-DD)' });
            params.push(fecha);
            filtro += ` AND t.fecha = $${params.length}`;
        } else {
            filtro += ` AND t.fecha >= CURRENT_DATE`;
        }
        if (estado !== undefined) {
            params.push(String(estado).toUpperCase());
            filtro += ` AND t.estado = $${params.length}`;
        }

        const { rows } = await pool.query(
            `SELECT t.id, to_char(t.fecha, 'YYYY-MM-DD') AS fecha,
                    to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS hora_fin,
                    t.estado, t.precio_aplicado, s.nombre AS servicio,
                    c.nombre_completo AS cliente, c.telefono_whatsapp,
                    t.requiere_apoyo_accesibilidad, t.tipo_apoyo, t.notas_accesibilidad
             FROM turnos t
             JOIN servicios s ON s.id = t.servicio_id
             JOIN clientes c ON c.id = t.cliente_id
             WHERE t.equipo_id = $1 ${filtro}
             ORDER BY t.fecha, t.hora_inicio`,
            params
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        console.error('Error al listar citas del estilista:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar tus citas' });
    }
});

// 2. Cambiar el estado de una de MIS citas (confirmar, marcar como atendida o cancelar)
router.patch('/mis-citas/:id/estado', async (req: Request, res: Response) => {
    try {
        const estado = String(req.body.estado || '').toUpperCase();
        if (!ESTADOS_PERMITIDOS.includes(estado)) {
            return res.status(400).json({ ok: false, error: `estado debe ser uno de: ${ESTADOS_PERMITIDOS.join(', ')}` });
        }
        // El "AND equipo_id" garantiza que no pueda tocar citas de otro estilista
        const { rows } = await pool.query(
            `UPDATE turnos SET estado = $1 WHERE id = $2 AND equipo_id = $3 RETURNING id, estado`,
            [estado, Number(req.params.id), req.usuario!.equipo_id]
        );
        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Cita no encontrada' });
        res.json({ ok: true, data: rows[0] });
    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ ok: false, error: 'Error al actualizar la cita' });
    }
});

// 3. Mi horario semanal
router.get('/mis-horarios', async (req: Request, res: Response) => {
    try {
        res.json({ ok: true, data: await obtenerHorariosSemana(pool, req.usuario!.equipo_id!) });
    } catch (error) {
        console.error('Error al leer horarios:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar tus horarios' });
    }
});

// 4. Cambiar mi horario semanal. Lista vacía = volver al horario por defecto del negocio.
//    Ejemplo: { "dias": [ { "dia_semana": 1, "hora_inicio": "10:00", "hora_fin": "18:00" } ] }
router.put('/mis-horarios', async (req: Request, res: Response) => {
    try {
        const error = validarHorariosSemana(req.body.dias);
        if (error) return res.status(400).json({ ok: false, error });
        await guardarHorariosSemana(pool, req.usuario!.equipo_id!, req.body.dias);
        res.json({ ok: true, data: await obtenerHorariosSemana(pool, req.usuario!.equipo_id!) });
    } catch (error) {
        console.error('Error al guardar horarios:', error);
        res.status(500).json({ ok: false, error: 'Error al guardar tus horarios' });
    }
});

// 5. Mis bloqueos (días u horas en que no atiendo)
router.get('/mis-bloqueos', async (req: Request, res: Response) => {
    try {
        res.json({ ok: true, data: await listarBloqueos(pool, req.usuario!.equipo_id!) });
    } catch (error) {
        console.error('Error al listar bloqueos:', error);
        res.status(500).json({ ok: false, error: 'Error al consultar tus bloqueos' });
    }
});

router.post('/mis-bloqueos', async (req: Request, res: Response) => {
    try {
        const resultado = await crearBloqueo(pool, req.usuario!.equipo_id!, req.body);
        if ('error' in resultado) return res.status(400).json({ ok: false, error: resultado.error });
        res.status(201).json({ ok: true, data: resultado.bloqueo, citas_afectadas: resultado.citas_afectadas });
    } catch (error) {
        console.error('Error al crear bloqueo:', error);
        res.status(500).json({ ok: false, error: 'Error al crear el bloqueo' });
    }
});

router.delete('/mis-bloqueos/:id', async (req: Request, res: Response) => {
    try {
        const { rowCount } = await pool.query(
            'DELETE FROM bloqueos_estilista WHERE id = $1 AND equipo_id = $2',
            [Number(req.params.id), req.usuario!.equipo_id]
        );
        if (!rowCount) return res.status(404).json({ ok: false, error: 'Bloqueo no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al borrar bloqueo:', error);
        res.status(500).json({ ok: false, error: 'Error al borrar el bloqueo' });
    }
});

export default router;

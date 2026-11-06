/**
 * Lógica de horarios: jornada de cada estilista/especialista, descansos, bloqueos y traslape de citas.
 * Todo lo que decide "¿se puede reservar a esta hora?" vive aquí, para que
 * la consulta de disponibilidad y la creación del turno usen exactamente las mismas reglas.
 */
import { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

// Horas estándar que muestra la grilla
export const HORAS_DE_LA_GRILLA = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

// Duración que se asume si la página no indica el servicio
export const DURACION_POR_DEFECTO_MIN = 60;

// Horario del negocio cuando el especialista no ha configurado el suyo: lunes a sábado, 9:00 a 20:00
const JORNADA_POR_DEFECTO = { inicio: '09:00', fin: '20:00' };
const DIAS_POR_DEFECTO = [1, 2, 3, 4, 5, 6];

export interface Jornada {
    inicio: string; // HH:MM
    fin: string;    // HH:MM
}

/** "09:30" o "09:30:00" -> 570 (minutos desde la medianoche) */
export const aMinutos = (hora: string): number => {
    const [h, m] = String(hora).split(':');
    return Number(h) * 60 + Number(m);
};

/** 570 -> "09:30" */
export const aHora = (minutos: number): string => {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
};

export const esHoraValida = (valor: unknown): valor is string =>
    typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(valor);

export const esFechaValida = (valor: unknown): valor is string => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

/** Día de la semana de una fecha YYYY-MM-DD (0 = domingo ... 6 = sábado) */
export const diaDeLaSemana = (fecha: string): number => new Date(`${fecha}T12:00:00Z`).getUTCDay();

/** Fecha y hora actuales en Colombia (el servidor puede estar en otra zona horaria). */
export const ahoraEnColombia = (): { fecha: string; minutos: number } => {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
    return {
        fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
        minutos: Number(valor('hour')) * 60 + Number(valor('minute')),
    };
};
export const obtenerDisponibilidad = async (db: Db, equipoId: number, fecha: string, duracionServicioMin: number) => {
    // 1. Obtener jornada y ocupaciones
    const jornada = await obtenerJornada(db, equipoId, fecha);
    const ocupaciones = await obtenerOcupaciones(db, equipoId, fecha);

    const horasDisponibles = [];

    // 2. Iterar sobre tu grilla de horas
    for (const hora of HORAS_DE_LA_GRILLA) {
        // AQUÍ ES DONDE SUCEDE LA MAGIA. Le pasas la duración real del servicio.
        const motivo = motivoNoDisponible(fecha, hora, duracionServicioMin, jornada, ocupaciones);

        if (motivo === null) {
            horasDisponibles.push(hora); // Está libre
        }
    }

    return horasDisponibles;
};
/**
 * Jornada del especialista ese día, o null si no trabaja.
 * - Si el especialista configuró horarios, solo trabaja los días que tiene configurados.
 * - Si no configuró nada, se usa el horario por defecto del negocio.
 */
export const obtenerJornada = async (db: Db, equipoId: number, fecha: string): Promise<Jornada | null> => {
    const dia = diaDeLaSemana(fecha);
    const { rows } = await db.query(
        `SELECT dia_semana, to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin
         FROM horarios_estilista WHERE equipo_id = $1`,
        [equipoId]
    );
    if (rows.length === 0) {
        return DIAS_POR_DEFECTO.includes(dia) ? { ...JORNADA_POR_DEFECTO } : null;
    }
    const delDia = rows.find((r) => r.dia_semana === dia);
    return delDia ? { inicio: delDia.inicio, fin: delDia.fin } : null;
};

export interface Ocupacion {
    inicio: number; // minutos
    fin: number;    // minutos
    motivo: 'CITA' | 'BLOQUEO';
}

/** Citas activas, descansos y bloqueos de ese especialista ese día, ya convertidos a minutos. */
export const obtenerOcupaciones = async (db: Db, equipoId: number, fecha: string): Promise<Ocupacion[]> => {
    const dia = diaDeLaSemana(fecha);

    // 1. Citas activas
    const citas = await db.query(
        `SELECT to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin
         FROM turnos
         WHERE equipo_id = $1 AND fecha = $2 AND estado IN ('PENDIENTE', 'CONFIRMADO')`,
        [equipoId, fecha]
    );

    // 2. Bloqueos puntuales
    const bloqueos = await db.query(
        `SELECT to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin
         FROM bloqueos_estilista WHERE equipo_id = $1 AND fecha = $2`,
        [equipoId, fecha]
    );

    // 3. Descansos configurados en el horario del especialista para este día de la semana
    const descansos = await db.query(
        `SELECT to_char(descanso_inicio, 'HH24:MI') AS d_inicio, to_char(descanso_fin, 'HH24:MI') AS d_fin
         FROM horarios_estilista
         WHERE equipo_id = $1 AND dia_semana = $2 AND descanso_inicio IS NOT NULL AND descanso_fin IS NOT NULL`,
        [equipoId, dia]
    );

    const ocupaciones: Ocupacion[] = [
        ...citas.rows.map((r) => ({ inicio: aMinutos(r.inicio), fin: aMinutos(r.fin), motivo: 'CITA' as const })),
        // Un bloqueo sin horas ocupa todo el día
        ...bloqueos.rows.map((r) => ({
            inicio: r.inicio ? aMinutos(r.inicio) : 0,
            fin: r.fin ? aMinutos(r.fin) : 24 * 60,
            motivo: 'BLOQUEO' as const,
        })),
        // Descanso del especialista
        ...descansos.rows.map((r) => ({
            inicio: aMinutos(r.d_inicio),
            fin: aMinutos(r.d_fin),
            motivo: 'BLOQUEO' as const,
        })),
    ];

    return ocupaciones;
};

export type MotivoNoDisponible =
    | 'PASADO'
    | 'NO_TRABAJA'
    | 'FUERA_DE_JORNADA'
    | 'BLOQUEADO'
    | 'OCUPADO';

/** Dice si un servicio de `duracionMin` puede empezar a `horaInicio`. null = se puede. */
export const motivoNoDisponible = (
    fecha: string,
    horaInicio: string,
    duracionMin: number,
    jornada: Jornada | null,
    ocupaciones: Ocupacion[]
): MotivoNoDisponible | null => {
    const inicio = aMinutos(horaInicio);
    const fin = inicio + duracionMin;

    const ahora = ahoraEnColombia();
    if (fecha < ahora.fecha || (fecha === ahora.fecha && inicio <= ahora.minutos)) return 'PASADO';

    if (!jornada) return 'NO_TRABAJA';
    if (inicio < aMinutos(jornada.inicio) || fin > aMinutos(jornada.fin)) return 'FUERA_DE_JORNADA';

    // Dos rangos se cruzan si uno empieza antes de que el otro termine, y viceversa
    const choque = ocupaciones.find((o) => inicio < o.fin && fin > o.inicio);
    if (choque) return choque.motivo === 'BLOQUEO' ? 'BLOQUEADO' : 'OCUPADO';
    return null;
};

export const MENSAJES_NO_DISPONIBLE: Record<MotivoNoDisponible, string> = {
    PASADO: 'No se puede reservar en una fecha u hora que ya pasó',
    NO_TRABAJA: 'El especialista no atiende ese día',
    FUERA_DE_JORNADA: 'Ese horario queda fuera de la jornada del especialista',
    BLOQUEADO: 'El horario seleccionado coincide con un descanso o bloqueo del especialista',
    OCUPADO: 'El especialista seleccionado ya no tiene disponibilidad en el horario elegido',
};

// ---------------------------------------------------------------------
// Horarios semanales, descansos y bloqueos
// ---------------------------------------------------------------------
export interface DiaHorario {
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    descanso_inicio?: string | null;
    descanso_fin?: string | null;
}

export const obtenerHorariosSemana = async (db: Db, equipoId: number) => {
    const { rows } = await db.query(
        `SELECT dia_semana, 
                to_char(hora_inicio, 'HH24:MI') AS hora_inicio, 
                to_char(hora_fin, 'HH24:MI') AS hora_fin,
                to_char(descanso_inicio, 'HH24:MI') AS descanso_inicio,
                to_char(descanso_fin, 'HH24:MI') AS descanso_fin
         FROM horarios_estilista WHERE equipo_id = $1 ORDER BY dia_semana`,
        [equipoId]
    );
    return { personalizado: rows.length > 0, dias: rows };
};

/** Valida la lista de días; devuelve un mensaje de error o null si todo está bien. */
export const validarHorariosSemana = (dias: unknown): string | null => {
    if (!Array.isArray(dias)) return 'Envía "dias" como una lista';
    if (dias.length > 7) return 'No puede haber más de 7 días';
    const vistos = new Set<number>();
    for (const d of dias as DiaHorario[]) {
        if (!Number.isInteger(d?.dia_semana) || d.dia_semana < 0 || d.dia_semana > 6) {
            return 'dia_semana debe ser un número de 0 (domingo) a 6 (sábado)';
        }
        if (vistos.has(d.dia_semana)) return `El día ${d.dia_semana} está repetido`;
        vistos.add(d.dia_semana);
        if (!esHoraValida(d.hora_inicio) || !esHoraValida(d.hora_fin)) return 'Usa horas con formato HH:MM';
        if (aMinutos(d.hora_fin) <= aMinutos(d.hora_inicio)) return 'La hora de fin debe ser posterior a la de inicio';

        // Validar descansos si se indican
        const tieneDescansoInicio = d.descanso_inicio !== undefined && d.descanso_inicio !== null && d.descanso_inicio !== '';
        const tieneDescansoFin = d.descanso_fin !== undefined && d.descanso_fin !== null && d.descanso_fin !== '';
        if (tieneDescansoInicio !== tieneDescansoFin) {
            return 'Para configurar descanso debes indicar tanto inicio como fin';
        }
        if (tieneDescansoInicio && tieneDescansoFin) {
            if (!esHoraValida(d.descanso_inicio) || !esHoraValida(d.descanso_fin)) {
                return 'Las horas de descanso deben tener formato HH:MM';
            }
            if (aMinutos(d.descanso_fin as string) <= aMinutos(d.descanso_inicio as string)) {
                return 'El fin del descanso debe ser posterior al inicio';
            }
            if (aMinutos(d.descanso_inicio as string) < aMinutos(d.hora_inicio) || aMinutos(d.descanso_fin as string) > aMinutos(d.hora_fin)) {
                return 'El descanso debe estar dentro de la jornada laboral';
            }
        }
    }
    return null;
};

/** Reemplaza todo el horario semanal. Lista vacía = volver al horario por defecto del negocio. */
export const guardarHorariosSemana = async (pool: Pool, equipoId: number, dias: DiaHorario[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM horarios_estilista WHERE equipo_id = $1', [equipoId]);
        for (const d of dias) {
            const tieneDescanso = d.descanso_inicio && d.descanso_fin;
            await client.query(
                `INSERT INTO horarios_estilista (equipo_id, dia_semana, hora_inicio, hora_fin, descanso_inicio, descanso_fin)
                 VALUES ($1, $2, $3::time, $4::time, $5, $6)`,
                [
                    equipoId,
                    d.dia_semana,
                    d.hora_inicio,
                    d.hora_fin,
                    tieneDescanso ? d.descanso_inicio : null,
                    tieneDescanso ? d.descanso_fin : null,
                ]
            );
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const listarBloqueos = async (db: Db, equipoId: number) => {
    const { rows } = await db.query(
        `SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha,
                to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
                to_char(hora_fin, 'HH24:MI') AS hora_fin, motivo
         FROM bloqueos_estilista
         WHERE equipo_id = $1 AND fecha >= CURRENT_DATE - INTERVAL '1 day'
         ORDER BY fecha, hora_inicio NULLS FIRST`,
        [equipoId]
    );
    return rows;
};

/** Crea un bloqueo y avisa cuántas citas ya reservadas quedan afectadas (no las cancela solo). */
export const crearBloqueo = async (
    db: Db,
    equipoId: number,
    datos: { fecha: unknown; hora_inicio?: unknown; hora_fin?: unknown; motivo?: unknown }
): Promise<{ error: string } | { bloqueo: any; citas_afectadas: any[] }> => {
    const { fecha, hora_inicio, hora_fin, motivo } = datos;
    if (!esFechaValida(fecha)) return { error: 'fecha inválida (usa YYYY-MM-DD)' };

    const tieneHoras = hora_inicio !== undefined && hora_inicio !== null && hora_inicio !== '';
    if (tieneHoras !== (hora_fin !== undefined && hora_fin !== null && hora_fin !== '')) {
        return { error: 'Envía hora_inicio y hora_fin juntas, o ninguna para bloquear todo el día' };
    }
    if (tieneHoras) {
        if (!esHoraValida(hora_inicio) || !esHoraValida(hora_fin)) return { error: 'Usa horas con formato HH:MM' };
        if (aMinutos(hora_fin as string) <= aMinutos(hora_inicio as string)) {
            return { error: 'La hora de fin debe ser posterior a la de inicio' };
        }
    }
    const motivoLimpio = typeof motivo === 'string' && motivo.trim() ? motivo.trim().slice(0, 200) : null;

    const { rows } = await db.query(
        `INSERT INTO bloqueos_estilista (equipo_id, fecha, hora_inicio, hora_fin, motivo)
         VALUES ($1, $2, $3::time, $4::time, $5)
         RETURNING id, to_char(fecha, 'YYYY-MM-DD') AS fecha,
                   to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
                   to_char(hora_fin, 'HH24:MI') AS hora_fin, motivo`,
        [equipoId, fecha, tieneHoras ? hora_inicio : null, tieneHoras ? hora_fin : null, motivoLimpio]
    );

    const afectadas = await db.query(
        `SELECT t.id, to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(t.hora_fin, 'HH24:MI') AS hora_fin,
                c.nombre_completo AS cliente, c.telefono_whatsapp
         FROM turnos t JOIN clientes c ON c.id = t.cliente_id
         WHERE t.equipo_id = $1 AND t.fecha = $2 AND t.estado IN ('PENDIENTE', 'CONFIRMADO')
           AND ($3::time IS NULL OR (t.hora_inicio < $4::time AND t.hora_fin > $3::time))
         ORDER BY t.hora_inicio`,
        [equipoId, fecha, tieneHoras ? hora_inicio : null, tieneHoras ? hora_fin : null]
    );
    return { bloqueo: rows[0], citas_afectadas: afectadas.rows };
};

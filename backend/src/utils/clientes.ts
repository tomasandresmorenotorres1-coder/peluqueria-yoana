import { PoolClient } from 'pg';

// Reutiliza el cliente si ya existe (mismo teléfono y nombre); si no, lo crea.
export const obtenerOCrearCliente = async (
    client: PoolClient,
    nombre_completo: string,
    telefono_whatsapp: string,
    email?: string | null
): Promise<number> => {
    const existente = await client.query(
        `SELECT id FROM clientes
         WHERE telefono_whatsapp = $1 AND LOWER(nombre_completo) = LOWER($2)
         LIMIT 1`,
        [telefono_whatsapp, nombre_completo]
    );
    if (existente.rows.length > 0) return existente.rows[0].id;

    const nuevo = await client.query(
        `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email)
         VALUES ($1, $2, $3) RETURNING id`,
        [nombre_completo, telefono_whatsapp, email || null]
    );
    return nuevo.rows[0].id;
};

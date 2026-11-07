import { Pool } from 'pg';
import { env } from './env';

// Solo se activa si defines DB_SSL=true (útil al conectar desde tu PC a la URL pública)
const sslActivo = process.env.DB_SSL === 'true';

export const pool = new Pool({
    ...(env.DATABASE_URL
        ? { connectionString: env.DATABASE_URL }
        : {
            host: env.DB_HOST,
            port: env.DB_PORT,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
        }),
    ssl: sslActivo ? { rejectUnauthorized: false } : undefined,
});
export const verificarConexionDB = async (): Promise<boolean> => {
    try {
        const client = await pool.connect();
        console.log('Conectado exitosamente a PostgreSQL');
        client.release();
        return true;
    } catch (error: any) {
        let destino = 'SIN DATABASE_URL (usando DB_HOST / localhost)';
        try {
            if (env.DATABASE_URL) {
                const u = new URL(env.DATABASE_URL);
                destino = `${u.hostname}:${u.port}/${u.pathname.slice(1)}`;
            }
        } catch {
            destino = 'DATABASE_URL presente pero con formato inválido';
        }
        console.error('⚠️ Advertencia al conectar con PostgreSQL');
        console.error('Destino:', destino);
        console.error('Código:', error.code, '| Mensaje:', error.message);
        if (Array.isArray(error.errors)) {
            for (const e of error.errors) console.error(` - ${e.address}:${e.port} ${e.code}`);
        }
        return false;
    }
};
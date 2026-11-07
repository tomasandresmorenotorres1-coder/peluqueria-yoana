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
        console.error('⚠️ Advertencia al conectar con PostgreSQL:', error.message);
        console.error('Revisa DATABASE_URL (o DB_HOST/DB_USER/...) y, si es necesario, DB_SSL=true.');
        return false;
    }
};
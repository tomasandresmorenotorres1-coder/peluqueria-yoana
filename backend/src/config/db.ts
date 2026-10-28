import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'peluqueria_yoana',
});

export const verificarConexionDB = async (): Promise<void> => {
    try {
        const client = await pool.connect();
        console.log('Conectado exitosamente a PostgreSQL (peluqueria_yoana)');
        client.release();
    } catch (error) {
        console.error('Error al conectar con PostgreSQL:', error);
        process.exit(1);
    }
};
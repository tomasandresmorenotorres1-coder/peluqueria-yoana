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

export const verificarConexionDB = async (): Promise<boolean> => {
    try {
        const client = await pool.connect();
        console.log(' Conectado exitosamente a PostgreSQL (peluqueria_yoana)');
        client.release();
        return true;
    } catch (error: any) {
        console.error('⚠️ Advertencia al conectar con PostgreSQL:', error.message);
        console.error('Asegúrate de que PostgreSQL esté corriendo en el puerto 5432 y que las credenciales en backend/.env sean correctas.');
        console.error('Puedes inicializar o migrar la base de datos con: npm run db:setup');
        return false;
    }
};

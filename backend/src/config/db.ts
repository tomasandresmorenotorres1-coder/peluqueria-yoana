import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool(
    env.DATABASE_URL
        ? { connectionString: env.DATABASE_URL }
        : {
            host: env.DB_HOST,
            port: env.DB_PORT,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
        }
);

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

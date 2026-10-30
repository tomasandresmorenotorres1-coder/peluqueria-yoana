import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'peluqueria_yoana';

export async function setupDatabase() {
    console.log('🔄 Iniciando configuración y migración de base de datos...');
    console.log(`Conectando a PostgreSQL en ${DB_HOST}:${DB_PORT} como usuario '${DB_USER}'...`);

    // 1. Conexión a la base por defecto 'postgres' para verificar/crear la BD si no existe
    const adminClient = new Client({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: 'postgres',
    });

    try {
        await adminClient.connect();
        const checkDb = await adminClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [DB_NAME]
        );

        if (checkDb.rows.length === 0) {
            console.log(`Creando base de datos '${DB_NAME}'...`);
            await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
            console.log(`✅ Base de datos '${DB_NAME}' creada con éxito.`);
        } else {
            console.log(`ℹ️ La base de datos '${DB_NAME}' ya existe.`);
        }
    } catch (err: any) {
        console.warn(`Advertencia al verificar la base 'postgres': ${err.message}`);
    } finally {
        await adminClient.end().catch(() => {});
    }

    // 2. Conectar a la base de datos de la aplicación para aplicar esquema y seeds
    const appClient = new Client({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    });

    try {
        await appClient.connect();
        console.log(`Conectado a '${DB_NAME}'. Aplicando esquema...`);

        const schemaPath = path.resolve(__dirname, '../../database/01_shema.sql');
        const seedPath = path.resolve(__dirname, '../../database/02_shema.sql');

        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
            await appClient.query(schemaSql);
            console.log('✅ Esquema 01_shema.sql aplicado exitosamente.');
        }

        if (fs.existsSync(seedPath)) {
            const seedSql = fs.readFileSync(seedPath, 'utf-8');
            await appClient.query(seedSql);
            console.log('✅ Semillas 02_shema.sql aplicadas exitosamente.');
        }

        console.log('🎉 Base de datos configurada e integrada al 100%.');
    } catch (err: any) {
        console.error('❌ Error al aplicar esquema/semillas:', err.message);
        throw err;
    } finally {
        await appClient.end().catch(() => {});
    }
}

// Permitir ejecución directa por CLI
if (require.main === module) {
    setupDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

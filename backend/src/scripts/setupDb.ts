import fs from 'fs';
import path from 'path';
import { Client, ClientConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'peluqueria_yoana';

const usaUrl = Boolean(process.env.DATABASE_URL);
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
const force = process.argv.includes('--force');

function leerSql(nombre: string, obligatorio: boolean): string | null {
    const ruta = path.resolve(__dirname, '../../database', nombre);
    if (!fs.existsSync(ruta)) {
        if (obligatorio) throw new Error(`No se encontró el archivo obligatorio: ${ruta}`);
        console.warn(`⚠️ Omitido (no existe): ${nombre}`);
        return null;
    }
    return fs.readFileSync(ruta, 'utf-8');
}

export async function setupDatabase() {
    console.log('🔄 Iniciando configuración de base de datos...');

    // 1. Solo en local: crear la BD si no existe. Con DATABASE_URL (Railway) la BD ya existe.
    if (!usaUrl) {
        const adminClient = new Client({
            host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
            database: 'postgres', ssl,
        });
        try {
            await adminClient.connect();
            const existe = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
            if (existe.rows.length === 0) {
                await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
                console.log(`✅ Base de datos '${DB_NAME}' creada.`);
            }
        } catch (err: any) {
            console.warn(`Advertencia al verificar/crear la BD: ${err.message}`);
        } finally {
            await adminClient.end().catch(() => { });
        }
    }

    // 2. Conexión a la BD de la aplicación
    const config: ClientConfig = usaUrl
        ? { connectionString: process.env.DATABASE_URL, ssl }
        : { host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, ssl };

    const appClient = new Client(config);

    try {
        await appClient.connect();
        console.log('Conectado a la base de datos. Revisando estado...');

        // Protección: no tocar una BD que ya tiene datos, salvo con --force
        const yaInicializada = await appClient.query("SELECT to_regclass('public.turnos') AS t");
        if (yaInicializada.rows[0].t && !force) {
            console.log('ℹ️ La BD ya tiene tablas. No se hace nada. Usa --force para recrearla (borra datos).');
            return;
        }

        const schemaSql = leerSql('01_shema.sql', true)!;
        const seedSql = leerSql('02_shema.sql', true)!;
        const authSql = leerSql('03_usuarios.sql', false);
        const actualizSql = leerSql('04_actualizaciones_especialistas_pines_mp.sql', false);

        await appClient.query(
            'DROP TABLE IF EXISTS registro_pines, especialistas_servicios, bloqueos_estilista, horarios_estilista, usuarios CASCADE'
        );

        await appClient.query(schemaSql);
        console.log('✅ 01_shema.sql aplicado.');
        await appClient.query(seedSql);
        console.log('✅ 02_shema.sql aplicado.');
        if (authSql) { await appClient.query(authSql); console.log('✅ 03_usuarios.sql aplicado.'); }
        if (actualizSql) { await appClient.query(actualizSql); console.log('✅ 04_actualizaciones... aplicado.'); }

        console.log('🎉 Base de datos configurada.');
    } catch (err: any) {
        console.error('❌ Error al aplicar esquema/semillas:', err.message);
        throw err;
    } finally {
        await appClient.end().catch(() => { });
    }
}

if (require.main === module) {
    setupDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
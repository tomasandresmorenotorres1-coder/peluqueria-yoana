/**
 * Crea las tablas de usuarios y horarios SIN borrar nada de lo que ya tienes.
 * Úsalo en una base de datos que ya existe:   npm run db:auth
 */
import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function main() {
    const ruta = path.resolve(__dirname, '../../database/03_usuarios.sql');
    await pool.query(fs.readFileSync(ruta, 'utf-8'));
    console.log('✅ Tablas de usuarios y horarios listas (03_usuarios.sql).');
    console.log('   Siguiente paso: crea el primer administrador con  npm run admin:crear -- correo@ejemplo.com "Tu Nombre"');
}

main()
    .catch((error) => {
        console.error('❌ No se pudo aplicar 03_usuarios.sql:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());

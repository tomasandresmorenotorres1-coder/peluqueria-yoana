import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function main() {
    const ruta = path.resolve(__dirname, '../../database/04_actualizaciones_especialistas_pines_mp.sql');
    const sql = fs.readFileSync(ruta, 'utf-8');
    await pool.query(sql);
    console.log('✅ Migración 04_actualizaciones_especialistas_pines_mp.sql aplicada con éxito.');
}

main()
    .catch((error) => {
        console.error('❌ Error al aplicar migración 04:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());

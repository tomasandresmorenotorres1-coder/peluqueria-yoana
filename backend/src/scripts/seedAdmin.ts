/**
 * Script de siembra del usuario Administrador con bcryptjs
 * Ejecución: npx tsx src/scripts/seedAdmin.ts
 */
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

const ADMIN_EMAIL = 'admin@peluqueriayoana.com';
const ADMIN_PASSWORD_PLANO = 'Admin2026*!';
const ADMIN_NOMBRE = 'Administrador General';

async function seedAdmin() {
    console.log('\n👑 [SEED ADMIN] Iniciando siembra del usuario Administrador...');
    const client = await pool.connect();
    try {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD_PLANO, saltRounds);

        const res = await client.query(
            `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, equipo_id, cliente_id, activo)
             VALUES ($1, $2, $3, 'ADMIN', NULL, NULL, TRUE)
             ON CONFLICT ((LOWER(email))) DO UPDATE SET
                 password_hash = EXCLUDED.password_hash,
                 nombre_completo = EXCLUDED.nombre_completo,
                 rol = 'ADMIN',
                 activo = TRUE
             RETURNING id, email, nombre_completo, rol, activo, creado_en`,
            [ADMIN_EMAIL.toLowerCase().trim(), passwordHash, ADMIN_NOMBRE]
        );

        console.log('✅ Usuario Administrador registrado / actualizado con éxito en PostgreSQL:');
        console.table(res.rows);
        console.log('\n======================================================');
        console.log('📋 CREDENCIALES DE ACCESO AL DASHBOARD ADMIN:');
        console.log('------------------------------------------------------');
        console.log(`📧 Email:      ${ADMIN_EMAIL}`);
        console.log(`🔑 Contraseña: ${ADMIN_PASSWORD_PLANO}`);
        console.log(`👑 Rol:        ADMIN`);
        console.log('======================================================\n');
    } catch (err: any) {
        console.error('❌ Error al sembrar usuario administrador:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seedAdmin();

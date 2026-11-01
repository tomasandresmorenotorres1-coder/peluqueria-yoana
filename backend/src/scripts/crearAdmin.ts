/**
 * Crea (o recupera el acceso de) un administrador desde la terminal.
 * Uso:   npm run admin:crear -- correo@ejemplo.com "Nombre Completo"
 * La contraseña se pide por pantalla (no queda en el historial de comandos).
 */
import { pool } from '../config/db';
import {
    emailValido, hashearPassword, nombreValido, normalizarEmail, validarPassword,
} from '../utils/usuarios';

/** Pide la contraseña sin mostrarla mientras se escribe. */
const pedirPassword = (pregunta: string): Promise<string> =>
    new Promise((resolve) => {
        const stdin = process.stdin;
        process.stdout.write(pregunta);

        if (!stdin.isTTY) {
            // Sin terminal interactiva (por ejemplo en pruebas automáticas): lee una línea normal
            stdin.once('data', (d) => resolve(String(d).trim()));
            return;
        }

        let texto = '';
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        const alTeclear = (tecla: string) => {
            for (const c of tecla) {
                if (c === '\r' || c === '\n') {
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', alTeclear);
                    process.stdout.write('\n');
                    return resolve(texto);
                }
                if (c === '\u0003') process.exit(1); // Ctrl + C
                if (c === '\u007f' || c === '\b') texto = texto.slice(0, -1); // borrar
                else texto += c;
            }
        };
        stdin.on('data', alTeclear);
    });

async function main() {
    const email = normalizarEmail(process.argv[2]);
    const nombre = process.argv[3];

    if (!emailValido(email) || !nombreValido(nombre)) {
        console.error('Uso: npm run admin:crear -- correo@ejemplo.com "Nombre Completo"');
        process.exitCode = 1;
        return;
    }

    const password = await pedirPassword('Contraseña (mínimo 8, con letras y números): ');
    const error = validarPassword(password);
    if (error) {
        console.error(`❌ ${error}`);
        process.exitCode = 1;
        return;
    }

    const hash = await hashearPassword(password);
    const existente = await pool.query('SELECT id, rol FROM usuarios WHERE LOWER(email) = $1', [email]);

    if (existente.rows.length > 0) {
        if (existente.rows[0].rol !== 'ADMIN') {
            console.error('❌ Ese correo ya existe con otro rol. Usa otro correo.');
            process.exitCode = 1;
            return;
        }
        await pool.query('UPDATE usuarios SET password_hash = $1, activo = TRUE WHERE id = $2', [hash, existente.rows[0].id]);
        console.log(`✅ Ya existía ese administrador: se actualizó su contraseña y quedó activo (${email}).`);
        return;
    }

    await pool.query(
        `INSERT INTO usuarios (email, password_hash, nombre_completo, rol) VALUES ($1, $2, $3, 'ADMIN')`,
        [email, hash, nombre.trim()]
    );
    console.log(`✅ Administrador creado: ${email}`);
}

main()
    .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());

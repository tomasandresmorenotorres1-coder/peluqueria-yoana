import { encrypt, decrypt } from '../utils/crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.argv[2];

if (!secret) {
    console.log('\nUso: npx tsx src/scripts/encryptSecret.ts <texto_o_contraseña>\n');
    console.log('Ejemplo: npx tsx src/scripts/encryptSecret.ts 082002\n');
    process.exit(1);
}

const encrypted = encrypt(secret);
const verified = decrypt(encrypted);

console.log('\n======================================================');
console.log('🔐 UTILIDAD DE CIFRADO SEGURO (AES-256-GCM)');
console.log('======================================================');
console.log('Texto original:      ', secret);
console.log('Texto cifrado:       ', encrypted);
console.log('Verificación descif.:', verified);
console.log('======================================================');
console.log('Copia el valor cifrado y pégalo en tu archivo backend/.env:');
console.log(`DB_PASSWORD=${encrypted}\n`);

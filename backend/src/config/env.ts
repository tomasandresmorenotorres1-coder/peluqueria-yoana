import dotenv from 'dotenv';
import path from 'path';
import { decryptSafe } from '../utils/crypto';

// Cargar .env tanto si se ejecuta desde raíz como desde backend/
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Extraer y procesar contraseñas
const rawDbPassword = (process.env.DB_PASSWORD || '').trim();
let databaseUrl = (process.env.DATABASE_URL || '').trim();

// Desencriptación en tiempo de ejecución (runtime decryption)
let decryptedDbPassword = decryptSafe(rawDbPassword);

// Si DATABASE_URL está presente y tiene contraseña cifrada, descifrarla
if (databaseUrl) {
    try {
        const urlObj = new URL(databaseUrl);
        if (urlObj.password && urlObj.password.startsWith('enc:')) {
            urlObj.password = decryptSafe(urlObj.password);
            databaseUrl = urlObj.toString();
        }

        // Si DB_PASSWORD es el placeholder "CONTRASEÑA_ENCRIPTADA_AQUI" o está vacío,
        // pero DATABASE_URL contiene la contraseña real, usarla como respaldo
        if ((!decryptedDbPassword || decryptedDbPassword === 'CONTRASEÑA_ENCRIPTADA_AQUI') && urlObj.password && urlObj.password !== 'CONTRASEÑA_ENCRIPTADA_AQUI') {
            decryptedDbPassword = urlObj.password;
        }

        // Si logramos descifrar DB_PASSWORD y la URL tenía el placeholder, sincronizar la URL
        if (decryptedDbPassword && decryptedDbPassword !== 'CONTRASEÑA_ENCRIPTADA_AQUI') {
            urlObj.password = decryptedDbPassword;
            databaseUrl = urlObj.toString();
        }
    } catch {
        // En caso de que DATABASE_URL no sea una URL válida
    }
}

// Desencriptación en tiempo de ejecución de la contraseña SMTP de Gmail (si tiene prefijo enc:)
const rawSmtpPass = (process.env.SMTP_PASS || '').trim();
const decryptedSmtpPass = decryptSafe(rawSmtpPass);

export const env = {
    PORT: Number(process.env.PORT) || 4000,
    DATABASE_URL: databaseUrl,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: Number(process.env.DB_PORT) || 5432,
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: decryptedDbPassword,
    DB_NAME: process.env.DB_NAME || 'peluqueria_yoana',
    JWT_SECRET: process.env.JWT_SECRET || '1656a53daa2bec4a78d88e894bd938b06437c1e3dcdb41eee47105dfa9c731e4',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
    WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '573001234567',
    PUBLIC_KEY_MERCADOPAGO: process.env.PUBLIC_KEY_MERCADOPAGO || process.env.MERCADOPAGO_PUBLIC_KEY || '',
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
    SMTP_USER: (process.env.SMTP_USER || '').trim(),
    SMTP_PASS: decryptedSmtpPass,
    SMTP_FROM: (process.env.SMTP_FROM || 'Peluquería Yohana <notificaciones@peluqueriayoana.com>').replace(/^"|"$/g, '').trim(),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

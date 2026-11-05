import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recomendados para GCM
const SALT = 'peluqueria-yoana-db-salt-2026';

/**
 * Obtiene la clave maestra de cifrado derivada de JWT_SECRET o clave interna de la aplicación.
 */
export const getMasterKey = (): Buffer => {
    const secret =
        process.env.APP_ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        '1656a53daa2bec4a78d88e894bd938b06437c1e3dcdb41eee47105dfa9c731e4';
    return crypto.scryptSync(secret, SALT, 32);
};

/**
 * Cifra un texto plano usando AES-256-GCM.
 * Retorna formato: enc:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export const encrypt = (plainText: string): string => {
    if (!plainText) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Descifra una cadena previamente cifrada con `encrypt`.
 * Si el texto no tiene el formato 'enc:...', lo retorna tal como está.
 */
export const decrypt = (encryptedText: string): string => {
    if (!encryptedText) return '';
    if (!encryptedText.startsWith('enc:')) {
        return encryptedText;
    }
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        throw new Error('Formato de cifrado inválido. Se esperaba enc:<iv>:<tag>:<ciphertext>');
    }
    const [, ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const content = Buffer.from(contentHex, 'hex');
    const key = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return decrypted.toString('utf8');
};

/**
 * Descifrado seguro en tiempo de ejecución: no arroja excepciones.
 * Si falla el descifrado o el texto es un placeholder, retorna el fallback o el texto original.
 */
export const decryptSafe = (encryptedText: string, fallback?: string): string => {
    try {
        if (!encryptedText) return fallback || '';
        if (encryptedText === 'CONTRASEÑA_ENCRIPTADA_AQUI') {
            return fallback || encryptedText;
        }
        if (encryptedText.startsWith('enc:')) {
            return decrypt(encryptedText);
        }
        return encryptedText;
    } catch (err: any) {
        console.warn(`[Crypto] No se pudo descifrar el valor: ${err.message}. Usando fallback.`);
        return fallback || encryptedText;
    }
};

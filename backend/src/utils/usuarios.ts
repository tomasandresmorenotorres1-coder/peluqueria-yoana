/** Validaciones y contraseñas de usuarios. */
import bcrypt from 'bcryptjs';

// Costo del hash: más alto = más seguro pero más lento. 12 es un valor recomendado hoy.
const COSTO_BCRYPT = 12;

export const hashearPassword = (password: string): Promise<string> => bcrypt.hash(password, COSTO_BCRYPT);

export const comprobarPassword = (password: string, hash: string): Promise<boolean> =>
    bcrypt.compare(password, hash);

// Hash falso para gastar el mismo tiempo cuando el correo no existe (evita adivinar qué correos están registrados)
export const HASH_FALSO = bcrypt.hashSync('contraseña-que-nadie-usa', COSTO_BCRYPT);

export const normalizarEmail = (email: unknown): string =>
    typeof email === 'string' ? email.trim().toLowerCase() : '';

export const emailValido = (email: string): boolean =>
    email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

/** Devuelve un mensaje de error o null si la contraseña es aceptable. */
export const validarPassword = (password: unknown): string | null => {
    if (typeof password !== 'string') return 'La contraseña es obligatoria';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    // bcrypt solo usa los primeros 72 bytes; se rechaza más para no engañar al usuario
    if (Buffer.byteLength(password) > 72) return 'La contraseña no puede superar los 72 caracteres';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe tener letras y números';
    return null;
};

export const nombreValido = (nombre: unknown): nombre is string =>
    typeof nombre === 'string' && nombre.trim().length >= 2 && nombre.trim().length <= 150;

export const telefonoValido = (telefono: unknown): telefono is string =>
    typeof telefono === 'string' && /^[+\d][\d\s-]{6,24}$/.test(telefono.trim());

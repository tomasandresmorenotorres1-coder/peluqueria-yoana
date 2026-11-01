/**
 * Seguridad de la API: inicio de sesión con token (JWT) y permisos por rol.
 *
 * Roles:
 *  - ADMIN:     puede hacer todo.
 *  - ESTILISTA: ve sus citas y ajusta sus horarios.
 *  - CLIENTE:   hace y consulta sus reservas.
 *
 * Cómo se usa en una ruta:
 *   router.get('/algo', autenticar, requireRol('ADMIN'), handler)
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import { pool } from '../config/db';

export type Rol = 'ADMIN' | 'ESTILISTA' | 'CLIENTE';

export interface UsuarioAuth {
    id: number;
    email: string;
    nombre_completo: string;
    rol: Rol;
    equipo_id: number | null;
    cliente_id: number | null;
}

// Permite usar req.usuario en todas las rutas
declare global {
    namespace Express {
        interface Request {
            usuario?: UsuarioAuth;
        }
    }
}

const MIN_LARGO_SECRETO = 32;

const obtenerSecreto = (): string => {
    const secreto = process.env.JWT_SECRET || '';
    if (secreto.length < MIN_LARGO_SECRETO) {
        throw new Error(`JWT_SECRET no está configurado o tiene menos de ${MIN_LARGO_SECRETO} caracteres`);
    }
    // Rechaza el texto de ejemplo de .env.example: es público, cualquiera podría falsificar sesiones
    if (secreto.startsWith('cambia_')) {
        throw new Error('JWT_SECRET sigue con el valor de ejemplo: cámbialo por un texto propio y secreto');
    }
    return secreto;
};

/** Crea el token que el usuario guarda después de iniciar sesión. */
export const firmarToken = (usuario: { id: number; rol: Rol }): string => {
    const opciones = { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as jwt.SignOptions;
    return jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, obtenerSecreto(), opciones);
};

/**
 * Lee el token del encabezado "Authorization: Bearer <token>".
 * Devuelve null si no hay token; lanza error si el token es inválido o vencido.
 */
const leerUsuarioDelToken = async (req: Request): Promise<UsuarioAuth | null> => {
    const cabecera = req.header('authorization');
    if (!cabecera) return null;

    const [tipo, token] = cabecera.split(' ');
    if (tipo !== 'Bearer' || !token) throw new Error('TOKEN_INVALIDO');

    let datos: jwt.JwtPayload;
    try {
        datos = jwt.verify(token, obtenerSecreto(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch (error: any) {
        if (String(error.message).includes('JWT_SECRET')) throw error;
        throw new Error('TOKEN_INVALIDO');
    }

    // Se consulta la base en cada petición: si desactivan o cambian al usuario, aplica de inmediato
    const { rows } = await pool.query(
        `SELECT id, email, nombre_completo, rol, equipo_id, cliente_id
         FROM usuarios WHERE id = $1 AND activo = TRUE`,
        [Number(datos.sub)]
    );
    if (rows.length === 0) throw new Error('TOKEN_INVALIDO');
    return rows[0] as UsuarioAuth;
};

const responderErrorAuth = (error: any, res: Response) => {
    if (error.message === 'TOKEN_INVALIDO') {
        return res.status(401).json({ ok: false, error: 'Sesión inválida o vencida. Inicia sesión de nuevo.' });
    }
    if (String(error.message).includes('JWT_SECRET')) {
        console.error(error.message);
        return res.status(503).json({ ok: false, error: 'El servidor no tiene configurada la seguridad (JWT_SECRET)' });
    }
    console.error('Error de autenticación:', error);
    return res.status(500).json({ ok: false, error: 'Error interno de autenticación' });
};

/** Exige haber iniciado sesión. */
export const autenticar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuario = await leerUsuarioDelToken(req);
        if (!usuario) {
            return res.status(401).json({ ok: false, error: 'Debes iniciar sesión' });
        }
        req.usuario = usuario;
        next();
    } catch (error) {
        responderErrorAuth(error, res);
    }
};

/** Deja pasar a cualquiera; si trae token válido, carga al usuario (para reservar con o sin cuenta). */
export const autenticarOpcional = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuario = await leerUsuarioDelToken(req);
        if (usuario) req.usuario = usuario;
        next();
    } catch (error) {
        responderErrorAuth(error, res);
    }
};

/** Exige que el usuario tenga uno de los roles indicados. Va después de `autenticar`. */
export const requireRol = (...roles: Rol[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.usuario) {
            return res.status(401).json({ ok: false, error: 'Debes iniciar sesión' });
        }
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ ok: false, error: 'No tienes permiso para esta acción' });
        }
        next();
    };

// ---------------------------------------------------------------------
// Secreto compartido para el aviso (webhook) de la pasarela de pagos
// ---------------------------------------------------------------------
const iguales = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

export const requireWebhookSecret = (req: Request, res: Response, next: NextFunction) => {
    const esperado = process.env.WEBHOOK_SECRET;
    if (!esperado) {
        // Sin clave configurada, la ruta queda bloqueada (más seguro que dejarla abierta)
        return res.status(503).json({ ok: false, error: 'El servidor no tiene configurada WEBHOOK_SECRET' });
    }
    if (!iguales(req.header('x-webhook-secret') || '', esperado)) {
        return res.status(401).json({ ok: false, error: 'No autorizado' });
    }
    next();
};

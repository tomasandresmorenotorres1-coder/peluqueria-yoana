import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const iguales = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

const crearMiddleware = (nombreHeader: string, variableEnv: string) =>
    (req: Request, res: Response, next: NextFunction) => {
        const esperado = process.env[variableEnv];
        if (!esperado) {
            // Si no hay clave configurada, la ruta queda bloqueada (más seguro que dejarla abierta)
            return res.status(503).json({ ok: false, error: `El servidor no tiene configurada ${variableEnv}` });
        }
        const recibido = req.header(nombreHeader) || '';
        if (!iguales(recibido, esperado)) {
            return res.status(401).json({ ok: false, error: 'No autorizado' });
        }
        next();
    };

// Para rutas del administrador (cambiar precios)
export const requireAdmin = crearMiddleware('x-admin-key', 'ADMIN_API_KEY');

// Para el aviso (webhook) de la pasarela de pagos
export const requireWebhookSecret = crearMiddleware('x-webhook-secret', 'WEBHOOK_SECRET');

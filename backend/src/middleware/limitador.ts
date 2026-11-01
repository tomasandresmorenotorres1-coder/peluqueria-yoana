/**
 * Limita los intentos por IP en una ventana de tiempo (frena a quien intenta adivinar contraseñas
 * o crear cuentas en masa). Funciona en memoria: se reinicia al apagar el servidor.
 *
 *  - contar: 'fallos' -> solo cuentan las respuestas con error (un login correcto no suma)
 *  - contar: 'todos'  -> cuenta cada petición (útil para el registro)
 */
import { Request, Response, NextFunction } from 'express';

export const limitarIntentos = (maximo: number, ventanaMs: number, contar: 'fallos' | 'todos' = 'fallos') => {
    const registro = new Map<string, { intentos: number; reinicia: number }>();

    // Limpieza periódica para que el mapa no crezca sin fin
    setInterval(() => {
        const ahora = Date.now();
        for (const [clave, dato] of registro) {
            if (dato.reinicia <= ahora) registro.delete(clave);
        }
    }, ventanaMs).unref();

    const sumar = (clave: string) => {
        const ahora = Date.now();
        const dato = registro.get(clave);
        if (!dato || dato.reinicia <= ahora) registro.set(clave, { intentos: 1, reinicia: ahora + ventanaMs });
        else dato.intentos += 1;
    };

    return (req: Request, res: Response, next: NextFunction) => {
        const clave = req.ip || 'desconocida';
        const dato = registro.get(clave);

        if (dato && dato.reinicia > Date.now() && dato.intentos >= maximo) {
            const segundos = Math.ceil((dato.reinicia - Date.now()) / 1000);
            res.setHeader('Retry-After', String(segundos));
            return res.status(429).json({
                ok: false,
                error: `Demasiados intentos. Espera ${Math.ceil(segundos / 60)} minuto(s) e inténtalo de nuevo.`,
            });
        }

        if (contar === 'todos') sumar(clave);
        else res.on('finish', () => { if (res.statusCode >= 400) sumar(clave); });
        next();
    };
};

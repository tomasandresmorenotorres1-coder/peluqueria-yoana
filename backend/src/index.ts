import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, verificarConexionDB } from './config/db';

import catalogoRoutes from './routes/catalogo.routes';
import turnosRoutes from './routes/turnos.routes';
import pagosRoutes from './routes/pagos.routes';
import interaccionRoutes from './routes/interaccion.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import estilistaRoutes from './routes/estilista.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
// CORS: FRONTEND_URL puede tener varias URLs separadas por coma, sin "/" final
const origenesPermitidos = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
origenesPermitidos.push('http://localhost:5173');
app.use(express.json());

// Previews de Vercel de TU proyecto (ajusta el prefijo al nombre real del proyecto)
const regexPreviews = /^https:\/\/peluqueria-yoana-[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // webhooks, curl, health checks
        if (origenesPermitidos.includes(origin) || regexPreviews.test(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
}));
app.use(express.json());

// Endpoint de salud del servidor y base de datos
app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() AS fecha_servidor');
        res.json({
            ok: true,
            mensaje: 'API de Peluquería Yohana operativa',
            db_time: result.rows[0].fecha_servidor,
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error de conexión con la base de datos' });
    }
});

// Registro de módulos de la API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/estilista', estilistaRoutes);
app.use('/api/especialista', estilistaRoutes); // Alias directo para especialistas
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api', interaccionRoutes);

// Ruta no encontrada
app.use((_req: Request, res: Response) => {
    res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

// Manejo general de errores
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ ok: false, error: 'El cuerpo de la petición no es un JSON válido' });
    }
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, async () => {
    await verificarConexionDB();
    console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});

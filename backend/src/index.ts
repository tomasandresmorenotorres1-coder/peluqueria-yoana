import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pool, verificarConexionDB } from './config/db';


import catalogoRoutes from './routes/catalogo.routes';
import turnosRoutes from './routes/turnos.routes';
import pagosRoutes from './routes/pagos.routes';
import interaccionRoutes from './routes/interaccion.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
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
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api', interaccionRoutes);

// Ruta no encontrada
app.use((_req: Request, res: Response) => {
    res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

// Manejo general de errores (por ejemplo, un JSON mal enviado)
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
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
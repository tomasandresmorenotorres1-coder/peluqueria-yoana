import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, verificarConexionDB } from './config/db';


import catalogoRoutes from './routes/catalogo.routes';
import turnosRoutes from './routes/turnos.routes';
import pagosRoutes from './routes/pagos.routes';
import interaccionRoutes from './routes/interaccion.routes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de salud del servidor y base de datos
app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() AS fecha_servidor');
        res.json({
            ok: true,
            mensaje: 'API de Peluquería Yoana operativa',
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

// Iniciar servidor
app.listen(PORT, async () => {
    await verificarConexionDB();
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
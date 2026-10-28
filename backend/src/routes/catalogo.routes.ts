import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();

// 1. Obtener servicios (con filtro opcional por categoría: ?categoria=Cabello)
router.get('/servicios', async (req: Request, res: Response) => {
    try {
        const { categoria } = req.query;
        let query = `
      SELECT s.id, c.nombre AS categoria, s.nombre, s.descripcion,
             s.precio_actual, s.duracion_minutos, s.icono, s.texto_alternativo
      FROM servicios s
      JOIN categorias c ON s.categoria_id = c.id
      WHERE s.activo = TRUE
    `;
        const params: any[] = [];

        if (categoria) {
            params.push(categoria);
            query += ` AND LOWER(c.nombre) = LOWER($1)`;
        }

        query += ` ORDER BY s.id ASC`;
        const { rows } = await pool.query(query, params);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener servicios' });
    }
});

// 2. Actualizar el precio actual de un servicio
router.patch('/servicios/:id/precio', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nuevo_precio } = req.body;

        if (nuevo_precio === undefined || Number(nuevo_precio) < 0) {
            return res.status(400).json({ ok: false, error: 'Precio inválido' });
        }

        const { rows } = await pool.query(
            `UPDATE servicios
       SET precio_actual = $1, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
            [nuevo_precio, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Servicio no encontrado' });
        }

        res.json({ ok: true, mensaje: 'Precio de servicio actualizado', data: rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al actualizar el precio del servicio' });
    }
});

// 3. Obtener catálogo de productos disponibles
router.get('/productos', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT p.id, c.nombre AS categoria, p.nombre, p.descripcion,
             p.precio_actual, p.stock, p.imagen_url, p.texto_alternativo
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = TRUE
      ORDER BY p.id ASC
    `);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener productos' });
    }
});

// 4. Actualizar precio o stock de un producto
router.patch('/productos/:id/precio', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nuevo_precio, nuevo_stock } = req.body;

        const { rows } = await pool.query(
            `UPDATE productos
       SET precio_actual = COALESCE($1, precio_actual),
           stock = COALESCE($2, stock),
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
            [nuevo_precio ?? null, nuevo_stock ?? null, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Producto no encontrado' });
        }

        res.json({ ok: true, mensaje: 'Producto actualizado', data: rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al actualizar producto' });
    }
});

// 5. Obtener equipo de estilistas y galería
router.get('/equipo', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM equipo WHERE activo = TRUE ORDER BY id ASC');
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener el equipo' });
    }
});

router.get('/galeria', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM galeria ORDER BY destacado DESC, id DESC');
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener la galería' });
    }
});

export default router;
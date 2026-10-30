import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const DEFAULT_SERVICE_IMAGES: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop&auto=format',
    2: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop&auto=format',
    3: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop&auto=format',
    4: 'https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=600&h=400&fit=crop&auto=format',
    5: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=400&fit=crop&auto=format',
    6: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop&auto=format',
    7: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=400&fit=crop&auto=format',
    8: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop&auto=format',
    9: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&h=400&fit=crop&auto=format',
    10: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&h=400&fit=crop&auto=format',
    11: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop&auto=format',
    12: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=400&fit=crop&auto=format',
};

// 1. Obtener servicios con imagen y calificación dinámica calculada desde PostgreSQL
router.get('/servicios', async (req: Request, res: Response) => {
    try {
        const { categoria, genero } = req.query;
        let query = `
            SELECT s.id, c.nombre AS categoria_nombre, s.nombre, s.descripcion,
                   s.precio_actual, s.duracion_minutos, s.icono, s.texto_alternativo,
                   s.genero,
                   COALESCE(ROUND(AVG(r.calificacion)::numeric, 1), 5.0) AS calificacion_promedio,
                   COUNT(r.id)::int AS total_resenas
            FROM servicios s
            JOIN categorias c ON s.categoria_id = c.id
            LEFT JOIN resenas r ON r.servicio_id = s.id AND r.aprobada = TRUE
            WHERE s.activo = TRUE
        `;
        const params: any[] = [];

        if (genero) {
            params.push(genero);
            query += ` AND s.genero = $${params.length}`;
        } else if (categoria && categoria !== 'todos') {
            params.push(categoria);
            query += ` AND (LOWER(c.nombre) = LOWER($${params.length}) OR s.genero = $${params.length})`;
        }

        query += ` GROUP BY s.id, c.nombre ORDER BY s.id ASC`;
        const { rows } = await pool.query(query, params);

        const data = rows.map((r) => ({
            id: r.id,
            name: r.nombre,
            desc: r.descripcion,
            duration: `${r.duracion_minutos} min`,
            price: Number(r.precio_actual),
            icon: r.icono || '✂️',
            category: r.genero || 'unisex',
            img: DEFAULT_SERVICE_IMAGES[r.id] || 'https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=600&h=400&fit=crop&auto=format',
            rating: Number(r.calificacion_promedio || 5.0),
            totalReviews: Number(r.total_resenas || 0),
            // Campos nativos
            nombre: r.nombre,
            descripcion: r.descripcion,
            duracion_minutos: r.duracion_minutos,
            precio_actual: Number(r.precio_actual),
            icono: r.icono,
            texto_alternativo: r.texto_alternativo,
            genero: r.genero,
            categoria_nombre: r.categoria_nombre,
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ ok: false, error: 'Error al obtener servicios' });
    }
});

// 2. Actualizar precio de un servicio
router.patch('/servicios/:id/precio', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nuevo_precio } = req.body;

        if (nuevo_precio === undefined || !Number.isFinite(Number(nuevo_precio)) || Number(nuevo_precio) < 0) {
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

// 3. Catálogo de productos disponibles
router.get('/productos', async (req: Request, res: Response) => {
    try {
        const { genero, categoria } = req.query;
        let query = `
            SELECT p.id, c.nombre AS categoria_nombre, p.nombre, p.marca, p.descripcion,
                   p.precio_actual, p.stock, p.imagen_url, p.texto_alternativo,
                   p.etiqueta, p.genero
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = TRUE
        `;
        const params: any[] = [];

        if (genero && genero !== 'todos') {
            params.push(genero);
            query += ` AND p.genero = $${params.length}`;
        } else if (categoria && categoria !== 'todos') {
            params.push(categoria);
            query += ` AND (LOWER(c.nombre) = LOWER($${params.length}) OR p.genero = $${params.length})`;
        }

        query += ` ORDER BY p.id ASC`;
        const { rows } = await pool.query(query, params);

        const data = rows.map((r) => ({
            id: r.id,
            name: r.nombre,
            brand: r.marca || 'General',
            price: Number(r.precio_actual),
            img: r.imagen_url,
            tag: r.etiqueta || null,
            category: r.genero || 'hombre',
            stock: r.stock,
            desc: r.descripcion,
            // Campos nativos
            nombre: r.nombre,
            marca: r.marca,
            precio_actual: Number(r.precio_actual),
            imagen_url: r.imagen_url,
            texto_alternativo: r.texto_alternativo,
            etiqueta: r.etiqueta,
            genero: r.genero,
            categoria_nombre: r.categoria_nombre,
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ ok: false, error: 'Error al obtener productos' });
    }
});

// 4. Actualizar precio o stock de un producto
router.patch('/productos/:id/precio', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nuevo_precio, nuevo_stock } = req.body;

        if (nuevo_precio === undefined && nuevo_stock === undefined) {
            return res.status(400).json({ ok: false, error: 'Envía nuevo_precio y/o nuevo_stock' });
        }
        if (nuevo_precio !== undefined && (!Number.isFinite(Number(nuevo_precio)) || Number(nuevo_precio) < 0)) {
            return res.status(400).json({ ok: false, error: 'Precio inválido' });
        }
        if (nuevo_stock !== undefined && (!Number.isInteger(Number(nuevo_stock)) || Number(nuevo_stock) < 0)) {
            return res.status(400).json({ ok: false, error: 'Stock inválido' });
        }

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

// 5. Equipo de estilistas y barberos
router.get('/equipo', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, nombre, especialidad, biografia, anios_experiencia, genero,
                   foto_url, texto_alternativo, capacitado_accesibilidad
            FROM equipo
            WHERE activo = TRUE
            ORDER BY id ASC
        `);

        const data = rows.map((r) => ({
            id: r.id,
            name: r.nombre,
            role: r.especialidad,
            exp: r.anios_experiencia || '5 años',
            gender: r.genero || 'M',
            img: r.foto_url,
            // Campos nativos
            nombre: r.nombre,
            especialidad: r.especialidad,
            biografia: r.biografia,
            anios_experiencia: r.anios_experiencia,
            genero: r.genero,
            foto_url: r.foto_url,
            capacitado_accesibilidad: r.capacitado_accesibilidad,
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error al obtener el equipo:', error);
        res.status(500).json({ ok: false, error: 'Error al obtener el equipo' });
    }
});

// 6. Galería de fotos
router.get('/galeria', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, titulo, imagen_url, texto_alternativo, clase_span, destacado
            FROM galeria
            ORDER BY destacado DESC, id ASC
        `);

        const data = rows.map((r) => ({
            id: r.id,
            img: r.imagen_url,
            alt: r.texto_alternativo || r.titulo,
            span: r.clase_span || (r.destacado ? 'row-span-2' : ''),
            destacado: r.destacado,
            titulo: r.titulo,
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error al obtener la galería:', error);
        res.status(500).json({ ok: false, error: 'Error al obtener la galería' });
    }
});

export default router;

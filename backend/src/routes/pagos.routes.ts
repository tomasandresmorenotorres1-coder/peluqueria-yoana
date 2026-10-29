import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();

// 1. Crear una orden de compra de productos
router.post('/ordenes', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            nombre_completo,
            telefono_whatsapp,
            email,
            metodo_entrega = 'RETIRO_LOCAL',
            direccion_entrega = null,
            items, // Array de { producto_id (o id), cantidad (o qty) }
        } = req.body;

        if (!nombre_completo || !telefono_whatsapp || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ ok: false, error: 'Datos de cliente o lista de productos incompletos' });
        }

        await client.query('BEGIN');

        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, telefono_whatsapp, email)
             VALUES ($1, $2, $3) RETURNING id`,
            [nombre_completo.trim(), telefono_whatsapp.trim(), email ? email.trim() : null]
        );
        const cliente_id = clienteRes.rows[0].id;

        const ordenRes = await client.query(
            `INSERT INTO ordenes (cliente_id, metodo_entrega, direccion_entrega, total_orden)
             VALUES ($1, $2, $3, 0) RETURNING id`,
            [cliente_id, metodo_entrega, direccion_entrega]
        );
        const orden_id = ordenRes.rows[0].id;

        let totalAcumulado = 0;
        const itemsConfirmados: any[] = [];

        for (const rawItem of items) {
            const productoId = rawItem.producto_id || rawItem.id;
            const cantidad = Number(rawItem.cantidad || rawItem.qty || 1);

            const prodRes = await client.query(
                'SELECT id, nombre, precio_actual, stock FROM productos WHERE id = $1 AND activo = TRUE FOR UPDATE',
                [productoId]
            );

            if (prodRes.rows.length === 0) {
                throw new Error(`Producto ID ${productoId} no encontrado o inactivo`);
            }

            const producto = prodRes.rows[0];
            if (producto.stock < cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre} (Disponible: ${producto.stock}, Solicitado: ${cantidad})`);
            }

            await client.query(
                `INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario_aplicado)
                 VALUES ($1, $2, $3, $4)`,
                [orden_id, productoId, cantidad, producto.precio_actual]
            );

            await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [
                cantidad,
                productoId,
            ]);

            const subtotal = Number(producto.precio_actual) * cantidad;
            totalAcumulado += subtotal;
            itemsConfirmados.push({
                nombre: producto.nombre,
                cantidad,
                precio_unitario: Number(producto.precio_actual),
                subtotal,
            });
        }

        const ordenFinal = await client.query(
            'UPDATE ordenes SET total_orden = $1 WHERE id = $2 RETURNING *',
            [totalAcumulado, orden_id]
        );

        await client.query('COMMIT');
        res.status(201).json({
            ok: true,
            mensaje: 'Orden de compra registrada exitosamente en PostgreSQL',
            data: {
                ...ordenFinal.rows[0],
                items: itemsConfirmados,
            },
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al crear la orden:', error.message);
        res.status(400).json({ ok: false, error: error.message || 'Error al crear la orden' });
    } finally {
        client.release();
    }
});

// 2. Iniciar transacción en la Pasarela de Pagos (para un Turno o una Orden)
router.post('/iniciar', async (req: Request, res: Response) => {
    try {
        const {
            turno_id = null,
            orden_id = null,
            pasarela_nombre = 'WOMPI',
            metodo_pago,
        } = req.body;

        if (!turno_id && !orden_id) {
            return res.status(400).json({ ok: false, error: 'Debe asociar el pago a un turno_id o a un orden_id' });
        }

        let monto_total = 0;

        if (turno_id) {
            const tRes = await pool.query('SELECT precio_aplicado FROM turnos WHERE id = $1', [turno_id]);
            if (tRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Turno no encontrado' });
            monto_total += Number(tRes.rows[0].precio_aplicado);
        }

        if (orden_id) {
            const oRes = await pool.query('SELECT total_orden FROM ordenes WHERE id = $1', [orden_id]);
            if (oRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Orden no encontrada' });
            monto_total += Number(oRes.rows[0].total_orden);
        }

        const referencia_transaccion = `PY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const { rows } = await pool.query(
            `INSERT INTO pagos (
                turno_id, orden_id, pasarela_nombre, referencia_transaccion,
                monto_total, metodo_pago, estado_pago
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE') RETURNING *`,
            [turno_id, orden_id, pasarela_nombre, referencia_transaccion, monto_total, metodo_pago || 'EFECTIVO_LOCAL']
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Transacción de pago generada',
            data: rows[0],
        });
    } catch (error) {
        console.error('Error al iniciar pago:', error);
        res.status(500).json({ ok: false, error: 'Error al registrar el pago en la pasarela' });
    }
});

// 3. Webhook / Confirmación de estado de la Pasarela de Pagos
router.post('/confirmar', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { referencia_transaccion, estado_pago, respuesta_pasarela = {} } = req.body;

        await client.query('BEGIN');

        const pagoRes = await client.query(
            `UPDATE pagos
             SET estado_pago = $1, respuesta_pasarela = $2, fecha_pago = CURRENT_TIMESTAMP
             WHERE referencia_transaccion = $3 RETURNING *`,
            [estado_pago, JSON.stringify(respuesta_pasarela), referencia_transaccion]
        );

        if (pagoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'Referencia de transacción no encontrada' });
        }

        const pago = pagoRes.rows[0];

        if (estado_pago === 'APROBADO') {
            if (pago.turno_id) {
                await client.query(`UPDATE turnos SET estado = 'CONFIRMADO' WHERE id = $1`, [pago.turno_id]);
            }
            if (pago.orden_id) {
                await client.query(`UPDATE ordenes SET estado_orden = 'PAGADA' WHERE id = $1`, [pago.orden_id]);
            }
        }

        await client.query('COMMIT');
        res.json({ ok: true, mensaje: `Estado de pago actualizado a ${estado_pago}`, data: pago });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ ok: false, error: 'Error al confirmar la transacción de pago' });
    } finally {
        client.release();
    }
});

export default router;

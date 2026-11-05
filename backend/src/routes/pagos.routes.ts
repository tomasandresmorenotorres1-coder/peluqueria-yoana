import { Router, Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { pool } from '../config/db';
import { autenticarOpcional, requireWebhookSecret } from '../middleware/auth';
import { obtenerOCrearCliente } from '../utils/clientes';

const router = Router();

// 1. Crear una orden de compra de productos
router.post('/ordenes', autenticarOpcional, async (req: Request, res: Response) => {
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

        const cuentaCliente = req.usuario?.rol === 'CLIENTE' ? req.usuario : null;
        if (!Array.isArray(items) || items.length === 0 || (!cuentaCliente && (!nombre_completo || !telefono_whatsapp))) {
            return res.status(400).json({ ok: false, error: 'Datos de cliente o lista de productos incompletos' });
        }

        await client.query('BEGIN');

        const cliente_id = cuentaCliente
            ? cuentaCliente.cliente_id!
            : await obtenerOCrearCliente(client, nombre_completo.trim(), telefono_whatsapp.trim(), email ? email.trim() : null);

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
            const cantidad = Number(rawItem.cantidad ?? rawItem.qty ?? 1);

            const prodRes = await client.query(
                'SELECT id, nombre, precio_actual, stock FROM productos WHERE id = $1 AND activo = TRUE FOR UPDATE',
                [productoId]
            );

            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                throw new Error('La cantidad de cada producto debe ser un número entero mayor a 0');
            }

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

// 2. CREAR PREFERENCIA DE PAGO EN MERCADO PAGO (/api/pagos/crear-preferencia)
router.post('/crear-preferencia', autenticarOpcional, async (req: Request, res: Response) => {
    try {
        const {
            turno_id = null,
            orden_id = null,
            items: itemsBody,
            monto: montoEspecificado,
            titulo = 'Servicio Peluquería Yohana',
            es_abono = false,
        } = req.body;

        let monto = Number(montoEspecificado || 0);
        let items: Array<{ id?: string; title: string; quantity: number; unit_price: number }> = [];

        if (turno_id) {
            const tRes = await pool.query(
                `SELECT t.id, t.precio_aplicado, s.nombre AS servicio, e.nombre AS especialista
                 FROM turnos t
                 JOIN servicios s ON s.id = t.servicio_id
                 JOIN equipo e ON e.id = t.equipo_id
                 WHERE t.id = $1`,
                [turno_id]
            );
            if (tRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Turno no encontrado' });
            const turno = tRes.rows[0];
            const precioBase = Number(turno.precio_aplicado);
            // Si es abono de reserva, se cobra el 50%
            monto = es_abono ? Math.round(precioBase * 0.5) : (monto > 0 ? monto : precioBase);
            items = [
                {
                    id: `turno-${turno.id}`,
                    title: es_abono
                        ? `Abono (50%): ${turno.servicio} con ${turno.especialista}`
                        : `Turno: ${turno.servicio} con ${turno.especialista}`,
                    quantity: 1,
                    unit_price: monto,
                },
            ];
        } else if (orden_id) {
            const oRes = await pool.query('SELECT total_orden FROM ordenes WHERE id = $1', [orden_id]);
            if (oRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Orden no encontrada' });
            monto = Number(oRes.rows[0].total_orden);
            items = [
                {
                    id: `orden-${orden_id}`,
                    title: `Productos Peluquería Yohana - Orden #${orden_id}`,
                    quantity: 1,
                    unit_price: monto,
                },
            ];
        } else if (Array.isArray(itemsBody) && itemsBody.length > 0) {
            items = itemsBody.map((it: any) => ({
                id: String(it.id || 'py-item'),
                title: String(it.title || titulo),
                quantity: Number(it.quantity || 1),
                unit_price: Number(it.unit_price || it.price || 0),
            }));
            monto = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        } else if (monto > 0) {
            items = [
                {
                    id: 'py-servicio',
                    title: titulo,
                    quantity: 1,
                    unit_price: monto,
                },
            ];
        } else {
            return res.status(400).json({ ok: false, error: 'Debe especificar turno_id, orden_id, items o un monto válido' });
        }

        const referencia_transaccion = `MP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

        let preferenciaId = `pref_${referencia_transaccion}`;
        let initPoint = `${frontendUrl}/?pago=simulado&ref=${referencia_transaccion}`;

        const isRealToken = accessToken && !accessToken.startsWith('TEST-000000') && accessToken.length > 20;

        if (isRealToken) {
            try {
                const client = new MercadoPagoConfig({ accessToken });
                const preference = new Preference(client);
                const mpRes = await preference.create({
                    body: {
                        items: items.map((i) => ({
                            id: i.id || 'py-1',
                            title: i.title,
                            quantity: i.quantity,
                            unit_price: i.unit_price,
                            currency_id: 'COP',
                        })),
                        back_urls: {
                            success: `${frontendUrl}/?pago=aprobado&ref=${referencia_transaccion}`,
                            failure: `${frontendUrl}/?pago=fallido&ref=${referencia_transaccion}`,
                            pending: `${frontendUrl}/?pago=pendiente&ref=${referencia_transaccion}`,
                        },
                        auto_return: 'approved',
                        external_reference: referencia_transaccion,
                    },
                });

                if (mpRes.id) {
                    preferenciaId = mpRes.id;
                    initPoint = mpRes.init_point || mpRes.sandbox_init_point || initPoint;
                }
            } catch (mpError: any) {
                console.warn('⚠️ SDK Mercado Pago en modo local/sandbox:', mpError.message || mpError);
            }
        }

        // Guardar registro del pago en estado PENDIENTE
        const { rows: pagoRows } = await pool.query(
            `INSERT INTO pagos (
                turno_id, orden_id, pasarela_nombre, referencia_transaccion,
                monto_total, metodo_pago, estado_pago, preferencia_id, init_point
             )
             VALUES ($1, $2, 'MERCADOPAGO', $3, $4, 'MERCADO_PAGO', 'PENDIENTE', $5, $6)
             RETURNING *`,
            [turno_id, orden_id, referencia_transaccion, monto, preferenciaId, initPoint]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Preferencia de pago Mercado Pago generada con éxito',
            data: {
                ...pagoRows[0],
                id: preferenciaId,
                init_point: initPoint,
                sandbox_init_point: initPoint,
                items,
                monto_total: monto,
                referencia: referencia_transaccion,
            },
        });
    } catch (error: any) {
        console.error('Error al generar preferencia de Mercado Pago:', error);
        res.status(500).json({ ok: false, error: 'Error al generar la preferencia de Mercado Pago' });
    }
});

// 3. Confirmar o simular aprobación de pago
router.post('/confirmar-pago', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { referencia_transaccion, estado = 'APROBADO' } = req.body;
        if (!referencia_transaccion) {
            return res.status(400).json({ ok: false, error: 'referencia_transaccion es obligatoria' });
        }

        await client.query('BEGIN');
        const pagoRes = await client.query(
            `UPDATE pagos
             SET estado_pago = $1, fecha_pago = CURRENT_TIMESTAMP
             WHERE referencia_transaccion = $2 RETURNING *`,
            [estado, referencia_transaccion]
        );

        if (pagoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'Transacción de pago no encontrada' });
        }

        const pago = pagoRes.rows[0];
        if (estado === 'APROBADO') {
            if (pago.turno_id) {
                await client.query(`UPDATE turnos SET estado = 'CONFIRMADO' WHERE id = $1`, [pago.turno_id]);
            }
            if (pago.orden_id) {
                await client.query(`UPDATE ordenes SET estado_orden = 'PAGADA' WHERE id = $1`, [pago.orden_id]);
            }
        }

        await client.query('COMMIT');
        res.json({ ok: true, mensaje: `Pago ${estado.toLowerCase()} exitosamente`, data: pago });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al confirmar pago:', error);
        res.status(500).json({ ok: false, error: 'Error interno al actualizar el estado del pago' });
    } finally {
        client.release();
    }
});

// 4. Iniciar transacción tradicional (WOMPI/Efectivo)
router.post('/iniciar', async (req: Request, res: Response) => {
    try {
        const {
            turno_id = null,
            orden_id = null,
            pasarela_nombre = 'WOMPI',
            metodo_pago,
        } = req.body;

        const METODOS = ['TARJETA', 'PSE', 'NEQUI', 'DAVIPLATA', 'EFECTIVO_LOCAL', 'MERCADO_PAGO'];
        if (!METODOS.includes(metodo_pago)) {
            return res.status(400).json({ ok: false, error: `metodo_pago debe ser uno de: ${METODOS.join(', ')}` });
        }

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

// 5. Webhook con firma compartida
router.post('/confirmar', requireWebhookSecret, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { referencia_transaccion, estado_pago, respuesta_pasarela = {} } = req.body;

        const ESTADOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO', 'ERROR'];
        if (!referencia_transaccion || !ESTADOS.includes(estado_pago)) {
            return res.status(400).json({ ok: false, error: `Se requiere referencia_transaccion y estado_pago (${ESTADOS.join(', ')})` });
        }

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

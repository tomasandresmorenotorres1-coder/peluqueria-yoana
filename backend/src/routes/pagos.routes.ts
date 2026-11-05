import { Router, Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Order } from 'mercadopago';
import { pool } from '../config/db';
import { env } from '../config/env';
import { autenticarOpcional, requireWebhookSecret } from '../middleware/auth';
import { obtenerOCrearCliente } from '../utils/clientes';

const router = Router();

// Tarjetas de prueba oficiales de Mercado Pago para el entorno Sandbox
export const TARJETAS_PRUEBA_SANDBOX = [
    {
        franquicia: 'Mastercard',
        tipo: 'Aprobación Inmediata',
        numero: '5031 7500 0000 0001',
        vencimiento: '11/28',
        cvv: '123',
        titular: 'APRO',
    },
    {
        franquicia: 'Visa',
        tipo: 'Aprobación Inmediata',
        numero: '4509 9500 0000 0001',
        vencimiento: '11/28',
        cvv: '123',
        titular: 'APRO',
    },
    {
        franquicia: 'Mastercard',
        tipo: 'Rechazo: Fondos Insuficientes',
        numero: '5031 7500 0000 0002',
        vencimiento: '11/28',
        cvv: '123',
        titular: 'FUND',
    },
    {
        franquicia: 'Visa',
        tipo: 'Rechazo: Error General',
        numero: '4509 9500 0000 0004',
        vencimiento: '11/28',
        cvv: '123',
        titular: 'OTHE',
    },
];

// Endpoint informativo para obtener las tarjetas de prueba del Sandbox
router.get('/tarjetas-prueba', (_req: Request, res: Response) => {
    res.json({
        ok: true,
        entorno: 'Mercado Pago Sandbox',
        tarjetas: TARJETAS_PRUEBA_SANDBOX,
    });
});

// 1. Crear una orden de compra de productos de la tienda
router.post('/ordenes', autenticarOpcional, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            nombre_completo,
            telefono_whatsapp,
            email,
            metodo_entrega = 'RETIRO_LOCAL',
            direccion_entrega = null,
            items,
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

/**
 * Función controladora común para procesar órdenes / preferencias en Mercado Pago Sandbox
 */
async function procesarCreacionOrdenMercadoPago(req: Request, res: Response) {
    try {
        const {
            turno_id = null,
            orden_id = null,
            items: itemsBody,
            monto: montoEspecificado,
            titulo = 'Servicio Peluquería Yohana',
            es_abono = false,
            payer = null,
        } = req.body;

        let monto = Number(montoEspecificado || 0);
        let items: Array<{ id?: string; title: string; quantity: number; unit_price: number }> = [];
        let descripcionItem = titulo;

        // 1. Resolver ítems y montos si viene de un Turno o de una Orden
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
            descripcionItem = es_abono
                ? `Abono (50%): ${turno.servicio} con ${turno.especialista}`
                : `Turno: ${turno.servicio} con ${turno.especialista}`;
            items = [
                {
                    id: `turno-${turno.id}`,
                    title: descripcionItem,
                    quantity: 1,
                    unit_price: monto,
                },
            ];
        } else if (orden_id) {
            const oRes = await pool.query('SELECT total_orden FROM ordenes WHERE id = $1', [orden_id]);
            if (oRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Orden no encontrada' });
            monto = Number(oRes.rows[0].total_orden);
            descripcionItem = `Productos Peluquería Yohana - Orden #${orden_id}`;
            items = [
                {
                    id: `orden-${orden_id}`,
                    title: descripcionItem,
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

        const referencia_transaccion = `MP-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
        const accessToken = env.MERCADOPAGO_ACCESS_TOKEN;

        let ordenOPreferenciaId = `pref_${referencia_transaccion}`;
        let initPoint = `${frontendUrl}/?pago=simulado&ref=${referencia_transaccion}`;
        let sandboxInitPoint = `${frontendUrl}/?pago=simulado&ref=${referencia_transaccion}`;

        const isRealToken = accessToken && !accessToken.startsWith('TEST-000000') && accessToken.length > 20;

        // 2. Inicializar SDK de Mercado Pago y crear la orden en Sandbox
        if (isRealToken) {
            try {
                const client = new MercadoPagoConfig({
                    accessToken,
                    options: { timeout: 10000 },
                });

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
                        payer: payer
                            ? {
                                name: payer.name,
                                email: payer.email,
                            }
                            : undefined,
                        back_urls: {
                            success: `${frontendUrl}/?pago=aprobado&ref=${referencia_transaccion}`,
                            failure: `${frontendUrl}/?pago=fallido&ref=${referencia_transaccion}`,
                            pending: `${frontendUrl}/?pago=pendiente&ref=${referencia_transaccion}`,
                        },
                        auto_return: 'approved',
                        external_reference: referencia_transaccion,
                        statement_descriptor: 'PELUQUERIA YOHANA',
                    },
                });

                if (mpRes.id) {
                    ordenOPreferenciaId = mpRes.id;
                    initPoint = mpRes.init_point || initPoint;
                    sandboxInitPoint = mpRes.sandbox_init_point || mpRes.init_point || sandboxInitPoint;
                }
            } catch (mpError: any) {
                console.warn('⚠️ SDK Mercado Pago en modo Sandbox/Local:', mpError.message || mpError);
            }
        }

        // 3. Registrar transacción de pago en PostgreSQL
        const { rows: pagoRows } = await pool.query(
            `INSERT INTO pagos (
                turno_id, orden_id, pasarela_nombre, referencia_transaccion,
                monto_total, metodo_pago, estado_pago, preferencia_id, init_point
             )
             VALUES ($1, $2, 'MERCADOPAGO_SANDBOX', $3, $4, 'MERCADO_PAGO', 'PENDIENTE', $5, $6)
             RETURNING *`,
            [turno_id, orden_id, referencia_transaccion, monto, ordenOPreferenciaId, sandboxInitPoint]
        );

        res.status(201).json({
            ok: true,
            mensaje: 'Orden / Preferencia generada con éxito en Mercado Pago Sandbox',
            data: {
                ...pagoRows[0],
                id: ordenOPreferenciaId,
                init_point: initPoint,
                sandbox_init_point: sandboxInitPoint,
                items,
                monto_total: monto,
                referencia: referencia_transaccion,
                sandbox_mode: true,
                tarjetas_prueba: TARJETAS_PRUEBA_SANDBOX,
            },
        });
    } catch (error: any) {
        console.error('Error al generar orden en Mercado Pago:', error);
        res.status(500).json({ ok: false, error: 'Error al generar la orden en Mercado Pago Sandbox' });
    }
}

// 2. CREACIÓN DE ÓRDENES (API ORDERS - SANDBOX)
router.post('/crear-orden', autenticarOpcional, procesarCreacionOrdenMercadoPago);

// Alias de compatibilidad hacia crear-preferencia
router.post('/crear-preferencia', autenticarOpcional, procesarCreacionOrdenMercadoPago);

// 3. Confirmar o simular aprobación de pago en Sandbox
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

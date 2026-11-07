import { Router, Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
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

// Endpoint público para obtener la configuración y clave pública de Mercado Pago
router.get('/public-key', (_req: Request, res: Response) => {
    res.json({
        ok: true,
        public_key: env.PUBLIC_KEY_MERCADOPAGO || 'APP_USR-3d097f55-923b-49b8-a521-2fd108973d89',
        sandbox: true,
    });
});

/**
 * Endpoint oficial de tokenización de tarjetas para Mercado Pago Bricks
 * Resuelve cualquier petición a /checkout/v1/api/bricks/card-form/tokenization o /v1/card_tokens
 */
export async function handleCardTokenization(req: Request, res: Response) {
    try {
        const body = req.body || {};
        const cardNumber = String(
            body.card_number || body.cardNumber || body.number || req.query.card_number || '5031750000000001'
        ).replace(/\s+/g, '');
        const expMonth = Number(body.expiration_month || body.expirationMonth || body.card_expiration_month || 11);
        let expYear = Number(body.expiration_year || body.expirationYear || body.card_expiration_year || 2028);
        if (expYear < 100) expYear += 2000;
        const cardholderName = body.cardholder?.name || body.cardholderName || body.name || 'APRO PRUEBA';
        const docType = body.cardholder?.identification?.type || body.docType || 'CC';
        const docNumber = body.cardholder?.identification?.number || body.docNumber || '12345678';

        const firstSix = cardNumber.length >= 6 ? cardNumber.slice(0, 6) : '503175';
        const lastFour = cardNumber.length >= 4 ? cardNumber.slice(-4) : '0001';
        const isFundReject = cardNumber.endsWith('0002') || cardholderName.toUpperCase().includes('FUND');
        const isGeneralReject = cardNumber.endsWith('0004') || cardholderName.toUpperCase().includes('OTHE');

        const tokenId = `tok_sbx_${isFundReject ? 'FUND_' : isGeneralReject ? 'REJ_' : 'APRO_'}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const responsePayload = {
            id: tokenId,
            public_key: env.PUBLIC_KEY_MERCADOPAGO || 'APP_USR-3d097f55-923b-49b8-a521-2fd108973d89',
            first_six_digits: firstSix,
            last_four_digits: lastFour,
            expiration_month: expMonth,
            expiration_year: expYear,
            live_mode: false,
            status: 'active',
            date_created: new Date().toISOString(),
            date_last_updated: new Date().toISOString(),
            date_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            cardholder: {
                name: cardholderName,
                identification: {
                    number: docNumber,
                    type: docType,
                },
            },
            security_code_length: 3,
        };

        return res.status(201).json(responsePayload);
    } catch (err: any) {
        console.error('Error en tokenización de tarjeta:', err);
        return res.status(500).json({ ok: false, error: 'Error al procesar tokenización de tarjeta' });
    }
}

router.post('/tokenization', handleCardTokenization);
router.all('/tokenization', handleCardTokenization);
router.post('/card-form/tokenization', handleCardTokenization);
router.all('/card-form/tokenization', handleCardTokenization);

// 1. Crear una orden de compra de productos de la tienda en PostgreSQL
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
                producto_id: productoId,
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
 * 2. CONTROLADOR MULTIPROPÓSITO: MERCADO PAGO SANDBOX (API Orders / Preferences)
 * Soporta:
 *  a) Servicio individual (reserva de turno con turno_id o monto)
 *  b) Carrito de compras de productos (recibe orden_id o array de items dinámicos)
 */
async function procesarCreacionOrdenMercadoPago(req: Request, res: Response) {
    try {
        const {
            turno_id = null,
            orden_id = null,
            items: itemsBody,
            monto: montoEspecificado,
            titulo = 'Peluquería Yohana',
            es_abono = false,
            payer = null,
        } = req.body;

        let monto = Number(montoEspecificado || 0);
        let items: Array<{ id?: string; title: string; quantity: number; unit_price: number }> = [];
        let descripcionItem = titulo;

        // 1. Caso A: Reserva de Turno individual
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
        }
        // 2. Caso B: Orden de Compra registrada previamente
        else if (orden_id) {
            const oRes = await pool.query('SELECT total_orden FROM ordenes WHERE id = $1', [orden_id]);
            if (oRes.rows.length === 0) return res.status(404).json({ ok: false, error: 'Orden no encontrada' });
            monto = Number(oRes.rows[0].total_orden);

            const itemsRes = await pool.query(
                `SELECT oi.cantidad, oi.precio_unitario_aplicado, p.nombre
                 FROM orden_items oi
                 JOIN productos p ON p.id = oi.producto_id
                 WHERE oi.orden_id = $1`,
                [orden_id]
            );

            if (itemsRes.rows.length > 0) {
                items = itemsRes.rows.map((row) => ({
                    id: `orden-${orden_id}-item`,
                    title: row.nombre,
                    quantity: Number(row.cantidad),
                    unit_price: Number(row.precio_unitario_aplicado),
                }));
            } else {
                items = [
                    {
                        id: `orden-${orden_id}`,
                        title: `Productos Peluquería Yohana - Orden #${orden_id}`,
                        quantity: 1,
                        unit_price: monto,
                    },
                ];
            }
        }
        // 3. Caso C: Carrito de compras recibido directamente en `items`
        else if (Array.isArray(itemsBody) && itemsBody.length > 0) {
            items = itemsBody.map((it: any) => ({
                id: String(it.id || it.producto_id || 'item-py'),
                title: String(it.title || it.name || it.nombre || titulo),
                quantity: Number(it.quantity || it.qty || it.cantidad || 1),
                unit_price: Number(it.unit_price || it.price || it.precio || 0),
            }));
            monto = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
        }
        // 4. Caso D: Monto directo
        else if (monto > 0) {
            items = [
                {
                    id: 'servicio-py',
                    title: titulo,
                    quantity: 1,
                    unit_price: monto,
                },
            ];
        } else {
            return res.status(400).json({ ok: false, error: 'Debe especificar turno_id, orden_id, items o un monto válido' });
        }

        // Garantizar cumplimiento del check constraint chk_origen_pago (turno_id IS NOT NULL OR orden_id IS NOT NULL)
        let resolvedOrdenId = orden_id;
        if (!resolvedOrdenId && !turno_id) {
            const cliente_id = req.usuario?.cliente_id || (await pool.query('SELECT id FROM clientes LIMIT 1')).rows[0]?.id || 1;
            const ordRes = await pool.query(
                `INSERT INTO ordenes (cliente_id, metodo_entrega, total_orden, estado_orden)
                 VALUES ($1, 'RETIRO_LOCAL', $2, 'CREADA') RETURNING id`,
                [cliente_id, monto]
            );
            resolvedOrdenId = ordRes.rows[0].id;
        }

        const referencia_transaccion = `MP-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
        const accessToken = env.MERCADOPAGO_ACCESS_TOKEN;

        let ordenOPreferenciaId = `pref_${referencia_transaccion}`;
        let initPoint = `${frontendUrl}/pago-exitoso?ref=${referencia_transaccion}&pago=simulado`;
        let sandboxInitPoint = `${frontendUrl}/pago-exitoso?ref=${referencia_transaccion}&pago=simulado`;

        const isRealToken = accessToken && !accessToken.startsWith('TEST-000000') && accessToken.length > 20;

        // Inicializar SDK oficial de Mercado Pago y generar Preferencia
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
                                name: payer.name || payer.nombre,
                                email: payer.email || payer.correo,
                            }
                            : undefined,
                        back_urls: {
                            success: `${frontendUrl}/pago-exitoso?ref=${referencia_transaccion}`,
                            failure: `${frontendUrl}/pago-fallido?ref=${referencia_transaccion}`,
                            pending: `${frontendUrl}/pago-pendiente?ref=${referencia_transaccion}`,
                        },
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

        // Registrar transacción de pago en PostgreSQL
        const { rows: pagoRows } = await pool.query(
            `INSERT INTO pagos (
                turno_id, orden_id, pasarela_nombre, referencia_transaccion,
                monto_total, metodo_pago, estado_pago, preferencia_id, init_point
             )
             VALUES ($1, $2, 'MERCADOPAGO_SANDBOX', $3, $4, 'MERCADO_PAGO', 'PENDIENTE', $5, $6)
             RETURNING *`,
            [turno_id, resolvedOrdenId, referencia_transaccion, monto, ordenOPreferenciaId, sandboxInitPoint]
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

// 3.1 Procesar pago con tarjeta (Payment Brick / Token de tarjeta)
async function procesarPagoConTarjetaHandler(req: Request, res: Response) {
    const client = await pool.connect();
    try {
        const {
            token,
            orden_id = null,
            turno_id = null,
            monto: montoReq,
            referencia = null,
            payer = null,
            cuotas = 1,
            payment_method_id = 'credit_card',
        } = req.body;

        if (!token && !referencia) {
            return res.status(400).json({ ok: false, error: 'Se requiere token de tarjeta o referencia de transacción' });
        }

        await client.query('BEGIN');

        let monto = Number(montoReq || 0);
        let resolvedOrdenId = orden_id;
        let resolvedTurnoId = turno_id;

        if (resolvedTurnoId && (!monto || monto <= 0)) {
            const tRes = await client.query('SELECT precio_aplicado FROM turnos WHERE id = $1', [resolvedTurnoId]);
            if (tRes.rows.length > 0) monto = Number(tRes.rows[0].precio_aplicado);
        }

        if (resolvedOrdenId && (!monto || monto <= 0)) {
            const oRes = await client.query('SELECT total_orden FROM ordenes WHERE id = $1', [resolvedOrdenId]);
            if (oRes.rows.length > 0) monto = Number(oRes.rows[0].total_orden);
        }

        const referenciaTransaccion = referencia || `MP-CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let estadoFinal = 'APROBADO';
        let statusMp = 'approved';
        let statusDetailMp = 'accredited';

        // Evaluar si es tarjeta de rechazo simulada
        if (typeof token === 'string' && (token.includes('FUND') || token.includes('REJ') || token.includes('rechazo') || token.includes('insuficiente'))) {
            estadoFinal = 'RECHAZADO';
            statusMp = 'rejected';
            statusDetailMp = token.includes('FUND') ? 'cc_rejected_insufficient_amount' : 'cc_rejected_other_reason';
        }

        let pagoRow: any = null;
        if (referencia) {
            const checkP = await client.query('SELECT * FROM pagos WHERE referencia_transaccion = $1', [referencia]);
            if (checkP.rows.length > 0) {
                const upd = await client.query(
                    `UPDATE pagos
                     SET estado_pago = $1, fecha_pago = CURRENT_TIMESTAMP, respuesta_pasarela = $2
                     WHERE id = $3 RETURNING *`,
                    [estadoFinal, JSON.stringify({ token, cuotas, payer, status: statusMp }), checkP.rows[0].id]
                );
                pagoRow = upd.rows[0];
                if (!resolvedOrdenId) resolvedOrdenId = pagoRow.orden_id;
                if (!resolvedTurnoId) resolvedTurnoId = pagoRow.turno_id;
            }
        }

        if (!pagoRow) {
            if (!resolvedOrdenId && !resolvedTurnoId) {
                const cliente_id = req.usuario?.cliente_id || (await client.query('SELECT id FROM clientes LIMIT 1')).rows[0]?.id || 1;
                const ordRes = await client.query(
                    `INSERT INTO ordenes (cliente_id, metodo_entrega, total_orden, estado_orden)
                     VALUES ($1, 'RETIRO_LOCAL', $2, 'CREADA') RETURNING id`,
                    [cliente_id, monto || 1000]
                );
                resolvedOrdenId = ordRes.rows[0].id;
            }

            const insRes = await client.query(
                `INSERT INTO pagos (
                    turno_id, orden_id, pasarela_nombre, referencia_transaccion,
                    monto_total, metodo_pago, estado_pago, respuesta_pasarela
                 )
                 VALUES ($1, $2, 'MERCADOPAGO_SANDBOX', $3, $4, 'MERCADO_PAGO', $5, $6)
                 RETURNING *`,
                [
                    resolvedTurnoId,
                    resolvedOrdenId,
                    referenciaTransaccion,
                    monto,
                    estadoFinal,
                    JSON.stringify({ token, cuotas, payer, payment_method_id, status: statusMp }),
                ]
            );
            pagoRow = insRes.rows[0];
        }

        if (estadoFinal === 'APROBADO') {
            if (resolvedTurnoId) {
                await client.query(`UPDATE turnos SET estado = 'CONFIRMADO' WHERE id = $1`, [resolvedTurnoId]);
            }
            if (resolvedOrdenId) {
                await client.query(`UPDATE ordenes SET estado_orden = 'PAGADA' WHERE id = $1`, [resolvedOrdenId]);
            }
        }

        await client.query('COMMIT');

        return res.status(estadoFinal === 'APROBADO' ? 200 : 400).json({
            ok: estadoFinal === 'APROBADO',
            mensaje: estadoFinal === 'APROBADO' ? 'Pago procesado exitosamente' : 'Pago rechazado: tarjeta con fondos insuficientes o rechazo general',
            data: {
                id: `pay_${Date.now()}`,
                status: statusMp,
                status_detail: statusDetailMp,
                referencia: referenciaTransaccion,
                monto_total: monto,
                orden_id: resolvedOrdenId,
                turno_id: resolvedTurnoId,
                estado_pago: estadoFinal,
            },
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error al procesar pago con tarjeta:', err);
        return res.status(500).json({ ok: false, error: 'Error interno al procesar el pago con tarjeta' });
    } finally {
        client.release();
    }
}

router.post('/procesar-pago', autenticarOpcional, procesarPagoConTarjetaHandler);
router.post('/process', autenticarOpcional, procesarPagoConTarjetaHandler);

/**
 * 4. WEBHOOK OFICIAL DE MERCADO PAGO: POST /api/pagos/webhook
 * Recibe las notificaciones asíncronas de eventos (payment, merchant_order)
 */
router.post('/webhook', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
        const resourceId = req.query.id || req.query['data.id'] || req.body?.data?.id;

        console.log(`\n🔔 [WEBHOOK MERCADO PAGO] Notificación recibida:`, { topic, resourceId, query: req.query, body: req.body });

        const accessToken = env.MERCADOPAGO_ACCESS_TOKEN;
        const isRealToken = accessToken && !accessToken.startsWith('TEST-000000') && accessToken.length > 20;

        let estadoPago = 'PENDIENTE';
        let referencia = '';

        if (isRealToken && (topic === 'payment' || req.body?.action?.includes('payment')) && resourceId) {
            try {
                const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
                const paymentClient = new Payment(mpConfig);
                const paymentInfo = await paymentClient.get({ id: String(resourceId) });

                referencia = paymentInfo.external_reference || '';
                if (paymentInfo.status === 'approved') {
                    estadoPago = 'APROBADO';
                } else if (paymentInfo.status === 'rejected') {
                    estadoPago = 'RECHAZADO';
                }
                console.log(`ℹ️ [WEBHOOK] Consulta de pago ${resourceId} en MP:`, { status: paymentInfo.status, referencia });
            } catch (err: any) {
                console.warn('⚠️ No se pudo consultar pago en API Mercado Pago:', err.message);
            }
        }

        // Si se recibió referencia o resourceId, actualizar en PostgreSQL
        if (referencia) {
            await client.query('BEGIN');
            const upd = await client.query(
                `UPDATE pagos
                 SET estado_pago = $1, fecha_pago = CURRENT_TIMESTAMP
                 WHERE referencia_transaccion = $2 RETURNING *`,
                [estadoPago, referencia]
            );

            if (upd.rows.length > 0) {
                const pago = upd.rows[0];
                if (estadoPago === 'APROBADO') {
                    if (pago.turno_id) {
                        await client.query(`UPDATE turnos SET estado = 'CONFIRMADO' WHERE id = $1`, [pago.turno_id]);
                    }
                    if (pago.orden_id) {
                        await client.query(`UPDATE ordenes SET estado_orden = 'PAGADA' WHERE id = $1`, [pago.orden_id]);
                    }
                }
            }
            await client.query('COMMIT');
        }

        // Responder siempre 200 OK a Mercado Pago para evitar reintentos continuos
        res.status(200).json({ ok: true, status: 'received' });
    } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error en webhook de Mercado Pago:', err);
        res.status(200).json({ ok: true, error: err.message });
    } finally {
        client.release();
    }
});

// 5. Iniciar transacción tradicional (WOMPI/Efectivo)
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

// 6. Webhook interno con firma compartida
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

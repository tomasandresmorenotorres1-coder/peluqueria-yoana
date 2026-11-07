import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';
import adminRoutes from '../routes/admin.routes';
import catalogoRoutes from '../routes/catalogo.routes';
import pagosRoutes, { handleCardTokenization } from '../routes/pagos.routes';
import { pool } from '../config/db';

async function runTestSuite() {
    console.log('\n======================================================');
    console.log('🧪 SUITE DE PRUEBAS: TOKENIZACIÓN MP, STOCK Y DESACTIVADOS');
    console.log('======================================================\n');

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Rutas directas de tokenización de Bricks
    app.all('/checkout/v1/api/bricks/card-form/tokenization', handleCardTokenization);
    app.all('/api/checkout/v1/api/bricks/card-form/tokenization', handleCardTokenization);
    app.all('/v1/card_tokens', handleCardTokenization);

    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/catalogo', catalogoRoutes);
    app.use('/api/pagos', pagosRoutes);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const base = `http://localhost:${port}`;

    let adminToken = '';

    try {
        // 0. Autenticar como Admin
        console.log('0️⃣  AUTENTICACIÓN DE ADMINISTRADOR');
        const loginRes = await fetch(`${base}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@peluqueriayoana.com',
                password: 'Admin2026*!',
            }),
        });
        const loginData: any = await loginRes.json();
        if (!loginRes.ok || !loginData.token) {
            throw new Error(`Login de admin fallido: ${JSON.stringify(loginData)}`);
        }
        adminToken = loginData.token;
        console.log('   ✅ Token de Administrador obtenido.');

        // 1. Test Endpoint de Tokenización de Mercado Pago (/checkout/v1/api/bricks/card-form/tokenization)
        console.log('\n1️⃣  TEST ENDPOINT DE TOKENIZACIÓN DE TARJETAS MP (BRICK)');
        const tokenRes = await fetch(`${base}/checkout/v1/api/bricks/card-form/tokenization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_number: '5031 7500 0000 0001',
                cardholder: {
                    name: 'APRO PRUEBA',
                    identification: { type: 'CC', number: '12345678' },
                },
                security_code: '123',
                expiration_month: '11',
                expiration_year: '28',
            }),
        });

        console.log(`   - HTTP Status: ${tokenRes.status} (Esperado: 201 Created, NO 404)`);
        const tokenData: any = await tokenRes.json();
        if (tokenRes.status !== 201 || !tokenData.id || !tokenData.id.startsWith('tok_sbx_')) {
            throw new Error(`Error en tokenización: ${JSON.stringify(tokenData)}`);
        }
        console.log(`   ✅ Token de tarjeta Sandbox generado exitosamente: ${tokenData.id}`);
        console.log(`   - Franquicia identificada: primeros 6 dígitos ${tokenData.first_six_digits}, últimos 4 ${tokenData.last_four_digits}`);

        // Probar también las rutas alternas
        const alias1 = await fetch(`${base}/api/checkout/v1/api/bricks/card-form/tokenization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number: '4509 9500 0000 0001' }),
        });
        if (alias1.status !== 201) throw new Error('Falló alias /api/checkout/...');
        console.log('   ✅ Alias /api/checkout/v1/api/bricks/card-form/tokenization responde 201');

        const alias2 = await fetch(`${base}/v1/card_tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number: '4509 9500 0000 0001' }),
        });
        if (alias2.status !== 201) throw new Error('Falló alias /v1/card_tokens');
        console.log('   ✅ Alias /v1/card_tokens responde 201');

        // 2. Test Crear Orden de Carrito y Preferencia en Mercado Pago
        console.log('\n2️⃣  TEST DE PREFERENCIA DE PAGO Y CARRITO EN POSTGRESQL');
        const ordenRes = await fetch(`${base}/api/pagos/ordenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_completo: 'Cliente Prueba Sandbox',
                telefono_whatsapp: '+57 300 123 4567',
                email: 'cliente@prueba.com',
                metodo_entrega: 'RETIRO_LOCAL',
                items: [{ producto_id: 2, cantidad: 1 }],
            }),
        });
        const ordenData: any = await ordenRes.json();
        if (!ordenRes.ok || !ordenData.data?.id) {
            throw new Error(`Fallo creación de orden: ${JSON.stringify(ordenData)}`);
        }
        const ordenId = ordenData.data.id;
        console.log(`   ✅ Orden de compra #${ordenId} creada en PostgreSQL con total: $${ordenData.data.total_orden}`);

        const prefRes = await fetch(`${base}/api/pagos/crear-orden`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orden_id: ordenId,
                titulo: 'Carrito de Productos Yohana',
            }),
        });
        const prefData: any = await prefRes.json();
        if (!prefRes.ok || !prefData.data?.id) {
            throw new Error(`Fallo preferencia MP: ${JSON.stringify(prefData)}`);
        }
        console.log(`   ✅ Preferencia Mercado Pago generada: ${prefData.data.id}`);
        console.log(`   - Init Point: ${prefData.data.init_point}`);
        console.log(`   - Sandbox Init Point: ${prefData.data.sandbox_init_point}`);

        // 3. Test Procesar Pago con Tarjeta (Brick) usando el token
        console.log('\n3️⃣  TEST PROCESAR PAGO CON TOKEN DE TARJETA (POSTGRESQL)');
        const pagoRes = await fetch(`${base}/api/pagos/procesar-pago`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: tokenData.id,
                orden_id: ordenId,
                referencia: prefData.data.referencia,
                monto: ordenData.data.total_orden,
                cuotas: 1,
            }),
        });
        const pagoData: any = await pagoRes.json();
        if (!pagoRes.ok || pagoData.data?.status !== 'approved') {
            throw new Error(`Fallo procesar pago: ${JSON.stringify(pagoData)}`);
        }
        console.log(`   ✅ Pago aprobado y registrado en PostgreSQL: ID ${pagoData.data.id}`);

        // Verificar que la orden quedó como PAGADA en base de datos
        const ordCheck = await pool.query('SELECT estado_orden FROM ordenes WHERE id = $1', [ordenId]);
        console.log(`   - Estado de la orden en DB: ${ordCheck.rows[0].estado_orden} (Esperado: PAGADA)`);
        if (ordCheck.rows[0].estado_orden !== 'PAGADA') throw new Error('La orden no quedó en estado PAGADA');

        // 4. Test Gestión de Stock en Panel de Administrador (PATCH /api/admin/productos/:id/stock)
        console.log('\n4️⃣  TEST DE ACTUALIZACIÓN DE STOCK EN POSTGRESQL');
        const prodId = 2; // Aceite de Barba
        const targetStock = 42;

        const stockRes = await fetch(`${base}/api/admin/productos/${prodId}/stock`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ stock: targetStock }),
        });
        const stockData: any = await stockRes.json();
        if (!stockRes.ok || stockData.data?.stock !== targetStock) {
            throw new Error(`Fallo actualización de stock: ${JSON.stringify(stockData)}`);
        }
        console.log(`   ✅ Stock del producto ID ${prodId} actualizado a ${targetStock} unidades en PostgreSQL`);

        // Verificar directamente en PostgreSQL
        const dbStockCheck = await pool.query('SELECT stock FROM productos WHERE id = $1', [prodId]);
        console.log(`   - Stock verificado directamente en DB: ${dbStockCheck.rows[0].stock}`);
        if (dbStockCheck.rows[0].stock !== targetStock) throw new Error('Stock en DB no coincide');

        // 5. Test Gestión de Desactivados (Ver inactivos y reactivar con un solo clic)
        console.log('\n5️⃣  TEST DE SERVICIOS Y PRODUCTOS DESACTIVADOS Y REACTIVACIÓN');
        // Desactivar un producto para la prueba
        await fetch(`${base}/api/admin/productos/${prodId}/activo`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ activo: false }),
        });
        console.log(`   - Producto #${prodId} desactivado temporalmente para la prueba`);

        // Consultar productos desde admin (debe incluir activos e inactivos)
        const adminProdsRes = await fetch(`${base}/api/admin/productos`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminProdsData: any = await adminProdsRes.json();
        const prodInactivo = adminProdsData.data.find((p: any) => p.id === prodId);
        console.log(`   - Producto #${prodId} activo en listado de admin: ${prodInactivo?.activo} (Esperado: false)`);
        if (prodInactivo?.activo !== false) throw new Error('El producto debería estar inactivo en admin');

        // Reactivar el producto con 1 solo clic (PATCH activo: true)
        const reactivarRes = await fetch(`${base}/api/admin/productos/${prodId}/activo`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ activo: true }),
        });
        const reactivarData: any = await reactivarRes.json();
        if (!reactivarRes.ok || reactivarData.data?.activo !== true) {
            throw new Error(`Fallo reactivación de producto: ${JSON.stringify(reactivarData)}`);
        }
        console.log(`   ✅ Producto #${prodId} reactivado exitosamente con 1 clic (activo: true)`);

        // Verificar servicios en admin
        const adminServRes = await fetch(`${base}/api/admin/servicios`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminServData: any = await adminServRes.json();
        console.log(`   ✅ Catálogo de servicios listado en admin (${adminServData.data?.length} servicios con estado activo/inactivo)`);

        console.log('\n======================================================');
        console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS SATISFACTORIAMENTE (5/5)');
        console.log('======================================================\n');
    } finally {
        server.close();
        await pool.end();
    }
}

runTestSuite().catch((err) => {
    console.error('❌ Error en test suite:', err);
    process.exit(1);
});

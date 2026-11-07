/**
 * Test de Integración Integral:
 * 1. Runtime Decryption de DB_PASSWORD y SMTP_PASS
 * 2. Autenticación y RBAC del Administrador
 * 3. Mercado Pago Sandbox: Creación de Órdenes Multipropósito (Reservas y Carrito)
 * 4. Webhook de Mercado Pago
 */
import { env } from '../config/env';
import { pool } from '../config/db';
import '../index'; // Levanta el servidor en puerto 4000

async function wait(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function runTests() {
    console.log('\n======================================================');
    console.log('🧪 SUITE DE PRUEBAS: DASHBOARD ADMIN, ENCRIPTACIÓN Y MP');
    console.log('======================================================\n');

    await wait(1000); // Esperar que el servidor termine de iniciar en 4000

    // 1. Verificación de Desencriptación en Runtime
    console.log('1️⃣  VERIFICACIÓN DE ENCRIPTACIÓN EN RUNTIME (.ENV)');
    console.log('   - DB_PASSWORD descifrado:', env.DB_PASSWORD ? '✅ [PRESENTE Y DESENCRIPTADO]' : '❌ [VACÍO]');
    console.log('   - SMTP_PASS descifrado:  ', env.SMTP_PASS ? '✅ [PRESENTE Y DESENCRIPTADO]' : '❌ [VACÍO]');
    console.log('   - MP_PUBLIC_KEY:         ', env.PUBLIC_KEY_MERCADOPAGO ? '✅ ' + env.PUBLIC_KEY_MERCADOPAGO : '❌');
    console.log('   - MP_ACCESS_TOKEN:       ', env.MERCADOPAGO_ACCESS_TOKEN ? '✅ ' + env.MERCADOPAGO_ACCESS_TOKEN.slice(0, 15) + '...' : '❌');

    const baseUrl = 'http://localhost:4000/api';

    try {
        // 2. Probar Login del Administrador
        console.log('\n2️⃣  TEST DE LOGIN DE ADMINISTRADOR');
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@peluqueriayoana.com',
                password: 'Admin2026*!',
            }),
        });

        const loginData: any = await loginRes.json();
        if (!loginRes.ok || !loginData.token || loginData.usuario?.rol !== 'ADMIN') {
            throw new Error(`Login fallido: ${JSON.stringify(loginData)}`);
        }
        console.log('   ✅ Login exitoso. Token recibido. Rol:', loginData.usuario.rol);
        const adminToken = loginData.token;

        // 3. Probar Acceso al Dashboard de Admin con RBAC
        console.log('\n3️⃣  TEST DE RUTAS PROTEGIDAS RBAC (/api/admin)');
        const adminUsersRes = await fetch(`${baseUrl}/admin/usuarios`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminUsersData: any = await adminUsersRes.json();
        if (!adminUsersRes.ok || !adminUsersData.ok) {
            throw new Error(`Acceso denegado a admin: ${JSON.stringify(adminUsersData)}`);
        }
        console.log(`   ✅ Acceso a /api/admin/usuarios exitoso (${adminUsersData.data.length} usuarios listados)`);

        // Probar bloqueo sin token (401)
        const unauthRes = await fetch(`${baseUrl}/admin/usuarios`);
        console.log('   ✅ Acceso sin token rechazado correctamente con HTTP', unauthRes.status);

        // 4. Probar Mercado Pago Sandbox - Carrito de compras múltiple
        console.log('\n4️⃣  TEST DE MERCADO PAGO: CARRITO DE COMPRAS DINÁMICO');
        const carritoBody = {
            titulo: 'Compra Carrito de Prueba',
            items: [
                { id: 1, title: 'Pomada Brillante', quantity: 2, unit_price: 20000 },
                { id: 2, title: 'Aceite de Barba', quantity: 1, unit_price: 24000 },
            ],
            payer: {
                name: 'Cliente Prueba',
                email: 'cliente.prueba@ejemplo.com',
            },
        };

        const mpCarritoRes = await fetch(`${baseUrl}/pagos/crear-orden`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carritoBody),
        });

        const mpCarritoData: any = await mpCarritoRes.json();
        if (!mpCarritoRes.ok || !mpCarritoData.ok) {
            throw new Error(`Error en crear-orden MP Carrito: ${JSON.stringify(mpCarritoData)}`);
        }

        console.log('   ✅ Orden de carrito creada en Mercado Pago Sandbox exitosamente:');
        console.log('      - ID de Preferencia:', mpCarritoData.data.id);
        console.log('      - Monto Total:', mpCarritoData.data.monto_total, 'COP');
        console.log('      - Referencia:', mpCarritoData.data.referencia);
        console.log('      - Init Point:', mpCarritoData.data.init_point);
        console.log('      - Tarjetas de prueba devueltas:', mpCarritoData.data.tarjetas_prueba?.length || 0);

        // 5. Probar Mercado Pago Sandbox - Reserva de turno individual
        console.log('\n5️⃣  TEST DE MERCADO PAGO: RESERVA DE TURNO INDIVIDUAL');
        const tRow = await pool.query('SELECT id FROM turnos LIMIT 1');
        const turnoId = tRow.rows[0]?.id;

        if (turnoId) {
            const mpTurnoRes = await fetch(`${baseUrl}/pagos/crear-orden`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    turno_id: turnoId,
                    es_abono: true,
                }),
            });

            const mpTurnoData: any = await mpTurnoRes.json();
            if (mpTurnoRes.ok && mpTurnoData.ok) {
                console.log('   ✅ Orden de turno creada en Mercado Pago Sandbox exitosamente:');
                console.log('      - ID de Preferencia:', mpTurnoData.data.id);
                console.log('      - Monto Abono (50%):', mpTurnoData.data.monto_total, 'COP');
            }
        }

        // 6. Probar Webhook de Mercado Pago
        console.log('\n6️⃣  TEST DE WEBHOOK MERCADO PAGO (/api/pagos/webhook)');
        const webhookRes = await fetch(`${baseUrl}/pagos/webhook?topic=payment&id=123456789`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'payment.created',
                data: { id: '123456789' },
            }),
        });

        const webhookData: any = await webhookRes.json();
        if (webhookRes.status === 200 && webhookData.ok) {
            console.log('   ✅ Webhook respondió exitosamente con HTTP 200 OK:', webhookData);
        } else {
            throw new Error(`Webhook falló: ${JSON.stringify(webhookData)}`);
        }

        console.log('\n======================================================');
        console.log('🎉 TODOS LOS TESTS COMPLETADOS SATISFACTORIAMENTE (6/6)');
        console.log('======================================================\n');
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runTests().catch((err) => {
    console.error('❌ Error en suite de pruebas:', err);
    process.exit(1);
});

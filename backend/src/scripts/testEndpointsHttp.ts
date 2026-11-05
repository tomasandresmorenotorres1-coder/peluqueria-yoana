import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';
import turnosRoutes from '../routes/turnos.routes';
import pagosRoutes from '../routes/pagos.routes';
import catalogoRoutes from '../routes/catalogo.routes';
import { pool } from '../config/db';

async function testHttp() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/turnos', turnosRoutes);
    app.use('/api/pagos', pagosRoutes);
    app.use('/api/catalogo', catalogoRoutes);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const base = `http://localhost:${port}/api`;
    console.log(`Servidor de pruebas HTTP iniciado en ${base}\n`);

    try {
        // 1. Test Solicitar PIN de Registro
        console.log('1. Probando POST /api/auth/solicitar-pin-registro...');
        const uniqueEmail = `test.http.${Date.now()}@peluqueria.test`;
        const resPin = await fetch(`${base}/auth/solicitar-pin-registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_completo: 'Usuario Test HTTP',
                email: uniqueEmail,
                telefono_whatsapp: '+57 300 777 6655',
                password: 'PasswordSegura2026*',
            }),
        });
        const dataPin = await resPin.json();
        console.log('Respuesta Solicitar PIN:', resPin.status, dataPin.mensaje || dataPin.error);
        if (resPin.status !== 200) throw new Error('Fallo solicitar PIN');

        // Leer el PIN generado desde PostgreSQL
        const { rows: pinDb } = await pool.query(
            'SELECT pin FROM registro_pines WHERE LOWER(email) = $1 AND usado = FALSE',
            [uniqueEmail]
        );
        const pinGenerado = pinDb[0].pin;
        console.log(`PIN recuperado de PostgreSQL para la prueba: ${pinGenerado}`);

        // 2. Test Verificar PIN
        console.log('\n2. Probando POST /api/auth/verificar-pin...');
        const resVerif = await fetch(`${base}/auth/verificar-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: uniqueEmail,
                pin: pinGenerado,
            }),
        });
        const dataVerif = await resVerif.json();
        console.log('Respuesta Verificar PIN:', resVerif.status, dataVerif.usuario ? `Token generado para ${dataVerif.usuario.nombre_completo}` : dataVerif.error);
        if (resVerif.status !== 201) throw new Error('Fallo verificar PIN');
        const tokenCliente = dataVerif.token;

        // 3. Test Intentar reservar servicio no autorizado (Marco Ríos no hace Coloración) -> Espera 400
        console.log('\n3. Probando validación de servicio no autorizado...');
        const resNoAutorizado = await fetch(`${base}/turnos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenCliente}`,
            },
            body: JSON.stringify({
                servicio_id: 4, // Coloración
                equipo_id: 1,   // Marco Ríos (Solo hace cortes y barba)
                fecha: '2026-12-01',
                hora_inicio: '11:00',
            }),
        });
        const dataNoAut = await resNoAutorizado.json();
        console.log('Respuesta servicio no autorizado (esperado 400):', resNoAutorizado.status, dataNoAut.error);
        if (resNoAutorizado.status !== 400) throw new Error('Debió rechazar con 400');

        // 4. Test Crear Turno autorizado (Marco Ríos hace Corte Clásico 1)
        console.log('\n4. Probando crear turno con especialista autorizado (Marco Ríos - Corte Clásico)...');
        const resTurnoOk = await fetch(`${base}/turnos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenCliente}`,
            },
            body: JSON.stringify({
                servicio_id: 1, // Corte Clásico
                equipo_id: 1,   // Marco Ríos
                fecha: '2026-12-01',
                hora_inicio: '11:00',
            }),
        });
        const dataTurnoOk = await resTurnoOk.json();
        console.log('Respuesta turno autorizado (esperado 201):', resTurnoOk.status, dataTurnoOk.mensaje);
        if (resTurnoOk.status !== 201) throw new Error('Fallo crear turno autorizado');
        const turnoCreadoId = dataTurnoOk.data.id;

        // 5. Test Traslape / Conflicto -> Debe responder HTTP 409
        console.log('\n5. Probando traslape de horario en la misma fecha y hora (esperado 409 Conflict)...');
        const resSolape = await fetch(`${base}/turnos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenCliente}`,
            },
            body: JSON.stringify({
                servicio_id: 1,
                equipo_id: 1,
                fecha: '2026-12-01',
                hora_inicio: '11:00', // Misma hora!
            }),
        });
        const dataSolape = await resSolape.json();
        console.log('Respuesta traslape (esperado 409):', resSolape.status, dataSolape.error);
        if (resSolape.status !== 409) throw new Error('Debió responder con 409 Conflict');

        // 6. Test Crear Preferencia de Mercado Pago
        console.log('\n6. Probando POST /api/pagos/crear-preferencia...');
        const resMP = await fetch(`${base}/pagos/crear-preferencia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenCliente}`,
            },
            body: JSON.stringify({
                turno_id: turnoCreadoId,
                es_abono: true,
            }),
        });
        const dataMP = await resMP.json();
        console.log('Respuesta Mercado Pago:', resMP.status, 'Preferencia ID:', dataMP.data?.id, 'Monto Abono:', dataMP.data?.monto_total);
        if (resMP.status !== 201) throw new Error('Fallo crear preferencia Mercado Pago');

        // Limpieza de datos de prueba
        await pool.query('DELETE FROM pagos WHERE turno_id = $1', [turnoCreadoId]);
        await pool.query('DELETE FROM turnos WHERE id = $1', [turnoCreadoId]);
        await pool.query('DELETE FROM usuarios WHERE email = $1', [uniqueEmail]);
        await pool.query('DELETE FROM clientes WHERE email = $1', [uniqueEmail]);
        await pool.query('DELETE FROM registro_pines WHERE email = $1', [uniqueEmail]);

        console.log('\n✅ TODAS LAS PRUEBAS HTTP DE ENDPOINTS PASARON CON ÉXITO.');
    } finally {
        server.close();
        await pool.end();
    }
}

testHttp().catch((e) => {
    console.error('❌ Error en test HTTP:', e);
    process.exit(1);
});

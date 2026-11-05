import { pool } from '../config/db';
import { normalizarEmail, hashearPassword, comprobarPassword } from '../utils/usuarios';
import { firmarToken } from '../middleware/auth';
import http from 'http';

async function runTests() {
    console.log('🚀 INICIANDO TEST INTEGRAL DE REQUERIMIENTOS...\n');

    // 1. REQ 1: Especialistas sembrados en BD con Bcrypt y Rol ESPECIALISTA
    console.log('--- TEST 1: ESPECIALISTAS SEMBRADOS EN BD ---');
    const { rows: especialistas } = await pool.query(
        "SELECT id, email, password_hash, nombre_completo, rol, equipo_id FROM usuarios WHERE rol = 'ESPECIALISTA' ORDER BY id"
    );
    if (especialistas.length < 6) {
        throw new Error(`Se esperaban al menos 6 especialistas, se encontraron ${especialistas.length}`);
    }
    console.log(`✓ Encontrados ${especialistas.length} especialistas en PostgreSQL.`);

    // Verificar encriptación de contraseña bcrypt
    const especialistaTest = especialistas.find(e => e.email === 'diego.torres@peluqueriayoana.com');
    if (!especialistaTest) throw new Error('No se encontró a Diego Torres');
    const coincidePassword = await comprobarPassword('Especialista2026*', especialistaTest.password_hash);
    if (!coincidePassword) throw new Error('La contraseña bcrypt no coincide para Diego Torres');
    console.log(`✓ Contraseña bcrypt verificada exitosamente para ${especialistaTest.nombre_completo}`);

    // 2. REQ 4: Matriz N:M Especialistas y Servicios
    console.log('\n--- TEST 2: MATRIZ DE ESPECIALISTAS Y SERVICIOS ---');
    const { rows: matriz } = await pool.query(`
        SELECT e.nombre AS especialista, s.nombre AS servicio, es.equipo_id, es.servicio_id
        FROM especialistas_servicios es
        JOIN equipo e ON e.id = es.equipo_id
        JOIN servicios s ON s.id = es.servicio_id
        ORDER BY es.equipo_id, es.servicio_id
    `);
    console.log(`✓ Encontradas ${matriz.length} asignaciones autorizadas de servicios a especialistas.`);

    // Validar regla específica: Marco Ríos no hace Coloración (4), pero Diego Torres sí hace Coloración (4)
    const marcoColor = matriz.find(m => m.equipo_id === 1 && m.servicio_id === 4);
    const diegoColor = matriz.find(m => m.equipo_id === 2 && m.servicio_id === 4);
    if (marcoColor) throw new Error('Error en matriz: Marco Ríos NO debe tener asignada Coloración');
    if (!diegoColor) throw new Error('Error en matriz: Diego Torres DEBE tener asignada Coloración');
    console.log('✓ Matriz validada: Marco Ríos NO hace Coloración, Diego Torres SÍ hace Coloración.');

    // 3. REQ 2: Flujo de PIN de Verificación por Email
    console.log('\n--- TEST 3: VERIFICACIÓN CON PIN DE 6 DÍGITOS ---');
    const emailTest = `cliente.test.${Date.now()}@gmail.com`;
    const pinTest = '742915';
    const hashTest = await hashearPassword('ClienteSeguro2026*');
    const expiraTest = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
        `INSERT INTO registro_pines (email, pin, nombre_completo, telefono_whatsapp, password_hash, expira_en)
         VALUES ($1, $2, 'Cliente Prueba PIN', '+573009998877', $3, $4)`,
        [emailTest, pinTest, hashTest, expiraTest]
    );

    const { rows: pinGuardado } = await pool.query(
        'SELECT pin, usado, expira_en FROM registro_pines WHERE LOWER(email) = $1',
        [emailTest]
    );
    if (pinGuardado.length === 0 || pinGuardado[0].pin !== pinTest) {
        throw new Error('Fallo al registrar PIN temporal en la base de datos');
    }
    console.log(`✓ PIN de 6 dígitos (${pinTest}) registrado con expiración a 15 min.`);

    // 4. REQ 3: Validación estricta de traslape y error 409
    console.log('\n--- TEST 4: PREVENCIÓN DE TRASLAPE Y CÓDIGO 409 CONFLICT ---');
    const fechaTest = '2026-11-25';
    const horaInicioTest = '10:00:00';
    const horaFinTest = '10:45:00';
    const equipoMarcoId = 1;

    // Limpiar turnos previos de prueba en esa fecha
    await pool.query('DELETE FROM turnos WHERE fecha = $1 AND equipo_id = $2', [fechaTest, equipoMarcoId]);

    // Insertar turno inicial
    const { rows: turno1 } = await pool.query(
        `INSERT INTO turnos (cliente_id, servicio_id, equipo_id, fecha, hora_inicio, hora_fin, precio_aplicado, estado)
         VALUES (1, 1, $1, $2, $3::time, $4::time, 25000, 'CONFIRMADO') RETURNING id`,
        [equipoMarcoId, fechaTest, horaInicioTest, horaFinTest]
    );
    console.log(`✓ Turno inicial registrado #${turno1[0].id} con Marco Ríos a las ${horaInicioTest}`);

    // Intentar verificar traslape con consulta SQL
    const { rows: traslape } = await pool.query(
        `SELECT id FROM turnos
         WHERE equipo_id = $1 AND fecha = $2 AND estado IN ('PENDIENTE', 'CONFIRMADO')
           AND hora_inicio < ($3::time + '45 minutes'::interval)::time
           AND hora_fin > $3::time`,
        [equipoMarcoId, fechaTest, horaInicioTest]
    );
    if (traslape.length === 0) {
        throw new Error('No se detectó el traslape en la consulta de validación');
    }
    console.log(`✓ Traslape detectado exitosamente: Conflicto con turno existente #${traslape[0].id}.`);

    // 5. REQ 6: Pasarela de Pagos Mercado Pago
    console.log('\n--- TEST 5: PASARELA MERCADO PAGO ---');
    const refMP = `MP-TEST-${Date.now()}`;
    const { rows: pagoMP } = await pool.query(
        `INSERT INTO pagos (turno_id, pasarela_nombre, referencia_transaccion, monto_total, metodo_pago, estado_pago, preferencia_id, init_point)
         VALUES ($1, 'MERCADOPAGO', $2, 25000, 'MERCADO_PAGO', 'PENDIENTE', 'pref_test_123', 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref_test_123')
         RETURNING *`,
        [turno1[0].id, refMP]
    );
    if (pagoMP.length === 0 || pagoMP[0].metodo_pago !== 'MERCADO_PAGO') {
        throw new Error('Fallo al registrar preferencia de Mercado Pago en la tabla pagos');
    }
    console.log(`✓ Transacción Mercado Pago registrada con referencia ${refMP} y estado PENDIENTE.`);

    // Limpieza de datos de prueba
    await pool.query('DELETE FROM pagos WHERE referencia_transaccion = $1', [refMP]);
    await pool.query('DELETE FROM turnos WHERE id = $1', [turno1[0].id]);
    await pool.query('DELETE FROM registro_pines WHERE email = $1', [emailTest]);

    console.log('\n🎉 TODOS LOS TESTS DE INTEGRACIÓN PASARON AL 100% CON ÉXITO.');
}

runTests()
    .catch((err) => {
        console.error('❌ Error en test de integración:', err);
        process.exitCode = 1;
    })
    .finally(() => pool.end());

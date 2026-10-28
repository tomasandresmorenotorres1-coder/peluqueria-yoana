-- ============================================================================
-- ESQUEMA DE BASE DE DATOS: PELUQUERÍA YOHANA (PostgreSQL)
-- ============================================================================
-- Limpieza previa en caso de reinicio en entorno de desarrollo
DROP TABLE IF EXISTS config_accesibilidad_ui CASCADE;
DROP TABLE IF EXISTS resenas CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS orden_items CASCADE;
DROP TABLE IF EXISTS ordenes CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS galeria CASCADE;
DROP TABLE IF EXISTS equipo CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
-- 1. TABLA DE CATEGORÍAS (Para Servicios y Productos)
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('SERVICIO', 'PRODUCTO')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. TABLA DE SERVICIOS (Con precios actuales editables y accesibilidad web)
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    precio_actual NUMERIC(12, 2) NOT NULL CHECK (precio_actual >= 0),
    duracion_minutos INT NOT NULL CHECK (duracion_minutos > 0),
    icono VARCHAR(50),
    texto_alternativo VARCHAR(255) NOT NULL,
    -- Lectores de pantalla (WCAG)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 3. TABLA DE PRODUCTOS (Tienda con stock, precio ajustable y accesibilidad web)
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio_actual NUMERIC(12, 2) NOT NULL CHECK (precio_actual >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url TEXT,
    texto_alternativo VARCHAR(255) NOT NULL,
    -- Lectores de pantalla (WCAG)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 4. TABLA DE EQUIPO (Estilistas y Barberos)
CREATE TABLE equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    especialidad VARCHAR(120) NOT NULL,
    biografia TEXT,
    foto_url TEXT,
    texto_alternativo VARCHAR(255) NOT NULL,
    capacitado_accesibilidad BOOLEAN NOT NULL DEFAULT FALSE,
    -- Atención inclusiva
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 5. TABLA DE GALERÍA (Trabajos realizados con texto alternativo obligatorio)
CREATE TABLE galeria (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(120) NOT NULL,
    servicio_id INT REFERENCES servicios(id) ON DELETE
    SET NULL,
        imagen_url TEXT NOT NULL,
        texto_alternativo VARCHAR(255) NOT NULL,
        -- Descripción del corte para personas con discapacidad visual
        destacado BOOLEAN NOT NULL DEFAULT FALSE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 6. TABLA DE CLIENTES (Contacto WhatsApp y perfil de accesibilidad)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono_whatsapp VARCHAR(25) NOT NULL,
    email VARCHAR(150),
    preferencias_accesibilidad JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 7. TABLA DE TURNOS / RESERVAS (Congela precio y registra requerimientos de accesibilidad en el local)
CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    equipo_id INT NOT NULL REFERENCES equipo(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    precio_aplicado NUMERIC(12, 2) NOT NULL CHECK (precio_aplicado >= 0),
    requiere_apoyo_accesibilidad BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_apoyo VARCHAR(40) CHECK (
        tipo_apoyo IN (
            'NINGUNO',
            'MOVILIDAD_REDUCIDA',
            'DISCAPACIDAD_VISUAL',
            'DISCAPACIDAD_AUDITIVA',
            'NEURODIVERGENTE',
            'OTRO'
        )
    ) DEFAULT 'NINGUNO',
    notas_accesibilidad TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (
        estado IN (
            'PENDIENTE',
            'CONFIRMADO',
            'COMPLETADO',
            'CANCELADO'
        )
    ),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horario_valido CHECK (hora_fin > hora_inicio)
);
-- 8. TABLA DE ÓRDENES DE PRODUCTOS (Cabecera de compra)
CREATE TABLE ordenes (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    total_orden NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_orden >= 0),
    metodo_entrega VARCHAR(30) NOT NULL DEFAULT 'RETIRO_LOCAL' CHECK (
        metodo_entrega IN ('RETIRO_LOCAL', 'DOMICILIO')
    ),
    direccion_entrega TEXT,
    estado_orden VARCHAR(20) NOT NULL DEFAULT 'CREADA' CHECK (
        estado_orden IN (
            'CREADA',
            'PAGADA',
            'PREPARANDO',
            'ENTREGADA',
            'CANCELADA'
        )
    ),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 9. TABLA DE DETALLE DE ÓRDENES (Congela el precio unitario de cada producto vendido)
CREATE TABLE orden_items (
    id SERIAL PRIMARY KEY,
    orden_id INT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario_aplicado NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_aplicado >= 0),
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (cantidad * precio_unitario_aplicado) STORED
);
-- 10. TABLA DE PASARELA DE PAGOS (Soporta pagos de Turnos y de Órdenes de productos)
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    turno_id INT REFERENCES turnos(id) ON DELETE
    SET NULL,
        orden_id INT REFERENCES ordenes(id) ON DELETE
    SET NULL,
        pasarela_nombre VARCHAR(50) NOT NULL DEFAULT 'WOMPI',
        -- Ej: WOMPI, MERCADOPAGO, EPAYCO
        referencia_transaccion VARCHAR(120) UNIQUE NOT NULL,
        monto_total NUMERIC(12, 2) NOT NULL CHECK (monto_total > 0),
        moneda VARCHAR(10) NOT NULL DEFAULT 'COP',
        metodo_pago VARCHAR(40) NOT NULL CHECK (
            metodo_pago IN (
                'TARJETA',
                'PSE',
                'NEQUI',
                'DAVIPLATA',
                'EFECTIVO_LOCAL'
            )
        ),
        estado_pago VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (
            estado_pago IN (
                'PENDIENTE',
                'APROBADO',
                'RECHAZADO',
                'ANULADO',
                'ERROR'
            )
        ),
        respuesta_pasarela JSONB DEFAULT '{}'::jsonb,
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Garantiza que el pago esté asociado al menos a un turno o a una orden
        CONSTRAINT chk_origen_pago CHECK (
            turno_id IS NOT NULL
            OR orden_id IS NOT NULL
        )
);
-- 11. TABLA DE RESEÑAS (Opiniones de clientes)
CREATE TABLE resenas (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(120) NOT NULL,
    servicio_id INT REFERENCES servicios(id) ON DELETE
    SET NULL,
        calificacion INT NOT NULL CHECK (
            calificacion BETWEEN 1 AND 5
        ),
        comentario TEXT NOT NULL,
        aprobada BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 12. TABLA DE CONFIGURACIÓN DE ACCESIBILIDAD DE LA INTERFAZ (Persistencia para usuarios con discapacidad)
CREATE TABLE config_accesibilidad_ui (
    id SERIAL PRIMARY KEY,
    token_dispositivo VARCHAR(150) UNIQUE NOT NULL,
    cliente_id INT REFERENCES clientes(id) ON DELETE
    SET NULL,
        alto_contraste BOOLEAN NOT NULL DEFAULT FALSE,
        tamano_fuente VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (
            tamano_fuente IN ('NORMAL', 'GRANDE', 'EXTRA_GRANDE')
        ),
        lector_pantalla_activo BOOLEAN NOT NULL DEFAULT FALSE,
        reducir_animaciones BOOLEAN NOT NULL DEFAULT FALSE,
        navegacion_teclado BOOLEAN NOT NULL DEFAULT FALSE,
        espaciado_texto_aumentado BOOLEAN NOT NULL DEFAULT FALSE,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================================
CREATE INDEX idx_servicios_categoria ON servicios(categoria_id)
WHERE activo = TRUE;
CREATE INDEX idx_productos_categoria ON productos(categoria_id)
WHERE activo = TRUE;
CREATE INDEX idx_turnos_agenda ON turnos(fecha, equipo_id, estado);
CREATE INDEX idx_pagos_referencia ON pagos(referencia_transaccion);
CREATE INDEX idx_resenas_calificacion ON resenas(calificacion)
WHERE aprobada = TRUE;
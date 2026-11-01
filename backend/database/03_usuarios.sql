-- =====================================================================
-- 03_usuarios.sql: usuarios con roles + horarios de los estilistas
-- Se puede ejecutar varias veces sin borrar datos (IF NOT EXISTS).
-- =====================================================================

-- 1. Usuarios: ADMIN (todo), ESTILISTA (sus citas y horarios), CLIENTE (sus reservas)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,              -- NUNCA la contraseña real: solo el hash de bcrypt
    nombre_completo VARCHAR(150) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'ESTILISTA', 'CLIENTE')),
    equipo_id INT REFERENCES equipo(id) ON DELETE RESTRICT,     -- solo para ESTILISTA
    cliente_id INT REFERENCES clientes(id) ON DELETE RESTRICT,  -- solo para CLIENTE
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usuario_estilista CHECK (
        (rol = 'ESTILISTA' AND equipo_id IS NOT NULL) OR (rol <> 'ESTILISTA' AND equipo_id IS NULL)
    ),
    CONSTRAINT chk_usuario_cliente CHECK (
        (rol = 'CLIENTE' AND cliente_id IS NOT NULL) OR (rol <> 'CLIENTE' AND cliente_id IS NULL)
    )
);

-- El correo no se repite (sin importar mayúsculas), y cada estilista/cliente tiene una sola cuenta
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email ON usuarios (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_equipo ON usuarios (equipo_id) WHERE equipo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_cliente ON usuarios (cliente_id) WHERE cliente_id IS NOT NULL;

-- 2. Horario semanal de cada estilista (dia_semana: 0 = domingo ... 6 = sábado)
-- Si un estilista no tiene filas aquí, se usa el horario por defecto del negocio.
CREATE TABLE IF NOT EXISTS horarios_estilista (
    id SERIAL PRIMARY KEY,
    equipo_id INT NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    CONSTRAINT chk_jornada_valida CHECK (hora_fin > hora_inicio),
    CONSTRAINT ux_horario_dia UNIQUE (equipo_id, dia_semana)
);

-- 3. Bloqueos puntuales (vacaciones, citas médicas...). Sin horas = todo el día.
CREATE TABLE IF NOT EXISTS bloqueos_estilista (
    id SERIAL PRIMARY KEY,
    equipo_id INT NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    motivo VARCHAR(200),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bloqueo_rango CHECK (
        (hora_inicio IS NULL AND hora_fin IS NULL)
        OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
    )
);
CREATE INDEX IF NOT EXISTS ix_bloqueos_equipo_fecha ON bloqueos_estilista (equipo_id, fecha);

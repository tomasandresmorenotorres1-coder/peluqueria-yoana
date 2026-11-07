-- ============================================================================
-- 04_actualizaciones_especialistas_pines_mp.sql
-- Migración para:
-- 1. Rol ESPECIALISTA y cuentas de los 6 especialistas
-- 2. Matriz N:M especialistas_servicios
-- 3. Horarios con descansos
-- 4. Tabla de PINs de registro vía email
-- 5. Pagos con Mercado Pago e índices contra traslape de citas
-- ============================================================================

-- 1. Ajustes en tabla usuarios y roles
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuario_estilista;

ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
    CHECK (rol IN ('ADMIN', 'ESPECIALISTA', 'ESTILISTA', 'CLIENTE'));

ALTER TABLE usuarios ADD CONSTRAINT chk_usuario_estilista 
    CHECK (
        (rol IN ('ESPECIALISTA', 'ESTILISTA') AND equipo_id IS NOT NULL) OR 
        (rol NOT IN ('ESPECIALISTA', 'ESTILISTA') AND equipo_id IS NULL)
    );

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(25);
ALTER TABLE equipo ADD COLUMN IF NOT EXISTS telefono VARCHAR(25);

-- 2. Horarios con descansos para especialistas
ALTER TABLE horarios_estilista ADD COLUMN IF NOT EXISTS descanso_inicio TIME;
ALTER TABLE horarios_estilista ADD COLUMN IF NOT EXISTS descanso_fin TIME;

-- 3. Matriz N:M Especialistas y Servicios
CREATE TABLE IF NOT EXISTS especialistas_servicios (
    equipo_id INT NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
    servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    PRIMARY KEY (equipo_id, servicio_id)
);

CREATE INDEX IF NOT EXISTS idx_esp_serv_servicio ON especialistas_servicios(servicio_id);
CREATE INDEX IF NOT EXISTS idx_esp_serv_equipo ON especialistas_servicios(equipo_id);

-- Poblar matriz N:M según requerimiento:
-- 1. Marco Ríos – Maestro Barbero: Corte Clásico (1), Arreglo de Barba (2), Corte + Barba (3), Afeitado con Navaja (6)
-- 2. Diego Torres – Especialista en Color: Coloración (4), Tinte & Mechas (12)
-- 3. Sebastián Cruz – Estilista Senior: Corte Clásico (1), Corte Femenino (7), Arreglo de Barba (2), Corte + Barba (3), Afeitado con Navaja (6)
-- 4. Yohana Pérez – Maestra Peluquera & Keratinas: Tratamiento Capilar (5), Keratina Brasileña (8), Corte Femenino (7), Corte Clásico (1)
-- 5. Valentina López – Manicurista & Nail Art: Manicure Completo (9), Pedicure Spa (10), Manicure + Pedicure (11)
-- 6. Camila Romero – Colorista & Estilista: Coloración (4), Tratamiento Capilar (5), Corte Femenino (7), Tinte & Mechas (12)

INSERT INTO especialistas_servicios (equipo_id, servicio_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 6),
  (2, 4), (2, 12),
  (3, 1), (3, 7), (3, 2), (3, 3), (3, 6),
  (4, 5), (4, 8), (4, 7), (4, 1),
  (5, 9), (5, 10), (5, 11),
  (6, 4), (6, 5), (6, 7), (6, 12)
ON CONFLICT (equipo_id, servicio_id) DO NOTHING;

-- 4. Inserción de los 6 Especialistas y el Administrador General
INSERT INTO usuarios (email, password_hash, nombre_completo, rol, equipo_id, telefono, activo) VALUES
  ('admin@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Administrador General', 'ADMIN', NULL, '+57 300 000 0000', TRUE),
  ('marco.rios@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Marco Ríos', 'ESPECIALISTA', 1, '+57 310 111 2233', TRUE),
  ('diego.torres@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Diego Torres', 'ESPECIALISTA', 2, '+57 311 222 3344', TRUE),
  ('sebastian.cruz@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Sebastián Cruz', 'ESPECIALISTA', 3, '+57 312 333 4455', TRUE),
  ('yohana.perez@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Yohana Pérez', 'ESPECIALISTA', 4, '+57 313 444 5566', TRUE),
  ('valentina.lopez@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Valentina López', 'ESPECIALISTA', 5, '+57 314 555 6677', TRUE),
  ('camila.romero@peluqueriayoana.com', '$2b$12$nZo.n4D0e3eVl7pOPXT0ROfZzCi/uQGLaXpwmGip/djbVBZBnh/I2', 'Camila Romero', 'ESPECIALISTA', 6, '+57 315 666 7788', TRUE)
ON CONFLICT (LOWER(email)) DO UPDATE SET
  rol = EXCLUDED.rol,
  equipo_id = EXCLUDED.equipo_id,
  password_hash = EXCLUDED.password_hash,
  telefono = EXCLUDED.telefono,
  activo = TRUE;

-- Horarios iniciales para los especialistas (Lunes a Sábado de 09:00 a 19:00, descanso de 13:00 a 14:00)
INSERT INTO horarios_estilista (equipo_id, dia_semana, hora_inicio, hora_fin, descanso_inicio, descanso_fin)
SELECT e.id, d.dia, '09:00'::time, '19:00'::time, '13:00'::time, '14:00'::time
FROM equipo e
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS d(dia)
ON CONFLICT (equipo_id, dia_semana) DO UPDATE SET
  hora_inicio = EXCLUDED.hora_inicio,
  hora_fin = EXCLUDED.hora_fin,
  descanso_inicio = EXCLUDED.descanso_inicio,
  descanso_fin = EXCLUDED.descanso_fin;

-- 5. Tabla de PINs temporales de verificación vía email
CREATE TABLE IF NOT EXISTS registro_pines (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    pin VARCHAR(6) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono_whatsapp VARCHAR(25) NOT NULL,
    password_hash TEXT NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    intentos INT NOT NULL DEFAULT 0,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registro_pines_email ON registro_pines (LOWER(email), usado, expira_en);

-- 6. Índice de unicidad para evitar traslape exacto de turnos
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_solape 
    ON turnos (equipo_id, fecha, hora_inicio) 
    WHERE estado IN ('PENDIENTE', 'CONFIRMADO');

-- 7. Soporte para Mercado Pago en la tabla pagos
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_pago_check 
    CHECK (metodo_pago IN ('TARJETA', 'PSE', 'NEQUI', 'DAVIPLATA', 'EFECTIVO_LOCAL', 'MERCADO_PAGO'));

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS preferencia_id VARCHAR(150);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS init_point TEXT;

-- =====================================================================
-- 05_admin_seed.sql: Creación y siembra del usuario Administrador
-- Credenciales:
--   Email: admin@peluqueriayoana.com
--   Password en texto plano: Admin2026*!
--   Rol: ADMIN
-- =====================================================================

INSERT INTO usuarios (email, password_hash, nombre_completo, rol, equipo_id, cliente_id, activo)
VALUES (
    'admin@peluqueriayoana.com',
    '$2b$12$i8vBwdeI23f6tbuKRal.x.8r20gGRKOlKz3C7cXbLyDRWJ5M3sVxW',
    'Administrador General',
    'ADMIN',
    NULL,
    NULL,
    TRUE
)
ON CONFLICT ((LOWER(email))) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    nombre_completo = EXCLUDED.nombre_completo,
    rol = 'ADMIN',
    activo = TRUE;

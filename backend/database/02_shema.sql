-- ============================================================================
-- DATOS INICIALES (SEED): PELUQUERÍA YOHANA
-- ============================================================================

-- 1. Insertar Categorías
INSERT INTO categorias (nombre, tipo) VALUES
  ('Cabello', 'SERVICIO'),
  ('Barba', 'SERVICIO'),
  ('Combo', 'SERVICIO'),
  ('Tratamiento', 'SERVICIO'),
  ('Uñas y Manos', 'SERVICIO'),
  ('Pies y Spa', 'SERVICIO'),
  ('Cuidado Capilar', 'PRODUCTO'),
  ('Cuidado de Barba', 'PRODUCTO'),
  ('Fijación y Estilo', 'PRODUCTO')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Insertar Servicios (Exactos a la UI del frontend con precios, iconos y categorías)
INSERT INTO servicios (id, categoria_id, nombre, descripcion, precio_actual, duracion_minutos, icono, texto_alternativo, genero) VALUES
  (1, 1, 'Corte Clásico', 'Corte tradicional con tijera y máquina, finalizado con detalles de navaja.', 25000.00, 45, '✂️', 'Icono de tijeras para Corte Clásico', 'hombre'),
  (2, 2, 'Arreglo de Barba', 'Perfilado, recorte y afeitado con navaja recta, toalla caliente incluida.', 20000.00, 30, '🪒', 'Icono de barbera para Arreglo de Barba', 'hombre'),
  (3, 3, 'Corte + Barba', 'El combo completo: corte a medida más tratamiento completo de barba.', 50000.00, 75, '💈', 'Icono de barbería para combo Corte y Barba', 'hombre'),
  (4, 1, 'Coloración', 'Tinte profesional para cabello o barba con productos de primera calidad.', 100000.00, 90, '🎨', 'Icono de paleta para Coloración', 'unisex'),
  (5, 4, 'Tratamiento Capilar', 'Hidratación profunda, masaje capilar y acondicionamiento con keratina.', 350000.00, 60, '🌿', 'Icono de hoja para Tratamiento Capilar', 'unisex'),
  (6, 2, 'Afeitado con Navaja', 'Experiencia completa de afeitado clásico con navaja, espuma caliente y toalla.', 30000.00, 40, '⚔️', 'Icono de navajas cruzadas para Afeitado con Navaja', 'hombre'),
  (7, 1, 'Corte Femenino', 'Corte personalizado para mujer con técnica en capas, degradados y puntas.', 80000.00, 60, '✂️', 'Icono de tijeras para Corte Femenino', 'mujer'),
  (8, 4, 'Keratina Brasileña', 'Alisado y nutrición profunda con keratina de alta calidad, elimina el frizz por meses.', 450000.00, 120, '💎', 'Icono de diamante para Keratina Brasileña', 'mujer'),
  (9, 5, 'Manicure Completo', 'Limado, cutículas, hidratación y esmaltado con esmalte tradicional o semipermanente.', 45000.00, 45, '💅', 'Icono de esmalte para Manicure Completo', 'mujer'),
  (10, 6, 'Pedicure Spa', 'Baño de pies, exfoliación, masaje relajante y esmaltado con acabado profesional.', 80000.00, 60, '🦶', 'Icono de pie para Pedicure Spa', 'mujer'),
  (11, 5, 'Manicure + Pedicure', 'El combo completo de manos y pies, con masaje y esmaltado a elección.', 120000.00, 105, '✨', 'Icono de brillo para combo Manicure y Pedicure', 'mujer'),
  (12, 1, 'Tinte & Mechas', 'Coloración femenina completa: raíces, mechas, babylights o balayage artesanal.', 750000.00, 150, '🌈', 'Icono de arcoíris para Tinte y Mechas', 'mujer')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio_actual = EXCLUDED.precio_actual,
  duracion_minutos = EXCLUDED.duracion_minutos,
  icono = EXCLUDED.icono,
  genero = EXCLUDED.genero;

SELECT setval('servicios_id_seq', (SELECT MAX(id) FROM servicios));

-- 3. Insertar Productos (Los 12 productos reales de la tienda con marcas y tags)
INSERT INTO productos (id, categoria_id, nombre, marca, descripcion, precio_actual, stock, imagen_url, texto_alternativo, etiqueta, genero) VALUES
  (1, 9, 'Pomada Brillante', 'Reuzel', 'Fijación fuerte con brillo clásico, base acuosa fácil de enjuagar.', 20000.00, 40, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format', 'Pomada Brillante Reuzel', 'Bestseller', 'hombre'),
  (2, 8, 'Aceite de Barba', 'Apothecary 87', 'Aceites naturales hidratantes para acondicionar y perfumar la barba.', 24000.00, 25, 'https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format', 'Aceite de Barba Apothecary 87', 'Nuevo', 'hombre'),
  (3, 9, 'Cera Mate', 'American Crew', 'Acabado mate natural con fijación media flexible durante todo el día.', 15000.00, 30, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format', 'Cera Mate American Crew', NULL, 'hombre'),
  (4, 8, 'Bálsamo Hidratante', 'Bulldog', 'Bálsamo calmante para piel y barba con aloe vera y camelia.', 30000.00, 20, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format', 'Bálsamo Hidratante Bulldog', 'Oferta', 'hombre'),
  (5, 8, 'Espuma de Afeitar', 'Proraso', 'Espuma enriquecida con eucalipto y mentol para un afeitado suave.', 10000.00, 50, 'https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format', 'Espuma de Afeitar Proraso', NULL, 'hombre'),
  (6, 7, 'Shampoo Premium', 'Jack Black', 'Limpieza profunda sin sulfatos con creatina y proteínas de trigo.', 35000.00, 15, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format', 'Shampoo Premium Jack Black', 'Bestseller', 'hombre'),
  (7, 7, 'Keratina Líquida', 'Cadiveu', 'Tratamiento restaurador para sellar cutículas y eliminar frizz.', 95000.00, 18, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format', 'Keratina Líquida Cadiveu', 'Bestseller', 'mujer'),
  (8, 7, 'Shampoo Hidratante', 'Wella Professionals', 'Nutrición intensa para cabello seco o tratado químicamente.', 30000.00, 22, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format', 'Shampoo Hidratante Wella', 'Nuevo', 'mujer'),
  (9, 7, 'Mascarilla Nutritiva', 'Kérastase', 'Mascarilla capilar intensiva de alta gama para regeneración capilar.', 10000.00, 12, 'https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format', 'Mascarilla Nutritiva Kérastase', 'Premium', 'mujer'),
  (10, 7, 'Aceite de Argán', 'Moroccanoil', 'Tratamiento capilar acondicionador con aceite puro de argán marroquí.', 10000.00, 35, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format', 'Aceite de Argán Moroccanoil', 'Bestseller', 'mujer'),
  (11, 7, 'Acondicionador Sin Sal', 'Lola Cosmetics', 'Acondicionador vegano ultra hidratante para rizos y ondas.', 20000.00, 28, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format', 'Acondicionador Sin Sal Lola Cosmetics', NULL, 'mujer'),
  (12, 7, 'Sérum Reparador', 'Redken', 'Protección térmica y sellado de puntas abiertas.', 15000.00, 19, 'https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format', 'Sérum Reparador Redken', 'Oferta', 'mujer')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  marca = EXCLUDED.marca,
  precio_actual = EXCLUDED.precio_actual,
  stock = EXCLUDED.stock,
  etiqueta = EXCLUDED.etiqueta,
  genero = EXCLUDED.genero;

SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));

-- 4. Insertar Equipo (6 especialistas con roles, experiencia y género M/F)
INSERT INTO equipo (id, nombre, especialidad, anios_experiencia, genero, foto_url, texto_alternativo, capacitado_accesibilidad) VALUES
  (1, 'Marco Ríos', 'Maestro Barbero', '12 años', 'M', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=500&fit=crop&auto=format', 'Fotografía de Marco Ríos', TRUE),
  (2, 'Diego Torres', 'Especialista en Color', '8 años', 'M', 'https://images.unsplash.com/photo-1647140655214-e4a2d914971f?w=400&h=500&fit=crop&auto=format', 'Fotografía de Diego Torres', TRUE),
  (3, 'Sebastián Cruz', 'Estilista Senior', '6 años', 'M', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=500&fit=crop&auto=format', 'Fotografía de Sebastián Cruz', TRUE),
  (4, 'Yohana Pérez', 'Maestra Peluquera & Keratinas', '15 años', 'F', 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=500&fit=crop&auto=format', 'Fotografía de Yohana Pérez', TRUE),
  (5, 'Valentina López', 'Manicurista & Nail Art', '7 años', 'F', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=500&fit=crop&auto=format', 'Fotografía de Valentina López', FALSE),
  (6, 'Camila Romero', 'Colorista & Estilista', '9 años', 'F', 'https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=400&h=500&fit=crop&auto=format', 'Fotografía de Camila Romero', TRUE)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  especialidad = EXCLUDED.especialidad,
  anios_experiencia = EXCLUDED.anios_experiencia,
  genero = EXCLUDED.genero,
  foto_url = EXCLUDED.foto_url;

SELECT setval('equipo_id_seq', (SELECT MAX(id) FROM equipo));

-- 5. Insertar Galería (Trabajos realizados con clase de grid)
INSERT INTO galeria (id, titulo, imagen_url, texto_alternativo, clase_span, destacado) VALUES
  (1, 'Corte en Silla Tradicional', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=700&fit=crop&auto=format', 'Hombre en silla de barbero', 'row-span-2', TRUE),
  (2, 'Espacio de Barbería Clásica', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop&auto=format', 'Silla de barbero clásica', '', FALSE),
  (3, 'Técnica de Corte en Acción', 'https://images.unsplash.com/photo-1647140655214-e4a2d914971f?w=600&h=400&fit=crop&auto=format', 'Barbero cortando cabello', '', FALSE),
  (4, 'Perfilado y Navaja de Precisión', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop&auto=format', 'Barbero con navaja', '', FALSE)
ON CONFLICT (id) DO UPDATE SET
  imagen_url = EXCLUDED.imagen_url,
  texto_alternativo = EXCLUDED.texto_alternativo,
  clase_span = EXCLUDED.clase_span;

SELECT setval('galeria_id_seq', (SELECT MAX(id) FROM galeria));

-- 6. Insertar Clientes Base (Para soporte de turnos y métricas)
INSERT INTO clientes (id, nombre_completo, telefono_whatsapp, email) VALUES
  (1, 'Martina Gómez', '+573001112233', 'martina@example.com'),
  (2, 'Carlos Rodríguez', '+573002223344', 'carlos@example.com'),
  (3, 'Sofía Valencia', '+573003334455', 'sofia@example.com'),
  (4, 'Rodrigo Morales', '+573004445566', 'rodrigo@example.com'),
  (5, 'Luciana Blanco', '+573005556677', 'luciana@example.com')
ON CONFLICT (id) DO NOTHING;

SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));

-- 7. Insertar Reseñas Iniciales (100% concordantes con la UI de testimonios)
INSERT INTO resenas (id, cliente_nombre, servicio_id, calificacion, comentario, creado_en)
SELECT * FROM (VALUES
  (1, 'Martina G.', 8, 5, 'Increíble resultado! Mi cabello quedó súper liso y brillante. Yohana es una genia, me explicó todo el proceso y el resultado duró meses. 100% recomendable.', '2026-08-15 10:30:00'::timestamp),
  (2, 'Carlos R.', 3, 5, 'Marco me dejó exactamente el corte que quería. Ya probé muchas barberías y esta es sin dudas la mejor del barrio. El ambiente es increíble.', '2026-08-10 16:45:00'::timestamp),
  (3, 'Sofía V.', 11, 5, 'Valentina es un amor, muy prolija y detallista. El salón está impecable y los precios son muy accesibles para la calidad que ofrecen.', '2026-08-05 11:15:00'::timestamp),
  (4, 'Rodrigo M.', 6, 4, 'Primera vez que me hacen un afeitado con navaja y fue una experiencia relajante. La toalla caliente y la espuma artesanal hicieron la diferencia.', '2026-07-28 17:20:00'::timestamp),
  (5, 'Luciana B.', 12, 5, 'Camila me hizo el balayage que tenía en mente hace tiempo. No solo quedó perfecto sino que el cabello quedó super sano. ¡Gracias!', '2026-07-20 14:00:00'::timestamp)
) AS v(id, cliente_nombre, servicio_id, calificacion, comentario, creado_en)
ON CONFLICT (id) DO UPDATE SET
  cliente_nombre = EXCLUDED.cliente_nombre,
  servicio_id = EXCLUDED.servicio_id,
  calificacion = EXCLUDED.calificacion,
  comentario = EXCLUDED.comentario;

SELECT setval('resenas_id_seq', (SELECT MAX(id) FROM resenas));

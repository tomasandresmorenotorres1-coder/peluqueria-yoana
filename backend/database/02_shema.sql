-- ============================================================================
-- DATOS INICIALES (SEED): PELUQUERÍA YOHANA
-- ============================================================================
-- 1. Insertar Categorías (4 de servicios según prototipo + 2 de productos)
INSERT INTO categorias (nombre, tipo)
VALUES ('Cabello', 'SERVICIO'),
    ('Barba', 'SERVICIO'),
    ('Combo', 'SERVICIO'),
    ('Tratamiento', 'SERVICIO'),
    ('Cuidado Capilar', 'PRODUCTO'),
    ('Cuidado de Barba', 'PRODUCTO');
-- 2. Insertar Servicios base (Precios iniciales editables)
INSERT INTO servicios (
        categoria_id,
        nombre,
        descripcion,
        precio_actual,
        duracion_minutos,
        icono,
        texto_alternativo
    )
VALUES (
        1,
        'Corte Clásico',
        'Corte personalizado según tu estilo y tipo de rostro, incluye lavado y peinado.',
        25000.00,
        40,
        'scissors',
        'Icono de tijeras para servicio de Corte Clásico'
    ),
    (
        2,
        'Arreglo de Barba',
        'Perfilado y diseño de barba con toalla caliente y aceites esenciales.',
        18000.00,
        25,
        'razor',
        'Icono de barbera para servicio de Arreglo de Barba'
    ),
    (
        3,
        'Corte + Barba',
        'Paquete completo de corte de cabello personalizado más diseño y perfilado de barba.',
        38000.00,
        60,
        'sparkles',
        'Icono de paquete completo Corte más Barba'
    ),
    (
        1,
        'Coloración',
        'Aplicación de tinte completo, mechas o cubrimiento de canas con productos profesionales.',
        120000.00,
        120,
        'palette',
        'Icono de paleta de color para servicio de Coloración'
    ),
    (
        4,
        'Tratamiento Capilar',
        'Hidratación profunda, nutrición y recuperación de la fibra capilar.',
        80000.00,
        60,
        'droplet',
        'Icono de hidratación para Tratamiento Capilar'
    ),
    (
        2,
        'Afeitado con Navaja',
        'Afeitado tradicional al ras con ritual de toallas calientes y loción refrescante.',
        22000.00,
        30,
        'blade',
        'Icono de navaja clásica para Afeitado con Navaja'
    );
-- 3. Insertar Equipo de Estilistas / Barberos
INSERT INTO equipo (
        nombre,
        especialidad,
        biografia,
        foto_url,
        texto_alternativo,
        capacitado_accesibilidad
    )
VALUES (
        'Yohana',
        'Estilista Principal y Colorista',
        'Especialista en cortes modernos, colorimetría y atención integral.',
        '/images/equipo/yohana.jpg',
        'Fotografía de Yohana, estilista principal sonriendo en el salón',
        TRUE
    ),
    (
        'Sebastián',
        'Maestro Barbero',
        'Experto en degradados, corte clásico y ritual de barba con toalla caliente.',
        '/images/equipo/sebastian.jpg',
        'Fotografía de Sebastián, barbero especialista realizando un corte',
        TRUE
    ),
    (
        'Julián',
        'Estilista y Cuidado Capilar',
        'Especialista en tratamientos capilares, hidratación y asesoría de imagen.',
        '/images/equipo/julian.jpg',
        'Fotografía de Julián, especialista en tratamientos capilares',
        FALSE
    );
-- 4. Insertar Productos de ejemplo
INSERT INTO productos (
        categoria_id,
        nombre,
        descripcion,
        precio_actual,
        stock,
        imagen_url,
        texto_alternativo
    )
VALUES (
        5,
        'Cera Moldeadora Mate',
        'Fijación media-alta sin brillo residual, fácil de retirar con agua.',
        32000.00,
        25,
        '/images/productos/cera-mate.jpg',
        'Envase negro de cera moldeadora efecto mate de 100 gramos'
    ),
    (
        6,
        'Aceite Hidratante para Barba',
        'Mezcla de aceites de argán y jojoba para suavizar y dar brillo a la barba.',
        28000.00,
        18,
        '/images/productos/aceite-barba.jpg',
        'Frasco gotero de vidrio ámbar con aceite hidratante para barba'
    ),
    (
        5,
        'Shampoo Anticaída Profesional',
        'Fórmula libre de sal enriquecida con biotina para fortalecer el cuero cabelludo.',
        45000.00,
        15,
        '/images/productos/shampoo.jpg',
        'Botella de shampoo profesional anticaída de 400 mililitros'
    );
-- 5. Insertar Reseñas iniciales (Basadas en el diseño del proyecto)
INSERT INTO resenas (
        cliente_nombre,
        servicio_id,
        calificacion,
        comentario
    )
VALUES (
        'Mateo G.',
        1,
        5,
        'Excelente atención y puntualidad. Reservé por la página en dos minutos y el corte quedó impecable.'
    ),
    (
        'Carlos R.',
        3,
        5,
        'El servicio de Corte + Barba es de otro nivel. El ambiente es muy cómodo y usan excelentes productos.'
    ),
    (
        'Andrés L.',
        5,
        5,
        'Muy buena asesoría en el tratamiento capilar y súper fácil pedir cita sin tener que esperar en línea.'
    );
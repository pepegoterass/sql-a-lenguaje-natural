USE artevida_cultural;

-- Views separated to allow repeatable CREATE OR REPLACE semantics
CREATE OR REPLACE VIEW vw_eventos_enriquecidos AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha_hora,
    e.precio_entrada,
    e.descripcion as evento_descripcion,
    a.id as actividad_id,
    a.nombre as actividad_nombre,
    a.tipo,
    a.subtipo,
    u.id as ubicacion_id,
    u.nombre as ubicacion_nombre,
    u.direccion,
    u.ciudad,
    u.aforo,
    u.precio_alquiler,
    u.caracteristicas,
    COALESCE(ventas.entradas_vendidas, 0) as entradas_vendidas,
    COALESCE(ventas.facturacion, 0) as facturacion,
    COALESCE(valoraciones.nota_media, 0) as nota_media,
    COALESCE(valoraciones.total_valoraciones, 0) as total_valoraciones
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN (
    SELECT evento_id, COUNT(*) as entradas_vendidas, SUM(precio_pagado) as facturacion
    FROM Entrada
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
LEFT JOIN (
    SELECT evento_id, AVG(nota) as nota_media, COUNT(*) as total_valoraciones
    FROM Valoracion
    GROUP BY evento_id
) valoraciones ON e.id = valoraciones.evento_id;

CREATE OR REPLACE VIEW vw_ventas_evento AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    u.ciudad,
    e.fecha_hora,
    COALESCE(COUNT(en.id), 0) as entradas_vendidas,
    COALESCE(SUM(en.precio_pagado), 0) as facturacion
FROM Evento e
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN Entrada en ON e.id = en.evento_id
GROUP BY e.id, e.nombre, u.ciudad, e.fecha_hora;

CREATE OR REPLACE VIEW vw_artistas_por_actividad AS
SELECT 
    a.id as actividad_id,
    a.nombre as actividad_nombre,
    a.tipo,
    a.subtipo,
    COUNT(aa.artista_id) as artistas_count,
    GROUP_CONCAT(ar.nombre ORDER BY ar.nombre SEPARATOR ', ') as artistas_nombres
FROM Actividad a
LEFT JOIN Actividad_Artista aa ON a.id = aa.actividad_id
LEFT JOIN Artista ar ON aa.artista_id = ar.id
GROUP BY a.id, a.nombre, a.tipo, a.subtipo;

CREATE OR REPLACE VIEW vw_estadisticas_ciudad AS
SELECT 
    u.ciudad,
    COUNT(DISTINCT e.id) as total_eventos,
    COUNT(DISTINCT u.id) as total_ubicaciones,
    COALESCE(SUM(ventas.entradas_vendidas), 0) as total_entradas_vendidas,
    COALESCE(SUM(ventas.facturacion), 0) as facturacion_total,
    COALESCE(AVG(valoraciones.nota_media), 0) as nota_media_ciudad
FROM Ubicacion u
LEFT JOIN Evento e ON u.id = e.ubicacion_id
LEFT JOIN (
    SELECT evento_id, COUNT(*) as entradas_vendidas, SUM(precio_pagado) as facturacion
    FROM Entrada 
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
LEFT JOIN (
    SELECT evento_id, AVG(nota) as nota_media
    FROM Valoracion 
    GROUP BY evento_id
) valoraciones ON e.id = valoraciones.evento_id
GROUP BY u.ciudad;

CREATE OR REPLACE VIEW vw_eventos_proximos AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha_hora,
    e.precio_entrada,
    a.nombre as actividad_nombre,
    a.tipo,
    u.nombre as ubicacion_nombre,
    u.ciudad,
    u.aforo,
    COALESCE(ventas.entradas_vendidas, 0) as entradas_vendidas,
    CASE 
        WHEN u.aforo > 0 THEN ROUND((COALESCE(ventas.entradas_vendidas, 0) / u.aforo) * 100, 2)
        ELSE 0
    END as porcentaje_ocupacion
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN (
    SELECT evento_id, COUNT(*) as entradas_vendidas
    FROM Entrada 
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
WHERE e.fecha_hora > NOW()
ORDER BY e.fecha_hora ASC;

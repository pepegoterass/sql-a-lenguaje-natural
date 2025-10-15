-- 100 consultas de solo lectura sobre ArteVida Cultural
-- Todas seguras (solo SELECT) y con LIMIT donde aplica

-- Q1: Últimos eventos (vista enriquecida)
SELECT evento_id, evento_nombre, ciudad, fecha_hora, tipo, precio_entrada
FROM vw_eventos_enriquecidos
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q2: Conciertos recientes
SELECT evento_id, evento_nombre, ciudad, fecha_hora, precio_entrada
FROM vw_eventos_enriquecidos
WHERE tipo = 'concierto'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q3: Teatro recientes
SELECT evento_id, evento_nombre, ciudad, fecha_hora
FROM vw_eventos_enriquecidos
WHERE tipo = 'teatro'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q4: Exposiciones recientes
SELECT evento_id, evento_nombre, ciudad, fecha_hora
FROM vw_eventos_enriquecidos
WHERE tipo = 'exposicion'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q5: Conferencias recientes
SELECT evento_id, evento_nombre, ciudad, fecha_hora
FROM vw_eventos_enriquecidos
WHERE tipo = 'conferencia'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q6: Eventos en Madrid
SELECT evento_id, evento_nombre, tipo, fecha_hora
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Madrid'
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q7: Eventos en Barcelona
SELECT evento_id, evento_nombre, tipo, fecha_hora
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Barcelona'
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q8: Eventos en Sevilla
SELECT evento_id, evento_nombre, tipo, fecha_hora
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Sevilla'
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q9: Eventos en Bilbao
SELECT evento_id, evento_nombre, tipo, fecha_hora
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Bilbao'
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q10: Eventos en Valencia
SELECT evento_id, evento_nombre, tipo, fecha_hora
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Valencia'
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q11: Top eventos por facturación
SELECT evento_id, evento_nombre, ciudad, facturacion
FROM vw_eventos_enriquecidos
ORDER BY facturacion DESC
LIMIT 20;

-- Q12: Top eventos por entradas vendidas
SELECT evento_id, evento_nombre, ciudad, entradas_vendidas
FROM vw_eventos_enriquecidos
ORDER BY entradas_vendidas DESC
LIMIT 20;

-- Q13: Top eventos por nota media
SELECT evento_id, evento_nombre, ciudad, nota_media, total_valoraciones
FROM vw_eventos_enriquecidos
ORDER BY nota_media DESC, total_valoraciones DESC
LIMIT 20;

-- Q14: Estadísticas por ciudad
SELECT *
FROM vw_estadisticas_ciudad
ORDER BY total_eventos DESC;

-- Q15: Próximos eventos (si hay futuros)
SELECT evento_id, evento_nombre, ciudad, fecha_hora, porcentaje_ocupacion
FROM vw_eventos_proximos
ORDER BY fecha_hora ASC
LIMIT 50;

-- Q16: Ventas por evento (vista ventas)
SELECT *
FROM vw_ventas_evento
ORDER BY facturacion DESC
LIMIT 20;

-- Q17: Actividades con más artistas asociados
SELECT actividad_id, actividad_nombre, tipo, artistas_count
FROM vw_artistas_por_actividad
ORDER BY artistas_count DESC
LIMIT 20;

-- Q18: Eventos con descripción (si existe) en Barcelona
SELECT evento_id, evento_nombre, ciudad, LEFT(evento_descripcion, 60) AS descripcion_corta
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Barcelona'
ORDER BY fecha_hora DESC
LIMIT 20;

-- Q19: Eventos baratos (<= 20€)
SELECT evento_id, evento_nombre, ciudad, precio_entrada
FROM vw_eventos_enriquecidos
WHERE precio_entrada <= 20
ORDER BY fecha_hora DESC
LIMIT 20;

-- Q20: Eventos caros (> 50€)
SELECT evento_id, evento_nombre, ciudad, precio_entrada
FROM vw_eventos_enriquecidos
WHERE precio_entrada > 50
ORDER BY precio_entrada DESC
LIMIT 20;

-- Q21: Conteo de eventos por ciudad
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY total DESC;

-- Q22: Conteo por tipo
SELECT tipo, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY tipo
ORDER BY total DESC;

-- Q23: Eventos de Pablo Alborán (join patrón artista)
SELECT e.nombre AS evento, e.fecha_hora, u.ciudad, ar.nombre AS artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Pablo Alborán%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q24: Conciertos de Rosalía
SELECT e.nombre AS evento, e.fecha_hora, u.ciudad, a.tipo, ar.nombre AS artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Rosalía%' AND a.tipo = 'concierto'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q25: Eventos de teatro en Madrid
SELECT evento_id, evento_nombre, ciudad, fecha_hora
FROM vw_eventos_enriquecidos
WHERE tipo = 'teatro' AND ciudad = 'Madrid'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q26: Eventos por subtipo (World Music)
SELECT evento_id, evento_nombre, subtipo, ciudad, fecha_hora
FROM vw_eventos_enriquecidos
WHERE subtipo LIKE '%World%'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q27: Eventos con nota media >= 4
SELECT evento_id, evento_nombre, ciudad, nota_media
FROM vw_eventos_enriquecidos
WHERE nota_media >= 4
ORDER BY nota_media DESC
LIMIT 50;

-- Q28: Ciudades con mayor facturación total (vista de ciudades)
SELECT ciudad, facturacion_total
FROM vw_estadisticas_ciudad
ORDER BY facturacion_total DESC
LIMIT 10;

-- Q29: Ciudades con más entradas vendidas
SELECT ciudad, total_entradas_vendidas
FROM vw_estadisticas_ciudad
ORDER BY total_entradas_vendidas DESC
LIMIT 10;

-- Q30: Primeros 10 artistas (tabla)
SELECT id, nombre
FROM Artista
ORDER BY nombre ASC
LIMIT 10;

-- Q31: Actividades por tipo concierto
SELECT id, nombre, subtipo
FROM Actividad
WHERE tipo = 'concierto'
ORDER BY nombre
LIMIT 50;

-- Q32: Ubicaciones en Madrid
SELECT id, nombre, aforo
FROM Ubicacion
WHERE ciudad = 'Madrid'
ORDER BY aforo DESC
LIMIT 50;

-- Q33: Entradas por evento (conteo)
SELECT evento_id, COUNT(*) AS entradas
FROM Entrada
GROUP BY evento_id
ORDER BY entradas DESC
LIMIT 20;

-- Q34: Valoraciones más recientes
SELECT evento_id, nota, fecha_valoracion
FROM Valoracion
ORDER BY fecha_valoracion DESC
LIMIT 20;

-- Q35: Eventos en 2024
SELECT evento_id, evento_nombre, fecha_hora
FROM vw_eventos_enriquecidos
WHERE YEAR(fecha_hora) = 2024
ORDER BY fecha_hora DESC
LIMIT 100;

-- Q36: Precio medio por ciudad
SELECT ciudad, ROUND(AVG(precio_entrada), 2) AS precio_medio
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY precio_medio DESC;

-- Q37: Aforo medio por ciudad
SELECT ciudad, ROUND(AVG(aforo), 2) AS aforo_medio
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY aforo_medio DESC;

-- Q38: Eventos con ocupación estimada (si hay futuros)
SELECT evento_id, evento_nombre, ciudad, porcentaje_ocupacion
FROM vw_eventos_proximos
ORDER BY porcentaje_ocupacion DESC
LIMIT 20;

-- Q39: Eventos por actividad y ciudad
SELECT actividad_nombre, ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY actividad_nombre, ciudad
ORDER BY total DESC
LIMIT 50;

-- Q40: Eventos con facturación > 1000€
SELECT evento_id, evento_nombre, ciudad, facturacion
FROM vw_eventos_enriquecidos
WHERE facturacion > 1000
ORDER BY facturacion DESC;

-- Q41: Eventos con pocas valoraciones (<= 2)
SELECT evento_id, evento_nombre, ciudad, total_valoraciones
FROM vw_eventos_enriquecidos
WHERE total_valoraciones <= 2
ORDER BY total_valoraciones ASC, fecha_hora DESC
LIMIT 50;

-- Q42: Actividades y artistas concatenados (vista artistas_por_actividad)
SELECT actividad_nombre, artistas_nombres
FROM vw_artistas_por_actividad
ORDER BY actividad_nombre
LIMIT 50;

-- Q43: Top ciudades por número de ubicaciones (desde vista de ciudades)
SELECT ciudad, total_ubicaciones
FROM vw_estadisticas_ciudad
ORDER BY total_ubicaciones DESC
LIMIT 10;

-- Q44: Eventos por rango de precios (<=30, 30-50, >50)
SELECT 
  CASE 
    WHEN precio_entrada <= 30 THEN '<=30'
    WHEN precio_entrada <= 50 THEN '31-50'
    ELSE '>50'
  END AS rango,
  COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY rango
ORDER BY total DESC;

-- Q45: Eventos por día del mes
SELECT DAY(fecha_hora) AS dia, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY dia
ORDER BY dia;

-- Q46: Eventos por mes
SELECT MONTH(fecha_hora) AS mes, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY mes
ORDER BY mes;

-- Q47: Promedio de nota por ciudad
SELECT ciudad, ROUND(AVG(nota_media), 2) AS nota_media_ciudad
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY nota_media_ciudad DESC;

-- Q48: Eventos con ciudad que contiene 'Bil'
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE ciudad LIKE '%Bil%'
ORDER BY fecha_hora DESC
LIMIT 20;

-- Q49: Actividades que contienen 'Don Juan'
SELECT id, nombre, tipo
FROM Actividad
WHERE nombre LIKE '%Don Juan%'
ORDER BY id;

-- Q50: Eventos con artista 'Manu Chao'
SELECT e.nombre AS evento, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Manu Chao%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q51: Ventas (entradas) por ciudad
SELECT u.ciudad, COUNT(en.id) AS entradas
FROM Entrada en
JOIN Evento e ON en.evento_id = e.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
GROUP BY u.ciudad
ORDER BY entradas DESC;

-- Q52: Facturación por ciudad (calc desde entradas)
SELECT u.ciudad, ROUND(SUM(en.precio_pagado),2) AS facturacion
FROM Entrada en
JOIN Evento e ON en.evento_id = e.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
GROUP BY u.ciudad
ORDER BY facturacion DESC;

-- Q53: Entradas vendidas por artista (agregado)
SELECT ar.nombre AS artista, COUNT(en.id) AS entradas
FROM Entrada en
JOIN Evento e ON en.evento_id = e.id
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
GROUP BY ar.nombre
ORDER BY entradas DESC
LIMIT 20;

-- Q54: Valoraciones promedio por evento
SELECT e.id AS evento_id, e.nombre AS evento, ROUND(AVG(v.nota),2) AS nota_media
FROM Valoracion v
JOIN Evento e ON v.evento_id = e.id
GROUP BY e.id, e.nombre
ORDER BY nota_media DESC, e.nombre ASC
LIMIT 20;

-- Q55: Eventos sin valoraciones (0)
SELECT ve.evento_id, ve.evento_nombre
FROM vw_eventos_enriquecidos ve
WHERE ve.total_valoraciones = 0
ORDER BY ve.fecha_hora DESC
LIMIT 50;

-- Q56: Eventos con múltiples artistas (>=2)
SELECT a.id AS actividad_id, a.nombre AS actividad, COUNT(aa.artista_id) AS artistas
FROM Actividad a
LEFT JOIN Actividad_Artista aa ON a.id = aa.actividad_id
GROUP BY a.id, a.nombre
HAVING COUNT(aa.artista_id) >= 2
ORDER BY artistas DESC, a.nombre ASC;

-- Q57: Aforo total por ciudad
SELECT ciudad, SUM(aforo) AS aforo_total
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY aforo_total DESC;

-- Q58: Media de precio por tipo
SELECT tipo, ROUND(AVG(precio_entrada),2) AS precio_medio
FROM vw_eventos_enriquecidos
GROUP BY tipo
ORDER BY precio_medio DESC;

-- Q59: Top ubicaciones por facturación agregada
SELECT u.nombre AS ubicacion, u.ciudad, ROUND(SUM(en.precio_pagado),2) AS facturacion
FROM Entrada en
JOIN Evento e ON en.evento_id = e.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
GROUP BY u.nombre, u.ciudad
ORDER BY facturacion DESC
LIMIT 20;

-- Q60: Eventos en San Sebastián
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE ciudad = 'San Sebastián'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q61: Eventos en Santiago de Compostela
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Santiago de Compostela'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q62: Eventos en Bilbao ordenados por entradas
SELECT evento_id, evento_nombre, entradas_vendidas
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Bilbao'
ORDER BY entradas_vendidas DESC
LIMIT 20;

-- Q63: Eventos que contienen 'Tenorio'
SELECT evento_id, evento_nombre, fecha_hora
FROM vw_eventos_enriquecidos
WHERE evento_nombre LIKE '%Tenorio%'
ORDER BY fecha_hora DESC
LIMIT 20;

-- Q64: Eventos por hora del día
SELECT HOUR(fecha_hora) AS hora, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY hora
ORDER BY hora;

-- Q65: Entradas por mes (de compra)
SELECT MONTH(fecha_compra) AS mes, COUNT(*) AS entradas
FROM Entrada
GROUP BY mes
ORDER BY mes;

-- Q66: Facturación por mes (de compra)
SELECT MONTH(fecha_compra) AS mes, ROUND(SUM(precio_pagado),2) AS facturacion
FROM Entrada
GROUP BY mes
ORDER BY mes;

-- Q67: Eventos por ubicación
SELECT u.nombre AS ubicacion, u.ciudad, COUNT(e.id) AS eventos
FROM Ubicacion u
LEFT JOIN Evento e ON u.id = e.ubicacion_id
GROUP BY u.nombre, u.ciudad
ORDER BY eventos DESC, u.nombre ASC
LIMIT 20;

-- Q68: Actividades por subtipo (no nulos)
SELECT subtipo, COUNT(*) AS total
FROM Actividad
WHERE subtipo IS NOT NULL AND subtipo <> ''
GROUP BY subtipo
ORDER BY total DESC
LIMIT 20;

-- Q69: Eventos con precio nulo (si existiera)
SELECT evento_id, evento_nombre
FROM vw_eventos_enriquecidos
WHERE precio_entrada IS NULL
ORDER BY fecha_hora DESC
LIMIT 20;

-- Q70: Eventos entre dos fechas
SELECT evento_id, evento_nombre, fecha_hora
FROM vw_eventos_enriquecidos
WHERE fecha_hora BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY fecha_hora ASC
LIMIT 100;

-- Q71: Top eventos por relación facturación/aforo (estimada)
SELECT evento_id, evento_nombre, ROUND(facturacion / NULLIF(aforo,0), 4) AS ratio
FROM vw_eventos_enriquecidos
WHERE aforo > 0
ORDER BY ratio DESC
LIMIT 20;

-- Q72: Ciudades con mejor nota media
SELECT ciudad, ROUND(AVG(nota_media),2) AS nota_media_prom
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY nota_media_prom DESC
LIMIT 20;

-- Q73: Eventos con artista 'Ana Belén'
SELECT e.nombre AS evento, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Ana Belén%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q74: Eventos con artista 'Víctor Manuel'
SELECT e.nombre AS evento, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Víctor Manuel%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q75: Eventos de 'Don Juan Tenorio'
SELECT e.nombre, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE a.nombre LIKE '%Don Juan Tenorio%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q76: Eventos de 'La Casa de Bernarda Alba'
SELECT e.nombre, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE a.nombre LIKE '%Bernarda%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q77: Eventos de 'Velázquez'
SELECT e.nombre, u.ciudad, e.fecha_hora
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE a.nombre LIKE '%Velázquez%'
ORDER BY e.fecha_hora DESC
LIMIT 200;

-- Q78: Exposiciones por ciudad
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
WHERE tipo = 'exposicion'
GROUP BY ciudad
ORDER BY total DESC;

-- Q79: Conferencias por ciudad
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
WHERE tipo = 'conferencia'
GROUP BY ciudad
ORDER BY total DESC;

-- Q80: Conciertos por ciudad
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
WHERE tipo = 'concierto'
GROUP BY ciudad
ORDER BY total DESC;

-- Q81: Eventos con precio > 40 en Madrid
SELECT evento_id, evento_nombre, ciudad, precio_entrada
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Madrid' AND precio_entrada > 40
ORDER BY precio_entrada DESC
LIMIT 20;

-- Q82: Eventos con precio <= 30 en Sevilla
SELECT evento_id, evento_nombre, ciudad, precio_entrada
FROM vw_eventos_enriquecidos
WHERE ciudad = 'Sevilla' AND precio_entrada <= 30
ORDER BY precio_entrada ASC
LIMIT 20;

-- Q83: Entradas vendidas totales
SELECT SUM(entradas_vendidas) AS total_entradas
FROM vw_eventos_enriquecidos;

-- Q84: Facturación total
SELECT ROUND(SUM(facturacion),2) AS facturacion_total
FROM vw_eventos_enriquecidos;

-- Q85: Eventos sin entradas (0 vendidas)
SELECT evento_id, evento_nombre
FROM vw_eventos_enriquecidos
WHERE entradas_vendidas = 0
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q86: Top actividades por nota media agregada
SELECT actividad_nombre, ROUND(AVG(nota_media),2) AS nota_media_prom
FROM vw_eventos_enriquecidos
GROUP BY actividad_nombre
ORDER BY nota_media_prom DESC
LIMIT 20;

-- Q87: Top ubicaciones por número de eventos
SELECT ubicacion_nombre, ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY ubicacion_nombre, ciudad
ORDER BY total DESC
LIMIT 20;

-- Q88: Actividades con artistas listados (vista)
SELECT actividad_nombre, artistas_nombres
FROM vw_artistas_por_actividad
WHERE artistas_nombres IS NOT NULL AND artistas_nombres <> ''
ORDER BY actividad_nombre ASC
LIMIT 50;

-- Q89: Precio medio por subtipo
SELECT subtipo, ROUND(AVG(precio_entrada),2) AS precio_medio
FROM vw_eventos_enriquecidos
WHERE subtipo IS NOT NULL AND subtipo <> ''
GROUP BY subtipo
ORDER BY precio_medio DESC
LIMIT 20;

-- Q90: Eventos por rango horario (tarde >= 18h)
SELECT evento_id, evento_nombre, fecha_hora
FROM vw_eventos_enriquecidos
WHERE HOUR(fecha_hora) >= 18
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q91: Eventos por rango horario (mañana < 12h)
SELECT evento_id, evento_nombre, fecha_hora
FROM vw_eventos_enriquecidos
WHERE HOUR(fecha_hora) < 12
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q92: Eventos ordenados por aforo del venue
SELECT evento_id, evento_nombre, ciudad, aforo
FROM vw_eventos_enriquecidos
ORDER BY aforo DESC, fecha_hora DESC
LIMIT 50;

-- Q93: Eventos en ciudades que contienen 'a'
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE ciudad LIKE '%a%'
ORDER BY ciudad ASC, fecha_hora DESC
LIMIT 50;

-- Q94: Entradas vendidas y facturación por tipo
SELECT tipo, SUM(entradas_vendidas) AS entradas, ROUND(SUM(facturacion),2) AS facturacion
FROM vw_eventos_enriquecidos
GROUP BY tipo
ORDER BY facturacion DESC;

-- Q95: Actividades con 0 artistas (si existiera)
SELECT actividad_id, actividad_nombre
FROM vw_artistas_por_actividad
WHERE artistas_count = 0
ORDER BY actividad_nombre ASC
LIMIT 50;

-- Q96: Eventos que contienen 'Pablo'
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE evento_nombre LIKE '%Pablo%'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q97: Eventos que contienen 'Rosalía'
SELECT evento_id, evento_nombre, ciudad
FROM vw_eventos_enriquecidos
WHERE evento_nombre LIKE '%Rosalía%'
ORDER BY fecha_hora DESC
LIMIT 50;

-- Q98: Tiempo hasta el evento (futuros, si existen)
SELECT evento_id, evento_nombre, TIMESTAMPDIFF(DAY, NOW(), fecha_hora) AS dias
FROM vw_eventos_proximos
ORDER BY dias ASC
LIMIT 50;

-- Q99: Eventos de 2024 por ciudad
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
WHERE YEAR(fecha_hora) = 2024
GROUP BY ciudad
ORDER BY total DESC;

-- Q100: Resumen general: total eventos, artistas, ubicaciones
SELECT 
  (SELECT COUNT(*) FROM Evento) AS total_eventos,
  (SELECT COUNT(*) FROM Artista) AS total_artistas,
  (SELECT COUNT(*) FROM Ubicacion) AS total_ubicaciones;

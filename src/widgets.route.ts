import { Router } from 'express';
import { executeQuery } from './db.js';
import pino from 'pino';

const router = Router();
const logger = pino({ 
  name: 'widgets-route',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,name',
      messageFormat: '📊 {msg}',
      levelFirst: true,
      singleLine: true
    }
  }
});

/**
 * GET /widgets/kpis - Obtener KPIs principales
 */
router.get('/kpis', async (_req, res) => {
  try {
    // Obtener eventos
    const eventosResult = await executeQuery('SELECT COUNT(*) as count FROM Evento');
    const eventos = eventosResult[0]?.count || 0;

    // Obtener entradas vendidas
    const entradasResult = await executeQuery('SELECT COUNT(*) as count FROM Entrada');
    const entradas = entradasResult[0]?.count || 0;

    // Obtener facturación total
    const facturacionResult = await executeQuery('SELECT SUM(precio_pagado) as total FROM Entrada');
    const facturacion = facturacionResult[0]?.total || 0;

    // Obtener nota media
    const notaResult = await executeQuery('SELECT AVG(nota) as media FROM Valoracion');
    const notaMedia = parseFloat(notaResult[0]?.media || 0);

    const kpis = {
      eventos,
      entradas,
      facturacion,
      notaMedia: Math.round(notaMedia * 10) / 10,
      eventosChange: Math.round(Math.random() * 20 - 10), // Simulado
      entradasChange: Math.round(Math.random() * 20 - 10), // Simulado
      facturacionChange: Math.round(Math.random() * 20 - 10), // Simulado
      notaMediaChange: Math.round(Math.random() * 10 - 5) // Simulado
    };

    logger.info({ kpis }, 'KPIs generados');
    res.json(kpis);

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error obteniendo KPIs');
    res.status(500).json({
      error: 'Error obteniendo KPIs',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /widgets/ventas - Obtener datos de ventas
 */
router.get('/ventas', async (req, res) => {
  try {
    const type = req.query.type || 'timeline';
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (type === 'eventos') {
      // Ventas por evento
      const query = `
        SELECT 
          e.id,
          e.nombre as evento_nombre,
          e.fecha_hora,
          e.precio_entrada,
          u.ciudad,
          u.nombre as ubicacion_nombre,
          u.aforo,
          COUNT(en.id) as entradas_vendidas,
          SUM(en.precio_pagado) as ingresos_totales,
          ROUND((COUNT(en.id) / u.aforo) * 100, 1) as porcentaje_ocupacion,
          ac.tipo as evento_tipo
        FROM Evento e
        JOIN Ubicacion u ON e.ubicacion_id = u.id
        JOIN Actividad ac ON e.actividad_id = ac.id
        LEFT JOIN Entrada en ON e.id = en.evento_id
        GROUP BY e.id, e.nombre, e.fecha_hora, e.precio_entrada, u.ciudad, u.nombre, u.aforo, ac.tipo
        ORDER BY ingresos_totales DESC, entradas_vendidas DESC
        LIMIT ${limit}
      `;
      
      const results = await executeQuery(query);
      logger.info({ type, count: results.length }, 'Ventas por evento obtenidas');
      res.json(results);
      
    } else {
      // Timeline de ventas (original)
      const granularity = req.query.granularity || 'month';
      
      let query = '';
      if (granularity === 'month') {
        query = `
          SELECT 
            DATE_FORMAT(e.fecha_hora, '%Y-%m') as fecha,
            COUNT(en.id) as ventas,
            SUM(en.precio_pagado) as ingresos
          FROM Evento e
          LEFT JOIN Entrada en ON e.id = en.evento_id
          WHERE e.fecha_hora >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(e.fecha_hora, '%Y-%m')
          ORDER BY fecha
        `;
      } else {
        query = `
          SELECT 
            DATE(e.fecha_hora) as fecha,
            COUNT(en.id) as ventas,
            SUM(en.precio_pagado) as ingresos
          FROM Evento e
          LEFT JOIN Entrada en ON e.id = en.evento_id
          WHERE e.fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(e.fecha_hora)
          ORDER BY fecha
        `;
      }

      const results = await executeQuery(query);
      logger.info({ granularity, count: results.length }, 'Timeline de ventas obtenido');
      res.json(results);
    }

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error obteniendo ventas');
    res.status(500).json({
      error: 'Error obteniendo datos de ventas',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /widgets/valoraciones - Obtener valoraciones con detalles
 */
router.get('/valoraciones', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const orderBy = (req.query.orderBy as string) || 'fecha';
    
    let query = `
      SELECT 
        v.id,
        v.nota,
        v.comentario,
        e.nombre as evento_nombre,
        e.fecha_hora,
        a.nombre_completo as asistente_nombre,
        u.ciudad,
        ac.tipo as evento_tipo,
        ac.subtipo
      FROM Valoracion v
      JOIN Evento e ON v.evento_id = e.id
      JOIN Asistente a ON v.asistente_id = a.id
      JOIN Ubicacion u ON e.ubicacion_id = u.id
      JOIN Actividad ac ON e.actividad_id = ac.id
    `;
    
    if (orderBy === 'nota') {
      query += ' ORDER BY v.nota DESC, e.fecha_hora DESC';
    } else {
      query += ' ORDER BY e.fecha_hora DESC, v.nota DESC';
    }
    
    query += ` LIMIT ${limit}`;

    const valoraciones = await executeQuery(query);
    
    // Obtener estadísticas de valoraciones
    const statsQuery = `
      SELECT 
        COUNT(*) as total_valoraciones,
        AVG(nota) as nota_media,
        COUNT(CASE WHEN nota >= 4 THEN 1 END) as positivas,
        COUNT(CASE WHEN nota <= 2 THEN 1 END) as negativas
      FROM Valoracion
    `;
    
    const stats = await executeQuery(statsQuery);
    
    const response = {
      valoraciones,
      estadisticas: {
        total: stats[0]?.total_valoraciones || 0,
        notaMedia: Math.round((stats[0]?.nota_media || 0) * 10) / 10,
        positivas: stats[0]?.positivas || 0,
        negativas: stats[0]?.negativas || 0
      }
    };
    
    logger.info({ count: valoraciones.length }, 'Valoraciones obtenidas');
    res.json(response);

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error obteniendo valoraciones');
    res.status(500).json({
      error: 'Error obteniendo valoraciones',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /widgets/top-ciudades - Obtener top ciudades por eventos/ingresos
 */
router.get('/top-ciudades', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    const query = `
      SELECT 
        u.ciudad,
        COUNT(e.id) as eventos,
        COALESCE(SUM(en.precio_pagado), 0) as ingresos
      FROM Ubicacion u
      LEFT JOIN Evento e ON u.id = e.ubicacion_id
      LEFT JOIN Entrada en ON e.id = en.evento_id
      GROUP BY u.id, u.ciudad
      HAVING eventos > 0
      ORDER BY ingresos DESC, eventos DESC
      LIMIT ?
    `;

    const results = await executeQuery(query.replace('?', limit.toString()));
    
    logger.info({ limit, count: results.length }, 'Top ciudades obtenidas');
    res.json(results);

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error obteniendo top ciudades');
    res.status(500).json({
      error: 'Error obteniendo top ciudades',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
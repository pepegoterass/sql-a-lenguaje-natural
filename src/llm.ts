import pino from 'pino';

const logger = pino({ name: 'llm' });

// Catálogo de tablas y vistas permitidas para el prompt
const CATALOG_WHITELIST = `
Tablas disponibles:
- Actividad (id, nombre, tipo, subtipo)
- Artista (id, nombre, biografia) 
- Actividad_Artista (actividad_id, artista_id)
- Ubicacion (id, nombre, direccion, ciudad, aforo, precio_alquiler, caracteristicas)
- Evento (id, nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora, descripcion)
- Asistente (id, nombre_completo, telefono, email)
- Entrada (id, evento_id, asistente_id, precio_pagado, fecha_compra)
- Valoracion (id, evento_id, asistente_id, nota, comentario, fecha_valoracion)

Vistas disponibles:
- vw_eventos_enriquecidos (evento_id, evento_nombre, fecha_hora, precio_entrada, evento_descripcion, actividad_id, actividad_nombre, tipo, subtipo, ubicacion_id, ubicacion_nombre, direccion, ciudad, aforo, precio_alquiler, caracteristicas, entradas_vendidas, facturacion, nota_media, total_valoraciones)
- vw_ventas_evento (evento_id, evento_nombre, ciudad, fecha_hora, entradas_vendidas, facturacion)
- vw_artistas_por_actividad (actividad_id, actividad_nombre, tipo, subtipo, artistas_count, artistas_nombres)
- vw_estadisticas_ciudad (ciudad, total_eventos, total_ubicaciones, total_entradas_vendidas, facturacion_total, nota_media_ciudad)
`.trim();

// Plantilla base para LLM real
const LLM_PROMPT_TEMPLATE = `
Eres un analista de datos experto en MySQL 8. Genera UNA consulta SQL segura y eficiente.

REGLAS ESTRICTAS:
- Usa SOLO estas tablas/vistas: {CATALOG_WHITELIST}
- SOLO consultas SELECT permitidas. Prohibido INSERT/UPDATE/DELETE/CREATE/ALTER/DROP/TRUNCATE/RENAME
- Si no hay LIMIT en la consulta, se añadirá automáticamente LIMIT 200
- Si la pregunta es ambigua, elige la interpretación más razonable
- Responde solo con el bloque \`\`\`sql ... \`\`\` con la consulta

{CATALOG_WHITELIST}

Usuario pregunta: "{QUESTION}"

Genera la consulta SQL:
`.trim();

// Few-shot examples para el stub determinista
const FEW_SHOT_EXAMPLES = new Map<string, { sql: string; explanation: string }>([
  [
    '¿cuántos eventos por ciudad en 2024?',
    {
      sql: `SELECT ciudad, COUNT(*) AS total_eventos 
FROM vw_eventos_enriquecidos 
WHERE YEAR(fecha_hora) = 2024 
GROUP BY ciudad 
ORDER BY total_eventos DESC`,
      explanation: 'Muestra el número total de eventos agrupados por ciudad para el año 2024, ordenados de mayor a menor cantidad.'
    }
  ],
  [
    'top 5 artistas con más actividades de teatro',
    {
      sql: `SELECT a.nombre, COUNT(*) AS actividades_teatro
FROM Artista a
JOIN Actividad_Artista aa ON a.id = aa.artista_id  
JOIN Actividad ac ON aa.actividad_id = ac.id
WHERE ac.tipo = 'teatro'
GROUP BY a.id, a.nombre
ORDER BY actividades_teatro DESC
LIMIT 5`,
      explanation: 'Lista los 5 artistas con mayor participación en actividades teatrales.'
    }
  ],
  [
    'top artistas teatro',
    {
      sql: `SELECT a.nombre, COUNT(*) AS actividades_teatro
FROM Artista a
JOIN Actividad_Artista aa ON a.id = aa.artista_id  
JOIN Actividad ac ON aa.actividad_id = ac.id
WHERE ac.tipo = 'teatro'
GROUP BY a.id, a.nombre
ORDER BY actividades_teatro DESC
LIMIT 10`,
      explanation: 'Lista los artistas con participación en actividades teatrales.'
    }
  ],
  [
    'fechas con más eventos',
    {
      sql: `SELECT DATE(fecha_hora) as fecha, COUNT(*) as total_eventos
FROM Evento  
GROUP BY DATE(fecha_hora)
ORDER BY total_eventos DESC`,
      explanation: 'Muestra las fechas ordenadas por el número de eventos programados, de mayor a menor.'
    }
  ],
  [
    'actividades con un solo artista',
    {
      sql: `SELECT ac.nombre, ac.tipo, ac.subtipo
FROM Actividad ac
JOIN Actividad_Artista aa ON ac.id = aa.actividad_id
GROUP BY ac.id, ac.nombre, ac.tipo, ac.subtipo  
HAVING COUNT(aa.artista_id) = 1`,
      explanation: 'Lista las actividades que tienen exactamente un artista participante.'
    }
  ],
  [
    'eventos con nota 0 o peor valoración',
    {
      sql: `SELECT DISTINCT e.nombre, e.fecha_hora, AVG(v.nota) as nota_promedio
FROM Evento e
JOIN Valoracion v ON e.id = v.evento_id
GROUP BY e.id, e.nombre, e.fecha_hora
HAVING AVG(v.nota) <= 1
ORDER BY nota_promedio ASC`,
      explanation: 'Muestra eventos con las peores valoraciones (nota promedio de 1 o menos), ordenados por nota.'
    }
  ]
]);

/**
 * Genera una consulta SQL a partir de una pregunta en lenguaje natural
 */
export async function generateSqlFromQuestion(question: string): Promise<{ sql: string; explanation: string }> {
  const normalizedQuestion = question.toLowerCase().trim();
  
  logger.info({ question }, 'Generando SQL para pregunta');

  // Buscar coincidencias exactas o similares en few-shots
  for (const [exampleQuestion, result] of FEW_SHOT_EXAMPLES) {
    if (normalizedQuestion.includes(exampleQuestion) || 
        exampleQuestion.includes(normalizedQuestion) ||
        calculateSimilarity(normalizedQuestion, exampleQuestion) > 0.7) {
      
      logger.info({ 
        question, 
        matchedExample: exampleQuestion,
        sql: result.sql 
      }, 'Encontrada coincidencia en few-shot examples');
      
      return result;
    }
  }

  // Fallback: análisis por palabras clave
  const keywordBasedSql = generateSqlFromKeywords(normalizedQuestion);
  if (keywordBasedSql) {
    logger.info({ question, sql: keywordBasedSql.sql }, 'Generado SQL basado en palabras clave');
    return keywordBasedSql;
  }

  // Fallback por defecto: mostrar todos los eventos
  const fallbackResult = {
    sql: 'SELECT * FROM vw_eventos_enriquecidos ORDER BY fecha_hora DESC',
    explanation: `No pude interpretar específicamente la pregunta "${question}". Mostrando todos los eventos ordenados por fecha.`
  };

  logger.warn({ question }, 'Usando consulta fallback por defecto');
  return fallbackResult;
}

/**
 * Genera SQL basado en palabras clave identificadas
 */
function generateSqlFromKeywords(question: string): { sql: string; explanation: string } | null {
  // Detectar consultas sobre conteos
  if (question.includes('cuántos') || question.includes('cantidad') || question.includes('número')) {
    if (question.includes('evento')) {
      return {
        sql: 'SELECT COUNT(*) as total_eventos FROM Evento',
        explanation: 'Cuenta el número total de eventos en la base de datos.'
      };
    }
    if (question.includes('artista')) {
      return {
        sql: 'SELECT COUNT(*) as total_artistas FROM Artista',
        explanation: 'Cuenta el número total de artistas registrados.'
      };
    }
  }

  // Detectar consultas sobre mejores/peores
  if (question.includes('mejor') || question.includes('top')) {
    if (question.includes('evento')) {
      return {
        sql: `SELECT e.nombre, AVG(v.nota) as nota_promedio 
FROM Evento e 
LEFT JOIN Valoracion v ON e.id = v.evento_id 
GROUP BY e.id, e.nombre 
HAVING nota_promedio IS NOT NULL 
ORDER BY nota_promedio DESC`,
        explanation: 'Muestra los eventos mejor valorados según la nota promedio.'
      };
    }
  }

  // Detectar consultas temporales
  if (question.includes('2024') || question.includes('año')) {
    return {
      sql: `SELECT * FROM vw_eventos_enriquecidos 
WHERE YEAR(fecha_hora) = 2024 
ORDER BY fecha_hora`,
      explanation: 'Muestra todos los eventos del año 2024.'
    };
  }

  // Detectar consultas por tipo
  if (question.includes('concierto') || question.includes('música')) {
    return {
      sql: `SELECT * FROM vw_eventos_enriquecidos 
WHERE tipo = 'concierto' 
ORDER BY fecha_hora DESC`,
      explanation: 'Muestra todos los eventos de tipo concierto.'
    };
  }

  if (question.includes('teatro')) {
    return {
      sql: `SELECT * FROM vw_eventos_enriquecidos 
WHERE tipo = 'teatro' 
ORDER BY fecha_hora DESC`,
      explanation: 'Muestra todos los eventos teatrales.'
    };
  }

  return null;
}

/**
 * Calcula similaridad básica entre dos strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  let matches = 0;
  words1.forEach(word => {
    if (words2.includes(word)) matches++;
  });
  
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Obtiene el prompt template completo para uso con LLM real
 */
export function getLlmPromptTemplate(): string {
  return LLM_PROMPT_TEMPLATE.replace('{CATALOG_WHITELIST}', CATALOG_WHITELIST);
}
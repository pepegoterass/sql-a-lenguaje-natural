import OpenAI from 'openai';
import { config } from 'dotenv';
import pino from 'pino';
import { executeQuery } from './db.js';

// Cargar variables de entorno
config();

// Logger
const logger = pino({ 
  name: 'artevida-openai',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,name',
      messageFormat: '🤖 {msg}',
      levelFirst: true,
      singleLine: true
    }
  }
});

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;
const apiKey = process.env.OPENAI_API_KEY;
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

if (!IS_TEST && apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.startsWith('sk-')) {
  try {
    openai = new OpenAI({
      apiKey: apiKey
    });
    logger.info('OpenAI client inicializado correctamente');
  } catch (error) {
    logger.error({ error }, 'Error inicializando cliente OpenAI');
  }
} else {
  logger.warn({ 
    hasKey: !!apiKey, 
    keyStart: apiKey ? apiKey.substring(0, 8) + '...' : 'none' 
  }, 'OpenAI API Key no válida o no encontrada');
}

const SYSTEM_PROMPT = `Eres un analista experto en MySQL 8 para la base "artevida_cultural".

IMPORTANTE: Si la pregunta es conversacional (saludos, hola, "¿qué tal?", "¿cómo estás?", agradecimientos), responde naturalmente como asistente amigable de ArteVida y NO generes SQL.

MANEJO CRÍTICO DE CONTEXTO CONVERSACIONAL:
- FUNDAMENTAL: Cuando el usuario usa pronombres ("esos", "estos", "de ahí") o referencias vagas ("precios", "fechas", "conciertos") SIN mencionar artista/evento específico, está refiriéndose EXACTAMENTE a los resultados del mensaje anterior
- COPIA las condiciones WHERE completas del SQL anterior cuando sea relevante
- Ejemplo: SQL anterior "WHERE ar.nombre LIKE '%Rosalía%'" + Usuario dice "precios de esos" = Usar la MISMA condición de Rosalía
- NO hagas consultas genéricas cuando hay contexto específico
- SOLO reutiliza filtros anteriores si hay pronombres referenciales. Si el usuario introduce un nuevo término concreto (p. ej., "Literatura del Siglo de Oro"), NO mantengas filtros de consultas previas (ciudad/artista/fecha) a menos que también los mencione.

Para consultas de datos, convierte la pregunta del usuario (español) en UNA SOLA consulta SQL SEGURA.

ESTILO DE SQL (OBLIGATORIO cuando uses tablas base):
- Usa alias cortos y consistentes: Evento e, Actividad a, Ubicacion u, Entrada en, Valoracion v, Actividad_Artista aa, Artista ar
- Orden de cláusulas: SELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT ...
- Prefiere SELECT de columnas concretas; usa '*' sólo en vistas como vw_eventos_enriquecidos
- Cuando cuentes ceros en valoraciones, usa explícitamente WHERE v.nota = 0
- Cuando calcules ocupación futura, filtra con WHERE e.fecha_hora > NOW()

REGLAS ESTRICTAS:
- SOLO SELECT (prohibido INSERT/UPDATE/DELETE/CREATE/ALTER/DROP/TRUNCATE/RENAME)
- Usa SOLO estos objetos:
  Tablas: Actividad, Artista, Actividad_Artista, Ubicacion, Evento, Asistente, Entrada, Valoracion
  Vistas: vw_eventos_enriquecidos, vw_ventas_evento, vw_artistas_por_actividad, vw_estadisticas_ciudad
- Para buscar CUALQUIER artista específico por nombre, SIEMPRE usa el patrón de JOIN:
  Evento -> Actividad -> Actividad_Artista -> Artista
- Usa LIKE '%nombre%' para búsquedas de artistas (no =)
- Si falta LIMIT, añade LIMIT 200 (excepto COUNT/agregaciones de una fila)
- Fechas en formato 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS'
- MySQL puro: usa CONCAT() para concatenación, NO '||'
- Para consultas de datos, devuelve ÚNICAMENTE la consulta SQL SIN ningún texto antes ni después. Idealmente un único bloque \`\`\`sql ... \`\`\` y nada más.

ESQUEMA RESUMIDO:
Tablas principales:
- Actividad(id, nombre, tipo ENUM('concierto','exposicion','teatro','conferencia'), subtipo)
- Artista(id, nombre, biografia)
- Actividad_Artista(actividad_id, artista_id) -- tabla de relación muchos a muchos
- Ubicacion(id, nombre, direccion, ciudad, aforo, precio_alquiler, caracteristicas)
- Evento(id, nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora, descripcion)
- Asistente(id, nombre_completo, telefono, email)
- Entrada(id, evento_id, asistente_id, precio_pagado, fecha_compra)
- Valoracion(id, evento_id, asistente_id, nota, comentario, fecha_valoracion)

Vistas (USAR ESTAS PREFERENTEMENTE):
- vw_eventos_enriquecidos: Vista completa con JOINs ya hechos
  (evento_id, evento_nombre, fecha_hora, precio_entrada, evento_descripcion, 
   actividad_id, actividad_nombre, tipo, subtipo, 
   ubicacion_id, ubicacion_nombre, direccion, ciudad, aforo, 
   entradas_vendidas, facturacion, nota_media, total_valoraciones)
- vw_artistas_por_actividad: Artistas con sus actividades
  (actividad_id, actividad_nombre, tipo, subtipo, artistas_count, artistas_nombres)
- vw_ventas_evento(evento_id, evento_nombre, ciudad, fecha_hora, entradas_vendidas, facturacion)
- vw_estadisticas_ciudad(ciudad, total_eventos, total_ubicaciones, total_entradas_vendidas, facturacion_total, nota_media_ciudad)
 - vw_coste_actividad(actividad_id, actividad_nombre, tipo, subtipo, coste_total_caches, artistas_count)
 - vw_eventos_proximos(evento_id, evento_nombre, fecha_hora, precio_entrada, actividad_nombre, tipo, ubicacion_nombre, ciudad, aforo, entradas_vendidas, porcentaje_ocupacion)

PATRÓN OBLIGATORIO para buscar CUALQUIER artista específico:
Usa SIEMPRE este JOIN para encontrar eventos de cualquier artista:
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id  
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
WHERE ar.nombre LIKE '%[nombre_artista]%'

NUNCA busques artista_id directamente en otras tablas (no existe).
La tabla Actividad_Artista es la ÚNICA que conecta artistas con actividades.

EJEMPLOS:
Usuario: ¿Cuántos eventos por ciudad?
\`\`\`sql
SELECT ciudad, COUNT(*) AS total
FROM vw_eventos_enriquecidos
GROUP BY ciudad
ORDER BY total DESC
LIMIT 200
\`\`\`

Formateos objetivo (pocas tomas canónicas):
Usuario: Ciudad con más eventos
\`\`\`sql
SELECT u.ciudad, COUNT(e.id) AS total_eventos
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
ORDER BY total_eventos DESC, u.ciudad ASC
LIMIT 1
\`\`\`

Usuario: Ciudades con solo teatro
\`\`\`sql
SELECT u.ciudad
FROM Evento e
JOIN Actividad a ON a.id = e.actividad_id
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
HAVING SUM(a.tipo <> 'teatro') = 0
\`\`\`

Usuario: Evento con más ceros en valoraciones
\`\`\`sql
SELECT e.id, e.nombre, COUNT(*) AS ceros
FROM Valoracion v
JOIN Evento e ON e.id = v.evento_id
WHERE v.nota = 0
GROUP BY e.id, e.nombre
ORDER BY ceros DESC, e.id
LIMIT 1
\`\`\`

Usuario: Evento con mayor facturación
\`\`\`sql
SELECT e.id, e.nombre, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
FROM Evento e
LEFT JOIN Entrada en ON en.evento_id = e.id
GROUP BY e.id, e.nombre
ORDER BY facturacion DESC, e.nombre
LIMIT 1
\`\`\`

Usuario: Media de valoraciones por evento
\`\`\`sql
SELECT e.id, e.nombre,
       ROUND(AVG(v.nota), 2) AS nota_media,
       COUNT(v.id) AS total_valoraciones
FROM Evento e
LEFT JOIN Valoracion v ON v.evento_id = e.id
GROUP BY e.id, e.nombre
ORDER BY nota_media DESC, total_valoraciones DESC
\`\`\`

Usuario: Porcentaje de ocupación (próximos eventos)
\`\`\`sql
SELECT e.id AS evento_id,
       e.nombre AS evento_nombre,
       e.fecha_hora,
       u.ciudad,
       u.aforo,
       COALESCE(COUNT(en.id), 0) AS entradas_vendidas,
       CASE WHEN u.aforo > 0 THEN ROUND(COALESCE(COUNT(en.id),0) / u.aforo * 100, 2) ELSE 0 END AS porcentaje_ocupacion
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
LEFT JOIN Entrada en ON en.evento_id = e.id
WHERE e.fecha_hora > NOW()
GROUP BY e.id, e.nombre, e.fecha_hora, u.ciudad, u.aforo
ORDER BY e.fecha_hora ASC
\`\`\`

Usuario: Artistas top por ingresos prorrateados
\`\`\`sql
WITH ingresos_evento AS (
  SELECT e.id AS evento_id, e.actividad_id, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
  FROM Evento e
  LEFT JOIN Entrada en ON en.evento_id = e.id
  GROUP BY e.id, e.actividad_id
),
artistas_por_actividad AS (
  SELECT actividad_id, COUNT(*) AS artistas_count
  FROM Actividad_Artista
  GROUP BY actividad_id
)
SELECT ar.id AS artista_id, ar.nombre AS artista_nombre,
       ROUND(SUM(ie.facturacion / NULLIF(apa.artistas_count, 0)), 2) AS ingresos_prorrateados
FROM ingresos_evento ie
JOIN Actividad_Artista aa ON aa.actividad_id = ie.actividad_id
JOIN artistas_por_actividad apa ON apa.actividad_id = aa.actividad_id
JOIN Artista ar ON ar.id = aa.artista_id
GROUP BY ar.id, ar.nombre
ORDER BY ingresos_prorrateados DESC, artista_nombre ASC
LIMIT 10
\`\`\`

Usuario: Eventos de Pablo Alborán / ¿Cuándo actúa Pablo Alborán?
\`\`\`sql
SELECT e.nombre as evento, e.fecha_hora, u.ciudad, u.nombre as lugar, ar.nombre as artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Pablo Alborán%'
ORDER BY e.fecha_hora DESC
LIMIT 200
\`\`\`

Usuario: Conciertos de Rosalía
\`\`\`sql
SELECT e.nombre as evento, e.fecha_hora, u.ciudad, a.tipo, ar.nombre as artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE ar.nombre LIKE '%Rosalía%' AND a.tipo = 'concierto'
ORDER BY e.fecha_hora DESC
LIMIT 200
\`\`\`

Usuario: Eventos de teatro
\`\`\`sql
SELECT *
FROM vw_eventos_enriquecidos
WHERE tipo='teatro'
ORDER BY fecha_hora DESC
LIMIT 200
\`\`\`

EJEMPLOS ADICIONALES:
Usuario: Próximos conciertos en Barcelona en noviembre de 2025
\`\`\`sql
SELECT e.nombre AS evento, e.fecha_hora, u.ciudad, u.nombre AS lugar
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE a.tipo = 'concierto'
  AND u.ciudad = 'Barcelona'
  AND e.fecha_hora BETWEEN '2025-11-01 00:00:00' AND '2025-11-30 23:59:59'
ORDER BY e.fecha_hora ASC
LIMIT 200
\`\`\`

Usuario: Entradas vendidas y facturación por evento
\`\`\`sql
SELECT *
FROM vw_ventas_evento
ORDER BY facturacion DESC, fecha_hora DESC
LIMIT 200
\`\`\`

Usuario: Eventos con nota media superior a 4
\`\`\`sql
SELECT e.id, e.nombre,
       ROUND(AVG(v.nota), 2) AS nota_media,
       COUNT(v.id) AS total_valoraciones
FROM Evento e
JOIN Valoracion v ON v.evento_id = e.id
GROUP BY e.id, e.nombre
HAVING AVG(v.nota) > 4
ORDER BY nota_media DESC, total_valoraciones DESC
\`\`\`

Usuario: Exposiciones en Sevilla con aforo mayor a 500
\`\`\`sql
SELECT evento_nombre, fecha_hora, ciudad, aforo
FROM vw_eventos_enriquecidos
WHERE tipo = 'exposicion' AND ciudad = 'Sevilla' AND aforo > 500
ORDER BY fecha_hora DESC
LIMIT 200
\`\`\`

Usuario: Actividades con más artistas participantes
\`\`\`sql
SELECT actividad_id, actividad_nombre, tipo, artistas_count
FROM vw_artistas_por_actividad
ORDER BY artistas_count DESC, actividad_nombre ASC
LIMIT 200
\`\`\`

Usuario: Número de eventos por mes en 2025
\`\`\`sql
SELECT DATE_FORMAT(e.fecha_hora, '%Y-%m') AS mes, COUNT(*) AS total_eventos
FROM Evento e
WHERE e.fecha_hora >= '2025-01-01 00:00:00' AND e.fecha_hora < '2026-01-01 00:00:00'
GROUP BY mes
ORDER BY mes ASC
\`\`\`

Usuario: Top 3 ciudades por facturación
\`\`\`sql
SELECT ciudad, facturacion_total
FROM vw_estadisticas_ciudad
ORDER BY facturacion_total DESC
LIMIT 3
\`\`\`

Usuario: Precio medio de entradas por ciudad
\`\`\`sql
SELECT u.ciudad, ROUND(AVG(e.precio_entrada), 2) AS precio_medio
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
ORDER BY precio_medio DESC, u.ciudad ASC
\`\`\`

Usuario: Eventos en el Teatro Real
\`\`\`sql
SELECT evento_nombre, fecha_hora, ciudad, ubicacion_nombre
FROM vw_eventos_enriquecidos
WHERE ubicacion_nombre LIKE '%Teatro Real%'
ORDER BY fecha_hora DESC
LIMIT 200
\`\`\`

Usuario: Valoraciones de "Noche de Jazz"
\`\`\`sql
SELECT e.nombre AS evento, v.nota, v.comentario, v.fecha_valoracion
FROM Valoracion v
JOIN Evento e ON e.id = v.evento_id
WHERE e.nombre LIKE '%Noche de Jazz%'
ORDER BY v.fecha_valoracion DESC
LIMIT 200
\`\`\`

EJEMPLO DE CONTEXTO CONVERSACIONAL:
Mensaje 1 - Usuario: "Eventos de Rosalía"
SQL: SELECT e.nombre, e.fecha_hora FROM Evento e JOIN Actividad a ON e.actividad_id = a.id JOIN Actividad_Artista aa ON a.id = aa.actividad_id JOIN Artista ar ON aa.artista_id = ar.id WHERE ar.nombre LIKE '%Rosalía%'

Mensaje 2 - Usuario: "dime que precios tienen esos conciertos"
DEBE generar: SELECT e.precio_entrada, e.nombre FROM Evento e JOIN Actividad a ON e.actividad_id = a.id JOIN Actividad_Artista aa ON a.id = aa.actividad_id JOIN Artista ar ON aa.artista_id = ar.id WHERE ar.nombre LIKE '%Rosalía%'
(¡Mantiene la condición de Rosalía!)`;

// ============ Dynamic schema injection (optional) ============
// Builds a compact schema summary from INFORMATION_SCHEMA and caches it.
// Controlled by env OPENAI_INCLUDE_SCHEMA=true and disabled in tests.
// Default ON unless explicitly disabled by OPENAI_INCLUDE_SCHEMA=false|0|off
const INCLUDE_SCHEMA = (() => {
  const v = (process.env.OPENAI_INCLUDE_SCHEMA || '').trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'off') return false;
  return true;
})();
let cachedSchemaSummary: { text: string; ts: number } | null = null;
const SCHEMA_TTL_MS = 5 * 60 * 1000; // 5 minutes

const ALLOWED_OBJECTS = [
  // Base tables
  'Actividad', 'Artista', 'Actividad_Artista', 'Ubicacion', 'Evento', 'Asistente', 'Entrada', 'Valoracion',
  // Views
  'vw_eventos_enriquecidos', 'vw_ventas_evento', 'vw_artistas_por_actividad', 'vw_estadisticas_ciudad', 'vw_coste_actividad', 'vw_eventos_proximos'
];

async function buildDynamicSchemaSummary(): Promise<string> {
  try {
    // Use cache if fresh
    const now = Date.now();
    if (cachedSchemaSummary && (now - cachedSchemaSummary.ts) < SCHEMA_TTL_MS) {
      return cachedSchemaSummary.text;
    }

    // Compose IN list safely (constants only)
    const inList = ALLOWED_OBJECTS.map(n => `'${n}'`).join(',');
    const sql = `SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (${inList})
ORDER BY TABLE_NAME, ORDINAL_POSITION`;

    const rows = await executeQuery(sql) as Array<{ TABLE_NAME: string; COLUMN_NAME: string }>;
    const map = new Map<string, string[]>();
    for (const r of rows) {
      const t = r.TABLE_NAME;
      const c = r.COLUMN_NAME;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(c);
    }

    // Build compact lines, separate Tablas/Vistas
    const linesTables: string[] = [];
    const linesViews: string[] = [];
    for (const name of ALLOWED_OBJECTS) {
      const cols = map.get(name) || [];
      const colsStr = cols.join(', ');
      const line = `- ${name}(${colsStr})`;
      if (name.startsWith('vw_')) linesViews.push(line); else linesTables.push(line);
    }

    const text = '\n\nESQUEMA ACTUAL (DINÁMICO - resumido):\n' +
      (linesTables.length ? ('Tablas:\n' + linesTables.join('\n') + '\n') : '') +
      (linesViews.length ? ('Vistas:\n' + linesViews.join('\n') + '\n') : '');

    cachedSchemaSummary = { text, ts: now };
    return text;
  } catch (err) {
    // On any failure, return empty to avoid breaking prompt
    return '';
  }
}


export interface OpenAIResponse {
  sql: string;
  explanation: string;
  naturalResponse?: string;
  suggestions?: string[];
}

// Guía de estilo para respuestas naturales
const STYLE_GUIDE = `Eres un analista de datos de eventos culturales de ArteVida.
REGLAS OBLIGATORIAS:
- Responde SOLO con datos concretos de la consulta SQL ejecutada
- NO menciones plataformas externas, páginas oficiales ni venta de boletos
- NO te despidas ("¡Hasta luego!", "Espero que...", "¡Saludos!")
- Máximo 120-160 palabras, directo al grano
- Si NO HAY DATOS: "No se encontraron [eventos/artistas/etc.] con esos criterios en nuestra base de datos"
- Si HAY DATOS: presenta los resultados específicos encontrados
- Si hay lista corta (≤10 filas) → menciona los elementos principales
- Si hay lista larga → resume el patrón con 1-2 ejemplos específicos
- Termina con una sugerencia práctica sobre los datos (Prueba buscar por ciudad/fecha/etc.)
- USA SOLO información de la base de datos consultada`;

// Función para sanitizar respuestas
function sanitizeResponse(text: string): string {
  // Eliminar frases genéricas y despedidas
  const genericPhrases = /(hasta luego|espero que te sirva|quedo a tu disposición|saludos|espero haberte ayudado|que tengas|disfruta|visitar plataformas|página oficial|venta de boletos|plataformas de venta|consultar.*oficial)/gi;
  
  return text
    .replace(genericPhrases, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // Eliminar emojis
    .replace(/\s{2,}/g, " ") // Múltiples espacios
    .replace(/\.$\s*$/, ".") // Limpiar puntos finales
    .replace(/^[.,\s]+|[.,\s]+$/g, "") // Limpiar inicio/final
    .trim();
}

// Extraer solo el SQL desde una respuesta potencialmente mezclada con texto
function extractSqlOnly(content: string): string {
  if (!content) return '';
  const trimmed = content.trim();
  // Si viene en bloque ```sql ... ```
  const blockMatch = trimmed.match(/```sql\s*([\s\S]*?)```/i);
  if (blockMatch && blockMatch[1]) {
    return blockMatch[1].trim();
  }
  // Si hay varios bloques, tomar el primero que parezca SELECT
  const anyBlock = trimmed.match(/```[a-z]*\s*([\s\S]*?)```/i);
  if (anyBlock && anyBlock[1] && /\bselect\b/i.test(anyBlock[1])) {
    return anyBlock[1].trim();
  }
  // Si no hay bloques, intentar extraer desde la primera aparición de SELECT hasta el final del statement (antes de explicaciones)
  const selectIdx = trimmed.toLowerCase().indexOf('select ');
  if (selectIdx >= 0) {
    let sql = trimmed.slice(selectIdx).trim();
    // Cortar explicaciones comunes añadidas después
    const cutTokens = ['\n\n', '\nSi ', '\nEn caso', '\nNota:', '\nNOTA:', '\n--'];
    for (const token of cutTokens) {
      const i = sql.indexOf(token);
      if (i > 20) { // evitar cortar demasiado pronto
        sql = sql.slice(0, i).trim();
        break;
      }
    }
    return sql;
  }
  return trimmed; // último recurso
}

// Función para contar filas legible
function humanRows(count: number): string {
  return count === 1 ? "1 fila" : `${count} filas`;
}

// Manejar conversación social básica (sin frases de "estoy bien")
function handleSmallTalk(_question: string): OpenAIResponse {
  return {
    sql: "",
    explanation: "Saludo básico - sin SQL",
    naturalResponse: "¡Hola! Soy tu asistente de ArteVida. Dime qué quieres consultar (por ejemplo: precios de Rosalía, eventos en Madrid 2024, top artistas)",
    suggestions: ["Precios de conciertos de Rosalía", "Eventos por ciudad 2024", "Top artistas más populares", "Ventas del mes"]
  };
}

// Fallback SQL generation when OpenAI is not available
function generateFallbackSQL(question: string): OpenAIResponse {
  const questionLower = question.toLowerCase();
  const hasOcupacion = /(porcentaje|ocupaci[oó]n)/.test(questionLower);
  
  // 1) Coste de cachés por actividad (específico)
  if (/(coste|costo|gasto)s?\s+(de\s+)?cach(e|é)s|caches?\s+por\s+actividad/.test(questionLower)) {
    return {
      sql: "SELECT * FROM vw_coste_actividad ORDER BY coste_total_caches DESC, actividad_nombre ASC LIMIT 200",
      explanation: `Vista de costes de cachés por actividad para: "${question}"`
    };
  }

  // 7) Evento con más ceros en valoración (específico, antes que enriquecidos)
  if (/m[aá]s\s+ceros?|nota\s+0|peor(es)?\s+valoraciones?\s+por\s+evento|ceros\s+en\s+valoraciones/.test(questionLower)) {
    return {
      sql: `SELECT e.id, e.nombre, COUNT(*) AS ceros
FROM Valoracion v
JOIN Evento e ON e.id = v.evento_id
WHERE v.nota = 0
GROUP BY e.id, e.nombre
ORDER BY ceros DESC, e.id
LIMIT 1`,
      explanation: `Evento con más ceros en valoraciones para: "${question}"`
    };
  }

  // 6) Ciudades con solo teatro (específico)
  if (/ciudades?\s+con\s+solo\s+teatro|solo\s+teatro\s+por\s+ciudad/.test(questionLower)) {
    return {
      sql: `SELECT u.ciudad
FROM Evento e
JOIN Actividad a ON a.id = e.actividad_id
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
HAVING SUM(a.tipo <> 'teatro') = 0`,
      explanation: `Ciudades con solo teatro para: "${question}"`
    };
  }

  // 12) Porcentaje de ocupación (próximos) - colocar antes que 'eventos próximos'
  if (/(porcentaje|ocupaci[oó]n).*(pr[oó]ximos?|siguientes?|futuros?)/.test(questionLower)) {
    return {
      sql: `SELECT 
  e.id AS evento_id,
  e.nombre AS evento_nombre,
  e.fecha_hora,
  u.ciudad,
  u.aforo,
  COALESCE(COUNT(en.id), 0) AS entradas_vendidas,
  CASE WHEN u.aforo > 0 THEN ROUND(COALESCE(COUNT(en.id),0) / u.aforo * 100, 2) ELSE 0 END AS porcentaje_ocupacion
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
LEFT JOIN Entrada en ON en.evento_id = e.id
WHERE e.fecha_hora > NOW()
GROUP BY e.id, e.nombre, e.fecha_hora, u.ciudad, u.aforo
ORDER BY e.fecha_hora ASC`,
      explanation: `Porcentaje de ocupación para próximos eventos para: "${question}"`
    };
  }

  // 4) Eventos próximos (específico) - detectar ambas órdenes de palabras, evitando ocupación
  if (!hasOcupacion && (/(eventos?|conciertos?).*(pr[oó]xim|siguiente|futuros|venider)/.test(questionLower)
      || /(pr[oó]xim|siguiente|futuros|venider).*(eventos?|conciertos?)/.test(questionLower))) {
    return {
      sql: "SELECT * FROM vw_eventos_proximos ORDER BY fecha_hora ASC LIMIT 200",
      explanation: `Eventos próximos para: "${question}"`
    };
  }

  // 11) Margen estimado por evento (específico)
  if (/margen\s+estimado|beneficio\s+estimado|ingresos?\s*-\s*(alquiler|costes?|cach(e|é)s)/.test(questionLower)) {
    return {
      sql: `SELECT 
  e.id AS evento_id,
  e.nombre AS evento_nombre,
  u.ciudad,
  COALESCE(ing.facturacion, 0) AS ingresos,
  COALESCE(u.precio_alquiler, 0) AS alquiler,
  COALESCE(c.coste_total_caches, 0) AS caches,
  COALESCE(ing.facturacion, 0) - (COALESCE(u.precio_alquiler, 0) + COALESCE(c.coste_total_caches, 0)) AS margen_estimado
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
JOIN Actividad a ON a.id = e.actividad_id
LEFT JOIN (
  SELECT evento_id, SUM(precio_pagado) AS facturacion
  FROM Entrada
  GROUP BY evento_id
) ing ON ing.evento_id = e.id
LEFT JOIN vw_coste_actividad c ON c.actividad_id = a.id
ORDER BY margen_estimado DESC`,
      explanation: `Margen estimado por evento para: "${question}"`
    };
  }

  // 13) Artistas top por ingresos (prorrateo) - antes que top ingresos genérico
  if (/artistas?.*(top|ranking|m[aá]s\s+ingresos|ingresos\s+prorrateados?)/.test(questionLower)) {
    const topMatch = questionLower.match(/top\s+(\d{1,2})/);
    const n = topMatch ? Math.max(1, Math.min(parseInt(topMatch[1], 10), 50)) : 10;
    return {
      sql: `WITH ingresos_evento AS (
  SELECT e.id AS evento_id, e.actividad_id, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
  FROM Evento e
  LEFT JOIN Entrada en ON en.evento_id = e.id
  GROUP BY e.id, e.actividad_id
),
artistas_por_actividad AS (
  SELECT actividad_id, COUNT(*) AS artistas_count
  FROM Actividad_Artista
  GROUP BY actividad_id
)
SELECT ar.id AS artista_id, ar.nombre AS artista_nombre,
       ROUND(SUM(ie.facturacion / NULLIF(apa.artistas_count, 0)), 2) AS ingresos_prorrateados
FROM ingresos_evento ie
JOIN Actividad_Artista aa ON aa.actividad_id = ie.actividad_id
JOIN artistas_por_actividad apa ON apa.actividad_id = aa.actividad_id
JOIN Artista ar ON ar.id = aa.artista_id
GROUP BY ar.id, ar.nombre
ORDER BY ingresos_prorrateados DESC, artista_nombre ASC
LIMIT ${n}`,
      explanation: `Artistas top por ingresos prorrateados para: "${question}"`
    };
  }

  // 2) Eventos enriquecidos (genérico)
  if (/eventos?.*(enriquecid|ventas|valorac|detall)/.test(questionLower)) {
    return {
      sql: "SELECT * FROM vw_eventos_enriquecidos ORDER BY fecha_hora DESC LIMIT 200",
      explanation: `Eventos con datos enriquecidos para: "${question}"`
    };
  }

  // 3) Estadísticas por ciudad (genérico)
  if (/(estad[ií]sticas|resumen|stats?).*ciudad/.test(questionLower)) {
    return {
      sql: "SELECT * FROM vw_estadisticas_ciudad ORDER BY facturacion_total DESC LIMIT 200",
      explanation: `Estadísticas por ciudad para: "${question}"`
    };
  }

  // 4) Eventos próximos (genérico), evitando ocupación que ya se manejó
  if (!hasOcupacion && /(eventos?|conciertos?).*(pr[oó]xim|siguiente|futuros|venider)/.test(questionLower)) {
    return {
      sql: "SELECT * FROM vw_eventos_proximos ORDER BY fecha_hora ASC LIMIT 200",
      explanation: `Eventos próximos para: "${question}"`
    };
  }

  // 5) Ciudad con más eventos
  if (/ciudad(es)?\s+con\s+m[aá]s\s+eventos?|ciudad\s+con\s+m[aá]s\s+eventos?/.test(questionLower)) {
    return {
      sql: `SELECT u.ciudad, COUNT(e.id) AS total_eventos
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
ORDER BY total_eventos DESC, u.ciudad ASC
LIMIT 1`,
      explanation: `Ciudad con más eventos para: "${question}"`
    };
  }

  // 6) Ciudades con solo teatro
  if (/ciudades?\s+con\s+solo\s+teatro|solo\s+teatro\s+por\s+ciudad/.test(questionLower)) {
    return {
      sql: `SELECT u.ciudad
FROM Evento e
JOIN Actividad a ON a.id = e.actividad_id
JOIN Ubicacion u ON u.id = e.ubicacion_id
GROUP BY u.ciudad
HAVING SUM(a.tipo <> 'teatro') = 0`,
      explanation: `Ciudades con solo teatro para: "${question}"`
    };
  }

  // 7) Evento con más ceros en valoración
  if (/m[aá]s\s+ceros?|nota\s+0|peor(es)?\s+valoraciones?\s+por\s+evento/.test(questionLower)) {
    return {
      sql: `SELECT e.id, e.nombre, COUNT(*) AS ceros
FROM Valoracion v
JOIN Evento e ON e.id = v.evento_id
WHERE v.nota = 0
GROUP BY e.id, e.nombre
ORDER BY ceros DESC, e.id
LIMIT 1`,
      explanation: `Evento con más ceros en valoraciones para: "${question}"`
    };
  }

  // 8) Evento con mayor facturación
  if (/evento\s+con\s+m[aá]s\s+facturaci[oó]n|mayor\s+facturaci[oó]n/.test(questionLower)) {
    return {
      sql: `SELECT e.id, e.nombre, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
FROM Evento e
LEFT JOIN Entrada en ON en.evento_id = e.id
GROUP BY e.id, e.nombre
ORDER BY facturacion DESC, e.nombre
LIMIT 1`,
      explanation: `Evento con mayor facturación para: "${question}"`
    };
  }

  // 9) Top facturación (Top N eventos) - después de artistas prorrateados
  if (/(top|ranking).*(facturaci[oó]n|ingresos)/.test(questionLower)) {
    const topMatch = questionLower.match(/top\s+(\d{1,2})/);
    const n = topMatch ? Math.max(1, Math.min(parseInt(topMatch[1], 10), 50)) : 5;
    return {
      sql: `SELECT e.id, e.nombre, u.ciudad, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
LEFT JOIN Entrada en ON en.evento_id = e.id
GROUP BY e.id, e.nombre, u.ciudad
ORDER BY facturacion DESC
LIMIT ${n}`,
      explanation: `Top ${n} eventos por facturación para: "${question}"`
    };
  }

  // 10) Media de valoraciones por evento
  if (/(media|promedio|avg).*(valoraciones?|notas?).*evento/.test(questionLower)) {
    return {
      sql: `SELECT e.id, e.nombre, ROUND(AVG(v.nota), 2) AS nota_media, COUNT(v.id) AS total_valoraciones
FROM Evento e
LEFT JOIN Valoracion v ON v.evento_id = e.id
GROUP BY e.id, e.nombre
ORDER BY nota_media DESC, total_valoraciones DESC`,
      explanation: `Media de valoraciones por evento para: "${question}"`
    };
  }

  // 11) Margen estimado por evento
  if (/margen\s+estimado|beneficio\s+estimado|ingresos?\s*-\s*(alquiler|costes?|cach(e|é)s)/.test(questionLower)) {
    return {
      sql: `SELECT 
  e.id AS evento_id,
  e.nombre AS evento_nombre,
  u.ciudad,
  COALESCE(ing.facturacion, 0) AS ingresos,
  COALESCE(u.precio_alquiler, 0) AS alquiler,
  COALESCE(c.coste_total_caches, 0) AS caches,
  COALESCE(ing.facturacion, 0) - (COALESCE(u.precio_alquiler, 0) + COALESCE(c.coste_total_caches, 0)) AS margen_estimado
FROM Evento e
JOIN Ubicacion u ON u.id = e.ubicacion_id
JOIN Actividad a ON a.id = e.actividad_id
LEFT JOIN (
  SELECT evento_id, SUM(precio_pagado) AS facturacion
  FROM Entrada
  GROUP BY evento_id
) ing ON ing.evento_id = e.id
LEFT JOIN vw_coste_actividad c ON c.actividad_id = a.id
ORDER BY margen_estimado DESC`,
      explanation: `Margen estimado por evento para: "${question}"`
    };
  }

  // (ya manejado arriba) 12) Porcentaje de ocupación (próximos)

  // 13) Artistas top por ingresos (prorrateo)
  if (/artistas?.*(top|ranking|m[aá]s\s+ingresos|ingresos\s+prorrateados?)/.test(questionLower)) {
    const topMatch = questionLower.match(/top\s+(\d{1,2})/);
    const n = topMatch ? Math.max(1, Math.min(parseInt(topMatch[1], 10), 50)) : 10;
    return {
      sql: `WITH ingresos_evento AS (
  SELECT e.id AS evento_id, e.actividad_id, COALESCE(SUM(en.precio_pagado), 0) AS facturacion
  FROM Evento e
  LEFT JOIN Entrada en ON en.evento_id = e.id
  GROUP BY e.id, e.actividad_id
),
artistas_por_actividad AS (
  SELECT actividad_id, COUNT(*) AS artistas_count
  FROM Actividad_Artista
  GROUP BY actividad_id
)
SELECT ar.id AS artista_id, ar.nombre AS artista_nombre,
       ROUND(SUM(ie.facturacion / NULLIF(apa.artistas_count, 0)), 2) AS ingresos_prorrateados
FROM ingresos_evento ie
JOIN Actividad_Artista aa ON aa.actividad_id = ie.actividad_id
JOIN artistas_por_actividad apa ON apa.actividad_id = aa.actividad_id
JOIN Artista ar ON ar.id = aa.artista_id
GROUP BY ar.id, ar.nombre
ORDER BY ingresos_prorrateados DESC, artista_nombre ASC
LIMIT ${n}`,
      explanation: `Artistas top por ingresos prorrateados para: "${question}"`
    };
  }
  // Consultas sobre contenido de la base de datos
  if (questionLower.includes('datos') || questionLower.includes('contenido') || 
      questionLower.includes('qué tienes') || questionLower.includes('que tienes') ||
      questionLower.includes('qué hay') || questionLower.includes('que hay')) {
    return {
      sql: "SELECT 'Eventos' as tipo, COUNT(*) as cantidad FROM Evento UNION ALL SELECT 'Artistas' as tipo, COUNT(*) as cantidad FROM Artista UNION ALL SELECT 'Entradas vendidas' as tipo, COUNT(*) as cantidad FROM Entrada UNION ALL SELECT 'Valoraciones' as tipo, COUNT(*) as cantidad FROM Valoracion",
      explanation: `Consulta de resumen de datos en la base de datos generada para: "${question}"`
    };
  }
  
  // Simple keyword matching for basic queries
  if (questionLower.includes('cuántos eventos') || questionLower.includes('cantidad') || questionLower.includes('count')) {
    if (questionLower.includes('ciudad')) {
      return {
        sql: "SELECT ciudad, COUNT(*) as total_eventos FROM vw_eventos_enriquecidos GROUP BY ciudad ORDER BY total_eventos DESC LIMIT 200",
        explanation: `Consulta de conteo de eventos por ciudad generada para: "${question}"`
      };
    }
    return {
      sql: "SELECT COUNT(*) as total_eventos FROM Evento",
      explanation: `Consulta de conteo total de eventos generada para: "${question}"`
    };
  }
  
  if (questionLower.includes('artistas') || questionLower.includes('artista')) {
    if (questionLower.includes('top') || questionLower.includes('mejores') || questionLower.includes('populares')) {
      return {
        sql: "SELECT * FROM vw_artistas_por_actividad ORDER BY artistas_count DESC LIMIT 200",
        explanation: `Consulta de artistas populares generada para: "${question}"`
      };
    }
    return {
      sql: "SELECT * FROM Artista LIMIT 200",
      explanation: `Consulta de artistas generada para: "${question}"`
    };
  }
  
  // Literatura del Siglo de Oro / consultas similares
  if (/(siglo\s+de\s+oro|literatura\s+del\s+siglo\s+de\s+oro|literaturas?)/i.test(question)) {
    return {
      sql: `SELECT e.nombre AS evento, e.precio_entrada, e.fecha_hora, u.ciudad, a.nombre AS actividad
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
WHERE a.nombre LIKE '%Siglo de Oro%' OR a.subtipo LIKE '%Siglo de Oro%'
ORDER BY e.fecha_hora DESC
LIMIT 200`,
      explanation: `Consulta de eventos relacionados con la literatura del Siglo de Oro generada para: "${question}"`
    };
  }
  
  // Consultas generales sobre artistas específicos - se delega a OpenAI
  if (questionLower.includes('actúa') || questionLower.includes('actua') || 
      questionLower.includes('concierto de') || questionLower.includes('eventos de')) {
    return {
      sql: `SELECT e.nombre as evento, e.fecha_hora, u.ciudad, u.nombre as lugar, ar.nombre as artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
ORDER BY e.fecha_hora DESC
LIMIT 200`,
      explanation: `Consulta general de eventos con artistas generada para: "${question}" - Para artistas específicos, usar OpenAI para mejor precisión`
    };
  }
  
  if (questionLower.includes('teatro')) {
    return {
      sql: "SELECT * FROM vw_eventos_enriquecidos WHERE tipo = 'teatro' ORDER BY fecha_hora DESC LIMIT 200",
      explanation: `Consulta de eventos de teatro generada para: "${question}"`
    };
  }
  
  if (questionLower.includes('concierto') || questionLower.includes('música') || questionLower.includes('musica')) {
    return {
      sql: "SELECT * FROM vw_eventos_enriquecidos WHERE tipo = 'concierto' ORDER BY fecha_hora DESC LIMIT 200",
      explanation: `Consulta de conciertos generada para: "${question}"`
    };
  }
  
  if (questionLower.includes('madrid')) {
    return {
      sql: "SELECT * FROM vw_eventos_enriquecidos WHERE ciudad = 'Madrid' ORDER BY fecha_hora DESC LIMIT 200",
      explanation: `Consulta de eventos en Madrid generada para: "${question}"`
    };
  }
  
  if (questionLower.includes('venues') || questionLower.includes('locales') || questionLower.includes('ubicaciones')) {
    return {
      sql: "SELECT * FROM Ubicacion ORDER BY aforo DESC LIMIT 200",
      explanation: `Consulta de ubicaciones generada para: "${question}"`
    };
  }
  
  // Default fallback
  return {
    sql: "SELECT * FROM vw_eventos_enriquecidos ORDER BY fecha_hora DESC LIMIT 200",
    explanation: `No pude interpretar específicamente la pregunta. Muestro una consulta general de eventos para: "${question}"`
  };
}

// Fallback natural response generation when OpenAI is not available
function generateFallbackNaturalResponse(question: string, sqlResults: any[]): string {
  const resultCount = sqlResults.length;
  
  if (resultCount === 0) {
    return `No se encontraron resultados para "${question}". Intenta reformular tu pregunta con términos más generales.`;
  }
  
  if (resultCount === 1) {
    return `Encontré exactamente 1 resultado para "${question}". Los detalles están disponibles en la tabla de resultados.`;
  }
  
  if (resultCount <= 5) {
    return `He encontrado ${resultCount} resultados para "${question}". Puedes ver los detalles completos expandiendo la sección de resultados.`;
  }
  
  if (resultCount <= 20) {
    return `Se encontraron ${resultCount} resultados para tu consulta "${question}". La información está organizada en la tabla de resultados para tu revisión.`;
  }
  
  return `Tu consulta "${question}" devolvió ${resultCount} resultados. Para obtener respuestas más detalladas y personalizadas, configura una API key de OpenAI en el archivo .env.`;
}

export async function generateSQLWithOpenAI(question: string, conversationContext?: Array<{question: string, sql?: string, summary: string}>): Promise<OpenAIResponse> {
  const startTime = Date.now();
  
  try {
    logger.info({ question }, 'Generando SQL con OpenAI');
    
    // Detectar saludos y mensajes sociales para no generar SQL
    const cleanQuestion = question.trim().toLowerCase();
    const isGreeting = /^(hola|buenas|hello|hi|qué tal|que tal|como estas|cómo estás)$/i.test(cleanQuestion);
    const hasDataKeywords = /\b(eventos?|artistas?|ventas?|conciertos?|teatro|exposic|valorac|datos?|cuantos?|top|precio|ciudad|fechas?|lugares?)\b/i.test(cleanQuestion);
    if (isGreeting && !hasDataKeywords) {
      logger.info('Mensaje social detectado; respuesta neutral sin SQL');
      return handleSmallTalk(question);
    }
    
    // Para todo lo demás (incluido "¿qué tal?", "¿cómo estás?", etc.), dejar que GPT responda
    
    // Check if OpenAI is available
    if (!openai) {
      logger.warn('OpenAI no disponible, usando sistema fallback');
      return generateFallbackSQL(question);
    }
    
    // Construir el contexto de conversación si existe
    let contextPrompt = '';
    if (conversationContext && conversationContext.length > 0) {
      logger.info({ conversationContext }, 'Contexto de conversación recibido');
      
      contextPrompt = '\n\nCONTEXTO DE CONVERSACIÓN PREVIA (últimos mensajes):\n';
      conversationContext.forEach((msg, index) => {
        contextPrompt += `${index + 1}. Usuario preguntó: "${msg.question}"\n`;
        if (msg.sql) contextPrompt += `   SQL ejecutado: ${msg.sql}\n`;
        contextPrompt += `   Resultado: ${msg.summary}\n\n`;
      });
      
      contextPrompt += 'REGLAS CRÍTICAS PARA REFERENCIAS CONTEXTUALES:\n';
      contextPrompt += '- IMPORTANTE: Si el usuario usa palabras como "esos", "estos", "de ahí", "precios", "fechas" SIN mencionar artista específico, está refiriéndose al contexto anterior\n';
      contextPrompt += '- COPIA las condiciones WHERE exactas del SQL anterior cuando sea una pregunta sobre los mismos resultados\n';
      contextPrompt += '- Ejemplo: Si antes buscaste "WHERE ar.nombre LIKE \'%Rosalía%\'" y ahora piden "precios de esos", usa la MISMA condición\n';
      contextPrompt += '- NO generes consultas genéricas cuando hay contexto específico disponible\n';
      contextPrompt += '- MANTÉN la consistencia con los filtros de la consulta anterior\n\n';
    } else {
      logger.info('No hay contexto de conversación disponible');
    }
    // Optional: append dynamic schema summary if enabled (and not in tests)
    let dynamicSchema = '';
    if (!IS_TEST && INCLUDE_SCHEMA) {
      dynamicSchema = await buildDynamicSchemaSummary();
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + dynamicSchema + contextPrompt
        },
        {
          role: 'user',
          content: `Pregunta: ${question}`
        }
      ],
      max_tokens: 300,
      temperature: 0
    });

  const raw = completion.choices[0]?.message?.content ?? '';
  const sql = extractSqlOnly(raw);
    
    const executionTime = Date.now() - startTime;
    
    logger.info({ 
      question, 
      sql, 
      executionTime,
      tokensUsed: completion.usage?.total_tokens 
    }, 'SQL generado por OpenAI');

    return {
      sql,
      explanation: `Consulta SQL generada para: "${question}"`
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error({ 
      question, 
      error: error instanceof Error ? error.message : 'Error desconocido',
      executionTime 
    }, 'Error al generar SQL con OpenAI');
    
    // Fallback a consulta básica en caso de error
    const fallbackSql = "SELECT * FROM vw_eventos_enriquecidos ORDER BY fecha_hora DESC LIMIT 20";
    
    return {
      sql: fallbackSql,
      explanation: `Error con OpenAI, usando consulta por defecto. Error: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

export async function generateNaturalResponse(question: string, sqlResults: any[]): Promise<string> {
  try {
    logger.info({ question, resultCount: sqlResults.length }, 'Generando respuesta natural con OpenAI');
    
    // Check if OpenAI is available
    if (!openai) {
      logger.warn('OpenAI no disponible, usando respuesta natural fallback');
      return sanitizeResponse(generateFallbackNaturalResponse(question, sqlResults));
    }
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: STYLE_GUIDE
        },
        {
          role: 'user',
          content: `Pregunta: "${question}"\nFilas: ${sqlResults.length}\n${sqlResults.length > 20 ? 'Muestra (primeros 20):' : 'Datos:'}\n${JSON.stringify(sqlResults.slice(0, 20), null, 2)}`
        }
      ],
      max_tokens: 250,
      temperature: 0.2
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || 'No se pudo generar una respuesta natural.';
    const cleanResponse = sanitizeResponse(rawResponse);
    
    logger.info({ 
      question, 
      responseLength: cleanResponse.length,
      tokensUsed: completion.usage?.total_tokens 
    }, 'Respuesta natural generada y sanitizada');

    return cleanResponse;
    
  } catch (error) {
    logger.error({ 
      question, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 'Error al generar respuesta natural');
    
    // Fallback a respuesta básica
    if (sqlResults.length === 0) {
      return sanitizeResponse(`No se encontraron resultados para "${question}". Intenta reformular tu pregunta o buscar términos más generales.`);
    }
    
    return sanitizeResponse(`Se encontraron ${humanRows(sqlResults.length)} para "${question}". Los datos están disponibles en la tabla.`);
  }
}
import { executeQuery } from '../db.js';

// Heurísticas reutilizadas desde ask.route.ts (copiadas para evitar acoplar)

export function isDescriptionIntent(question: string): boolean {
  const q = (question || '').toLowerCase();
  return /(de\s*qu[eé]\s*va|de\s*qu[eé]\s*trata|descripci[oó]n|descripcion|informaci[oó]n\s+(del|de)\s+evento|de\s+qu[eé]\s+es\s+el\s+evento)/i.test(q);
}

export function buildDescriptionSqlFromPrevious(prevSql: string): string | null {
  if (!prevSql) return null;
  const idx = prevSql.toLowerCase().indexOf(' from ');
  if (idx < 0) return null;
  const tail = prevSql.slice(idx);
  const isView = /from\s+vw_eventos_enriquecidos/i.test(tail);
  const select = isView
    ? 'SELECT evento_nombre, evento_descripcion, fecha_hora, ciudad'
    : 'SELECT e.nombre AS evento, e.descripcion, e.fecha_hora, u.ciudad';
  return `${select}\n${tail}`;
}

export type EventAttribute = 'precio' | 'fecha' | 'lugar' | 'ciudad';

export function detectAttributeIntent(question: string): EventAttribute | null {
  const q = (question || '').toLowerCase();
  if (/\bprecio|cu[aá]nto\s+vale|cu[aá]nto\s+cuesta/.test(q)) return 'precio';
  if (/\bfecha|cu[aá]ndo\s+es|cu[aá]ndo\s+se\s+celebra/.test(q)) return 'fecha';
  if (/\blugar|d[oó]nde\s+es|en\s+qu[eé]\s+sitio/.test(q)) return 'lugar';
  if (/\bciudad|d[oó]nde\s+se\s+celebra|en\s+qu[eé]\s+ciudad/.test(q)) return 'ciudad';
  return null;
}

export function buildAttributeSqlFromPrevious(prevSql: string, attr: EventAttribute): string | null {
  if (!prevSql) return null;
  const idx = prevSql.toLowerCase().indexOf(' from ');
  if (idx < 0) return null;
  const tail = prevSql.slice(idx);
  const isView = /from\s+vw_eventos_enriquecidos/i.test(tail);
  let select = '';
  switch (attr) {
    case 'precio':
      select = isView ? 'SELECT evento_nombre, precio_entrada' : 'SELECT e.nombre AS evento, e.precio_entrada';
      break;
    case 'fecha':
      select = isView ? 'SELECT evento_nombre, fecha_hora' : 'SELECT e.nombre AS evento, e.fecha_hora';
      break;
    case 'lugar':
      select = isView ? 'SELECT evento_nombre, ubicacion_nombre AS lugar, ciudad' : 'SELECT e.nombre AS evento, u.nombre AS lugar, u.ciudad';
      break;
    case 'ciudad':
      select = isView ? 'SELECT evento_nombre, ciudad' : 'SELECT e.nombre AS evento, u.ciudad';
      break;
  }
  return `${select}\n${tail}`;
}

export function extractEventPhrase(question: string): string | null {
  if (!question) return null;
  const q = question.trim();
  const quoted = q.match(/["'“”‘’](.+?)["'“”‘’]/);
  if (quoted && quoted[1]) return quoted[1].trim();
  const afterEvento = q.match(/evento\s+(.+)/i);
  if (afterEvento && afterEvento[1]) return afterEvento[1].replace(/que\s+precio.*$/i, '').trim();
  const afterDe = q.match(/(?:del\s+evento|del|de\s+evento|de)\s+([^?]+)/i);
  if (afterDe && afterDe[1]) return afterDe[1].replace(/que\s+precio.*$/i, '').trim();
  return q;
}

export async function resolveEventByName(candidate: string): Promise<{ evento_id: number, evento_nombre: string } | null> {
  try {
    const term = (candidate || '').trim();
    if (!term) return null;
    const tokens = term
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(t => t && t.length >= 2);
    if (tokens.length === 0) return null;
    const esc = (s: string) => s.replace(/'/g, "''");
    const whereTokens = tokens.map(t => `LOWER(e.nombre) LIKE '%${esc(t)}%'`).join(' AND ');
    const sql = `SELECT e.id AS evento_id, e.nombre AS evento_nombre\nFROM Evento e\nWHERE ${whereTokens}\nORDER BY e.fecha_hora DESC\nLIMIT 1`;
    const rows: Array<{ evento_id: number, evento_nombre: string }> = await executeQuery(sql);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function resolveArtistByName(question: string): Promise<{ artista_id: number, artista_nombre: string } | null> {
  const q = (question || '').toLowerCase();
  const quoted = q.match(/["'“”‘’](.+?)["'“”‘’]/);
  const base = quoted?.[1] || q.replace(/.*?(de|del)\s+/, '').trim();
  const tokens = base
    .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t && t.length >= 3);
  if (tokens.length === 0) return null;
  const esc = (s: string) => s.replace(/'/g, "''");
  const where = tokens.map(t => `LOWER(nombre) LIKE '%${esc(t)}%'`).join(' AND ');
  const sql = `SELECT id AS artista_id, nombre AS artista_nombre\nFROM Artista\nWHERE ${where}\nORDER BY id DESC\nLIMIT 1`;
  try {
    const rows: Array<{ artista_id: number, artista_nombre: string }> = await executeQuery(sql);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export function buildArtistEventsSql(artistName: string, question: string): string {
  const q = (question || '').toLowerCase();
  const esc = (s: string) => s.replace(/'/g, "''");
  const likeArtist = esc(artistName);
  const isConcertsOnly = /\bconciert/.test(q);
  const cityMatch = q.match(/en\s+([a-záéíóúüñ\s]{3,})$/i);
  const city = cityMatch ? cityMatch[1].trim() : '';
  const cityFilter = city ? ` AND LOWER(u.ciudad) LIKE '%${esc(city.toLowerCase())}%'` : '';
  const typeFilter = isConcertsOnly ? ` AND a.tipo = 'concierto'` : '';
  return `SELECT e.nombre AS evento, e.fecha_hora, u.ciudad, u.nombre AS lugar, e.precio_entrada, ar.nombre AS artista
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
JOIN Actividad_Artista aa ON a.id = aa.actividad_id
JOIN Artista ar ON aa.artista_id = ar.id
WHERE LOWER(ar.nombre) LIKE '%${likeArtist.toLowerCase()}%'${typeFilter}${cityFilter}
ORDER BY e.fecha_hora DESC
LIMIT 200`;
}

export function buildHeuristicSql(question: string): string | null {
  const q = (question || '').toLowerCase();
  // Evitar heurística cuando es mejor delegar a LLM/fallback:
  // - consultas sobre artistas/top
  // - conteos/cantidad
  // - preguntas genéricas de "información general"
  if (/(artistas?|\btop\b|cu[aá]nt|\bcount\b|cantidad)/i.test(q)) {
    return null;
  }
  if (/informaci[oó]n\s+general/i.test(q)) {
    return null;
  }
  const exclMatch = q.match(/(?:aparte\s+de|excepto|menos|sin|que\s+no)\s+([a-záéíóúüñ\s]+?)(?:[,.!?]|$)/i);
  const excludeArtist = exclMatch ? exclMatch[1].trim() : '';
  let tipoFilter: string | null = null;
  if (/\bconciert/.test(q)) tipoFilter = 'concierto';
  else if (/\bteatr/.test(q)) tipoFilter = 'teatro';
  else if (/exposici[oó]n|exposic/.test(q)) tipoFilter = 'exposicion';
  else if (/conferenc/.test(q)) tipoFilter = 'conferencia';
  const stop = new Set(['dime','me','el','la','los','las','de','del','para','por','y','en','un','una','que','cual','cuál','cuanto','cuánto','precio','precios','tiene','hay','informacion','información','sobre','aparte','excepto','menos','sin','que','no','parte','general']);
  const tokens = q
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t && t.length >= 3 && !stop.has(t));
  if (tokens.length === 0) return null;
  const esc = (s: string) => s.replace(/'/g, "''");
  const likeGroupView = (t: string) => `(
    LOWER(actividad_nombre) LIKE '%${esc(t)}%' OR
    LOWER(evento_nombre) LIKE '%${esc(t)}%' OR
    LOWER(subtipo) LIKE '%${esc(t)}%' OR
    LOWER(ciudad) LIKE '%${esc(t)}%'
  )`;
  if (excludeArtist) {
    const whereParts: string[] = [];
    if (tipoFilter) whereParts.push(`a.tipo = '${tipoFilter}'`);
    const cityLikes = tokens.map(t => `LOWER(u.ciudad) LIKE '%${esc(t)}%'`).join(' OR ');
    if (cityLikes) whereParts.push(`(${cityLikes})`);
    const nameLikes = tokens.map(t => `(
      LOWER(a.nombre) LIKE '%${esc(t)}%' OR
      LOWER(e.nombre) LIKE '%${esc(t)}%' OR
      LOWER(a.subtipo) LIKE '%${esc(t)}%'
    )`).join(' AND ');
    if (nameLikes) whereParts.push(nameLikes);
    whereParts.push(`NOT EXISTS (
      SELECT 1 FROM Actividad_Artista aa
      JOIN Artista ar ON ar.id = aa.artista_id
      WHERE aa.actividad_id = a.id AND LOWER(ar.nombre) LIKE '%${esc(excludeArtist)}%'
    )`);
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const selectCols = q.includes('precio') ? 'e.nombre AS evento, e.precio_entrada\nFROM Evento e\nJOIN Actividad a ON e.actividad_id = a.id\nJOIN Ubicacion u ON e.ubicacion_id = u.id' : '*\nFROM Evento e\nJOIN Actividad a ON e.actividad_id = a.id\nJOIN Ubicacion u ON e.ubicacion_id = u.id';
    return `SELECT ${selectCols}
${whereSql}
ORDER BY e.fecha_hora DESC
LIMIT 200`;
  }
  const where = tokens.map(likeGroupView).join(' AND ');
  const extra = tipoFilter ? ` AND tipo = '${tipoFilter}'` : '';
  const selectCols = q.includes('precio') ? 'evento_nombre, precio_entrada, fecha_hora, ciudad' : '*';
  return `SELECT ${selectCols}
FROM vw_eventos_enriquecidos
WHERE ${where}${extra}
ORDER BY fecha_hora DESC
LIMIT 200`;
}

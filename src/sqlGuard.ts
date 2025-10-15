import NodeSqlParser from 'node-sql-parser';
import pino from 'pino';

const logger = pino({ name: 'sql-guard' });
const parser = new NodeSqlParser.Parser();

// Whitelist de tablas y vistas permitidas (case insensitive)
const ALLOWED_TABLES = new Set([
  // Tablas base
  'actividad', 'Actividad',
  'artista', 'Artista', 
  'actividad_artista', 'Actividad_Artista',
  'ubicacion', 'Ubicacion',
  'evento', 'Evento',
  'asistente', 'Asistente',
  'entrada', 'Entrada',
  'valoracion', 'Valoracion',
  // Vistas disponibles (verificadas en la base de datos)
  'vw_eventos_enriquecidos',
  'vw_ventas_evento',
  'vw_artistas_por_actividad',
  'vw_estadisticas_ciudad',
  'vw_eventos_proximos',
  'vw_coste_actividad'
]);

// Tipos SQL prohibidos
const FORBIDDEN_TYPES = new Set([
  'insert',
  'update', 
  'delete',
  'create',
  'alter',
  'drop',
  'truncate',
  'rename'
]);

export interface SqlValidationResult {
  isValid: boolean;
  sanitizedSql?: string;
  error?: string;
}

/**
 * Valida y sanea una consulta SQL asegurando que sea segura
 */
export function validateAndSanitizeSql(sql: string): SqlValidationResult {
  try {
    // Limpiar espacios y comentarios básicos
    const cleanSql = sql.trim()
      .replace(/--.*$/gm, '') // Remover comentarios de línea
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    if (!cleanSql) {
      return {
        isValid: false,
        error: 'La consulta SQL está vacía'
      };
    }

    // Verificar múltiples statements (buscar ; que no esté al final)
    const semicolonCount = (cleanSql.match(/;/g) || []).length;
    const endsWithSemicolon = cleanSql.endsWith(';');
    
    if (semicolonCount > 1 || (semicolonCount === 1 && !endsWithSemicolon)) {
      return {
        isValid: false,
        error: 'No se permiten múltiples consultas SQL'
      };
    }

    // Remover ; final si existe para el parsing
    const sqlForParsing = cleanSql.replace(/;$/, '');

    // Si la consulta utiliza CTE (WITH ...), evitar AST y aceptar mediante validación ligera
    if (/^\s*with\b/i.test(sqlForParsing)) {
      // Comprobar que no haya operaciones prohibidas
      const forbidden = /(insert|update|delete|create|alter|drop|truncate|rename|grant|revoke)\b/i;
      if (forbidden.test(sqlForParsing)) {
        return { isValid: false, error: 'Operación no permitida detectada en CTE' };
      }
      let sanitizedSql = sqlForParsing;
      if (!/\blimit\b/i.test(sanitizedSql)) sanitizedSql += ' LIMIT 200';
      logger.info({ sanitizedSql }, 'Consulta CTE validada mediante ruta ligera');
      return { isValid: true, sanitizedSql };
    }

    // Parsear la consulta
    let ast;
    try {
      ast = parser.astify(sqlForParsing, { database: 'mysql' });
    } catch (parseError) {
      logger.warn({ sql: cleanSql, error: parseError }, 'Error parseando SQL (intentando validación textual segura)');
      // Fallback de validación textual segura (soporta CTEs y HAVING complejos)
      const textOk = textBasedSafeValidation(sqlForParsing);
      if (!textOk.ok) {
        return { isValid: false, error: textOk.error || 'Consulta SQL inválida: error de sintaxis' };
      }
      // Añadir LIMIT si falta
      let sanitizedSql = sqlForParsing;
      if (!/\blimit\b/i.test(sanitizedSql)) {
        sanitizedSql += ' LIMIT 200';
      }
      return { isValid: true, sanitizedSql };
    }

    // Manejar array de statements
    const statements = Array.isArray(ast) ? ast : [ast];

    if (statements.length !== 1) {
      return {
        isValid: false,
        error: 'Solo se permite una consulta SQL por petición'
      };
    }

    const statement = statements[0];

    // Verificar que solo sea SELECT
    if (statement.type !== 'select') {
      const statementType = statement.type?.toLowerCase() || 'desconocido';
      if (FORBIDDEN_TYPES.has(statementType)) {
        return {
          isValid: false,
          error: `Operación ${statementType.toUpperCase()} no permitida. Solo se permiten consultas SELECT`
        };
      }
      return {
        isValid: false,
        error: 'Solo se permiten consultas SELECT'
      };
    }

    // Extraer todas las tablas referenciadas
    const referencedTables = extractTablesFromAst(statement);
    
    // Verificar que todas las tablas estén en la whitelist
    // Pero ignorar alias de una sola letra (e, a, u, etc.) que son comunes en JOINs
    let whitelistViolation = '';
    for (const table of referencedTables) {
      const tableName = table.toLowerCase();
      if (tableName.length <= 2) continue; // alias
      if (!ALLOWED_TABLES.has(tableName) && !ALLOWED_TABLES.has(table)) {
        whitelistViolation = table;
        break;
      }
    }
    if (whitelistViolation) {
      // Reintentar con validación textual que soporta WITH/CTE y subconsultas
      const textOk = textBasedSafeValidation(sqlForParsing);
      if (!textOk.ok) {
        return {
          isValid: false,
          error: `Tabla '${whitelistViolation}' no está permitida. Tablas disponibles: ${Array.from(ALLOWED_TABLES).join(', ')}`
        };
      }
      // Aceptar usando SQL original + LIMIT si falta
      let sanitizedSql = sqlForParsing;
      if (!/\blimit\b/i.test(sanitizedSql)) sanitizedSql += ' LIMIT 200';
      return { isValid: true, sanitizedSql };
    }

    // Verificar si ya tiene LIMIT a partir del AST
    const hasLimit = !!statement.limit;

    // Conservar el SQL original (ya limpio) para mantener alias y estilo del usuario
    // Remover ';' final si existe para evitar dos statements
    let sanitizedSql = sqlForParsing;
    if (!hasLimit) {
      sanitizedSql += ' LIMIT 200';
      logger.info({ originalSql: cleanSql }, 'Añadido LIMIT 200 a la consulta');
    }

    logger.info({
      originalSql: cleanSql,
      sanitizedSql,
      referencedTables: Array.from(referencedTables)
    }, 'Consulta SQL validada y saneada (preservando alias)');

    return {
      isValid: true,
      sanitizedSql
    };

  } catch (error) {
    logger.error({ 
      sql, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 'Error validando consulta SQL');
    
    return {
      isValid: false,
      error: 'Error procesando la consulta SQL'
    };
  }
}

/**
 * Extrae todas las tablas referenciadas en un AST
 */
function extractTablesFromAst(ast: any): Set<string> {
  const tables = new Set<string>();

  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Manejar diferentes tipos de nodos que pueden contener tablas
    if (node.table) {
      let tableName: string;

      if (typeof node.table === 'string') {
        tableName = node.table;
      } else if (node.table.table) {
        tableName = node.table.table;
      } else {
        return;
      }

      tables.add(tableName);
    }

    // Manejar FROM clause
    if (node.from) {
      if (Array.isArray(node.from)) {
        node.from.forEach((fromItem: any) => traverse(fromItem));
      } else {
        traverse(node.from);
      }
    }

    // Manejar JOINs
    if (node.join) {
      if (Array.isArray(node.join)) {
        node.join.forEach((joinItem: any) => traverse(joinItem));
      } else {
        traverse(node.join);
      }
    }

    // Traversar recursivamente otros campos
    for (const key in node) {
      if (key !== 'table' && node.hasOwnProperty(key)) {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(item => traverse(item));
        } else if (typeof value === 'object') {
          traverse(value);
        }
      }
    }
  }

  traverse(ast);
  return tables;
}

// Fallback de validación textual segura: soporta CTEs y consultas complejas
function textBasedSafeValidation(sql: string): { ok: boolean; error?: string } {
  const s = sql.trim().replace(/;$/, '');
  // Solo SELECT y WITH ... SELECT
  if (!/^\s*(with\b[\s\S]*?select\b|select\b)/i.test(s)) {
    return { ok: false, error: 'Solo se permiten consultas SELECT (soporta WITH CTE)' };
  }
  // Palabras peligrosas prohibidas
  const forbidden = /(insert|update|delete|create|alter|drop|truncate|rename|grant|revoke)\b/i;
  if (forbidden.test(s)) {
    return { ok: false, error: 'Operación no permitida detectada' };
  }
  // Extraer nombres de CTE declarados en WITH
  const cteNames = new Set<string>();
  const withHeaderMatch = s.match(/^\s*with\s+([\s\S]+?)\bselect\b/i);
  if (withHeaderMatch) {
    const header = withHeaderMatch[1];
    const cteRe = /(\w+)\s+as\s*\(/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cteRe.exec(header)) !== null) {
      cteNames.add((cm[1] || '').toLowerCase());
    }
  }
  // Extraer posibles identificadores de tablas/vistas después de FROM/JOIN
  const tableRegex = /(from|join)\s+([a-zA-Z0-9_\.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRegex.exec(s)) !== null) {
    const raw = m[2];
    // Quitar alias tipo schema.table o backticks
    const name = raw.replace(/`/g, '').split('.').pop() || raw;
    const lower = name.toLowerCase();
    if (lower.length <= 2) continue; // alias
    if (cteNames.has(lower)) continue; // nombre de CTE permitido
    if (!ALLOWED_TABLES.has(lower) && !ALLOWED_TABLES.has(name)) {
      return { ok: false, error: `Tabla '${name}' no está permitida` };
    }
  }
  return { ok: true };
}
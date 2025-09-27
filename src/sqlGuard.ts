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
  'vw_eventos_proximos'
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

    // Parsear la consulta
    let ast;
    try {
      ast = parser.astify(sqlForParsing, { database: 'mysql' });
    } catch (parseError) {
      logger.warn({ sql: cleanSql, error: parseError }, 'Error parseando SQL');
      return {
        isValid: false,
        error: 'Consulta SQL inválida: error de sintaxis'
      };
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
    for (const table of referencedTables) {
      const tableName = table.toLowerCase();
      
      // Ignorar alias típicos de una sola letra o dos letras
      if (tableName.length <= 2) {
        continue;
      }
      
      if (!ALLOWED_TABLES.has(tableName) && !ALLOWED_TABLES.has(table)) {
        return {
          isValid: false,
          error: `Tabla '${table}' no está permitida. Tablas disponibles: ${Array.from(ALLOWED_TABLES).join(', ')}`
        };
      }
    }

    // Verificar si ya tiene LIMIT
    let hasLimit = false;
    if (statement.limit) {
      hasLimit = true;
    }

    // Reconstruir la consulta y añadir LIMIT si no existe
    let sanitizedSql = parser.sqlify(statement, { database: 'mysql' });
    
    if (!hasLimit) {
      sanitizedSql += ' LIMIT 200';
      logger.info({ originalSql: cleanSql }, 'Añadido LIMIT 200 a la consulta');
    }

    logger.info({ 
      originalSql: cleanSql, 
      sanitizedSql,
      referencedTables: Array.from(referencedTables)
    }, 'Consulta SQL validada y saneada');

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
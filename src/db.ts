import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import pino from 'pino';

// Cargar variables de entorno
config();

const logger = pino({ 
  name: 'db',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,name',
      messageFormat: '💾 {msg}',
      levelFirst: true,
      singleLine: true
    }
  }
});

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'artevida_cultural',
  user: process.env.DB_USER_RO || 'readonly_user',
  password: process.env.DB_PASS_RO || 'readonly_pass123',
  connectionLimit: 10,
  // Configuración de seguridad para usuario read-only
  ssl: undefined,
  multipleStatements: false, // Prevenir múltiples statements
  supportBigNumbers: true,
  bigNumberStrings: true
};

// Pool de conexiones
export const pool = mysql.createPool(dbConfig);

// Función para ejecutar consultas con timeout y logging
export async function executeQuery(sql: string): Promise<any[]> {
  const start = Date.now();
  
  try {
    logger.info({ sql }, 'Ejecutando consulta SQL');
    
    const [rows] = await pool.execute(sql);
    const executionTime = Date.now() - start;
    
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    logger.info({ 
      sql, 
      rowCount, 
      executionTime: `${executionTime}ms` 
    }, 'Consulta ejecutada exitosamente');
    
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    const executionTime = Date.now() - start;
    logger.error({ 
      sql, 
      error: error instanceof Error ? error.message : 'Error desconocido',
      executionTime: `${executionTime}ms` 
    }, 'Error ejecutando consulta SQL');
    
    throw error;
  }
}

// Función para verificar la conexión
export async function checkConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Error desconocido' }, '❌ Error conectando a la base de datos');
    return false;
  }
}

// Cerrar el pool de conexiones
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Pool de conexiones cerrado');
}
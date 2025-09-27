import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import pino from 'pino';
import { readFileSync } from 'fs';

config();

const logger = pino({ name: 'migrate' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'artevida_cultural',
  user: 'root', // Usar usuario root para migraciones
  password: process.env.DB_ROOT_PASSWORD || 'rootpass123',
  multipleStatements: true
};

/**
 * Ejecuta los archivos de migración en orden
 */
async function runMigrations(): Promise<void> {
  let connection;
  
  try {
    logger.info('Iniciando migraciones de base de datos...');
    
    connection = await mysql.createConnection(dbConfig);
    logger.info('Conexión establecida para migraciones');

    // Lista de archivos de migración en orden
    const migrations = [
      'migrations/001_init.sql',
      'migrations/002_views.sql'
    ];

    for (const migrationFile of migrations) {
      try {
        logger.info({ file: migrationFile }, 'Ejecutando migración');
        
        const sqlContent = readFileSync(migrationFile, 'utf-8');
        await connection.query(sqlContent);
        
        logger.info({ file: migrationFile }, 'Migración ejecutada exitosamente');
      } catch (error) {
        logger.error({ 
          file: migrationFile, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 'Error ejecutando migración');
        throw error;
      }
    }

    // Crear usuario read-only si no existe
    await createReadOnlyUser(connection);
    
    logger.info('Todas las migraciones completadas exitosamente');

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 'Error durante las migraciones');
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      logger.info('Conexión cerrada');
    }
  }
}

/**
 * Crea el usuario read-only para la aplicación
 */
async function createReadOnlyUser(connection: mysql.Connection): Promise<void> {
  const readOnlyUser = process.env.DB_USER_RO || 'readonly_user';
  const readOnlyPass = process.env.DB_PASS_RO || 'readonly_pass123';
  const database = process.env.DB_NAME || 'artevida_cultural';

  try {
    logger.info('Creando usuario read-only...');

    // Crear usuario si no existe
    await connection.query(
      `CREATE USER IF NOT EXISTS '${readOnlyUser}'@'%' IDENTIFIED BY '${readOnlyPass}'`
    );

    // Otorgar permisos de solo lectura
    await connection.query(
      `GRANT SELECT ON ${database}.* TO '${readOnlyUser}'@'%'`
    );

    // Aplicar cambios
    await connection.query('FLUSH PRIVILEGES');

    logger.info({ user: readOnlyUser }, 'Usuario read-only creado/actualizado correctamente');

  } catch (error) {
    logger.error({ 
      user: readOnlyUser,
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 'Error creando usuario read-only');
    throw error;
  }
}

// Ejecutar migraciones si este archivo es llamado directamente
if (import.meta.url.endsWith('/migrate.ts') || import.meta.url.endsWith('\\migrate.ts')) {
  runMigrations()
    .then(() => {
      logger.info('Migraciones completadas');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Migraciones fallidas');
      process.exit(1);
    });
}
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import pino from 'pino';

config();

const logger = pino({ name: 'seed' });

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '13306', 10);
  const database = process.env.DB_NAME || 'artevida_cultural';
  const password = process.env.DB_ROOT_PASSWORD || 'rootpass123';

  // Use root user for seeding
  const user = process.env.DB_USER || 'root';

  logger.info({ host, port, database, user }, 'Connecting to MySQL to run seeds');

  // Read seed SQL
  const seedPath = 'seeds/bd.sql';
  const sql = readFileSync(seedPath, 'utf8');

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
      // database may not exist yet; bd.sql creates it
    });

    await connection.query(sql);
    logger.info('Seed executed successfully');
  } catch (error) {
    logger.error({ error }, 'Seed failed');
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

main();

import path from 'path';
import { readFile } from 'fs/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

import { parseSqlStatements, runSqlMigrations } from '../migrations/runSqlMigrations';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function assertLocalDevTarget(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, '');
  const host = url.hostname;

  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`Refusing to bootstrap non-local database host: ${host}`);
  }

  if (databaseName !== 'listify_local_dev') {
    throw new Error(`Refusing to bootstrap unexpected database: ${databaseName}`);
  }

  return url;
}

async function recreateDatabase(url: URL) {
  const adminConnection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });

  try {
    await adminConnection.query('DROP DATABASE IF EXISTS listify_local_dev');
    await adminConnection.query('CREATE DATABASE listify_local_dev');
  } finally {
    await adminConnection.end();
  }
}

async function executeSqlFile(connection: mysql.Connection, relativePath: string) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const rawSql = await readFile(filePath, 'utf8');
  const normalizedSql = rawSql.replace(/--> statement-breakpoint/g, '\n');
  const statements = parseSqlStatements(normalizedSql);

  console.log(`Applying ${relativePath} (${statements.length} statements)...`);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const target = assertLocalDevTarget(databaseUrl);

  console.log('Bootstrapping local database:', {
    host: target.hostname,
    database: target.pathname.replace(/^\//, ''),
  });

  await recreateDatabase(target);

  const connection = await mysql.createConnection(databaseUrl);

  try {
    await executeSqlFile(connection, 'drizzle/migrations/30001_baseline.sql');
    await connection.end();
    await runSqlMigrations({ migrationsDir: path.resolve(process.cwd(), 'server/migrations') });
    const postMigrationConnection = await mysql.createConnection(databaseUrl);
    try {
      await executeSqlFile(
        postMigrationConnection,
        'drizzle/migrations/20260309_distribution_access_layer.sql',
      );
    } finally {
      await postMigrationConnection.end();
    }
    console.log('Local database bootstrap completed successfully.');
  } finally {
    try {
      await connection.end();
    } catch {
      // Connection may already be closed after handing off to runSqlMigrations.
    }
  }
}

main().catch(error => {
  console.error('Local bootstrap failed:', error);
  process.exit(1);
});

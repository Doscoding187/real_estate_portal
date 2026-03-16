import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test when NODE_ENV=test
if (process.env.NODE_ENV === 'test') {
  config({ path: resolve(process.cwd(), '.env.test'), override: true });
  console.log('[Test Setup] Loaded .env.test');
  console.log(
    '[Test Setup] DATABASE_URL:',
    process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
  );
}

import { beforeAll } from 'vitest';
import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __TEST_SQL_MIGRATIONS_READY__: Promise<void> | undefined;
}

// Global setup for all tests
beforeAll(async () => {
  if (process.env.SKIP_DB_INIT === '1') {
    console.log('[Test Setup] SKIP_DB_INIT=1; skipping database initialization');
    return;
  }

  // Ensure database is initialized for tests using the proxy
  if (process.env.NODE_ENV === 'test') {
    try {
      if (process.env.DATABASE_URL) {
        if (!globalThis.__TEST_SQL_MIGRATIONS_READY__) {
          globalThis.__TEST_SQL_MIGRATIONS_READY__ = (async () => {
            const lockName = 'vitest_sql_migrations_lock_v1';
            const connection = await mysql.createConnection(process.env.DATABASE_URL!);
            let acquiredLock = false;

            const queryCount = async (query: string) => {
              const [rows] = await connection.query(query);
              const row = Array.isArray(rows) ? (rows[0] as any) : undefined;
              return Number(row?.c ?? 0);
            };

            const hasRequiredExploreSchema = async () => {
              const hasActorColumn = await queryCount(`
                SELECT COUNT(*) AS c
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'explore_content'
                  AND column_name = 'actor_id'
              `);
              const hasInteractionEvents = await queryCount(`
                SELECT COUNT(*) AS c
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'interaction_events'
              `);
              const hasEconomicActors = await queryCount(`
                SELECT COUNT(*) AS c
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'economic_actors'
              `);

              return hasActorColumn > 0 && hasInteractionEvents > 0 && hasEconomicActors > 0;
            };

            try {
              const [lockRows] = await connection.query(
                `SELECT GET_LOCK('${lockName}', 180) AS lock_acquired`,
              );
              acquiredLock = Number((lockRows as any)?.[0]?.lock_acquired ?? 0) === 1;

              if (!acquiredLock) {
                throw new Error('Could not acquire migration lock for test DB setup');
              }

              const readyBefore = await hasRequiredExploreSchema();
              if (!readyBefore) {
                const { runSqlMigrations } = await import('./server/migrations/runSqlMigrations');
                await runSqlMigrations({
                  filePattern: /^\d+_.*\.sql$/,
                });
              }

              const readyAfter = await hasRequiredExploreSchema();
              if (!readyAfter) {
                throw new Error('Required Explore schema is still missing after running migrations');
              }

              console.log('[Test Setup] SQL migrations ensured for test DB');
            } finally {
              if (acquiredLock) {
                await connection.query(`DO RELEASE_LOCK('${lockName}')`);
              }
              await connection.end();
            }
          })();
        }
        await globalThis.__TEST_SQL_MIGRATIONS_READY__;
      }

      // Dynamic import to ensure env vars are loaded first
      const { getDb } = await import('./server/db-connection');
      await getDb();
      console.log('[Test Setup] Global database connection initialized');
    } catch (err) {
      console.error('[Test Setup] Failed to initialize database:', err);
      throw err;
    }
  }
});

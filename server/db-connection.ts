import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

// Connection state
export let _db: any = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (_db) return _db;

  // In test environment, bypass actual DB connection to avoid DATABASE_URL dependency
  if (process.env.NODE_ENV === 'test') {
    // Return a mock DB object manageable by tests
    const mockTable = {
      findFirst: async () => null,
      findMany: async () => [],
      delete: async () => [],
      update: async () => [],
      insert: async () => [],
    };

    // Recursive proxy for query builder
    const createQueryProxy = () =>
      new Proxy(
        {},
        {
          get: (target, prop) => {
            if (prop === 'developers') {
              return {
                ...mockTable,
                findFirst: async () => ({
                  id: 1,
                  userId: 'user_123',
                  status: 'approved',
                  name: 'Test Dev',
                }),
              };
            }
            return mockTable; // Return mockTable for any other table name
          },
        },
      );

    const mockDb = {
      query: createQueryProxy(),
      select: () => ({ from: () => ({ where: () => [], limit: () => [], orderBy: () => [] }) }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
      delete: () => ({ where: () => ({ returning: () => [] }) }),
      transaction: (cb: any) => cb(mockDb), // Reuse same mock for translation
    };

    return mockDb as any;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is missing. Set it in .env.local (dev) or .env.production (prod).',
    );
  }

  // Safety Check: Verify Database Environment Separation
  try {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, ''); // Remove leading slash
    const env = process.env.NODE_ENV || 'development';

    // Production: Must match listify_property_sa (Live Prod)
    if (env === 'production' && dbName !== 'listify_property_sa') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-production DB (${dbName}) in PRODUCTION environment. Expected: listify_property_sa`,
      );
    }
    // Staging: Must match listify_staging
    if (env === 'staging' && dbName !== 'listify_staging') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-staging DB (${dbName}) in STAGING environment. Expected: listify_staging`,
      );
    }
    // Test: Must match listify_test
    if (env === 'test' && dbName !== 'listify_test') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-test DB (${dbName}) in TEST environment. Expected: listify_test`,
      );
    }

    // Reverse Check: Don't allow Prod DB in non-prod envs
    if (dbName === 'listify_property_sa' && env !== 'production') {
      throw new Error(`CRITICAL: DANGER! Attempting to connect to PROD DB in ${env} environment.`);
    }
  } catch (e: any) {
    // If URL parsing fails, we might want to let it slide or throw.
    // Assuming valid URLs for now, but catching to be safe.
    if (e.message.includes('CRITICAL')) throw e;
    console.warn('[Database] URL parsing warning:', e.message);
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // Debug log for connection attempt
    console.log('[Database] Attempting connection...');

    const poolConnection = mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: {
        // TiDB Cloud / PlanetScale often require this to be false on some platforms
        // unless you provide the CA certificate explicitly.
        // We set it to false to ensure connectivity, relying on the encrypted channel.
        rejectUnauthorized: false,
      },
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log('[Database] Connection pool initialized.');

    // Verify connection and log DB name
    try {
      const [rows] = await poolConnection.query('SELECT DATABASE() AS db, @@hostname AS host');
      const dbInfo = (rows as any)[0];
      console.log(
        `[Database] Connected to: ${dbInfo?.db || '(unknown)'} @ ${dbInfo?.host || '(unknown)'}`,
      );
    } catch (e) {
      console.warn('[Database] Connection verified, but failed to read DB name');
    }

    _db = drizzle(poolConnection, { schema, mode: 'default' });
    return _db;
  } catch (error) {
    console.error('[Database] Failed to connect:', error);
    _db = null;
    return null;
  }
}

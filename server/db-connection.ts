import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

// Connection state
export let _db: any = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is missing. Set it in .env.local (dev) or .env.production (prod).',
    );
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

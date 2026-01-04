import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

// Connection state
let _db: any = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    console.error('[Database] DATABASE_URL is missing');
    return null;
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

    _db = drizzle(poolConnection, { schema, mode: 'default' });
    
    console.log('[Database] Connection pool initialized.');
    return _db;
  } catch (error) {
    console.error('[Database] Failed to connect:', error);
    _db = null;
    return null;
  }
}

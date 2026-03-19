import { config } from 'dotenv';
import { resolve } from 'path';

if (process.env.CI === 'true') {
  console.log = () => undefined;
  console.info = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;
}

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

// Global setup for all tests
beforeAll(async () => {
  // Ensure database is initialized for tests using the proxy
  if (process.env.NODE_ENV === 'test') {
    try {
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

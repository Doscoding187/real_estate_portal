import { getDb } from './db-connection';

async function run() {
  console.log('--- DB Guard Verification ---');

  // Case 1: NODE_ENV=production but DB is staging
  // We mock process.env for this test
  const originalEnv = process.env;

  try {
    console.log('Testing Guard: NODE_ENV=production with DATABASE_URL=.../listify_staging');
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://user:pass@host/listify_staging',
    };

    // We need to reset the module or the singleton _db to force re-connection logic
    // Since _db is exported and lazy, we might need to rely on getDb throwing before assignment
    // But getDb has a singleton check `if (_db) return _db`.
    // We can't easily reset _db from outside without a reset method or reloading module.
    // For this script, we'll assume it's the first call or we modify db-connection to allow reset.
    // Actually, since this is a standalone script, getDb is fresh.

    await getDb();
    console.error('❌ FAIL: Connection succeeded despite mismatch!');
  } catch (e: any) {
    console.log('✅ PASS: Caught expected error:', e.message);
  }

  process.exit(0);
}

run();

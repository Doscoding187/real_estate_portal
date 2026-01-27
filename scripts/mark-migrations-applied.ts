#!/usr/bin/env tsx
/**
 * ⚠️  WARNING: BOOTSTRAP/RECOVERY TOOL ONLY ⚠️
 *
 * Mark existing migrations as applied
 *
 * ⚠️  DO NOT USE FOR REGULAR DEPLOYMENTS ⚠️
 *
 * This script marks all migration files as applied in the __drizzle_migrations table
 * without actually running them. Use this ONLY when:
 *
 * 1. Initial adoption: Database schema exists but migrations table is empty
 * 2. Recovery: Migrations table was accidentally dropped/corrupted
 *
 * For regular deployments, ALWAYS use:
 *   - `npm run db:generate` to create migrations
 *   - `npm run db:migrate` to apply migrations
 *
 * Using this script in production can mask schema drift and cause data corruption.
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

config();

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // 1. Get all migration files
    const migrationsDir = join(process.cwd(), 'drizzle');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql') && f.match(/^\d{4}_/)) // Only numbered migration files
      .sort(); // Sort by filename (which includes timestamp)

    console.log(`\n📁 Found ${sqlFiles.length} migration files\n`);

    // 2. Check current state of migrations table
    const [existing] = await connection.query<any[]>(
      'SELECT * FROM __drizzle_migrations ORDER BY created_at',
    );

    console.log(`📊 Currently applied: ${existing.length} migrations\n`);

    if (existing.length === sqlFiles.length) {
      console.log('✅ All migrations already marked as applied!');
      process.exit(0);
    }

    // 3. Get list of already applied migrations
    const appliedHashes = new Set(existing.map((row: any) => row.hash));

    // 4. Mark remaining migrations as applied
    let marked = 0;

    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const content = await readFile(filePath, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');

      if (appliedHashes.has(hash)) {
        console.log(`⏭️  ${file} - already applied`);
        continue;
      }

      // Insert into migrations table
      await connection.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
        hash,
        Math.floor(Date.now()),
      ]);

      console.log(`✅ ${file} - marked as applied`);
      marked++;
    }

    console.log(`\n🎉 Marked ${marked} migrations as applied!`);
    console.log(`📊 Total migrations: ${sqlFiles.length}`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

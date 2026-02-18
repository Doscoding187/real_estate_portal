#!/usr/bin/env tsx
/**
 * WARNING: BOOTSTRAP/RECOVERY TOOL ONLY
 *
 * Mark journal-tracked migrations as applied in __drizzle_migrations without executing SQL.
 * Use only for initial bootstrap/recovery scenarios.
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);

  try {
    const migrationsDir = join(process.cwd(), 'drizzle', 'migrations');
    const journalPath = join(migrationsDir, 'meta', '_journal.json');

    const journalRaw = await readFile(journalPath, 'utf-8');
    const journal = JSON.parse(journalRaw) as { entries?: Array<{ tag?: string }> };
    const tags = (journal.entries || []).map(entry => entry.tag).filter(Boolean) as string[];
    const trackedSqlFiles = tags.map(tag => `${tag}.sql`);

    const sqlFilesInDir = new Set((await readdir(migrationsDir)).filter(name => name.endsWith('.sql')));
    const missingFiles = trackedSqlFiles.filter(file => !sqlFilesInDir.has(file));
    if (missingFiles.length > 0) {
      throw new Error(`Missing journal-tracked migration file(s): ${missingFiles.join(', ')}`);
    }

    console.log(`Found ${trackedSqlFiles.length} tracked migration files`);

    const [existing] = await connection.query<any[]>(
      'SELECT * FROM __drizzle_migrations ORDER BY created_at',
    );

    console.log(`Currently applied: ${existing.length} migrations`);

    if (existing.length === trackedSqlFiles.length) {
      console.log('All journal-tracked migrations are already marked as applied.');
      return;
    }

    const appliedHashes = new Set(existing.map((row: any) => row.hash));
    let marked = 0;

    for (const file of trackedSqlFiles) {
      const filePath = join(migrationsDir, file);
      const content = await readFile(filePath, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');

      if (appliedHashes.has(hash)) {
        console.log(`Skip ${file} (already applied)`);
        continue;
      }

      await connection.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
        hash,
        Math.floor(Date.now()),
      ]);

      console.log(`Marked ${file}`);
      marked++;
    }

    console.log(`Marked ${marked} migration(s).`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

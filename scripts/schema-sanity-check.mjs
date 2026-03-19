#!/usr/bin/env node
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

async function main() {
  const errors = [];
  const root = process.cwd();
  const schemaDir = join(root, 'drizzle', 'schema');
  const migrationsDir = join(root, 'drizzle', 'migrations');
  const journalPath = join(migrationsDir, 'meta', '_journal.json');
  const drizzleConfigPath = join(root, 'drizzle.config.ts');

  const drizzleConfig = await readFile(drizzleConfigPath, 'utf-8');
  if (!drizzleConfig.includes("out: './drizzle/migrations'")) {
    errors.push("drizzle.config.ts must set out to './drizzle/migrations'.");
  }

  const schemaFiles = (await readdir(schemaDir)).filter(name => name.endsWith('.ts'));
  const badAutoIds = [];

  for (const file of schemaFiles) {
    const fullPath = join(schemaDir, file);
    const content = await readFile(fullPath, 'utf-8');

    const missingAutoPk = content.match(/id:\s*int\([^\)]*\)\.autoincrement\(\)\.notNull\(\)/g);
    const missingVarcharPk = content.match(
      /id:\s*varchar\([^\)]*\)\.notNull\(\)(?!\.primaryKey\()/g,
    );
    const missingCount = (missingAutoPk?.length || 0) + (missingVarcharPk?.length || 0);
    if (missingCount > 0) {
      badAutoIds.push(`${file}: ${missingCount} id column(s) missing primaryKey()`);
    }
  }

  if (badAutoIds.length > 0) {
    errors.push(...badAutoIds);
  }

  const journalRaw = await readFile(journalPath, 'utf-8');
  const journal = JSON.parse(journalRaw);
  const tags = (journal.entries || []).map(entry => entry.tag).filter(Boolean);
  const trackedFiles = tags.map(tag => `${tag}.sql`);

  const migrationFiles = new Set((await readdir(migrationsDir)).filter(name => name.endsWith('.sql')));
  const missingFiles = trackedFiles.filter(file => !migrationFiles.has(file));
  if (missingFiles.length > 0) {
    errors.push(`Missing journal-tracked migration file(s): ${missingFiles.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Schema sanity check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Schema sanity check passed.');
}

main().catch(error => {
  console.error(`Schema sanity check failed with exception: ${error.message}`);
  process.exit(1);
});

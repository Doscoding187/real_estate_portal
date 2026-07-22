#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

function sameValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const errors = [];
  const root = process.cwd();
  const schemaDir = join(root, 'drizzle', 'schema');
  const migrationsDir = join(root, 'server', 'migrations');
  const inventoryPath = join(
    schemaDir,
    'canonical-model-inventory.json',
  );
  const baselineName = '0000_canonical_launch_baseline.sql';
  const baselinePath = join(migrationsDir, baselineName);

  const inventory = JSON.parse(
    await readFile(inventoryPath, 'utf8'),
  );

  const schemaFiles = (await readdir(schemaDir))
    .filter(name => name.endsWith('.ts'))
    .sort();

  const schemaSources = await Promise.all(
    schemaFiles.map(async file => ({
      file,
      source: await readFile(join(schemaDir, file), 'utf8'),
    })),
  );

  const combinedSchema = schemaSources
    .map(entry => entry.source)
    .join('\n');

  const modelTables = Array.from(
    combinedSchema.matchAll(
      /mysqlTable\(\s*['"]([^'"]+)['"]/g,
    ),
    match => String(match[1]),
  ).sort();

  const inventoryTables = Array.isArray(inventory.tables)
    ? [...inventory.tables]
    : [];

  if (
    inventory.authority !==
    'DBA-S2A canonical launch model inventory'
  ) {
    errors.push('Unexpected canonical inventory authority.');
  }

  if (inventory.tableCount !== inventoryTables.length) {
    errors.push(
      `Inventory tableCount ${inventory.tableCount} does not match ` +
      `${inventoryTables.length} table name(s).`,
    );
  }

  if (new Set(inventoryTables).size !== inventoryTables.length) {
    errors.push('Canonical inventory contains duplicate table names.');
  }

  if (
    !sameValues(
      [...inventoryTables].sort(),
      inventoryTables,
    )
  ) {
    errors.push('Canonical inventory table names are not sorted.');
  }

  if (!sameValues(modelTables, inventoryTables)) {
    errors.push(
      'Modular Drizzle schema tables do not match the canonical inventory.',
    );
  }

  for (const { file, source } of schemaSources) {
    const missingAutoPk =
      source.match(
        /id:\s*int\([^\)]*\)\.autoincrement\(\)\.notNull\(\)/g,
      ) ?? [];

    const missingVarcharPk =
      source.match(
        /id:\s*varchar\([^\)]*\)\.notNull\(\)(?!\.primaryKey\()/g,
      ) ?? [];

    const count =
      missingAutoPk.length + missingVarcharPk.length;

    if (count > 0) {
      errors.push(
        `${file}: ${count} id column(s) missing primaryKey()`,
      );
    }
  }

  const activeSqlFiles = (await readdir(migrationsDir))
    .filter(name => name.endsWith('.sql'))
    .sort();

  if (
    activeSqlFiles.length === 0 ||
    activeSqlFiles[0] !== baselineName
  ) {
    errors.push(
      `${baselineName} must be the first active SQL migration.`,
    );
  }

  const baselineSql = await readFile(baselinePath, 'utf8');

  const baselineTables = Array.from(
    baselineSql.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`/gi,
    ),
    match => String(match[1]),
  ).sort();

  if (new Set(baselineTables).size !== baselineTables.length) {
    errors.push(
      'Canonical baseline contains duplicate CREATE TABLE names.',
    );
  }

  if (!sameValues(baselineTables, inventoryTables)) {
    errors.push(
      'Canonical baseline tables do not match the canonical inventory.',
    );
  }

  if (/\bCREATE\s+VIEW\b/i.test(baselineSql)) {
    errors.push('Canonical baseline must not create views.');
  }

  if (errors.length > 0) {
    console.error('Schema sanity check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Schema sanity check passed: ` +
    `${inventoryTables.length} canonical tables; ` +
    `${activeSqlFiles.length} active SQL migration file(s).`,
  );
}

main().catch(error => {
  console.error(
    `Schema sanity check failed with exception: ${error.message}`,
  );
  process.exit(1);
});

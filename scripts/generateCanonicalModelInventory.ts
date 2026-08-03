import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '../drizzle/schema';
import {
  normalizedDesiredSchema,
  RUNNER_CONTROL_TABLES,
} from '../server/_core/databaseAuthority/schemaCongruency';

const INVENTORY_PATH = resolve(
  process.cwd(),
  'drizzle/schema/canonical-model-inventory.json',
);

export function generateCanonicalModelInventory(
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const normalized = normalizedDesiredSchema(schema);
  const tables = normalized.tables.map(table => table.name);
  const {
    authority: _authority,
    formatVersion: _formatVersion,
    generatedFrom: _generatedFrom,
    generator: _generator,
    structuralDigest: _structuralDigest,
    excludedRunnerControlTables: _excludedRunnerControlTables,
    nonStructuralAnnotationsClassification: _nonStructuralAnnotationsClassification,
    tableCount: _tableCount,
    tables: _tables,
    nonStructuralAnnotations,
    ...legacyAnnotations
  } = existing;
  const annotations =
    nonStructuralAnnotations && typeof nonStructuralAnnotations === 'object'
      ? nonStructuralAnnotations
      : legacyAnnotations;
  return {
    authority: 'Database Authority Control Plane generated canonical model inventory',
    formatVersion: 2,
    generatedFrom: 'drizzle/schema/index.ts via drizzle-orm 0.44 normalized metadata',
    generator: 'scripts/generateCanonicalModelInventory.ts',
    structuralDigest: normalized.digest,
    excludedRunnerControlTables: [...RUNNER_CONTROL_TABLES],
    tableCount: tables.length,
    tables,
    nonStructuralAnnotationsClassification:
      'Compatibility annotations are retained but excluded from generated structural authority and digest.',
    ...(annotations as Record<string, unknown>),
  };
}

function serializedInventory(): string {
  const existing = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8')) as Record<string, unknown>;
  return `${JSON.stringify(generateCanonicalModelInventory(existing), null, 2)}\n`;
}

function main(): void {
  const expected = serializedInventory();
  if (process.argv.includes('--write')) {
    writeFileSync(INVENTORY_PATH, expected);
    console.log('Canonical model inventory regenerated from Drizzle metadata.');
    return;
  }
  const actual = readFileSync(INVENTORY_PATH, 'utf8');
  if (actual !== expected) {
    throw new Error(
      'Canonical model inventory is stale. Run pnpm schema:inventory:generate and review the structural digest.',
    );
  }
  console.log('Canonical model inventory is deterministic and current.');
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Inventory generation failed.');
    process.exit(1);
  }
}

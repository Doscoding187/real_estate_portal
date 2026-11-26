import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Canonical model digest of the 0197 release (225 tables). */
export const MODEL_DIGEST_0197 = '869f441f3131b0f1bf4b56d416d049292bb48204918f8172d3699625c3208da7';

const LATER_TABLES = new Set(['service_provider_projects', 'service_provider_credentials']);

/**
 * Builds a temporary repository root that looks like the closed 0197 release:
 * the frozen 0197 manifest (byte-exact, from the rehearsal evidence fixture),
 * the 198 migration files it lists, and the 225-table inventory with the 0197
 * model digest. Used to exercise 0197 plan/apply logic after the live tree moved
 * on. The caller removes the returned directory.
 */
export function makeFrozen0197Root(): string {
  const live = process.cwd();
  const root = mkdtempSync(join(tmpdir(), 'listify-frozen-0197-'));
  const manifestSource = readFileSync(
    join(
      live,
      'docs/database-authority/evidence/rehearsal-source-20261105/server/migrations/manifest.json',
    ),
    'utf8',
  );
  mkdirSync(join(root, 'server/migrations'), { recursive: true });
  writeFileSync(join(root, 'server/migrations/manifest.json'), manifestSource);
  for (const entry of JSON.parse(manifestSource).migrations as { filename: string }[]) {
    copyFileSync(
      join(live, 'server/migrations', entry.filename),
      join(root, 'server/migrations', entry.filename),
    );
  }
  const inventory = JSON.parse(
    readFileSync(join(live, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables: string[]; tableCount: number; structuralDigest: string };
  const tables = inventory.tables.filter(table => !LATER_TABLES.has(table));
  mkdirSync(join(root, 'drizzle/schema'), { recursive: true });
  writeFileSync(
    join(root, 'drizzle/schema/canonical-model-inventory.json'),
    JSON.stringify({
      ...inventory,
      tables,
      tableCount: tables.length,
      structuralDigest: MODEL_DIGEST_0197,
    }),
  );
  return root;
}

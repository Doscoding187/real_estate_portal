import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';

/**
 * Runtime grants for the two tables created by migrations 0199 and 0200.
 * Migration 0198 only adds columns to service_provider_profiles, which is an
 * established baseline table already covered by the table-scoped runtime
 * grants from the 0094 provisioner, so it needs no new grant.
 */
export const RUNTIME_GRANT_0200_TABLES = [
  {
    table: 'service_provider_projects',
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    callSites: [
      'server/services/servicesEngineService.ts:1132 (select), 2809,2900,3022 (update), 2917 (insert), 2965 (delete), 2992 (select)',
    ],
  },
  {
    table: 'service_provider_credentials',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/servicesEngineService.ts:1147,3122,3177,3195 (select), 3088 (insert), 3203 (update); no SQL DELETE call site',
    ],
  },
] as const;

const DATABASE = 'propertylistify_database';
const RUNTIME_USER = 'propertylistify_app_runtime';
const EXPECTED_TABLE_COUNT = 227;
const EXPECTED_MIGRATION_COUNT = 201;
const EXPECTED_HEAD = '0200_services_provider_credentials.sql';
const EXPECTED_MANIFEST_DIGEST =
  '19c5a60156f850cca36567ad47f00938d544070d89c309d870fd135289b0acc2';
const EXPECTED_MODEL_DIGEST =
  '4bf6f12700b27b86b5b38119223be245681a3c4ff1c1c1eccf555a65f49df23d';

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Creates a source-bound, offline-only delta for the 2 runtime tables added
 * after 0197. It never opens a connection and exposes no apply operation.
 */
export function runtimeGrant0200Plan(root = process.cwd()) {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tableCount: number; structuralDigest: string; tables: string[] };
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
  });
  const names = RUNTIME_GRANT_0200_TABLES.map(item => item.table);
  if (
    inventory.tableCount !== EXPECTED_TABLE_COUNT ||
    inventory.tables.length !== EXPECTED_TABLE_COUNT ||
    new Set(inventory.tables).size !== EXPECTED_TABLE_COUNT ||
    inventory.structuralDigest !== EXPECTED_MODEL_DIGEST ||
    manifest.document.expectedHead !== EXPECTED_HEAD ||
    manifest.orderedMigrations.length !== EXPECTED_MIGRATION_COUNT ||
    manifest.manifestDigest !== EXPECTED_MANIFEST_DIGEST ||
    names.length !== 2 ||
    new Set(names).size !== names.length ||
    names.some(name => !inventory.tables.includes(name))
  ) {
    throw new Error('0200 runtime grant plan refused: migration lineage or table inventory changed.');
  }

  const account = `'${RUNTIME_USER}'@'%'`;
  const grants = RUNTIME_GRANT_0200_TABLES.map(
    ({ table, privileges }) =>
      `GRANT ${privileges.join(', ')} ON \`${DATABASE}\`.\`${table}\` TO ${account}`,
  );
  // Exact inverse of a successful application of this plan. The pre-apply
  // probe establishes the baseline; MySQL does not allow GRANT OPTION in the
  // table-scoped ALL form, so no grant option is ever used.
  const revokes = RUNTIME_GRANT_0200_TABLES.map(
    ({ table, privileges }) =>
      `REVOKE ${privileges.join(', ')} ON \`${DATABASE}\`.\`${table}\` FROM ${account}`,
  );
  const binding = {
    planVersion: 1,
    operation: 'runtime-grant-plan-only' as const,
    database: DATABASE,
    identity: RUNTIME_USER,
    expectedHead: EXPECTED_HEAD,
    expectedMigrationCount: EXPECTED_MIGRATION_COUNT,
    manifestDigest: EXPECTED_MANIFEST_DIGEST,
    expectedTableCount: EXPECTED_TABLE_COUNT,
    expectedModelDigest: EXPECTED_MODEL_DIGEST,
    tables: RUNTIME_GRANT_0200_TABLES,
    revokes,
    grants,
    applyAuthority: 'none' as const,
    broadGrantNote:
      'Re-derive this plan if the live probe shows database-wide, global, role-derived, or other broad grants.',
  };
  return { ...binding, planDigest: sha256(binding) };
}

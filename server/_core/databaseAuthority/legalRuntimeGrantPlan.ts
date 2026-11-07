import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { B08_AZURE_TARGET_FINGERPRINT_HASH, B08_RUNTIME_IDENTITY } from './authorization';
import { buildIsolatedCiGrantPlan } from './isolatedCiCredentials';
import { runtimeGrant0197Plan } from './runtimeGrant0197Plan';

export const LEGAL_RUNTIME_GRANT_DATABASE = 'propertylistify_database';

/**
 * The three reviewed legal-acceptance grants. Runtime call sites (see PR body):
 * - legal_releases: SELECT (server/services/registrationLegalAcceptanceService.ts:65,70-74,113)
 * - legal_active_release: SELECT (registrationLegalAcceptanceService.ts:70-76,106-107)
 * - user_legal_acceptances: SELECT (registrationLegalAcceptanceService.ts:239-255), INSERT (:194); no UPDATE/DELETE
 */
export const LEGAL_RUNTIME_GRANT_TABLES = [
  { table: 'legal_releases', privileges: ['SELECT'] },
  { table: 'legal_active_release', privileges: ['SELECT'] },
  { table: 'user_legal_acceptances', privileges: ['SELECT', 'INSERT'] },
] as const;

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Offline, delta-based plan. It deliberately carries no predecessor grant list:
 * production holds leftover grants on dropped tables and the 0197 grants, so the
 * only safe invariant is "after == before + exactly these privileges".
 */
export function legalRuntimeGrantPlan(root = process.cwd()) {
  const source = runtimeGrant0197Plan(root); // validates head, manifest, model and table inventory
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables: string[] };
  const account = `'${B08_RUNTIME_IDENTITY}'@'%'`;
  const statements = LEGAL_RUNTIME_GRANT_TABLES.map(
    ({ table, privileges }) =>
      `GRANT ${privileges.join(', ')} ON \`${LEGAL_RUNTIME_GRANT_DATABASE}\`.\`${table}\` TO ${account}`,
  );
  const rollbackStatements = LEGAL_RUNTIME_GRANT_TABLES.map(
    ({ table, privileges }) =>
      `REVOKE ${privileges.join(', ')} ON \`${LEGAL_RUNTIME_GRANT_DATABASE}\`.\`${table}\` FROM ${account}`,
  );
  const reviewed = buildIsolatedCiGrantPlan({
    tables: LEGAL_RUNTIME_GRANT_TABLES.map(item => item.table),
    databaseName: LEGAL_RUNTIME_GRANT_DATABASE,
    roleUsers: {
      runtime: B08_RUNTIME_IDENTITY,
      worker: 'propertylistify_job_worker',
      'read-only': 'propertylistify_b08_inspector',
      migration: 'propertylistify_release_migrator',
    },
    runtimeLedgerRead: false,
  }).statementsByCredential.runtime;
  if (
    source.identity !== B08_RUNTIME_IDENTITY ||
    source.database !== LEGAL_RUNTIME_GRANT_DATABASE ||
    LEGAL_RUNTIME_GRANT_TABLES.some(({ table }) => !inventory.tables.includes(table)) ||
    JSON.stringify([...reviewed].sort()) !== JSON.stringify([...statements].sort())
  ) {
    throw new Error('Legal runtime grant plan refused: statements differ from the reviewed grants.');
  }
  const plannedPrivileges = LEGAL_RUNTIME_GRANT_TABLES.flatMap(({ table, privileges }) =>
    privileges.map(privilege => `\`${LEGAL_RUNTIME_GRANT_DATABASE}\`.\`${table}\`:${privilege}`),
  ).sort();
  const binding = {
    planVersion: 2,
    operation: 'runtime-legal-grant' as const,
    targetFingerprintHash: B08_AZURE_TARGET_FINGERPRINT_HASH,
    database: LEGAL_RUNTIME_GRANT_DATABASE,
    identity: B08_RUNTIME_IDENTITY,
    expectedHead: source.expectedHead,
    expectedMigrationCount: source.expectedMigrationCount,
    expectedModelDigest: source.expectedModelDigest,
    manifestDigest: source.manifestDigest,
    statements,
    rollbackStatements,
  };
  return { ...binding, plannedPrivileges, planDigest: sha256(binding) };
}

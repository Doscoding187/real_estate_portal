import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalPlaceRuntimeGrantPlan } from './canonicalPlaceRuntimeGrants';
import { buildIsolatedCiGrantPlan } from './isolatedCiCredentials';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { stableDigest } from './dataAdapters/common';

/** Offline permission delta only. This never connects or executes a GRANT and
 * does not extend the authority of the retained pre-B15 grant operation. */
export function legalRuntimeGrantPlan(root = process.cwd()) {
  const before = canonicalPlaceRuntimeGrantPlan(root);
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tables: string[]; structuralDigest: string };
  if (inventory.tables.length !== 224 || new Set(inventory.tables).size !== 224)
    throw new Error('B15 grant preparation requires the reviewed 224-table inventory');
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
  });
  if (manifest.document.expectedHead !== '0115_non_geographic_place_search_eligibility.sql')
    throw new Error('B15 grant preparation head changed; review the next authority');
  const full = buildIsolatedCiGrantPlan({
    tables: ['legal_releases', 'legal_active_release', 'user_legal_acceptances'],
    databaseName: before.database,
    roleUsers: {
      runtime: before.identity,
      worker: 'propertylistify_job_worker',
      'read-only': 'propertylistify_b08_inspector',
      migration: 'propertylistify_release_migrator',
    },
    runtimeLedgerRead: false,
  });
  const statements = full.statementsByCredential.runtime;
  if (
    statements.length !== 3 ||
    !statements.includes(
      `GRANT SELECT ON \`${before.database}\`.\`legal_releases\` TO '${before.identity}'@'%'`,
    ) ||
    !statements.includes(
      `GRANT SELECT ON \`${before.database}\`.\`legal_active_release\` TO '${before.identity}'@'%'`,
    ) ||
    !statements.includes(
      `GRANT SELECT, INSERT ON \`${before.database}\`.\`user_legal_acceptances\` TO '${before.identity}'@'%'`,
    )
  )
    throw new Error('B15 grant preparation differs from the three reviewed least-privilege grants');
  const binding = {
    executionState: 'prepared_not_applied' as const,
    targetFingerprintHash: before.targetFingerprintHash,
    database: before.database,
    identity: before.identity,
    expectedHead: manifest.document.expectedHead,
    manifestDigest: manifest.manifestDigest,
    expectedModelDigest: inventory.structuralDigest,
    previousGrantDigest: before.resultingGrantDigest,
    resultingGrantDigest: stableDigest([...before.after, ...statements].sort()),
    statements,
    protectedApplyAuthority: 'not_granted_by_this_offline_plan' as const,
  };
  return { ...binding, planDigest: stableDigest(binding) };
}

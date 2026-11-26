import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '../../../drizzle/schema';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { normalizedDesiredSchema } from './schemaCongruency';

export const RUNTIME_GRANT_0197_TABLES = [
  {
    table: 'development_inventory_items',
    privileges: ['SELECT'],
    callSites: ['drizzle/schema/developments.ts:850 (table declaration; no runtime call site found)'],
  },
  {
    table: 'development_place_assignments',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/developmentPlaceAssignmentService.ts:126,171,185',
      'server/services/developmentSalesProjectionService.ts:435-443',
    ],
  },
  {
    table: 'development_team_contacts',
    privileges: ['SELECT'],
    callSites: ['server/services/developmentSalesProjectionService.ts:435-443'],
  },
  {
    table: 'distribution_deal_document_deliveries',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: ['server/services/distributionDealDocumentsService.ts:1207,1231,1502'],
  },
  {
    table: 'distribution_listing_lead_queue',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/distributionListingLeadQueueService.ts:16-22',
      'server/distributionRouter.ts:4824,4966,5043,5103',
    ],
  },
  {
    table: 'distribution_listing_lead_queue_events',
    privileges: ['SELECT', 'INSERT'],
    callSites: [
      'server/services/distributionListingLeadQueueService.ts:30',
      'server/distributionRouter.ts:4864,4974,5052,5115',
    ],
  },
  {
    table: 'distribution_prospect_check_fit_matches',
    privileges: ['SELECT', 'INSERT', 'DELETE'],
    callSites: ['server/services/distributionProspectCheckFitService.ts:289-296,360-365'],
  },
  {
    table: 'distribution_prospect_check_fits',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: ['server/services/distributionProspectCheckFitService.ts:243-296,514-521'],
  },
  {
    table: 'distribution_referral_intake_events',
    privileges: ['SELECT', 'INSERT'],
    callSites: [
      'server/services/distributionReferralIntakeWorkflowService.ts:220,356,633',
      'server/services/distributionReferralEvidenceRetentionService.ts:121,251,295',
    ],
  },
  {
    table: 'distribution_referral_intake_evidence',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/distributionReferralIntakeWorkflowService.ts:336,630',
      'server/services/distributionReferralEvidenceRetentionService.ts:201,227,277',
    ],
  },
  {
    table: 'distribution_referral_intake_policy_releases',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/distributionReferralIntakePolicy.ts:84,167,193,256',
      'server/services/distributionReferralIntakeWorkflowService.ts:129',
    ],
  },
  {
    table: 'distribution_referral_intake_sessions',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: [
      'server/services/distributionReferralIntakeWorkflowService.ts:205,215,621,771',
      'server/services/distributionReferralEvidenceRetentionService.ts:106',
    ],
  },
  {
    table: 'distribution_referrer_search_assessments',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: ['server/services/distributionReferrerSearchAssessmentService.ts:178,198,263,297'],
  },
  {
    table: 'distribution_selected_practitioners',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: ['server/distributionRouter.ts:1697,1764-1779 (upsert/onDuplicateKeyUpdate)'],
  },
  {
    table: 'service_provider_review_reports',
    privileges: ['SELECT', 'INSERT', 'UPDATE'],
    callSites: ['server/services/servicesEngineService.ts:1548,1579,1752'],
  },
] as const;

const DATABASE = 'propertylistify_database';
const RUNTIME_USER = 'propertylistify_app_runtime';
const EXPECTED_TABLE_COUNT = 225;
const EXPECTED_MIGRATION_COUNT = 198;
const EXPECTED_HEAD = '0197_drop_seller_prospects_province.sql';
const EXPECTED_MANIFEST_DIGEST =
  '4995e36715e60856bb87d925dd0eff03bcdccfcc50e1180648684c3bd2787e41';
const EXPECTED_MODEL_DIGEST =
  '869f441f3131b0f1bf4b56d416d049292bb48204918f8172d3699625c3208da7';

// Tables added by migrations after 0197 (0199, 0200). Set aside when checking
// that the 0197 table inventory is intact in a later-head tree.
const LATER_ADDITIVE_TABLES = ['service_provider_projects', 'service_provider_credentials'] as const;
// sha256(JSON of [filename, checksum] for the first 198 migrations, 0000-0197).
const EXPECTED_PREFIX_DIGEST =
  '6b7f1da01c6bb2281e4eb5a0363b1d8480428830ec7f944773fca41b18efaf50';
// sha256(JSON of the sorted 225-table inventory at 0197).
const EXPECTED_TABLE_LIST_DIGEST =
  'a0c9c6362479492a794faed8e086c1342a88aab7f1918358db755f62aa8101a2';

// sha256(JSON of the normalized definitions of the 15 granted tables, sorted by
// name). Unchanged since 0197: later windows add only unrelated tables/columns.
const EXPECTED_GRANTED_TABLES_DIGEST =
  'e05e16cde6b4be3996564144583bbb7f604c2c68f1de2021039eeaaf8e52bd05';

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Creates a source-bound, offline-only delta for the 15 runtime tables not
 * covered by the 0094/0111/0115 grant plans. It never opens a connection and
 * deliberately exposes no apply operation.
 */
export function runtimeGrant0197Plan(
  root = process.cwd(),
  options: { desiredTables?: ReadonlyArray<{ name: string }> } = {},
) {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tableCount: number; structuralDigest: string; tables: string[] };
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
  });
  const names = RUNTIME_GRANT_0197_TABLES.map(item => item.table);
  // Closed-release check at the 0197 head: the whole tree is the 0197 tree.
  const exactAtHead =
    inventory.tableCount === EXPECTED_TABLE_COUNT &&
    inventory.tables.length === EXPECTED_TABLE_COUNT &&
    new Set(inventory.tables).size === EXPECTED_TABLE_COUNT &&
    inventory.structuralDigest === EXPECTED_MODEL_DIGEST &&
    manifest.document.expectedHead === EXPECTED_HEAD &&
    manifest.orderedMigrations.length === EXPECTED_MIGRATION_COUNT &&
    manifest.manifestDigest === EXPECTED_MANIFEST_DIGEST;
  // Lineage-prefix check once later additive windows (0198+) extend the tree:
  // the first 198 migrations must be byte-identical (filename + checksum), the
  // next migration must descend from the 0197 head, and the 0197 table set must
  // be intact once the known later tables are set aside.
  const ordered = manifest.orderedMigrations;
  const laterTables = new Set<string>(LATER_ADDITIVE_TABLES);
  const originalTables = inventory.tables.filter(table => !laterTables.has(table)).sort();
  const successorOfHead =
    !exactAtHead &&
    ordered.length > EXPECTED_MIGRATION_COUNT &&
    ordered[EXPECTED_MIGRATION_COUNT - 1].filename === EXPECTED_HEAD &&
    sha256(
      ordered.slice(0, EXPECTED_MIGRATION_COUNT).map(entry => [entry.filename, entry.checksum]),
    ) === EXPECTED_PREFIX_DIGEST &&
    ordered[EXPECTED_MIGRATION_COUNT].parent === EXPECTED_HEAD &&
    ordered[EXPECTED_MIGRATION_COUNT].parentChecksum ===
      ordered[EXPECTED_MIGRATION_COUNT - 1].checksum &&
    inventory.tableCount === inventory.tables.length &&
    new Set(inventory.tables).size === inventory.tables.length &&
    originalTables.length === EXPECTED_TABLE_COUNT &&
    sha256(originalTables) === EXPECTED_TABLE_LIST_DIGEST &&
    // The 15 granted tables must still have their 0197 structure (later windows
    // only add tables or columns elsewhere).
    sha256(
      (options.desiredTables ?? normalizedDesiredSchema(schema).tables)
        .filter(table => (names as string[]).includes(table.name))
        .sort((left, right) => left.name.localeCompare(right.name)),
    ) === EXPECTED_GRANTED_TABLES_DIGEST;
  if (
    !(exactAtHead || successorOfHead) ||
    names.length !== 15 ||
    new Set(names).size !== names.length ||
    names.some(name => !inventory.tables.includes(name))
  ) {
    throw new Error('0197 runtime grant plan refused: migration lineage or table inventory changed.');
  }

  const account = `'${RUNTIME_USER}'@'%'`;
  const grants = RUNTIME_GRANT_0197_TABLES.map(
    ({ table, privileges }) =>
      `GRANT ${privileges.join(', ')} ON \`${DATABASE}\`.\`${table}\` TO ${account}`,
  );
  // Table-level cleanup only. Database/global grants, role grants, and grants
  // on tables outside this delta are intentionally outside this offline plan.
  // Exact inverse for a successful application of this plan. The pre-apply
  // probe must establish the baseline first; if any listed privilege already
  // exists directly, derive a delta plan and its inverse from that baseline.
  // MySQL does not allow GRANT OPTION in the table-scoped ALL form.
  const revokes = RUNTIME_GRANT_0197_TABLES.map(
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
    tables: RUNTIME_GRANT_0197_TABLES,
    revokes,
    grants,
    applyAuthority: 'none' as const,
    broadGrantNote:
      'Re-derive this plan if the live probe shows database-wide, global, role-derived, or other broad grants.',
  };
  return { ...binding, planDigest: sha256(binding) };
}

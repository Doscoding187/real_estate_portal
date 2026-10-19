import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import { assessAuthorizedDatabaseReadiness } from '../readiness';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  assertDistributionReferrerPreviewUser,
  DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
} from './distributionReferrerPreviewFixture';

export const DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION =
  'distribution-referrer-activity-preview-v1' as const;

const EXPECTED_MANAGER = Object.freeze({
  openId: 'distribution-referrer-activity-manager-v1',
  email: 'preview-sales-manager@listify.local',
  name: 'Preview Sales Manager',
  firstName: 'Preview',
  lastName: 'Manager',
  role: 'visitor',
});

const EXPECTED_DEVELOPMENT = Object.freeze({
  slug: 'distribution-preview-ridge-estate-v1',
  name: 'Preview Ridge Estate',
  developmentType: 'residential',
  city: 'Midrand',
  province: 'Gauteng',
  suburb: 'Waterfall',
});

const EXPECTED_PROGRAM = Object.freeze({
  isReferralEnabled: 1,
  isActive: 1,
  tierAccessPolicy: 'restricted',
  defaultCommissionAmount: 25000,
  currencyCode: 'ZAR',
});

const EXPECTED_DEAL = Object.freeze({
  buyerName: 'Preview Prospect',
  currentStage: 'viewing_scheduled',
  dealAmount: 2500000,
  commissionBaseAmount: 2500000,
  referrerCommissionType: 'percentage',
  referrerCommissionValue: '1.00',
  referrerCommissionBasis: 'sale_price',
  referrerCommissionAmount: 25000,
});

const EXPECTED_VIEWING = Object.freeze({
  status: 'scheduled',
  timezone: 'Africa/Johannesburg',
  locationName: 'Preview Ridge Estate Showhouse',
  leadDays: 14,
  durationHours: 1,
});

const EXPECTED_COMMISSION_ENTRY = Object.freeze({
  triggerStage: 'contract_signed',
  entryStatus: 'pending',
  calculationBaseAmount: 2500000,
  commissionPercent: '1.00',
  commissionAmount: 25000,
  currency: 'ZAR',
});

const FIXTURE_PAYLOAD = Object.freeze({
  version: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
  scope: 'referrer-dashboard-sample-activity-only',
  dependency: {
    openId: DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
    email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  },
  manager: EXPECTED_MANAGER,
  development: EXPECTED_DEVELOPMENT,
  program: EXPECTED_PROGRAM,
  deal: EXPECTED_DEAL,
  viewing: EXPECTED_VIEWING,
  commissionEntry: EXPECTED_COMMISSION_ENTRY,
});

export const DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';
type ViewingState = PreparedState | 'rescheduled';

export type DistributionReferrerActivityPreviewEvidence = AdapterEvidence & {
  fixture: typeof DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION;
  account: { userId: number; email: typeof DISTRIBUTION_REFERRER_PREVIEW_EMAIL };
  prepared: {
    manager: PreparedState;
    development: PreparedState;
    program: PreparedState;
    deal: PreparedState;
    viewing: ViewingState;
    commissionEntry: PreparedState;
  };
  sample: {
    developmentId: number;
    programId: number;
    dealId: number;
    viewingId: number;
    commissionEntryId: number;
    viewingScheduledStartAt: string;
  };
  verified: {
    migrationHead: string;
    schemaCongruent: true;
    referrerAccount: true;
    sampleDevelopmentUnpublished: true;
    restrictedReferralProgram: true;
    sampleDeal: true;
    upcomingViewingScheduled: true;
    potentialPayoutPending: true;
    noProgramGrant: true;
    noLedgerOrValidation: true;
  };
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`Distribution referrer activity preview fixture conflicts at ${label}.`);
  }
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`Distribution referrer activity preview fixture has duplicate ${label} rows.`);
  }
  return rows[0] ?? null;
}

function asPositiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Distribution referrer activity preview fixture has an invalid ${label}.`);
  }
  return id;
}

function mysqlTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function scheduledStartInfo(value: unknown): { text: string; ms: number } {
  if (value instanceof Date) {
    return { text: value.toISOString(), ms: value.getTime() };
  }
  const text = String(value ?? '').trim();
  if (!text) return { text: '', ms: Number.NaN };
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  return { text, ms: Date.parse(normalized) };
}

function viewingWindow(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getTime() + EXPECTED_VIEWING.leadDays * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + EXPECTED_VIEWING.durationHours * 60 * 60 * 1000);
  return { start: mysqlTimestamp(start), end: mysqlTimestamp(end) };
}

export function assertDistributionReferrerActivityPreviewTarget(
  authority: ResolvedDatabaseAuthority,
): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== 'disposable-worktree' ||
    context.host !== '127.0.0.1' ||
    context.port !== '3307' ||
    context.databaseName !== context.worktree.expectedDatabase ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'Distribution referrer activity preview fixture refused: an exact owned localhost disposable worktree database is required.',
    );
  }
}

export function assertDistributionReferrerActivityDependency(row: Row | null): void {
  if (!row) {
    throw new Error(
      'Distribution referrer activity preview fixture refused: run db:distribution-referrer-preview:prepare first.',
    );
  }
  assertDistributionReferrerPreviewUser(row);
}

export function assertDistributionReferrerActivityManager(row: Row): void {
  requireExact(rowValue(row, 'openId'), EXPECTED_MANAGER.openId, 'manager openId');
  requireExact(rowValue(row, 'email'), EXPECTED_MANAGER.email, 'manager email');
  requireExact(rowValue(row, 'name'), EXPECTED_MANAGER.name, 'manager name');
  requireExact(rowValue(row, 'firstName'), EXPECTED_MANAGER.firstName, 'manager firstName');
  requireExact(rowValue(row, 'lastName'), EXPECTED_MANAGER.lastName, 'manager lastName');
  requireExact(rowValue(row, 'role'), EXPECTED_MANAGER.role, 'manager role');
}

export function classifyDistributionReferrerActivityManager(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityManager(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDevelopment(row: Row): void {
  requireExact(rowValue(row, 'slug'), EXPECTED_DEVELOPMENT.slug, 'development slug');
  requireExact(rowValue(row, 'name'), EXPECTED_DEVELOPMENT.name, 'development name');
  requireExact(
    rowValue(row, 'developmentType'),
    EXPECTED_DEVELOPMENT.developmentType,
    'development type',
  );
  requireExact(rowValue(row, 'city'), EXPECTED_DEVELOPMENT.city, 'development city');
  requireExact(rowValue(row, 'province'), EXPECTED_DEVELOPMENT.province, 'development province');
  requireExact(rowValue(row, 'suburb'), EXPECTED_DEVELOPMENT.suburb, 'development suburb');
  requireExact(rowValue(row, 'isPublished'), 0, 'development publication state');
  requireExact(rowValue(row, 'approval_status'), 'draft', 'development approval status');
}

export function classifyDistributionReferrerActivityDevelopment(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDevelopment(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityProgram(row: Row, developmentId: number): void {
  requireExact(rowValue(row, 'development_id'), developmentId, 'program development ID');
  requireExact(
    rowValue(row, 'is_referral_enabled'),
    EXPECTED_PROGRAM.isReferralEnabled,
    'program referral state',
  );
  requireExact(rowValue(row, 'is_active'), EXPECTED_PROGRAM.isActive, 'program active state');
  requireExact(
    rowValue(row, 'tier_access_policy'),
    EXPECTED_PROGRAM.tierAccessPolicy,
    'program tier access policy',
  );
  requireExact(
    rowValue(row, 'default_commission_amount'),
    EXPECTED_PROGRAM.defaultCommissionAmount,
    'program default commission amount',
  );
  requireExact(rowValue(row, 'currency_code'), EXPECTED_PROGRAM.currencyCode, 'program currency');
}

export function classifyDistributionReferrerActivityProgram(
  row: Row | null,
  developmentId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityProgram(row, developmentId);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDeal(
  row: Row,
  expected: {
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): void {
  requireExact(rowValue(row, 'program_id'), expected.programId, 'deal program ID');
  requireExact(rowValue(row, 'development_id'), expected.developmentId, 'deal development ID');
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'deal agent ID');
  requireExact(rowValue(row, 'manager_user_id'), expected.managerId, 'deal manager ID');
  requireExact(rowValue(row, 'buyer_name'), EXPECTED_DEAL.buyerName, 'deal buyer name');
  requireExact(rowValue(row, 'current_stage'), EXPECTED_DEAL.currentStage, 'deal stage');
  requireExact(rowValue(row, 'deal_amount'), EXPECTED_DEAL.dealAmount, 'deal amount');
  requireExact(
    rowValue(row, 'commission_base_amount'),
    EXPECTED_DEAL.commissionBaseAmount,
    'deal commission base amount',
  );
  requireExact(
    rowValue(row, 'referrer_commission_type'),
    EXPECTED_DEAL.referrerCommissionType,
    'deal referral commission type',
  );
  requireExact(
    rowValue(row, 'referrer_commission_value'),
    EXPECTED_DEAL.referrerCommissionValue,
    'deal referral commission value',
  );
  requireExact(
    rowValue(row, 'referrer_commission_basis'),
    EXPECTED_DEAL.referrerCommissionBasis,
    'deal referral commission basis',
  );
  requireExact(
    rowValue(row, 'referrer_commission_amount'),
    EXPECTED_DEAL.referrerCommissionAmount,
    'deal referral commission amount',
  );
}

export function classifyDistributionReferrerActivityDeal(
  row: Row | null,
  expected: {
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDeal(row, expected);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityViewing(
  row: Row,
  expected: {
    dealId: number;
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): void {
  requireExact(rowValue(row, 'deal_id'), expected.dealId, 'viewing deal ID');
  requireExact(rowValue(row, 'program_id'), expected.programId, 'viewing program ID');
  requireExact(rowValue(row, 'development_id'), expected.developmentId, 'viewing development ID');
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'viewing agent ID');
  requireExact(rowValue(row, 'manager_user_id'), expected.managerId, 'viewing manager ID');
  requireExact(rowValue(row, 'timezone'), EXPECTED_VIEWING.timezone, 'viewing timezone');
  requireExact(rowValue(row, 'location_name'), EXPECTED_VIEWING.locationName, 'viewing location');
  requireExact(rowValue(row, 'status'), EXPECTED_VIEWING.status, 'viewing status');
}

export function assertDistributionReferrerActivityCommissionEntry(
  row: Row,
  expected: { dealId: number; programId: number; developmentId: number; agentId: number },
): void {
  requireExact(rowValue(row, 'deal_id'), expected.dealId, 'commission entry deal ID');
  requireExact(rowValue(row, 'program_id'), expected.programId, 'commission entry program ID');
  requireExact(
    rowValue(row, 'development_id'),
    expected.developmentId,
    'commission entry development ID',
  );
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'commission entry agent ID');
  requireExact(
    rowValue(row, 'trigger_stage'),
    EXPECTED_COMMISSION_ENTRY.triggerStage,
    'commission entry trigger stage',
  );
  requireExact(
    rowValue(row, 'entry_status'),
    EXPECTED_COMMISSION_ENTRY.entryStatus,
    'commission entry status',
  );
  requireExact(
    rowValue(row, 'calculation_base_amount'),
    EXPECTED_COMMISSION_ENTRY.calculationBaseAmount,
    'commission entry calculation base',
  );
  requireExact(
    rowValue(row, 'commission_percent'),
    EXPECTED_COMMISSION_ENTRY.commissionPercent,
    'commission entry percent',
  );
  requireExact(
    rowValue(row, 'commission_amount'),
    EXPECTED_COMMISSION_ENTRY.commissionAmount,
    'commission entry amount',
  );
  requireExact(rowValue(row, 'currency'), EXPECTED_COMMISSION_ENTRY.currency, 'commission currency');
}

async function findReferrerUser(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone,
            loginMethod, emailVerified, role, agencyId, isSubaccount,
            onboarding_complete, onboarding_step
       FROM users
      WHERE email = ? OR openId = ?
      ORDER BY id`,
    [DISTRIBUTION_REFERRER_PREVIEW_EMAIL, DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID],
  );
  return requireOneOrNone(rows, 'individual referrer user');
}

async function findManagerUser(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, name, firstName, lastName, role
       FROM users
      WHERE email = ? OR openId = ?
      ORDER BY id`,
    [EXPECTED_MANAGER.email, EXPECTED_MANAGER.openId],
  );
  return requireOneOrNone(rows, 'sample manager user');
}

async function findDevelopment(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, name, slug, developmentType, city, province, suburb, isPublished, approval_status
       FROM developments
      WHERE slug = ?
      ORDER BY id`,
    [EXPECTED_DEVELOPMENT.slug],
  );
  return requireOneOrNone(rows, 'sample development');
}

async function findProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, development_id, is_referral_enabled, is_active, tier_access_policy,
            default_commission_amount, currency_code
       FROM distribution_programs
      WHERE development_id = ?
      ORDER BY id`,
    [developmentId],
  );
  return requireOneOrNone(rows, 'sample distribution program');
}

async function findDeal(
  connection: AuthoritySqlConnection,
  agentId: number,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, program_id, development_id, agent_id, manager_user_id, buyer_name,
            current_stage, deal_amount, commission_base_amount, referrer_commission_type,
            referrer_commission_value, referrer_commission_basis, referrer_commission_amount,
            commission_status
       FROM distribution_deals
      WHERE agent_id = ? AND development_id = ? AND buyer_name = ?
      ORDER BY id`,
    [agentId, developmentId, EXPECTED_DEAL.buyerName],
  );
  return requireOneOrNone(rows, 'sample distribution deal');
}

async function findViewing(
  connection: AuthoritySqlConnection,
  dealId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, deal_id, program_id, development_id, agent_id, manager_user_id,
            scheduled_start_at, scheduled_end_at, timezone, location_name, status, reschedule_count
       FROM distribution_viewings
      WHERE deal_id = ?
      ORDER BY id`,
    [dealId],
  );
  return requireOneOrNone(rows, 'sample distribution viewing');
}

async function findCommissionEntry(
  connection: AuthoritySqlConnection,
  dealId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, deal_id, program_id, development_id, agent_id, trigger_stage, entry_status,
            calculation_base_amount, commission_percent, commission_amount, currency
       FROM distribution_commission_entries
      WHERE deal_id = ? AND trigger_stage = ?
      ORDER BY id`,
    [dealId, EXPECTED_COMMISSION_ENTRY.triggerStage],
  );
  return requireOneOrNone(rows, 'sample commission entry');
}

async function insertIdOf(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[],
  label: string,
): Promise<number> {
  const result = await connection.execute(statement, values);
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | null);
  return asPositiveId(header?.insertId, `created ${label} ID`);
}

async function ensureManagerUser(
  connection: AuthoritySqlConnection,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findManagerUser(connection);
  const classification = classifyDistributionReferrerActivityManager(existing);
  if (existing) {
    return { id: asPositiveId(rowValue(existing, 'id'), 'manager user ID'), state: classification.state };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO users
      (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
       emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
       subscription_tier, subscription_status, agencyId, isSubaccount,
       passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
     VALUES (?, ?, NULL, ?, ?, ?, NULL, 'email', 1, ?, 'trial', 'active', 1, 0,
             'free', 'trial', NULL, 0, NULL, NULL, NULL)`,
    [
      EXPECTED_MANAGER.openId,
      EXPECTED_MANAGER.email,
      EXPECTED_MANAGER.name,
      EXPECTED_MANAGER.firstName,
      EXPECTED_MANAGER.lastName,
      EXPECTED_MANAGER.role,
    ],
    'manager user',
  );
  return { id, state: 'created' };
}

async function ensureDevelopment(
  connection: AuthoritySqlConnection,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDevelopment(connection);
  const classification = classifyDistributionReferrerActivityDevelopment(existing);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'development ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO developments
      (name, slug, developmentType, city, province, suburb, isPublished, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'draft')`,
    [
      EXPECTED_DEVELOPMENT.name,
      EXPECTED_DEVELOPMENT.slug,
      EXPECTED_DEVELOPMENT.developmentType,
      EXPECTED_DEVELOPMENT.city,
      EXPECTED_DEVELOPMENT.province,
      EXPECTED_DEVELOPMENT.suburb,
    ],
    'sample development',
  );
  return { id, state: 'created' };
}

async function ensureProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findProgram(connection, developmentId);
  const classification = classifyDistributionReferrerActivityProgram(existing, developmentId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'program ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_programs
      (development_id, is_referral_enabled, is_active, tier_access_policy,
       default_commission_amount, currency_code)
     VALUES (?, 1, 1, 'restricted', 25000, 'ZAR')`,
    [developmentId],
    'sample distribution program',
  );
  return { id, state: 'created' };
}

async function ensureDeal(
  connection: AuthoritySqlConnection,
  expected: { programId: number; developmentId: number; agentId: number; managerId: number },
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDeal(connection, expected.agentId, expected.developmentId);
  const classification = classifyDistributionReferrerActivityDeal(existing, expected);
  if (existing) {
    return { id: asPositiveId(rowValue(existing, 'id'), 'deal ID'), state: classification.state };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_deals
      (program_id, development_id, agent_id, manager_user_id, buyer_name, deal_amount,
       commission_base_amount, referrer_commission_type, referrer_commission_value,
       referrer_commission_basis, referrer_commission_amount, current_stage,
       commission_trigger_stage, commission_status)
     VALUES (?, ?, ?, ?, ?, 2500000, 2500000, 'percentage', '1.00', 'sale_price', 25000,
             'viewing_scheduled', 'contract_signed', 'not_ready')`,
    [
      expected.programId,
      expected.developmentId,
      expected.agentId,
      expected.managerId,
      EXPECTED_DEAL.buyerName,
    ],
    'sample distribution deal',
  );
  return { id, state: 'created' };
}

async function ensureViewing(
  connection: AuthoritySqlConnection,
  expected: {
    dealId: number;
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): Promise<{ id: number; state: ViewingState; scheduledStartAt: string }> {
  const existing = await findViewing(connection, expected.dealId);
  if (existing) {
    assertDistributionReferrerActivityViewing(existing, expected);
    const id = asPositiveId(rowValue(existing, 'id'), 'viewing ID');
    const scheduled = scheduledStartInfo(rowValue(existing, 'scheduled_start_at'));
    if (Number.isFinite(scheduled.ms) && scheduled.ms >= Date.now()) {
      return { id, state: 'reused', scheduledStartAt: scheduled.text };
    }
    const window = viewingWindow();
    await connection.execute(
      `UPDATE distribution_viewings
          SET scheduled_start_at = ?, scheduled_end_at = ?, reschedule_count = reschedule_count + 1
        WHERE id = ?`,
      [window.start, window.end, id],
    );
    return { id, state: 'rescheduled', scheduledStartAt: window.start };
  }

  const window = viewingWindow();
  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_viewings
      (deal_id, program_id, development_id, agent_id, manager_user_id, scheduled_start_at,
       scheduled_end_at, timezone, location_name, status, scheduled_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Africa/Johannesburg', ?, 'scheduled', ?)`,
    [
      expected.dealId,
      expected.programId,
      expected.developmentId,
      expected.agentId,
      expected.managerId,
      window.start,
      window.end,
      EXPECTED_VIEWING.locationName,
      expected.managerId,
    ],
    'sample distribution viewing',
  );
  return { id, state: 'created', scheduledStartAt: window.start };
}

async function ensureCommissionEntry(
  connection: AuthoritySqlConnection,
  expected: { dealId: number; programId: number; developmentId: number; agentId: number },
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findCommissionEntry(connection, expected.dealId);
  if (existing) {
    assertDistributionReferrerActivityCommissionEntry(existing, expected);
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'commission entry ID'),
      state: 'reused',
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_commission_entries
      (deal_id, program_id, development_id, agent_id, calculation_base_amount, commission_percent,
       commission_amount, currency, trigger_stage, entry_status)
     VALUES (?, ?, ?, ?, 2500000, '1.00', 25000, 'ZAR', 'contract_signed', 'pending')`,
    [expected.dealId, expected.programId, expected.developmentId, expected.agentId],
    'sample commission entry',
  );
  return { id, state: 'created' };
}

async function assertNoProgramGrantOrAgentProfile(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<void> {
  const agents = await queryRows(connection, 'SELECT id FROM agents WHERE userId = ? ORDER BY id', [
    userId,
  ]);
  if (agents.length) {
    throw new Error('Distribution referrer activity preview fixture refuses an agent profile.');
  }
  const grants = await queryRows(
    connection,
    'SELECT id FROM distribution_agent_access WHERE agent_id = ? ORDER BY id',
    [userId],
  );
  if (grants.length) {
    throw new Error('Distribution referrer activity preview fixture refuses program grants.');
  }
}

async function requireCurrentCongruentSchema(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  migrationHead: string;
}): Promise<void> {
  const readiness = await assessAuthorizedDatabaseReadiness({
    authority: input.authority,
    connection: input.connection,
    authorization: input.decision,
  });
  if (
    readiness.layers.targetConnectivity.state !== 'ready' ||
    readiness.layers.migrationHead.state !== 'ready' ||
    readiness.layers.schemaCongruent.state !== 'ready'
  ) {
    throw new Error(
      `Distribution referrer activity preview fixture refused: exact target, current migration head ${input.migrationHead}, and schema congruency are required.`,
    );
  }
}

async function verifyFixture(input: {
  connection: AuthoritySqlConnection;
  referrerUserId: number;
  migrationHead: string;
}): Promise<{
  verified: DistributionReferrerActivityPreviewEvidence['verified'];
  sample: DistributionReferrerActivityPreviewEvidence['sample'];
}> {
  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  requireExact(rowValue(referrer!, 'id'), input.referrerUserId, 'referrer user ID');
  await assertNoProgramGrantOrAgentProfile(input.connection, input.referrerUserId);

  const manager = await findManagerUser(input.connection);
  if (!manager) throw new Error('Distribution referrer activity preview fixture manager is missing.');
  assertDistributionReferrerActivityManager(manager);
  const managerId = asPositiveId(rowValue(manager, 'id'), 'manager user ID');

  const development = await findDevelopment(input.connection);
  if (!development) {
    throw new Error('Distribution referrer activity preview fixture development is missing.');
  }
  assertDistributionReferrerActivityDevelopment(development);
  const developmentId = asPositiveId(rowValue(development, 'id'), 'development ID');

  const program = await findProgram(input.connection, developmentId);
  if (!program) throw new Error('Distribution referrer activity preview fixture program is missing.');
  assertDistributionReferrerActivityProgram(program, developmentId);
  const programId = asPositiveId(rowValue(program, 'id'), 'program ID');

  const deal = await findDeal(input.connection, input.referrerUserId, developmentId);
  if (!deal) throw new Error('Distribution referrer activity preview fixture deal is missing.');
  assertDistributionReferrerActivityDeal(deal, {
    programId,
    developmentId,
    agentId: input.referrerUserId,
    managerId,
  });
  const dealId = asPositiveId(rowValue(deal, 'id'), 'deal ID');

  const viewing = await findViewing(input.connection, dealId);
  if (!viewing) throw new Error('Distribution referrer activity preview fixture viewing is missing.');
  assertDistributionReferrerActivityViewing(viewing, {
    dealId,
    programId,
    developmentId,
    agentId: input.referrerUserId,
    managerId,
  });
  const viewingId = asPositiveId(rowValue(viewing, 'id'), 'viewing ID');
  const scheduled = scheduledStartInfo(rowValue(viewing, 'scheduled_start_at'));
  if (!Number.isFinite(scheduled.ms) || scheduled.ms < Date.now()) {
    throw new Error('Distribution referrer activity preview fixture viewing is not upcoming.');
  }

  const entry = await findCommissionEntry(input.connection, dealId);
  if (!entry) {
    throw new Error('Distribution referrer activity preview fixture commission entry is missing.');
  }
  assertDistributionReferrerActivityCommissionEntry(entry, {
    dealId,
    programId,
    developmentId,
    agentId: input.referrerUserId,
  });
  const commissionEntryId = asPositiveId(rowValue(entry, 'id'), 'commission entry ID');

  const validations = await queryRows(
    input.connection,
    'SELECT id FROM distribution_viewing_validations WHERE deal_id = ? ORDER BY id',
    [dealId],
  );
  const ledger = await queryRows(
    input.connection,
    'SELECT id FROM distribution_commission_ledger WHERE distribution_deal_id = ? ORDER BY id',
    [dealId],
  );
  if (validations.length || ledger.length) {
    throw new Error(
      'Distribution referrer activity preview fixture refuses sample validation or ledger rows.',
    );
  }

  return {
    verified: {
      migrationHead: input.migrationHead,
      schemaCongruent: true,
      referrerAccount: true,
      sampleDevelopmentUnpublished: true,
      restrictedReferralProgram: true,
      sampleDeal: true,
      upcomingViewingScheduled: true,
      potentialPayoutPending: true,
      noProgramGrant: true,
      noLedgerOrValidation: true,
    },
    sample: {
      developmentId,
      programId,
      dealId,
      viewingId,
      commissionEntryId,
      viewingScheduledStartAt: scheduled.text,
    },
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'distribution-referrer-activity-preview',
    version: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    digest: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
  };
}

export async function prepareDistributionReferrerActivityPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerActivityPreviewEvidence> {
  assertOperation(input.decision, ['demo-seed']);
  assertDistributionReferrerActivityPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });

  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  const referrerUserId = asPositiveId(rowValue(referrer!, 'id'), 'referrer user ID');

  const prepared = await withTransaction(input.connection, async () => {
    const manager = await ensureManagerUser(input.connection);
    const development = await ensureDevelopment(input.connection);
    const program = await ensureProgram(input.connection, development.id);
    const deal = await ensureDeal(input.connection, {
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
      managerId: manager.id,
    });
    const viewing = await ensureViewing(input.connection, {
      dealId: deal.id,
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
      managerId: manager.id,
    });
    const commissionEntry = await ensureCommissionEntry(input.connection, {
      dealId: deal.id,
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
    });
    return { manager, development, program, deal, viewing, commissionEntry };
  });

  const result = await verifyFixture({
    connection: input.connection,
    referrerUserId,
    migrationHead: manifest.document.expectedHead,
  });

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    account: { userId: referrerUserId, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    prepared: {
      manager: prepared.manager.state,
      development: prepared.development.state,
      program: prepared.program.state,
      deal: prepared.deal.state,
      viewing: prepared.viewing.state,
      commissionEntry: prepared.commissionEntry.state,
    },
    sample: result.sample,
    verified: result.verified,
  };
}

export async function verifyDistributionReferrerActivityPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerActivityPreviewEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertDistributionReferrerActivityPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });

  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  const referrerUserId = asPositiveId(rowValue(referrer!, 'id'), 'referrer user ID');

  const result = await verifyFixture({
    connection: input.connection,
    referrerUserId,
    migrationHead: manifest.document.expectedHead,
  });

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    account: { userId: referrerUserId, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    prepared: {
      manager: 'reused',
      development: 'reused',
      program: 'reused',
      deal: 'reused',
      viewing: 'reused',
      commissionEntry: 'reused',
    },
    sample: result.sample,
    verified: result.verified,
  };
}

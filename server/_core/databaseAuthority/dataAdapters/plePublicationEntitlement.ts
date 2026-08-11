import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import {
  ACCEPTED_MIGRATION_HEAD,
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import type { ResolvedDatabaseAuthority } from '../types';
import { getDb } from '../../../db-connection';
import {
  assertListingPublicationEntitled,
  resolveListingCommercialOwner,
} from '../../../services/listingPublicationEntitlementService';

export const PLE_PUBLICATION_ENTITLEMENT_VERSION = 'ple-publication-entitlement-v1' as const;
export const PLE_PUBLICATION_ENTITLEMENT_FIXTURE = 'ple-publication-acceptance' as const;
export const PLE_PUBLICATION_ENTITLEMENT_PLAN_NAME =
  'listing_preview_agency_acceptance_v1' as const;

export const PLE_PUBLICATION_ENTITLEMENT_TARGET = Object.freeze({
  host: '127.0.0.1',
  port: '3307',
  databaseName: 'listify_wt_mvp_customer_journey_fbdb0f964b36',
});

export const PLE_PUBLICATION_ENTITLEMENT_IDENTITIES = Object.freeze({
  listingId: 1,
  ownerKind: 'agency' as const,
  agencyId: 990002,
  responsibleAgentId: 990002,
  administratorUserId: 990003,
});

const FIXTURE_METADATA = Object.freeze({
  fixture: PLE_PUBLICATION_ENTITLEMENT_FIXTURE,
  environment: 'local-disposable',
  commercial: false,
});

const PLAN_EXPECTED = Object.freeze({
  name: PLE_PUBLICATION_ENTITLEMENT_PLAN_NAME,
  displayName: 'Listing Preview Agency Acceptance',
  segment: 'agency',
  isActive: 1,
  price: 0,
  priceMonthly: 0,
  currency: 'ZAR',
  interval: 'month',
  trialDays: 0,
  isPopular: 0,
  sortOrder: 9999,
  metadata: FIXTURE_METADATA,
});

const ENTITLEMENT_EXPECTED = Object.freeze({
  featureKey: 'max_active_listings',
  value: 1,
});

const SUBSCRIPTION_EXPECTED = Object.freeze({
  ownerType: 'agency',
  ownerId: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId,
  status: 'active',
  cancelAtPeriodEnd: 0,
  createdBy: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.administratorUserId,
  updatedBy: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.administratorUserId,
  metadata: FIXTURE_METADATA,
});

const FIXTURE_PAYLOAD = Object.freeze({
  version: PLE_PUBLICATION_ENTITLEMENT_VERSION,
  target: PLE_PUBLICATION_ENTITLEMENT_TARGET,
  identities: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES,
  plan: PLAN_EXPECTED,
  entitlement: ENTITLEMENT_EXPECTED,
  subscription: SUBSCRIPTION_EXPECTED,
});

export const PLE_PUBLICATION_ENTITLEMENT_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';

export type PlePublicationEntitlementEvidence = AdapterEvidence & {
  fixture: typeof PLE_PUBLICATION_ENTITLEMENT_VERSION;
  target: typeof PLE_PUBLICATION_ENTITLEMENT_TARGET;
  authorizedListing: typeof PLE_PUBLICATION_ENTITLEMENT_IDENTITIES;
  prepared: {
    plan: PreparedState;
    entitlement: PreparedState;
    subscription: PreparedState;
  };
  verified: {
    exactTarget: true;
    migrationHead: typeof ACCEPTED_MIGRATION_HEAD;
    listingCommercialOwner: true;
    agencyProfile: true;
    agencyBranding: true;
    plan: true;
    maxActiveListings: 1;
    subscription: true;
    unrelatedOwnersUntouched: true;
    fixtureInvoices: 0;
    fixturePayments: 0;
    publicationEntitled?: true;
  };
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function asId(row: Row, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`PLE publication entitlement fixture has an invalid ${label} ID.`);
  }
  return id;
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`PLE publication entitlement fixture has duplicate ${label} rows.`);
  }
  return rows[0] ?? null;
}

function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`PLE publication entitlement fixture conflicts at ${label}.`);
  }
}

function requireJson(value: unknown, expected: unknown, label: string): void {
  if (canonicalJson(parseJson(value)) !== canonicalJson(expected)) {
    throw new Error(`PLE publication entitlement fixture conflicts at ${label}.`);
  }
}

function timestampMs(value: unknown): number | null {
  if (!value) return null;
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function assertPlePublicationEntitlementTarget(authority: ResolvedDatabaseAuthority): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== 'disposable-worktree' ||
    context.host !== PLE_PUBLICATION_ENTITLEMENT_TARGET.host ||
    context.port !== PLE_PUBLICATION_ENTITLEMENT_TARGET.port ||
    context.databaseName !== PLE_PUBLICATION_ENTITLEMENT_TARGET.databaseName ||
    context.worktree.expectedDatabase !== PLE_PUBLICATION_ENTITLEMENT_TARGET.databaseName ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'PLE publication entitlement fixture refused: target is not the exact authorized disposable PLE worktree database.',
    );
  }
}

export function assertPleFixturePlanRow(row: Row): number {
  requireExact(rowValue(row, 'name'), PLAN_EXPECTED.name, 'plan name');
  requireExact(rowValue(row, 'display_name'), PLAN_EXPECTED.displayName, 'plan displayName');
  requireExact(rowValue(row, 'segment'), PLAN_EXPECTED.segment, 'plan segment');
  requireExact(rowValue(row, 'is_active'), PLAN_EXPECTED.isActive, 'plan isActive');
  requireExact(rowValue(row, 'price'), PLAN_EXPECTED.price, 'plan price');
  requireExact(rowValue(row, 'price_monthly'), PLAN_EXPECTED.priceMonthly, 'plan priceMonthly');
  requireExact(rowValue(row, 'currency'), PLAN_EXPECTED.currency, 'plan currency');
  requireExact(rowValue(row, 'billing_interval'), PLAN_EXPECTED.interval, 'plan interval');
  requireExact(rowValue(row, 'trial_days'), PLAN_EXPECTED.trialDays, 'plan trialDays');
  requireExact(rowValue(row, 'is_popular'), PLAN_EXPECTED.isPopular, 'plan isPopular');
  requireExact(rowValue(row, 'sort_order'), PLAN_EXPECTED.sortOrder, 'plan sortOrder');
  requireJson(rowValue(row, 'metadata'), PLAN_EXPECTED.metadata, 'plan metadata');
  return asId(row, 'plan');
}

export function classifyPleFixturePlan(rows: Row[]): { state: PreparedState; planId?: number } {
  const existing = requireOneOrNone(rows, 'fixture plan');
  if (!existing) return { state: 'created' };
  return { state: 'reused', planId: assertPleFixturePlanRow(existing) };
}

export function assertPleFixtureEntitlementRow(row: Row, planId: number): void {
  requireExact(rowValue(row, 'plan_id'), planId, 'entitlement plan');
  requireExact(rowValue(row, 'feature_key'), ENTITLEMENT_EXPECTED.featureKey, 'entitlement key');
  const value = parseJson(rowValue(row, 'value_json'));
  if (typeof value !== 'number' || value !== ENTITLEMENT_EXPECTED.value) {
    throw new Error(
      'PLE publication entitlement fixture conflicts at max_active_listings entitlement.',
    );
  }
}

export function classifyPleFixtureEntitlement(
  rows: Row[],
  planId: number,
): { state: PreparedState } {
  const existing = requireOneOrNone(rows, 'fixture entitlement');
  if (!existing) return { state: 'created' };
  assertPleFixtureEntitlementRow(existing, planId);
  return { state: 'reused' };
}

export function assertPleFixtureSubscriptionRow(row: Row, planId: number, now = new Date()): void {
  requireExact(
    rowValue(row, 'owner_type'),
    SUBSCRIPTION_EXPECTED.ownerType,
    'subscription ownerType',
  );
  requireExact(rowValue(row, 'owner_id'), SUBSCRIPTION_EXPECTED.ownerId, 'subscription ownerId');
  requireExact(rowValue(row, 'plan_id'), planId, 'subscription plan');
  requireExact(rowValue(row, 'status'), SUBSCRIPTION_EXPECTED.status, 'subscription status');
  requireExact(
    rowValue(row, 'cancel_at_period_end'),
    SUBSCRIPTION_EXPECTED.cancelAtPeriodEnd,
    'subscription cancelAtPeriodEnd',
  );
  requireExact(
    rowValue(row, 'created_by'),
    SUBSCRIPTION_EXPECTED.createdBy,
    'subscription createdBy',
  );
  requireExact(
    rowValue(row, 'updated_by'),
    SUBSCRIPTION_EXPECTED.updatedBy,
    'subscription updatedBy',
  );
  requireJson(rowValue(row, 'metadata'), SUBSCRIPTION_EXPECTED.metadata, 'subscription metadata');

  if (!timestampMs(rowValue(row, 'current_period_start'))) {
    throw new Error(
      'PLE publication entitlement fixture conflicts at subscription currentPeriodStart.',
    );
  }
  const currentPeriodEnd = timestampMs(rowValue(row, 'current_period_end'));
  if (!currentPeriodEnd || currentPeriodEnd <= now.getTime()) {
    throw new Error('PLE publication entitlement fixture subscription period is not future-dated.');
  }
}

export function classifyPleFixtureSubscription(
  rows: Row[],
  planId: number,
  now = new Date(),
): { state: PreparedState } {
  const existing = requireOneOrNone(rows, 'agency subscription');
  if (!existing) return { state: 'created' };
  assertPleFixtureSubscriptionRow(existing, planId, now);
  return { state: 'reused' };
}

async function findFixturePlan(connection: AuthoritySqlConnection): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, name, displayName AS display_name, segment, isActive AS is_active,
              price, price_monthly, currency, \`interval\` AS billing_interval,
              trial_days, isPopular AS is_popular, sortOrder AS sort_order, metadata
         FROM plans
        WHERE name = ?
        ORDER BY id`,
      [PLE_PUBLICATION_ENTITLEMENT_PLAN_NAME],
    ),
    'fixture plan',
  );
}

async function findFixtureEntitlement(
  connection: AuthoritySqlConnection,
  planId: number,
): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, plan_id, feature_key, value_json
         FROM plan_entitlements
        WHERE plan_id = ? AND feature_key = ?
        ORDER BY id`,
      [planId, ENTITLEMENT_EXPECTED.featureKey],
    ),
    'fixture entitlement',
  );
}

async function findAgencySubscription(connection: AuthoritySqlConnection): Promise<Row | null> {
  return requireOneOrNone(
    await queryRows(
      connection,
      `SELECT id, owner_type, owner_id, plan_id, status,
              trial_ends_at, current_period_start, current_period_end,
              grace_ends_at, cancel_at_period_end, created_by, updated_by, metadata
         FROM subscriptions
        WHERE owner_type = ? AND owner_id = ?
        ORDER BY id`,
      [SUBSCRIPTION_EXPECTED.ownerType, SUBSCRIPTION_EXPECTED.ownerId],
    ),
    'agency subscription',
  );
}

async function listSubscriptions(connection: AuthoritySqlConnection): Promise<Row[]> {
  return queryRows(
    connection,
    `SELECT id, owner_type, owner_id, plan_id, status, metadata
       FROM subscriptions
      ORDER BY id`,
  );
}

function subscriptionSnapshot(rows: Row[]): string {
  return canonicalJson(
    rows.map(row => ({
      id: rowValue(row, 'id'),
      owner_type: rowValue(row, 'owner_type'),
      owner_id: rowValue(row, 'owner_id'),
      plan_id: rowValue(row, 'plan_id'),
      status: rowValue(row, 'status'),
      metadata: parseJson(rowValue(row, 'metadata')),
    })),
  );
}

function assertUnrelatedSubscriptionsUnchanged(before: Row[], after: Row[]): void {
  const targetOwner = `${SUBSCRIPTION_EXPECTED.ownerType}:${SUBSCRIPTION_EXPECTED.ownerId}`;
  const beforeById = new Map(before.map(row => [String(rowValue(row, 'id')), row]));
  const afterById = new Map(after.map(row => [String(rowValue(row, 'id')), row]));

  for (const row of before) {
    const owner = `${rowValue(row, 'owner_type')}:${rowValue(row, 'owner_id')}`;
    if (owner === targetOwner) continue;
    const afterRow = afterById.get(String(rowValue(row, 'id')));
    if (!afterRow || subscriptionSnapshot([row]) !== subscriptionSnapshot([afterRow])) {
      throw new Error(
        'PLE publication entitlement fixture refused: an unrelated subscription changed.',
      );
    }
  }

  for (const row of after) {
    const owner = `${rowValue(row, 'owner_type')}:${rowValue(row, 'owner_id')}`;
    if (owner === targetOwner) continue;
    if (!beforeById.has(String(rowValue(row, 'id')))) {
      throw new Error(
        'PLE publication entitlement fixture refused: an unrelated subscription was created.',
      );
    }
  }
}

async function countTaggedRows(
  connection: AuthoritySqlConnection,
  table: 'billing_invoices' | 'billing_payments',
): Promise<number> {
  const rows = await queryRows(
    connection,
    `SELECT COUNT(*) AS row_count
       FROM \`${table}\`
      WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.fixture')) = ?`,
    [PLE_PUBLICATION_ENTITLEMENT_FIXTURE],
  );
  return Number(rowValue(rows[0] ?? {}, 'row_count') ?? 0);
}

async function assertListingCommercialContext(connection: AuthoritySqlConnection): Promise<void> {
  const [listing] = await queryRows(
    connection,
    `SELECT id, ownerId AS owner_id, agencyId AS agency_id, agentId AS agent_id
       FROM listings
      WHERE id = ?
      LIMIT 1`,
    [PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.listingId],
  );
  if (!listing) throw new Error('PLE publication entitlement fixture listing 1 is missing.');
  requireExact(
    rowValue(listing, 'id'),
    PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.listingId,
    'listing id',
  );
  requireExact(
    rowValue(listing, 'agency_id'),
    PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId,
    'listing agency',
  );
  requireExact(
    rowValue(listing, 'agent_id'),
    PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.responsibleAgentId,
    'listing agent',
  );

  const [agency] = await queryRows(
    connection,
    `SELECT id, name, email, city, province
       FROM agencies
      WHERE id = ?
      LIMIT 1`,
    [PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId],
  );
  if (!agency) throw new Error('PLE publication entitlement fixture agency is missing.');
  for (const field of ['name', 'email', 'city', 'province']) {
    if (!String(rowValue(agency, field) ?? '').trim()) {
      throw new Error(`PLE publication entitlement fixture agency ${field} is incomplete.`);
    }
  }

  const [branding] = await queryRows(
    connection,
    `SELECT agencyId AS agency_id, companyName AS company_name,
            primaryColor AS primary_color, secondaryColor AS secondary_color
       FROM agency_branding
      WHERE agencyId = ?
      LIMIT 1`,
    [PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId],
  );
  if (!branding) throw new Error('PLE publication entitlement fixture branding is missing.');
  for (const field of ['company_name', 'primary_color', 'secondary_color']) {
    if (!String(rowValue(branding, field) ?? '').trim()) {
      throw new Error(`PLE publication entitlement fixture branding ${field} is incomplete.`);
    }
  }
}

async function verifyFixtureRecords(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  assertApplicationEntitlement: boolean;
}): Promise<PlePublicationEntitlementEvidence['verified']> {
  assertPlePublicationEntitlementTarget(input.authority);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await assertListingCommercialContext(input.connection);

  const plan = await findFixturePlan(input.connection);
  if (!plan) throw new Error('PLE publication entitlement fixture plan is missing.');
  const planId = assertPleFixturePlanRow(plan);

  const entitlement = await findFixtureEntitlement(input.connection, planId);
  if (!entitlement) throw new Error('PLE publication entitlement fixture entitlement is missing.');
  assertPleFixtureEntitlementRow(entitlement, planId);

  const subscription = await findAgencySubscription(input.connection);
  if (!subscription)
    throw new Error('PLE publication entitlement fixture subscription is missing.');
  assertPleFixtureSubscriptionRow(subscription, planId);

  const allSubscriptions = await listSubscriptions(input.connection);
  for (const row of allSubscriptions) {
    const metadata = parseJson(rowValue(row, 'metadata')) as Record<string, unknown> | null;
    if (
      metadata?.fixture === PLE_PUBLICATION_ENTITLEMENT_FIXTURE &&
      (rowValue(row, 'owner_type') !== SUBSCRIPTION_EXPECTED.ownerType ||
        Number(rowValue(row, 'owner_id')) !== SUBSCRIPTION_EXPECTED.ownerId)
    ) {
      throw new Error(
        'PLE publication entitlement fixture refused: fixture metadata is attached to an unrelated owner.',
      );
    }
  }

  const fixtureInvoices = await countTaggedRows(input.connection, 'billing_invoices');
  const fixturePayments = await countTaggedRows(input.connection, 'billing_payments');
  if (fixtureInvoices !== 0 || fixturePayments !== 0) {
    throw new Error(
      'PLE publication entitlement fixture refused: payment or invoice rows exist for this fixture.',
    );
  }

  let publicationEntitled: true | undefined;
  if (input.assertApplicationEntitlement) {
    const applicationDb = await getDb();
    if (!applicationDb)
      throw new Error('PLE publication entitlement verification has no runtime DB.');
    const owner = await resolveListingCommercialOwner(
      applicationDb,
      PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.listingId,
    );
    if (
      owner.kind !== 'agency' ||
      owner.agencyId !== PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId ||
      owner.responsibleAgentId !== PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.responsibleAgentId
    ) {
      throw new Error(
        'PLE publication entitlement verification resolved the wrong commercial owner.',
      );
    }
    await assertListingPublicationEntitled(applicationDb, {
      listingId: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.listingId,
      operation: 'submit',
    });
    publicationEntitled = true;
  }

  return {
    exactTarget: true,
    migrationHead: ACCEPTED_MIGRATION_HEAD,
    listingCommercialOwner: true,
    agencyProfile: true,
    agencyBranding: true,
    plan: true,
    maxActiveListings: ENTITLEMENT_EXPECTED.value,
    subscription: true,
    unrelatedOwnersUntouched: true,
    fixtureInvoices,
    fixturePayments,
    ...(publicationEntitled ? { publicationEntitled: true as const } : {}),
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'ple-publication-entitlement',
    version: PLE_PUBLICATION_ENTITLEMENT_VERSION,
    digest: PLE_PUBLICATION_ENTITLEMENT_DIGEST,
  };
}

export async function preparePlePublicationEntitlement(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<PlePublicationEntitlementEvidence> {
  assertOperation(input.decision, ['test-fixture']);
  assertPlePublicationEntitlementTarget(input.authority);
  const base = evidenceBase(input.authority);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });

  const subscriptionsBefore = await listSubscriptions(input.connection);
  const prepared = await withTransaction(input.connection, async () => {
    const existingPlan = await findFixturePlan(input.connection);
    const planDecision = classifyPleFixturePlan(existingPlan ? [existingPlan] : []);
    let planId = planDecision.planId;
    if (!planId) {
      const result = await input.connection.execute(
        `INSERT INTO plans
          (name, displayName, segment, price, price_monthly, currency, \`interval\`,
           trial_days, metadata, isActive, isPopular, sortOrder)
         VALUES (?, ?, 'agency', 0, 0, 'ZAR', 'month', 0, CAST(? AS JSON), 1, 0, 9999)`,
        [PLAN_EXPECTED.name, PLAN_EXPECTED.displayName, JSON.stringify(PLAN_EXPECTED.metadata)],
      );
      const insertId = Number((Array.isArray(result) ? result[0] : result)?.insertId);
      if (!Number.isSafeInteger(insertId) || insertId <= 0) {
        throw new Error('PLE publication entitlement fixture could not create the plan.');
      }
      planId = insertId;
    }

    const existingEntitlement = await findFixtureEntitlement(input.connection, planId);
    const entitlementDecision = classifyPleFixtureEntitlement(
      existingEntitlement ? [existingEntitlement] : [],
      planId,
    );
    if (entitlementDecision.state === 'created') {
      await input.connection.execute(
        `INSERT INTO plan_entitlements (plan_id, feature_key, value_json)
         VALUES (?, ?, CAST(? AS JSON))`,
        [planId, ENTITLEMENT_EXPECTED.featureKey, JSON.stringify(ENTITLEMENT_EXPECTED.value)],
      );
    }

    const existingSubscription = await findAgencySubscription(input.connection);
    const subscriptionDecision = classifyPleFixtureSubscription(
      existingSubscription ? [existingSubscription] : [],
      planId,
    );
    if (subscriptionDecision.state === 'created') {
      await input.connection.execute(
        `INSERT INTO subscriptions
          (owner_type, owner_id, plan_id, status, trial_ends_at,
           current_period_start, current_period_end, grace_ends_at,
           cancel_at_period_end, billing_cycle_anchor, metadata, created_by, updated_by)
         VALUES ('agency', ?, ?, 'active', NULL, CURRENT_TIMESTAMP,
                 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY), NULL, 0,
                 CURRENT_TIMESTAMP, CAST(? AS JSON), ?, ?)`,
        [
          SUBSCRIPTION_EXPECTED.ownerId,
          planId,
          JSON.stringify(SUBSCRIPTION_EXPECTED.metadata),
          SUBSCRIPTION_EXPECTED.createdBy,
          SUBSCRIPTION_EXPECTED.updatedBy,
        ],
      );
    }

    return {
      plan: planDecision.state,
      entitlement: entitlementDecision.state,
      subscription: subscriptionDecision.state,
    };
  });

  const subscriptionsAfter = await listSubscriptions(input.connection);
  assertUnrelatedSubscriptionsUnchanged(subscriptionsBefore, subscriptionsAfter);
  const verified = await verifyFixtureRecords({
    authority: input.authority,
    connection: input.connection,
    assertApplicationEntitlement: false,
  });

  return {
    ...base,
    fixture: PLE_PUBLICATION_ENTITLEMENT_VERSION,
    target: PLE_PUBLICATION_ENTITLEMENT_TARGET,
    authorizedListing: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES,
    prepared,
    verified,
  };
}

export async function verifyPlePublicationEntitlement(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<PlePublicationEntitlementEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertPlePublicationEntitlementTarget(input.authority);
  const base = evidenceBase(input.authority);
  const verified = await verifyFixtureRecords({
    authority: input.authority,
    connection: input.connection,
    assertApplicationEntitlement: true,
  });

  return {
    ...base,
    fixture: PLE_PUBLICATION_ENTITLEMENT_VERSION,
    target: PLE_PUBLICATION_ENTITLEMENT_TARGET,
    authorizedListing: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES,
    prepared: {
      plan: 'reused',
      entitlement: 'reused',
      subscription: 'reused',
    },
    verified,
  };
}

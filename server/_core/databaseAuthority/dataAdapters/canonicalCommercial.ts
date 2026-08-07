import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
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

export const CANONICAL_COMMERCIAL_VERSION = 'canonical-commercial-v1' as const;

/**
 * The canonical once-off fee is stored in minor units. The historical
 * price_monthly column is deliberately zero because this product is not a
 * monthly subscription; catalog and invoice projection use the explicit
 * launch-fee metadata instead.
 */
export const CANONICAL_DEVELOPER_LAUNCH_ACCESS = Object.freeze({
  name: 'developer_launch_access',
  displayName: 'Developer Launch Access',
  description:
    'Paid 90-day launch access for a developer portfolio, activated after verified manual-EFT payment.',
  segment: 'developer',
  price: 149900,
  priceMonthly: 0,
  currency: 'ZAR',
  interval: 'month',
  trialDays: 0,
  metadata: {
    commercial_product_key: 'developer_launch_access',
    commercial_term_kind: 'paid_launch_access',
    commercial_term_duration_days: 90,
    commercial_requires_verified_payment: true,
    commercial_auto_renews: false,
    commercial_pricing_mode: 'fixed',
    commercial_action_mode: 'request_invoice',
    commercial_price_configured: true,
    commercial_launch_fee_minor: 149900,
    commercial_billing_interval: 'once_off',
    catalogVisibility: 'public',
  },
  features: [],
  limits: {
    unlimited_development_portfolio: true,
  },
  entitlements: {
    unlimited_development_portfolio: true,
  },
  isActive: 1,
  isPopular: 0,
  sortOrder: 1000,
} as const);

const REFERENCE_PAYLOAD = Object.freeze({
  product: CANONICAL_DEVELOPER_LAUNCH_ACCESS,
  entitlementKeys: Object.keys(CANONICAL_DEVELOPER_LAUNCH_ACCESS.entitlements),
});

export const CANONICAL_COMMERCIAL_DIGEST = stableDigest(REFERENCE_PAYLOAD);

export type CommercialReferenceEvidence = AdapterEvidence & {
  expected: {
    productKey: string;
    segment: string;
    termKind: string;
    durationDays: number;
    priceConfigured: true;
    launchFeeMinor: number;
    entitlementKeys: string[];
  };
  verified: {
    planId: number;
    productKey: string;
    active: boolean;
    pricingMode: string;
    priceConfigured: boolean;
    launchFeeMinor: number;
    entitlementKeys: string[];
  };
  migrationHead: typeof ACCEPTED_MIGRATION_HEAD;
};

type Row = Record<string, unknown>;

function asId(row: Row, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Canonical commercial ${label} has an invalid ID.`);
  }
  return id;
}

function normalizedJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return normalizedJson(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizedJson(item)]),
    );
  }
  return value;
}

function jsonMatches(actual: unknown, expected: unknown): boolean {
  return JSON.stringify(normalizedJson(actual)) === JSON.stringify(normalizedJson(expected));
}

function assertPlanIdentity(row: Row): number {
  const product = CANONICAL_DEVELOPER_LAUNCH_ACCESS;
  const mismatches = [
    String(rowValue(row, 'displayName')) !== product.displayName && 'display name',
    String(rowValue(row, 'segment')) !== product.segment && 'segment',
    Number(rowValue(row, 'price')) !== product.price && 'launch fee',
    Number(rowValue(row, 'price_monthly')) !== product.priceMonthly && 'monthly price placeholder',
    String(rowValue(row, 'currency')) !== product.currency && 'currency',
    String(rowValue(row, 'interval')) !== product.interval && 'interval',
    Number(rowValue(row, 'trial_days')) !== product.trialDays && 'trial duration',
    Number(rowValue(row, 'isActive')) !== product.isActive && 'active state',
    !jsonMatches(rowValue(row, 'metadata'), product.metadata) && 'commercial metadata',
    !jsonMatches(rowValue(row, 'features'), product.features) && 'features',
    !jsonMatches(rowValue(row, 'limits'), product.limits) && 'limits',
  ].filter(Boolean);

  if (mismatches.length) {
    throw new Error(
      `Canonical commercial product ${product.name} conflicts with approved reference data: ${mismatches.join(', ')}.`,
    );
  }
  return asId(row, `product ${product.name}`);
}

async function ensureDeveloperLaunchPlan(connection: AuthoritySqlConnection): Promise<number> {
  const product = CANONICAL_DEVELOPER_LAUNCH_ACCESS;
  const rows = await queryRows(connection, 'SELECT * FROM plans WHERE name = ?', [product.name]);
  if (rows.length > 1) {
    throw new Error(`Canonical commercial has duplicate plan name ${product.name}.`);
  }
  if (rows.length === 1) return assertPlanIdentity(rows[0]);

  const result: any = await connection.execute(
    `INSERT INTO plans
      (name, displayName, description, segment, price, price_monthly, currency, \`interval\`, trial_days,
       metadata, features, limits, isActive, isPopular, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.name,
      product.displayName,
      product.description,
      product.segment,
      product.price,
      product.priceMonthly,
      product.currency,
      product.interval,
      product.trialDays,
      JSON.stringify(product.metadata),
      JSON.stringify(product.features),
      JSON.stringify(product.limits),
      product.isActive,
      product.isPopular,
      product.sortOrder,
    ],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Canonical commercial could not identify plan ${product.name} after insert.`);
  }
  return id;
}

async function ensureEntitlement(
  connection: AuthoritySqlConnection,
  planId: number,
  featureKey: string,
  value: unknown,
) {
  const rows = await queryRows(
    connection,
    'SELECT id, value_json FROM plan_entitlements WHERE plan_id = ? AND feature_key = ?',
    [planId, featureKey],
  );
  if (rows.length > 1) {
    throw new Error(`Canonical commercial has duplicate entitlement ${featureKey}.`);
  }
  if (rows.length === 1) {
    if (!jsonMatches(rowValue(rows[0], 'value_json'), value)) {
      throw new Error(
        `Canonical commercial entitlement ${featureKey} conflicts with approved data.`,
      );
    }
    return asId(rows[0], `entitlement ${featureKey}`);
  }

  const result: any = await connection.execute(
    'INSERT INTO plan_entitlements (plan_id, feature_key, value_json) VALUES (?, ?, ?)',
    [planId, featureKey, JSON.stringify(value)],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
      `Canonical commercial could not identify entitlement ${featureKey} after insert.`,
    );
  }
  return id;
}

export async function verifyCanonicalCommercialReferenceData(
  connection: AuthoritySqlConnection,
): Promise<CommercialReferenceEvidence['verified']> {
  const product = CANONICAL_DEVELOPER_LAUNCH_ACCESS;
  const rows = await queryRows(connection, 'SELECT * FROM plans WHERE name = ?', [product.name]);
  if (rows.length !== 1) {
    throw new Error(`Canonical commercial is missing product ${product.name}.`);
  }
  const planId = assertPlanIdentity(rows[0]);
  const entitlementRows = await queryRows(
    connection,
    'SELECT feature_key, value_json FROM plan_entitlements WHERE plan_id = ? ORDER BY feature_key',
    [planId],
  );
  const expectedKeys = Object.keys(product.entitlements).sort();
  const actualKeys = entitlementRows.map(row => String(rowValue(row, 'feature_key'))).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`Canonical commercial entitlements for ${product.name} are incomplete.`);
  }
  for (const row of entitlementRows) {
    const key = String(rowValue(row, 'feature_key'));
    if (
      !jsonMatches(
        rowValue(row, 'value_json'),
        product.entitlements[key as keyof typeof product.entitlements],
      )
    ) {
      throw new Error(`Canonical commercial entitlement ${key} has an unexpected value.`);
    }
  }

  return {
    planId,
    productKey: product.name,
    active: Number(rowValue(rows[0], 'isActive')) === 1,
    pricingMode: String(
      (normalizedJson(rowValue(rows[0], 'metadata')) as Record<string, unknown>)
        ?.commercial_pricing_mode || '',
    ),
    priceConfigured: true,
    launchFeeMinor: product.metadata.commercial_launch_fee_minor,
    entitlementKeys: actualKeys,
  };
}

export async function prepareCanonicalCommercialReferenceData(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<CommercialReferenceEvidence> {
  assertOperation(input.decision, ['reference-seed', 'foundation-seed']);
  const ownership = requireExactAdapterTarget(input.authority, input.profileRoot);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });

  let planId = 0;
  await withTransaction(input.connection, async () => {
    planId = await ensureDeveloperLaunchPlan(input.connection);
    for (const [featureKey, value] of Object.entries(
      CANONICAL_DEVELOPER_LAUNCH_ACCESS.entitlements,
    )) {
      await ensureEntitlement(input.connection, planId, featureKey, value);
    }
  });

  const verified = await verifyCanonicalCommercialReferenceData(input.connection);
  return {
    ...ownership,
    adapter: 'canonical-commercial',
    version: CANONICAL_COMMERCIAL_VERSION,
    digest: CANONICAL_COMMERCIAL_DIGEST,
    expected: {
      productKey: CANONICAL_DEVELOPER_LAUNCH_ACCESS.name,
      segment: CANONICAL_DEVELOPER_LAUNCH_ACCESS.segment,
      termKind: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_term_kind,
      durationDays: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_term_duration_days,
      priceConfigured: true,
      launchFeeMinor: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_launch_fee_minor,
      entitlementKeys: Object.keys(CANONICAL_DEVELOPER_LAUNCH_ACCESS.entitlements),
    },
    verified: { ...verified, planId },
    migrationHead: ACCEPTED_MIGRATION_HEAD,
  };
}

export async function verifyCanonicalCommercialReference(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<CommercialReferenceEvidence> {
  assertOperation(input.decision, ['verification']);
  const ownership = requireExactAdapterTarget(input.authority, input.profileRoot);
  await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  const verified = await verifyCanonicalCommercialReferenceData(input.connection);
  return {
    ...ownership,
    adapter: 'canonical-commercial',
    version: CANONICAL_COMMERCIAL_VERSION,
    digest: CANONICAL_COMMERCIAL_DIGEST,
    expected: {
      productKey: CANONICAL_DEVELOPER_LAUNCH_ACCESS.name,
      segment: CANONICAL_DEVELOPER_LAUNCH_ACCESS.segment,
      termKind: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_term_kind,
      durationDays: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_term_duration_days,
      priceConfigured: true,
      launchFeeMinor: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_launch_fee_minor,
      entitlementKeys: Object.keys(CANONICAL_DEVELOPER_LAUNCH_ACCESS.entitlements),
    },
    verified,
    migrationHead: ACCEPTED_MIGRATION_HEAD,
  };
}

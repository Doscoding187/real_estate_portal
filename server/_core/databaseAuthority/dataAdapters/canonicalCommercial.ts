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

export type LaunchAudience = 'agent' | 'agency' | 'developer';

type LaunchProductReference = {
  name: string;
  displayName: string;
  description: string;
  segment: LaunchAudience;
  price: number;
  priceMonthly: number;
  currency: 'ZAR';
  interval: 'month';
  trialDays: 0;
  metadata: Readonly<Record<string, unknown>>;
  features: readonly string[];
  limits: Readonly<Record<string, unknown>>;
  entitlements: Readonly<Record<string, unknown>>;
  isActive: 1;
  isPopular: 0;
  sortOrder: number;
};

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

/**
 * Agent and Agency Launch Access are first-class canonical products. Their
 * launch entitlements are explicit reference data, informed by runtime
 * capability inspection but never inherited from another commercial plan.
 */
export const CANONICAL_AGENT_LAUNCH_ACCESS: LaunchProductReference = Object.freeze({
  name: 'agent_launch_access',
  displayName: 'Agent Launch Access',
  description:
    'Paid 90-day launch access for an independent agent, activated after verified manual-EFT payment.',
  segment: 'agent',
  price: 49900,
  priceMonthly: 0,
  currency: 'ZAR',
  interval: 'month',
  trialDays: 0,
  metadata: {
    commercial_product_key: 'agent_launch_access',
    commercial_term_kind: 'paid_launch_access',
    commercial_term_duration_days: 90,
    commercial_requires_verified_payment: true,
    commercial_auto_renews: false,
    commercial_pricing_mode: 'fixed',
    commercial_action_mode: 'request_invoice',
    commercial_price_configured: true,
    commercial_launch_fee_minor: 49900,
    commercial_billing_interval: 'once_off',
    commercial_entitlement_source: 'explicit_launch_capabilities',
    commercial_launch_access_mode: 'full_supported_capability_cohort',
    commercial_feature_access_policy: 'all_supported_canonical_capabilities',
    commercial_resource_limit_policy: 'explicit_launch_safeguard',
    commercial_learning_cohort: 'launch_access',
    catalogVisibility: 'public',
  },
  features: [
    'Agent listing management',
    'Lead and enquiry access',
    'Agent profile and directory',
    'Agent analytics and reporting',
    'Commission tracking',
  ],
  limits: { max_active_listings: 50 },
  entitlements: {
    max_active_listings: 50,
    has_commission_tracking: true,
    has_revenue_dashboard: true,
  },
  isActive: 1,
  isPopular: 0,
  sortOrder: 900,
});

export const CANONICAL_AGENCY_LAUNCH_ACCESS: LaunchProductReference = Object.freeze({
  name: 'agency_launch_access',
  displayName: 'Agency Launch Access',
  description:
    'Paid 90-day launch access for an agency workspace, activated after verified manual-EFT payment.',
  segment: 'agency',
  price: 99900,
  priceMonthly: 0,
  currency: 'ZAR',
  interval: 'month',
  trialDays: 0,
  metadata: {
    commercial_product_key: 'agency_launch_access',
    commercial_term_kind: 'paid_launch_access',
    commercial_term_duration_days: 90,
    commercial_requires_verified_payment: true,
    commercial_auto_renews: false,
    commercial_pricing_mode: 'fixed',
    commercial_action_mode: 'request_invoice',
    commercial_price_configured: true,
    commercial_launch_fee_minor: 99900,
    commercial_billing_interval: 'once_off',
    commercial_entitlement_source: 'explicit_launch_capabilities',
    commercial_launch_access_mode: 'full_supported_capability_cohort',
    commercial_feature_access_policy: 'all_supported_canonical_capabilities',
    commercial_resource_limit_policy: 'explicit_launch_safeguard',
    commercial_learning_cohort: 'launch_access',
    catalogVisibility: 'public',
  },
  features: [
    'Agency inventory management',
    'Team and account management',
    'Lead and enquiry access',
    'Lead routing',
    'Agency reporting and analytics',
    'Commission and deal workflows',
  ],
  limits: { max_active_listings: 500 },
  entitlements: {
    max_active_listings: 500,
    has_commission_tracking: true,
    has_revenue_dashboard: true,
    has_team_dashboard: true,
    has_lead_routing: true,
  },
  isActive: 1,
  isPopular: 0,
  sortOrder: 910,
});

export const CANONICAL_LAUNCH_ACCESS_PRODUCTS = Object.freeze([
  CANONICAL_AGENT_LAUNCH_ACCESS,
  CANONICAL_AGENCY_LAUNCH_ACCESS,
  CANONICAL_DEVELOPER_LAUNCH_ACCESS,
] as const);

const REFERENCE_PAYLOAD = Object.freeze({
  products: CANONICAL_LAUNCH_ACCESS_PRODUCTS.map(product => {
    const metadata = product.metadata as Readonly<Record<string, unknown>>;
    return {
      name: product.name,
      segment: product.segment,
      price: product.price,
      term: metadata.commercial_term_kind,
      durationDays: metadata.commercial_term_duration_days,
      launchAccessMode: metadata.commercial_launch_access_mode || null,
      featureAccessPolicy: metadata.commercial_feature_access_policy || null,
      resourceLimitPolicy: metadata.commercial_resource_limit_policy || null,
      entitlementSource: String(metadata.commercial_entitlement_source || 'explicit'),
      entitlementKeys: Object.keys(product.entitlements),
    };
  }),
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
    products: Array<{
      planId: number;
      productKey: string;
      segment: string;
      price: number;
      durationDays: number;
      entitlementKeys: string[];
      entitlementSource: string;
    }>;
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

function assertPlanIdentity(
  row: Row,
  product: {
    name: string;
    displayName: string;
    segment: string;
    price: number;
    priceMonthly: number;
    currency: string;
    interval: string;
    trialDays: number;
    metadata: unknown;
    features: unknown;
    limits: unknown;
    isActive: number;
  },
): number {
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

function parseSourceMetadata(row: Row): Record<string, unknown> {
  const parsed = normalizedJson(rowValue(row, 'metadata'));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

type ResolvedLaunchProduct = LaunchProductReference & {
  metadata: Record<string, unknown>;
  features: string[];
  limits: Record<string, unknown>;
  entitlements: Record<string, unknown>;
};

async function resolveLaunchProductReference(
  product: LaunchProductReference,
): Promise<ResolvedLaunchProduct> {
  return {
    ...product,
    metadata: { ...product.metadata },
    features: [...product.features],
    limits: { ...product.limits },
    entitlements: { ...product.entitlements },
  };
}

async function ensureLaunchPlan(
  connection: AuthoritySqlConnection,
  product: LaunchProductReference,
): Promise<{ planId: number; entitlements: Record<string, unknown> }> {
  const resolved = await resolveLaunchProductReference(product);
  const rows = await queryRows(connection, 'SELECT * FROM plans WHERE name = ?', [product.name]);
  if (rows.length > 1) {
    throw new Error(`Canonical commercial has duplicate plan name ${product.name}.`);
  }
  if (rows.length === 1) {
    return {
      planId: assertPlanIdentity(rows[0], resolved),
      entitlements: resolved.entitlements,
    };
  }

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
      JSON.stringify(resolved.features),
      JSON.stringify(resolved.limits),
      product.isActive,
      product.isPopular,
      product.sortOrder,
    ],
  );
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Canonical commercial could not identify plan ${product.name} after insert.`);
  }
  return { planId: id, entitlements: resolved.entitlements };
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
  const products = [
    CANONICAL_AGENT_LAUNCH_ACCESS,
    CANONICAL_AGENCY_LAUNCH_ACCESS,
    CANONICAL_DEVELOPER_LAUNCH_ACCESS,
  ] as const;
  const verifiedProducts: CommercialReferenceEvidence['verified']['products'] = [];

  for (const product of products) {
    const resolved = await resolveLaunchProductReference(product);
    const rows = await queryRows(connection, 'SELECT * FROM plans WHERE name = ?', [product.name]);
    if (rows.length !== 1) {
      throw new Error(`Canonical commercial is missing product ${product.name}.`);
    }
    const planId = assertPlanIdentity(rows[0], resolved);
    const entitlementRows = await queryRows(
      connection,
      'SELECT feature_key, value_json FROM plan_entitlements WHERE plan_id = ? ORDER BY feature_key',
      [planId],
    );
    const expectedKeys = Object.keys(resolved.entitlements).sort();
    const actualKeys = entitlementRows.map(row => String(rowValue(row, 'feature_key'))).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Canonical commercial entitlements for ${product.name} are incomplete.`);
    }
    for (const row of entitlementRows) {
      const key = String(rowValue(row, 'feature_key'));
      if (!jsonMatches(rowValue(row, 'value_json'), resolved.entitlements[key])) {
        throw new Error(`Canonical commercial entitlement ${key} has an unexpected value.`);
      }
    }

    const metadata = parseSourceMetadata(rows[0]);
    verifiedProducts.push({
      planId,
      productKey: product.name,
      segment: product.segment,
      price: product.price,
      durationDays: Number(product.metadata.commercial_term_duration_days),
      entitlementKeys: actualKeys,
      entitlementSource: String(metadata.commercial_entitlement_source || 'explicit'),
    });
  }

  const developer = verifiedProducts.find(product => product.productKey === 'developer_launch_access');
  if (!developer) throw new Error('Canonical commercial developer product verification failed.');

  return {
    planId: developer.planId,
    productKey: developer.productKey,
    active: true,
    pricingMode: String(CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_pricing_mode || ''),
    priceConfigured: true,
    launchFeeMinor: CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata.commercial_launch_fee_minor,
    entitlementKeys: developer.entitlementKeys,
    products: verifiedProducts,
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

  let developerPlanId = 0;
  await withTransaction(input.connection, async () => {
    const references = [
      CANONICAL_AGENT_LAUNCH_ACCESS,
      CANONICAL_AGENCY_LAUNCH_ACCESS,
      CANONICAL_DEVELOPER_LAUNCH_ACCESS,
    ] as const;
    for (const product of references) {
      const ensured = await ensureLaunchPlan(input.connection, product);
      if (product.name === CANONICAL_DEVELOPER_LAUNCH_ACCESS.name) {
        developerPlanId = ensured.planId;
      }
      for (const [featureKey, value] of Object.entries(ensured.entitlements)) {
        await ensureEntitlement(input.connection, ensured.planId, featureKey, value);
      }
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
    verified: { ...verified, planId: developerPlanId },
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

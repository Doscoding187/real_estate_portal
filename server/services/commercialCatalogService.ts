import { and, asc, eq, inArray } from 'drizzle-orm';
import { planEntitlements, plans } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  DEFAULT_FEATURE_ENTITLEMENTS,
  parseEntitlementValue,
  type EntitlementMap,
} from './planAccessService';
import { getManualEftBillingAmount } from './billingFoundationService';
import {
  getCommercialProductKey,
  getConfiguredLaunchFeeMinor,
  parseCommercialMetadata,
  resolveCommercialTerm,
  type CommercialTerm,
} from './commercialTerm';

export const COMMERCIAL_AUDIENCES = ['agent', 'agency', 'developer', 'enterprise'] as const;
export type CommercialAudience = (typeof COMMERCIAL_AUDIENCES)[number];

export const COMMERCIAL_PRODUCT_TYPES = ['subscription'] as const;
export type CommercialProductType = (typeof COMMERCIAL_PRODUCT_TYPES)[number];

export const COMMERCIAL_ACTION_MODES = [
  'manual_eft',
  'request_invoice',
  'contact_sales',
  'trial',
  'unavailable',
] as const;
export type CommercialActionMode = (typeof COMMERCIAL_ACTION_MODES)[number];

type CommercialPricingMode = 'fixed' | 'contact_sales' | 'unavailable';
type CommercialOfferStatus = 'not_configured' | 'unavailable';
type CanonicalPlanRow = typeof plans.$inferSelect;

export type CommercialPrice = {
  amountMinor: number;
  currency: string;
};

export type CommercialProduct = {
  productId: string;
  productKey: string;
  productType: CommercialProductType;
  source: {
    authority: 'canonical_plans';
    planId: number;
    planKey: string;
  };
  name: string;
  displayName: string;
  description: string | null;
  audience: CommercialAudience;
  active: true;
  popular: boolean;
  benefits: string[];
  limits: Record<string, EntitlementMap[string]>;
  entitlements: EntitlementMap;
  trial: {
    days: number;
    available: boolean;
  };
  term: CommercialTerm;
  pricing: {
    mode: CommercialPricingMode;
    currency: string;
    billingInterval: 'monthly' | 'annual' | 'once';
    basePrice: CommercialPrice | null;
    monthly: CommercialPrice | null;
    annual: CommercialPrice | null;
    taxTreatment: string;
    displayIncludesVat: boolean | null;
    priceSource: 'canonical_plans_and_billing_calculation' | 'unavailable';
    unavailableReason: string | null;
  };
  promotion: {
    status: CommercialOfferStatus;
    offer: null;
    reason: string;
  };
  action: {
    mode: CommercialActionMode;
    target: {
      kind: 'procedure' | 'route';
      value: string;
    } | null;
    requiresAuthentication: boolean;
    reason: string;
  };
};

export type CommercialCatalogResponse = {
  authority: {
    products: 'canonical_plans';
    entitlements: 'plan_entitlements';
    prices: 'billingFoundationService';
    paidState: 'canonical_subscriptions_and_verified_billing';
  };
  audience: CommercialAudience | null;
  products: CommercialProduct[];
};

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return {};
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // The canonical plan column historically also accepts comma-separated text.
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function normalizeActionMode(value: unknown): CommercialActionMode | null {
  if (typeof value !== 'string') return null;
  return (COMMERCIAL_ACTION_MODES as readonly string[]).includes(value)
    ? (value as CommercialActionMode)
    : null;
}

function getBaseMonthlyAmount(plan: CanonicalPlanRow): number | null {
  return parsePositiveNumber(plan.priceMonthly || plan.price);
}

function getEffectiveAmount(plan: CanonicalPlanRow, billingCycle: 'monthly' | 'annual') {
  try {
    return parsePositiveNumber(getManualEftBillingAmount(plan, billingCycle));
  } catch {
    return null;
  }
}

function toCommercialPrice(amountMinor: number | null, currency: string): CommercialPrice | null {
  return amountMinor === null ? null : { amountMinor, currency };
}

function isBooleanTrue(value: unknown) {
  return parseBoolean(value) === true;
}

export function isPublicCommercialPlan(plan: CanonicalPlanRow): boolean {
  const metadata = parseJsonRecord(plan.metadata);
  const visibility = String(metadata.catalogVisibility || metadata.visibility || '').toLowerCase();

  if (plan.isActive !== 1) return false;
  if (isBooleanTrue(metadata.localOnly) || isBooleanTrue(metadata.internalOnly)) return false;
  if (metadata.isPublic !== undefined && !isBooleanTrue(metadata.isPublic)) return false;
  if (metadata.public !== undefined && !isBooleanTrue(metadata.public)) return false;
  if (visibility === 'internal' || visibility === 'private') return false;

  return true;
}

export function filterCommercialPlans(
  rows: CanonicalPlanRow[],
  audience?: CommercialAudience,
): CanonicalPlanRow[] {
  return rows.filter(
    plan =>
      (!audience || plan.segment === audience) &&
      isPublicCommercialPlan(plan) &&
      !(
        (plan.segment === 'agent' || plan.segment === 'agency' || plan.segment === 'developer') &&
        resolveCommercialTerm(plan).kind === 'free_trial'
      ),
  );
}

function getLimits(entitlements: EntitlementMap): Record<string, EntitlementMap[string]> {
  return Object.fromEntries(
    Object.entries(entitlements).filter(
      ([key]) =>
        key.startsWith('max_') ||
        /limit|quota|count/i.test(key) ||
        key === 'unlimited_development_portfolio',
    ),
  );
}

function resolveAction(
  plan: CanonicalPlanRow,
  pricingMode: CommercialPricingMode,
  monthly: CommercialPrice | null,
  annual: CommercialPrice | null,
  term: CommercialTerm,
  metadata: Record<string, unknown>,
): CommercialProduct['action'] {
  const configuredMode = normalizeActionMode(
    metadata.commercial_action_mode ?? metadata.commercialActionMode,
  );

  if (configuredMode === 'manual_eft' && plan.segment === 'agency' && pricingMode === 'fixed') {
    return {
      mode: 'manual_eft',
      target: { kind: 'procedure', value: 'billing.startManualEftCheckout' },
      requiresAuthentication: true,
      reason: 'Uses the existing canonical agency manual-EFT billing workflow.',
    };
  }

  if (
    configuredMode === 'trial' &&
    term.kind === 'free_trial' &&
    term.durationDays !== null &&
    term.durationDays > 0 &&
    isBooleanTrue(metadata.commercial_trial_enabled)
  ) {
    return {
      mode: 'trial',
      target: null,
      requiresAuthentication: true,
      reason: 'Trial availability is explicitly enabled by canonical commercial metadata.',
    };
  }

  if (configuredMode === 'request_invoice' || configuredMode === 'contact_sales') {
    return {
      mode: configuredMode,
      target: { kind: 'route', value: '/contact' },
      requiresAuthentication: false,
      reason: 'Paid activation is assisted and requires Property Listify commercial operations.',
    };
  }

  if (configuredMode === 'unavailable' || pricingMode === 'unavailable') {
    return {
      mode: 'unavailable',
      target: null,
      requiresAuthentication: false,
      reason:
        pricingMode === 'unavailable'
          ? 'Commercial price terms are not safe to publish from the current authority.'
          : 'No approved commercial action is configured for this product.',
    };
  }

  // Canonical agent products with a configured trial period are eligible for
  // the authenticated onboarding trial flow. This is derived from the plan,
  // not from a frontend tier label or user-level status field.
  if (!configuredMode && plan.segment === 'agent' && term.kind === 'free_trial') {
    return {
      mode: 'trial',
      target: { kind: 'route', value: '/role-selection' },
      requiresAuthentication: false,
      reason: 'Starts the canonical agent onboarding trial for this plan.',
    };
  }

  if (plan.segment === 'agency' && (monthly?.amountMinor || annual?.amountMinor)) {
    return {
      mode: 'manual_eft',
      target: { kind: 'procedure', value: 'billing.startManualEftCheckout' },
      requiresAuthentication: true,
      reason: 'Uses the existing canonical agency manual-EFT billing workflow.',
    };
  }

  if (
    pricingMode === 'contact_sales' ||
    plan.segment === 'enterprise' ||
    (pricingMode === 'fixed' && Math.max(monthly?.amountMinor ?? 0, annual?.amountMinor ?? 0) > 0)
  ) {
    return {
      mode: 'contact_sales',
      target: { kind: 'route', value: '/contact' },
      requiresAuthentication: false,
      reason:
        'This audience does not currently have a canonical self-service paid activation path.',
    };
  }

  return {
    mode: 'unavailable',
    target: null,
    requiresAuthentication: false,
    reason: 'No approved commercial action is configured for this product.',
  };
}

export function buildCommercialProduct(
  plan: CanonicalPlanRow,
  entitlements: EntitlementMap,
): CommercialProduct {
  const metadata = parseCommercialMetadata(plan.metadata);
  const term = resolveCommercialTerm(plan);
  const currency = String(plan.currency || 'ZAR').toUpperCase();
  const billingInterval =
    term.kind === 'paid_launch_access' ? 'once' : plan.interval === 'year' ? 'annual' : 'monthly';
  const baseMonthly = getBaseMonthlyAmount(plan);
  const effectiveMonthly = getEffectiveAmount(plan, 'monthly');
  const effectiveAnnual = getEffectiveAmount(plan, 'annual');
  const launchFee = getConfiguredLaunchFeeMinor(plan);
  const earlyAccessPrice = parsePositiveNumber(
    metadata.early_access_price_monthly ?? metadata.earlyAccessPriceMonthly,
  );
  const hasUnboundedEarlyAccessOverride =
    earlyAccessPrice !== null && baseMonthly !== null && earlyAccessPrice !== baseMonthly;
  const configuredPricingMode = String(
    metadata.commercial_pricing_mode ?? metadata.commercialPricingMode ?? '',
  ).toLowerCase();
  const pricingMode: CommercialPricingMode =
    term.kind === 'paid_launch_access'
      ? configuredPricingMode === 'fixed' && launchFee !== null
        ? 'fixed'
        : 'contact_sales'
      : hasUnboundedEarlyAccessOverride
        ? 'unavailable'
        : configuredPricingMode === 'contact_sales' || plan.segment === 'enterprise'
          ? 'contact_sales'
          : effectiveMonthly !== null || effectiveAnnual !== null
            ? 'fixed'
            : 'unavailable';
  const monthly =
    pricingMode === 'fixed' && term.kind !== 'paid_launch_access'
      ? toCommercialPrice(effectiveMonthly, currency)
      : null;
  const annual =
    pricingMode === 'fixed' && term.kind !== 'paid_launch_access'
      ? toCommercialPrice(effectiveAnnual, currency)
      : null;
  const basePrice =
    pricingMode === 'fixed'
      ? term.kind === 'paid_launch_access'
        ? toCommercialPrice(launchFee, currency)
        : billingInterval === 'annual'
          ? annual
          : monthly
      : null;
  const trialDays = term.kind === 'free_trial' ? term.durationDays || 0 : 0;
  const taxTreatment = String(metadata.tax_treatment ?? metadata.taxTreatment ?? 'not_configured');
  const displayIncludesVat = parseBoolean(
    metadata.display_includes_vat ?? metadata.displayIncludesVat ?? metadata.vat_included,
  );
  const unavailableReason =
    term.kind === 'paid_launch_access' && pricingMode === 'contact_sales'
      ? 'The once-off Launch Access fee is not configured; request an assisted invoice.'
      : hasUnboundedEarlyAccessOverride
        ? 'An early-access price override has no canonical public offer validity or eligibility rule.'
        : pricingMode === 'unavailable'
          ? 'Canonical pricing is not configured for safe public display.'
          : null;

  return {
    productId: `plan:${plan.id}`,
    productKey: getCommercialProductKey(plan),
    productType: 'subscription',
    source: {
      authority: 'canonical_plans',
      planId: plan.id,
      planKey: plan.name,
    },
    name: plan.name,
    displayName: plan.displayName,
    description: plan.description || null,
    audience: plan.segment as CommercialAudience,
    active: true,
    popular: Boolean(plan.isPopular),
    benefits: parseStringArray(plan.features),
    limits: getLimits(entitlements),
    entitlements,
    trial: {
      days: trialDays,
      available: trialDays > 0,
    },
    term,
    pricing: {
      mode: pricingMode,
      currency,
      billingInterval,
      basePrice,
      monthly,
      annual,
      taxTreatment,
      displayIncludesVat,
      priceSource:
        pricingMode === 'unavailable' || pricingMode === 'contact_sales'
          ? 'unavailable'
          : 'canonical_plans_and_billing_calculation',
      unavailableReason,
    },
    promotion: {
      status: hasUnboundedEarlyAccessOverride ? 'unavailable' : 'not_configured',
      offer: null,
      reason: hasUnboundedEarlyAccessOverride
        ? unavailableReason || 'Promotion terms are incomplete.'
        : 'No canonical public promotion object is configured for this product.',
    },
    action: resolveAction(plan, pricingMode, monthly, annual, term, metadata),
  };
}

export async function getCommercialCatalog(
  audience?: CommercialAudience,
): Promise<CommercialCatalogResponse> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = audience
    ? await db
        .select()
        .from(plans)
        .where(and(eq(plans.segment, audience), eq(plans.isActive, 1)))
        .orderBy(asc(plans.sortOrder), asc(plans.id))
    : await db
        .select()
        .from(plans)
        .where(eq(plans.isActive, 1))
        .orderBy(asc(plans.sortOrder), asc(plans.id));
  const publicPlans = filterCommercialPlans(rows, audience);
  const planIds = publicPlans.map(plan => plan.id);
  const entitlementRows = planIds.length
    ? await db
        .select({
          planId: planEntitlements.planId,
          featureKey: planEntitlements.featureKey,
          valueJson: planEntitlements.valueJson,
        })
        .from(planEntitlements)
        .where(inArray(planEntitlements.planId, planIds))
    : [];
  const entitlementByPlanId = new Map<number, EntitlementMap>();

  for (const planId of planIds) {
    entitlementByPlanId.set(planId, { ...DEFAULT_FEATURE_ENTITLEMENTS });
  }

  for (const row of entitlementRows) {
    const entitlements = entitlementByPlanId.get(row.planId) || {
      ...DEFAULT_FEATURE_ENTITLEMENTS,
    };
    entitlements[row.featureKey] = parseEntitlementValue(row.valueJson);
    entitlementByPlanId.set(row.planId, entitlements);
  }

  return {
    authority: {
      products: 'canonical_plans',
      entitlements: 'plan_entitlements',
      prices: 'billingFoundationService',
      paidState: 'canonical_subscriptions_and_verified_billing',
    },
    audience: audience || null,
    products: publicPlans.map(plan =>
      buildCommercialProduct(
        plan,
        entitlementByPlanId.get(plan.id) || {
          ...DEFAULT_FEATURE_ENTITLEMENTS,
        },
      ),
    ),
  };
}

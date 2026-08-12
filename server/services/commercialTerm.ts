export const COMMERCIAL_TERM_KINDS = [
  'free_trial',
  'paid_launch_access',
  'recurring_subscription',
] as const;

export type CommercialTermKind = (typeof COMMERCIAL_TERM_KINDS)[number];

export type CommercialTerm = {
  kind: CommercialTermKind;
  durationDays: number | null;
  requiresVerifiedPayment: boolean;
  autoRenews: boolean;
};

export type VerifiedPaymentLike = {
  invoiceId: number;
  paymentId: number;
  amountMinor: number;
  state: 'verified' | string;
};

type PlanTermSource = {
  name?: string | null;
  price?: number | null;
  priceMonthly?: number | null;
  trialDays?: number | null;
  metadata?: unknown;
};

export function parseCommercialMetadata(value: unknown): Record<string, unknown> {
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

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function configuredTermKind(value: unknown): CommercialTermKind | null {
  return typeof value === 'string' && COMMERCIAL_TERM_KINDS.includes(value as CommercialTermKind)
    ? (value as CommercialTermKind)
    : null;
}

/**
 * Resolve the commercial meaning of a canonical plan. `trialDays` is only
 * interpreted as a free-trial duration when the plan has no explicit term
 * kind. Paid fixed-term access is deliberately represented by metadata so it
 * cannot be mistaken for a free trial by a caller that only sees a duration.
 */
export function resolveCommercialTerm(plan: PlanTermSource): CommercialTerm {
  const metadata = parseCommercialMetadata(plan.metadata);
  const trialDays = parsePositiveInteger(plan.trialDays) || 0;
  const explicitKind = configuredTermKind(
    metadata.commercial_term_kind ?? metadata.commercialTermKind,
  );
  const kind = explicitKind || (trialDays > 0 ? 'free_trial' : 'recurring_subscription');

  if (kind === 'free_trial') {
    return {
      kind,
      durationDays: trialDays > 0 ? trialDays : null,
      requiresVerifiedPayment: false,
      autoRenews: false,
    };
  }

  if (kind === 'paid_launch_access') {
    return {
      kind,
      durationDays: parsePositiveInteger(
        metadata.commercial_term_duration_days ??
          metadata.commercialTermDurationDays ??
          metadata.access_duration_days ??
          metadata.accessDurationDays,
      ),
      requiresVerifiedPayment:
        parseBoolean(
          metadata.commercial_requires_verified_payment ??
            metadata.commercialRequiresVerifiedPayment,
        ) ?? true,
      autoRenews:
        parseBoolean(metadata.commercial_auto_renews ?? metadata.commercialAutoRenews) ?? false,
    };
  }

  return {
    kind,
    durationDays: null,
    requiresVerifiedPayment:
      parseBoolean(
        metadata.commercial_requires_verified_payment ?? metadata.commercialRequiresVerifiedPayment,
      ) ?? true,
    autoRenews:
      parseBoolean(metadata.commercial_auto_renews ?? metadata.commercialAutoRenews) ?? true,
  };
}

export function getCommercialProductKey(plan: PlanTermSource): string {
  const metadata = parseCommercialMetadata(plan.metadata);
  const configured = metadata.commercial_product_key ?? metadata.commercialProductKey;
  if (typeof configured === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(configured)) {
    return configured;
  }
  return String(plan.name || 'unidentified_product');
}

/**
 * A launch fee is intentionally separate from the recurring plan price
 * columns. Those columns are non-null in the historical schema and a zero
 * value is therefore only a storage placeholder until the founder-approved
 * once-off fee is configured.
 */
export function getConfiguredLaunchFeeMinor(plan: PlanTermSource): number | null {
  const metadata = parseCommercialMetadata(plan.metadata);
  const configured = parseBoolean(
    metadata.commercial_price_configured ?? metadata.commercialPriceConfigured,
  );
  if (configured === false) return null;

  return parsePositiveInteger(
    metadata.commercial_launch_fee_minor ??
      metadata.commercialLaunchFeeMinor ??
      metadata.launch_fee_minor ??
      metadata.launchFeeMinor,
  );
}

export function hasConfiguredCommercialPrice(plan: PlanTermSource): boolean {
  const term = resolveCommercialTerm(plan);
  if (term.kind === 'paid_launch_access') return getConfiguredLaunchFeeMinor(plan) !== null;

  const recurringPrice = Number(plan.priceMonthly || plan.price || 0);
  return Number.isFinite(recurringPrice) && recurringPrice > 0;
}

export function calculateCommercialTermEnd(start: Date, term: CommercialTerm): Date | null {
  if (term.kind !== 'paid_launch_access' || !term.durationDays) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + term.durationDays);
  return end;
}

export function isPaidCommercialTermExpired(
  term: CommercialTerm,
  status: string | null | undefined,
  currentPeriodEnd: string | Date | null | undefined,
  now = new Date(),
): boolean {
  if (term.kind !== 'paid_launch_access') return false;
  if (status !== 'active' && status !== 'grace_period') return false;
  if (!currentPeriodEnd) return false;
  const end = currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
}

export function validatePaidLaunchAccessPayment(
  term: CommercialTerm,
  configuredFeeMinor: number | null,
  payment: VerifiedPaymentLike,
): string | null {
  if (term.kind !== 'paid_launch_access' || !term.durationDays || term.autoRenews) {
    return 'Selected plan is not a valid non-renewing paid Launch Access product.';
  }
  if (!term.requiresVerifiedPayment || payment.state !== 'verified') {
    return 'Paid Launch Access requires a verified canonical payment.';
  }
  if (
    !Number.isSafeInteger(payment.invoiceId) ||
    payment.invoiceId <= 0 ||
    !Number.isSafeInteger(payment.paymentId) ||
    payment.paymentId <= 0 ||
    !Number.isSafeInteger(payment.amountMinor) ||
    payment.amountMinor <= 0
  ) {
    return 'Paid Launch Access requires a verified positive canonical payment.';
  }
  if (configuredFeeMinor === null) {
    return 'Launch Access cannot activate until its once-off fee is configured.';
  }
  if (payment.amountMinor < configuredFeeMinor) {
    return 'Verified payment is below the configured Launch Access fee.';
  }
  return null;
}

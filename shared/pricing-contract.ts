/**
 * Canonical pricing vocabulary shared by listing authoring, publication and
 * public presentation.
 *
 * The database still contains legacy typed pricing columns. This contract is
 * the semantic authority for new Sale/Rent pricing; the legacy columns remain
 * compatibility projections/read sources only.
 */

export const PRICING_CONTRACT_VERSION = 1 as const;

export type PricingAction = 'sell' | 'rent' | 'auction';
export type PricingIntent = 'sale' | 'rent';

export type MoneyFactStatus = 'known' | 'zero' | 'unknown' | 'not_applicable';

export interface MoneyFact {
  status: MoneyFactStatus;
  amount?: number;
  provenance?: 'advertiser' | 'legacy';
}

export type ChargeCadence = 'monthly' | 'annual' | 'once' | 'unknown';

export interface RecurringChargeFact extends MoneyFact {
  cadence?: ChargeCadence;
}

export type RecurringCostKey =
  | 'ratesAndTaxes'
  | 'bodyCorporateLevy'
  | 'hoaEstateLevy'
  | 'specialLevy'
  | 'otherMandatoryCharge';

export type RecurringCosts = Partial<Record<RecurringCostKey, RecurringChargeFact>>;

export type Negotiability = 'negotiable' | 'not_negotiable' | 'unknown';

export interface SalePricingContract {
  version: typeof PRICING_CONTRACT_VERSION;
  intent: 'sale';
  askingPrice?: number;
  negotiability: Negotiability;
  recurringCosts: RecurringCosts;
}

export interface RentPricingContract {
  version: typeof PRICING_CONTRACT_VERSION;
  intent: 'rent';
  monthlyRent?: number;
  deposit?: MoneyFact;
}

export type ActivePricingContract = SalePricingContract | RentPricingContract;

export interface BuildPricingContractOptions {
  /**
   * Read paths should prefer an already-approved embedded contract. Write
   * paths must set this to false so a new request cannot be shadowed by an
   * older propertyDetails snapshot.
   */
  preferEmbedded?: boolean;
}

export interface PricingValidationIssue {
  field: string;
  message: string;
}

const MONEY_STATUSES: readonly MoneyFactStatus[] = ['known', 'zero', 'unknown', 'not_applicable'];

const RECURRING_COST_KEYS: readonly RecurringCostKey[] = [
  'ratesAndTaxes',
  'bodyCorporateLevy',
  'hoaEstateLevy',
  'specialLevy',
  'otherMandatoryCharge',
];

const CADENCES: readonly ChargeCadence[] = ['monthly', 'annual', 'once', 'unknown'];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const numberOrUndefined = (value: unknown): number | undefined => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const isMoneyFactStatus = (value: unknown): value is MoneyFactStatus =>
  typeof value === 'string' && MONEY_STATUSES.includes(value as MoneyFactStatus);

export const isRecurringCostKey = (value: unknown): value is RecurringCostKey =>
  typeof value === 'string' && RECURRING_COST_KEYS.includes(value as RecurringCostKey);

export const isChargeCadence = (value: unknown): value is ChargeCadence =>
  typeof value === 'string' && CADENCES.includes(value as ChargeCadence);

export function normalizeMoneyFact(value: unknown): MoneyFact | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    const status = raw.status;
    if (!isMoneyFactStatus(status)) return undefined;

    if (status === 'zero') {
      return { status: 'zero', provenance: raw.provenance === 'legacy' ? 'legacy' : 'advertiser' };
    }

    if (status === 'unknown' || status === 'not_applicable') {
      return {
        status,
        provenance: raw.provenance === 'legacy' ? 'legacy' : 'advertiser',
      };
    }

    const amount = numberOrUndefined(raw.amount ?? raw.value);
    if (amount === undefined) {
      return {
        status: 'known',
        provenance: raw.provenance === 'legacy' ? 'legacy' : 'advertiser',
      };
    }
    if (amount < 0) return undefined;
    if (amount === 0) {
      return { status: 'zero', provenance: raw.provenance === 'legacy' ? 'legacy' : 'advertiser' };
    }
    return {
      status: 'known',
      amount,
      provenance: raw.provenance === 'legacy' ? 'legacy' : 'advertiser',
    };
  }

  const amount = numberOrUndefined(value);
  if (amount === undefined || amount < 0) return undefined;
  return amount === 0
    ? { status: 'zero', provenance: 'legacy' }
    : { status: 'known', amount, provenance: 'legacy' };
}

export function normalizeRecurringCharge(value: unknown): RecurringChargeFact | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const money = normalizeMoneyFact(value);
    return money;
  }

  const raw = value as Record<string, unknown>;
  const money = normalizeMoneyFact(raw);
  if (!money) return undefined;
  const cadence = isChargeCadence(raw.cadence) ? raw.cadence : undefined;
  return cadence ? { ...money, cadence } : money;
}

export function normalizeRecurringCosts(value: unknown): RecurringCosts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const normalized: RecurringCosts = {};

  for (const key of RECURRING_COST_KEYS) {
    const fact = normalizeRecurringCharge(raw[key]);
    if (fact) normalized[key] = fact;
  }

  return normalized;
}

const legacyMoney = (value: unknown): MoneyFact | undefined => {
  const normalized = normalizeMoneyFact(value);
  return normalized ? { ...normalized, provenance: 'legacy' } : undefined;
};

function buildLegacyRecurringCosts(
  pricing: Record<string, unknown>,
  details: Record<string, unknown>,
): RecurringCosts {
  const source = { ...details, ...pricing };
  const costs: RecurringCosts = {};

  const rates = legacyMoney(source.ratesAndTaxes ?? source.ratesTaxes);
  if (rates) costs.ratesAndTaxes = { ...rates, cadence: 'monthly' };

  // The old `levies` field had no reliable body-corporate/HOA meaning. Keep
  // its amount without inventing which legal cost it represented.
  const levy = legacyMoney(source.levies ?? source.leviesHoaOperatingCosts);
  if (levy) costs.otherMandatoryCharge = { ...levy, cadence: 'monthly' };

  return costs;
}

function normalizeEmbeddedContract(value: unknown): ActivePricingContract | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (raw.version !== PRICING_CONTRACT_VERSION) return undefined;

  if (raw.intent === 'sale') {
    const askingPrice = numberOrUndefined(raw.askingPrice);
    const negotiability: Negotiability =
      raw.negotiability === 'negotiable' ||
      raw.negotiability === 'not_negotiable' ||
      raw.negotiability === 'unknown'
        ? raw.negotiability
        : 'unknown';
    return {
      version: PRICING_CONTRACT_VERSION,
      intent: 'sale',
      askingPrice: askingPrice !== undefined && askingPrice >= 0 ? askingPrice : undefined,
      negotiability,
      recurringCosts: normalizeRecurringCosts(raw.recurringCosts),
    };
  }

  if (raw.intent === 'rent') {
    const monthlyRent = numberOrUndefined(raw.monthlyRent);
    return {
      version: PRICING_CONTRACT_VERSION,
      intent: 'rent',
      monthlyRent: monthlyRent !== undefined && monthlyRent >= 0 ? monthlyRent : undefined,
      deposit: normalizeMoneyFact(raw.deposit),
    };
  }

  return undefined;
}

export function buildPricingContract(
  action: PricingAction | string | undefined,
  pricing: Record<string, unknown> | null | undefined,
  propertyDetails: Record<string, unknown> | null | undefined = {},
  options: BuildPricingContractOptions = {},
): ActivePricingContract | undefined {
  if (action !== 'sell' && action !== 'rent') return undefined;

  const rawPricing = pricing || {};
  const details = propertyDetails || {};
  const embedded = normalizeEmbeddedContract(details.pricingContract ?? rawPricing.pricingContract);
  if (
    options.preferEmbedded !== false &&
    embedded &&
    embedded.intent === (action === 'sell' ? 'sale' : 'rent')
  ) {
    return embedded;
  }

  if (action === 'sell') {
    const askingPrice = numberOrUndefined(rawPricing.askingPrice);
    const legacyNegotiable = rawPricing.negotiable;
    const negotiability: Negotiability =
      rawPricing.negotiability === 'negotiable' ||
      rawPricing.negotiability === 'not_negotiable' ||
      rawPricing.negotiability === 'unknown'
        ? rawPricing.negotiability
        : legacyNegotiable === true
          ? 'negotiable'
          : legacyNegotiable === false
            ? 'not_negotiable'
            : 'unknown';
    const recurringCosts = Object.keys(rawPricing.recurringCosts || {}).length
      ? normalizeRecurringCosts(rawPricing.recurringCosts)
      : buildLegacyRecurringCosts(rawPricing, details);

    return {
      version: PRICING_CONTRACT_VERSION,
      intent: 'sale',
      askingPrice: askingPrice !== undefined && askingPrice >= 0 ? askingPrice : undefined,
      negotiability,
      recurringCosts,
    };
  }

  const monthlyRent = numberOrUndefined(rawPricing.monthlyRent);
  const deposit = normalizeMoneyFact(rawPricing.depositFact ?? rawPricing.deposit);
  return {
    version: PRICING_CONTRACT_VERSION,
    intent: 'rent',
    monthlyRent: monthlyRent !== undefined && monthlyRent >= 0 ? monthlyRent : undefined,
    deposit,
  };
}

export function getPrimaryPrice(
  action: PricingAction | string | undefined,
  pricing: Record<string, unknown> | null | undefined,
  propertyDetails: Record<string, unknown> | null | undefined = {},
): number | undefined {
  const rawPricing = pricing || {};
  const contract = buildPricingContract(action, rawPricing, propertyDetails);
  if (contract?.intent === 'sale') return contract.askingPrice;
  if (contract?.intent === 'rent') return contract.monthlyRent;
  if (action === 'auction') return numberOrUndefined(rawPricing.startingBid);
  return undefined;
}

export function getMoneyFactAmount(fact: MoneyFact | undefined): number | undefined {
  if (!fact) return undefined;
  if (fact.status === 'zero') return 0;
  if (fact.status === 'known' && isFiniteNumber(fact.amount)) return fact.amount;
  return undefined;
}

function validateMoneyFact(value: unknown, field: string): PricingValidationIssue[] {
  if (value === undefined) return [];
  const fact = normalizeMoneyFact(value);
  if (!fact) return [{ field, message: `${field} must be a valid monetary state` }];
  if (fact.status === 'known' && (!isFiniteNumber(fact.amount) || fact.amount < 0)) {
    return [{ field, message: `${field} must be zero or greater` }];
  }
  return [];
}

function validateRecurringCosts(costs: unknown): PricingValidationIssue[] {
  if (costs === undefined) return [];
  if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
    return [{ field: 'recurringCosts', message: 'Recurring costs must be an object' }];
  }

  const issues: PricingValidationIssue[] = [];
  for (const [key, value] of Object.entries(costs as Record<string, unknown>)) {
    if (!isRecurringCostKey(key)) {
      issues.push({ field: `recurringCosts.${key}`, message: 'Unsupported recurring cost' });
      continue;
    }
    issues.push(...validateMoneyFact(value, `recurringCosts.${key}`));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const cadence = (value as Record<string, unknown>).cadence;
      if (cadence !== undefined && !isChargeCadence(cadence)) {
        issues.push({ field: `recurringCosts.${key}.cadence`, message: 'Invalid charge cadence' });
      }
    }
  }
  return issues;
}

export function validatePricingContract(
  action: PricingAction | string | undefined,
  pricing: Record<string, unknown> | null | undefined,
  propertyDetails: Record<string, unknown> | null | undefined = {},
  options: { mode?: 'draft' | 'publish'; enforceInputShape?: boolean } = {},
): PricingValidationIssue[] {
  if (action === 'auction') return [];
  if (action !== 'sell' && action !== 'rent') {
    return [{ field: 'action', message: 'A valid Sale or Rent action is required for pricing' }];
  }

  const raw = pricing || {};
  const mode = options.mode || 'draft';
  const enforceInputShape = options.enforceInputShape !== false;
  const issues: PricingValidationIssue[] = [];
  const contract = buildPricingContract(action, raw, propertyDetails, {
    preferEmbedded: false,
  });
  const saleContract = contract?.intent === 'sale' ? contract : undefined;
  const rentContract = contract?.intent === 'rent' ? contract : undefined;

  if (enforceInputShape && action === 'sell') {
    if (
      raw.monthlyRent !== undefined ||
      raw.deposit !== undefined ||
      raw.depositFact !== undefined ||
      raw.leaseTerms !== undefined ||
      raw.availableFrom !== undefined ||
      raw.utilitiesIncluded !== undefined
    ) {
      issues.push({ field: 'pricing', message: 'Sale pricing cannot contain Rent pricing fields' });
    }
  }
  if (enforceInputShape && action === 'rent') {
    if (
      raw.askingPrice !== undefined ||
      raw.negotiable !== undefined ||
      raw.negotiability !== undefined ||
      raw.transferCostEstimate !== undefined ||
      raw.recurringCosts !== undefined ||
      raw.levies !== undefined ||
      raw.ratesAndTaxes !== undefined
    ) {
      issues.push({ field: 'pricing', message: 'Rent pricing cannot contain Sale pricing fields' });
    }
  }

  if (action === 'sell') {
    if (saleContract?.askingPrice !== undefined && saleContract.askingPrice <= 0) {
      issues.push({ field: 'askingPrice', message: 'Asking price must be greater than 0' });
    }
    if (
      mode === 'publish' &&
      (!saleContract || saleContract.askingPrice === undefined || saleContract.askingPrice <= 0)
    ) {
      issues.push({
        field: 'askingPrice',
        message: 'A valid asking price is required before publication',
      });
    }
    issues.push(
      ...validateRecurringCosts(
        raw.recurringCosts !== undefined ? raw.recurringCosts : saleContract?.recurringCosts,
      ),
    );
  }

  if (action === 'rent') {
    if (rentContract?.monthlyRent !== undefined && rentContract.monthlyRent <= 0) {
      issues.push({ field: 'monthlyRent', message: 'Monthly rent must be greater than 0' });
    }
    if (
      mode === 'publish' &&
      (!rentContract || rentContract.monthlyRent === undefined || rentContract.monthlyRent <= 0)
    ) {
      issues.push({
        field: 'monthlyRent',
        message: 'A valid monthly rent is required before publication',
      });
    }
    issues.push(...validateMoneyFact(rentContract?.deposit, 'deposit'));
    if (rentContract?.deposit?.status === 'not_applicable') {
      issues.push({
        field: 'deposit',
        message: 'Rental deposit must be an amount, confirmed R0, or Not sure',
      });
    }
    if (mode === 'publish' && !rentContract?.deposit) {
      issues.push({
        field: 'deposit',
        message: 'Choose a deposit amount, no deposit, or Not sure before publication',
      });
    }
  }

  return issues;
}

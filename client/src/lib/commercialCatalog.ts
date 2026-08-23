import type { CommercialProduct } from '@/hooks/useCommercialCatalog';

export type CommercialPricePresentation = {
  label: string;
  period: string | null;
  kind: 'fixed' | 'contact_sales' | 'unavailable';
};

export type CommercialActionPresentation = {
  label: string;
  href: string | null;
  disabled: boolean;
};

export type CommercialTermPresentation = {
  label: string;
  renewalLabel: string | null;
};

/**
 * Convert the billing authority's minor-unit amount into display currency.
 * The client formats the value only; it never replaces the amount.
 */
export function formatCommercialPrice(
  price: CommercialProduct['pricing']['basePrice'],
): string | null {
  if (!price || !Number.isFinite(price.amountMinor)) return null;

  const formatted = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price.amountMinor / 100);

  // Keep the public ZAR presentation legible as R499 / R1,499 while the
  // numeric amount still comes exclusively from the catalog.
  if (price.currency === 'ZAR') {
    return formatted.replace(/^R\u00a0/, 'R').replace(/\u00a0(?=\d{3}(?:\D|$))/g, ',');
  }

  return formatted;
}

export function getCommercialPricePresentation(
  product: CommercialProduct,
): CommercialPricePresentation {
  if (product.pricing.mode === 'contact_sales') {
    return { label: 'Contact sales', period: null, kind: 'contact_sales' };
  }

  if (product.pricing.mode !== 'fixed') {
    return { label: 'Pricing unavailable', period: null, kind: 'unavailable' };
  }

  const label = formatCommercialPrice(product.pricing.basePrice);
  if (!label) {
    return { label: 'Pricing unavailable', period: null, kind: 'unavailable' };
  }

  return {
    label,
    period:
      product.pricing.billingInterval === 'annual'
        ? '/year'
        : product.pricing.billingInterval === 'once'
          ? ' once-off'
          : '/month',
    kind: 'fixed',
  };
}

export function getCommercialTermPresentation(
  product: CommercialProduct,
): CommercialTermPresentation {
  const { term } = product;

  if (term.kind === 'paid_launch_access' && term.durationDays) {
    return {
      label: `${term.durationDays} days`,
      renewalLabel: term.autoRenews ? 'Automatically renews' : 'No automatic renewal',
    };
  }

  if (term.kind === 'free_trial' && term.durationDays) {
    return { label: `${term.durationDays}-day free trial`, renewalLabel: null };
  }

  return {
    label: 'Term configured by Property Listify',
    renewalLabel: term.autoRenews ? 'Automatically renews' : null,
  };
}

/**
 * Return limits that are meaningful in the public product presentation.
 *
 * The developer launch authority uses max_active_listings: 0 as a
 * non-applicable sentinel while its actual entitlement is the development
 * portfolio. Do not present that sentinel as a customer-facing restriction.
 */
export function getCommercialPresentationLimits(
  product: CommercialProduct,
): Array<[string, unknown]> {
  return Object.entries(product.limits).filter(([key, value]) => {
    if (value === null) return false;
    return !(product.audience === 'developer' && key === 'max_active_listings' && value === 0);
  });
}

/**
 * Translate a server action into a truthful public CTA. Procedure targets are
 * intentionally not rendered as URLs; the public page uses the established
 * assisted route when the catalog says invoice or manual-EFT activation.
 */
export function getCommercialActionPresentation(
  product: CommercialProduct,
): CommercialActionPresentation {
  const routeTarget = product.action.target?.kind === 'route' ? product.action.target.value : null;

  switch (product.action.mode) {
    case 'manual_eft':
      return {
        label: product.audience === 'agency' ? 'Start agency onboarding' : 'Start setup',
        href: product.audience === 'agency' ? '/agency/onboarding' : '/role-selection',
        disabled: false,
      };
    case 'request_invoice':
      return {
        label:
          product.audience === 'agent'
            ? 'Get Agent Launch Access'
            : product.term.kind === 'paid_launch_access'
              ? 'Request Launch Access invoice'
              : 'Request invoice',
        href: routeTarget || '/contact',
        disabled: false,
      };
    case 'contact_sales':
      return { label: 'Contact sales', href: routeTarget || '/contact', disabled: false };
    case 'trial':
      return { label: 'Start free trial', href: routeTarget || '/role-selection', disabled: false };
    case 'unavailable':
    default:
      return { label: 'Currently unavailable', href: null, disabled: true };
  }
}

export function formatCommercialAudience(audience: CommercialProduct['audience']): string {
  return audience.charAt(0).toUpperCase() + audience.slice(1);
}

export function formatCommercialLimitLabel(key: string): string {
  return key
    .replace(/^max_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function formatCommercialLimitValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included';
  return String(value);
}

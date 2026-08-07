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

/**
 * Convert the billing authority's minor-unit amount into display currency.
 * The client formats the value only; it never replaces the amount.
 */
export function formatCommercialPrice(
  price: CommercialProduct['pricing']['basePrice'],
): string | null {
  if (!price || !Number.isFinite(price.amountMinor)) return null;

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price.amountMinor / 100);
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
    period: product.pricing.billingInterval === 'annual' ? '/year' : '/month',
    kind: 'fixed',
  };
}

/**
 * Translate a server action into a truthful public CTA. A procedure target is
 * intentionally not rendered as a URL: the existing agency manual-EFT flow
 * starts through its established onboarding route.
 */
export function getCommercialActionPresentation(
  product: CommercialProduct,
): CommercialActionPresentation {
  const routeTarget = product.action.target?.kind === 'route' ? product.action.target.value : null;

  switch (product.action.mode) {
    case 'manual_eft':
      return {
        label: 'Start agency onboarding',
        href: '/agency/onboarding',
        disabled: false,
      };
    case 'request_invoice':
      return { label: 'Request invoice', href: routeTarget || '/contact', disabled: false };
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

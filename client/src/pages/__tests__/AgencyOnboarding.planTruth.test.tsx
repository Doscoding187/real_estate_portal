import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(),
    agency: {
      createOnboarding: { useMutation: vi.fn() },
    },
    billing: {
      createCheckoutSession: { useMutation: vi.fn() },
    },
  },
}));

import { PlanSelectionStep, describeAgencyPlanBilling } from '../AgencyOnboarding';

// Radix RadioGroup observes layout in jsdom environments without ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= ResizeObserverStub;

const noop = () => {};

function launchAccessProduct(): CommercialProduct {
  return {
    productId: 'plan:12',
    productKey: 'agency_launch_access',
    productType: 'subscription',
    name: 'agency_launch_access',
    displayName: 'Agency Launch Access',
    description: 'Paid 90-day Agency Launch Access.',
    audience: 'agency',
    active: true,
    popular: true,
    benefits: ['Agency inventory management', 'Lead routing'],
    limits: { max_active_listings: 500 },
    entitlements: { max_active_listings: 500 },
    trial: { days: 0, available: false },
    term: {
      kind: 'paid_launch_access',
      durationDays: 90,
      requiresVerifiedPayment: true,
      autoRenews: false,
    },
    pricing: {
      mode: 'fixed',
      currency: 'ZAR',
      billingInterval: 'once',
      basePrice: { amountMinor: 99_900, currency: 'ZAR' },
    },
    promotion: { status: 'not_configured', offer: null },
    action: {
      mode: 'request_invoice',
      target: { kind: 'route', value: '/agency/setup' },
      requiresAuthentication: false,
    },
    source: { authority: 'canonical_plans', planId: 12, planKey: 'agency_launch_access' },
  } as unknown as CommercialProduct;
}

function monthlyRecurringProduct(): CommercialProduct {
  return {
    ...launchAccessProduct(),
    productId: 'plan:13',
    productKey: 'agency_growth',
    name: 'agency_growth',
    displayName: 'Agency Growth',
    popular: false,
    term: {
      kind: 'recurring_subscription',
      durationDays: null,
      requiresVerifiedPayment: true,
      autoRenews: true,
    },
    pricing: {
      mode: 'fixed',
      currency: 'ZAR',
      billingInterval: 'monthly',
      basePrice: { amountMinor: 49_900, currency: 'ZAR' },
    },
    source: { authority: 'canonical_plans', planId: 13, planKey: 'agency_growth' },
  } as unknown as CommercialProduct;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Agency onboarding plan selection commercial truth', () => {
  it('presents the once-off Launch Access offer without monthly-recurring language', () => {
    render(<PlanSelectionStep plans={[launchAccessProduct()]} onNext={noop} onPrev={noop} />);

    expect(screen.getByTestId('plan-price')).toHaveTextContent('R999');
    expect(screen.getByText('once-off')).toBeInTheDocument();
    expect(screen.getByTestId('plan-term-note')).toHaveTextContent(
      'Access period: 90 days · No automatic renewal',
    );
    expect(screen.queryByText(/\/month/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/month/)).not.toBeInTheDocument();
  });

  it('derives the once-off term presentation from canonical catalog metadata, not literals', () => {
    const product = launchAccessProduct();
    // Simulate the canonical authority changing the configured launch terms:
    // the UI must follow the metadata rather than any hardcoded copy.
    (product.term as { durationDays: number | null }).durationDays = 45;
    (product.pricing.basePrice as { amountMinor: number }).amountMinor = 49_900;

    const billing = describeAgencyPlanBilling(product);
    expect(billing.priceLabel).toBe('R499');
    expect(billing.periodSuffix).toBe('once-off');
    expect(billing.termNote).toBe('Access period: 45 days · No automatic renewal');
  });

  it('keeps correct recurring formatting for ordinary recurring plans', () => {
    render(<PlanSelectionStep plans={[monthlyRecurringProduct()]} onNext={noop} onPrev={noop} />);

    expect(screen.getByTestId('plan-price')).toHaveTextContent('R499');
    expect(screen.getByText('/month')).toBeInTheDocument();
    expect(screen.getByTestId('plan-term-note')).toHaveTextContent('Automatically renews');
    expect(screen.queryByText('once-off')).not.toBeInTheDocument();
  });

  it('does not promise flexible plan switching for non-renewing Launch Access', () => {
    render(<PlanSelectionStep plans={[launchAccessProduct()]} onNext={noop} onPrev={noop} />);

    expect(screen.queryByText(/change your plan anytime/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/selection determines the invoice issued at the end of this wizard/i),
    ).toBeInTheDocument();
  });

  it('uses the canonical plan id as the selectable plan value', () => {
    render(<PlanSelectionStep plans={[launchAccessProduct()]} onNext={noop} onPrev={noop} />);

    const radio = screen.getByLabelText(/Agency Launch Access/);
    expect(radio).toHaveAttribute('value', '12');
  });

  it('reports unavailable canonical pricing instead of inventing legacy storage values', () => {
    const unavailable = {
      ...launchAccessProduct(),
      pricing: {
        ...launchAccessProduct().pricing,
        mode: 'unavailable' as const,
        basePrice: null,
      },
    } as unknown as CommercialProduct;

    const billing = describeAgencyPlanBilling(unavailable);
    expect(billing.priceLabel).toBe('Pricing unavailable');
    expect(billing.periodSuffix).toBeNull();
    expect(billing.termNote).toBeNull();
  });
});

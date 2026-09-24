import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdvertiseWithUs from './AdvertiseWithUs';

vi.mock('@/hooks/useAdvertiseAnalytics', () => ({
  useAdvertiseAnalytics: vi.fn(),
}));

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: vi.fn(),
}));

vi.mock('@/components/EnhancedNavbar', () => ({
  EnhancedNavbar: () => <nav aria-label="Mock navigation" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer>Mock footer</footer>,
}));

vi.mock('@/components/advertise/SEOHead', () => ({
  SEOHead: () => null,
}));

vi.mock('@/components/advertise/VisualPathCard', () => ({
  VisualPathCard: ({ href, ctaText }: { href: string; ctaText: string }) => (
    <a href={href}>{ctaText}</a>
  ),
}));

import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('public advertise entry', () => {
  it('shows only the available preparation paths while commercial activation is disabled', () => {
    render(<AdvertiseWithUs />);

    expect(screen.getByTestId('advertise-preparation-page')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your Property Listify workspace before commercial activation.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start Agent preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: 'Start Agency preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: 'Start Developer preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(
      screen.getByText(
        /does not activate payment, grant a commercial entitlement, or make inventory public/i,
      ),
    ).toBeInTheDocument();
    expect(useCommercialCatalog).not.toHaveBeenCalled();
  });

  it('does not advertise paid terms, invoice handling, or manual EFT while activation is disabled', () => {
    render(<AdvertiseWithUs />);

    expect(screen.queryByText(/90-Day Launch Access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manual EFT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Finance-verified activation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request Launch Access invoice/i)).not.toBeInTheDocument();
  });
});

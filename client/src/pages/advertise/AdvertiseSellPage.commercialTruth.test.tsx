import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdvertiseSellPage from './AdvertiseSellPage';

vi.mock('wouter', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('public role-path chooser', () => {
  it('routes every role to preparation rather than a paid commercial path while activation is disabled', () => {
    render(<AdvertiseSellPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Choose your Property Listify preparation path',
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
        /Marketplace publication, paid commercial access, and new marketplace opportunities remain protected/i,
      ),
    ).toBeInTheDocument();
  });

  it('does not advertise a paid term or invoice path while activation is disabled', () => {
    render(<AdvertiseSellPage />);

    expect(screen.queryByText(/Choose Your Launch Access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manual EFT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request Launch Access invoice/i)).not.toBeInTheDocument();
  });
});

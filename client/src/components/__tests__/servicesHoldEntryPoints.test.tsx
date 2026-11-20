import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Simulate a hosted build after the Services public release.
vi.mock('@/lib/publicNavigation', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/publicNavigation')>();
  return {
    ...actual,
    isJourneyRouteHeld: (key: string) => actual.isLaunchHeldJourney(key),
    isHomepageHeroJourneyEnabled: () => true,
  };
});

import AdvertiseServicesPage from '@/pages/advertise/AdvertiseServicesPage';
import { AgentServicesReferral, AgentServicesReferralPanel } from '../agent/AgentServicesReferral';
import { ServicesSiteFooter } from '../services/ServicesSiteFooter';

function servicesLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll('a'))
    .map(a => a.getAttribute('href') || '')
    .filter(href => href === '/services' || href.startsWith('/services/'));
}

describe('consumer Services entry points after the public release', () => {
  it('keeps /advertise/services open and links to the directory', () => {
    const { container } = render(<AdvertiseServicesPage />);
    expect(
      screen.getByText('Give your service business a professional home on Property Listify.'),
    ).toBeInTheDocument();
    expect(servicesLinks(container)).toContain('/services');
  });

  it('shows the agent services referral panel and single referral links', () => {
    const panel = render(<AgentServicesReferralPanel />);
    expect(panel.getByRole('link', { name: /browse the full services directory/i })).toHaveAttribute(
      'href',
      '/services',
    );
    const single = render(<AgentServicesReferral category="moving" />);
    expect(
      within(single.container).getByRole('link', { name: /find moving providers/i }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/services/moving'),
    );
  });

  it('shows consumer services links in the Services footer and keeps provider onboarding', () => {
    const { container } = render(<ServicesSiteFooter />);
    expect(servicesLinks(container).length).toBeGreaterThan(5);
    expect(screen.getByRole('link', { name: 'List your business' })).toHaveAttribute(
      'href',
      '/service/profile',
    );
  });
});

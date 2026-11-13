import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Simulate a hosted build while the services journey is held.
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
import { PropertyServiceActions } from '../property/PropertyServiceActions';
import { ServicesSiteFooter } from '../services/ServicesSiteFooter';

function servicesLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll('a'))
    .map(a => a.getAttribute('href') || '')
    .filter(href => href === '/services' || href.startsWith('/services/'));
}

describe('consumer Services entry points while the directory is held', () => {
  it('keeps /advertise/services open but drops its link to the directory', () => {
    const { container } = render(<AdvertiseServicesPage />);
    expect(
      screen.getByText('Put your property service in front of the right audience.'),
    ).toBeInTheDocument();
    expect(servicesLinks(container)).toEqual([]);
  });

  it('hides the agent services referral panel and single referral links', () => {
    const panel = render(<AgentServicesReferralPanel />);
    expect(panel.container).toBeEmptyDOMElement();
    const single = render(<AgentServicesReferral category="moving" />);
    expect(single.container).toBeEmptyDOMElement();
  });

  it('hides the listing-page property service actions', () => {
    const { container } = render(
      <PropertyServiceActions propertyId={1} listingType="sale" suburb="Sandton" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('removes consumer services links from the services footer but keeps provider onboarding', () => {
    const { container } = render(<ServicesSiteFooter />);
    expect(servicesLinks(container)).toEqual([]);
    expect(screen.getByRole('link', { name: 'List your business' })).toHaveAttribute(
      'href',
      '/service/profile',
    );
  });
});

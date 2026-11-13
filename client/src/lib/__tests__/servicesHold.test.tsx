import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  getVisiblePublicNavigationGroups,
  getVisiblePublicNavigationMenus,
  isLaunchHeldJourney,
  PUBLIC_NAVIGATION_MENUS,
  resolvePublicJourneyReleaseContext,
} from '../publicNavigation';
import { HeldJourneyGate } from '@/pages/JourneyHeldPage';

const hosted = resolvePublicJourneyReleaseContext({ PROD: true });
const local = { hostedReleaseControlled: false, supplementalReleasedJourneys: [] };

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('consumer Services directory hold (D2)', () => {
  it('holds the services journey', () => {
    expect(isLaunchHeldJourney('services')).toBe(true);
  });

  it('renders the held page for consumer services routes even if the manifest lists services', () => {
    render(
      <HeldJourneyGate
        journey="services"
        releaseContext={{ ...hosted, supplementalReleasedJourneys: ['services'] }}
      >
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('This section is not available yet')).toBeInTheDocument();
    expect(screen.queryByText('real page')).not.toBeInTheDocument();
  });

  it('lets local development preview the services directory', () => {
    render(
      <HeldJourneyGate journey="services" releaseContext={local}>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('real page')).toBeInTheDocument();
  });

  it('wraps every consumer /services route in the gate and leaves provider and advertise routes open', () => {
    const app = readRepoFile('client/src/App.tsx');
    for (const [route, page] of [
      ['/services/request/:category', 'ServicesRequestPage'],
      ['/services/results/:leadId', 'ServicesResultsPage'],
      ['/services/provider/:slug', 'ServiceProviderProfilePage'],
      ['/services/provider/:slug/service/:service', 'ProviderServiceDetailPage'],
      ['/services/reviews/:providerId', 'ServiceProviderReviewsPage'],
      ['/services/:category', 'ServicesCategoryPage'],
      ['/services', 'ServicesHomePage'],
    ]) {
      const escaped = route.replace(/[/:]/g, m => `\\${m}`);
      expect(app).toMatch(
        new RegExp(
          `<Route path="${escaped}">\\s*<HeldJourneyGate journey="services">\\s*<${page} />`,
        ),
      );
    }
    expect(app).toContain('<Route path="/advertise/services" component={AdvertiseServicesPage} />');
    expect(app).not.toMatch(/<Route path="\/service\/[^"]*">\s*<HeldJourneyGate journey="services"/);
  });

  it('removes every consumer services navigation entry while held and keeps them locally', () => {
    const servicesHref = (href: string) => href === '/services' || href.startsWith('/services/');
    const allItems = (ctx: typeof hosted) =>
      getVisiblePublicNavigationMenus('desktop', ctx).flatMap(menu => [
        menu.feature,
        ...getVisiblePublicNavigationGroups(menu, 'desktop', ctx).flatMap(group => group.items),
      ]);

    expect(allItems(hosted).filter(item => servicesHref(item.href))).toEqual([]);
    expect(
      getVisiblePublicNavigationMenus('mobile', hosted).some(menu => menu.id === 'services'),
    ).toBe(false);
    expect(allItems(local).filter(item => servicesHref(item.href)).length).toBeGreaterThan(5);
    expect(PUBLIC_NAVIGATION_MENUS.some(menu => menu.id === 'services')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import {
  getCanonicalAccountDestination,
  getVisiblePublicNavigationGroups,
  PUBLIC_NAVIGATION_MENUS,
} from '@/lib/publicNavigation';

describe('public navigation authority', () => {
  it('exposes only supported search query values', () => {
    const hrefs = PUBLIC_NAVIGATION_MENUS.flatMap(menu =>
      menu.groups.flatMap(group => group.items.map(item => item.href)),
    );

    expect(hrefs).toContain('/property-for-sale?propertyType=plot');
    expect(hrefs).toContain('/property-for-sale?propertyType=commercial');
    expect(hrefs).not.toContain('/property-for-sale?propertyType=land');
    expect(hrefs.some(href => href.includes('propertyType=office'))).toBe(false);
    expect(hrefs.some(href => href.includes('propertyType=retail'))).toBe(false);
    expect(hrefs.some(href => href.includes('propertyType=industrial'))).toBe(false);
    expect(hrefs.some(href => href.includes('propertyType=student'))).toBe(false);
  });

  it('keeps the Professionals menu operational and filters unsupported capabilities', () => {
    const professionals = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'professionals');
    expect(professionals).toBeDefined();

    const visibleItems = getVisiblePublicNavigationGroups(professionals!, 'desktop').flatMap(
      group => group.items,
    );
    expect(visibleItems.map(item => item.href)).toEqual(
      expect.arrayContaining([
        '/agents',
        '/developers',
        '/services',
        '/distribution-network',
        '/advertise/sell/agents',
        '/advertise/sell/developers',
        '/advertise/services',
      ]),
    );
    expect(visibleItems.some(item => item.capability === 'BROKEN')).toBe(false);
  });

  it.each([
    [{ role: 'agent', hasManagerIdentity: true }, '/distribution/manager'],
    [{ role: 'admin' }, '/admin/overview'],
    [{ role: 'property_developer' }, '/developer/dashboard'],
    [{ role: 'agency_admin' }, '/agency/overview'],
    [{ role: 'agent' }, '/agent/dashboard'],
    [{ role: 'service_provider' }, '/service/dashboard'],
    [{ role: 'visitor', hasReferrerIdentity: true }, '/distribution/partner/overview'],
    [{ role: 'visitor' }, '/user/dashboard'],
  ])('resolves %s to %s', (user, href) => {
    expect(getCanonicalAccountDestination(user)).toBe(href);
  });

  it('leaves unauthenticated account entry to the profile menu', () => {
    expect(getCanonicalAccountDestination(null)).toBeNull();
  });
});

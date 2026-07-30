import { describe, expect, it } from 'vitest';

import {
  getCanonicalAccountDestination,
  getLoginRedirectPath,
  getPublicNavigationActiveOwner,
  getSafeNextPath,
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

  it.each([
    [{ role: 'agent', hasManagerIdentity: true }, '/distribution/manager'],
    [{ role: 'admin' }, '/admin/overview'],
    [{ role: 'super_admin' }, '/admin/overview'],
    [{ role: 'property_developer' }, '/developer/dashboard'],
    [{ role: 'agency_admin' }, '/agency/overview'],
    [{ role: 'agent' }, '/agent/dashboard'],
    [{ role: 'service_provider' }, '/service/dashboard'],
    [{ role: 'visitor', hasReferrerIdentity: true }, '/distribution/partner/overview'],
    [{ role: 'referrer' }, '/distribution/partner/overview'],
    [{ role: 'visitor' }, '/user/dashboard'],
  ])('uses canonical login completion routing for %s', (user, href) => {
    expect(getLoginRedirectPath(user, null)).toBe(href);
  });

  it('keeps a validated internal next path ahead of account routing', () => {
    expect(getLoginRedirectPath({ role: 'agent' }, '/saved-search/manage?from=login')).toBe(
      '/saved-search/manage?from=login',
    );
  });

  it('fails closed to the visitor dashboard when the login response has no user', () => {
    expect(getLoginRedirectPath(null, null)).toBe('/user/dashboard');
  });

  it.each(['https://example.com/account', '//example.com/account', '/\\\\example.com/account'])(
    'rejects unsafe next path %s before resolving the account destination',
    nextPath => {
      expect(getSafeNextPath(nextPath)).toBeNull();
      expect(getLoginRedirectPath({ role: 'agent' }, nextPath)).toBe('/agent/dashboard');
    },
  );

  it.each([
    ['/property-for-sale', 'buyers'],
    ['/property-to-rent', 'renters'],
    ['/agents', 'professionals'],
    ['/developers', 'professionals'],
    ['/services', 'services'],
    ['/insights/market-trends', 'insights'],
    ['/guides/buying-property', 'insights'],
    ['/explore/feed', 'explore'],
    ['/advertise', 'sellers'],
    ['/distribution-network', 'professionals'],
  ])('assigns %s to one explicit top-level owner: %s', (pathname, owner) => {
    expect(getPublicNavigationActiveOwner(pathname)).toBe(owner);
  });

  it('gives location pages to City without activating Buyers as well', () => {
    expect(getPublicNavigationActiveOwner('/property-for-sale/gauteng/johannesburg')).toBe('city');
  });
});

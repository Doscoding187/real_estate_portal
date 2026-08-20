import { describe, expect, it } from 'vitest';

import {
  getAccountAuthHref,
  getCanonicalAccountDestination,
  getPublicHeroJourney,
  getLoginRedirectPath,
  getPublicNavigationActiveOwner,
  getSafeNextPath,
  getVisiblePublicNavigationMenus,
  getVisiblePublicNavigationGroups,
  isPublicNavigationVisible,
  normalizePublicHeroJourney,
  PUBLIC_CITY_ENTRY,
  PUBLIC_NAVIGATION_MENUS,
  resolvePublicJourneyReleaseContext,
} from '@/lib/publicNavigation';

describe('public navigation authority', () => {
  it('labels the location discovery entry Locations across public surfaces', () => {
    expect(PUBLIC_CITY_ENTRY.label).toBe('Locations');
    expect(PUBLIC_CITY_ENTRY.href).toBe('/');
  });

  it('does not infer a journey from missing or unknown homepage intent', () => {
    expect(normalizePublicHeroJourney(null)).toBeNull();
    expect(normalizePublicHeroJourney('unknown')).toBeNull();
    expect(normalizePublicHeroJourney('rent')).toBe('rent');
  });

  it('keeps Buy bedroom and bathroom filters in the shared journey contract', () => {
    expect(getPublicHeroJourney('buy').supportedFields).toEqual(
      expect.arrayContaining(['minBedrooms', 'minBathrooms']),
    );
  });

  it('exposes only supported search query values', () => {
    const hrefs = PUBLIC_NAVIGATION_MENUS.flatMap(menu =>
      menu.groups.flatMap(group => group.items.map(item => item.href)),
    );

    expect(hrefs).toContain('/plots-and-land');
    expect(hrefs).not.toContain('/property-for-sale?propertyType=plot');
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

  it('does not expose the token-only saved-search action route globally', () => {
    const renters = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'renters');
    expect(renters).toBeDefined();

    for (const surface of ['desktop', 'mobile'] as const) {
      const visibleItems = getVisiblePublicNavigationGroups(renters!, surface).flatMap(
        group => group.items,
      );
      expect(visibleItems.length).toBeGreaterThan(0);
      expect(visibleItems.map(item => item.href)).not.toContain('/saved-search/manage');
    }

    const allDestinations = PUBLIC_NAVIGATION_MENUS.flatMap(menu => [
      menu.feature,
      ...menu.groups.flatMap(group => group.items),
    ]);
    expect(allDestinations.map(item => item.href)).not.toContain('/saved-search/manage');
  });

  it('exposes Rent through the canonical journey visibility authority', () => {
    const renters = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'renters');
    expect(renters).toBeDefined();
    expect(getPublicHeroJourney('rent').homepageEnabled).toBe(true);
    expect(isPublicNavigationVisible(renters!.feature)).toBe(true);
    expect(getVisiblePublicNavigationMenus('desktop').some(menu => menu.id === 'renters')).toBe(
      true,
    );
    expect(getVisiblePublicNavigationMenus('mobile').some(menu => menu.id === 'renters')).toBe(
      true,
    );

    const visibleItems = getVisiblePublicNavigationGroups(renters!, 'desktop').flatMap(
      group => group.items,
    );
    expect(visibleItems.map(item => item.href)).toEqual(
      expect.arrayContaining([
        '/property-to-rent',
        '/property-to-rent?propertyType=apartment',
        '/property-to-rent?propertyType=house',
        '/property-to-rent?propertyType=townhouse',
        '/guides/renting-property',
        '/favorites',
        '/agents',
      ]),
    );
    expect(visibleItems.some(item => item.href === '/compare')).toBe(false);
    expect(visibleItems.some(item => item.href.includes('propertyType=commercial'))).toBe(false);
    expect(visibleItems.some(item => /alert|enquir/i.test(item.label))).toBe(false);
  });

  it('derives desktop and mobile Developments exposure from one product-and-release authority', () => {
    const buyers = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'buyers');
    expect(buyers).toBeDefined();
    const localIntegrationRelease = resolvePublicJourneyReleaseContext({
      PROD: false,
      VITE_DEPLOY_ENV: 'development',
    });
    const containedProductionRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
    });

    expect(getPublicHeroJourney('developments', localIntegrationRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
    });
    expect(getPublicHeroJourney('developments', containedProductionRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
    });
    for (const surface of ['desktop', 'mobile'] as const) {
      const localItems = getVisiblePublicNavigationGroups(
        buyers!,
        surface,
        localIntegrationRelease,
      ).flatMap(group => group.items);
      const productionItems = getVisiblePublicNavigationGroups(
        buyers!,
        surface,
        containedProductionRelease,
      ).flatMap(group => group.items);

      expect(
        localItems,
      ).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'buyers-developments' })]));
      expect(
        productionItems,
      ).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'buyers-developments' })]),
      );
    }
  });

  it('keeps development product capability and exposure on one canonical journey destination', () => {
    expect(getPublicHeroJourney('developments')).toMatchObject({
      destination: '/new-developments',
      productHomepageVisible: true,
      productHomepageEnabled: true,
    });
    expect(
      PUBLIC_NAVIGATION_MENUS.flatMap(menu => [
        menu.feature,
        ...menu.groups.flatMap(group => group.items),
      ])
        .filter(item => item.journey === 'developments')
        .map(item => item.href),
    ).toEqual(['/new-developments']);
  });

  it('keeps Shared Living independent from the Rent transaction route until its contract exists', () => {
    expect(normalizePublicHeroJourney('shared_living')).toBe('shared_living');
    expect(getPublicHeroJourney('shared_living').destination).toBe('/');
    expect(
      PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'renters')?.actionItemIds,
    ).toBeUndefined();
  });

  it('keeps Explore as one canonical public entry rather than a public menu of modes or publishing actions', () => {
    const explore = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'explore');
    expect(explore).toBeDefined();
    expect(explore?.navbarPresentation).toBe('direct-link');
    expect(explore?.feature).toMatchObject({
      label: 'Explore',
      href: '/explore',
      activeHref: '/explore',
    });
    expect(
      explore?.groups.flatMap(group => group.items).some(item => item.href === '/explore/upload'),
    ).toBe(false);
  });

  it('derives Services navigation from the six canonical marketplace categories', () => {
    const services = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'services');
    expect(services).toBeDefined();
    expect(services?.feature.href).toBe('/services');

    const items = services?.groups.flatMap(group => group.items) ?? [];
    expect(items.map(item => item.label)).toEqual([
      'Home Improvement',
      'Moving Services',
      'Inspection & Compliance',
      'Finance & Legal',
      'Insurance',
      'Media & Marketing',
    ]);
    expect(items.map(item => item.href)).toEqual([
      '/services/home-improvement',
      '/services/moving',
      '/services/inspection-compliance',
      '/services/finance-legal',
      '/services/insurance',
      '/services/media-marketing',
    ]);
    expect(items.every(item => item.owner === 'services-engine')).toBe(true);
  });

  it('keeps Advertise & Partner limited to the governed commercial audiences', () => {
    const advertise = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'advertise');
    expect(advertise).toBeDefined();
    expect(advertise?.feature.href).toBe('/advertise');

    const items = advertise?.groups.flatMap(group => group.items) ?? [];
    expect(items.map(item => item.label)).toEqual([
      'Agents',
      'Agencies',
      'Property developers',
      'Banks',
      'Bond originators',
      'Service businesses',
    ]);
    expect(items.map(item => item.href)).toEqual([
      '/advertise/sell/agents',
      '/advertise/sell/agencies',
      '/advertise/sell/developers',
      '/advertise/finance/banks',
      '/advertise/finance/originators',
      '/advertise/services',
    ]);
    expect(items.some(item => /distribution|referral|dashboard|commission/i.test(item.href))).toBe(
      false,
    );
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

  it('builds the canonical sign-in href for Explore upload with an encoded internal next path', () => {
    expect(getAccountAuthHref('signin', '/explore/upload')).toBe(
      '/login?mode=signin&next=%2Fexplore%2Fupload',
    );
  });

  it.each([
    'https://example.com/explore/upload',
    '//example.com/explore/upload',
    '/\\\\example.com/explore/upload',
    '/login?next=/explore/upload',
  ])('does not forward unsafe or looping auth next path %s', nextPath => {
    expect(getAccountAuthHref('signin', nextPath)).toBe('/login?mode=signin');
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
    ['/advertise', 'advertise'],
    ['/advertise/sell/agents', 'advertise'],
    ['/advertise/sell/agencies', 'advertise'],
    ['/advertise/finance/banks', 'advertise'],
    ['/advertise/finance/originators', 'advertise'],
    ['/advertise/services', 'advertise'],
    ['/distribution-network', 'referrals'],
    ['/distribution-network/apply', 'referrals'],
    ['/distribution-network/login', 'referrals'],
    ['/distribution/partner/overview', null],
    ['/distribution/partner/submit', null],
  ])('assigns %s to one explicit top-level owner: %s', (pathname, owner) => {
    expect(getPublicNavigationActiveOwner(pathname)).toBe(owner);
  });

  it('gives location pages to Locations without activating Buyers as well', () => {
    expect(getPublicNavigationActiveOwner('/gauteng/johannesburg')).toBe('locations');
  });
});

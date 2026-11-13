import { describe, expect, it } from 'vitest';

import {
  getHomepageHeroJourneys,
  getVisiblePublicNavigationMenus,
  isHomepageHeroTabEnabled,
  isHomepageHeroTabVisible,
  isJourneyComingSoon,
  isLaunchHeldJourney,
  isPublicHeroJourneyReleased,
  isPublicNavigationVisible,
  LAUNCH_HELD_JOURNEYS,
  PUBLIC_NAVIGATION_MENUS,
  resolvePublicJourneyReleaseContext,
  stripHeldRoleNextPath,
} from '@/lib/publicNavigation';

const HELD_ENV_VALUE = 'developments,shared_living,plot_land,commercial';

describe('launch-held public journeys', () => {
  it('holds shared living, land, commercial and the consumer services directory (developments is public)', () => {
    expect([...LAUNCH_HELD_JOURNEYS].sort()).toEqual(
      ['commercial', 'plot_land', 'services', 'shared_living'].sort(),
    );
    expect(isLaunchHeldJourney('developments')).toBe(false);
    expect(isLaunchHeldJourney('buy')).toBe(false);
  });

  it('keeps a held journey hidden even when the release manifest lists it', () => {
    const context = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_PUBLIC_JOURNEY_RELEASES: HELD_ENV_VALUE,
    });
    for (const key of ['shared_living', 'plot_land', 'commercial'] as const) {
      expect(isPublicHeroJourneyReleased(key, context)).toBe(false);
    }
    expect(isPublicHeroJourneyReleased('developments', context)).toBe(true);
  });

  it('shows all seven hero tabs on hosted builds without releasing the held journeys', () => {
    const context = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_PUBLIC_JOURNEY_RELEASES: HELD_ENV_VALUE,
    });
    expect(getHomepageHeroJourneys(context).map(journey => journey.key)).toEqual([
      'buy',
      'rent',
      'developments',
      'shared_living',
      'commercial',
      'plot_land',
      'find_agent',
    ]);
    expect(getHomepageHeroJourneys(context).map(journey => journey.label)).toContain(
      'New Developments',
    );
    for (const key of ['shared_living', 'plot_land', 'commercial'] as const) {
      expect(isHomepageHeroTabVisible(key)).toBe(true);
      expect(isPublicHeroJourneyReleased(key, context)).toBe(false);
      expect(isJourneyComingSoon(key, context)).toBe(true);
    }
    expect(isJourneyComingSoon('developments', context)).toBe(false);
    expect(isHomepageHeroTabEnabled('find_agent')).toBe(false);
    expect(isHomepageHeroTabEnabled('commercial')).toBe(true);
  });

  it('shows the Developers directory navigation items now that developments is public', () => {
    const hosted = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_PUBLIC_JOURNEY_RELEASES: HELD_ENV_VALUE,
    });
    const local = { hostedReleaseControlled: false, supplementalReleasedJourneys: [] };
    const items = PUBLIC_NAVIGATION_MENUS.flatMap(menu =>
      menu.groups.flatMap(group => group.items),
    ).filter(item => item.href === '/developers');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.every(item => isPublicNavigationVisible(item, 'desktop', hosted))).toBe(true);
    expect(items.every(item => isPublicNavigationVisible(item, 'desktop', local))).toBe(true);
  });

  it('ignores a next path to a held onboarding destination only for held-role entries', () => {
    for (const path of [
      '/agency/setup',
      '/developer/setup',
      '/service/profile',
      '/agency/setup?x=1',
    ]) {
      expect(stripHeldRoleNextPath(path, true)).toBeNull();
      expect(stripHeldRoleNextPath(path, false)).toBe(path);
    }
    expect(stripHeldRoleNextPath('/agent/dashboard', true)).toBe('/agent/dashboard');
    expect(stripHeldRoleNextPath(null, true)).toBeNull();
  });

  it('shows no navigation item that points at a held journey', () => {
    const context = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_PUBLIC_JOURNEY_RELEASES: HELD_ENV_VALUE,
    });
    const hrefs = getVisiblePublicNavigationMenus('desktop', context).flatMap(menu => [
      menu.feature.href,
    ]);
    expect(hrefs.some(href => /shared-living|new-developments|^\/commercial/.test(href))).toBe(
      false,
    );
  });
});

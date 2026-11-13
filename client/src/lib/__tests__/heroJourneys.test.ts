import { describe, expect, it } from 'vitest';
import { isLandPublicDiscoveryAvailable, isLandVerticalAvailable } from '@shared/landLaunchPolicy';
import {
  buildHomepageJourneyUrl,
  getPublicHeroJourney,
  getHomepageHeroJourneys,
  isHomepageHeroJourneyEnabled,
  normalizePublicHeroJourney,
  parseHomepageJourney,
  resolvePublicJourneyReleaseContext,
} from '@/lib/publicNavigation';

describe('hero journey authority', () => {
  it('uses stable intent keys and approved public labels', () => {
    expect(getPublicHeroJourney('buy')).toMatchObject({
      key: 'buy',
      label: 'Buy',
      destination: '/property-for-sale',
      kind: 'property-search',
    });
    expect(getPublicHeroJourney('find_agent')).toMatchObject({
      key: 'find_agent',
      label: 'Find an Agent',
      destination: '/agents',
      kind: 'direct-navigation',
    });
    expect(getPublicHeroJourney('buy').homepageEnabled).toBe(true);
    expect(getPublicHeroJourney('rent').homepageEnabled).toBe(true);
    expect(getPublicHeroJourney('developments').homepageEnabled).toBe(true);
    expect(getPublicHeroJourney('developments').label).toBe('New Developments');
    expect(getPublicHeroJourney('plot_land')).toMatchObject({
      destination: '/plots-and-land',
      productHomepageVisible: true,
      productHomepageEnabled: true,
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getPublicHeroJourney('commercial')).toMatchObject({
      destination: '/commercial',
      productHomepageVisible: true,
      productHomepageEnabled: true,
      homepageVisible: true,
      homepageEnabled: true,
    });
    expect(getPublicHeroJourney('find_agent').homepageEnabled).toBe(false);
    expect(getHomepageHeroJourneys().map(journey => journey.key)).toEqual([
      'buy',
      'rent',
      'developments',
      'shared_living',
      'commercial',
      'plot_land',
      'find_agent',
    ]);
  });

  it('normalizes legacy aliases without using display labels as internal keys', () => {
    expect(normalizePublicHeroJourney('Rental')).toBe('rent');
    expect(normalizePublicHeroJourney('projects')).toBe('developments');
    expect(normalizePublicHeroJourney('Agents')).toBe('find_agent');
    expect(normalizePublicHeroJourney('not-a-journey')).toBeNull();
  });

  it('restores only an explicit journey from the homepage URL', () => {
    expect(parseHomepageJourney('?intent=rent')).toBe('rent');
    expect(parseHomepageJourney('?intent=not-supported')).toBeNull();
    expect(parseHomepageJourney('')).toBeNull();
    expect(buildHomepageJourneyUrl('buy')).toBe('/?intent=buy');
    expect(buildHomepageJourneyUrl('find_agent')).toBe('/agents');
    expect(isHomepageHeroJourneyEnabled('buy')).toBe(true);
    expect(isHomepageHeroJourneyEnabled('developments')).toBe(true);
  });

  it('keeps completed Developments capability separate from hosted release activation', () => {
    const localIntegrationRelease = resolvePublicJourneyReleaseContext({
      PROD: false,
      VITE_DEPLOY_ENV: 'development',
    });
    const containedHostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
    });
    const explicitHostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: 'developments',
    });

    expect(getPublicHeroJourney('developments', localIntegrationRelease)).toMatchObject({
      destination: '/new-developments',
      productHomepageVisible: true,
      productHomepageEnabled: true,
      homepageVisible: true,
      homepageEnabled: true,
    });
    // Developments is public at launch: released on hosted builds without a manifest entry.
    expect(getPublicHeroJourney('developments', containedHostedRelease)).toMatchObject({
      productHomepageVisible: true,
      productHomepageEnabled: true,
      homepageVisible: true,
      homepageEnabled: true,
    });
    expect(getPublicHeroJourney('developments', explicitHostedRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
    });
    // Tab-only switch: every hosted build shows all seven tabs.
    const allTabs = [
      'buy',
      'rent',
      'developments',
      'shared_living',
      'commercial',
      'plot_land',
      'find_agent',
    ];
    expect(getHomepageHeroJourneys(containedHostedRelease).map(journey => journey.key)).toEqual(
      allTabs,
    );
    expect(getHomepageHeroJourneys(explicitHostedRelease).map(journey => journey.key)).toEqual(
      allTabs,
    );
  });

  it('keeps public Land hidden while the first cohort remains deferred', () => {
    const hostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: 'shared_living,plot_land,commercial',
    });

    expect(isLandPublicDiscoveryAvailable()).toBe(false);
    expect(isLandVerticalAvailable()).toBe(false);

    // Shared Living and Commercial are held at launch even when the manifest lists them.
    expect(getPublicHeroJourney('shared_living', hostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
      destination: '/shared-living',
    });
    expect(getPublicHeroJourney('plot_land', hostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getPublicHeroJourney('commercial', hostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
      destination: '/commercial',
    });
  });
});

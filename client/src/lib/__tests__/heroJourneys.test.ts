import { describe, expect, it } from 'vitest';
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
      'plot_land',
      'commercial',
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
    expect(getPublicHeroJourney('developments', containedHostedRelease)).toMatchObject({
      productHomepageVisible: true,
      productHomepageEnabled: true,
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getPublicHeroJourney('developments', explicitHostedRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
    });
    expect(getHomepageHeroJourneys(containedHostedRelease).map(journey => journey.key)).toEqual([
      'buy',
      'rent',
      'find_agent',
    ]);
    expect(getHomepageHeroJourneys(explicitHostedRelease).map(journey => journey.key)).toEqual([
      'buy',
      'rent',
      'developments',
      'find_agent',
    ]);
  });

  it('releases completed journeys only through an explicit hosted manifest', () => {
    const hostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: 'shared_living,plot_land,commercial',
    });

    expect(getPublicHeroJourney('shared_living', hostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getPublicHeroJourney('plot_land', hostedRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
      destination: '/plots-and-land',
    });
    expect(getPublicHeroJourney('commercial', hostedRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
      destination: '/commercial',
    });
  });
});

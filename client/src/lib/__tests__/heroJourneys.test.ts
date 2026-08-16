import { describe, expect, it } from 'vitest';
import {
  buildHomepageJourneyUrl,
  getPublicHeroJourney,
  getHomepageHeroJourneys,
  isHomepageHeroJourneyEnabled,
  normalizePublicHeroJourney,
  parseHomepageJourney,
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
    expect(getPublicHeroJourney('find_agent').homepageEnabled).toBe(false);
    expect(getHomepageHeroJourneys().map(journey => journey.key)).toEqual([
      'buy',
      'rent',
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
    expect(isHomepageHeroJourneyEnabled('developments')).toBe(false);
  });
});

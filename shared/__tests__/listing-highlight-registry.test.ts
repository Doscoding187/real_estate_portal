import { describe, expect, it } from 'vitest';
import {
  LISTING_HIGHLIGHT_ICON_KEYS,
  LISTING_HIGHLIGHT_REGISTRY,
  buildDevelopmentCardHighlights,
  buildManualPropertyCardHighlights,
  resolveListingCardHighlight,
} from '../listing-highlight-registry';

describe('listing highlight presentation registry', () => {
  it('keeps every governed key unique and every icon key renderable', () => {
    const keys = LISTING_HIGHLIGHT_REGISTRY.map(item => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      LISTING_HIGHLIGHT_REGISTRY.every(item => LISTING_HIGHLIGHT_ICON_KEYS.includes(item.iconKey)),
    ).toBe(true);
  });

  it('projects the strongest canonical manual-property highlights onto a card', () => {
    const highlights = buildManualPropertyCardHighlights({
      propertyDetails: {
        featuresContext: {
          version: 1,
          spaces: ['study_office', 'pool'],
          context: {},
          utilities: { backupPower: 'solar', internetAccess: 'fibre' },
          security: { status: 'known', features: [] },
          highlights: [],
          customFeatures: [],
          customHighlights: [],
        },
      },
    });

    expect(highlights).toEqual([
      expect.objectContaining({ key: 'study_office', label: 'Study / office', iconKey: 'study' }),
      expect.objectContaining({ key: 'pool', label: 'Pool', iconKey: 'pool' }),
      expect.objectContaining({ key: 'solar_backup', label: 'Solar backup', iconKey: 'power' }),
    ]);
  });

  it('gives an unknown future value a deterministic fallback instead of a blank icon', () => {
    expect(resolveListingCardHighlight('Residents coffee lounge', 'amenity')).toEqual(
      expect.objectContaining({
        key: 'custom:residents_coffee_lounge',
        label: 'Residents Coffee Lounge',
        iconKey: 'sparkles',
        fallback: true,
      }),
    );
  });

  it('normalizes development labels into the same shared card contract', () => {
    expect(
      buildDevelopmentCardHighlights(['24-Hour Security', 'Prime Location', 'Lifestyle Amenities']),
    ).toEqual([
      expect.objectContaining({ label: '24-hour security', iconKey: 'security' }),
      expect.objectContaining({ label: 'Prime location', iconKey: 'scenic' }),
      expect.objectContaining({ label: 'Lifestyle amenities', iconKey: 'sparkles' }),
    ]);
  });
});

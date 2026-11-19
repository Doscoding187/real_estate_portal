import { describe, expect, it } from 'vitest';
import { Cctv, Dumbbell, Fence, Landmark, Star, Waves, Zap } from 'lucide-react';
import { FALLBACK_ICON, iconForAmenity, iconForStep } from '../wizardIcons';
import { buildPreviewModel, formatRand } from '../previewModel';

describe('iconForAmenity', () => {
  it('maps known amenities to their own icon', () => {
    expect(iconForAmenity('Swimming pool')).toBe(Waves);
    expect(iconForAmenity('Clubhouse')).toBe(Landmark);
    expect(iconForAmenity('Outdoor gym')).toBe(Dumbbell);
    expect(iconForAmenity('CCTV surveillance')).toBe(Cctv);
    expect(iconForAmenity('Backup power system')).toBe(Zap);
    expect(iconForAmenity('Electric fence')).toBe(Fence);
  });

  it('does not mistake parking for a park', () => {
    expect(iconForAmenity('Covered parking')).toBe(FALLBACK_ICON);
  });

  it('falls back to the star for unknown, custom or empty labels', () => {
    expect(FALLBACK_ICON).toBe(Star);
    expect(iconForAmenity('Wine cellar')).toBe(Star);
    expect(iconForAmenity('')).toBe(Star);
    expect(iconForAmenity(null)).toBe(Star);
    expect(iconForAmenity(undefined)).toBe(Star);
  });

  it('has an icon for every workflow step id, with a safe default', () => {
    for (const id of [
      'project_setup',
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'marketing_summary',
      'development_media',
      'unit_types',
      'review_publish',
    ]) {
      expect(iconForStep(id)).toBeTruthy();
    }
    expect(iconForStep('something_new')).toBeTruthy();
  });
});

describe('buildPreviewModel', () => {
  it('is safe on an empty wizard', () => {
    const model = buildPreviewModel({});
    expect(model.name).toBe('');
    expect(model.coverUrl).toBeNull();
    expect(model.priceFrom).toBeNull();
    expect(model.highlights).toEqual([]);
    expect(model.unit).toBeNull();
  });

  it('feeds the card from wizard state: cover, status, tagline, ranges, 3 highlights + more', () => {
    const model = buildPreviewModel(
      {
        name: 'Baltimore Lifestyle Estate',
        subtitle: 'Freestanding 3 and 4 bedroom homes',
        status: 'selling',
        media: { heroImage: { url: 'https://img/cover.jpg' }, photos: [] },
        location: { address: 'North Riding, Johannesburg' },
        ownershipTypes: ['full-title'],
        communityTypes: ['security_estate'],
        highlights: ['Clubhouse', 'Pool', 'Backup power', 'Fibre', 'Near schools'],
      },
      [
        { name: '91 m² 4-bedroom house', bedrooms: 4, bathrooms: 2, unitSize: 91, priceFrom: 1930000, availableUnits: 50 },
        { name: '71 m² 3-bedroom house', bedrooms: 3, bathrooms: 2, unitSize: 71, priceFrom: 1745000, availableUnits: 10 },
      ],
    );
    expect(model.coverUrl).toBe('https://img/cover.jpg');
    expect(model.statusBadge).toBe('Now selling');
    expect(model.tagline).toBe('Freestanding 3 and 4 bedroom homes');
    expect(model.locationLabel).toBe('North Riding, Johannesburg');
    expect(model.priceFrom).toBe(1745000);
    expect(model.bedsRange).toBe('3–4');
    expect(model.sizeRange).toBe('71–91 m²');
    expect(model.unitTypeCount).toBe(2);
    expect(model.highlights).toEqual(['Clubhouse', 'Pool', 'Backup power']);
    expect(model.moreHighlights).toBe(2);
    expect(model.tags).toContain('Full title');
    expect(model.unit?.name).toContain('91');
  });

  it('formats rand amounts with comma grouping', () => {
    expect(formatRand(1745000)).toBe('R1,745,000');
    expect(formatRand(null)).toBe('');
  });
});

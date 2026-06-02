import { describe, expect, it } from 'vitest';

import {
  findDevelopmentUnitByRouteKey,
  getDevelopmentUnitMedia,
  getDevelopmentUnitRouteKey,
  resolveDevelopmentUnitDocumentUrl,
} from './developmentUnitSelectors';

describe('development unit selectors', () => {
  it('uses stable canonical unit identity before slug fallbacks', () => {
    expect(getDevelopmentUnitRouteKey({ id: 'unit-1', unitTypeId: 'unit-type-1' })).toBe('unit-1');
    expect(getDevelopmentUnitRouteKey({ unitTypeId: 'unit-type-1' })).toBe('unit-type-1');
    expect(getDevelopmentUnitRouteKey({ unitId: 'unit-legacy-1' })).toBe('unit-legacy-1');
    expect(getDevelopmentUnitRouteKey({ name: 'Two Bed Deluxe' })).toBe('two-bed-deluxe');
  });

  it('selects the exact canonical unit route id before legacy name fallback', () => {
    const units = [
      { id: 'unit-a', name: 'Same Name', displayOrder: 0 },
      { id: 'unit-b', name: 'Same Name', displayOrder: 1 },
    ];

    expect(findDevelopmentUnitByRouteKey(units, 'unit-b')).toBe(units[1]);
    expect(findDevelopmentUnitByRouteKey(units, 'same-name')).toBeNull();
    expect(findDevelopmentUnitByRouteKey(units, 'missing-unit')).toBeNull();
  });

  it('keeps legacy slug fallback only for units without stable ids', () => {
    const units = [
      { name: 'Legacy First Unit', displayOrder: 0 },
      { name: 'Legacy Second Unit', displayOrder: 1 },
    ];

    expect(findDevelopmentUnitByRouteKey(units, 'legacy-second-unit')).toBe(units[1]);
  });

  it('matches encoded unit route ids without falling back to the first unit', () => {
    const units = [
      { id: 'unit-a', name: 'First Unit', displayOrder: 0 },
      { id: 'unit/with special id', name: 'Second Unit', displayOrder: 1 },
    ];

    expect(findDevelopmentUnitByRouteKey(units, 'unit%2Fwith%20special%20id')).toBe(units[1]);
  });

  it('normalizes unit gallery, renders, and floor plans into canonical media buckets', () => {
    const media = getDevelopmentUnitMedia(
      {
        unitTypeId: 'unit-type-7',
        baseMedia: {
          gallery: [
            { url: 'gallery-secondary.jpg' },
            { url: 'gallery-primary.jpg', isPrimary: true },
          ],
          floorPlans: [{ key: 'floor-plan.pdf' }],
          renders: [{ src: 'render.jpg' }],
        },
      },
      { fallbackImageUrl: 'development-hero.jpg' },
    );

    expect(media.routeKey).toBe('unit-type-7');
    expect(media.primaryImageUrl).toContain('gallery-primary.jpg');
    expect(media.floorPlanUrl).toContain('floor-plan.pdf');
    expect(media.galleryUrls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('gallery-primary.jpg'),
        expect.stringContaining('gallery-secondary.jpg'),
        expect.stringContaining('render.jpg'),
      ]),
    );
  });

  it('accepts string and json encoded document references from legacy callers', () => {
    expect(resolveDevelopmentUnitDocumentUrl('brochure.pdf')).toContain('brochure.pdf');
    expect(
      getDevelopmentUnitMedia({
        name: 'Studio',
        floorPlans: JSON.stringify(['studio-plan.pdf']),
        gallery: JSON.stringify([{ url: 'studio.jpg', isPrimary: true }]),
      }),
    ).toMatchObject({
      routeKey: 'studio',
      floorPlanUrl: expect.stringContaining('studio-plan.pdf'),
      primaryImageUrl: expect.stringContaining('studio.jpg'),
    });
  });
});

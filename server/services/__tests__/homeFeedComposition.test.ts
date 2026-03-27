import { describe, expect, it } from 'vitest';

import { composeResidentialHomeFeedItems, getBaseHomeUnitCap } from '../homeFeedComposition';

function makeListings(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `listing-${index + 1}`,
    kind: 'listing' as const,
    title: `Listing ${index + 1}`,
  }));
}

function makeUnits(count: number, developmentCount: number = count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `unit-${index + 1}`,
    kind: 'unit' as const,
    title: `Unit ${index + 1}`,
    developmentKey: `development-${(index % developmentCount) + 1}`,
  }));
}

describe('homeFeedComposition', () => {
  it('caps units at three when listings are plentiful on a 10-card rail', () => {
    const result = composeResidentialHomeFeedItems(makeListings(10), makeUnits(10), 10);

    expect(getBaseHomeUnitCap(10)).toBe(3);
    expect(result.source).toBe('mixed');
    expect(result.items).toHaveLength(10);
    expect(result.items.filter(item => item.kind === 'unit')).toHaveLength(3);
    expect(result.items.filter(item => item.kind === 'listing')).toHaveLength(7);
    expect(result.items.slice(0, 3).map(item => item.kind)).toEqual(['listing', 'listing', 'unit']);
  });

  it('backfills the rail with units when listings are thin', () => {
    const result = composeResidentialHomeFeedItems(makeListings(2), makeUnits(10), 10);

    expect(result.source).toBe('mixed');
    expect(result.items).toHaveLength(10);
    expect(result.items.filter(item => item.kind === 'listing')).toHaveLength(2);
    expect(result.items.filter(item => item.kind === 'unit')).toHaveLength(8);
  });

  it('fills the rail with units when there are no listings', () => {
    const result = composeResidentialHomeFeedItems(makeListings(0), makeUnits(10), 10);

    expect(result.source).toBe('units');
    expect(result.items).toHaveLength(10);
    expect(result.items.every(item => item.kind === 'unit')).toBe(true);
  });

  it('rotates units across developments before repeating the same development', () => {
    const result = composeResidentialHomeFeedItems(makeListings(0), makeUnits(8, 4), 8);

    expect(result.items.slice(0, 4)).toEqual([
      expect.objectContaining({ developmentKey: 'development-1' }),
      expect.objectContaining({ developmentKey: 'development-2' }),
      expect.objectContaining({ developmentKey: 'development-3' }),
      expect.objectContaining({ developmentKey: 'development-4' }),
    ]);
  });
});

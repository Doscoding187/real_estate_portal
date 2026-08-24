import { describe, expect, it } from 'vitest';

import { PUBLIC_PROPERTY_TYPES } from '@shared/property-taxonomy';

import {
  FALLBACK_PROPERTY_TYPES,
  PROPERTY_TYPE_CATEGORIES,
  PROPERTY_TYPE_LABELS,
} from '../SidebarFilters';

/**
 * SidebarFilters owns presentation (order, labels) but must not invent its own
 * property-type vocabulary. These assertions pin the component's value lists
 * to the shared taxonomy authority so the surfaces cannot silently drift.
 */
describe('SidebarFilters taxonomy authority pinning', () => {
  it('only offers values that exist in the shared public taxonomy', () => {
    for (const option of FALLBACK_PROPERTY_TYPES) {
      expect(PUBLIC_PROPERTY_TYPES).toContain(option.value);
    }
  });

  it('labels exactly the offered values', () => {
    const fallbackValues = FALLBACK_PROPERTY_TYPES.map(option => option.value).sort();
    expect(Object.keys(PROPERTY_TYPE_LABELS).sort()).toEqual(fallbackValues);
  });

  it('partitions every offered value into exactly one category', () => {
    const categorized = Object.values(PROPERTY_TYPE_CATEGORIES).flat().sort();
    const fallbackValues = FALLBACK_PROPERTY_TYPES.map(option => option.value).sort();
    expect(categorized).toEqual(fallbackValues);
  });

  it('keeps historical read-compatibility values queryable but distinct', () => {
    const values = FALLBACK_PROPERTY_TYPES.map(option => option.value);
    // villa is a legacy projection-only value kept readable for old URLs.
    expect(values).toContain('villa');
    // commercial/plot remain non-residential categories with their own grouping.
    expect(PROPERTY_TYPE_CATEGORIES.commercial).toContain('commercial');
    expect(PROPERTY_TYPE_CATEGORIES.land).toContain('plot');
  });
});

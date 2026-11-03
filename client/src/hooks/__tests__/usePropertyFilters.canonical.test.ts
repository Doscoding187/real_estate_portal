import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePropertyFilters } from '../usePropertyFilters';

describe('usePropertyFilters canonical geography boundary', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('drops persisted free-text location instead of restoring it as a filter', () => {
    sessionStorage.setItem(
      'explore_property_filters',
      JSON.stringify({ propertyType: 'residential', location: 'Cape Town', priceMin: 100000 }),
    );

    const { result } = renderHook(() => usePropertyFilters());

    expect(result.current.filters).toMatchObject({
      propertyType: 'residential',
      priceMin: 100000,
    });
    expect(result.current.filters).not.toHaveProperty('location');
  });
});

import { describe, expect, it } from 'vitest';
import {
  blendSearchResults,
  resolveSearchBlendPolicy,
  type SearchBlendItem,
} from '@/lib/searchBlend';
import type { SearchFilters } from '@/lib/urlUtils';

function makeProperty(id: number, price: number, listedDate: string): SearchBlendItem {
  return {
    kind: 'property',
    value: { id: `p-${id}`, price, listedDate },
  };
}

function makeDevelopment(id: number, price: number, listedDate: string): SearchBlendItem {
  return {
    kind: 'development',
    value: { id: `d-${id}`, price, listedDate },
  };
}

describe('blendSearchResults', () => {
  it('prioritises manual listings for relevance and interleaves developments after every three properties', () => {
    const properties = [
      makeProperty(1, 100, '2026-01-01'),
      makeProperty(2, 200, '2026-01-02'),
      makeProperty(3, 300, '2026-01-03'),
      makeProperty(4, 400, '2026-01-04'),
    ];
    const developments = [makeDevelopment(1, 150, '2026-01-05'), makeDevelopment(2, 250, '2026-01-06')];

    const result = blendSearchResults(properties, developments, 'relevance', {});

    expect(result.map(item => (item.value as any).id)).toEqual(['p-1', 'p-2', 'p-3', 'd-1', 'p-4', 'd-2']);
  });

  it('leans harder toward manual listings for focused searches', () => {
    const properties = [
      makeProperty(1, 100, '2026-01-01'),
      makeProperty(2, 200, '2026-01-02'),
      makeProperty(3, 300, '2026-01-03'),
      makeProperty(4, 400, '2026-01-04'),
      makeProperty(5, 500, '2026-01-05'),
      makeProperty(6, 600, '2026-01-06'),
    ];
    const developments = [makeDevelopment(1, 150, '2026-01-07'), makeDevelopment(2, 250, '2026-01-08')];

    const focusedFilters: SearchFilters = {
      city: 'johannesburg',
      propertyType: 'apartment',
      minBedrooms: 2,
    };

    const result = blendSearchResults(properties, developments, 'relevance', focusedFilters);

    expect(result.map(item => (item.value as any).id)).toEqual([
      'p-1',
      'p-2',
      'p-3',
      'p-4',
      'p-5',
      'd-1',
      'p-6',
      'd-2',
    ]);
  });

  it('can prioritise development inventory when the search is development-led', () => {
    const properties = [
      makeProperty(1, 100, '2026-01-01'),
      makeProperty(2, 200, '2026-01-02'),
      makeProperty(3, 300, '2026-01-03'),
    ];
    const developments = [
      makeDevelopment(1, 150, '2026-01-04'),
      makeDevelopment(2, 250, '2026-01-05'),
      makeDevelopment(3, 350, '2026-01-06'),
    ];

    const developmentFilters: SearchFilters = {
      developmentStatus: 'off_plan',
    };

    const result = blendSearchResults(properties, developments, 'relevance', developmentFilters);

    expect(result.map(item => (item.value as any).id)).toEqual([
      'p-1',
      'd-1',
      'd-2',
      'p-2',
      'd-3',
      'p-3',
    ]);
  });

  it('sorts by price and prefers manual listings on equal price', () => {
    const properties = [makeProperty(1, 100, '2026-01-01')];
    const developments = [makeDevelopment(1, 100, '2026-01-02')];

    const result = blendSearchResults(properties, developments, 'price_asc', {});

    expect(result.map(item => item.kind)).toEqual(['property', 'development']);
  });

  it('sorts by date and prefers manual listings on equal timestamp', () => {
    const properties = [makeProperty(1, 100, '2026-01-01T00:00:00.000Z')];
    const developments = [makeDevelopment(1, 100, '2026-01-01T00:00:00.000Z')];

    const result = blendSearchResults(properties, developments, 'date_desc', {});

    expect(result.map(item => item.kind)).toEqual(['property', 'development']);
  });

  it('resolves policy copy for focused and broad searches', () => {
    expect(resolveSearchBlendPolicy({}, 'relevance').copy).toContain('interleaved');
    expect(
      resolveSearchBlendPolicy(
        { suburb: 'bedfordview', propertyType: 'apartment', minBedrooms: 2 },
        'relevance',
      ).copy,
    ).toContain('focused searches');
  });
});

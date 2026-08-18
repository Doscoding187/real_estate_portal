import { describe, expect, it } from 'vitest';
import {
  appendDevelopmentSearchReturn,
  getDevelopmentSearchReturn,
  normalizeDevelopmentSearchReturn,
} from '../developmentJourneyContinuity';

describe('development journey continuity', () => {
  const searchPath =
    '/new-developments?locationId=za-gp-jhb&transaction=for_rent&bedrooms=2&sort=price_asc&page=3';

  it('preserves the canonical search URL on a development route', () => {
    const detailPath = appendDevelopmentSearchReturn(
      '/development/maple-grove?tab=overview',
      searchPath,
    );

    expect(detailPath).toContain('/development/maple-grove?tab=overview&returnTo=');
    expect(getDevelopmentSearchReturn(detailPath.split('?')[1] || '')).toBe(searchPath);
  });

  it('preserves the same return URL when moving from detail to unit detail', () => {
    const detailPath = appendDevelopmentSearchReturn('/development/maple-grove', searchPath);
    const returnTo = getDevelopmentSearchReturn(detailPath.split('?')[1] || '');
    const unitPath = appendDevelopmentSearchReturn(
      '/development/maple-grove/unit/unit-a',
      returnTo,
    );

    expect(getDevelopmentSearchReturn(unitPath.split('?')[1] || '')).toBe(searchPath);
  });

  it('rejects external, malformed, nested, and non-developments return paths', () => {
    expect(normalizeDevelopmentSearchReturn('https://example.com/new-developments')).toBeNull();
    expect(normalizeDevelopmentSearchReturn('/property-for-sale?sort=price_asc')).toBeNull();
    expect(
      normalizeDevelopmentSearchReturn('/new-developments?returnTo=%2Fnew-developments'),
    ).toBeNull();
    expect(getDevelopmentSearchReturn('returnTo=%2Fnew-developments%3FreturnTo%3Dfoo')).toBeNull();
    expect(getDevelopmentSearchReturn('returnTo=not-a-path')).toBeNull();
  });

  it('does not invent a return path for direct detail entry', () => {
    expect(getDevelopmentSearchReturn('')).toBeNull();
    expect(appendDevelopmentSearchReturn('/development/direct-entry', null)).toBe(
      '/development/direct-entry',
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildDevelopmentRootPath,
  isDevelopmentRootPath,
  normalizeDevelopmentRootPath,
} from '../developmentRouteAuthority';

describe('development root route authority', () => {
  it('builds the canonical slug route and falls back to the immutable id', () => {
    expect(buildDevelopmentRootPath({ id: 17, slug: 'harbour-heights' })).toBe(
      '/development/harbour-heights',
    );
    expect(buildDevelopmentRootPath({ id: 17, slug: null })).toBe('/development/17');
  });

  it('normalizes exact root paths without treating child routes as redirect identities', () => {
    expect(normalizeDevelopmentRootPath('/development/harbour-heights/')).toBe(
      '/development/harbour-heights',
    );
    expect(normalizeDevelopmentRootPath('/development/harbour%20heights?utm_source=legacy')).toBe(
      '/development/harbour%20heights',
    );
    expect(normalizeDevelopmentRootPath('/development/harbour-heights/unit/unit-a')).toBeNull();
    expect(normalizeDevelopmentRootPath('/development/harbour%2Fheights')).toBeNull();
    expect(isDevelopmentRootPath('/development/17')).toBe(true);
  });
});

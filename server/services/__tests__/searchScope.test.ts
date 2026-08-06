import { describe, expect, it } from 'vitest';
import { isSearchScope, parseSearchScope } from '../../../shared/searchScope';

describe('SearchScope contract', () => {
  it('accepts the four approved scope kinds', () => {
    const scopes = [
      { kind: 'province', canonicalLocationId: 'province:1' },
      { kind: 'metro_city', canonicalLocationId: 'city:12' },
      { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
      { kind: 'locality', canonicalLocationId: 'suburb:34' },
    ] as const;

    for (const scope of scopes) {
      expect(parseSearchScope(scope)).toEqual({ ok: true, scope });
      expect(isSearchScope(scope)).toBe(true);
    }
  });

  it('does not accept multi-location in the initial contract', () => {
    const result = parseSearchScope({
      kind: 'multi_location',
      canonicalLocationIds: ['suburb:34', 'suburb:35'],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'unsupported_scope_kind' },
    });
  });

  it('rejects malformed and mismatched canonical scopes', () => {
    expect(parseSearchScope(null)).toMatchObject({
      ok: false,
      error: { code: 'invalid_shape' },
    });
    expect(parseSearchScope({ kind: 'province', canonicalLocationId: 'city:12' })).toMatchObject({
      ok: false,
      error: { code: 'canonical_level_mismatch' },
    });
    expect(
      parseSearchScope({ kind: 'locality', canonicalLocationId: 'google-place-1' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'invalid_canonical_location_id' },
    });
    expect(parseSearchScope({ kind: 'search_area', searchAreaId: 'Sandton' })).toMatchObject({
      ok: false,
      error: { code: 'invalid_search_area_id' },
    });
    expect(
      parseSearchScope({
        kind: 'province',
        canonicalLocationId: 'province:1',
        label: 'Gauteng',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'unknown_scope_field' },
    });
  });
});

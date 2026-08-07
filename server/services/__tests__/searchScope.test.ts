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

  it('accepts a bounded non-recursive multi-location scope and canonicalizes order', () => {
    const result = parseSearchScope({
      kind: 'multi_location',
      members: [
        { kind: 'locality', canonicalLocationId: 'suburb:35' },
        { kind: 'locality', canonicalLocationId: 'suburb-34' },
      ],
    });

    expect(result).toEqual({
      ok: true,
      scope: {
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
          { kind: 'locality', canonicalLocationId: 'suburb:35' },
        ],
      },
    });
  });

  it('deduplicates repeated selections without creating a one-member OR scope', () => {
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
        ],
      }),
    ).toEqual({ ok: true, scope: { kind: 'locality', canonicalLocationId: 'suburb:34' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [{ kind: 'locality', canonicalLocationId: 'suburb:34' }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_invalid' } });
  });

  it('rejects nested, mixed-level and over-limit multi-location scopes', () => {
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'multi_location', members: [] },
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'unsupported_scope_kind' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
          { kind: 'metro_city', canonicalLocationId: 'city:12' },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_mixed_kinds' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: Array.from({ length: 11 }, (_, index) => ({
          kind: 'locality',
          canonicalLocationId: `suburb:${index + 1}`,
        })),
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_too_many' } });
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

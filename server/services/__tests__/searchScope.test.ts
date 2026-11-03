import { describe, expect, it } from 'vitest';
import { isSearchScope, parseSearchScope } from '../../../shared/searchScope';

describe('SearchScope contract', () => {
  it('accepts canonical Place scopes', () => {
    const scopes = [
      { kind: 'province', canonicalPlaceId: 'pl-place-01-000000000000000000000001' },
      { kind: 'metro_city', canonicalPlaceId: 'pl-place-01-000000000000000000000002' },
      { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000003' },
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
        { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000035' },
        { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
      ],
    });

    expect(result).toEqual({
      ok: true,
      scope: {
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000035' },
        ],
      },
    });
  });

  it('deduplicates repeated selections without creating a one-member OR scope', () => {
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
        ],
      }),
    ).toEqual({ ok: true, scope: { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [{ kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_invalid' } });
  });

  it('rejects nested, mixed-level and over-limit multi-location scopes', () => {
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'multi_location', members: [] },
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'unsupported_scope_kind' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalPlaceId: 'pl-place-01-000000000000000000000034' },
          { kind: 'metro_city', canonicalPlaceId: 'pl-place-01-000000000000000000000012' },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_mixed_kinds' } });
    expect(
      parseSearchScope({
        kind: 'multi_location',
        members: Array.from({ length: 11 }, (_, index) => ({
          kind: 'locality',
          canonicalPlaceId: `pl-place-01-${String(index + 1).padStart(24, '0')}`,
        })),
      }),
    ).toMatchObject({ ok: false, error: { code: 'multi_location_too_many' } });
  });

  it('rejects malformed identities, legacy scope shapes and extra fields', () => {
    expect(parseSearchScope(null)).toMatchObject({
      ok: false,
      error: { code: 'invalid_shape' },
    });
    expect(
      parseSearchScope({ kind: 'locality', canonicalPlaceId: 'city:12' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'invalid_canonical_place_id' },
    });
    expect(parseSearchScope({ kind: 'search_area', searchAreaId: 'Sandton' })).toMatchObject({
      ok: false,
      error: { code: 'unsupported_scope_kind' },
    });
    expect(
      parseSearchScope({
        kind: 'locality',
        canonicalLocationId: 'pl-place-01-000000000000000000000034',
      }),
    ).toMatchObject({ ok: false, error: { code: 'unknown_scope_field' } });
    expect(
      parseSearchScope({
        kind: 'province',
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        label: 'Gauteng',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'unknown_scope_field' },
    });
  });
});

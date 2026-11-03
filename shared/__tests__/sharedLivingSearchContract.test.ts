import { describe, expect, it } from 'vitest';
import {
  appendSharedLivingSearchReturn,
  getSharedLivingSearchReturn,
  resolveSharedLivingSearchGeography,
} from '../sharedLivingSearchContract';

describe('Shared Living search geography contract', () => {
  const PLACE_A = 'pl-place-01-000000000000000000000001';
  const PLACE_B = 'pl-place-01-000000000000000000000002';

  it('accepts one canonical Place identity without converting it to a runtime handle', () => {
    expect(resolveSharedLivingSearchGeography({ canonicalPlaceId: PLACE_A })).toEqual({
      status: 'canonical',
      canonicalPlaceIds: [PLACE_A],
    });
  });

  it('accepts a bounded Place selection but rejects duplicates and malformed identities', () => {
    expect(
      resolveSharedLivingSearchGeography({ canonicalPlaceIds: [PLACE_A, PLACE_B] }),
    ).toMatchObject({
      status: 'canonical',
      canonicalPlaceIds: [PLACE_A, PLACE_B],
    });
    expect(
      resolveSharedLivingSearchGeography({ canonicalPlaceIds: [PLACE_A, PLACE_A] }),
    ).toMatchObject({
      status: 'invalid',
    });
    expect(
      resolveSharedLivingSearchGeography({ canonicalPlaceIds: [PLACE_A, 'city:12'] }),
    ).toMatchObject({
      status: 'invalid',
    });
  });

  it('rejects mixed geography authorities and leaves scope empty without a Place identity', () => {
    expect(
      resolveSharedLivingSearchGeography({
        canonicalPlaceId: PLACE_A,
        canonicalPlaceIds: [PLACE_A, PLACE_B],
      }),
    ).toMatchObject({ status: 'invalid' });
    expect(resolveSharedLivingSearchGeography({})).toEqual({ status: 'none' });
  });

  it('only carries an internal Shared Living discovery return path into detail links', () => {
    expect(
      appendSharedLivingSearchReturn(
        '/shared-living/room-1',
        `/shared-living?canonicalPlaceId=${PLACE_A}`,
      ),
    ).toBe(`/shared-living/room-1?returnTo=%2Fshared-living%3FcanonicalPlaceId%3D${PLACE_A}`);
    expect(
      getSharedLivingSearchReturn(`?returnTo=%2Fshared-living%3FcanonicalPlaceId%3D${PLACE_A}`),
    ).toBe(`/shared-living?canonicalPlaceId=${PLACE_A}`);
    expect(appendSharedLivingSearchReturn('/shared-living/room-1', 'https://outside.example')).toBe(
      '/shared-living/room-1',
    );
  });
});

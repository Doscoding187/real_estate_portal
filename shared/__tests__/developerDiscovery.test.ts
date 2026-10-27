import { describe, expect, it } from 'vitest';
import { developerDiscoveryHref, readDeveloperPlace } from '../developerDiscovery';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('Developer discovery Place scope', () => {
  it('accepts one valid canonical Place and rejects text or mixed geography', () => {
    expect(readDeveloperPlace(`?canonicalPlaceId=${PLACE_ID}`)).toEqual({
      canonicalPlaceId: PLACE_ID,
      invalid: false,
    });
    expect(readDeveloperPlace('?province=Gauteng')).toEqual({
      canonicalPlaceId: undefined,
      invalid: true,
    });
    expect(readDeveloperPlace(`?canonicalPlaceId=${PLACE_ID}&city=Johannesburg`)).toEqual({
      canonicalPlaceId: PLACE_ID,
      invalid: true,
    });
    expect(readDeveloperPlace('')).toEqual({ canonicalPlaceId: undefined, invalid: false });
  });
  it('carries only the canonical Place ID to the correct profile section and directory', () => {
    expect(developerDiscoveryHref('/developer/builder', PLACE_ID, true)).toBe(
      `/developer/builder?canonicalPlaceId=${PLACE_ID}#developments`,
    );
    expect(developerDiscoveryHref('/developers', PLACE_ID)).toBe(
      `/developers?canonicalPlaceId=${PLACE_ID}`,
    );
  });
});

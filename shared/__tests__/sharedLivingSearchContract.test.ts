import { describe, expect, it } from 'vitest';
import {
  appendSharedLivingSearchReturn,
  getSharedLivingSearchReturn,
  resolveSharedLivingSearchGeography,
} from '../sharedLivingSearchContract';

describe('Shared Living search geography contract', () => {
  it('accepts one canonical location and canonicalizes the output identity', () => {
    expect(resolveSharedLivingSearchGeography({ locationId: 'suburb-34' })).toEqual({
      status: 'canonical',
      level: 'suburb',
      locationIds: ['suburb:34'],
    });
  });

  it('accepts a same-level OR selection but rejects duplicate and mixed-level values', () => {
    expect(
      resolveSharedLivingSearchGeography({ locationIds: ['suburb:34', 'suburb:35'] }),
    ).toMatchObject({
      status: 'canonical',
      level: 'suburb',
    });
    expect(
      resolveSharedLivingSearchGeography({ locationIds: ['suburb:34', 'suburb:34'] }),
    ).toMatchObject({
      status: 'invalid',
    });
    expect(
      resolveSharedLivingSearchGeography({ locationIds: ['suburb:34', 'city:12'] }),
    ).toMatchObject({
      status: 'invalid',
    });
  });

  it('rejects mixed geography authorities and explicitly declines Search Areas', () => {
    expect(
      resolveSharedLivingSearchGeography({
        locationId: 'suburb:34',
        locationIds: ['suburb:34', 'suburb:35'],
      }),
    ).toMatchObject({ status: 'invalid' });
    expect(resolveSharedLivingSearchGeography({ searchAreaId: 'greater-sandton' })).toMatchObject({
      status: 'unsupported_search_area',
    });
  });

  it('only carries an internal Shared Living discovery return path into detail links', () => {
    expect(
      appendSharedLivingSearchReturn(
        '/shared-living/room-1',
        '/shared-living?locationId=suburb%3A34',
      ),
    ).toBe('/shared-living/room-1?returnTo=%2Fshared-living%3FlocationId%3Dsuburb%253A34');
    expect(
      getSharedLivingSearchReturn('?returnTo=%2Fshared-living%3FlocationId%3Dsuburb%253A34'),
    ).toBe('/shared-living?locationId=suburb%3A34');
    expect(appendSharedLivingSearchReturn('/shared-living/room-1', 'https://outside.example')).toBe(
      '/shared-living/room-1',
    );
  });
});

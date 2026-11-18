import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from '../_core/context';

const { placeIndexability, executePlace } = vi.hoisted(() => ({
  placeIndexability: vi.fn(),
  executePlace: vi.fn(),
}));

vi.mock('../services/placeIndexabilityService', () => ({ placeIndexability }));
vi.mock('../services/placeDiscoveryService', () => ({
  discoverPlaces: vi.fn(),
  executePlace,
}));
vi.mock('../services/canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: vi.fn(),
}));

import { placeAuthorityRouter } from '../placeAuthorityRouter';

const THIN_PATH = '/eastern-cape/alfred-nzo-district-municipality/caba';
const THIN_ID = 'pl-place-01-208dda0da302652dba3474f5';

function caller() {
  return placeAuthorityRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
    requestId: 'place-authority-indexable-test',
  } as unknown as TrpcContext);
}

beforeEach(() => {
  vi.clearAllMocks();
  executePlace.mockImplementation(async (placeId: string) => ({
    ok: true,
    execution: { placeId, scope: 'locality' },
  }));
});

describe('placeAuthority.resolveCanonicalUrl indexable flag', () => {
  it('returns indexable true from the shared indexability rule', async () => {
    placeIndexability.mockResolvedValue(new Map([[THIN_ID, true]]));
    const result = await caller().resolveCanonicalUrl({ path: THIN_PATH });
    expect(placeIndexability).toHaveBeenCalledWith([THIN_ID]);
    expect(result).toMatchObject({ placeId: THIN_ID, indexable: true, publicationEligible: true });
  });

  it('returns indexable false for a thin place while the page still resolves', async () => {
    placeIndexability.mockResolvedValue(new Map([[THIN_ID, false]]));
    const result = await caller().resolveCanonicalUrl({ path: THIN_PATH });
    expect(result).toMatchObject({ indexable: false, publicationEligible: true });
  });

  it('falls back to noindex for a non-approved place when the inventory lookup fails', async () => {
    placeIndexability.mockRejectedValue(new Error('db down'));
    const result = await caller().resolveCanonicalUrl({ path: THIN_PATH });
    expect(result).toMatchObject({ indexable: false });
  });

  it('keeps a hand-approved place indexable when the inventory lookup fails', async () => {
    placeIndexability.mockRejectedValue(new Error('db down'));
    executePlace.mockImplementation(async (placeId: string) => ({
      ok: true,
      execution: { placeId, scope: 'province' },
    }));
    const result = await caller().resolveCanonicalUrl({ path: '/gauteng' });
    expect(result).toMatchObject({ indexable: true });
  });
});

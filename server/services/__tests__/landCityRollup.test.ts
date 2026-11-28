import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ executePlace: vi.fn(), rollup: vi.fn() }));
vi.mock('../../db-connection', () => ({ getDb: vi.fn() }));
vi.mock('../placeDiscoveryService', async importOriginal => ({ ...(await importOriginal<object>()), executePlace: h.executePlace }));
vi.mock('../placeLocalityRollupService', () => ({ developmentSearchPlaceIds: h.rollup, ROLLUP_MAX_PLACE_IDS: 3 }));

import { resolveCanonicalPlaceIds } from '../landPublicService';

const CITY = 'pl-place-01-7e92e438655b8d2b97c1a395';
const SUBURB = 'pl-place-01-000000000000000000000009';

describe('Land search city rollup', () => {
  beforeEach(() => { h.executePlace.mockReset(); h.rollup.mockReset(); });

  it('rolls a city up to its child suburbs so a suburb listing is found', async () => {
    h.executePlace.mockResolvedValue({ ok: true, execution: { scope: 'metro_city' } });
    h.rollup.mockResolvedValue([CITY, SUBURB]);
    const ids = await resolveCanonicalPlaceIds({ canonicalPlaceId: CITY } as any, {} as any);
    expect(ids).toContain(SUBURB);
    expect(h.rollup).toHaveBeenCalledWith(expect.anything(), CITY);
  });

  it('flags a rollup that hit the cap instead of dropping silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.executePlace.mockResolvedValue({ ok: true, execution: { scope: 'metro_city' } });
    h.rollup.mockResolvedValue([CITY, SUBURB, 'pl-place-01-00000000000000000000000a']);
    await resolveCanonicalPlaceIds({ canonicalPlaceId: CITY } as any, {} as any);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cap'));
    warn.mockRestore();
  });

  it('keeps a locality exact with no rollup', async () => {
    h.executePlace.mockResolvedValue({ ok: true, execution: { scope: 'locality' } });
    expect(await resolveCanonicalPlaceIds({ canonicalPlaceId: SUBURB } as any, {} as any)).toEqual([SUBURB]);
    expect(h.rollup).not.toHaveBeenCalled();
  });

  it('still refuses an unknown or inactive place', async () => {
    h.executePlace.mockResolvedValue({ ok: false, reason: 'unknown_place' });
    await expect(resolveCanonicalPlaceIds({ canonicalPlaceId: CITY } as any, {} as any)).rejects.toThrow('canonical localities');
  });
});

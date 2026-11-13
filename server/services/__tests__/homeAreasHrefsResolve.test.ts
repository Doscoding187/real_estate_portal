import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The real in-repo URL projection is used (canonicalPlaceUrlService is NOT mocked).
// The runtime Place execution scopes are modelled from it, except for the places
// that live tiles showed as broken: the runtime scope says metro_city while the
// published URL entry says locality, so the place page cannot open them.
const { mockGetDb, mockLoadProjection, mockResolveEligibilities, mockExecutePlace } = vi.hoisted(
  () => ({
    mockGetDb: vi.fn(),
    mockLoadProjection: vi.fn(),
    mockResolveEligibilities: vi.fn(),
    mockExecutePlace: vi.fn(),
  }),
);

vi.mock('../../db', () => ({ getDb: mockGetDb }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadProjection,
}));
vi.mock('../publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mockResolveEligibilities,
}));
vi.mock('../placeDiscoveryService', () => ({
  executePlace: mockExecutePlace,
  discoverPlaces: vi.fn(),
}));

import { CITY_GUIDES } from '../../../client/src/lib/cityGuides';
import { homeAreasService, resetHomeAreasCache } from '../homeAreasService';
import { canonicalPlaceUrlByPath } from '../canonicalPlaceUrlService';
import { appRouter } from '../../routers';

type Entry = {
  place_id: string;
  path: string;
  preferred_public_name: string;
  place_type: string;
  search_scope: 'province' | 'metro_city' | 'locality';
  province_place_id: string;
  province_name: string;
  province_slug: string;
  publication_eligible: boolean;
  lifecycle_status: string;
};

const entries: Entry[] = (
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/place-url-projection-national-v0.1.json'), 'utf8'),
  ) as { entries: Entry[] }
).entries;

const BROKEN_LIVE = new Set([
  '/gauteng/soweto/albertynsville',
  '/gauteng/city-of-johannesburg/althea',
]);

function runtimeScope(entry: Entry) {
  return BROKEN_LIVE.has(entry.path) ? 'metro_city' : entry.search_scope;
}

function install(provinceSlug: string) {
  const members = entries.filter(entry => entry.province_slug === provinceSlug);
  const province = members.find(entry => entry.search_scope === 'province')!;
  const execs = new Map<string, unknown>();
  const labels = new Map<string, unknown>();
  for (const entry of members) {
    execs.set(entry.place_id, {
      placeId: entry.place_id,
      scope: runtimeScope(entry),
      provincePlaceId: province.place_id,
      cityPlaceId: entry.place_id,
    });
    labels.set(entry.place_id, {
      label: entry.preferred_public_name,
      placeType: entry.place_type,
      province: province.preferred_public_name,
      city: '',
      locality: '',
    });
  }
  mockLoadProjection.mockResolvedValue({ executions: execs, labels });
  mockExecutePlace.mockImplementation(async (placeId: string) => ({
    ok: true,
    execution: execs.get(placeId),
  }));
  mockGetDb.mockResolvedValue({ select: () => ({ from: () => ({ where: async () => [] }) }) });
  mockResolveEligibilities.mockResolvedValue(new Map());
  return province;
}

describe('homeAreas hrefs open on the place page (in-repo projection)', () => {
  beforeEach(() => {
    resetHomeAreasCache();
  });

  it('every returned href resolves through placeAuthority.resolveCanonicalUrl, in every province', async () => {
    const caller = appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as never);
    const slugs = [...new Set(entries.map(entry => entry.province_slug))];
    let checked = 0;
    for (const slug of slugs) {
      const province = install(slug);
      resetHomeAreasCache();
      const { areas } = await homeAreasService.getPopularAreasByProvince({
        provincePlaceId: province.place_id,
        limit: 12,
      });
      for (const area of areas) {
        const resolved = await caller.placeAuthority.resolveCanonicalUrl({ path: area.href });
        expect(resolved, `${slug}: ${area.href}`).not.toBeNull();
        expect(resolved?.placeId).toBe(area.placeId);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('Gauteng fallback tiles are towns and cities in priority order, never the broken suburbs', async () => {
    const province = install('gauteng');
    const { areas } = await homeAreasService.getPopularAreasByProvince({
      provincePlaceId: province.place_id,
    });
    expect(areas.map(area => area.name)).toEqual([
      'Johannesburg',
      'Pretoria',
      'Sandton',
      'Centurion',
      'Midrand',
      'Randburg',
      'Roodepoort',
      'Soweto',
    ]);
    const hrefs = areas.map(area => area.href);
    expect(hrefs).not.toContain('/gauteng/soweto/albertynsville');
    expect(hrefs).not.toContain('/gauteng/city-of-johannesburg/althea');
    expect(hrefs).toContain('/gauteng/city-of-johannesburg/sandton');
  });

  it('the static city list only holds published, active place pages', () => {
    for (const guide of CITY_GUIDES) {
      const entry = canonicalPlaceUrlByPath(guide.href);
      expect(entry, guide.href).not.toBeNull();
      expect(entry?.publication_eligible, guide.href).toBe(true);
      expect(entry?.lifecycle_status, guide.href).toBe('active');
      expect(entry?.preferred_public_name, guide.href).toBe(guide.name);
    }
  });
});

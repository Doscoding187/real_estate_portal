import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, countListings, countDevelopments, loadProjection } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  countListings: vi.fn(),
  countDevelopments: vi.fn(),
  loadProjection: vi.fn(),
}));

const THIN_LOCALITY_PATH = '/eastern-cape/alfred-nzo-district-municipality/caba';
const LISTED_LOCALITY_PATH = '/eastern-cape/alfred-nzo-district-municipality/bhetani';
const LISTED_LOCALITY_ID = 'pl-place-01-f81d8b77e727099400617269';

vi.mock('../db-connection', () => ({
  getDb: getDbMock,
}));
vi.mock('../db', () => ({ getDb: getDbMock }));
vi.mock('../services/propertySearchService', () => ({
  propertySearchService: { countPublicListingsByCanonicalPlace: countListings },
}));
vi.mock('../services/developmentPlaceAssignmentService', () => ({
  countAcceptedDevelopmentsByPlace: countDevelopments,
}));
vi.mock('../services/canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: loadProjection,
}));
vi.mock('../services/publicPropertyGuideService', () => ({
  metroCityGuideLocalityIds: vi.fn(
    async (_db: unknown, ids: string[]) => new Map(ids.map(id => [id, []])),
  ),
}));

import sitemapRouter from '../routes/sitemap';
import { SITEMAP_INDEX_CHILDREN } from '../../shared/sitemapIndex';
import { resetPlaceIndexabilityCache } from '../services/placeIndexabilityService';
import { PLACE_INDEX_ALLOWLIST_PATHS } from '../../shared/placeIndexAllowlist';

beforeEach(() => {
  vi.clearAllMocks();
  resetPlaceIndexabilityCache();
  countListings.mockResolvedValue(new Map([[LISTED_LOCALITY_ID, 2]]));
  countDevelopments.mockResolvedValue(new Map());
  loadProjection.mockImplementation(async (_db: unknown, options: { placeIds: string[] }) => ({
    executions: new Map(
      options.placeIds.map(id => [
        id,
        { placeId: id, provincePlaceId: 'pl-place-01-9892b872a77f27e90c5cf091' },
      ]),
    ),
    labels: new Map(options.placeIds.map(id => [id, { label: id }])),
  }));
});

function makeFakeDb(rows: Array<Record<string, unknown>>) {
  const db = {
    select: vi.fn(() => ({
      from: () => ({
        where: async () => rows,
      }),
    })),
  };
  return db;
}

type SendCapture = {
  statusCode?: number;
  headers: Record<string, string>;
  body?: string;
};

function makeRes(capture: SendCapture) {
  const res = {
    setHeader: (name: string, value: string) => {
      capture.headers[name] = String(value);
    },
    status: (code: number) => {
      capture.statusCode = code;
      return res;
    },
    send: (body: string) => {
      capture.body = body;
    },
  };
  return res;
}

async function requestSitemap(
  rows: Array<Record<string, unknown>>,
  path = '/sitemap-agents.xml',
): Promise<SendCapture> {
  getDbMock.mockResolvedValue(makeFakeDb(rows));
  const capture: SendCapture = { headers: {} };
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const res = makeRes(capture);
    void res;
    (res as unknown as { send: (body: string) => void }).send = (body: string) => {
      capture.body = body;
      finish();
    };
    const next = (error?: unknown) => {
      if (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      finish();
    };
    (
      sitemapRouter as unknown as (
        req: unknown,
        res: unknown,
        next: (error?: unknown) => void,
      ) => void
    )(
      {
        method: 'GET',
        url: path,
        originalUrl: path,
        headers: {},
        get: (name: string) => (name === 'host' ? 'www.propertylistifysa.co.za' : undefined),
      },
      res,
      next,
    );
    setTimeout(finish, 250);
  });
  return capture;
}

describe('agents sitemap contract', () => {
  it('enumerates approved agent presence slugs', async () => {
    const capture = await requestSitemap([
      { id: 33, slug: 'amina-nkosi-33', updatedAt: '2026-08-01 10:00:00' },
      { id: 34, slug: null, updatedAt: '2026-08-02 09:00:00' },
    ]);

    expect(capture.headers['Content-Type']).toContain('application/xml');
    expect(capture.body).toBeDefined();
    const body = String(capture.body);
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/agents/amina-nkosi-33</loc>');
    expect(body).not.toContain('/agent/profile/');
  });

  it('emits an empty urlset when no approved agents exist', async () => {
    const capture = await requestSitemap([]);
    expect(String(capture.body)).toContain('<urlset');
    expect(String(capture.body)).not.toContain('<loc>');
  });
});

describe('canonical Place sitemap', () => {
  it('registers one Place sitemap in the public index', async () => {
    const capture = await requestSitemap([], '/sitemap.xml');
    expect(capture.body).toContain('/sitemap-places.xml');
    expect(capture.body).not.toContain('/sitemap-guides.xml');
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('lists hand-approved and inventory-backed Places and omits thin ones', async () => {
    const capture = await requestSitemap([], '/sitemap-places.xml');
    expect(capture.body).toContain('<urlset');
    expect(capture.body).toContain('<loc>https://www.propertylistifysa.co.za/south-africa</loc>');
    for (const path of [...PLACE_INDEX_ALLOWLIST_PATHS, LISTED_LOCALITY_PATH]) {
      expect(capture.body).toContain(`<loc>https://www.propertylistifysa.co.za${path}</loc>`);
    }
    expect(capture.body).not.toContain(THIN_LOCALITY_PATH);
    expect(capture.body).not.toContain('/free-state</loc>');
    expect(capture.body).not.toContain('/sitemap-guides.xml');
  });

  it('keeps the static sitemap index synchronized with the runtime index', async () => {
    const capture = await requestSitemap([], '/sitemap.xml');
    const children = [
      ...String(capture.body).matchAll(/<loc>[^<]+\/(sitemap[^<]+\.xml)<\/loc>/g),
    ].map(match => `/${match[1]}`);
    expect(children).toEqual([...SITEMAP_INDEX_CHILDREN]);
  });
});

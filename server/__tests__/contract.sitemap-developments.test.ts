import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, whereMock, ELIGIBILITY } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  whereMock: vi.fn(),
  ELIGIBILITY: { sentinel: 'public-development-eligibility' },
}));

vi.mock('../db-connection', () => ({ getDb: getDbMock }));
vi.mock('../db', () => ({ getDb: getDbMock }));
vi.mock('../services/publicDevelopmentEligibility', () => ({
  publicDevelopmentEligibilityConditions: () => ELIGIBILITY,
}));

import sitemapRouter from '../routes/sitemap';

function fakeDb(rows: Array<Record<string, unknown>>, limitSpy: (n: number) => void) {
  return {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          whereMock(condition);
          return {
            orderBy: () => ({
              limit: async (n: number) => {
                limitSpy(n);
                return rows;
              },
            }),
          };
        },
      }),
    }),
  };
}

async function requestDevelopmentsSitemap(rows: Array<Record<string, unknown>>) {
  const limit = vi.fn();
  getDbMock.mockResolvedValue(fakeDb(rows, limit));
  const capture: { headers: Record<string, string>; body?: string } = { headers: {} };
  await new Promise<void>((resolve, reject) => {
    const res = {
      setHeader: (name: string, value: string) => {
        capture.headers[name] = String(value);
      },
      status: () => res,
      send: (body: string) => {
        capture.body = body;
        resolve();
      },
    };
    (
      sitemapRouter as unknown as (req: unknown, res: unknown, next: (e?: unknown) => void) => void
    )(
      {
        method: 'GET',
        url: '/sitemap-developments.xml',
        originalUrl: '/sitemap-developments.xml',
        headers: {},
        get: (name: string) => (name === 'host' ? 'www.propertylistifysa.co.za' : undefined),
      },
      res,
      error => (error ? reject(error) : resolve()),
    );
    setTimeout(resolve, 250);
  });
  return { capture, limit };
}

describe('developments sitemap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists each publicly eligible development as /development/<slug> with lastmod', async () => {
    const { capture } = await requestDevelopmentsSitemap([
      { id: 5, slug: 'baltimore-lifestyle-estate-5yr6po', updatedAt: '2026-11-20 10:00:00' },
      { id: 6, slug: null, updatedAt: '2026-11-21 09:00:00' },
    ]);
    const body = String(capture.body);
    expect(capture.headers['Content-Type']).toContain('application/xml');
    expect(capture.headers['Cache-Control']).toContain('max-age=300');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/development/baltimore-lifestyle-estate-5yr6po</loc>',
    );
    expect(body).toContain('<lastmod>');
    // A development with no slug is still reachable by its id route.
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/development/6</loc>');
  });

  it('asks the database only for developments passing the shared public eligibility authority', async () => {
    await requestDevelopmentsSitemap([]);
    expect(whereMock).toHaveBeenCalledTimes(1);
    // Drafts, unpublished, held and otherwise ineligible developments are excluded by this
    // condition alone: nothing else widens the query.
    expect(whereMock).toHaveBeenCalledWith(ELIGIBILITY);
  });

  it('is bounded to 5000 and warns instead of silently dropping developments', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const many = Array.from({ length: 5001 }, (_, i) => ({
      id: i + 1,
      slug: `dev-${i + 1}`,
      updatedAt: '2026-11-20 10:00:00',
    }));
    const { capture, limit } = await requestDevelopmentsSitemap(many);
    expect(limit).toHaveBeenCalledWith(5001);
    expect(String(capture.body).match(/<loc>/g)).toHaveLength(5000);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('more than 5000 eligible developments'));
    const none = await requestDevelopmentsSitemap(many.slice(0, 3));
    expect(String(none.capture.body).match(/<loc>/g)).toHaveLength(3);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('emits an empty urlset when nothing is eligible', async () => {
    const { capture } = await requestDevelopmentsSitemap([]);
    expect(String(capture.body)).toContain('<urlset');
    expect(String(capture.body)).not.toContain('<loc>');
  });
});

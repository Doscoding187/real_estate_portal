import { describe, expect, it, vi } from 'vitest';

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock('../db-connection', () => ({
  getDb: getDbMock,
}));

import sitemapRouter from '../routes/sitemap';
import { LAUNCH_HELD_JOURNEYS } from '../../shared/launchHeldJourneys';

type SendCapture = { headers: Record<string, string>; body?: string };

async function requestStaticSitemap(): Promise<SendCapture> {
  getDbMock.mockResolvedValue({
    select: () => ({ from: () => ({ where: async () => [{ slug: 'acme', updatedAt: null }] }) }),
  });
  const capture: SendCapture = { headers: {} };
  await new Promise<void>(resolve => {
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
      sitemapRouter as unknown as (
        req: unknown,
        res: unknown,
        next: (error?: unknown) => void,
      ) => void
    )(
      {
        method: 'GET',
        url: '/sitemap-static.xml',
        originalUrl: '/sitemap-static.xml',
        headers: {},
        get: (name: string) => (name === 'host' ? 'www.propertylistifysa.co.za' : undefined),
      },
      res,
      () => resolve(),
    );
    setTimeout(resolve, 250);
  });
  return capture;
}

describe('static sitemap held-journey omission', () => {
  it('holds the expected journeys', () => {
    expect([...LAUNCH_HELD_JOURNEYS].sort()).toEqual(
      ['commercial', 'plot_land', 'services', 'shared_living'].sort(),
    );
  });

  it('omits every held journey path but keeps public pages', async () => {
    const body = String((await requestStaticSitemap()).body);
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);

    expect(locs.some(path => path === '/services' || path.startsWith('/services/'))).toBe(false);
    expect(locs.some(path => path.startsWith('/shared-living'))).toBe(false);
    expect(locs.some(path => path.startsWith('/commercial'))).toBe(false);
    expect(locs.some(path => path.startsWith('/plots-and-land') || path.startsWith('/land'))).toBe(
      false,
    );

    // Public journeys stay (developments is public since #763).
    for (const path of [
      '/',
      '/property-for-sale',
      '/property-to-rent',
      '/new-developments',
      '/developers',
      '/agents',
    ]) {
      expect(locs).toContain(path);
    }
    expect(locs).toContain('/developer/acme');
  });
});

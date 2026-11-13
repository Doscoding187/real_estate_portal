import { describe, expect, it, vi } from 'vitest';

vi.mock('../db-connection', () => ({ getDb: vi.fn() }));

import sitemapRouter from '../routes/sitemap';

function requestRobots(headers: Record<string, string>): string {
  let body = '';
  const res = {
    setHeader: () => undefined,
    status: () => res,
    send: (b: string) => {
      body = b;
    },
  };
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  (sitemapRouter as unknown as (req: unknown, res: unknown, next: () => void) => void)(
    {
      method: 'GET',
      url: '/robots.txt',
      originalUrl: '/robots.txt',
      headers: lower,
      get: (name: string) => lower[name.toLowerCase()],
    },
    res,
    () => undefined,
  );
  return body;
}

const ROBOTS = [
  'User-agent: *',
  'Allow: /',
  'Allow: /api/readiness',
  'Allow: /api/trpc/',
  'Disallow: /admin',
  'Disallow: /dashboard',
  'Disallow: /api/',
  'Disallow: /auth/',
  '',
  'Sitemap: https://www.propertylistifysa.co.za/sitemap.xml',
  '',
  'Crawl-delay: 1',
].join('\n');

describe('robots.txt', () => {
  it('is identical for every host, so it never depends on proxy headers', () => {
    expect(requestRobots({ host: 'www.propertylistifysa.co.za' })).toBe(ROBOTS);
    expect(requestRobots({ host: 'api.propertylistifysa.co.za' })).toBe(ROBOTS);
    expect(
      requestRobots({
        host: 'api.propertylistifysa.co.za',
        'x-forwarded-host': 'www.propertylistifysa.co.za',
      }),
    ).toBe(ROBOTS);
  });

  it('lets crawlers fetch the endpoints the site calls while rendering', () => {
    const body = requestRobots({ host: 'api.propertylistifysa.co.za' });
    expect(body).toContain('Allow: /api/readiness');
    expect(body).toContain('Allow: /api/trpc/');
    expect(body).toContain('Disallow: /api/');
  });

  it('keeps the private areas closed and the sitemap listed', () => {
    const body = requestRobots({ host: 'www.propertylistifysa.co.za' });
    for (const line of ['Disallow: /admin', 'Disallow: /dashboard', 'Disallow: /auth/']) {
      expect(body).toContain(line);
    }
    expect(body).toContain('Sitemap: https://www.propertylistifysa.co.za/sitemap.xml');
  });
});

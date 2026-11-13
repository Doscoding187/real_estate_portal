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

const WWW_ROBOTS = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /dashboard',
  'Disallow: /api/',
  'Disallow: /auth/',
  '',
  'Sitemap: https://www.propertylistifysa.co.za/sitemap.xml',
  '',
  'Crawl-delay: 1',
].join('\n');

describe('robots.txt per host', () => {
  it('keeps the www robots.txt unchanged when proxied by Vercel (Host=api, X-Forwarded-Host=www)', () => {
    expect(
      requestRobots({
        host: 'api.propertylistifysa.co.za',
        'x-forwarded-host': 'www.propertylistifysa.co.za',
      }),
    ).toBe(WWW_ROBOTS);
  });

  it('keeps the www robots.txt for the www host directly', () => {
    expect(requestRobots({ host: 'www.propertylistifysa.co.za' })).toBe(WWW_ROBOTS);
  });

  it('lets crawlers fetch readiness and tRPC on the API host', () => {
    const body = requestRobots({ host: 'api.propertylistifysa.co.za' });
    expect(body).toContain('Allow: /api/readiness');
    expect(body).toContain('Allow: /api/trpc/');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Disallow: /admin');
    expect(body).not.toContain('Sitemap:');
    expect(body).not.toContain('Allow: /\n');
  });

  it('serves the API variant when the forwarded host is the API host', () => {
    const body = requestRobots({
      host: 'internal.example',
      'x-forwarded-host': 'api.propertylistifysa.co.za',
    });
    expect(body).toContain('Allow: /api/trpc/');
  });
});

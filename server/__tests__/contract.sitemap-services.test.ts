import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, heldState, sitemapEntries } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  heldState: { services: false },
  sitemapEntries: {
    providers: [] as Array<{ providerId: number; companyName: string; updatedAt: string | null }>,
    providerServices: [] as Array<{
      providerId: number;
      companyName: string;
      serviceCode: string;
      serviceDisplayName: string;
      updatedAt: string | null;
    }>,
  },
}));

vi.mock('../db-connection', () => ({
  getDb: getDbMock,
}));

// Exercise both states of the services hold; the real list is covered by the static sitemap test.
vi.mock('../../shared/launchHeldJourneys', async importOriginal => {
  const actual = await importOriginal<typeof import('../../shared/launchHeldJourneys')>();
  return {
    ...actual,
    isLaunchHeldJourney: (key: string) =>
      key === 'services' ? heldState.services : actual.isLaunchHeldJourney(key),
  };
});

vi.mock('../services/servicesEngineService', () => ({
  servicesEngineService: {
    listServiceSitemapEntries: vi.fn(async () => sitemapEntries),
  },
}));

import sitemapRouter from '../routes/sitemap';

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

async function requestSitemap(path: string): Promise<SendCapture> {
  getDbMock.mockResolvedValue({});
  const capture: SendCapture = { headers: {} };
  await new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const res = makeRes(capture);
    const next = () => finish();
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

describe('services sitemap contract', () => {
  beforeEach(() => {
    heldState.services = false;
    sitemapEntries.providers = [];
    sitemapEntries.providerServices = [];
  });

  it('lists every canonical service category page and no localized category URLs', async () => {
    const capture = await requestSitemap('/sitemap-services.xml');
    const body = String(capture.body);

    expect(capture.headers['Content-Type']).toContain('application/xml');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/home-improvement</loc>');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/finance-legal</loc>');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/moving</loc>');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/inspection-compliance</loc>',
    );
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/insurance</loc>');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/media-marketing</loc>');
    expect(body).not.toMatch(/\/services\/(?:home-improvement|finance-legal|moving|inspection-compliance|insurance|media-marketing)\/[^/<]+\/[^/<]+/);
  });

  it('enumerates published provider profile URLs from the shared slug authority', async () => {
    sitemapEntries.providers = [
      { providerId: 7, companyName: 'Cape Handyman & Services!', updatedAt: '2026-10-20 12:00:00' },
      { providerId: 9, companyName: '   ###   ', updatedAt: null },
    ];
    const capture = await requestSitemap('/sitemap-services.xml');
    const body = String(capture.body);

    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/cape-handyman-services--7</loc>',
    );
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/provider/provider--9</loc>');
    expect(body.match(/<lastmod>/g) || []).toHaveLength(1);
  });

  it('enumerates per-provider service pages from the shared slug authority', async () => {
    sitemapEntries.providerServices = [
      {
        providerId: 7,
        companyName: 'Cape Handyman & Services!',
        serviceCode: 'home_move',
        serviceDisplayName: 'Home moving service',
        updatedAt: '2026-10-22 08:00:00',
      },
      {
        providerId: 7,
        companyName: 'Cape Handyman & Services!',
        serviceCode: 'plumbing',
        serviceDisplayName: '  ###  ',
        updatedAt: null,
      },
      {
        providerId: 9,
        companyName: '   ###   ',
        serviceCode: '###',
        serviceDisplayName: '',
        updatedAt: null,
      },
      {
        providerId: 11,
        companyName: 'Blank Row',
        serviceCode: '',
        serviceDisplayName: '',
        updatedAt: null,
      },
    ];
    const capture = await requestSitemap('/sitemap-services.xml');
    const body = String(capture.body);

    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/cape-handyman-services--7/service/home-moving-service</loc>',
    );
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/cape-handyman-services--7/service/plumbing</loc>',
    );
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/provider--9/service/service</loc>',
    );
    expect(body).not.toContain('/service//');
    expect((body.match(/<lastmod>/g) || []).length).toBe(1);
  });

  it('returns a valid empty urlset while the services journey is held', async () => {
    heldState.services = true;
    sitemapEntries.providers = [{ providerId: 7, companyName: 'Cape', updatedAt: null }];
    const capture = await requestSitemap('/sitemap-services.xml');
    const body = String(capture.body);

    expect(capture.headers['Content-Type']).toContain('application/xml');
    expect(body).toContain('<urlset');
    expect(body).not.toContain('<loc>');
    // The index keeps the child for static-fallback parity.
    const index = await requestSitemap('/sitemap.xml');
    expect(String(index.body)).toContain('/sitemap-services.xml');
  });

  it('registers the services child in the sitemap index', async () => {
    const capture = await requestSitemap('/sitemap.xml');
    const body = String(capture.body);

    expect(body).toContain('/sitemap-services.xml');
  });
});

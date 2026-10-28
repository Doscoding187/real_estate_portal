import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, sitemapEntries } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  sitemapEntries: {
    providers: [] as Array<{ providerId: number; companyName: string; updatedAt: string | null }>,
    localized: [] as Array<{ category: string; city: string; province: string }>,
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

async function requestServicesSitemap(
  entries: { providers: unknown[]; localized: unknown[]; providerServices?: unknown[] },
  path = '/sitemap-services.xml',
): Promise<SendCapture> {
  getDbMock.mockResolvedValue({});
  sitemapEntries.providers = entries.providers as Array<{
    providerId: number;
    companyName: string;
    updatedAt: string | null;
  }>;
  sitemapEntries.localized = entries.localized as Array<{
    category: string;
    city: string;
    province: string;
  }>;
  sitemapEntries.providerServices = (entries.providerServices || []) as Array<{
    providerId: number;
    companyName: string;
    serviceCode: string;
    serviceDisplayName: string;
    updatedAt: string | null;
  }>;

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
    sitemapEntries.providers = [];
    sitemapEntries.localized = [];
    sitemapEntries.providerServices = [];
  });

  it('lists every canonical service category page', async () => {
    const capture = await requestServicesSitemap({ providers: [], localized: [] });
    const body = String(capture.body);

    expect(capture.headers['Content-Type']).toContain('application/xml');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/home-improvement</loc>',
    );
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/finance-legal</loc>');
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/moving</loc>');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/inspection-compliance</loc>',
    );
    expect(body).toContain('<loc>https://www.propertylistifysa.co.za/services/insurance</loc>');
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/media-marketing</loc>',
    );
  });

  it('enumerates published provider profile urls built from the shared slug authority', async () => {
    const capture = await requestServicesSitemap({
      providers: [
        {
          providerId: 7,
          companyName: 'Cape Handyman & Services!',
          updatedAt: '2026-10-20 12:00:00',
        },
        { providerId: 9, companyName: '   ###   ', updatedAt: null },
      ],
      localized: [],
    });
    const body = String(capture.body);

    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/cape-handyman-services--7</loc>',
    );
    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/provider/provider--9</loc>',
    );
    expect(body.match(/<lastmod>/g) || []).toHaveLength(1);
  });

  it('lists localized coverage urls only for resolvable three-segment routes', async () => {
    const capture = await requestServicesSitemap({
      providers: [],
      localized: [
        { category: 'inspection_compliance', city: 'Cape Town', province: 'Western Cape' },
        { category: 'moving', city: '', province: 'Gauteng' },
      ],
    });
    const body = String(capture.body);

    expect(body).toContain(
      '<loc>https://www.propertylistifysa.co.za/services/inspection-compliance/cape-town/western-cape</loc>',
    );
    expect(body).not.toContain('/moving//');
  });

  it('enumerates per-provider service pages from the shared slug authority', async () => {
    const capture = await requestServicesSitemap({
      providers: [],
      localized: [],
      providerServices: [
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
      ],
    });
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

  it('registers the services child in the sitemap index', async () => {
    const capture = await requestServicesSitemap({ providers: [], localized: [] }, '/sitemap.xml');
    const body = String(capture.body);

    expect(body).toContain('/sitemap-services.xml');
  });
});

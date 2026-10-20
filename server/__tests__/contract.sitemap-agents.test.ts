import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, publishedCityGuides, publishedProvinceGuides, publishedSuburbGuidePaths } =
  vi.hoisted(() => ({
    getDbMock: vi.fn(),
    publishedCityGuides: [] as Array<{ provinceSlug: string; slug: string }>,
    publishedProvinceGuides: [] as Array<{ slug: string }>,
    publishedSuburbGuidePaths: [] as string[],
  }));

vi.mock('../db-connection', () => ({
  getDb: getDbMock,
}));

vi.mock('../../shared/cityGuideContent', () => ({
  getPublishedCityGuides: () => publishedCityGuides,
  getCityGuideContent: () => undefined,
}));

vi.mock('../../shared/provinceGuideContent', () => ({
  getPublishedProvinceGuides: () => publishedProvinceGuides,
}));

vi.mock('../../shared/suburbGuidePolicy', () => ({
  getPublishedSuburbGuidePaths: () => publishedSuburbGuidePaths,
}));

import sitemapRouter from '../routes/sitemap';

beforeEach(() => {
  publishedCityGuides.length = 0;
  publishedProvinceGuides.length = 0;
  publishedSuburbGuidePaths.length = 0;
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

async function requestAgentsSitemap(
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
    const capture = await requestAgentsSitemap([
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
    const capture = await requestAgentsSitemap([]);
    expect(String(capture.body)).toContain('<urlset');
    expect(String(capture.body)).not.toContain('<loc>');
  });
});

describe('province editorial sitemap readiness', () => {
  it('registers a guide sitemap without depending on inventory', async () => {
    const capture = await requestAgentsSitemap([], '/sitemap.xml');
    expect(capture.body).toContain('/sitemap-guides.xml');
    expect(getDbMock).not.toHaveBeenCalled();
  });
  it('excludes local review drafts instead of publishing every verified place', async () => {
    const capture = await requestAgentsSitemap([], '/sitemap-guides.xml');
    expect(capture.body).toContain('<urlset');
    expect(capture.body).not.toContain('<loc>');
    expect(getDbMock).not.toHaveBeenCalled();
  });
  it('lists a published province guide without requiring inventory', async () => {
    publishedProvinceGuides.push({ slug: 'gauteng' });
    const capture = await requestAgentsSitemap([], '/sitemap-guides.xml');
    expect(capture.body).toContain('<loc>https://www.propertylistifysa.co.za/gauteng</loc>');
    expect(getDbMock).not.toHaveBeenCalled();
  });
});

describe('city editorial sitemap readiness', () => {
  it('no longer advertises the transactional geography sitemap', async () => {
    const capture = await requestAgentsSitemap([], '/sitemap.xml');
    expect(capture.body).toContain('/sitemap-guides.xml');
    expect(capture.body).not.toContain('/sitemap-areas.xml');
  });

  it('lists published city guides without requiring inventory', async () => {
    publishedCityGuides.push({ provinceSlug: 'gauteng', slug: 'johannesburg' });
    const capture = await requestAgentsSitemap([], '/sitemap-guides.xml');
    expect(capture.body).toContain(
      '<loc>https://www.propertylistifysa.co.za/gauteng/johannesburg</loc>',
    );
    expect(getDbMock).not.toHaveBeenCalled();
  });
});

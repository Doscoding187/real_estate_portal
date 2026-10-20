import { and, eq, inArray, sql } from 'drizzle-orm';
import { type Request, type Response, Router } from 'express';

import { agents, cataloguePublishers, developments, properties } from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { getDb } from '../db-connection';
import { APPROVED_AGENT, buildAgentPublicSlug } from '../services/agentPublicProfileService';
import { publicDevelopmentEligibilityConditions } from '../services/publicDevelopmentEligibility';
import { resolvePublicPropertyEligibilityIds } from '../services/publicPropertyEligibilityService';

import { getPublishedCityGuides } from '../../shared/cityGuideContent';
import { COUNTRY_DISCOVERY_PATH } from '../../shared/countryDiscovery';
import { getPublishedProvinceGuides } from '../../shared/provinceGuideContent';
import { SITEMAP_INDEX_CHILDREN } from '../../shared/sitemapIndex';
import { getPublishedSuburbGuidePaths } from '../../shared/suburbGuidePolicy';

const router = Router();

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
const TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';
const SITEMAP_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
const CANONICAL_PUBLIC_ORIGIN = 'https://www.propertylistifysa.co.za';
const LIVE_PROPERTY_STATUSES = ['available', 'published'] as const;
const DEFAULT_PUBLIC_SITE_URL = CANONICAL_PUBLIC_ORIGIN;

type SitemapUrlEntry = {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: number;
};

function getFallbackBaseUrl(): string {
  const candidates = [process.env.FRONTEND_URL, ENV.appUrl, DEFAULT_PUBLIC_SITE_URL];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (!isLocalHost(url.host)) {
        return url.origin.replace(/\/+$/, '');
      }
    } catch {
      continue;
    }
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

function isPublicSiteHost(host: string): boolean {
  return /^(www\.)?propertylistifysa\.co\.za$/i.test(host);
}

function resolveBaseUrl(req: Request): string {
  const fallbackBaseUrl = getFallbackBaseUrl();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const host = forwardedHost || req.get('host') || '';

  if (host && !isLocalHost(host) && isPublicSiteHost(host)) {
    return CANONICAL_PUBLIC_ORIGIN;
  }

  return fallbackBaseUrl;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPropertyPath(id: number, title: string | null | undefined): string {
  const slug = slugify(String(title || ''));
  return slug ? `/property/${id}-${slug}` : `/property/${id}`;
}

function toAbsoluteUrl(pathname: string, baseUrl: string): string {
  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function formatLastmod(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function buildUrlSet(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map(entry => {
      const parts = [`<loc>${escapeXml(entry.loc)}</loc>`];
      const lastmod = formatLastmod(entry.lastmod);
      if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
      if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === 'number') {
        parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
      }

      return `  <url>\n    ${parts.join('\n    ')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function buildSitemapIndex(paths: string[], baseUrl: string): string {
  const now = new Date().toISOString();
  const body = paths
    .map(
      path =>
        `  <sitemap>\n    <loc>${escapeXml(toAbsoluteUrl(path, baseUrl))}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

function sendXml(res: Response, xml: string) {
  res.setHeader('Content-Type', XML_CONTENT_TYPE);
  res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
  res.status(200).send(xml);
}

router.get('/robots.txt', (_req, res) => {
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /api/',
    'Disallow: /auth/',
    '',
    `Sitemap: ${CANONICAL_PUBLIC_ORIGIN}/sitemap.xml`,
    '',
    'Crawl-delay: 1',
  ].join('\n');

  res.setHeader('Content-Type', TEXT_CONTENT_TYPE);
  res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
  res.status(200).send(robots);
});

router.get('/sitemap.xml', (req, res) => {
  const xml = buildSitemapIndex([...SITEMAP_INDEX_CHILDREN], resolveBaseUrl(req));

  sendXml(res, xml);
});

// Editorial publication, not inventory presence, determines guide sitemap eligibility.
router.get('/sitemap-guides.xml', (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  sendXml(
    res,
    buildUrlSet([
      { loc: toAbsoluteUrl(COUNTRY_DISCOVERY_PATH, baseUrl) },
      ...getPublishedProvinceGuides().map(guide => ({
        loc: toAbsoluteUrl(`/${guide.slug}`, baseUrl),
      })),
      ...getPublishedCityGuides().map(guide => ({
        loc: toAbsoluteUrl(`/${guide.provinceSlug}/${guide.slug}`, baseUrl),
      })),
      ...getPublishedSuburbGuidePaths().map(path => ({
        loc: toAbsoluteUrl(`/${path}`, baseUrl),
      })),
    ]),
  );
});

router.get('/sitemap-agents.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const rows = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .where(APPROVED_AGENT);

    const xml = buildUrlSet(
      rows.map(row => ({
        loc: toAbsoluteUrl(
          `/agents/${buildAgentPublicSlug({ id: Number(row.id), slug: row.slug })}`,
          baseUrl,
        ),
        lastmod: row.updatedAt,
        changefreq: 'weekly',
        priority: 0.6,
      })),
    );

    sendXml(res, xml);
  } catch (error) {
    next(error);
  }
});

router.get('/sitemap-listings.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const candidates = await db
      .select({
        id: properties.id,
        title: properties.title,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .where(
        and(
          inArray(properties.status, [...LIVE_PROPERTY_STATUSES]),
          sql`${properties.sourceListingId} IS NOT NULL`,
          sql`COALESCE(${properties.title}, '') <> ''`,
        ),
      );

    const eligibleIds = new Set(
      await resolvePublicPropertyEligibilityIds(candidates.map(row => Number(row.id))),
    );
    const listingRows = candidates
      .filter(row => eligibleIds.has(Number(row.id)))
      .map(row => ({
        loc: toAbsoluteUrl(buildPropertyPath(Number(row.id), row.title), baseUrl),
        lastmod: row.updatedAt,
        changefreq: 'daily',
        priority: 0.9,
      }));

    const xml = buildUrlSet(listingRows);

    sendXml(res, xml);
  } catch (error) {
    next(error);
  }
});

router.get('/sitemap-developments.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const rows = await db
      .select({
        slug: developments.slug,
        updatedAt: developments.updatedAt,
      })
      .from(developments)
      .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
      .where(
        and(
          publicDevelopmentEligibilityConditions(),
          sql`COALESCE(${developments.slug}, '') <> ''`,
        ),
      );

    const xml = buildUrlSet(
      rows.map(row => ({
        loc: toAbsoluteUrl(`/development/${row.slug}`, baseUrl),
        lastmod: row.updatedAt,
        changefreq: 'weekly',
        priority: 0.8,
      })),
    );

    sendXml(res, xml);
  } catch (error) {
    next(error);
  }
});

router.get('/sitemap-static.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const staticEntries: SitemapUrlEntry[] = [
      { loc: toAbsoluteUrl('/', baseUrl), changefreq: 'daily', priority: 1.0 },
      { loc: toAbsoluteUrl('/property-for-sale', baseUrl), changefreq: 'daily', priority: 0.9 },
      { loc: toAbsoluteUrl('/property-to-rent', baseUrl), changefreq: 'daily', priority: 0.9 },
      { loc: toAbsoluteUrl('/new-developments', baseUrl), changefreq: 'daily', priority: 0.9 },
      { loc: toAbsoluteUrl('/agents', baseUrl), changefreq: 'weekly', priority: 0.7 },
      { loc: toAbsoluteUrl('/developers', baseUrl), changefreq: 'weekly', priority: 0.8 },
      { loc: toAbsoluteUrl('/advertise', baseUrl), changefreq: 'monthly', priority: 0.5 },
      { loc: toAbsoluteUrl('/explore/home', baseUrl), changefreq: 'daily', priority: 0.8 },
      { loc: toAbsoluteUrl('/services', baseUrl), changefreq: 'weekly', priority: 0.7 },
      { loc: toAbsoluteUrl('/services/home-loans', baseUrl), changefreq: 'monthly', priority: 0.6 },
      {
        loc: toAbsoluteUrl('/services/property-valuation', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/services/legal-services', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/services/home-insurance', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/services/interior-design', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/insights/market-trends', baseUrl),
        changefreq: 'weekly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/insights/property-insights', baseUrl),
        changefreq: 'weekly',
        priority: 0.6,
      },
      { loc: toAbsoluteUrl('/insights/blog', baseUrl), changefreq: 'weekly', priority: 0.5 },
      {
        loc: toAbsoluteUrl('/guides/buying-property', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/guides/selling-property', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/guides/renting-property', baseUrl),
        changefreq: 'monthly',
        priority: 0.6,
      },
      {
        loc: toAbsoluteUrl('/tools/property-valuation', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: toAbsoluteUrl('/tools/sold-house-prices', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: toAbsoluteUrl('/tools/affordability-calculator', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: toAbsoluteUrl('/tools/bond-calculator', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: toAbsoluteUrl('/tools/property-reports', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      { loc: toAbsoluteUrl('/tools/area-guides', baseUrl), changefreq: 'monthly', priority: 0.5 },
      {
        loc: toAbsoluteUrl('/tools/sold-properties', baseUrl),
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: toAbsoluteUrl('/legal/consumer-rights', baseUrl),
        changefreq: 'yearly',
        priority: 0.4,
      },
      {
        loc: toAbsoluteUrl('/legal/dispute-resolution', baseUrl),
        changefreq: 'yearly',
        priority: 0.4,
      },
      { loc: toAbsoluteUrl('/legal/terms', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/legal/privacy', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/legal/cookies', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/legal/compliance', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/support/help', baseUrl), changefreq: 'monthly', priority: 0.4 },
      { loc: toAbsoluteUrl('/support/safety', baseUrl), changefreq: 'monthly', priority: 0.4 },
      { loc: toAbsoluteUrl('/support/faq', baseUrl), changefreq: 'monthly', priority: 0.4 },
      { loc: toAbsoluteUrl('/company/about', baseUrl), changefreq: 'yearly', priority: 0.4 },
      { loc: toAbsoluteUrl('/company/contact', baseUrl), changefreq: 'yearly', priority: 0.4 },
      { loc: toAbsoluteUrl('/company/careers', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/company/press', baseUrl), changefreq: 'yearly', priority: 0.3 },
      { loc: toAbsoluteUrl('/company/partners', baseUrl), changefreq: 'yearly', priority: 0.4 },
      { loc: toAbsoluteUrl('/agencies', baseUrl), changefreq: 'weekly', priority: 0.7 },
      { loc: toAbsoluteUrl('/distribution-network', baseUrl), changefreq: 'weekly', priority: 0.6 },
    ];

    const developerRows = await db
      .select({
        slug: cataloguePublishers.slug,
        updatedAt: cataloguePublishers.updatedAt,
      })
      .from(cataloguePublishers)
      .where(
        and(
          eq(cataloguePublishers.isVisible, 1),
          sql`COALESCE(${cataloguePublishers.slug}, '') <> ''`,
          eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        ),
      );

    const xml = buildUrlSet([
      ...staticEntries,
      ...developerRows.map(row => ({
        loc: toAbsoluteUrl(`/developer/${row.slug}`, baseUrl),
        lastmod: row.updatedAt,
        changefreq: 'weekly',
        priority: 0.7,
      })),
    ]);

    sendXml(res, xml);
  } catch (error) {
    next(error);
  }
});

export default router;

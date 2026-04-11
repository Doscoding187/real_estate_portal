import { and, eq, inArray, sql } from 'drizzle-orm';
import { type Request, type Response, Router } from 'express';

import {
  cities,
  developments,
  developerBrandProfiles,
  listings,
  properties,
  provinces,
  suburbs,
} from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { getDb } from '../db-connection';

const router = Router();

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
const TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';
const SITEMAP_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
const CANONICAL_PUBLIC_ORIGIN = 'https://www.propertylistifysa.co.za';
const LIVE_PROPERTY_STATUSES = ['available', 'published'] as const;
const AREA_LISTING_TYPES = ['sale', 'rent'] as const;
const DEFAULT_PUBLIC_SITE_URL = CANONICAL_PUBLIC_ORIGIN;

type SitemapUrlEntry = {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: number;
};

function getFallbackBaseUrl(): string {
  const candidates = [
    process.env.FRONTEND_URL,
    ENV.appUrl,
    DEFAULT_PUBLIC_SITE_URL,
  ];

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

function buildPublishedListingPath(
  id: number,
  title: string | null | undefined,
  storedSlug?: string | null,
): string {
  const slug = slugify(String(storedSlug || ''));
  return slug ? `/property/${id}-${slug}` : buildPropertyPath(id, title);
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

function listingTypeToPathPrefix(listingType: string): '/property-for-sale' | '/property-to-rent' | null {
  if (listingType === 'sale') return '/property-for-sale';
  if (listingType === 'rent') return '/property-to-rent';
  return null;
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
  const xml = buildSitemapIndex([
    '/sitemap-listings.xml',
    '/sitemap-areas.xml',
    '/sitemap-developments.xml',
    '/sitemap-static.xml',
  ], resolveBaseUrl(req));

  sendXml(res, xml);
});

router.get('/sitemap-listings.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const rows = await db
      .select({
        id: properties.id,
        title: properties.title,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .where(
        and(
          inArray(properties.status, [...LIVE_PROPERTY_STATUSES]),
          sql`COALESCE(${properties.title}, '') <> ''`,
        ),
      );

    const listingRows =
      rows.length > 0
        ? rows.map(row => ({
            loc: toAbsoluteUrl(buildPropertyPath(Number(row.id), row.title), baseUrl),
            lastmod: row.updatedAt,
            changefreq: 'daily',
            priority: 0.9,
          }))
        : (
            await db
              .select({
                id: listings.id,
                title: listings.title,
                slug: listings.slug,
                updatedAt: listings.updatedAt,
              })
              .from(listings)
              .where(
                and(
                  eq(listings.status, 'published'),
                  sql`COALESCE(${listings.title}, '') <> ''`,
                ),
              )
          ).map(row => ({
            loc: toAbsoluteUrl(
              buildPublishedListingPath(Number(row.id), row.title, row.slug),
              baseUrl,
            ),
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
      .where(
        and(
          eq(developments.isPublished, 1),
          eq(developments.approvalStatus, 'approved'),
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

router.get('/sitemap-areas.xml', async (_req, res, next) => {
  try {
    const baseUrl = resolveBaseUrl(_req);
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const provinceRows = await db
      .select({
        listingType: properties.listingType,
        provinceSlug: provinces.slug,
        updatedAt: sql<string>`MAX(${properties.updatedAt})`,
      })
      .from(properties)
      .innerJoin(provinces, eq(properties.provinceId, provinces.id))
      .where(
        and(
          inArray(properties.status, [...LIVE_PROPERTY_STATUSES]),
          inArray(properties.listingType, [...AREA_LISTING_TYPES]),
          sql`COALESCE(${provinces.slug}, '') <> ''`,
        ),
      )
      .groupBy(properties.listingType, provinces.id, provinces.slug);

    const cityRows = await db
      .select({
        listingType: properties.listingType,
        provinceSlug: provinces.slug,
        citySlug: cities.slug,
        updatedAt: sql<string>`MAX(${properties.updatedAt})`,
      })
      .from(properties)
      .innerJoin(cities, eq(properties.cityId, cities.id))
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(
          inArray(properties.status, [...LIVE_PROPERTY_STATUSES]),
          inArray(properties.listingType, [...AREA_LISTING_TYPES]),
          sql`COALESCE(${provinces.slug}, '') <> ''`,
          sql`COALESCE(${cities.slug}, '') <> ''`,
        ),
      )
      .groupBy(properties.listingType, provinces.id, provinces.slug, cities.id, cities.slug);

    const suburbRows = await db
      .select({
        listingType: properties.listingType,
        provinceSlug: provinces.slug,
        citySlug: cities.slug,
        suburbSlug: suburbs.slug,
        updatedAt: sql<string>`MAX(${properties.updatedAt})`,
      })
      .from(properties)
      .innerJoin(suburbs, eq(properties.suburbId, suburbs.id))
      .innerJoin(cities, eq(suburbs.cityId, cities.id))
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(
          inArray(properties.status, [...LIVE_PROPERTY_STATUSES]),
          inArray(properties.listingType, [...AREA_LISTING_TYPES]),
          sql`COALESCE(${provinces.slug}, '') <> ''`,
          sql`COALESCE(${cities.slug}, '') <> ''`,
          sql`COALESCE(${suburbs.slug}, '') <> ''`,
        ),
      )
      .groupBy(
        properties.listingType,
        provinces.id,
        provinces.slug,
        cities.id,
        cities.slug,
        suburbs.id,
        suburbs.slug,
      );

    const entries: SitemapUrlEntry[] = [
      ...provinceRows
        .map(row => {
          const prefix = listingTypeToPathPrefix(String(row.listingType || ''));
          if (!prefix || !row.provinceSlug) return null;
          return {
            loc: toAbsoluteUrl(`${prefix}/${row.provinceSlug}`, baseUrl),
            lastmod: row.updatedAt,
            changefreq: 'daily',
            priority: 0.8,
          } satisfies SitemapUrlEntry;
        })
        .filter((entry): entry is SitemapUrlEntry => entry !== null),
      ...cityRows
        .map(row => {
          const prefix = listingTypeToPathPrefix(String(row.listingType || ''));
          if (!prefix || !row.provinceSlug || !row.citySlug) return null;
          return {
            loc: toAbsoluteUrl(`${prefix}/${row.provinceSlug}/${row.citySlug}`, baseUrl),
            lastmod: row.updatedAt,
            changefreq: 'daily',
            priority: 0.8,
          } satisfies SitemapUrlEntry;
        })
        .filter((entry): entry is SitemapUrlEntry => entry !== null),
      ...suburbRows
        .map(row => {
          const prefix = listingTypeToPathPrefix(String(row.listingType || ''));
          if (!prefix || !row.provinceSlug || !row.citySlug || !row.suburbSlug) return null;
          return {
            loc: toAbsoluteUrl(
              `${prefix}/${row.provinceSlug}/${row.citySlug}/${row.suburbSlug}`,
              baseUrl,
            ),
            lastmod: row.updatedAt,
            changefreq: 'daily',
            priority: 0.7,
          } satisfies SitemapUrlEntry;
        })
        .filter((entry): entry is SitemapUrlEntry => entry !== null),
    ];

    const fallbackEntries: SitemapUrlEntry[] =
      entries.length > 0
        ? []
        : [
            ...(
              await db
                .select({
                  action: listings.action,
                  province: listings.province,
                  updatedAt: sql<string>`MAX(${listings.updatedAt})`,
                })
                .from(listings)
                .where(
                  and(
                    eq(listings.status, 'published'),
                    inArray(listings.action, ['sell', 'rent']),
                    sql`COALESCE(${listings.province}, '') <> ''`,
                  ),
                )
                .groupBy(listings.action, listings.province)
            )
              .map(row => {
                const prefix =
                  row.action === 'sell'
                    ? '/property-for-sale'
                    : row.action === 'rent'
                      ? '/property-to-rent'
                      : null;
                const provinceSlug = slugify(String(row.province || ''));
                if (!prefix || !provinceSlug) return null;
                return {
                  loc: toAbsoluteUrl(`${prefix}/${provinceSlug}`, baseUrl),
                  lastmod: row.updatedAt,
                  changefreq: 'daily',
                  priority: 0.8,
                } satisfies SitemapUrlEntry;
              })
              .filter((entry): entry is SitemapUrlEntry => entry !== null),
            ...(
              await db
                .select({
                  action: listings.action,
                  province: listings.province,
                  city: listings.city,
                  updatedAt: sql<string>`MAX(${listings.updatedAt})`,
                })
                .from(listings)
                .where(
                  and(
                    eq(listings.status, 'published'),
                    inArray(listings.action, ['sell', 'rent']),
                    sql`COALESCE(${listings.province}, '') <> ''`,
                    sql`COALESCE(${listings.city}, '') <> ''`,
                  ),
                )
                .groupBy(listings.action, listings.province, listings.city)
            )
              .map(row => {
                const prefix =
                  row.action === 'sell'
                    ? '/property-for-sale'
                    : row.action === 'rent'
                      ? '/property-to-rent'
                      : null;
                const provinceSlug = slugify(String(row.province || ''));
                const citySlug = slugify(String(row.city || ''));
                if (!prefix || !provinceSlug || !citySlug) return null;
                return {
                  loc: toAbsoluteUrl(`${prefix}/${provinceSlug}/${citySlug}`, baseUrl),
                  lastmod: row.updatedAt,
                  changefreq: 'daily',
                  priority: 0.8,
                } satisfies SitemapUrlEntry;
              })
              .filter((entry): entry is SitemapUrlEntry => entry !== null),
            ...(
              await db
                .select({
                  action: listings.action,
                  province: listings.province,
                  city: listings.city,
                  suburb: listings.suburb,
                  updatedAt: sql<string>`MAX(${listings.updatedAt})`,
                })
                .from(listings)
                .where(
                  and(
                    eq(listings.status, 'published'),
                    inArray(listings.action, ['sell', 'rent']),
                    sql`COALESCE(${listings.province}, '') <> ''`,
                    sql`COALESCE(${listings.city}, '') <> ''`,
                    sql`COALESCE(${listings.suburb}, '') <> ''`,
                  ),
                )
                .groupBy(listings.action, listings.province, listings.city, listings.suburb)
            )
              .map(row => {
                const prefix =
                  row.action === 'sell'
                    ? '/property-for-sale'
                    : row.action === 'rent'
                      ? '/property-to-rent'
                      : null;
                const provinceSlug = slugify(String(row.province || ''));
                const citySlug = slugify(String(row.city || ''));
                const suburbSlug = slugify(String(row.suburb || ''));
                if (!prefix || !provinceSlug || !citySlug || !suburbSlug) return null;
                return {
                  loc: toAbsoluteUrl(`${prefix}/${provinceSlug}/${citySlug}/${suburbSlug}`, baseUrl),
                  lastmod: row.updatedAt,
                  changefreq: 'daily',
                  priority: 0.7,
                } satisfies SitemapUrlEntry;
              })
              .filter((entry): entry is SitemapUrlEntry => entry !== null),
          ];

    sendXml(res, buildUrlSet(entries.length > 0 ? entries : fallbackEntries));
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
      { loc: toAbsoluteUrl('/developers', baseUrl), changefreq: 'weekly', priority: 0.8 },
      { loc: toAbsoluteUrl('/advertise', baseUrl), changefreq: 'monthly', priority: 0.5 },
      { loc: toAbsoluteUrl('/services', baseUrl), changefreq: 'weekly', priority: 0.7 },
      { loc: toAbsoluteUrl('/distribution-network', baseUrl), changefreq: 'weekly', priority: 0.6 },
    ];

    const developerRows = await db
      .select({
        slug: developerBrandProfiles.slug,
        updatedAt: developerBrandProfiles.updatedAt,
      })
      .from(developerBrandProfiles)
      .where(
        and(
          eq(developerBrandProfiles.isVisible, 1),
          sql`COALESCE(${developerBrandProfiles.slug}, '') <> ''`,
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

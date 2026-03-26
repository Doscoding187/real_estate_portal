import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { developmentService } from '../server/services/developmentService';

const staticRoutes = ['/', '/property-for-sale', '/property-to-rent', '/new-developments', '/advertise', '/login'];

const majorLocations = [
  '/property-for-sale/gauteng/johannesburg',
  '/property-for-sale/gauteng/pretoria',
  '/property-for-sale/gauteng/sandton',
  '/property-for-sale/gauteng/midrand',
  '/property-for-sale/gauteng/centurion',
  '/property-for-sale/western-cape/cape-town',
  '/property-for-sale/western-cape/stellenbosch',
  '/property-for-sale/western-cape/somerset-west',
  '/property-for-sale/kwazulu-natal/durban',
  '/property-for-sale/kwazulu-natal/umhlanga',
  '/property-for-sale/kwazulu-natal/ballito',
  '/property-to-rent/gauteng/johannesburg',
  '/property-to-rent/western-cape/cape-town',
];

const BASE_URL = process.env.SITEMAP_BASE_URL || 'https://propertylistifysa.co.za';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type SitemapEntry = {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'weekly';
  priority: string;
};

function buildXml(entries: SitemapEntry[]) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${entry.loc}</loc>\n`;
    xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

function writeSitemap(filename: string, entries: SitemapEntry[]) {
  const publicDir = path.join(__dirname, '../client/public');
  if (!fs.existsSync(publicDir)) {
    console.warn('Public directory not found at', publicDir);
    return;
  }

  const filePath = path.join(publicDir, filename);
  fs.writeFileSync(filePath, buildXml(entries));
  console.log(`Sitemap generated at ${filePath}`);
}

async function generateSitemaps() {
  const today = new Date().toISOString().split('T')[0];
  const primaryEntries: SitemapEntry[] = [
    ...staticRoutes.map(route => ({
      loc: `${BASE_URL}${route}`,
      lastmod: today,
      changefreq: 'daily' as const,
      priority: '0.8',
    })),
    ...majorLocations.map(route => ({
      loc: `${BASE_URL}${route}`,
      lastmod: today,
      changefreq: 'weekly' as const,
      priority: '0.9',
    })),
  ];

  let unitEntries: SitemapEntry[] = [];

  try {
    const [developments, units] = await Promise.all([
      developmentService.listPublicDevelopments({ limit: 5000 }),
      developmentService.listPublicDevelopmentUnits({ limit: 20000, perDevelopmentCap: 1000 }),
    ]);

    primaryEntries.push(
      ...developments.map((development: any) => ({
        loc: `${BASE_URL}/development/${development.slug || development.id}`,
        lastmod: today,
        changefreq: 'weekly' as const,
        priority: '0.8',
      })),
    );

    unitEntries = units.map((unit: any) => ({
      loc: `${BASE_URL}${unit.href}`,
      lastmod: today,
      changefreq: 'weekly' as const,
      priority: '0.7',
    }));
  } catch (error) {
    console.warn('Dynamic sitemap generation skipped; using static routes only.', error);
  }

  writeSitemap('sitemap.xml', primaryEntries);
  writeSitemap('sitemap-units.xml', unitEntries);
}

generateSitemaps().catch(error => {
  console.error('Failed to generate sitemap files', error);
  process.exit(1);
});

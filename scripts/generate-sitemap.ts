
import fs from 'fs';
import path from 'path';

// Core Canonical Routes
const staticRoutes = [
  '/',
  '/property-for-sale',
  '/property-to-rent',
  '/new-developments',
  '/advertise',
  '/login'
];

// Major Locations (Stubbed for now - in a real app this would query the DB)
const majorLocations = [
  // Gauteng
  '/property-for-sale/gauteng/johannesburg',
  '/property-for-sale/gauteng/pretoria',
  '/property-for-sale/gauteng/sandton',
  '/property-for-sale/gauteng/midrand',
  '/property-for-sale/gauteng/centurion',
  // Western Cape
  '/property-for-sale/western-cape/cape-town',
  '/property-for-sale/western-cape/stellenbosch',
  '/property-for-sale/western-cape/somerset-west',
  // KZN
  '/property-for-sale/kwazulu-natal/durban',
  '/property-for-sale/kwazulu-natal/umhlanga',
  '/property-for-sale/kwazulu-natal/ballito',
  // Rentals
  '/property-to-rent/gauteng/johannesburg',
  '/property-to-rent/western-cape/cape-town',
];

const BASE_URL = 'https://propertylistify.com';

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add Static Routes
  staticRoutes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${route}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  // Add Major Locations
  majorLocations.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${route}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  const publicDir = path.join(__dirname, '../client/public');
  // Ensure public dir exists (it should)
  if (!fs.existsSync(publicDir)) {
      console.warn('Public directory not found at', publicDir);
      return; 
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);
  console.log(`✅ Sitemap generated at ${sitemapPath}`);
}

generateSitemap();

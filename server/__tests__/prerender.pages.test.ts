import { describe, expect, it } from 'vitest';
import { config as vercelConfig } from '../../vercel';
import {
  escapeHtml,
  listPrerenderPages,
  prerenderFileName,
  renderPrerenderedHtml,
  type PrerenderPage,
} from '../_core/prerenderPages';
import { publishedCanonicalPlaceUrls } from '../services/canonicalPlaceUrlService';

// Mirrors the head of client/index.html as built by Vite (module script, a commented-out tag).
const SHELL = `<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<meta name="description" content="generic" />
<meta name="robots" content="index, follow" />
<meta property="og:title" content="generic" />
<!-- <meta property="og:image" content="https://example.test/old.jpg" /> -->
<title>generic</title>
<script type="module" crossorigin src="/assets/index-abc.js"></script>
</head><body><div id="dnd-portal"></div><div id="root"></div></body></html>`;

const pages = listPrerenderPages({ includeLocalities: true });
const byPath = new Map(pages.map(page => [page.path, page]));

function page(path: string): PrerenderPage {
  const found = byPath.get(path);
  if (!found) throw new Error(`missing prerender page ${path}`);
  return found;
}

describe('prerender route list', () => {
  it('covers the homepage, every province and the fixed-content pages', () => {
    for (const path of [
      '/',
      '/about',
      '/faq',
      '/terms',
      '/privacy',
      '/legal/terms',
      '/legal/privacy',
      '/contact',
      '/advertise',
      '/advertise/sell/agents',
      '/advertise/sell/agencies',
      '/advertise/sell/developers',
    ]) {
      expect(byPath.has(path), path).toBe(true);
    }
    expect(pages.filter(item => item.family === 'province')).toHaveLength(9);
  });

  it('emits only published, active place URLs and never /south-africa', () => {
    const published = new Set(publishedCanonicalPlaceUrls().map(entry => entry.path));
    const placePages = pages.filter(item => ['province', 'city', 'locality'].includes(item.family));
    expect(placePages.length).toBe(published.size);
    for (const item of placePages) expect(published.has(item.path), item.path).toBe(true);
    expect(byPath.has('/south-africa')).toBe(false);
  });

  it('uses unique, query-free, file-safe paths', () => {
    expect(new Set(pages.map(item => item.path)).size).toBe(pages.length);
    for (const item of pages) {
      expect(item.path === '/' || /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(item.path), item.path).toBe(
        true,
      );
    }
    expect(prerenderFileName(page('/'))).toBe('index.html');
    expect(prerenderFileName(page('/about'))).toBe('about/index.html');
  });

  it('drops localities but keeps provinces and cities when the budget requires it', () => {
    const slim = listPrerenderPages({ includeLocalities: false });
    expect(slim.some(item => item.family === 'locality')).toBe(false);
    expect(slim.some(item => item.family === 'city')).toBe(true);
    expect(slim.length).toBeLessThan(pages.length);
  });
});

describe('prerendered head and body', () => {
  it('gives a city the same title, description and canonical the React page sets', () => {
    const city = pages.find(item => item.family === 'city');
    if (!city) throw new Error('no city page');
    const html = renderPrerenderedHtml(SHELL, city);
    const label = /<h1>(.*?)<\/h1>/.exec(html)?.[1] ?? '';
    expect(html).toContain(`<title>${label} property search | Property Listify</title>`);
    expect(html).toMatch(/content="Explore property listings in [^"]+\."/);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(`href="https://www.propertylistifysa.co.za${city.path}"`);
    expect(html).toContain('name="robots" content="index, follow"');
    expect(html).toContain(
      'property="og:image" content="https://www.propertylistifysa.co.za/assets/',
    );
    expect(html).not.toContain('example.test/old.jpg');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('<div id="root"><main data-prerendered="true">');
    expect(html).toContain('/assets/index-abc.js');
  });

  it('marks the canonical and JSON-LD as client-managed so boot updates them in place', () => {
    const html = renderPrerenderedHtml(SHELL, page('/'));
    expect(html).toContain('data-route-meta="canonical"');
    expect(
      html.match(/<script type="application\/ld\+json" data-seo-managed="true">/g),
    ).toHaveLength(2);
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('<h1>South Africa&#39;s smarter property platform</h1>');
  });

  it('does not duplicate head tags when applied to an already prerendered document', () => {
    const headOnly = { ...page('/about'), bodyHtml: '' };
    const once = renderPrerenderedHtml(SHELL, headOnly);
    const twice = renderPrerenderedHtml(once, headOnly);
    expect(twice.match(/rel="canonical"/g)).toHaveLength(1);
    expect(twice.match(/<title>/g)).toHaveLength(1);
  });

  it('uses the canonical the live page uses for alias and legal routes', () => {
    expect(page('/about').canonicalPath).toBe('/company/about');
    expect(page('/faq').canonicalPath).toBe('/support/faq');
    expect(page('/terms').canonicalPath).toBe('/legal/terms');
    expect(page('/legal/consumer-rights').canonicalPath).toBe('/legal/terms');
    expect(page('/cookies').canonicalPath).toBe('/legal/privacy');
    expect(page('/contact').canonicalPath).toBe('/contact');
  });

  it('refuses a shell whose root is not empty', () => {
    const once = renderPrerenderedHtml(SHELL, page('/about'));
    expect(() => renderPrerenderedHtml(once, page('/about'))).toThrow(/empty #root/);
  });

  it('escapes text and keeps structured data from closing the script tag', () => {
    expect(escapeHtml('A & "B" <i>')).toBe('A &amp; &quot;B&quot; &lt;i&gt;');
    const hostile: PrerenderPage = {
      ...page('/about'),
      title: 'x</title><script>1</script>',
      structuredData: [{ name: '</script><script>alert(1)</script>' }],
    };
    const html = renderPrerenderedHtml(SHELL, hostile);
    expect(html).not.toContain('<script>1</script>');
    expect(html).not.toContain('</script><script>alert');
  });
});

describe('vercel route order', () => {
  const routes = vercelConfig.routes as Array<Record<string, unknown>>;
  const indexOf = (predicate: (route: Record<string, unknown>) => boolean) =>
    routes.findIndex(predicate);

  it('serves generated files before the single-page-app catch-all', () => {
    const southAfrica = indexOf(route => route.src === '/south-africa/?');
    const filesystem = indexOf(route => route.handle === 'filesystem');
    const catchAll = indexOf(route => route.src === '/(.*)' && route.dest === '/index.html');
    expect(southAfrica).toBeGreaterThan(-1);
    expect(filesystem).toBeGreaterThan(southAfrica);
    expect(catchAll).toBe(filesystem + 1);
    expect(catchAll).toBe(routes.length - 1);
  });

  it('keeps robots, sitemap and asset rules ahead of the filesystem handler', () => {
    const filesystem = indexOf(route => route.handle === 'filesystem');
    for (const src of ['/robots.txt', '/assets/(.*)', '/version.json']) {
      expect(indexOf(route => route.src === src)).toBeLessThan(filesystem);
    }
  });
});

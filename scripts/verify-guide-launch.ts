/**
 * Launch QA against a deployed environment.
 *
 * Checks the raw delivered document and the rendered page at a phone width, so a guide is
 * verified as a crawler and as a reader see it. Run it with:
 *   BASE_URL=https://www.propertylistifysa.co.za npx tsx scripts/verify-guide-launch.ts
 */
import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const MOBILE = { width: 390, height: 844 };

const ROUTES = [
  {
    path: '/south-africa',
    title: /Property for sale in South Africa/i,
    canonical: `${BASE_URL}/south-africa`,
    marker: 'country-discovery-initial',
  },
  {
    path: '/gauteng',
    title: /Explore Gauteng/i,
    canonical: `${BASE_URL}/gauteng`,
    marker: 'province-guide-initial',
  },
  {
    path: '/gauteng/johannesburg',
    title: /Johannesburg area guide/i,
    canonical: `${BASE_URL}/gauteng/johannesburg`,
    marker: 'city-guide-initial',
  },
  {
    path: '/gauteng/johannesburg/sandton',
    title: /Sandton property guide/i,
    canonical: `${BASE_URL}/gauteng/johannesburg/sandton`,
    marker: 'suburb-guide-initial',
  },
];

type Result = { route: string; check: string; ok: boolean; detail: string };

async function main() {
  const results: Result[] = [];
  const record = (route: string, check: string, ok: boolean, detail = '') =>
    results.push({ route, check, ok, detail });

  // GUIDE_ROUTES limits the check to a subset, for an environment where only some of the
  // routes are deployed.
  const only = (process.env.GUIDE_ROUTES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const routes = only.length ? ROUTES.filter(route => only.includes(route.path)) : ROUTES;

  const browser = await chromium.launch({ channel: 'chromium' });
  const context = await browser.newContext({ viewport: MOBILE, isMobile: true });

  for (const route of routes) {
    const url = `${BASE_URL}${route.path}`;
    const response = await context.request.get(url);
    const html = await response.text();

    record(route.path, 'responds 200', response.ok(), `status ${response.status()}`);
    record(
      route.path,
      'delivered title',
      route.title.test(html),
      html.match(/<title>([^<]*)/)?.[1] ?? '',
    );
    record(
      route.path,
      'canonical',
      html.includes(`<link rel="canonical" href="${route.canonical}" />`),
      route.canonical,
    );
    record(
      route.path,
      'indexable',
      html.includes('<meta name="robots" content="index, follow" />'),
      '',
    );
    record(route.path, 'delivered guide body', html.includes(route.marker), route.marker);
    record(
      route.path,
      'no draft marker',
      !html.includes('Local-review draft.') && !html.includes('Local preview draft.'),
      '',
    );
    record(route.path, 'structured data', html.includes('<script type="application/ld+json"'), '');
  }

  // The rendered page must survive a mobile viewport and a guide must remain readable.
  const page = await context.newPage();
  for (const route of routes) {
    // 'commit' rather than 'domcontentloaded': when the API host is unavailable the
    // document is complete but the page's data calls keep the load event pending, and the
    // delivered document is what a crawler reads.
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'commit', timeout: 60_000 });
    await page.waitForSelector('h1', { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(3000);

    const heading = await page.locator('h1').first();
    const headingText = (await heading.count()) ? (await heading.textContent())?.trim() : '';
    record(route.path, 'renders an h1', Boolean(headingText), headingText ?? '');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    record(route.path, 'no horizontal overflow', overflow <= 1, `overflow ${overflow}px`);

    const bodyText = await page.locator('body').innerText();
    record(
      route.path,
      'stays readable after hydration',
      bodyText.length > 400 &&
        !/couldn't load|is temporarily unavailable for attended/i.test(bodyText),
      `${bodyText.length} chars`,
    );
  }

  await browser.close();

  let failed = 0;
  for (const result of results) {
    if (!result.ok) failed += 1;
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'}  ${result.route}  ${result.check}${result.detail ? ` — ${result.detail}` : ''}`,
    );
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed against ${BASE_URL}.`);
  if (failed) process.exitCode = 1;
}

main();

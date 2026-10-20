import { expect, test } from '../helpers/audit-network';

/**
 * Guide pilot SEO delivery and mobile smoke.
 *
 * The delivered document is what a crawler receives before it executes any JavaScript. These
 * checks read the raw response, so they hold on an environment without canonical reference
 * data. The mobile smoke asserts that the rendered page is usable at a phone width and never
 * presents an empty shell.
 */

const PILOT_ROUTES = [
  {
    path: '/gauteng',
    canonical: 'https://www.propertylistifysa.co.za/gauteng',
    heading: 'Explore Gauteng',
  },
  {
    path: '/gauteng/johannesburg',
    canonical: 'https://www.propertylistifysa.co.za/gauteng/johannesburg',
    heading: 'Explore Johannesburg',
  },
  {
    path: '/gauteng/johannesburg/sandton',
    canonical: 'https://www.propertylistifysa.co.za/gauteng/johannesburg/sandton',
    heading: 'Explore Sandton',
  },
];

test.describe('guide pilot delivered document', () => {
  test('serves the guide document with its own title, canonical and robots', async ({ request }) => {
    for (const route of PILOT_ROUTES) {
      const response = await request.get(route.path);
      expect(response.ok(), `${route.path} must be served`).toBeTruthy();

      const html = await response.text();
      expect(html).toContain(`<link rel="canonical" href="${route.canonical}" />`);
      expect(html).toContain('<meta name="robots" content="index, follow" />');
      expect(html).toContain('<meta name="description" content="');
      expect(html).toContain('<script type="application/ld+json" data-seo-managed="true">');
      expect(html).not.toContain('Local-review draft.');
      expect(html).not.toContain('Local preview draft.');
    }
  });

  test('keeps a filtered guide route out of the index', async ({ request }) => {
    const response = await request.get('/gauteng?journey=buy');
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex, follow" />');
  });
});

test.describe('guide pilot mobile smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('renders a usable guide page at a phone width without horizontal overflow', async ({
    page,
  }) => {
    for (const route of PILOT_ROUTES) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      const heading = page.getByRole('heading', { level: 1 }).first();
      await expect(heading).toBeVisible();
      expect((await heading.textContent())?.trim().length).toBeGreaterThan(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route.path} must not overflow the viewport`).toBeLessThanOrEqual(1);
    }
  });
});

import type { Page } from '@playwright/test';
import { expect, test } from '../helpers/audit-network';

/**
 * Canonical Place routing contract.
 *
 * Canonical Place pages use the exact paths in the published URL projection.
 * Result pages carry one canonicalPlaceId. The retired SRP-path geography
 * family (/property-for-sale/{geo}) must not come back.
 *
 */

/**
 * A client-side crash must be reported as a crash.
 *
 * Without this, a page that throws during render is indistinguishable from a page that never
 * rendered, and the journey only says a heading is missing. The journey is the gate for the
 * geography surface, so it has to say what broke.
 *
 * Handled query failures and failed resource loads are product states, not crashes: the page
 * renders an error or empty state for them. Counting them as crashes made the geography gate
 * fail for an optional integration rather than for the geography it exists to protect.
 */
const clientErrors: string[] = [];

/**
 * The journey boots the whole application in a browser. A cold first load of a real page is not
 * a five-second operation, especially on a fresh runner, so the journey waits for the page it
 * actually means to see.
 */
const PAGE_READY_TIMEOUT = 30_000;

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  clientErrors.length = 0;
  page.on('pageerror', error => clientErrors.push(`Uncaught page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.startsWith('[API Query Error]') || text.startsWith('[API Mutation Error]')) return;
    if (text.startsWith('Failed to load resource:')) return;
    clientErrors.push(text);
  });
});

test.afterEach(async ({ page }) => {
  if (!clientErrors.length) return;
  const errors = [...clientErrors];
  clientErrors.length = 0;
  await expect(errors.length, `the page raised a client-side error:\n${errors.join('\n')}`).toBe(0);
});

const CANONICAL_PLACE_PAGES = [
  { path: '/gauteng', label: 'Gauteng' },
  { path: '/gauteng/johannesburg', label: 'Johannesburg' },
  { path: '/gauteng/city-of-johannesburg/sandton', label: 'Sandton' },
];

const RETIRED_SRP_GEOGRAPHY_PATHS = [
  '/property-for-sale/gauteng',
  '/property-for-sale/gauteng/johannesburg',
  '/property-to-rent/gauteng/johannesburg',
];

test.describe('Canonical Place routing', () => {
  for (const { path, label } of CANONICAL_PLACE_PAGES) {
    test(`${path} serves its admitted Place page without legacy result controls`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible({
        timeout: PAGE_READY_TIMEOUT,
      });
      await expect(
        page.locator('[data-testid="search-filters"], [data-testid="filters-sidebar"]'),
      ).toHaveCount(0);
      await expect(page.locator('[data-testid="sort-dropdown"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="pagination"]')).toHaveCount(0);
      await expect(page.getByText(/showing \d+ of \d+/i)).toHaveCount(0);
    });
  }

  test('retired SRP-path geography URLs stay retired', async ({ page }) => {
    for (const path of RETIRED_SRP_GEOGRAPHY_PATHS) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible({
        timeout: PAGE_READY_TIMEOUT,
      });
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
    }
  });

  test('canonical place page carries its exact identity into property search', async ({ page }) => {
    await page.goto('/gauteng/city-of-johannesburg/sandton', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Sandton', exact: true })).toBeVisible(
      {
        timeout: PAGE_READY_TIMEOUT,
      },
    );

    const saleLink = page.getByRole('link', { name: 'Search homes for sale' });
    await expect(saleLink).toBeVisible();
    const href = await saleLink.getAttribute('href');
    expect(href).toMatch(/^\/property-for-sale\?canonicalPlaceId=pl-place-01-[a-f0-9]{24}$/);
    const expectedPlaceId = new URL(href ?? '/', 'http://listify.test').searchParams.get(
      'canonicalPlaceId',
    );
    expect(expectedPlaceId).toMatch(/^pl-place-01-[a-f0-9]{24}$/);

    await saleLink.click();
    await expect(page).toHaveURL(/\/property-for-sale\?canonicalPlaceId=pl-place-01-[a-f0-9]{24}$/);
    const resultUrl = new URL(page.url());
    expect(resultUrl.searchParams.get('canonicalPlaceId')).toBe(expectedPlaceId);
    for (const legacyKey of ['locationId', 'city', 'province', 'suburb']) {
      expect(resultUrl.searchParams.has(legacyKey)).toBe(false);
    }
  });
});

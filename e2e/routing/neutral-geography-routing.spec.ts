import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../helpers/audit-network';

/**
 * Neutral geography routing contract.
 *
 * Canonical discovery geography lives at /{province}, /{province}/{city} and
 * /{province}/{city}/{suburb}. Result pages stay query-scoped under
 * /property-for-sale (and /property-to-rent). The retired SRP-path geography
 * family (/property-for-sale/{geo}) must not come back.
 *
 * Hero search handoff coverage requires canonical reference data; on
 * environments without it the suite skips those cases with an honest reason.
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
  await expect(
    errors.length,
    `the page raised a client-side error:\n${errors.join('\n')}`,
  ).toBe(0);
});

const NEUTRAL_DISCOVERY_PAGES = [
  { path: '/gauteng', heading: /Explore Gauteng/i },
  { path: '/gauteng/johannesburg', heading: /Explore Johannesburg/i },
  { path: '/gauteng/johannesburg/sandton', heading: /Explore Sandton/i },
];

const RETIRED_SRP_GEOGRAPHY_PATHS = [
  '/property-for-sale/gauteng',
  '/property-for-sale/gauteng/johannesburg',
  '/property-to-rent/gauteng/johannesburg',
];

async function openBuyHero(page: Page): Promise<Locator> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Buy', exact: true }).first().click();
  return page.getByRole('combobox', { name: 'Search by city, suburb, or area' });
}

async function waitForSuggestionsOrEmptyState(page: Page, option: Locator) {
  await Promise.race([
    option.first().waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT }).catch(() => null),
    page
      .getByText('No locations found')
      .waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT })
      .catch(() => null),
  ]);
}

test.describe('Neutral geography routing', () => {
  for (const { path, heading } of NEUTRAL_DISCOVERY_PAGES) {
    test(`${path} serves discovery content and never SRP controls`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      await expect(
        page.getByRole('heading', { level: 1, name: heading }),
      ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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
      await expect(
        page.getByRole('heading', { level: 1, name: 'Page not found' }),
      ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
    }
  });

  test.describe('Hero search handoff', () => {
    test('suburb selection hands off to query-scoped results', async ({ page }) => {
      const locationInput = await openBuyHero(page);
      await locationInput.fill('Sandton');

      const sandtonOption = page.getByRole('option', { name: /Sandton/ });
      await waitForSuggestionsOrEmptyState(page, sandtonOption);
      test.skip(
        !(await sandtonOption.first().isVisible()),
        'Hero search handoff requires canonical reference data.',
      );

      await sandtonOption.first().click();
      await page
        .locator('form')
        .getByRole('button', { name: 'Search', exact: true })
        .click();

      await expect(page).toHaveURL(/\/property-for-sale\?.*locationId=suburb%3A\d+/);
      await expect(page).toHaveURL(/suburb=sandton/);
      await expect(page).toHaveURL(/province=gauteng/);
    });

    test('broad city selection clarifies through the area picker before searching', async ({
      page,
    }) => {
      const locationInput = await openBuyHero(page);
      await locationInput.fill('Johannesburg');

      const cityOption = page.getByRole('option', { name: 'Johannesburg City Location' });
      await waitForSuggestionsOrEmptyState(page, cityOption);
      test.skip(
        !(await cityOption.first().isVisible()),
        'Hero search handoff requires canonical reference data.',
      );

      await cityOption.first().click();
      await page
        .locator('form')
        .getByRole('button', { name: 'Search', exact: true })
        .click();

      const areaPicker = page.getByRole('dialog');
      await expect(areaPicker).toBeVisible();
      await expect(areaPicker.getByRole('button', { name: /Browse all Johannesburg/ })).toBeVisible();

      await areaPicker.getByRole('button', { name: /Browse all Johannesburg/ }).click();

      await expect(page).toHaveURL(/\/property-for-sale\?.*locationId=city%3A\d+/);
      await expect(page).toHaveURL(/city=johannesburg/);
      await expect(page).toHaveURL(/province=gauteng/);
    });

    test('area picker explore path lands on the canonical neutral city page', async ({ page }) => {
      const locationInput = await openBuyHero(page);
      await locationInput.fill('Johannesburg');

      const cityOption = page.getByRole('option', { name: 'Johannesburg City Location' });
      await waitForSuggestionsOrEmptyState(page, cityOption);
      test.skip(
        !(await cityOption.first().isVisible()),
        'Hero search handoff requires canonical reference data.',
      );

      await cityOption.first().click();
      await page
        .locator('form')
        .getByRole('button', { name: 'Search', exact: true })
        .click();

      const areaPicker = page.getByRole('dialog');
      await expect(areaPicker).toBeVisible();
      await areaPicker.getByRole('button', { name: /Not sure\? Explore Johannesburg/ }).click();

      await expect(page).toHaveURL(/\/gauteng\/johannesburg$/);
      await expect(
        page.getByRole('heading', { level: 1, name: /Explore Johannesburg/i }),
      ).toBeVisible();
    });
  });
});

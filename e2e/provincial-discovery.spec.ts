import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const EVIDENCE_DIR =
  process.env.PROVINCIAL_EVIDENCE_DIR || '/tmp/property-listify-provincial-discovery-gauteng-s0';

const publicInventory = {
  state: 'sparse',
  total: 2,
  items: [
    {
      id: 'property-101',
      href: '/property/101',
      title: 'Light-filled family townhouse',
      location: 'Fourways, Johannesburg',
      price: 1850000,
      image: null,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      propertyType: 'townhouse',
      listingType: 'sale',
      listingSource: 'manual',
    },
  ],
  sourceCounts: { manual: 2, development: 0 },
  pageSize: 6,
  authority: 'public-search',
};

const provincialFixture = {
  province: {
    id: 1,
    canonicalLocationId: 'province:1',
    name: 'Gauteng',
    slug: 'gauteng',
    code: 'GP',
    latitude: null,
    longitude: null,
    description: null,
  },
  cities: [
    {
      id: 2,
      canonicalLocationId: 'city:2',
      name: 'Pretoria',
      slug: 'pretoria',
      provinceSlug: 'gauteng',
      latitude: null,
      longitude: null,
    },
    {
      id: 3,
      canonicalLocationId: 'city:3',
      name: 'Johannesburg',
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      latitude: null,
      longitude: null,
    },
  ],
  markets: [
    {
      slug: 'johannesburg',
      name: 'Johannesburg',
      eyebrow: 'Northern and central Gauteng',
      description: 'A dense mix of employment nodes, established suburbs and urban homes.',
      areaSlugs: ['sandton', 'rosebank', 'fourways'],
      city: { id: 3, canonicalLocationId: 'city:3', name: 'Johannesburg', slug: 'johannesburg' },
      inventory: { ...publicInventory, pageSize: 4 },
      state: 'sparse',
    },
    {
      slug: 'pretoria',
      name: 'Pretoria',
      eyebrow: 'Capital city and eastern corridor',
      description: 'A broad market spanning family neighbourhoods, townhouses and apartments.',
      areaSlugs: ['centurion', 'menlyn', 'waterkloof'],
      city: { id: 2, canonicalLocationId: 'city:2', name: 'Pretoria', slug: 'pretoria' },
      inventory: { ...publicInventory, pageSize: 4 },
      state: 'sparse',
    },
  ],
  journeyCounts: {
    buy: { state: 'sparse', total: 2, sourceCounts: { manual: 2, development: 0 } },
    rent: { state: 'empty', total: 0, sourceCounts: { manual: 0, development: 0 } },
    developments: { state: 'unavailable', total: null, sourceCounts: null },
  },
  inventoryPreview: publicInventory,
  marketSnapshot: {
    state: 'unavailable',
    title: 'Pricing snapshot is not published yet',
    reason: 'No audited public price series is available for this preview.',
    provenance: {
      source: 'Property Listify public search inventory',
      sampleSize: 0,
      asOf: '2026-08-05T00:00:00.000Z',
      note: 'Inventory totals are asking-listing counts, not concluded transactions or valuations.',
    },
  },
  activeCountJourneys: ['buy', 'rent', 'developments'],
  generatedAt: '2026-08-05T00:00:00.000Z',
};

const westernCapeInventory = {
  state: 'sparse',
  total: 1,
  items: [
    {
      id: 'property-201',
      href: '/property/201',
      title: 'Light-filled Cape Town apartment',
      location: 'Cape Town',
      price: 2250000,
      image: null,
      bedrooms: 2,
      bathrooms: 1,
      area: 92,
      propertyType: 'apartment',
      listingType: 'sale',
      listingSource: 'manual',
    },
  ],
  sourceCounts: { manual: 1, development: 0 },
  pageSize: 6,
  authority: 'public-search',
};

const westernCapeFixture = {
  province: {
    // These are explicit canonical-form fixture identities. Production IDs
    // come from the canonical geography authority rather than display labels.
    id: 2,
    canonicalLocationId: 'province:2',
    name: 'Western Cape',
    slug: 'western-cape',
    code: 'WC',
    latitude: null,
    longitude: null,
    description: null,
  },
  // The canonical reference currently exposes Cape Town as the only Western
  // Cape city. Do not manufacture a second sibling merely to exercise OR.
  cities: [
    {
      id: 4,
      canonicalLocationId: 'city:4',
      name: 'Cape Town',
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      latitude: null,
      longitude: null,
    },
  ],
  markets: [
    {
      slug: 'cape-town',
      name: 'Cape Town',
      eyebrow: 'Urban, coastal and peninsula markets',
      description: 'A city-wide starting point for apartments, family homes and coastal living.',
      areaSlugs: [],
      city: { id: 4, canonicalLocationId: 'city:4', name: 'Cape Town', slug: 'cape-town' },
      inventory: westernCapeInventory,
      state: 'sparse',
    },
    {
      slug: 'stellenbosch',
      name: 'Stellenbosch',
      eyebrow: 'Winelands market',
      description: 'A configured market awaiting a canonical location identity.',
      areaSlugs: [],
      city: null,
      inventory: null,
      state: 'unavailable',
    },
  ],
  journeyCounts: {
    buy: { state: 'sparse', total: 1, sourceCounts: { manual: 1, development: 0 } },
    rent: { state: 'sparse', total: 1, sourceCounts: { manual: 1, development: 0 } },
    developments: { state: 'unavailable', total: null, sourceCounts: null },
  },
  inventoryPreview: westernCapeInventory,
  marketSnapshot: {
    state: 'unavailable',
    title: 'Pricing snapshot is not published yet',
    reason: 'No audited public price series is available for this preview.',
    provenance: {
      source: 'Property Listify public search inventory',
      sampleSize: 0,
      asOf: '2026-08-05T00:00:00.000Z',
      note: 'Inventory totals are asking-listing counts, not concluded transactions or valuations.',
    },
  },
  activeCountJourneys: ['buy', 'rent', 'developments'],
  generatedAt: '2026-08-05T00:00:00.000Z',
};

const locationSuggestions = [
  { id: 2, name: 'Pretoria', type: 'city', provinceName: 'Gauteng' },
  { id: 3, name: 'Johannesburg', type: 'city', provinceName: 'Gauteng' },
  { id: 4, name: 'Sandton', type: 'suburb', provinceName: 'Gauteng', cityName: 'Johannesburg' },
  { id: 5, name: 'Rosebank', type: 'suburb', provinceName: 'Gauteng', cityName: 'Johannesburg' },
];

const westernCapeLocationSuggestions = [
  {
    id: 4,
    name: 'Cape Town',
    type: 'city',
    provinceId: 2,
    provinceName: 'Western Cape',
  },
];

const provincialCampaign = {
  imageUrl: '/placeholders/development_placeholder_1_1763712033438.png',
  landingPageUrl: 'https://example.com/campaigns/western-cape-harbour-point',
  altText: 'Harbour Point residences',
  title: 'A considered new address by the water',
  subtitle: 'A featured development opportunity, presented separately from organic discovery.',
  ctaText: 'Explore the opportunity',
  campaignType: 'new_development',
};

const provincesWithoutCanonicalReference = {
  'eastern-cape': 'Eastern Cape',
  'free-state': 'Free State',
  limpopo: 'Limpopo',
  mpumalanga: 'Mpumalanga',
  'north-west': 'North West',
  'northern-cape': 'Northern Cape',
} as const;

function trpcResult(data: unknown) {
  return { result: { data: { json: data } } };
}

async function installProvincialFixture(
  page: Page,
  fixture = provincialFixture,
  suggestions = locationSuggestions,
  campaign: typeof provincialCampaign | null = null,
) {
  await page.route('**/api/trpc/**', async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    const procedures = pathname.split('/api/trpc/')[1]?.split(',') || [];

    if (
      !procedures.some(
        procedure =>
          procedure.startsWith('locationPages.') || procedure === 'location.searchLocations',
      )
    ) {
      await route.continue();
      return;
    }

    const results = procedures.map(procedure => {
      if (procedure === 'locationPages.getProvincialDiscoveryData') {
        return trpcResult(fixture);
      }
      if (procedure === 'locationPages.getHeroCampaign') {
        return trpcResult(campaign);
      }
      if (procedure === 'location.searchLocations') {
        return trpcResult(suggestions);
      }
      return trpcResult(null);
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results.length === 1 ? results[0] : results),
    });
  });
}

async function installUnavailableCanonicalProvinceFixture(page: Page) {
  await page.route('**/api/trpc/**', async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    const procedures = pathname.split('/api/trpc/')[1]?.split(',') || [];

    if (!procedures.some(procedure => procedure.startsWith('locationPages.'))) {
      await route.continue();
      return;
    }

    const results = procedures.map(() => trpcResult(null));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results.length === 1 ? results[0] : results),
    });
  });
}

async function capture(page: Page, filename: string, fullPage = true) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, filename), fullPage });
}

test.describe('Gauteng provincial discovery', () => {
  test.beforeEach(async ({ page }) => {
    await installProvincialFixture(page);
  });

  test('keeps the canonical route neutral and exposes only honest journey states', async ({
    page,
  }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Explore Gauteng' })).toBeVisible();
    await expect(page.getByTestId('active-journey-state')).toHaveCount(0);
    await expect(page.getByTestId('provincial-primary-cta')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Choose journey' })).toBeDisabled();
    await expect(page.getByRole('tab', { name: /^Buy/ })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: /Land & plots/ })).toBeDisabled();
    await expect(page.getByRole('tab', { name: /Commercial/ })).toBeDisabled();
    await expect(page.getByRole('tab', { name: /Shared Living/ })).toBeDisabled();
    await expect(page.getByTestId('provincial-billboard')).toHaveCount(0);

    await capture(page, 'neutral-gauteng-1440.png');
    await capture(page, 'neutral-gauteng-1440-first-screen.png', false);
  });

  test('preserves canonical location and supported filters into Buy results', async ({ page }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Buy/ }).click();

    const locationInput = page.locator('.provincial-composer input[role="combobox"]');
    await locationInput.fill('Pretoria');
    await expect(page.getByRole('option', { name: /Pretoria/ })).toBeVisible();
    await page.getByRole('option', { name: /Pretoria/ }).click();

    await page.getByLabel('Property type').selectOption('house');
    await page.getByLabel('Budget').selectOption('2000000');
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);
    await capture(page, 'buy-selected-pretoria-1440.png');

    await page.getByTestId('provincial-primary-cta').click();
    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-for-sale');
    expect(resultUrl.searchParams.get('locationId')).toBe('city:2');
    expect(resultUrl.searchParams.get('city')).toBe('pretoria');
    expect(resultUrl.searchParams.get('propertyType')).toBe('house');
    expect(resultUrl.searchParams.get('maxPrice')).toBe('2000000');
  });

  test('reflects known intent and survives refresh, back and forward navigation', async ({
    page,
  }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Buy/ }).click();
    await expect(page).toHaveURL(/journey=buy/);

    await page.goBack();
    await page.waitForURL(/\/gauteng$/);
    await expect(page.getByTestId('active-journey-state')).toHaveCount(0);
    await page.goForward();
    await page.waitForURL(/journey=buy/);
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);

    await page.goto(
      '/gauteng?journey=buy&province=gauteng&city=pretoria&locationId=city%3A2&propertyType=house&maxPrice=2000000',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);
    await expect(page.getByRole('button', { name: 'Remove Pretoria' })).toBeVisible();
    await expect(page.getByLabel('Property type')).toHaveValue('house');
    await expect(page.getByLabel('Budget')).toHaveValue('2000000');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);
    await expect(page.getByRole('button', { name: 'Remove Pretoria' })).toBeVisible();
  });

  test('preserves explicit Rent and does not expose removed Rent controls', async ({ page }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Rent/ }).click();

    await expect(page.getByLabel('Property type')).toBeEnabled();
    await expect(page.getByLabel('Budget')).toBeEnabled();
    await expect(page.getByText('Lease term')).toHaveCount(0);
    await expect(page.getByText('Furnished')).toHaveCount(0);

    const locationInput = page.locator('.provincial-composer input[role="combobox"]');
    await locationInput.fill('Sandton');
    await expect(page.getByRole('option', { name: /Sandton/ })).toBeVisible();
    await page.getByRole('option', { name: /Sandton/ }).click();
    await page.getByLabel('Property type').selectOption('apartment');
    await page.getByLabel('Budget').selectOption('20000');
    await capture(page, 'rent-selected-sandton-1440.png');
    await page.getByTestId('provincial-primary-cta').click();

    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-to-rent');
    expect(resultUrl.searchParams.get('locationId')).toBe('suburb:4');
    expect(resultUrl.searchParams.get('propertyType')).toBe('apartment');
    expect(resultUrl.searchParams.get('maxPrice')).toBe('20000');
    expect(resultUrl.searchParams.get('listingType')).toBeNull();
  });

  test('preserves deliberate sibling multi-location OR for Rent', async ({ page }) => {
    await page.goto('/gauteng?journey=rent', { waitUntil: 'domcontentloaded' });

    const locationInput = page.locator('.provincial-composer input[role="combobox"]');
    await locationInput.fill('Sandton');
    await page.getByRole('option', { name: /Sandton/ }).click();
    await locationInput.fill('Rosebank');
    await page.getByRole('option', { name: /Rosebank/ }).click();

    await expect(page.getByRole('button', { name: 'Remove Sandton' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Rosebank' })).toBeVisible();
    await expect(page.getByTestId('provincial-location-helper')).toHaveText(
      /Explicit OR: these locations stay separate/,
    );

    await capture(page, 'rent-multi-location-or-1440.png');
    await page.getByTestId('provincial-primary-cta').click();
    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-to-rent');
    expect(resultUrl.searchParams.getAll('locationIds')).toEqual(['suburb:4', 'suburb:5']);
    expect(resultUrl.searchParams.get('city')).toBeNull();
    expect(resultUrl.searchParams.get('suburb')).toBeNull();
  });

  test('keeps sparse and unavailable data useful instead of rendering fake metrics', async ({
    page,
  }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Small live sample').first()).toBeVisible();
    await expect(page.getByTestId('market-statistics-unavailable')).toBeVisible();
    await expect(page.getByText('Not published yet')).toBeVisible();
    await expect(page.getByText('R0')).toHaveCount(0);

    await page.getByTestId('market-statistics-unavailable').scrollIntoViewIfNeeded();
    await capture(page, 'sparse-unavailable-market-data-1440.png', false);
  });

  test('supports keyboard journey and location selection with an accessible composer', async ({
    page,
  }) => {
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

    const buyTab = page.getByRole('tab', { name: /^Buy/ });
    await buyTab.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);

    const locationInput = page.locator('.provincial-composer input[role="combobox"]');
    await locationInput.fill('Pretoria');
    await expect(page.getByRole('option', { name: /Pretoria/ })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Remove Pretoria' })).toBeVisible();
    await expect(page.getByTestId('provincial-primary-cta')).toBeEnabled();

    const axeResults = await new AxeBuilder({ page }).include('.provincial-composer').analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('keeps the composer usable at mobile width without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Explore Gauteng' })).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Search by city, suburb, or area' }),
    ).toBeVisible();
    await expect(page.getByTestId('provincial-primary-cta')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

    await capture(page, 'neutral-gauteng-390.png');
    await capture(page, 'neutral-gauteng-390-first-screen.png', false);
  });

  test('keeps tablet composition within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Explore Gauteng' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(overflow).toBeLessThanOrEqual(1025);
    await capture(page, 'neutral-gauteng-1024.png');
    await capture(page, 'neutral-gauteng-1024-first-screen.png', false);
  });
});

test.describe('Provincial discovery Phase 2 commercial presentation', () => {
  test.beforeEach(async ({ page }) => {
    await installProvincialFixture(
      page,
      provincialFixture,
      locationSuggestions,
      provincialCampaign,
    );
  });

  test('keeps sponsored presentation separate from organic discovery and search intent', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1440, height: 900, suffix: '1440' },
      { width: 1024, height: 768, suffix: '1024' },
      { width: 390, height: 844, suffix: '390' },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/gauteng', { waitUntil: 'domcontentloaded' });

      await expect(page.getByTestId('active-journey-state')).toHaveCount(0);
      const billboard = page.getByTestId('provincial-billboard');
      await expect(billboard).toBeVisible();
      await expect(billboard).toHaveAttribute('data-commercial-surface', 'sponsored');
      await expect(billboard).toContainText('Sponsored');
      await expect(page.getByTestId('provincial-billboard-cta')).toHaveAttribute(
        'target',
        '_blank',
      );
      await expect(page.getByTestId('provincial-billboard-cta')).toHaveAttribute(
        'href',
        provincialCampaign.landingPageUrl,
      );

      const sectionOrder = await page.evaluate(() => {
        const marketSection = document.getElementById('markets-heading')?.closest('section');
        const billboardSection = document.querySelector('[data-testid="provincial-billboard"]');
        const needsSection = document.getElementById('needs-heading')?.closest('section');
        return [marketSection, billboardSection, needsSection].map(node =>
          node ? Array.from(document.querySelectorAll('main section')).indexOf(node) : -1,
        );
      });
      expect(sectionOrder[0]).toBeGreaterThanOrEqual(0);
      expect(sectionOrder[0]).toBeLessThan(sectionOrder[1]);
      expect(sectionOrder[1]).toBeLessThan(sectionOrder[2]);

      await billboard.scrollIntoViewIfNeeded();
      await capture(page, `gauteng-billboard-${viewport.suffix}.png`, false);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/gauteng?journey=rent', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Rent selected/);
    await expect(page.getByTestId('provincial-billboard-cta')).toHaveAttribute(
      'href',
      provincialCampaign.landingPageUrl,
    );
    expect(new URL(page.url()).searchParams.get('journey')).toBe('rent');
  });
});

test.describe('Western Cape provincial discovery acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await installProvincialFixture(page, westernCapeFixture, westernCapeLocationSuggestions);
  });

  test('keeps neutral Western Cape discovery neutral and province-specific', async ({ page }) => {
    await page.goto('/western-cape', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Explore Western Cape' })).toBeVisible();
    await expect(page.getByTestId('active-journey-state')).toHaveCount(0);
    await expect(page.getByTestId('provincial-primary-cta')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Choose journey' })).toBeDisabled();
    await expect(page.getByRole('tab', { name: /^Buy/ })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: /^Rent/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(page.getByText('See what is available in Western Cape.')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Gauteng');

    const axeResults = await new AxeBuilder({ page }).include('.provincial-composer').analyze();
    expect(axeResults.violations).toEqual([]);

    await capture(page, 'western-cape-neutral-1440.png');
    await capture(page, 'western-cape-neutral-1440-first-screen.png', false);
  });

  test('keeps Western Cape composition coherent at tablet and mobile widths', async ({ page }) => {
    for (const viewport of [
      { width: 1024, height: 768, suffix: '1024' },
      { width: 390, height: 844, suffix: '390' },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/western-cape', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { name: 'Explore Western Cape' })).toBeVisible();
      await expect(
        page.locator('.provincial-composer').getByRole('combobox', {
          name: 'Search by city, suburb, or area',
        }),
      ).toBeVisible();
      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
      expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

      await capture(page, `western-cape-neutral-${viewport.suffix}.png`);
      await capture(page, `western-cape-neutral-${viewport.suffix}-first-screen.png`, false);
    }
  });

  test('hands explicit Western Cape Buy into province-scoped results', async ({ page }) => {
    await page.goto('/western-cape', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Buy/ }).click();

    await expect(page.getByTestId('active-journey-state')).toHaveText(/Buy selected/);
    await expect(page.getByTestId('provincial-location-helper')).toHaveText(
      /keep the whole province selected/,
    );
    await capture(page, 'western-cape-buy-1440.png');

    await page.getByTestId('provincial-primary-cta').click();
    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-for-sale');
    expect(resultUrl.searchParams.get('locationId')).toBe('province:2');
    expect(resultUrl.searchParams.get('province')).toBe('western-cape');
    expect(resultUrl.searchParams.get('city')).toBeNull();
    expect(resultUrl.searchParams.get('suburb')).toBeNull();
  });

  test('hands explicit Western Cape Rent into province-scoped results without removed controls', async ({
    page,
  }) => {
    await page.goto('/western-cape', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Rent/ }).click();

    await expect(page.getByTestId('active-journey-state')).toHaveText(/Rent selected/);
    await expect(page.getByLabel('Property type')).toBeEnabled();
    await expect(page.getByLabel('Budget')).toBeEnabled();
    await expect(page.getByText('Lease term')).toHaveCount(0);
    await expect(page.getByText('Furnished')).toHaveCount(0);
    await capture(page, 'western-cape-rent-1440.png');

    await page.getByTestId('provincial-primary-cta').click();
    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-to-rent');
    expect(resultUrl.searchParams.get('locationId')).toBe('province:2');
    expect(resultUrl.searchParams.get('province')).toBe('western-cape');
    expect(resultUrl.searchParams.get('listingType')).toBeNull();
  });

  test('preserves canonical Cape Town through Rent and URL reconstruction', async ({ page }) => {
    await page.goto('/western-cape', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /^Rent/ }).click();

    const locationInput = page.locator('.provincial-composer input[role="combobox"]');
    await locationInput.fill('Cape Town');
    await expect(page.getByRole('option', { name: /Cape Town/ })).toBeVisible();
    await page.getByRole('option', { name: /Cape Town/ }).click();
    await page.getByLabel('Property type').selectOption('apartment');
    await page.getByLabel('Budget').selectOption('20000');

    await expect(page.getByRole('button', { name: 'Remove Cape Town' })).toBeVisible();
    await expect(page.getByTestId('provincial-location-helper')).toHaveText(
      /Canonical location preserved/,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'western-cape-rent-cape-town-1440.png');

    await page.getByTestId('provincial-primary-cta').click();
    const resultUrl = new URL(page.url());
    expect(resultUrl.pathname).toBe('/property-to-rent');
    expect(resultUrl.searchParams.get('locationId')).toBe('city:4');
    expect(resultUrl.searchParams.get('city')).toBe('cape-town');
    expect(resultUrl.searchParams.get('province')).toBe('western-cape');
    expect(resultUrl.searchParams.get('propertyType')).toBe('apartment');
    expect(resultUrl.searchParams.get('maxPrice')).toBe('20000');
    expect(resultUrl.searchParams.get('listingType')).toBeNull();

    await page.goto(
      '/western-cape?journey=rent&province=western-cape&city=cape-town&locationId=city%3A4&propertyType=apartment&maxPrice=20000',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Rent selected/);
    await expect(page.getByRole('button', { name: 'Remove Cape Town' })).toBeVisible();
    await expect(page.getByLabel('Property type')).toHaveValue('apartment');
    await expect(page.getByLabel('Budget')).toHaveValue('20000');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('active-journey-state')).toHaveText(/Rent selected/);
    await expect(page.getByRole('button', { name: 'Remove Cape Town' })).toBeVisible();
    await expect(page.getByLabel('Property type')).toHaveValue('apartment');
    await expect(page.getByLabel('Budget')).toHaveValue('20000');
  });
});

test.describe('Provinces without canonical reference coverage', () => {
  test.beforeEach(async ({ page }) => {
    await installUnavailableCanonicalProvinceFixture(page);
  });

  for (const [slug, name] of Object.entries(provincesWithoutCanonicalReference)) {
    test(`${name} stays unavailable instead of fabricating a transaction`, async ({ page }) => {
      for (const query of ['', '?journey=buy', '?journey=rent']) {
        await page.goto(`/${slug}${query}`, { waitUntil: 'domcontentloaded' });

        await expect(
          page.getByRole('heading', { name: `${name} is temporarily unavailable` }),
        ).toBeVisible();
        await expect(page.getByTestId('provincial-primary-cta')).toHaveCount(0);
        await expect(page.getByRole('tab', { name: /^Buy/ })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: /^Rent/ })).toHaveCount(0);
        await expect(page.getByTestId('active-journey-state')).toHaveCount(0);
        await expect(
          page.getByRole('link', { name: /Return to location discovery/ }),
        ).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(`/${slug}`);
      }
    });
  }
});

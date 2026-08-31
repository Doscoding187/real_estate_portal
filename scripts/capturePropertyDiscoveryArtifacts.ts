import path from 'node:path';
import { chromium, type Page, type Route } from 'playwright';
import type { ListingCardHighlight } from '../shared/listing-highlight-registry';

type SearchCardFixture = {
  highlights?: ListingCardHighlight[];
};

type SearchResponseEnvelope = Array<{
  result?: {
    data?: {
      json?: {
        cards?: SearchCardFixture[];
      };
    };
  };
}>;

const baseUrl = (process.env.PROPERTY_DISCOVERY_BASE_URL || 'http://localhost:3009').replace(
  /\/$/,
  '',
);
const searchPath = '/property-for-sale?city=johannesburg&province=gauteng';
const artifactDirectory = path.resolve(process.cwd(), 'artifacts/property-discovery');

const highlightFixtures: ListingCardHighlight[][] = [
  [
    { key: 'study_office', label: 'Study / office', iconKey: 'study', source: 'space' },
    { key: 'pool', label: 'Pool', iconKey: 'pool', source: 'space' },
    { key: 'solar_backup', label: 'Solar backup', iconKey: 'power', source: 'utility' },
  ],
  [
    { key: 'balcony_patio', label: 'Balcony / patio', iconKey: 'balcony', source: 'space' },
    { key: 'natural_light', label: 'Natural light', iconKey: 'light', source: 'highlight' },
    { key: 'fibre_ready', label: 'Fibre ready', iconKey: 'fibre', source: 'utility' },
  ],
  [
    { key: 'garden', label: 'Garden', iconKey: 'garden', source: 'space' },
    { key: 'pet_friendly', label: 'Pet friendly', iconKey: 'pet', source: 'amenity' },
  ],
];

function isPublicSearchRequest(route: Route): boolean {
  return route.request().url().includes('properties.searchPublicInventory');
}

async function injectHighlightFixture(route: Route) {
  if (!isPublicSearchRequest(route)) {
    await route.continue();
    return;
  }

  const response = await route.fetch();
  const payload = (await response.json()) as SearchResponseEnvelope;
  const cards = payload[0]?.result?.data?.json?.cards;
  if (!Array.isArray(cards) || cards.length < highlightFixtures.length) {
    throw new Error('The local public-search scenario did not return enough cards to capture.');
  }

  highlightFixtures.forEach((highlights, index) => {
    cards[index]!.highlights = highlights;
  });

  await route.fulfill({
    response,
    body: JSON.stringify(payload),
    contentType: 'application/json',
  });
}

async function capture(page: Page, filename: string) {
  await page.goto(`${baseUrl}${searchPath}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('4 verified listings').waitFor({ timeout: 30_000 });
  await page.getByText('Study / office').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(artifactDirectory, filename),
    fullPage: true,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newPage({
      viewport: { width: 1491, height: 1055 },
      deviceScaleFactor: 1,
    });
    await desktop.route('**/api/trpc/**', injectHighlightFixture);
    await capture(desktop, 'search-results-card-implementation-desktop-v2-corrected.png');

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await mobile.route('**/api/trpc/**', injectHighlightFixture);
    await capture(mobile, 'search-results-card-implementation-mobile-v2-corrected.png');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

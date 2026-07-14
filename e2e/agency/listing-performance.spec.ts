import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

const AGENCY_EMAIL = 'agency@listify.local';
const E2E_DATABASE = 'listify_listing_performance_e2e';
const VISUAL_DIR = '/tmp/property-listify-listing-performance-visual';
const fixture = { listingId: 0, propertyId: 0, suffix: '' };

function password() {
  const value = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!value) throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for listing-performance browser acceptance.');
  return value;
}

async function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for listing-performance browser acceptance.');
  const parsed = new URL(url);
  expect(parsed.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(parsed.pathname.replace(/^\//, '')).toBe(E2E_DATABASE);
  return mysql.createConnection(url);
}

async function createFixture() {
  const connection = await db();
  try {
    const [[manager]] = await connection.query<mysql.RowDataPacket[]>('SELECT id, agencyId FROM users WHERE email = ? LIMIT 1', [AGENCY_EMAIL]);
    const [[agent]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM agents WHERE agencyId = ? AND status = ? ORDER BY id LIMIT 1', [manager.agencyId, 'approved']);
    fixture.suffix = randomUUID().slice(0, 8);
    const title = `[E2E Performance] ${fixture.suffix}`;
    const [listing] = await connection.execute(
      `INSERT INTO listings (ownerId, agencyId, agentId, action, propertyType, title, description, askingPrice, address, latitude, longitude, city, province, status, approvalStatus, publishedAt, slug, readiness_score, quality_score)
       VALUES (?, ?, ?, 'sell', 'house', ?, 'Disposable listing-performance browser fixture.', 2000000, '71 Snapshot Avenue', -26.1076, 28.0567, 'Johannesburg', 'Gauteng', 'published', 'approved', DATE_SUB(NOW(), INTERVAL 21 DAY), ?, 100, 100)`,
      [manager.id, manager.agencyId, agent.id, title, `e2e-performance-${fixture.suffix}`],
    );
    fixture.listingId = Number((listing as mysql.ResultSetHeader).insertId);
    const [property] = await connection.execute(
      `INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, latitude, longitude, status, featured, views, enquiries, agentId, ownerId, sourceListingId)
       VALUES (?, 'Disposable public projection.', 'house', 'sale', 'sale', 2000000, 3, 2, 180, '71 Snapshot Avenue', 'Johannesburg', 'Gauteng', -26.1076, 28.0567, 'available', 0, 37, 0, ?, ?, ?)`,
      [title, agent.id, manager.id, fixture.listingId],
    );
    fixture.propertyId = Number((property as mysql.ResultSetHeader).insertId);
    await connection.execute('INSERT INTO listing_analytics (listingId, totalViews, uniqueVisitors, totalLeads) VALUES (?, 37, 25, 0)', [fixture.listingId]);
  } finally { await connection.end(); }
}

async function cleanupFixture() {
  if (!fixture.listingId) return;
  const connection = await db();
  try {
    await connection.execute('DELETE a FROM agency_listing_performance_activity a INNER JOIN agency_listing_performance_reviews r ON r.id = a.review_id WHERE r.listing_id = ?', [fixture.listingId]);
    await connection.execute('DELETE FROM agency_listing_performance_reviews WHERE listing_id = ?', [fixture.listingId]);
    await connection.execute('DELETE FROM listing_analytics WHERE listingId = ?', [fixture.listingId]);
    await connection.execute('DELETE FROM properties WHERE sourceListingId = ?', [fixture.listingId]);
    await connection.execute('DELETE FROM listings WHERE revision_of_listing_id = ?', [fixture.listingId]);
    await connection.execute('DELETE FROM listings WHERE id = ?', [fixture.listingId]);
  } finally { await connection.end(); }
}

async function signIn(page: Page) {
  await page.goto('/login?mode=signin&next=/agency/performance');
  await page.getByLabel('Email address').fill(AGENCY_EMAIL);
  const input = page.locator('input[name="password"]');
  await input.fill(password());
  await page.getByRole('button', { name: /^Sign in$/ }).last().click();
  await expect(page).toHaveURL(/\/agency\/performance$/);
  await input.fill('').catch(() => undefined);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(VISUAL_DIR, { recursive: true });
  await page.screenshot({ path: path.join(VISUAL_DIR, `${name}.png`), fullPage: false });
}

test.describe.serial('listing performance browser acceptance', () => {
  test.beforeAll(createFixture);
  test.afterAll(cleanupFixture);

  test('records a seller review, protects the public price, and opens one canonical revision', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Listing Performance' })).toBeVisible();
    await expect(page.getByText('[E2E Performance] ' + fixture.suffix)).toBeVisible();
    await expect(page.getByText('Listing has 37 views but no enquiries.')).toBeVisible();
    await expect(page.getByText('Require review')).toBeVisible();
    await page.getByText('[E2E Performance] ' + fixture.suffix).click();
    await expect(page.getByText('Why this needs attention')).toBeVisible();

    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('button', { name: 'Start seller review' })).toBeVisible();
      await expectNoOverflow(page);
      if (viewport.width === 768) await capture(page, 'tablet-overview');
      if (viewport.width === 375) await capture(page, 'mobile-overview');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, 'desktop-overview');
    await page.getByRole('button', { name: 'Start seller review' }).click();
    await expect(page.getByTestId('seller-review-step-1')).toBeVisible();
    await capture(page, 'desktop-step-1');
    await expect(page.getByLabel('Seller review progress').getByText('Step 1 of 5')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Record a contact date, or mark the seller as unable to contact.')).toBeVisible();
    await page.getByRole('checkbox', { name: /Unable to contact/ }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('seller-review-step-2')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('seller-review-step-1')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Unable to contact/ })).toBeChecked();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('seller-review-step-3')).toBeVisible();
    await expect(page.getByLabel('Proposed asking price')).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('seller-review-step-4')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('seller-review-step-5')).toBeVisible();
    await page.getByLabel('Next review date').fill('2030-01-02T09:00');
    await expect(page.getByLabel('Review summary')).toContainText('Unable to contact');
    await capture(page, 'desktop-followup-summary');
    await page.getByTestId('complete-seller-review').click();
    await expect(page.getByText('Seller decision: Unable To Contact')).toBeVisible();

    await page.getByRole('button', { name: 'Start seller review' }).click();
    await page.getByTestId('seller-review-step-1').getByLabel('Contact date').fill('2030-01-01T09:00');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByTestId('seller-review-step-2').getByLabel('Buyer-feedback themes').fill('Price sensitivity; competing stock.');
    await page.getByTestId('seller-review-step-2').getByLabel('Your assessment').fill('Interest is present but the price is preventing offers.');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('seller-review-step-3')).toBeVisible();
    await page.getByLabel('Recommendation').selectOption('change_price');
    await expect(page.getByLabel('Proposed asking price')).toBeVisible();
    await page.setViewportSize({ width: 768, height: 1024 });
    await capture(page, 'tablet-price-step');
    await page.setViewportSize({ width: 375, height: 812 });
    await capture(page, 'mobile-price-step');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Enter the proposed asking price.')).toBeVisible();
    await page.getByLabel('Proposed asking price').fill('1850000');
    await page.getByLabel('Why a pricing discussion is recommended').fill('Comparable activity supports a measured reduction.');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Seller decision').selectOption('accepted');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByLabel('Review summary')).toContainText('Change Price');
    await expect(page.getByLabel('Review summary')).toContainText('Accepted');
    await expect(page.getByText(/public-price protection/i)).toBeVisible();
    const completeReview = page.getByTestId('complete-seller-review');
    await completeReview.evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByText('Seller accepted a price recommendation')).toBeVisible();
    await expect(page.getByText('−R 150 000', { exact: false })).toBeVisible();
    await expect(page.getByText(/do not change the live asking price/i)).toBeVisible();
    await page.getByRole('button', { name: 'Create listing revision' }).click();
    await expect(page).toHaveURL(/\/listings\/create\?edit=true&id=\d+/);

    const connection = await db();
    try {
      const [[live]] = await connection.query<mysql.RowDataPacket[]>('SELECT askingPrice FROM listings WHERE id = ?', [fixture.listingId]);
      const [[publicProperty]] = await connection.query<mysql.RowDataPacket[]>('SELECT price FROM properties WHERE id = ?', [fixture.propertyId]);
      const [[revision]] = await connection.query<mysql.RowDataPacket[]>('SELECT id, askingPrice, status FROM listings WHERE revision_of_listing_id = ?', [fixture.listingId]);
      expect(Number(live.askingPrice)).toBe(2_000_000);
      expect(Number(publicProperty.price)).toBe(2_000_000);
      expect(revision).toMatchObject({ askingPrice: '1850000.00', status: 'draft' });
    } finally { await connection.end(); }
  });
});

import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3009';
const AGENCY_EMAIL = 'agency@listify.local';

type AcceptanceFixture = {
  agencyId: number;
  agencyUserId: number;
  agentId: number;
  listingId: number;
  listingTitle: string;
  propertyId: number;
  leadId: number;
  leadName: string;
  showingId: number;
};

type PersistedDealState = {
  dealId: number;
  transactionId: number | null;
  expectedCommission: number | null;
  offerCount: number;
  milestoneCount: number;
  conditionCount: number;
  documentCount: number;
  activityCount: number;
};

const fixtureIds = {
  listingIds: [] as number[],
  propertyIds: [] as number[],
  leadIds: [] as number[],
  showingIds: [] as number[],
};

function assertLocalUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  expect(['localhost', '127.0.0.1']).toContain(parsed.hostname);
}

function localDemoPassword() {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) {
    throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for agency acceptance browser proof.');
  }
  return password;
}

function inputDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function inputDateTime(daysFromNow: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function dbTimestamp(daysFromNow: number, hour = 10) {
  return inputDateTime(daysFromNow, hour).replace('T', ' ') + ':00';
}

async function openLocalDatabaseConnection(): Promise<mysql.Connection> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency offers browser acceptance.');
  }

  const parsed = new URL(databaseUrl);
  expect(parsed.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(parsed.pathname.replace(/^\//, '')).toBe('listify_local');

  return mysql.createConnection(databaseUrl);
}

async function queryOne<T extends Record<string, unknown>>(
  connection: mysql.Connection,
  sql: string,
  params: unknown[],
): Promise<T> {
  const [rows] = await connection.execute(sql, params);
  const first = (rows as T[])[0];
  if (!first) {
    throw new Error(`Missing acceptance fixture row for query: ${sql.replace(/\s+/g, ' ').trim()}`);
  }
  return first;
}

async function createAcceptanceFixture(): Promise<AcceptanceFixture> {
  const connection = await openLocalDatabaseConnection();
  try {
    const agencyUser = await queryOne<{ id: number; agencyId: number }>(
      connection,
      'SELECT id, agencyId FROM users WHERE email = ? LIMIT 1',
      [AGENCY_EMAIL],
    );
    const agencyId = Number(agencyUser.agencyId);
    const agent = await queryOne<{ id: number }>(
      connection,
      'SELECT id FROM agents WHERE agencyId = ? AND status = ? ORDER BY id LIMIT 1',
      [agencyId, 'approved'],
    );
    const agentId = Number(agent.id);
    const suffix = randomUUID().slice(0, 8);
    const listingTitle = `[ACCEPTANCE] Offers Transaction ${suffix}`;
    const leadName = `[ACCEPTANCE] Offer Buyer ${suffix}`;

    await connection.beginTransaction();
    try {
      const [listingInsert] = await connection.execute(
        `INSERT INTO listings
          (ownerId, agencyId, agentId, action, propertyType, title, description, askingPrice,
           address, latitude, longitude, city, province, status, slug, readiness_score, quality_score)
         VALUES (?, ?, ?, 'sell', 'house', ?, ?, 2500000, ?, -26.1076000, 28.0567000,
           'Johannesburg', 'Gauteng', 'published', ?, 95, 95)`,
        [
          Number(agencyUser.id),
          agencyId,
          agentId,
          listingTitle,
          'Browser acceptance listing for offers and transactions.',
          '123 Acceptance Avenue',
          `acceptance-offers-transaction-${suffix}`,
        ],
      );
      const listingId = Number((listingInsert as mysql.ResultSetHeader).insertId);
      fixtureIds.listingIds.push(listingId);

      const [propertyInsert] = await connection.execute(
        `INSERT INTO properties
          (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms,
           area, address, city, province, latitude, longitude, status, featured, views, enquiries,
           agentId, ownerId, sourceListingId)
         VALUES (?, ?, 'house', 'sale', 'sale', 2500000, 3, 2, 180, ?, 'Johannesburg',
           'Gauteng', -26.1076, 28.0567, 'available', 0, 0, 0, ?, ?, ?)`,
        [
          listingTitle,
          'Browser acceptance property for offers and transactions.',
          '123 Acceptance Avenue',
          agentId,
          Number(agencyUser.id),
          listingId,
        ],
      );
      const propertyId = Number((propertyInsert as mysql.ResultSetHeader).insertId);
      fixtureIds.propertyIds.push(propertyId);

      const [leadInsert] = await connection.execute(
        `INSERT INTO leads
          (propertyId, agencyId, agentId, name, email, phone, message, leadType, status, source, funnel_stage)
         VALUES (?, ?, ?, ?, ?, '+27110000000', 'Completed viewing acceptance lead.',
           'viewing_request', 'qualified', 'browser-acceptance', 'viewing')`,
        [propertyId, agencyId, agentId, leadName, `acceptance-offer-${suffix}@listify.local`],
      );
      const leadId = Number((leadInsert as mysql.ResultSetHeader).insertId);
      fixtureIds.leadIds.push(leadId);

      const [showingInsert] = await connection.execute(
        `INSERT INTO showings
          (listingId, propertyId, leadId, agentId, scheduledAt, status, createdByUserId,
           visitorName, durationMinutes, notes)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, 45, 'Browser acceptance completed viewing.')`,
        [
          listingId,
          propertyId,
          leadId,
          agentId,
          dbTimestamp(-1, 11),
          Number(agencyUser.id),
          leadName,
        ],
      );
      const showingId = Number((showingInsert as mysql.ResultSetHeader).insertId);
      fixtureIds.showingIds.push(showingId);

      await connection.commit();

      return {
        agencyId,
        agencyUserId: Number(agencyUser.id),
        agentId,
        listingId,
        listingTitle,
        propertyId,
        leadId,
        leadName,
        showingId,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

async function loadPersistedDealState(leadId: number): Promise<PersistedDealState | null> {
  const connection = await openLocalDatabaseConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT
         d.id AS dealId,
         t.id AS transactionId,
         t.expected_commission AS expectedCommission,
         (SELECT COUNT(*) FROM agency_deal_offer_versions ov WHERE ov.deal_id = d.id) AS offerCount,
         (SELECT COUNT(*) FROM agency_transaction_milestones m WHERE m.transaction_id = t.id) AS milestoneCount,
         (SELECT COUNT(*) FROM agency_transaction_conditions c WHERE c.transaction_id = t.id) AS conditionCount,
         (SELECT COUNT(*) FROM agency_transaction_documents doc WHERE doc.transaction_id = t.id) AS documentCount,
         (SELECT COUNT(*) FROM agency_transaction_activity a WHERE a.transaction_id = t.id) AS activityCount
       FROM agency_deals d
       LEFT JOIN agency_transactions t ON t.deal_id = d.id
       WHERE d.lead_id = ?
       ORDER BY d.id DESC
       LIMIT 1`,
      [leadId],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row) return null;
    return {
      dealId: Number(row.dealId),
      transactionId: row.transactionId == null ? null : Number(row.transactionId),
      expectedCommission: row.expectedCommission == null ? null : Number(row.expectedCommission),
      offerCount: Number(row.offerCount || 0),
      milestoneCount: Number(row.milestoneCount || 0),
      conditionCount: Number(row.conditionCount || 0),
      documentCount: Number(row.documentCount || 0),
      activityCount: Number(row.activityCount || 0),
    };
  } finally {
    await connection.end();
  }
}

async function cleanupAcceptanceFixture() {
  const connection = await openLocalDatabaseConnection();
  try {
    const leadIds = fixtureIds.leadIds.filter(Boolean);
    const listingIds = fixtureIds.listingIds.filter(Boolean);
    const propertyIds = fixtureIds.propertyIds.filter(Boolean);
    const showingIds = fixtureIds.showingIds.filter(Boolean);

    if (leadIds.length) {
      const [dealRows] = await connection.query(
        `SELECT id FROM agency_deals WHERE lead_id IN (${leadIds.map(() => '?').join(',')})`,
        leadIds,
      );
      const dealIds = (dealRows as Array<{ id: number }>).map(row => Number(row.id));
      if (dealIds.length) {
        const [transactionRows] = await connection.query(
          `SELECT id FROM agency_transactions WHERE deal_id IN (${dealIds.map(() => '?').join(',')})`,
          dealIds,
        );
        const transactionIds = (transactionRows as Array<{ id: number }>).map(row =>
          Number(row.id),
        );
        if (transactionIds.length) {
          const placeholders = transactionIds.map(() => '?').join(',');
          await connection.query(
            `DELETE FROM agency_transaction_documents WHERE transaction_id IN (${placeholders})`,
            transactionIds,
          );
          await connection.query(
            `DELETE FROM agency_transaction_conditions WHERE transaction_id IN (${placeholders})`,
            transactionIds,
          );
          await connection.query(
            `DELETE FROM agency_transaction_milestones WHERE transaction_id IN (${placeholders})`,
            transactionIds,
          );
          await connection.query(
            `DELETE FROM agency_transaction_parties WHERE transaction_id IN (${placeholders})`,
            transactionIds,
          );
          await connection.query(
            `DELETE FROM agency_transaction_activity WHERE transaction_id IN (${placeholders})`,
            transactionIds,
          );
          await connection.query(
            `DELETE FROM agency_transactions WHERE id IN (${placeholders})`,
            transactionIds,
          );
        }
        const dealPlaceholders = dealIds.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM agency_deal_offer_versions WHERE deal_id IN (${dealPlaceholders})`,
          dealIds,
        );
        await connection.query(
          `DELETE FROM agency_deals WHERE id IN (${dealPlaceholders})`,
          dealIds,
        );
      }
      await connection.query(
        `DELETE FROM lead_activities WHERE leadId IN (${leadIds.map(() => '?').join(',')})`,
        leadIds,
      );
    }
    if (showingIds.length) {
      await connection.query(
        `DELETE FROM showings WHERE id IN (${showingIds.map(() => '?').join(',')})`,
        showingIds,
      );
    }
    if (leadIds.length) {
      await connection.query(
        `DELETE FROM leads WHERE id IN (${leadIds.map(() => '?').join(',')})`,
        leadIds,
      );
    }
    if (propertyIds.length) {
      await connection.query(
        `DELETE FROM properties WHERE id IN (${propertyIds.map(() => '?').join(',')})`,
        propertyIds,
      );
    }
    if (listingIds.length) {
      await connection.query(
        `DELETE FROM listings WHERE id IN (${listingIds.map(() => '?').join(',')})`,
        listingIds,
      );
    }
  } finally {
    await connection.end();
  }
}

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email address').fill(email);
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill(localDemoPassword());

  const loginResponsePromise = page
    .waitForResponse(
      response =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 15_000 },
    )
    .catch(() => null);

  try {
    await page
      .getByRole('button', { name: /^Sign in$/ })
      .last()
      .click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse, 'login response received').not.toBeNull();
    expect(loginResponse?.ok(), `login failed with status ${loginResponse?.status()}`).toBe(true);
  } finally {
    await passwordInput.fill('').catch(() => undefined);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function authenticatedState(_context: BrowserContext) {
  return true;
}

test.describe.serial('transaction operations v1 browser acceptance', () => {
  let fixture: AcceptanceFixture;

  test.beforeAll(async () => {
    assertLocalUrl(FRONTEND_URL);
    fixture = await createAcceptanceFixture();
  });

  test.afterAll(async () => {
    await cleanupAcceptanceFixture();
  });

  test('manager creates, negotiates, accepts, tracks deadlines, and reloads a transaction', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login?mode=signin&next=/agency/transactions');
    await signIn(page, AGENCY_EMAIL);
    expect(await authenticatedState(context)).toBe(true);

    await expect(page).toHaveURL(/\/agency\/transactions$/);
    await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible();
    await expect(page.getByText('Offers and Transactions')).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: 'Transactions' })).toBeVisible();

    await page.getByRole('button', { name: /New deal/i }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Open Deal' })).toBeVisible();
    await dialog.getByLabel('Completed viewing').selectOption(String(fixture.showingId));
    await dialog.getByLabel('Offer amount').fill('1850000');
    await dialog.getByLabel('Deposit').fill('100000');
    await dialog.getByLabel('Bond amount').fill('1500000');
    await dialog.getByLabel('Offer expiry').fill(inputDateTime(1, 15));
    await dialog.getByLabel('Conditions').fill('Bond approval and signed offer document.');
    await dialog.getByRole('button', { name: 'Open deal' }).click();

    await expect(page.getByText(fixture.listingTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Offer Timeline')).toBeVisible();
    await expect(page.getByText(/^V1:/)).toBeVisible();

    await page.getByRole('button', { name: /Submit offer/i }).click();
    await expect(page.getByText('Submitted').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Record counter/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Record Counter' })).toBeVisible();
    await dialog.getByPlaceholder('Counter amount').fill('1950000');
    await dialog.locator('input[type="datetime-local"]').fill(inputDateTime(2, 15));
    await dialog
      .getByPlaceholder('Counter notes or special conditions')
      .fill('Seller counter recorded in browser acceptance.');
    await dialog.getByRole('button', { name: /Save counter/i }).click();
    await expect(page.getByText(/^V2:/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Record counter/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Record Counter' })).toBeVisible();
    await dialog.locator('select').selectOption('buyer');
    await dialog.getByPlaceholder('Counter amount').fill('1900000');
    await dialog.locator('input[type="datetime-local"]').fill(inputDateTime(3, 15));
    await dialog
      .getByPlaceholder('Counter notes or special conditions')
      .fill('Buyer final response accepted for proof.');
    await dialog.getByRole('button', { name: /Save counter/i }).click();
    await expect(page.getByText(/^V3:/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Accept and open transaction/i }).click();
    await expect(page.getByRole('heading', { name: 'Milestone Timeline' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Conditions' })).toBeVisible();
    await expect(page.getByText('Signed offer document', { exact: true })).toBeVisible();
    await expect(page.getByText('Expected commission').first()).toBeVisible();
    await expect(page.getByText('Seller/listing context')).toBeVisible();
    await expect(page.getByText('Transaction status')).toBeVisible();
    await expect(page.getByText('Accepted price')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Accepted$/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Commission' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Activity Timeline' })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Offer Accepted$/ }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Transaction Opened$/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Private Documents' })).toBeVisible();
    await expect(page.getByText('Private document storage not configured locally')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add document/i })).toHaveCount(0);

    const targetDate = inputDate(4);
    await page.getByRole('button', { name: /Add condition/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add Condition' })).toBeVisible();
    await dialog.getByPlaceholder('Condition title').fill('Browser acceptance deadline');
    await dialog.locator('input[type="datetime-local"]').fill(`${targetDate}T10:00`);
    await dialog
      .getByPlaceholder('Description or notes')
      .fill('Deadline visible in My Day acceptance proof.');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.locator('p').filter({ hasText: /^Browser acceptance deadline$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(() => loadPersistedDealState(fixture.leadId), { timeout: 15_000 })
      .toMatchObject({
        transactionId: expect.any(Number),
        offerCount: 3,
      });
    const dealState = await loadPersistedDealState(fixture.leadId);
    expect(dealState?.dealId).toBeTruthy();
    expect(dealState?.transactionId).toBeTruthy();
    expect(dealState?.expectedCommission).toBe(95_000);
    expect(dealState?.milestoneCount).toBeGreaterThan(0);
    expect(dealState?.conditionCount).toBeGreaterThan(0);
    expect(dealState?.documentCount).toBe(0);
    expect(dealState?.activityCount).toBeGreaterThanOrEqual(3);

    await page.goto('/agency/my-day');
    await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible();
    await page.locator('input[type="date"]').fill(targetDate);
    await expect(page.getByRole('heading', { name: 'Deal Deadlines' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browser acceptance deadline/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('agency-shell')).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: 'My Day' })).toBeVisible();

    await page.goto(`/agency/transactions?deal=${dealState?.dealId}`);
    await expect(page.getByText('Offers and Transactions')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Complete Deposit due' }).click();
    await expect(
      page.locator('p').filter({ hasText: /^Milestone "Deposit due" marked completed\.$/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Complete Browser acceptance deadline' }).click();
    await expect(
      page
        .locator('p')
        .filter({ hasText: /^Condition "Browser acceptance deadline" marked completed\.$/ })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.goto('/agency/my-day');
    await page.locator('input[type="date"]').fill(targetDate);
    await expect(page.getByRole('button', { name: /Browser acceptance deadline/ })).toHaveCount(0);

    await page.goto(`/agency/transactions?deal=${dealState?.dealId}`);
    await page.reload();
    await expect(page.getByText('Offers and Transactions')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^V1:/)).toBeVisible();
    await expect(page.getByText(/^V2:/)).toBeVisible();
    await expect(page.getByText(/^V3:/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Milestone Timeline' })).toBeVisible();
    await expect(
      page.locator('p').filter({ hasText: /^Browser acceptance deadline$/ }).first(),
    ).toBeVisible();
    await expect(page.getByText('Private document storage not configured locally')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Activity Timeline' })).toBeVisible();
    await expect(
      page.locator('p').filter({ hasText: /^Milestone "Deposit due" marked completed\.$/ }).first(),
    ).toBeVisible();
    await expect(
      page
        .locator('p')
        .filter({ hasText: /^Condition "Browser acceptance deadline" marked completed\.$/ })
        .first(),
    ).toBeVisible();
    await expect(page.getByTestId('agency-shell')).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: 'Transactions' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/agency/transactions?deal=${dealState?.dealId}`);
    await expect(page.getByText('Offers and Transactions')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('p').filter({ hasText: /^Browser acceptance deadline$/ }).first(),
    ).toBeVisible();
    await expect(page.getByText('Private document storage not configured locally')).toBeVisible();
    await expect(page.getByTestId('agency-shell')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/agency/transactions?deal=${dealState?.dealId}`);
    await expect(page.getByTestId('agency-shell')).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByText('Expected commission').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Activity Timeline' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const finalState = await loadPersistedDealState(fixture.leadId);
    expect(finalState).toEqual(
      expect.objectContaining({
        dealId: dealState?.dealId,
        transactionId: dealState?.transactionId,
        expectedCommission: 95_000,
        offerCount: 3,
      }),
    );
    expect(finalState?.documentCount).toBe(0);
    expect(finalState?.activityCount).toBeGreaterThan(dealState?.activityCount || 0);
  });
});

import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const AGENCY_EMAIL = 'agency@listify.local';
const AGENT_EMAIL = 'agent@listify.local';
const fixtureName = `[E2E] Commission reconciliation ${randomUUID().slice(0, 8)}`;

type Fixture = { dealId: number; transactionId: number; settlementId: number };
let fixture: Fixture;

function localDemoPassword() {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for agency browser smoke.');
  return password;
}

async function openLocalDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for agency browser smoke.');
  const parsed = new URL(databaseUrl);
  expect(parsed.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(parsed.pathname.replace(/^\//, '')).toBe('listify_local');
  return mysql.createConnection(databaseUrl);
}

async function queryOne<T extends Record<string, unknown>>(connection: mysql.Connection, sql: string, params: unknown[]) {
  const [rows] = await connection.execute(sql, params);
  const row = (rows as T[])[0];
  if (!row) throw new Error(`Missing local demo fixture for query: ${sql.replace(/\s+/g, ' ').trim()}`);
  return row;
}

async function createFixture(): Promise<Fixture> {
  const connection = await openLocalDatabaseConnection();
  try {
    const agency = await queryOne<{ agencyId: number; adminUserId: number; agentId: number; listingId: number }>(
      connection,
      `SELECT agency.id AS agencyId, admin.id AS adminUserId, agent.id AS agentId, listing.id AS listingId
       FROM agencies agency
       JOIN users admin ON admin.agencyId = agency.id AND admin.email = ?
       JOIN agents agent ON agent.agencyId = agency.id AND agent.email = ?
       JOIN listings listing ON listing.agencyId = agency.id
       LIMIT 1`,
      [AGENCY_EMAIL, AGENT_EMAIL],
    );
    const expectedPaymentDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    await connection.beginTransaction();
    try {
      const [dealResult] = await connection.execute(
        `INSERT INTO agency_deals (agency_id, listing_id, property_id, responsible_agent_id, transaction_type, stage, interest_status, risk_status, next_action, created_by_user_id, updated_by_user_id)
         VALUES (?, ?, ?, ?, 'sale', 'completed', 'interested', 'on_track', 'E2E commission reconciliation', ?, ?)`,
        [agency.agencyId, agency.listingId, null, agency.agentId, agency.adminUserId, agency.adminUserId],
      );
      const dealId = Number((dealResult as mysql.ResultSetHeader).insertId);
      const [offerResult] = await connection.execute(
        `INSERT INTO agency_deal_offer_versions (agency_id, deal_id, version_number, actor, event_type, status, amount, finance_required, terms_snapshot, created_by_user_id, decided_at)
         VALUES (?, ?, 1, 'buyer', 'initial_offer', 'accepted', 1000000.00, 0, JSON_OBJECT('amount', 1000000), ?, NOW())`,
        [agency.agencyId, dealId, agency.adminUserId],
      );
      const offerId = Number((offerResult as mysql.ResultSetHeader).insertId);
      await connection.execute('UPDATE agency_deals SET accepted_offer_version_id = ?, accepted_amount = 1000000.00 WHERE id = ?', [offerId, dealId]);
      const [transactionResult] = await connection.execute(
        `INSERT INTO agency_transactions (agency_id, deal_id, listing_id, property_id, responsible_agent_id, accepted_offer_version_id, transaction_type, status, stage, risk_status, accepted_amount, accepted_terms_snapshot, completed_at, commission_basis, commission_percentage, commission_vat_treatment, gross_commission, agency_share, agent_share, referral_split, other_deductions, expected_commission, commission_status, expected_payment_date, created_by_user_id, updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, 'sale', 'completed', 'completed', 'on_track', 1000000.00, JSON_OBJECT('amount', 1000000), NOW(), 'percentage', 5.00, 'exclusive', 50000.00, 28200.00, 18800.00, 2000.00, 1000.00, 47000.00, 'payable', ?, ?, ?)`,
        [agency.agencyId, dealId, agency.listingId, null, agency.agentId, offerId, expectedPaymentDate, agency.adminUserId, agency.adminUserId],
      );
      const transactionId = Number((transactionResult as mysql.ResultSetHeader).insertId);
      const [settlementResult] = await connection.execute(
        `INSERT INTO agency_commission_settlements (agency_id, transaction_id, responsible_agent_id, expected_commission, agent_share, agency_share, expected_payment_date, status)
         VALUES (?, ?, ?, 47000.00, 18800.00, 28200.00, ?, 'awaiting_payment')`,
        [agency.agencyId, transactionId, agency.agentId, expectedPaymentDate],
      );
      await connection.commit();
      return { dealId, transactionId, settlementId: Number((settlementResult as mysql.ResultSetHeader).insertId) };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

async function cleanupFixture() {
  if (!fixture) return;
  const connection = await openLocalDatabaseConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM agency_commission_settlement_payments WHERE settlement_id = ?', [fixture.settlementId]);
    await connection.execute('DELETE FROM agency_transaction_activity WHERE transaction_id = ?', [fixture.transactionId]);
    await connection.execute('DELETE FROM agency_commission_settlements WHERE id = ?', [fixture.settlementId]);
    await connection.execute('DELETE FROM agency_transactions WHERE id = ?', [fixture.transactionId]);
    await connection.execute('DELETE FROM agency_deal_offer_versions WHERE deal_id = ?', [fixture.dealId]);
    await connection.execute('DELETE FROM agency_deals WHERE id = ?', [fixture.dealId]);
    await connection.commit();
  } finally {
    await connection.end();
  }
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/login?mode=signin&next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email address').fill(email);
  await page.locator('input[name="password"]').fill(localDemoPassword());
  await page.getByRole('button', { name: /^Sign in$/ }).last().click();
  await expect(page).toHaveURL(new RegExp(`${next.replace('/', '\\/')}$`));
}

test.describe.serial('commission reconciliation browser acceptance', () => {
  test.beforeAll(async () => { fixture = await createFixture(); });
  test.afterAll(async () => { await cleanupFixture(); });

  test('admin records receipts and handles an exception', async ({ page }) => {
    await signIn(page, AGENCY_EMAIL, '/agency/commission');
    await expect(page.getByText('Commission reconciliation')).toBeVisible();
    await expect(page.getByText('Actionable exceptions')).toBeVisible();
    const row = page.locator('tr', { hasText: `Transaction #${fixture.transactionId}` });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Breakdown' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Operational commission statement')).toBeVisible();
    await expect(dialog.getByText('Net commission forecast')).toBeVisible();
    await expect(dialog.getByText(/47\s*000,00/).first()).toBeVisible();
    await expect(dialog.getByText('Agent expected share')).toBeVisible();
    await dialog.getByLabel('Receipt amount').fill('10000');
    await dialog.getByLabel('Payment reference').fill('E2E-PARTIAL');
    await dialog.getByRole('button', { name: 'Record receipt' }).click();
    await expect(dialog.getByText('E2E-PARTIAL')).toBeVisible();
    await expect(dialog.getByText(/10\s*000,00/).first()).toBeVisible();
    await dialog.getByLabel('Dispute reason').fill('E2E reconciliation review');
    await dialog.getByRole('button', { name: 'Mark disputed' }).click();
    await expect(dialog.getByText('Disputed')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.goto('/agency/attention');
    await expect(page.getByText('Commission receipts need attention')).toBeVisible();

    await page.goto('/agency/commission');
    await page.locator('tr', { hasText: `Transaction #${fixture.transactionId}` }).getByRole('button', { name: 'Breakdown' }).click();
    await dialog.getByLabel('Dispute resolution note').fill('E2E reviewed and confirmed.');
    await dialog.getByRole('button', { name: 'Resolve dispute' }).click();
    await expect(dialog.getByText('Partially Received')).toBeVisible();
    await dialog.getByLabel('Receipt amount').fill('37000');
    await dialog.getByLabel('Payment reference').fill('E2E-FINAL');
    await dialog.getByRole('button', { name: 'Record receipt' }).click();
    await expect(dialog.getByText('Received')).toBeVisible();
    await expect(dialog.getByText('E2E-FINAL')).toBeVisible();

  });
});

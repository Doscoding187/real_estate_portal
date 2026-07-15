import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });
const DATABASE = 'listify_prospect_journey_e2e';
const buyerEmail = 'buyer@listify.local';
const secondEmail = 'referrer@listify.local';
const rawClaimToken = 'a'.repeat(64);
const fixture = { propertyA: 0, propertyB: 0, leadClaimed: 0, leadUnclaimed: 0, showing: 0 };

function password() { const value = process.env.LOCAL_DEMO_AGENCY_PASSWORD; if (!value) throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required.'); return value; }
async function db() { const url = process.env.DATABASE_URL; if (!url || new URL(url).pathname !== `/${DATABASE}`) throw new Error('Prospect Journey browser test requires its exact disposable database.'); return mysql.createConnection(url); }

async function createFixture() {
  const connection = await db();
  try {
    const [[buyer]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [buyerEmail]);
    const [[agency]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM agencies ORDER BY id LIMIT 1');
    const [[agent]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM agents WHERE agencyId = ? AND status = ? LIMIT 1', [agency.id, 'approved']);
    const [[existingIdentity]] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM prospect_identities WHERE user_id = ?', [buyer.id]);
    const identity = existingIdentity?.id || randomUUID();
    if (!existingIdentity) await connection.execute('INSERT INTO prospect_identities (id, user_id, contact_preferences) VALUES (?, ?, ?)', [identity, buyer.id, '{}']);
    for (const [title, target] of [['[E2E Journey] A very long public property title that must wrap safely on mobile', 'a'], ['[E2E Journey] Cross agency property', 'b']] as const) {
      const [result] = await connection.execute('INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, status, featured, views, enquiries, ownerId, agentId) VALUES (?, ?, \'house\', \'sale\', \'sale\', 1200000, 3, 2, 120, \'1 Journey Street\', \'Johannesburg\', \'Gauteng\', \'available\', 0, 0, 0, ?, ?)', [title, 'Disposable public fixture.', buyer.id, agent.id]);
      if (target === 'a') fixture.propertyA = Number((result as mysql.ResultSetHeader).insertId); else fixture.propertyB = Number((result as mysql.ResultSetHeader).insertId);
    }
    const [claimed] = await connection.execute('INSERT INTO leads (propertyId, agencyId, agentId, name, email, message, leadType, status, prospect_identity_id, notes, qualification_score) VALUES (?, ?, ?, \'Prospect A\', ?, \'Interested\', \'inquiry\', \'contacted\', ?, \'Private CRM note\', 99)', [fixture.propertyA, agency.id, agent.id, buyerEmail, identity]);
    fixture.leadClaimed = Number((claimed as mysql.ResultSetHeader).insertId);
    const [unclaimed] = await connection.execute('INSERT INTO leads (propertyId, agencyId, agentId, name, email, message, leadType, status) VALUES (?, ?, ?, \'Prospect A\', ?, \'Historical enquiry\', \'inquiry\', \'new\')', [fixture.propertyB, agency.id, agent.id, buyerEmail]);
    fixture.leadUnclaimed = Number((unclaimed as mysql.ResultSetHeader).insertId);
    await connection.execute('INSERT INTO prospect_action_claim_tokens (lead_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))', [fixture.leadUnclaimed, createHash('sha256').update(rawClaimToken).digest('hex')]);
    await connection.execute('INSERT INTO prospect_action_claim_tokens (lead_id, token_hash, expires_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 MINUTE))', [fixture.leadUnclaimed, createHash('sha256').update('b'.repeat(64)).digest('hex')]);
    const [showing] = await connection.execute('INSERT INTO showings (propertyId, leadId, agentId, scheduledAt, status, prospect_identity_id, visitorName, durationMinutes) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), \'confirmed\', ?, \'Prospect A\', 30)', [fixture.propertyA, fixture.leadClaimed, agent.id, identity]);
    fixture.showing = Number((showing as mysql.ResultSetHeader).insertId);
  } finally { await connection.end(); }
}
async function login(page: Page, email: string) { await page.goto('/login?mode=signin&next=/user/dashboard'); await page.getByLabel('Email address').fill(email); await page.locator('input[name="password"]').fill(password()); await page.getByRole('button', { name: /^Sign in$/ }).last().click(); await expect(page).toHaveURL(/\/user\/dashboard/); }
async function noOverflow(page: Page) {
  const diagnostic = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const dimensions = {
      viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
    const overflowing = [...document.querySelectorAll<HTMLElement>('*')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 120) || '',
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
          scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
        };
      })
      .filter(item => item.right > viewportWidth + 1 || item.left < -1 || item.scrollWidth > item.clientWidth + 1)
      .slice(0, 8);
    const dashboardContainer = [...document.querySelectorAll<HTMLElement>('div.mt-8.w-full')]
      .find(element => element.textContent?.includes('Buyer intelligence'));
    const dashboardOverflow = dashboardContainer
      ? [...dashboardContainer.querySelectorAll<HTMLElement>('*')]
          .map(element => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            return {
              tag: element.tagName,
              text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 140) || '',
              className: typeof element.className === 'string' ? element.className : '',
              left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              minWidth: styles.minWidth, widthStyle: styles.width, whiteSpace: styles.whiteSpace,
              display: styles.display, gridTemplateColumns: styles.gridTemplateColumns,
            };
          })
          .filter(item => item.right > dashboardContainer.getBoundingClientRect().right + 1
            || item.left < dashboardContainer.getBoundingClientRect().left - 1
            || item.scrollWidth > item.clientWidth + 1)
          .slice(0, 12)
      : [];
    return { dimensions, overflowing, dashboardOverflow };
  });
  expect(
    diagnostic.dimensions.documentScrollWidth <= diagnostic.dimensions.viewportWidth + 1,
    `Mobile overflow: ${JSON.stringify(diagnostic)}`,
  ).toBe(true);
}

test.describe.serial('Prospect Journey browser acceptance', () => {
  test.beforeAll(createFixture);
  test('uses the real login flow, shows only safe journey data, and claims one action once', async ({ page }) => {
    await login(page, buyerEmail);
    await expect(page.getByRole('heading', { name: 'Your property journey' })).toBeVisible();
    await expect(page.getByText('Active enquiries')).toBeVisible(); await expect(page.getByText('Viewing confirmed').first()).toBeVisible();
    await expect(page.getByText('Private CRM note')).toHaveCount(0); await expect(page.getByText('contacted', { exact: true })).toHaveCount(0);
    await page.goto(`/user/dashboard?claimToken=${rawClaimToken}`); await expect(page.getByText('Your journey item is now linked to this account.')).toBeVisible();
    await expect(page.getByText('[E2E Journey] Cross agency property', { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByText('[E2E Journey] Cross agency property', { exact: true })).toBeVisible();
    await page.goto(`/user/dashboard?claimToken=${rawClaimToken}`); await expect(page.getByText('This claim link is invalid or expired.').first()).toBeVisible();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) { await page.setViewportSize(viewport); await expect(page.getByRole('heading', { name: 'Your property journey' })).toBeVisible(); await noOverflow(page); }
  });
  test('keeps Prospect A actions private from Prospect B', async ({ page }) => {
    await login(page, secondEmail); await expect(page.getByRole('heading', { name: 'Your property journey' })).toBeVisible(); await expect(page.getByText('[E2E Journey] Cross agency property')).toHaveCount(0); await expect(page.getByText('Your journey starts with an enquiry')).toBeVisible();
  });
});

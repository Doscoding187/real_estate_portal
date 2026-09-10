import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import bcrypt from 'bcryptjs';
import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';
import { SEARCH_TO_LEAD_SCENARIO_IDS } from '../../server/_core/databaseAuthority/dataAdapters/searchToLeadScenario';

type Row = Record<string, unknown>;

const scenario = SEARCH_TO_LEAD_SCENARIO_IDS;
const password = 'P1Browser!Disposable9';
let connection: AuthoritySqlConnection | undefined;
let userId = 0;
let email = '';
let propertyTitle = '';

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
  if (!connection) throw new Error('P1 browser fixture connection is not initialized.');
  return connection.execute(statement, values);
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  return rowsFrom(await execute(statement, values));
}

async function signIn(page: Page): Promise<void> {
  await page.goto(
    `/login?mode=signin&next=${encodeURIComponent(`/property/${scenario.property}`)}`,
  );
  await page.getByLabel('Email address').fill(email);
  const passwordField = page.locator('input[name="password"]');
  await passwordField.fill(password);
  const loginResponse = page.waitForResponse(
    response =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: /^Sign in$/ })
    .last()
    .click();
  await expect((await loginResponse).ok()).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/property/${scenario.property}$`));
}

test.describe('consumer activity browser persistence (P1)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);

    const [property] = await query(
      'SELECT p.title FROM properties p INNER JOIN listings l ON l.id = p.sourceListingId WHERE p.id = ? AND p.sourceListingId = ? AND p.status = ? AND l.status = ? AND l.approvalStatus = ?',
      [scenario.property, scenario.agentListing, 'available', 'published', 'approved'],
    );
    expect(property, 'run pnpm db:scenario:prepare before this browser proof').toBeDefined();
    propertyTitle = String(property.title);

    email = `p1-browser-${randomUUID()}@invalid.example`;
    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await execute(
      'INSERT INTO users (email, passwordHash, name, loginMethod, emailVerified, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, passwordHash, 'P1 browser visitor', 'email', 1, 'visitor'],
    );
    const header = Array.isArray(insert) ? (insert[0] as { insertId?: unknown }) : undefined;
    userId = Number(header?.insertId);
    expect(userId).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    if (userId > 0) {
      await execute('DELETE FROM favorites WHERE user_id = ?', [userId]);
      await execute('DELETE FROM recently_viewed WHERE userId = ?', [userId]);
      await execute('DELETE FROM users WHERE id = ?', [userId]);
    }
    await connection?.end();
  });

  test('transfers guest activity, persists save/remove across reloads, and keeps a canonical recent view', async ({
    page,
  }) => {
    await page.goto(`/property/${scenario.property}`);
    await expect(page.getByRole('heading', { level: 1, name: propertyTitle })).toBeVisible();

    await page.evaluate(propertyId => {
      localStorage.setItem(
        'guestActivity',
        JSON.stringify({
          viewedProperties: [propertyId],
          favoriteProperties: [propertyId],
          recentSearches: [],
          lastUpdated: '2026-09-09T00:00:00.000Z',
        }),
      );
    }, scenario.property);
    await page.reload();
    await signIn(page);

    await expect
      .poll(
        async () =>
          (
            await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
              userId,
              scenario.property,
            ])
          ).length,
      )
      .toBe(1);
    await expect
      .poll(
        async () =>
          (
            await query('SELECT id FROM recently_viewed WHERE userId = ? AND listingId = ?', [
              userId,
              scenario.agentListing,
            ])
          ).length,
      )
      .toBe(1);
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('guestActivity')))
      .toBeNull();

    const savedButton = page.getByRole('button', { name: 'Remove from saved homes' });
    await expect(savedButton).toBeVisible();
    await savedButton.click();
    await expect(page.getByRole('button', { name: 'Save property' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Save property' })).toBeVisible();

    await page.getByRole('button', { name: 'Save property' }).click();
    await expect(page.getByRole('button', { name: 'Remove from saved homes' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Remove from saved homes' })).toBeVisible();

    expect(
      await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
        userId,
        scenario.property,
      ]),
    ).toHaveLength(1);
    expect(
      await query('SELECT id FROM recently_viewed WHERE userId = ? AND listingId = ?', [
        userId,
        scenario.agentListing,
      ]),
    ).toHaveLength(1);
  });
});

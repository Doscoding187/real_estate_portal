import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3009';
const API_URL = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5000';
const AGENCY_EMAIL = 'agency@listify.local';

let createdSellerProspectIds: number[] = [];
let createdPropertyAddresses: string[] = [];

type PersistedSellerProspect = {
  id: number;
  agencyId: number;
  creatorAgencyId: number | null;
  assignedAgentId: number | null;
  assignedAgentAgencyId: number | null;
  stage: string;
  convertedListingId: number | null;
};

function localDemoPassword() {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) {
    throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for canvassing browser acceptance.');
  }
  return password;
}

function assertLocalUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  expect(['localhost', '127.0.0.1']).toContain(parsed.hostname);
}

async function openLocalDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for canvassing browser acceptance.');
  const parsed = new URL(databaseUrl);
  expect(['localhost', '127.0.0.1']).toContain(parsed.hostname);
  expect(parsed.pathname.replace(/^\//, '')).toBe('listify_local');
  return mysql.createConnection(databaseUrl);
}

async function signIn(page: Page) {
  await page.getByLabel('Email address').fill(AGENCY_EMAIL);
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill(localDemoPassword());
  const responsePromise = page
    .waitForResponse(
      response =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 15_000 },
    )
    .catch(() => null);
  try {
    await page.getByRole('button', { name: /^Sign in$/ }).last().click();
    const response = await responsePromise;
    expect(response, 'login response received').not.toBeNull();
    expect(response?.ok(), `login failed with status ${response?.status()}`).toBe(true);
  } finally {
    await passwordInput.fill('').catch(() => undefined);
  }
}

async function collectCreatedProspect(address: string): Promise<PersistedSellerProspect> {
  const connection = await openLocalDatabaseConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT
        seller_prospects.id,
        seller_prospects.agency_id AS agencyId,
        creator.agencyId AS creatorAgencyId,
        seller_prospects.assigned_agent_id AS assignedAgentId,
        assigned_agent.agencyId AS assignedAgentAgencyId,
        seller_prospects.stage,
        seller_prospects.converted_listing_id AS convertedListingId
       FROM seller_prospects
       LEFT JOIN users AS creator ON creator.id = seller_prospects.created_by_user_id
       LEFT JOIN agents AS assigned_agent ON assigned_agent.id = seller_prospects.assigned_agent_id
       WHERE seller_prospects.property_address = ?
       ORDER BY seller_prospects.id DESC
       LIMIT 1`,
      [address],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    const id = Number(row?.id || 0);
    if (!id) throw new Error('Canvassing browser fixture was not persisted.');
    const prospect = {
      id,
      agencyId: Number(row.agencyId || 0),
      creatorAgencyId: row.creatorAgencyId ? Number(row.creatorAgencyId) : null,
      assignedAgentId: row.assignedAgentId ? Number(row.assignedAgentId) : null,
      assignedAgentAgencyId: row.assignedAgentAgencyId ? Number(row.assignedAgentAgencyId) : null,
      stage: String(row.stage || ''),
      convertedListingId: row.convertedListingId ? Number(row.convertedListingId) : null,
    };
    createdSellerProspectIds.push(prospect.id);
    return prospect;
  } finally {
    await connection.end();
  }
}

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function cleanupCreatedProspects() {
  const connection = await openLocalDatabaseConnection();
  try {
    const ids = new Set(createdSellerProspectIds);
    const testAddresses = [...new Set(createdPropertyAddresses)];
    if (testAddresses.length) {
      const placeholders = testAddresses.map(() => '?').join(', ');
      const [rows] = await connection.execute(
        `SELECT id FROM seller_prospects WHERE property_address IN (${placeholders})`,
        testAddresses,
      );
      for (const row of rows as Array<{ id: number }>) ids.add(Number(row.id));
    }
    const [staleRows] = await connection.execute(
      "SELECT id FROM seller_prospects WHERE property_address LIKE 'Canvassing Browser % Avenue'",
    );
    for (const row of staleRows as Array<{ id: number }>) ids.add(Number(row.id));
    if (!ids.size) return;
    const values = [...ids];
    const placeholders = values.map(() => '?').join(', ');
    await connection.execute(
      `DELETE FROM seller_prospect_activities WHERE seller_prospect_id IN (${placeholders})`,
      values,
    );
    await connection.execute(`DELETE FROM seller_prospects WHERE id IN (${placeholders})`, values);
  } finally {
    createdSellerProspectIds = [];
    createdPropertyAddresses = [];
    await connection.end();
  }
}

test.describe.serial('agency canvassing browser acceptance', () => {
  test.beforeAll(() => {
    assertLocalUrl(FRONTEND_URL);
    assertLocalUrl(API_URL);
  });

  test.afterEach(async () => {
    await cleanupCreatedProspects();
  });

  test('manager captures a seller opportunity and starts the canonical listing handoff', async ({
    page,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const ownerName = `[E2E] Seller ${suffix}`;
    const propertyAddress = `Canvassing Browser ${suffix} Avenue`;
    const initialNote = 'Private browser acceptance context.';
    const activityNote = 'Documented first seller contact for browser acceptance.';
    const followUpNote = 'Confirm the valuation appointment time.';
    createdPropertyAddresses.push(propertyAddress);

    await page.goto('/login?mode=signin&next=/agency/canvassing');
    await signIn(page);

    await expect(page).toHaveURL(/\/agency\/canvassing$/);
    await expect(page.getByTestId('agency-canvassing-workspace')).toBeVisible();
    await expect(
      page.getByTestId('agency-canvassing-workspace').getByRole('heading', {
        name: 'Canvassing',
        exact: true,
      }),
    ).toBeVisible();

    await page.getByTestId('create-seller-prospect').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Known owner or contact').fill(ownerName);
    await dialog.getByPlaceholder('Target property or address').fill(propertyAddress);
    await dialog.getByPlaceholder('e.g. Johannesburg').fill('Johannesburg');
    await dialog.getByPlaceholder('e.g. Door-to-door, referral').fill('E2E canvassing');
    await dialog
      .getByPlaceholder('Context for the next agency action. Never copied into public listing content.')
      .fill(initialNote);
    await dialog.getByRole('button', { name: 'Capture prospect', exact: true }).click();

    await expect(dialog.getByRole('heading', { name: ownerName, exact: true })).toBeVisible();
    const createdProspect = await collectCreatedProspect(propertyAddress);
    const sellerProspectId = createdProspect.id;
    expect(createdProspect.agencyId).toBeGreaterThan(0);
    expect(createdProspect.creatorAgencyId).toBe(createdProspect.agencyId);

    await dialog.getByLabel('Assigned agent').click();
    const assignableAgentOption = page
      .getByRole('option')
      .filter({ hasNotText: 'Unassigned' })
      .first();
    await expect(assignableAgentOption).toBeVisible();
    const assignedAgentName = (await assignableAgentOption.textContent())?.trim();
    if (!assignedAgentName) throw new Error('Local agency seed has no assignable agent.');
    await assignableAgentOption.click();
    const saveAssignmentButton = dialog.getByRole('button', { name: 'Save assignment', exact: true });
    await saveAssignmentButton.click();
    await expect(saveAssignmentButton).toHaveText('Save assignment');
    await expect(dialog.getByLabel('Assigned agent')).toContainText(assignedAgentName);

    await expect
      .poll(async () => (await collectCreatedProspect(propertyAddress)).assignedAgentId, {
        timeout: 10_000,
      })
      .toBeTruthy();
    const assignedProspect = await collectCreatedProspect(propertyAddress);
    expect(assignedProspect.assignedAgentId).toBeTruthy();
    expect(assignedProspect.assignedAgentAgencyId).toBe(assignedProspect.agencyId);

    await dialog.getByPlaceholder('What happened?').fill(activityNote);
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText(activityNote, { exact: true })).toBeVisible();

    await dialog.locator('input[type="datetime-local"]').fill(toLocalDateTimeInput(new Date(Date.now() + 86_400_000)));
    await dialog.getByPlaceholder('Optional follow-up context').fill(followUpNote);
    await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();

    const followUpQueue = page.getByTestId('seller-follow-up-queue');
    await expect(followUpQueue).toContainText(ownerName);
    await followUpQueue.getByText(ownerName, { exact: true }).click();
    await expect(dialog.getByRole('heading', { name: ownerName, exact: true })).toBeVisible();

    await dialog.getByLabel('Pipeline stage').click();
    await page.getByRole('option', { name: 'Qualified', exact: true }).click();
    await dialog.getByRole('button', { name: 'Update stage', exact: true }).click();
    await expect(dialog.getByLabel('Pipeline stage')).toContainText('Qualified');

    await dialog.getByLabel('Pipeline stage').click();
    await page.getByRole('option', { name: 'Mandate Won', exact: true }).click();
    await dialog.getByRole('button', { name: 'Update stage', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Start listing', exact: true })).toBeVisible();

    await dialog.getByRole('button', { name: 'Start listing', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/listings/create\\?sellerProspectId=${sellerProspectId}`));
    await expect(page.getByTestId('seller-prospect-listing-handoff')).toBeVisible();
    await expect(page.getByText('Private seller-prospect handoff')).toBeVisible();
    await expect(page.getByText(ownerName, { exact: true })).toHaveCount(0);
    await expect(page.getByText(initialNote, { exact: true })).toHaveCount(0);
    const publicDraftValues = await page.locator('input, textarea').evaluateAll(elements =>
      elements.map(element => (element as HTMLInputElement).value),
    );
    expect(publicDraftValues).not.toContain(ownerName);
    expect(publicDraftValues).not.toContain(initialNote);

    const handoffProspect = await collectCreatedProspect(propertyAddress);
    expect(handoffProspect.stage).toBe('mandate_won');
    expect(handoffProspect.convertedListingId).toBeNull();
  });
});

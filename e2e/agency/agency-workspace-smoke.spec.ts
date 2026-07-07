import path from 'node:path';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import superjson from 'superjson';
import type { AppRouter } from '../../server/routers';
import { COOKIE_NAME } from '../../shared/const';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3009';
const API_URL = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5000';
const AGENCY_EMAIL = 'agency@listify.local';
const TARGET_LEAD_STATUS = 'contacted';
const TARGET_LEAD_STATUS_LABEL = 'Contacted';

type SmokeFixtures = {
  newBuyerLeadId: number;
  crossAgencyLeadId: number;
  missingAgentLeadId: number;
};

function assertLocalUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  expect(['localhost', '127.0.0.1']).toContain(parsed.hostname);
}

function localDemoPassword() {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) {
    throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for agency browser smoke.');
  }
  return password;
}

async function queryOne<T extends Record<string, unknown>>(
  connection: mysql.Connection,
  sql: string,
  params: unknown[],
): Promise<T> {
  const [rows] = await connection.execute(sql, params);
  const first = (rows as T[])[0];
  if (!first) {
    throw new Error(`Missing local demo fixture for query: ${sql.replace(/\s+/g, ' ').trim()}`);
  }
  return first;
}

async function loadSmokeFixtures(): Promise<SmokeFixtures> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency browser smoke.');
  }

  const parsed = new URL(databaseUrl);
  expect(parsed.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(parsed.pathname.replace(/^\//, '')).toBe('listify_local');

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const newBuyer = await queryOne<{ id: number }>(
      connection,
      'SELECT id FROM leads WHERE email = ? LIMIT 1',
      ['agency-new-buyer@listify.local'],
    );
    const crossAgency = await queryOne<{ id: number }>(
      connection,
      'SELECT id FROM leads WHERE email = ? LIMIT 1',
      ['agency-cross-boundary@listify.local'],
    );
    const missingAgent = await queryOne<{ id: number }>(
      connection,
      'SELECT id FROM leads WHERE email = ? LIMIT 1',
      ['agency-missing-agent@listify.local'],
    );

    return {
      newBuyerLeadId: Number(newBuyer.id),
      crossAgencyLeadId: Number(crossAgency.id),
      missingAgentLeadId: Number(missingAgent.id),
    };
  } finally {
    await connection.end();
  }
}

async function resetNewBuyerSmokeFixture(leadId: number) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency browser smoke.');
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    await connection.execute('DELETE FROM lead_activities WHERE leadId = ?', [leadId]);
    await connection.execute(
      `UPDATE leads
       SET status = 'new',
         agentId = NULL,
         assigned_to = NULL,
         assigned_at = NULL,
         nextFollowUp = NULL,
         lastContactedAt = NULL,
         converted_at = NULL,
         lost_reason = NULL,
         funnel_stage = 'interest',
         qualification_status = 'pending',
         qualification_score = 0,
         updatedAt = NOW()
       WHERE id = ?`,
      [leadId],
    );
  } finally {
    await connection.end();
  }
}

async function createDisposableInvitee(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency invitation smoke.');
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [sourceUsers] = await connection.execute(
      'SELECT passwordHash FROM users WHERE email = ? LIMIT 1',
      [AGENCY_EMAIL],
    );
    const sourceUser = (sourceUsers as Array<{ passwordHash: string }>)[0];
    if (!sourceUser?.passwordHash) {
      throw new Error('Local agency user must exist before invitation smoke.');
    }

    await connection.execute('DELETE FROM invitations WHERE email = ?', [email]);
    await connection.execute('DELETE FROM agents WHERE email = ?', [email]);
    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    await connection.execute(
      `INSERT INTO users
        (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
       VALUES (?, ?, ?, 'Invite', 'Smoke', 'visitor', 1, 0, NOW(), NOW())`,
      [email, sourceUser.passwordHash, '[LOCAL DEMO] Invite Smoke'],
    );
  } finally {
    await connection.end();
  }
}

async function getInvitationToken(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency invitation smoke.');
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const invitation = await queryOne<{ token: string }>(
      connection,
      'SELECT token FROM invitations WHERE email = ? AND status = ? ORDER BY id DESC LIMIT 1',
      [email, 'pending'],
    );
    return invitation.token;
  } finally {
    await connection.end();
  }
}

async function getAcceptedInviteeState(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency invitation smoke.');
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    return await queryOne<{
      userId: number;
      agencyId: number;
      role: string;
      invitationStatus: string;
      agentStatus: string | null;
    }>(
      connection,
      `SELECT
        u.id AS userId,
        u.agencyId AS agencyId,
        u.role AS role,
        i.status AS invitationStatus,
        a.status AS agentStatus
       FROM users u
       JOIN invitations i ON i.email = u.email
       LEFT JOIN agents a ON a.userId = u.id
       WHERE u.email = ?
       ORDER BY i.id DESC
       LIMIT 1`,
      [email],
    );
  } finally {
    await connection.end();
  }
}

async function authedTrpcClient(context: BrowserContext) {
  const cookies = await context.cookies(FRONTEND_URL);
  const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  expect(cookieHeader).toContain(`${COOKIE_NAME}=`);

  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: new URL('/api/trpc', API_URL).toString(),
        transformer: superjson,
        headers: () => ({ cookie: cookieHeader }),
      }),
    ],
  });
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
    await page.getByRole('button', { name: /^Sign in$/ }).last().click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse, 'login response received').not.toBeNull();
    expect(loginResponse?.ok(), `login failed with status ${loginResponse?.status()}`).toBe(true);
  } finally {
    await passwordInput.fill('').catch(() => undefined);
  }
}

test.describe.serial('local agency workspace browser smoke', () => {
  test.beforeAll(() => {
    assertLocalUrl(FRONTEND_URL);
    assertLocalUrl(API_URL);
  });

  test('login, protected access, lead mutations, protection, and reload persistence', async ({
    page,
    context,
  }) => {
    const fixtures = await loadSmokeFixtures();
    await resetNewBuyerSmokeFixture(fixtures.newBuyerLeadId);

    await page.goto('/agency/leads');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/login?mode=signin&next=/agency/leads');
    await signIn(page, AGENCY_EMAIL);

    await expect(page).toHaveURL(/\/agency\/leads$/);
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
    await expect(page.getByText('Lead Workspace')).toBeVisible();
    await expect(page.getByText('[LOCAL DEMO] New Buyer')).toBeVisible();
    await expect(page.getByText('[LOCAL DEMO] Cross Agency Buyer')).toHaveCount(0);
    const notifications = page.getByLabel('Notifications alt+T');
    const client = await authedTrpcClient(context);
    const startingLead = await client.agency.getLeadDetail.query({ leadId: fixtures.newBuyerLeadId });
    expect(startingLead.status).toBe('new');

    await page.getByRole('button', { name: /\[LOCAL DEMO\] New Buyer/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('[LOCAL DEMO] New Buyer')).toBeVisible();

    await dialog.locator('select').nth(0).selectOption({ label: '[LOCAL DEMO] Agency Agent' });
    await expect(notifications.getByText('Lead assignment updated')).toBeVisible();

    await dialog.locator('select').nth(1).selectOption(TARGET_LEAD_STATUS);
    await dialog.getByPlaceholder('Stage note').fill('Agency browser smoke status persistence.');
    await dialog.getByRole('button', { name: /Update stage/ }).click();
    await expect(notifications.getByText('Lead stage updated')).toBeVisible();

    await dialog.locator('input[type="datetime-local"]').first().fill('2026-07-20T09:30');
    await dialog.getByPlaceholder('Follow-up note').fill('Agency browser smoke follow-up.');
    await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(notifications.getByText('Follow-up scheduled')).toBeVisible();

    const persisted = await client.agency.getLeadDetail.query({ leadId: fixtures.newBuyerLeadId });
    expect(persisted.status).toBe(TARGET_LEAD_STATUS);
    expect(persisted.agent?.name).toBe('[LOCAL DEMO] Agency Agent');
    expect(String(persisted.nextFollowUp || '')).toContain('2026-07-20');

    await expect(
      client.agency.getLeadDetail.query({ leadId: fixtures.crossAgencyLeadId }),
    ).rejects.toThrow(/Lead not found/i);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
    await page.getByPlaceholder('Search leads, contact details, or listing').fill(
      '[LOCAL DEMO] New Buyer',
    );
    await page.getByRole('button', { name: /\[LOCAL DEMO\] New Buyer/ }).click();
    await expect(
      dialog.getByText(new RegExp(`agency-new-buyer@listify\\.local · ${TARGET_LEAD_STATUS_LABEL}`)),
    ).toBeVisible();
    await expect(dialog.getByText('[LOCAL DEMO] Agency Agent').first()).toBeVisible();
    await expect(dialog.getByText('Agency browser smoke follow-up.').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await page.getByPlaceholder('Search leads, contact details, or listing').fill(
      '[LOCAL DEMO] Missing Agent Detail Buyer',
    );
    await page.getByRole('button', { name: /\[LOCAL DEMO\] Missing Agent Detail Buyer/ }).click();
    await expect(dialog.getByText('No agent assigned')).toBeVisible();

    const missingAgentLead = await client.agency.getLeadDetail.query({
      leadId: fixtures.missingAgentLeadId,
    });
    expect(missingAgentLead.agent).toBeNull();
  });

  test('team invitation creation and acceptance persists agency membership', async ({ page, context }) => {
    const inviteEmail = `agency-invite-smoke-${Date.now()}@listify.local`;
    await createDisposableInvitee(inviteEmail);

    await page.goto('/login?mode=signin&next=/agency/team/invitations');
    await signIn(page, AGENCY_EMAIL);

    await expect(page).toHaveURL(/\/agency\/team\/invitations$/);
    await expect(page.getByText('Invite Agent')).toBeVisible();
    await page.getByPlaceholder('agent@example.com').fill(inviteEmail);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();

    const token = await getInvitationToken(inviteEmail);
    await context.clearCookies();

    await page.goto(`/login?mode=signin&next=/accept-invitation?token=${token}`);
    await signIn(page, inviteEmail);

    await expect(page.getByText("You've Been Invited!")).toBeVisible();
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Accept Invitation' }).click();
    await expect(page).toHaveURL(/\/agent\/dashboard$/);

    const acceptedState = await getAcceptedInviteeState(inviteEmail);
    expect(acceptedState.role).toBe('agent');
    expect(Number(acceptedState.agencyId)).toBeGreaterThan(0);
    expect(acceptedState.invitationStatus).toBe('accepted');
    expect(acceptedState.agentStatus).toBe('approved');

    await context.clearCookies();
    await page.goto('/login?mode=signin&next=/agency/team');
    await signIn(page, AGENCY_EMAIL);

    await expect(page).toHaveURL(/\/agency\/team$/);
    await expect(page.getByText(inviteEmail)).toBeVisible();
  });
});

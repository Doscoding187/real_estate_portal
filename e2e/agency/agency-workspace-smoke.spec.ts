import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import superjson from 'superjson';
import type { AppRouter } from '../../server/routers';
import { COOKIE_NAME } from '../../shared/const';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3009';
const API_URL = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5000';
const AGENCY_EMAIL = 'agency@listify.local';
const ADMIN_EMAIL = 'admin@listify.local';
const TARGET_LEAD_STATUS = 'contacted';
const TARGET_LEAD_STATUS_LABEL = 'Contacted';
const BILLING_SMOKE_PLAN_NAME = 'browser_smoke_paid_agency';
const BILLING_SMOKE_PLAN_PRICE_CENTS = 12345;

type SmokeFixtures = {
  newBuyerLeadId: number;
  crossAgencyLeadId: number;
  missingAgentLeadId: number;
};

type BillingSmokePlan = {
  id: number;
  monthlyAmountCents: number;
};

const revenueSignupState = {
  ownerEmails: [] as string[],
  inviteEmails: [] as string[],
  adminEmails: [] as string[],
  agencyIds: [] as number[],
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

async function openLocalDatabaseConnection(): Promise<mysql.Connection> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for agency browser smoke.');
  }

  const parsed = new URL(databaseUrl);
  expect(parsed.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(parsed.pathname.replace(/^\//, '')).toBe('listify_local');

  return mysql.createConnection(databaseUrl);
}

async function loadSmokeFixtures(): Promise<SmokeFixtures> {
  const connection = await openLocalDatabaseConnection();
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
  const connection = await openLocalDatabaseConnection();
  try {
    await connection.execute('DELETE FROM lead_activities WHERE leadId = ?', [leadId]);
    await connection.execute(
      `UPDATE leads
       SET status = 'new',
         agentId = NULL,
         assigned_to = NULL,
         assigned_at = NULL,
         nextFollowUp = NULL,
         nextAction = NULL,
         firstRespondedAt = NULL,
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
  const connection = await openLocalDatabaseConnection();
  try {
    const passwordHash = await bcrypt.hash(localDemoPassword(), 10);

    await connection.execute('DELETE FROM invitations WHERE email = ?', [email]);
    await connection.execute('DELETE FROM agents WHERE email = ?', [email]);
    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    await connection.execute(
      `INSERT INTO users
        (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
       VALUES (?, ?, ?, 'Invite', 'Smoke', 'visitor', 1, 0, NOW(), NOW())`,
      [email, passwordHash, '[LOCAL DEMO] Invite Smoke'],
    );
  } finally {
    await connection.end();
  }
}

function rememberRevenueAgencyId(agencyId: number) {
  if (Number.isFinite(agencyId) && agencyId > 0 && !revenueSignupState.agencyIds.includes(agencyId)) {
    revenueSignupState.agencyIds.push(agencyId);
  }
}

function placeholders(values: unknown[]) {
  return values.map(() => '?').join(',');
}

async function createDisposableAgencyOwner(email: string) {
  const connection = await openLocalDatabaseConnection();
  try {
    const passwordHash = await bcrypt.hash(localDemoPassword(), 10);

    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    const [insertResult] = await connection.execute(
      `INSERT INTO users
        (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
       VALUES (?, ?, ?, 'Revenue', 'Owner', 'agency_admin', 1, 0, NOW(), NOW())`,
      [email, passwordHash, '[E2E] Revenue Path Owner'],
    );
    revenueSignupState.ownerEmails.push(email);
    return Number((insertResult as mysql.ResultSetHeader).insertId);
  } finally {
    await connection.end();
  }
}

async function createDisposableSuperAdmin(email: string) {
  const connection = await openLocalDatabaseConnection();
  try {
    const passwordHash = await bcrypt.hash(localDemoPassword(), 10);

    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    await connection.execute(
      `INSERT INTO users
        (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
       VALUES (?, ?, ?, 'Revenue', 'Finance', 'super_admin', 1, 0, NOW(), NOW())`,
      [email, passwordHash, '[E2E] Revenue Path Finance Admin'],
    );
    revenueSignupState.adminEmails.push(email);
  } finally {
    await connection.end();
  }
}

async function loadOwnerAgencyId(email: string) {
  const connection = await openLocalDatabaseConnection();
  try {
    const owner = await queryOne<{ agencyId: number }>(
      connection,
      'SELECT agencyId FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const agencyId = Number(owner.agencyId);
    rememberRevenueAgencyId(agencyId);
    return agencyId;
  } finally {
    await connection.end();
  }
}

async function cleanupRevenueSignupState() {
  const ownerEmails = [...new Set(revenueSignupState.ownerEmails)];
  const inviteEmails = [...new Set(revenueSignupState.inviteEmails)];
  const adminEmails = [...new Set(revenueSignupState.adminEmails)];
  const connection = await openLocalDatabaseConnection();
  try {
    const agencyIds = new Set(revenueSignupState.agencyIds.filter(Boolean));
    const userIds = new Set<number>();
    const directUserEmails = [...ownerEmails, ...adminEmails];

    if (directUserEmails.length) {
      const [rows] = await connection.query(
        `SELECT id, agencyId FROM users WHERE email IN (${placeholders(directUserEmails)})`,
        directUserEmails,
      );
      for (const row of rows as Array<{ id: number; agencyId: number | null }>) {
        userIds.add(Number(row.id));
        if (row.agencyId) agencyIds.add(Number(row.agencyId));
      }
    }

    if (inviteEmails.length) {
      const [rows] = await connection.query(
        `SELECT id, agencyId FROM users WHERE email IN (${placeholders(inviteEmails)})`,
        inviteEmails,
      );
      for (const row of rows as Array<{ id: number; agencyId: number | null }>) {
        userIds.add(Number(row.id));
        if (row.agencyId) agencyIds.add(Number(row.agencyId));
      }
    }

    const agencyIdList = Array.from(agencyIds).filter(Boolean);
    const userIdList = Array.from(userIds).filter(Boolean);

    await connection.beginTransaction();
    try {
      if (agencyIdList.length) {
        const agencyPlaceholders = placeholders(agencyIdList);
        await connection.query(
          `DELETE FROM billing_payment_documents WHERE owner_type = 'agency' AND owner_id IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM billing_payments WHERE owner_type = 'agency' AND owner_id IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM billing_audit_events WHERE owner_type = 'agency' AND owner_id IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM billing_invoices WHERE owner_type = 'agency' AND owner_id IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM subscriptions WHERE owner_type = 'agency' AND owner_id IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM agency_subscriptions WHERE agencyId IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM invitations WHERE agencyId IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM agency_branding WHERE agencyId IN (${agencyPlaceholders})`,
          agencyIdList,
        );
        await connection.query(
          `DELETE FROM agents WHERE agencyId IN (${agencyPlaceholders})`,
          agencyIdList,
        );
      }

      if (inviteEmails.length) {
        await connection.query(
          `DELETE FROM invitations WHERE email IN (${placeholders(inviteEmails)})`,
          inviteEmails,
        );
      }

      if (userIdList.length) {
        await connection.query(
          `DELETE FROM notifications WHERE userId IN (${placeholders(userIdList)})`,
          userIdList,
        );
        await connection.query(
          `DELETE FROM users WHERE id IN (${placeholders(userIdList)})`,
          userIdList,
        );
      }

      if (agencyIdList.length) {
        await connection.query(
          `DELETE FROM agencies WHERE id IN (${placeholders(agencyIdList)})`,
          agencyIdList,
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
    revenueSignupState.ownerEmails = [];
    revenueSignupState.inviteEmails = [];
    revenueSignupState.adminEmails = [];
    revenueSignupState.agencyIds = [];
  }
}

async function getInvitationToken(email: string) {
  const connection = await openLocalDatabaseConnection();
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
  const connection = await openLocalDatabaseConnection();
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

async function ensureBillingSmokePlan(): Promise<BillingSmokePlan> {
  const connection = await openLocalDatabaseConnection();
  try {
    const metadata = JSON.stringify({
      source: 'browser_smoke_fixture',
      locked_price_fixture: true,
    });
    const features = JSON.stringify([
      'Listing workspace',
      'Publication controls',
      'Team management',
      'Reporting',
    ]);
    const limits = JSON.stringify({ max_active_listings: 25 });

    const [rows] = await connection.execute('SELECT id FROM plans WHERE name = ? LIMIT 1', [
      BILLING_SMOKE_PLAN_NAME,
    ]);
    const existing = (rows as Array<{ id: number }>)[0];

    if (existing?.id) {
      await connection.execute(
        `UPDATE plans
         SET displayName = ?,
           description = ?,
           segment = 'agency',
           price = ?,
           price_monthly = ?,
           currency = 'ZAR',
           \`interval\` = 'month',
           trial_days = 0,
           metadata = ?,
           features = ?,
           limits = ?,
           isActive = 1,
           isPopular = 0,
           sortOrder = -100,
           updatedAt = NOW()
         WHERE id = ?`,
        [
          '[LOCAL DEMO] Browser Smoke Paid Agency',
          'Paid browser smoke plan for manual EFT acceptance validation.',
          BILLING_SMOKE_PLAN_PRICE_CENTS,
          BILLING_SMOKE_PLAN_PRICE_CENTS,
          metadata,
          features,
          limits,
          existing.id,
        ],
      );
      return {
        id: Number(existing.id),
        monthlyAmountCents: BILLING_SMOKE_PLAN_PRICE_CENTS,
      };
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO plans
        (name, displayName, description, segment, price, price_monthly, currency, \`interval\`,
         trial_days, metadata, stripePriceId, features, limits, isActive, isPopular, sortOrder)
       VALUES (?, ?, ?, 'agency', ?, ?, 'ZAR', 'month', 0, ?, NULL, ?, ?, 1, 0, -100)`,
      [
        BILLING_SMOKE_PLAN_NAME,
        '[LOCAL DEMO] Browser Smoke Paid Agency',
        'Paid browser smoke plan for manual EFT acceptance validation.',
        BILLING_SMOKE_PLAN_PRICE_CENTS,
        BILLING_SMOKE_PLAN_PRICE_CENTS,
        metadata,
        features,
        limits,
      ],
    );

    return {
      id: Number((insertResult as { insertId: number }).insertId),
      monthlyAmountCents: BILLING_SMOKE_PLAN_PRICE_CENTS,
    };
  } finally {
    await connection.end();
  }
}

async function resetBillingSmokeState() {
  const connection = await openLocalDatabaseConnection();
  try {
    const agency = await queryOne<{ agencyId: number }>(
      connection,
      'SELECT agencyId FROM users WHERE email = ? LIMIT 1',
      [AGENCY_EMAIL],
    );
    const agencyId = Number(agency.agencyId);

    await connection.beginTransaction();
    try {
      await connection.execute(
        'DELETE FROM billing_payment_documents WHERE owner_type = ? AND owner_id = ?',
        ['agency', agencyId],
      );
      await connection.execute('DELETE FROM billing_payments WHERE owner_type = ? AND owner_id = ?', [
        'agency',
        agencyId,
      ]);
      await connection.execute(
        'DELETE FROM billing_audit_events WHERE owner_type = ? AND owner_id = ?',
        ['agency', agencyId],
      );
      await connection.execute('DELETE FROM billing_invoices WHERE owner_type = ? AND owner_id = ?', [
        'agency',
        agencyId,
      ]);
      await connection.execute('DELETE FROM subscriptions WHERE owner_type = ? AND owner_id = ?', [
        'agency',
        agencyId,
      ]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
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

  test.afterEach(async () => {
    if (
      revenueSignupState.ownerEmails.length ||
      revenueSignupState.inviteEmails.length ||
      revenueSignupState.adminEmails.length ||
      revenueSignupState.agencyIds.length
    ) {
      await cleanupRevenueSignupState();
    }
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

    await dialog.getByLabel('Lead assignee').selectOption({ label: '[LOCAL DEMO] Agency Agent' });
    await expect(notifications.getByText('Lead assignment updated')).toBeVisible();

    await dialog.getByLabel('Buyer contact summary').fill('Agency browser smoke first response.');
    await dialog.getByLabel('Buyer contact next action').fill('Schedule buyer follow-up.');
    await dialog.getByRole('button', { name: 'Record contact and next action' }).click();
    await expect(notifications.getByText('Buyer contact attempt recorded')).toBeVisible();

    await dialog.getByLabel('Lead follow-up at').fill('2026-07-20T09:30');
    await dialog.getByPlaceholder('Follow-up note').fill('Agency browser smoke follow-up.');
    await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(notifications.getByText('Follow-up scheduled')).toBeVisible();

    const persisted = await client.agency.getLeadDetail.query({ leadId: fixtures.newBuyerLeadId });
    expect(persisted.status).toBe(TARGET_LEAD_STATUS);
    expect(persisted.agent?.name).toBe('[LOCAL DEMO] Agency Agent');
    expect(String(persisted.nextFollowUp || '')).toContain('2026-07-20');
    expect(persisted.firstRespondedAt).toBeTruthy();
    expect(persisted.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'contact_attempt',
          description: 'Agency browser smoke first response.',
          metadata: expect.objectContaining({ channel: 'call', outcome: 'reached' }),
        }),
      ]),
    );

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

  test('agency setup revenue path issues invoice, queues proof, approves, and unlocks access', async ({
    page,
    context,
  }) => {
    const smokePlan = await ensureBillingSmokePlan();
    const suffix = randomUUID().slice(0, 8);
    const ownerEmail = `agency-revenue-${suffix}@listify.local`;
    const financeAdminEmail = `agency-revenue-finance-${suffix}@listify.local`;
    const inviteEmail = `agency-revenue-agent-${suffix}@listify.local`;
    revenueSignupState.inviteEmails.push(inviteEmail);

    await createDisposableAgencyOwner(ownerEmail);
    await createDisposableSuperAdmin(financeAdminEmail);

    await page.goto('/login?mode=signin&next=/agency/setup');
    await signIn(page, ownerEmail);

    await expect(page).toHaveURL(/\/agency\/setup$/);
    await expect(page.getByRole('heading', { name: 'Agency Onboarding' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();

    const agencyName = `[E2E] Revenue Path Agency ${suffix}`;
    await page.locator('#name').fill(agencyName);
    await page.locator('#email').fill(`revenue-agency-${suffix}@listify.local`);
    await page.locator('#phone').fill('+27110000000');
    await page.locator('#website').fill('https://example.com');
    await page.locator('#address').fill('1 Revenue Path Avenue');
    await page.locator('#city').fill('Johannesburg');
    await page.locator('#province').fill('Gauteng');
    await page
      .locator('#description')
      .fill('Browser rehearsal agency for the complete manual EFT revenue path.');
    await page.getByRole('button', { name: 'Continue to Branding' }).click();

    await expect(page.getByRole('heading', { name: 'Agency Branding' })).toBeVisible();
    await page.locator('#companyName').fill(agencyName);
    await page.locator('#tagline').fill('Revenue path rehearsal');
    await page.locator('#primaryColor').first().fill('#0f766e');
    await page.locator('#secondaryColor').first().fill('#334155');
    await page.getByRole('button', { name: 'Continue to Team Setup' }).click();

    await expect(page.getByRole('heading', { name: 'Team Setup' })).toBeVisible();
    await page.locator('#inviteAgents').click();
    await page.getByPlaceholder('agent@example.com').fill(inviteEmail);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Plan Selection' }).click();

    await expect(page.getByRole('heading', { name: 'Choose Your Plan' })).toBeVisible();
    await page
      .locator('label')
      .filter({ hasText: '[LOCAL DEMO] Browser Smoke Paid Agency' })
      .click();
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: 'Continue to Payment' }).click();

    await expect(page.getByRole('heading', { name: 'Complete Setup' })).toBeVisible();
    const issueInvoiceButton = page.getByRole('button', { name: /^Issue Invoice$/ });
    await expect(issueInvoiceButton).toBeEnabled();
    await issueInvoiceButton.click();

    await expect(page).toHaveURL(/\/agency\/onboarding\/success.*invoiceId=/, {
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Invoice Issued' })).toBeVisible();
    await expect(page.getByText('EFT invoice ready')).toBeVisible();

    const successUrl = new URL(page.url());
    const invoiceId = Number(successUrl.searchParams.get('invoiceId') || 0);
    expect(invoiceId).toBeGreaterThan(0);
    const agencyId = await loadOwnerAgencyId(ownerEmail);
    expect(agencyId).toBeGreaterThan(0);

    const agencyClient = await authedTrpcClient(context);
    const issuedWorkspace = await agencyClient.billing.workspace.query();
    const issuedInvoice = (issuedWorkspace.invoices as any[]).find(
      invoice => Number(invoice.id) === invoiceId,
    );
    expect(issuedInvoice).toBeTruthy();
    expect(Number(issuedInvoice.amountDue)).toBe(smokePlan.monthlyAmountCents);
    expect(issuedInvoice.status).toBe('issued');
    expect(issuedWorkspace.bankDetails?.canIssueInvoices).toBe(true);

    await page.getByRole('button', { name: /Open Billing Workspace/ }).click();
    await expect(page).toHaveURL(/\/agency\/billing.*invoiceId=/);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByText('EFT Details')).toBeVisible();
    await expect(page.getByText(issuedInvoice.invoiceNumber).first()).toBeVisible();
    await expect(page.getByText(issuedInvoice.paymentReference).first()).toBeVisible();

    const proofBuffer = Buffer.from(`agency-signup-revenue-proof-${suffix}`);
    await page.locator('#payment-amount').fill(String(Number(issuedInvoice.amountDue || 0) / 100));
    await page.locator('#bank-reference').fill(issuedInvoice.paymentReference);
    await page.locator('#payer-name').fill(agencyName);
    await page.locator('#proof-file').setInputFiles({
      name: 'agency-signup-revenue-proof.pdf',
      mimeType: 'application/pdf',
      buffer: proofBuffer,
    });
    await page.getByRole('button', { name: /Submit proof/ }).click();
    await expect(page.getByText(/Proof submitted|submitted|under_review/i).first()).toBeVisible();

    let paymentId = 0;
    await expect
      .poll(async () => {
        const workspace = await agencyClient.billing.workspace.query();
        const payment = (workspace.payments as any[]).find(
          item => Number(item.invoiceId) === invoiceId && item.state === 'under_review',
        );
        paymentId = Number(payment?.id || 0);
        return paymentId;
      })
      .toBeGreaterThan(0);

    const pendingAccess = await agencyClient.agency.getAccessState.query();
    expect(pendingAccess.billingStatus).toBe('payment_under_review');
    expect(pendingAccess.workspaceAccess.publishing).toBe(false);

    await context.clearCookies();
    await page.goto('/login?mode=signin&next=/admin/finance');
    await signIn(page, financeAdminEmail);
    await expect(page).toHaveURL(/\/admin\/finance$/);
    await expect(page.getByRole('tab', { name: 'Payment Verification' })).toBeVisible();

    const financeRow = page.getByRole('row').filter({ hasText: issuedInvoice.invoiceNumber });
    await expect(financeRow).toBeVisible();
    await expect(financeRow.getByText(issuedInvoice.paymentReference)).toBeVisible();
    await expect(financeRow.getByRole('button', { name: /Approve/ })).toBeVisible();
    await financeRow.getByRole('button', { name: /Approve/ }).click();

    const adminClient = await authedTrpcClient(context);
    await expect
      .poll(async () => {
        const queue = await adminClient.billing.admin.financeQueue.query({ status: 'under_review' });
        return (queue.payments as any[]).some(
          row => Number(row.payment.id) === Number(paymentId),
        );
      })
      .toBe(false);

    await context.clearCookies();
    await page.goto('/login?mode=signin&next=/agency/billing');
    await signIn(page, ownerEmail);
    await expect(page).toHaveURL(/\/agency\/billing$/);
    await expect(
      page.getByText('Access is active from the canonical subscription record.').first(),
    ).toBeVisible();

    const activeClient = await authedTrpcClient(context);
    const activeAccess = await activeClient.agency.getAccessState.query();
    expect(activeAccess.billingStatus).toBe('active');
    expect(activeAccess.workspaceAccess.publishing).toBe(true);
    expect(activeAccess.workspaceAccess.reporting).toBe(true);

    const onboardingStatus = await activeClient.agency.getOnboardingStatus.query();
    expect(onboardingStatus.billingActivated).toBe(true);
    expect(onboardingStatus.fullFeaturesUnlocked).toBe(true);
    expect(onboardingStatus.agency?.id).toBe(agencyId);

    await page.goto('/agency/reporting');
    await expect(page).toHaveURL(/\/agency\/reporting$/);
    await expect(page.getByRole('heading', { name: 'Reporting', level: 1 })).toBeVisible();
  });

  test('manual EFT billing route, proof upload, finance approval, reload, and mobile layout', async ({
    page,
    context,
  }) => {
    const smokePlan = await ensureBillingSmokePlan();
    await resetBillingSmokeState();

    await page.goto('/login?mode=signin&next=/agency/billing');
    await signIn(page, AGENCY_EMAIL);

    await expect(page).toHaveURL(/\/agency\/billing$/);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByText('EFT Details')).toBeVisible();

    const agencyClient = await authedTrpcClient(context);
    const workspace = await agencyClient.billing.workspace.query();
    test.skip(!workspace?.bankDetails?.canIssueInvoices, 'Manual EFT bank details are not configured.');
    test.skip(!workspace?.proofStorage?.configured, 'Private proof storage is not configured.');
    test.skip(
      !workspace?.plans?.some(plan => Number(plan.id) === smokePlan.id),
      'Paid browser smoke billing plan is not available.',
    );

    const checkout = await agencyClient.billing.startManualEftCheckout.mutate({
      planId: smokePlan.id,
      billingCycle: 'monthly',
    });
    expect(checkout?.invoice?.id).toBeTruthy();
    expect(Number(checkout.invoice.amountDue)).toBe(smokePlan.monthlyAmountCents);
    await page.reload();
    await expect(page.getByText(checkout.invoice.invoiceNumber).first()).toBeVisible();
    await expect(page.getByText(checkout.invoice.paymentReference).first()).toBeVisible();

    const proofBuffer = Buffer.from(`billing-browser-smoke-${Date.now()}`);
    await page.locator('#payment-amount').fill(String(Number(checkout.invoice.amountDue || 0) / 100));
    await page.locator('#bank-reference').fill(checkout.invoice.paymentReference);
    await page.locator('#proof-file').setInputFiles({
      name: 'billing-browser-smoke.pdf',
      mimeType: 'application/pdf',
      buffer: proofBuffer,
    });
    await page.getByRole('button', { name: /Submit proof/ }).click();
    await expect(page.getByText(/under_review|submitted|Proof submitted/i).first()).toBeVisible();

    const pendingAccess = await agencyClient.agency.getAccessState.query();
    expect(pendingAccess.workspaceAccess.publishing).toBe(false);

    const afterUpload = await agencyClient.billing.workspace.query();
    const payment = (afterUpload.payments as any[]).find(
      item => Number(item.invoiceId) === Number(checkout.invoice.id) && item.state === 'under_review',
    );
    expect(payment?.id).toBeTruthy();

    await context.clearCookies();
    await page.goto('/login?mode=signin&next=/admin/finance');
    await signIn(page, ADMIN_EMAIL);
    await expect(page).toHaveURL(/\/admin\/finance$/);

    const adminClient = await authedTrpcClient(context);
    const queue = await adminClient.billing.admin.financeQueue.query({ status: 'under_review' });
    const queueRow = (queue.payments as any[]).find(row => Number(row.payment.id) === Number(payment.id));
    expect(queueRow?.documentId).toBeTruthy();

    const document = await adminClient.billing.admin.proofDocument.query({
      documentId: Number(queueRow.documentId),
    });
    expect(Buffer.from(document.contentBase64, 'base64').toString()).toContain(
      'billing-browser-smoke',
    );

    await adminClient.billing.admin.reviewManualPayment.mutate({
      paymentId: Number(payment.id),
      decision: 'approve',
      verifiedAmount: Number(checkout.invoice.amountDue || 0),
      note: 'Browser smoke approval.',
    });

    await context.clearCookies();
    await page.goto('/login?mode=signin&next=/agency/billing');
    await signIn(page, AGENCY_EMAIL);
    await expect(page).toHaveURL(/\/agency\/billing$/);

    const activeClient = await authedTrpcClient(context);
    const activeAccess = await activeClient.agency.getAccessState.query();
    expect(activeAccess.billingStatus).toBe('active');
    expect(activeAccess.workspaceAccess.publishing).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/agency/billing');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Billing' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

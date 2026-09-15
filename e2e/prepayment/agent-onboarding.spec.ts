import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const runtimeLog = '/tmp/property-listify-mvp-prepayment-browser-runtime.log';
const apiOrigin = 'http://localhost:5000';
const webOrigin = 'http://localhost:5177';

type Row = Record<string, unknown>;

let connection: AuthoritySqlConnection | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection)
    throw new Error('Pre-payment browser verification connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function latestVerificationToken(): string | null {
  try {
    const log = readFileSync(runtimeLog, 'utf8');
    const matches = [
      ...log.matchAll(/\[Email Local Dev\] Verification URL: .*?[?&]token=([a-f0-9]{64})/g),
    ];
    return matches.at(-1)?.[1] || null;
  } catch {
    return null;
  }
}

async function waitForVerificationToken(previousToken: string | null = null): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const token = latestVerificationToken();
    if (token && token !== previousToken) return token;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for the local development verification link.');
}

test.describe('pre-payment onboarding browser acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('keeps the public advertising entry and role chooser in preparation-only state', async ({
    page,
  }) => {
    await page.goto('/advertise');

    await expect(
      page.getByRole('heading', {
        name: 'Prepare your Property Listify workspace before commercial activation.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Preparation-only onboarding')).toBeVisible();
    await expect(page.getByText(/90-Day Launch Access/i)).toHaveCount(0);
    await expect(page.getByText(/manual EFT/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Start Agent preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    await expect(page.getByRole('link', { name: 'Start Agency preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    await expect(page.getByRole('link', { name: 'Start Developer preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );

    await page.goto('/advertise/sell');
    await expect(
      page.getByRole('heading', {
        name: 'Choose your Property Listify preparation path',
      }),
    ).toBeVisible();
    await expect(page.getByText('Preparation-only onboarding')).toBeVisible();
    await expect(page.getByText('Choose Your Launch Access', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/manual EFT/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Start Agent preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    await expect(page.getByRole('link', { name: 'Start Agency preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    await expect(page.getByRole('link', { name: 'Start Developer preparation' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
  });

  test('routes the public Agent entry point into truthful preparation onboarding', async ({
    page,
  }) => {
    await page.goto('/advertise/sell/agents');

    await expect(
      page.getByRole('heading', {
        name: 'Establish your Agent presence and prepare private inventory.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Preparation-only onboarding')).toBeVisible();
    await expect(
      page.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeVisible();
    await expect(page.getByText('R499')).toHaveCount(0);
    await expect(page.getByText(/manual EFT/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Get Agent Launch Access' })).toHaveCount(0);

    const startPreparation = page.getByRole('link', { name: 'Start Agent preparation' }).first();
    await expect(startPreparation).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2Fagent%2Fsetup&role=agent',
    );
    await startPreparation.click();
    await expect(page).toHaveURL(/\/login\?mode=register&next=%2Fagent%2Fsetup&role=agent/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set up Agent OS' })).toBeVisible();
  });

  test('routes the public Agency entry point into truthful preparation onboarding', async ({
    page,
  }) => {
    await page.goto('/advertise/sell/agencies');

    await expect(
      page.getByRole('heading', {
        name: 'Establish your Agency workspace and prepare private inventory.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Preparation-only onboarding')).toBeVisible();
    await expect(
      page.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeVisible();
    await expect(page.getByText(/manual EFT/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request Launch Access invoice' })).toHaveCount(0);

    const startPreparation = page.getByRole('link', { name: 'Start Agency preparation' }).first();
    await expect(startPreparation).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2Fagency%2Fsetup&role=agency_admin',
    );
    await startPreparation.click();
    await expect(page).toHaveURL(/\/login\?mode=register&next=%2Fagency%2Fsetup&role=agency_admin/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to agency setup' })).toBeVisible();
  });

  test('routes the public Developer entry point into truthful preparation onboarding', async ({
    page,
  }) => {
    await page.goto('/advertise/sell/developers');

    await expect(
      page.getByRole('heading', {
        name: 'Establish your Developer organisation and prepare private projects.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Preparation-only onboarding')).toBeVisible();
    await expect(
      page.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeVisible();
    await expect(page.getByText('R1,499')).toHaveCount(0);
    await expect(page.getByText(/manual EFT/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request Launch Access invoice' })).toHaveCount(0);

    const startPreparation = page
      .getByRole('link', { name: 'Start Developer preparation' })
      .first();
    await expect(startPreparation).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2Fdeveloper%2Fsetup&role=property_developer',
    );
    await startPreparation.click();
    await expect(page).toHaveURL(
      /\/login\?mode=register&next=%2Fdeveloper%2Fsetup&role=property_developer/,
    );
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue to company onboarding' }),
    ).toBeVisible();
  });

  test('registers, verifies, establishes a professional presence, and enters private listing preparation', async ({
    page,
  }) => {
    const email = `browser-preparation-${randomUUID()}@invalid.example`;
    const password = `Browser!${randomUUID()}9a`;
    const displayName = 'Browser Preparation Agent';
    const bio =
      'A prospective Property Listify professional preparing a private inventory workspace.';
    const previousVerificationToken = latestVerificationToken();

    await page.goto('/login?mode=register');
    await page.getByRole('button', { name: 'Real Estate Agent' }).click();

    const registration = page.getByRole('dialog');
    await expect(registration.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await registration.locator('input[name="name"]').fill(displayName);
    await registration.locator('input[name="email"]').fill(email);
    await registration.locator('input[name="phoneNumber"]').fill('+27820000000');
    await registration.locator('input[name="password"]').fill(password);
    await registration.locator('input[name="confirmPassword"]').fill(password);

    const registrationResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    );
    await registration.getByRole('button', { name: 'Set up Agent OS' }).click();
    expect((await registrationResponse).status()).toBe(201);
    await expect(page.getByRole('dialog', { name: 'Welcome back' })).toBeVisible();

    // The token comes from the normal local development email transport. The
    // browser follows the actual verification endpoint and receives its real
    // session cookie from that endpoint.
    const verificationToken = await waitForVerificationToken(previousVerificationToken);
    await page.goto(
      `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`,
    );
    await expect(page).toHaveURL(/\/agent\/setup\?verified=true/);
    await expect(page.getByRole('heading', { name: 'Finish your agent setup' })).toBeVisible();

    await page.locator('input[placeholder="Jane Doe"]').fill(displayName);
    await page.locator('input[placeholder="+27 82 000 0000"]').first().fill('+27820000000');
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    const coverageSearch = page.getByPlaceholder('Search suburb, city, or province');
    await coverageSearch.fill('Sandton');
    const coverageChoice = page.locator('[cmdk-item]').filter({ hasText: 'Sandton' }).first();
    await expect(coverageChoice).toBeVisible();
    await coverageChoice.click();
    await expect(page.locator('button[aria-label^="Remove "]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await page
      .getByPlaceholder('Tell clients about your experience and what you specialize in.')
      .fill(bio);
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page).toHaveURL(/\/agent\/dashboard/);

    // This is the intentional pre-payment state: profile and private-draft
    // preparation work are available, while submission and marketplace
    // publishing remain behind commercial activation.
    await page.goto('/listings/create');
    await expect(page.getByRole('status')).toContainText('Prepare your listing before activation');
    await expect(page.getByRole('status')).toContainText(
      'Submission and marketplace publishing require completed onboarding, approval and commercial activation.',
    );
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Prepare your listing before activation');

    const [persisted] = await query(
      `SELECT u.emailVerified, u.role, a.displayName, a.phone, a.bio, a.areasServed, a.agencyId
         FROM users u
         INNER JOIN agents a ON a.userId = u.id
         WHERE u.email = ?
         LIMIT 1`,
      [email],
    );
    expect(persisted).toMatchObject({
      emailVerified: 1,
      role: 'agent',
      displayName,
      phone: '+27820000000',
      bio,
      agencyId: null,
    });
    const coverage = JSON.parse(String(persisted.areasServed || '[]')) as Array<{
      canonicalLocationId?: unknown;
      label?: unknown;
    }>;
    expect(coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalLocationId: expect.stringMatching(/^suburb:\d+$/),
          label: 'Sandton, Johannesburg, Gauteng',
        }),
      ]),
    );
  });

  test('registers and verifies an agency owner, saves a pre-payment agency workspace, and leaves billing inactive', async ({
    page,
  }) => {
    const suffix = randomUUID();
    const email = `browser-agency-${suffix}@invalid.example`;
    const password = `Browser!${randomUUID()}9a`;
    const ownerName = 'Browser Agency Owner';
    const agencyName = `Browser Agency ${suffix.slice(0, 8)}`;
    const companyName = `${agencyName} Realty`;
    const previousVerificationToken = latestVerificationToken();

    await page.goto('/login?mode=register');
    await page.getByRole('button', { name: 'Agency' }).click();

    const registration = page.getByRole('dialog');
    await expect(registration.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await registration.locator('input[name="name"]').fill(ownerName);
    await registration.locator('input[name="email"]').fill(email);
    await registration.locator('input[name="password"]').fill(password);
    await registration.locator('input[name="confirmPassword"]').fill(password);

    const registrationResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    );
    await registration.getByRole('button', { name: 'Continue to agency setup' }).click();
    expect((await registrationResponse).status()).toBe(201);
    await expect(page.getByRole('dialog', { name: 'Welcome back' })).toBeVisible();

    const verificationToken = await waitForVerificationToken(previousVerificationToken);
    await page.goto(
      `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`,
    );
    await expect(page).toHaveURL(/\/agency\/setup\?verified=true/);
    await expect(
      page.getByRole('heading', { name: 'Build your Agency operating workspace' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /save the commercial selection that will guide activation when it becomes available/i,
      ),
    ).toBeVisible();

    await page.locator('#name').fill(agencyName);
    await page.locator('#email').fill(email);
    await page.locator('#phone').fill('+27820000001');
    await page.locator('#address').fill('1 Browser Avenue');
    await page.locator('#city').fill('Johannesburg');
    await page.locator('#province').fill('Gauteng');
    await page
      .locator('#description')
      .fill('A prospective agency establishing its Property Listify preparation workspace.');
    await page.getByRole('button', { name: 'Continue to Agency identity' }).click();

    await page.locator('#companyName').fill(companyName);
    await page.locator('#tagline').fill('Prepared for the next commercial activation step.');
    await page.getByRole('button', { name: 'Continue to Team launch' }).click();
    await page.getByRole('button', { name: 'Continue to Launch Access' }).click();

    await expect(
      page.getByText(/does not issue an invoice, request payment, or activate publishing/i),
    ).toBeVisible();
    const selectedPlan = page.locator('label[for^="plan-"]').first();
    await expect(selectedPlan).toBeVisible();
    await selectedPlan.click();
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: 'Review onboarding' }).click();

    await expect(
      page.getByRole('heading', { name: 'Prepare your agency for activation' }),
    ).toBeVisible();
    await expect(
      page.getByText(/this step does not request payment or activate publishing/i),
    ).toBeVisible();

    const onboardingResponse = page.waitForResponse(
      response =>
        response.url().includes('agency.createOnboarding') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save and open workspace' }).click();
    expect((await onboardingResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/agency\/overview/);
    await expect(page.getByTestId('agency-shell')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Prepare your agency before activation' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /publishing and team activation remain subject to approval and the required commercial entitlement/i,
      ),
    ).toBeVisible();
    await expect(page.getByText(/commercial activation is not available yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prepare inventory' })).toBeVisible();
    await expect(page.getByText(/your invoice is ready/i)).toHaveCount(0);

    const [persisted] = await query(
      `SELECT u.emailVerified AS emailVerified,
              u.role,
              u.agencyId AS agencyId,
              a.name AS agencyName,
              a.email AS agencyEmail,
              a.city,
              a.province,
              ab.companyName AS companyName
         FROM users u
         INNER JOIN agencies a ON a.id = u.agencyId
         INNER JOIN agency_branding ab ON ab.agencyId = a.id
         WHERE u.email = ?
         LIMIT 1`,
      [email],
    );
    expect(persisted).toMatchObject({
      emailVerified: 1,
      role: 'agency_admin',
      agencyName,
      agencyEmail: email,
      city: 'Johannesburg',
      province: 'Gauteng',
      companyName,
    });
    expect(Number(persisted.agencyId)).toBeGreaterThan(0);

    const [subscription] = await query(
      `SELECT s.status, s.plan_id AS planId
         FROM subscriptions s
         INNER JOIN billable_accounts account ON account.id = s.billable_account_id
         WHERE account.account_kind = 'agency'
           AND account.agency_id = ?
           AND s.owner_type = 'agency'
         LIMIT 1`,
      [persisted.agencyId],
    );
    expect(subscription).toMatchObject({ status: 'pending_payment' });
    expect(Number(subscription.planId)).toBeGreaterThan(0);

    const [invoiceCount] = await query(
      `SELECT COUNT(*) AS total
         FROM billing_invoices
         WHERE owner_type = 'agency' AND owner_id = ?`,
      [persisted.agencyId],
    );
    expect(Number(invoiceCount.total)).toBe(0);
  });

  test('returns a verified invitee through account entry but preserves queued team containment before activation', async ({
    page,
    browser,
  }) => {
    const suffix = randomUUID();
    const inviteeEmail = `browser-queued-invitee-${suffix}@invalid.example`;
    const inviteePassword = `Browser!${randomUUID()}9a`;
    const ownerEmail = `browser-queued-owner-${suffix}@invalid.example`;
    const ownerPassword = `Browser!${randomUUID()}9a`;
    const agencyName = `Queued Invitation Agency ${suffix.slice(0, 8)}`;
    const companyName = `${agencyName} Realty`;

    // Establish the invited account through the ordinary registration and
    // verification journey first. A fresh browser context later proves that
    // the invitation returns through canonical account entry rather than
    // inheriting this account's session.
    const inviteeRegistrationContext = await browser.newContext();
    const inviteeRegistrationPage = await inviteeRegistrationContext.newPage();
    try {
      const previousInviteeVerificationToken = latestVerificationToken();
      await inviteeRegistrationPage.goto(`${webOrigin}/login?mode=register`);
      await inviteeRegistrationPage.getByRole('button', { name: 'Buyer / User' }).click();
      const registration = inviteeRegistrationPage.getByRole('dialog');
      await expect(
        registration.getByRole('heading', { name: 'Create your account' }),
      ).toBeVisible();
      await registration.locator('input[name="name"]').fill('Queued Invitation Invitee');
      await registration.locator('input[name="email"]').fill(inviteeEmail);
      await registration.locator('input[name="password"]').fill(inviteePassword);
      await registration.locator('input[name="confirmPassword"]').fill(inviteePassword);
      const registrationResponse = inviteeRegistrationPage.waitForResponse(
        response =>
          response.url().includes('/api/auth/register') && response.request().method() === 'POST',
      );
      await registration.getByRole('button', { name: 'Create free account' }).click();
      expect((await registrationResponse).status()).toBe(201);

      const verificationToken = await waitForVerificationToken(previousInviteeVerificationToken);
      await inviteeRegistrationPage.goto(
        `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`,
      );
      await expect(inviteeRegistrationPage).toHaveURL(/\/user\/dashboard\?verified=true/);
    } finally {
      await inviteeRegistrationContext.close();
    }

    // The agency owner follows the normal pre-payment onboarding wizard and
    // queues, rather than delivers, an invitation for the verified account.
    const previousOwnerVerificationToken = latestVerificationToken();
    await page.goto('/login?mode=register');
    await page.getByRole('button', { name: 'Agency' }).click();
    const ownerRegistration = page.getByRole('dialog');
    await ownerRegistration.locator('input[name="name"]').fill('Queued Invitation Owner');
    await ownerRegistration.locator('input[name="email"]').fill(ownerEmail);
    await ownerRegistration.locator('input[name="password"]').fill(ownerPassword);
    await ownerRegistration.locator('input[name="confirmPassword"]').fill(ownerPassword);
    const ownerRegistrationResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    );
    await ownerRegistration.getByRole('button', { name: 'Continue to agency setup' }).click();
    expect((await ownerRegistrationResponse).status()).toBe(201);

    const ownerVerificationToken = await waitForVerificationToken(previousOwnerVerificationToken);
    await page.goto(
      `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(ownerVerificationToken)}`,
    );
    await expect(page).toHaveURL(/\/agency\/setup\?verified=true/);

    await page.locator('#name').fill(agencyName);
    await page.locator('#email').fill(ownerEmail);
    await page.locator('#phone').fill('+27820000002');
    await page.locator('#address').fill('2 Queued Invitation Avenue');
    await page.locator('#city').fill('Johannesburg');
    await page.locator('#province').fill('Gauteng');
    await page
      .locator('#description')
      .fill('An agency confirming that a queued team invitation cannot create access early.');
    await page.getByRole('button', { name: 'Continue to Agency identity' }).click();
    await page.locator('#companyName').fill(companyName);
    await page.getByRole('button', { name: 'Continue to Team launch' }).click();
    await page.locator('#inviteAgents').click();
    await page.getByPlaceholder('agent@example.com').fill(inviteeEmail);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(inviteeEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Launch Access' }).click();
    await page.locator('label[for^="plan-"]').first().click();
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: 'Review onboarding' }).click();
    const onboardingResponse = page.waitForResponse(
      response =>
        response.url().includes('agency.createOnboarding') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save and open workspace' }).click();
    expect((await onboardingResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/agency\/overview/);

    // The token is read only from the exact task-owned target for this
    // counterfactual containment proof. It is never rendered or logged, and
    // no invitation email is sent while the agency remains pre-payment.
    const [queuedInvitation] = await query(
      `SELECT i.token AS token,
              i.status AS invitationStatus,
              i.agencyId AS agencyId,
              s.status AS subscriptionStatus,
              (
                SELECT COUNT(*)
                FROM billing_invoices invoice
                WHERE invoice.owner_type = 'agency' AND invoice.owner_id = i.agencyId
              ) AS invoiceCount
         FROM invitations i
         INNER JOIN agencies a ON a.id = i.agencyId
         INNER JOIN subscriptions s
           ON s.owner_type = 'agency' AND s.owner_id = i.agencyId
         WHERE a.email = ? AND i.email = ?
         ORDER BY i.id DESC
         LIMIT 1`,
      [ownerEmail, inviteeEmail],
    );
    expect(queuedInvitation).toMatchObject({
      invitationStatus: 'pending',
      subscriptionStatus: 'pending_payment',
    });
    expect(Number(queuedInvitation.agencyId)).toBeGreaterThan(0);
    expect(Number(queuedInvitation.invoiceCount)).toBe(0);
    const invitationToken = String(queuedInvitation.token || '');
    expect(invitationToken).toMatch(/^[a-f0-9]{64}$/i);

    const acceptanceContext = await browser.newContext();
    const acceptancePage = await acceptanceContext.newPage();
    try {
      await acceptancePage.goto(
        `${webOrigin}/accept-invitation?token=${encodeURIComponent(invitationToken)}`,
      );
      await expect(
        acceptancePage.getByRole('heading', { name: "You've Been Invited!" }),
      ).toBeVisible();
      await acceptancePage.getByRole('button', { name: 'Log In / Register' }).click();
      await expect(acceptancePage).toHaveURL(
        /\/login\?mode=signin&next=%2Faccept-invitation%3Ftoken%3D/,
      );

      const signIn = acceptancePage.getByRole('dialog', { name: 'Welcome back' });
      await expect(
        signIn.getByText(/you will be returned to \/accept-invitation\?token=/i),
      ).toBeVisible();
      await signIn.getByPlaceholder('you@example.com').fill(inviteeEmail);
      await signIn.getByPlaceholder('Enter your password').fill(inviteePassword);
      const loginResponse = acceptancePage.waitForResponse(
        response =>
          response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      );
      await signIn.getByRole('button', { name: 'Sign in' }).click();
      expect((await loginResponse).status()).toBe(200);
      await expect(acceptancePage).toHaveURL(/\/accept-invitation\?token=/);

      const acceptanceResponse = acceptancePage.waitForResponse(
        response =>
          response.url().includes('invitation.accept') && response.request().method() === 'POST',
      );
      await acceptancePage.getByRole('button', { name: 'Accept Invitation' }).click();
      expect((await acceptanceResponse).status()).toBe(412);
      await expect(
        acceptancePage.getByText('Agency team access is available after commercial activation.'),
      ).toBeVisible();
    } finally {
      await acceptanceContext.close();
    }

    const [unchanged] = await query(
      `SELECT u.emailVerified AS emailVerified,
              u.role AS role,
              u.agencyId AS userAgencyId,
              i.status AS invitationStatus,
              (
                SELECT COUNT(*) FROM agents profile WHERE profile.userId = u.id
              ) AS agentProfileCount
         FROM users u
         INNER JOIN invitations i ON i.email = u.email
         WHERE u.email = ? AND i.agencyId = ?
         ORDER BY i.id DESC
         LIMIT 1`,
      [inviteeEmail, queuedInvitation.agencyId],
    );
    expect(unchanged).toMatchObject({
      emailVerified: 1,
      role: 'visitor',
      userAgencyId: null,
      invitationStatus: 'pending',
    });
    expect(Number(unchanged.agentProfileCount)).toBe(0);
  });
});

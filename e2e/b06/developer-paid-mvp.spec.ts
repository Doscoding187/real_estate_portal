import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const runId = randomUUID();
const apiOrigin = 'http://localhost:5000';
const emailCapture = '/tmp/property-listify-b06-developer-paid-mvp-email-capture.jsonl';
const reviewerEmail = 'ple-reviewer@listify.local';
const ownerEmail = `b06-developer-${runId}@invalid.example`;
const ownerPassword = `B06!${randomUUID()}9a`;
const developerName = `B06 Developer ${runId.slice(0, 8)}`;
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0uQAAAABJRU5ErkJggg==',
  'base64',
);

type Row = Record<string, unknown>;
type CapturedVerification = {
  kind: 'developer_verification';
  to: string;
  subject: string;
  verificationUrl: string;
  capturedAt: string;
};

let connection: AuthoritySqlConnection | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection) throw new Error('B06 Database Authority connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function capturedVerifications(): CapturedVerification[] {
  try {
    return readFileSync(emailCapture, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(line => {
        try {
          const value = JSON.parse(line) as CapturedVerification;
          return value.kind === 'developer_verification' ? [value] : [];
        } catch {
          // A concurrently appended final line may be incomplete briefly.
          return [];
        }
      });
  } catch {
    return [];
  }
}

async function waitForVerificationEmail(
  recipient: string,
  previousCount: number,
): Promise<CapturedVerification> {
  let captured: CapturedVerification | undefined;
  await expect
    .poll(
      () => {
        const messages = capturedVerifications()
          .slice(previousCount)
          .filter(message => message.to.toLowerCase() === recipient.toLowerCase());
        captured = messages[messages.length - 1];
        return Boolean(captured);
      },
      { intervals: [250, 500, 1_000], timeout: 30_000 },
    )
    .toBe(true);
  if (!captured) throw new Error('The governed B06 transport did not capture the verification email.');

  // Never reconstruct a token or extract one from SQL. The only link source
  // is the actual application-generated message stored in this private file.
  const parsed = new URL(captured.verificationUrl);
  expect(parsed.origin).toBe(apiOrigin);
  expect(parsed.pathname).toBe('/api/auth/verify-email');
  expect(parsed.searchParams.has('token')).toBe(true);
  return captured;
}

function reviewerPassword(): string {
  const password = process.env.LOCAL_PLE_REVIEWER_PASSWORD;
  if (!password) throw new Error('B06 needs the governed local finance/reviewer credential.');
  return password;
}

function withFreshCaptureRequestId(postData: string, nextCaptureRequestId: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(postData);
  } catch {
    throw new Error('B06 could not read the actual public enquiry request payload.');
  }

  let replaced = false;
  const replace = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(replace);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => {
        if (key === 'captureRequestId') {
          replaced = true;
          return [key, nextCaptureRequestId];
        }
        return [key, replace(child)];
      }),
    );
  };

  const updated = replace(parsed);
  if (!replaced) {
    throw new Error('B06 public enquiry request did not contain the canonical capture request ID.');
  }
  return JSON.stringify(updated);
}

async function signIn(page: Page, input: { email: string; password: string; target: string }) {
  await page.goto(`/login?mode=signin&next=${encodeURIComponent(input.target)}`);
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('you@example.com').fill(input.email);
  await dialog.getByPlaceholder('Enter your password').fill(input.password);
  const response = page.waitForResponse(
    candidate => candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`${input.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}

async function signInAsReviewer(page: Page, target: string) {
  await signIn(page, { email: reviewerEmail, password: reviewerPassword(), target });
}

async function selectRadixOption(page: Page, triggerText: string, optionText: string) {
  const trigger = page.getByText(triggerText, { exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole('option', { name: optionText, exact: true }).click();
}

async function advanceDevelopmentWizard(page: Page, expectedHeading: string) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: expectedHeading, exact: true }).first()).toBeVisible();
}

async function completeDeveloperOrganisationSetup(page: Page) {
  await expect(page.getByRole('heading', { name: 'Developer Registration' })).toBeVisible();
  await page.getByPlaceholder('Enter your company name').fill(developerName);
  await page
    .getByPlaceholder("Describe your company's focus and expertise...")
    .fill('A real B06 Developer organisation completing the paid development and enquiry journey.');
  await selectRadixOption(page, 'Select your primary focus', 'Residential Development');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();

  await page.getByPlaceholder('contact@yourcompany.com').fill(ownerEmail);
  await page.getByPlaceholder('+27 11 123 4567').fill('+27115550106');
  await page.getByPlaceholder('123 Business Street, Business Park').fill('6 B06 Developer Road');
  await page.getByPlaceholder('Cape Town').fill('Johannesburg');
  await selectRadixOption(page, 'Select province', 'Gauteng');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();

  await page
    .getByRole('button', { name: 'Select Residential specialization', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByLabel(/I agree to the terms and conditions/i).check();
  const submitted = page.waitForResponse(
    candidate => candidate.url().includes('developer.createProfile') && candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /Submit.*Application/i }).click();
  expect((await submitted).status()).toBe(200);
  await expect(page).toHaveURL(/\/developer\/dashboard\?setup=complete/);
}

test.describe('B06 Developer paid MVP controlled acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    if (
      authority.context.targetClass !== 'disposable-worktree' ||
      authority.context.targetFingerprintHash !== process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT
    ) {
      throw new Error('B06 requires the exact task-owned disposable Database Authority target.');
    }
    connection = await createAuthoritySqlConnection(
      authority,
      authorizeDatabaseOperation(authority, { root: process.cwd() }),
    );
    reviewerPassword();
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('registers, verifies, establishes and approves a Developer organisation before payment', async ({
    page: ownerPage,
    browser,
  }) => {
    const reviewerContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    let organisationId = 0;
    let publisherId = 0;
    let billableAccountId = 0;
    let subscriptionId = 0;
    let developmentId = 0;
    let unitTypeId = '';
    let developmentSlug = '';
    let leadId = 0;
    let ownerUserId = 0;
    let publicCaptureUrl = '';
    let publicCaptureContentType = 'application/json';
    let publicCapturePostData = '';
    let publishRequestUrl = '';
    let publishRequestPostData = '';

    try {
      await test.step('Developer-only commercial surface and real registration', async () => {
        await ownerPage.goto('/advertise/sell/developers');
        await expect(ownerPage.getByTestId('developer-launch-access-card')).toBeVisible();
        await expect(ownerPage.getByText(/R\s?1[\s,]?499/).first()).toBeVisible();
        await expect(ownerPage.getByText(/once-off/i).first()).toBeVisible();
        await expect(ownerPage.getByText(/90 days/i).first()).toBeVisible();
        await expect(ownerPage.getByText(/no automatic renewal/i).first()).toBeVisible();
        const launchCard = ownerPage.getByTestId('developer-launch-access-card');
        await expect(launchCard).not.toContainText(/PayFast|card payment/i);
        await expect(ownerPage.getByRole('link', { name: /PayFast|card payment|monthly subscription/i })).toHaveCount(0);
        await expect(ownerPage.getByRole('button', { name: /PayFast|card payment|monthly subscription/i })).toHaveCount(0);

        const initialCaptures = capturedVerifications().length;
        await ownerPage
          .getByTestId('developer-launch-access-card')
          .getByRole('link')
          .click();
        await expect(ownerPage).toHaveURL(/\/login\?mode=register.*role=property_developer/);
        const registration = ownerPage.getByRole('dialog');
        await registration.locator('input[name="name"]').fill('B06 Developer Principal');
        await registration.locator('input[name="email"]').fill(ownerEmail);
        await registration.locator('input[name="password"]').fill(ownerPassword);
        await registration.locator('input[name="confirmPassword"]').fill(ownerPassword);
        const registered = ownerPage.waitForResponse(
          candidate => candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST',
        );
        await registration.getByRole('button', { name: 'Continue to company onboarding' }).click();
        expect((await registered).status()).toBe(201);

        // Registration alone does not create an authenticated Developer workspace.
        await ownerPage.goto(`/login?mode=signin&next=${encodeURIComponent('/developer/dashboard')}`);
        const unverified = ownerPage.getByRole('dialog', { name: 'Welcome back' });
        await unverified.getByPlaceholder('you@example.com').fill(ownerEmail);
        await unverified.getByPlaceholder('Enter your password').fill(ownerPassword);
        const rejected = ownerPage.waitForResponse(
          candidate => candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
        );
        await unverified.getByRole('button', { name: 'Sign in' }).click();
        // The login boundary deliberately does not disclose whether a valid
        // account is merely unverified; either canonical denial status keeps
        // the Developer workspace inaccessible before verification.
        expect([401, 403]).toContain((await rejected).status());

        const verification = await waitForVerificationEmail(ownerEmail, initialCaptures);
        await ownerPage.goto(verification.verificationUrl);
        await expect(ownerPage).toHaveURL(/\/developer\/setup\?verified=true/);
      });

      await test.step('Mounted organisation setup creates exactly one pending organisation and publisher', async () => {
        await completeDeveloperOrganisationSetup(ownerPage);
        const [identity] = await query(
          `SELECT organisation.id AS organisationId, organisation.status AS organisationStatus,
                  membership.id AS membershipId, membership.user_id AS membershipUserId,
                  membership.status AS membershipStatus, membership.role AS membershipRole,
                  publisher.id AS publisherId, publisher.authority_kind AS authorityKind,
                  publisher.developer_organisation_id AS publisherOrganisationId
             FROM users principal
             INNER JOIN developer_organisation_memberships membership ON membership.user_id = principal.id
             INNER JOIN developer_organisations organisation ON organisation.id = membership.organisation_id
             INNER JOIN catalogue_publishers publisher ON publisher.developer_organisation_id = organisation.id
            WHERE principal.email = ?`,
          [ownerEmail],
        );
        expect(identity).toMatchObject({
          organisationStatus: 'pending',
          membershipStatus: 'active',
          membershipRole: 'owner',
          authorityKind: 'developer_first_party',
        });
        expect(Number(identity.organisationId)).toBeGreaterThan(0);
        expect(Number(identity.publisherId)).toBeGreaterThan(0);
        expect(Number(identity.publisherOrganisationId)).toBe(Number(identity.organisationId));
        organisationId = Number(identity.organisationId);
        publisherId = Number(identity.publisherId);

        const [counts] = await query(
          `SELECT COUNT(*) AS organisations,
                  COUNT(DISTINCT publisher.id) AS publishers
             FROM users principal
             INNER JOIN developer_organisation_memberships membership ON membership.user_id = principal.id
             INNER JOIN developer_organisations organisation ON organisation.id = membership.organisation_id
             LEFT JOIN catalogue_publishers publisher ON publisher.developer_organisation_id = organisation.id
            WHERE principal.email = ? AND membership.status = 'active'`,
          [ownerEmail],
        );
        expect(counts).toMatchObject({ organisations: 1, publishers: 1 });
      });

      await test.step('A distinct privileged reviewer approves the organisation without creating paid access', async () => {
        await signInAsReviewer(reviewerPage, '/admin/developers');
        await expect(reviewerPage.getByRole('heading', { name: 'Developers' })).toBeVisible();
        const organisationCard = reviewerPage
          .getByText(developerName, { exact: true })
          .locator('xpath=ancestor::div[.//button[normalize-space()="Approve"]][1]');
        await expect(organisationCard).toBeVisible();
        reviewerPage.once('dialog', dialog => dialog.accept());
        const approved = reviewerPage.waitForResponse(
          candidate =>
            candidate.url().includes('developer.adminApproveDeveloper') &&
            candidate.request().method() === 'POST',
        );
        await organisationCard.getByRole('button', { name: 'Approve', exact: true }).click();
        expect((await approved).status()).toBe(200);
        await expect(reviewerPage.getByText('Developer approved successfully')).toBeVisible();

        const [approvalOnly] = await query(
          `SELECT organisation.status AS organisationStatus,
                  COUNT(subscription.id) AS subscriptions,
                  SUM(CASE WHEN subscription.status IN ('active', 'grace_period') THEN 1 ELSE 0 END) AS activeTerms
             FROM developer_organisations organisation
             LEFT JOIN subscriptions subscription
               ON subscription.owner_type = 'developer' AND subscription.owner_id = organisation.id
            WHERE organisation.id = (SELECT membership.organisation_id
               FROM developer_organisation_memberships membership
               INNER JOIN users principal ON principal.id = membership.user_id
              WHERE principal.email = ? AND membership.status = 'active')
            GROUP BY organisation.id, organisation.status`,
          [ownerEmail],
        );
        expect(approvalOnly.organisationStatus).toBe('approved');
        // Approval governs organisation identity only. B03 creates the
        // billable account and subscription when the actual product invoice
        // is issued, so approval must leave both counts at zero here.
        expect(Number(approvalOnly.subscriptions)).toBe(0);
        expect(Number(approvalOnly.activeTerms)).toBe(0);
      });

      await test.step('The approved organisation issues and resumes one exact Developer Launch Access invoice', async () => {
        await ownerPage.goto('/developer/plans');
        await expect(ownerPage.getByRole('heading', { name: 'Scale Your Property Development Business' })).toBeVisible();
        await expect(ownerPage.getByText('Developer Launch Access', { exact: true })).toBeVisible();
        await expect(ownerPage.getByText(/R\s?1[\s,]?499/).first()).toBeVisible();
        await expect(ownerPage.getByText('Paid Launch Access · 90 days', { exact: true })).toBeVisible();
        const requestInvoice = ownerPage.getByRole('button', {
          name: 'Request Launch Access invoice',
          exact: true,
        });
        await expect(requestInvoice).toBeEnabled();
        await requestInvoice.click();
        const confirmation = ownerPage.getByRole('dialog');
        await expect(confirmation.getByText(/once-off for 90 days and does not renew automatically/i)).toBeVisible();
        const issued = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('billing.requestDeveloperLaunchAccessInvoice') &&
            candidate.request().method() === 'POST',
        );
        await confirmation.getByRole('button', { name: 'Continue', exact: true }).click();
        expect((await issued).status()).toBe(200);
        await expect(ownerPage).toHaveURL(/\/developer\/subscription\?invoiceId=\d+/);

        const [billing] = await query(
          `SELECT account.id AS billableAccountId, account.account_kind AS accountKind,
                  account.developer_organisation_id AS accountOrganisationId,
                  subscription.id AS subscriptionId, subscription.owner_type AS ownerType,
                  subscription.owner_id AS ownerId, subscription.status AS subscriptionStatus,
                  plan.name AS planName, invoice.id AS invoiceId, invoice.amount_due AS amountDue,
                  invoice.status AS invoiceStatus
             FROM billable_accounts account
             INNER JOIN subscriptions subscription ON subscription.billable_account_id = account.id
             INNER JOIN plans plan ON plan.id = subscription.plan_id
             INNER JOIN billing_invoices invoice ON invoice.subscription_id = subscription.id
            WHERE account.account_kind = 'developer' AND account.developer_organisation_id = ?
            ORDER BY invoice.id DESC LIMIT 1`,
          [organisationId],
        );
        expect(billing).toMatchObject({
          accountKind: 'developer',
          accountOrganisationId: organisationId,
          ownerType: 'developer',
          ownerId: organisationId,
          subscriptionStatus: 'pending_payment',
          planName: 'developer_launch_access',
          amountDue: 149900,
          invoiceStatus: 'issued',
        });
        billableAccountId = Number(billing.billableAccountId);
        subscriptionId = Number(billing.subscriptionId);

        // A reload and repeated choice must resume the canonical outstanding
        // invoice rather than allocating another commercial state.
        await ownerPage.goto('/developer/plans');
        await ownerPage.getByRole('button', { name: 'Request Launch Access invoice', exact: true }).click();
        const resumed = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('billing.requestDeveloperLaunchAccessInvoice') &&
            candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('dialog').getByRole('button', { name: 'Continue', exact: true }).click();
        expect((await resumed).status()).toBe(200);
        const [invoiceCount] = await query(
          'SELECT COUNT(*) AS total FROM billing_invoices WHERE billable_account_id = ?',
          [billableAccountId],
        );
        expect(Number(invoiceCount.total)).toBe(1);
      });

      await test.step('Private EFT proof stays under finance review until a distinct finance approval', async () => {
        await ownerPage.goto('/developer/subscription');
        await expect(ownerPage.getByText('Developer Launch Access invoice', { exact: true })).toBeVisible();
        await ownerPage.locator('#developer-payment-amount').fill('1499.00');
        await ownerPage.locator('#developer-bank-reference').fill(`B06-EFT-${runId.slice(0, 8)}`);
        await ownerPage.locator('#developer-payer-name').fill(developerName);
        await ownerPage.locator('#developer-proof-file').setInputFiles({
          name: 'b06-developer-proof.png',
          mimeType: 'image/png',
          buffer: onePixelPng,
        });
        const proof = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('billing.submitDeveloperPaymentProof') &&
            candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Submit proof for review', exact: true }).click();
        expect((await proof).status()).toBe(200);
        await expect(ownerPage.getByText('Proof submitted for finance review', { exact: true })).toBeVisible();

        const [underReview] = await query(
          `SELECT subscription.status AS subscriptionStatus, payment.state AS paymentState,
                  invoice.status AS invoiceStatus, payment.owner_type AS paymentOwnerType,
                  payment.owner_id AS paymentOwnerId
             FROM subscriptions subscription
             INNER JOIN billing_invoices invoice ON invoice.subscription_id = subscription.id
             INNER JOIN billing_payments payment ON payment.invoice_id = invoice.id
            WHERE subscription.id = ? ORDER BY payment.id DESC LIMIT 1`,
          [subscriptionId],
        );
        expect(underReview).toMatchObject({
          subscriptionStatus: 'payment_under_review',
          paymentState: 'under_review',
          invoiceStatus: 'submitted',
          paymentOwnerType: 'developer',
          paymentOwnerId: organisationId,
        });

        await reviewerPage.goto('/admin/finance');
        await expect(reviewerPage.getByRole('heading', { name: 'Subscription Management' })).toBeVisible();
        await reviewerPage.getByRole('tab', { name: /payment verification/i }).click();
        const financeRow = reviewerPage.getByRole('row').filter({ hasText: ownerEmail }).first();
        await expect(financeRow).toBeVisible();
        await financeRow.getByRole('button', { name: 'Approve', exact: true }).click();
        await reviewerPage.getByLabel('Verified amount in cents').fill('149900');
        await reviewerPage.getByLabel('Finance reconciliation note').fill(
          'B06 controlled finance reconciliation for the Developer-organisation-owned EFT invoice.',
        );
        const approvedFinance = reviewerPage.waitForResponse(
          candidate =>
            candidate.url().includes('billing.admin.reviewManualPayment') &&
            candidate.request().method() === 'POST',
        );
        await reviewerPage.getByRole('button', { name: 'Confirm finance approval', exact: true }).click();
        expect((await approvedFinance).status()).toBe(200);
        await expect(reviewerPage.getByText('Finance review recorded', { exact: true })).toBeVisible();

        const [term] = await query(
          `SELECT subscription.status AS subscriptionStatus,
                  TIMESTAMPDIFF(SECOND, subscription.current_period_start, subscription.current_period_end) AS termSeconds,
                  account.account_kind AS accountKind, account.developer_organisation_id AS accountOrganisationId,
                  subscription.owner_type AS ownerType, subscription.owner_id AS ownerId,
                  plan.name AS planName, payment.state AS paymentState
             FROM subscriptions subscription
             INNER JOIN billable_accounts account ON account.id = subscription.billable_account_id
             INNER JOIN plans plan ON plan.id = subscription.plan_id
             INNER JOIN billing_payments payment ON payment.subscription_id = subscription.id
            WHERE subscription.id = ? ORDER BY payment.id DESC LIMIT 1`,
          [subscriptionId],
        );
        expect(term).toMatchObject({
          subscriptionStatus: 'active',
          accountKind: 'developer',
          accountOrganisationId: organisationId,
          ownerType: 'developer',
          ownerId: organisationId,
          planName: 'developer_launch_access',
          paymentState: 'verified',
        });
        expect(Number(term.termSeconds)).toBe(90 * 24 * 60 * 60);

        // Keep the canonical publisher in the test state so subsequent public
        // discovery and custody assertions prove this exact organisation.
        expect(publisherId).toBeGreaterThan(0);
      });

      await test.step('The paid Developer authors a residential development, confirmed media, and aggregate unit inventory through the mounted wizard', async () => {
        await ownerPage.goto('/developer/create-development');
        await expect(ownerPage.getByRole('heading', { name: 'Project Setup', exact: true })).toBeVisible();
        await ownerPage.getByText('Residential Development', { exact: true }).click();
        await ownerPage.getByText('For Sale', { exact: true }).click();
        await ownerPage.getByRole('button', { name: 'Start Wizard', exact: true }).click();

        await expect(ownerPage.getByRole('heading', { name: 'Configuration', exact: true })).toBeVisible();
        await ownerPage.getByText('Apartment Complex', { exact: true }).click();
        await ownerPage.getByText('Apartment Block', { exact: true }).click();
        await advanceDevelopmentWizard(ownerPage, 'Identity & Market');

        await ownerPage.locator('#name').fill(`${developerName} Residences`);
        await ownerPage.locator('#subtitle').fill('A real B06 paid Developer residential launch.');
        await selectRadixOption(ownerPage, 'Select development status', 'Selling');
        await ownerPage.locator('#launchDate').fill('2027-01-15');
        await ownerPage.locator('#completionDate').fill('2028-06-30');
        await ownerPage.locator('#ownership-full-title').check();
        await advanceDevelopmentWizard(ownerPage, 'Location');

        await ownerPage.locator('#latitude').fill('-26.2041');
        await ownerPage.locator('#longitude').fill('28.0473');
        await ownerPage.locator('#address').fill('90 B06 Launch Avenue');
        await ownerPage.locator('#city').fill('Johannesburg');
        await ownerPage.locator('#suburb').fill('Braamfontein');
        await selectRadixOption(ownerPage, 'Select Province', 'Gauteng');
        await advanceDevelopmentWizard(ownerPage, 'Governance & Finances');
        await advanceDevelopmentWizard(ownerPage, 'Amenities & Features');

        await advanceDevelopmentWizard(ownerPage, 'Marketing Summary');
        await ownerPage
          .getByPlaceholder('Describe the lifestyle, location benefits, and unique selling points...')
          .fill(
            'B06 Developer Residences is a legitimate residential apartment launch with measured unit availability, central Johannesburg access, confirmed media, and a first-party Developer sales journey for buyers.',
          );
        const highlightInput = ownerPage.getByPlaceholder('e.g. No Transfer Duty');
        for (const highlight of ['Confirmed first-party Developer', 'Available apartment inventory', 'Central Johannesburg location']) {
          await highlightInput.fill(highlight);
          await highlightInput.press('Enter');
        }
        await advanceDevelopmentWizard(ownerPage, 'Media');

        const developmentMediaConfirmed = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('developer.confirmMediaUpload') &&
            candidate.request().method() === 'POST',
        );
        await ownerPage.locator('input[type="file"]').first().setInputFiles({
          name: 'b06-development-hero.png',
          mimeType: 'image/png',
          buffer: onePixelPng,
        });
        expect((await developmentMediaConfirmed).status()).toBe(200);
        await expect(ownerPage.getByAltText('Hero')).toBeVisible();
        await advanceDevelopmentWizard(ownerPage, 'Unit Types');

        await ownerPage.getByRole('button', { name: 'Add Unit Type', exact: true }).click();
        const unitDialog = ownerPage.getByRole('dialog', { name: 'Add Unit Type' });
        await expect(unitDialog).toBeVisible();
        await unitDialog.getByPlaceholder('e.g. 2 Bedroom Garden Apartment').fill('Two Bedroom Launch Apartment');
        await unitDialog.getByPlaceholder('Highlight unique features...').fill(
          'A two bedroom apartment with confirmed floor-plan media, practical size, and available aggregate stock.',
        );
        await unitDialog.getByPlaceholder('e.g. 70').fill('78');
        await unitDialog.getByRole('button', { name: /Next: Pricing/i }).click();
        await unitDialog.getByPlaceholder('0').fill('1499000');
        await unitDialog.getByRole('button', { name: /Next: Media/i }).click();

        const unitGalleryConfirmed = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('developer.confirmMediaUpload') &&
            candidate.request().method() === 'POST',
        );
        await unitDialog.locator('#unit-gallery-upload').setInputFiles({
          name: 'b06-unit-gallery.png',
          mimeType: 'image/png',
          buffer: onePixelPng,
        });
        expect((await unitGalleryConfirmed).status()).toBe(200);
        const unitFloorPlanConfirmed = ownerPage.waitForResponse(
          candidate =>
            candidate.url().includes('developer.confirmMediaUpload') &&
            candidate.request().method() === 'POST',
        );
        await unitDialog.locator('#floorplan-upload').setInputFiles({
          name: 'b06-unit-floorplan.png',
          mimeType: 'image/png',
          buffer: onePixelPng,
        });
        expect((await unitFloorPlanConfirmed).status()).toBe(200);
        await expect(unitDialog.getByText('b06-unit-floorplan.png', { exact: true })).toBeVisible();
        await unitDialog.getByRole('button', { name: /Next: Features/i }).click();
        await unitDialog.getByRole('button', { name: /Next: Stock/i }).click();
        await unitDialog.getByText('Available Units', { exact: true }).locator('..').locator('input').fill('6');
        await unitDialog.getByRole('button', { name: 'Save Unit Type', exact: true }).click();
        await expect(ownerPage.getByText('Two Bedroom Launch Apartment', { exact: true })).toBeVisible();
        await advanceDevelopmentWizard(ownerPage, 'Review & Submit');

        const savedDraft = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.saveDraft') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Save Draft', exact: true }).click();
        expect((await savedDraft).status()).toBe(200);
        await expect(ownerPage.getByText('Draft saved', { exact: true })).toBeVisible();

        await ownerPage.goto('/developer/drafts');
        await expect(ownerPage.getByRole('heading', { name: 'My Development Drafts', exact: true })).toBeVisible();
        await expect(ownerPage.getByText(`${developerName} Residences`, { exact: true })).toBeVisible();
        await ownerPage.getByRole('button', { name: 'Resume', exact: true }).click();
        await expect(ownerPage.getByRole('heading', { name: 'Review & Submit', exact: true })).toBeVisible();

        const marketingReview = ownerPage
          .getByText('Marketing & Media', { exact: true })
          .locator('..')
          .locator('..');
        await marketingReview.getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(ownerPage.getByRole('heading', { name: 'Marketing Summary', exact: true }).first()).toBeVisible();
        await ownerPage
          .getByPlaceholder('Describe the lifestyle, location benefits, and unique selling points...')
          .press('End');
        await ownerPage
          .getByPlaceholder('Describe the lifestyle, location benefits, and unique selling points...')
          .pressSequentially(' This wording was reviewed after the durable draft reload.');
        await advanceDevelopmentWizard(ownerPage, 'Media');
        await expect(ownerPage.getByAltText('Hero')).toBeVisible();
        await advanceDevelopmentWizard(ownerPage, 'Unit Types');
        await expect(ownerPage.getByText('Two Bedroom Launch Apartment', { exact: true })).toBeVisible();
        await advanceDevelopmentWizard(ownerPage, 'Review & Submit');

        const [draftProjection] = await query(
          `SELECT draft.id AS draftId
             FROM development_drafts draft
             INNER JOIN developer_organisations organisation ON organisation.id = draft.developer_organisation_id
             WHERE organisation.id = ?
             ORDER BY draft.id DESC LIMIT 1`,
          [organisationId],
        );
        expect(Number(draftProjection.draftId)).toBeGreaterThan(0);
      });

      await test.step('The Development is submitted and independently approved for public publication', async () => {
        await ownerPage.getByRole('button', { name: 'Submit for Review', exact: true }).click();
        const confirmation = ownerPage.getByRole('dialog', { name: 'Confirm Submission for Review' });
        await expect(confirmation).toBeVisible();
        const created = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.createDevelopment') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        const submitted = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.publishDevelopment') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await confirmation.getByRole('button', { name: 'Confirm & Submit', exact: true }).click();
        expect((await created).status()).toBe(200);
        const submittedResponse = await submitted;
        expect(submittedResponse.status()).toBe(200);
        publishRequestUrl = submittedResponse.request().url();
        publishRequestPostData = submittedResponse.request().postData() || '';
        expect(publishRequestUrl).toContain('developer.publishDevelopment');
        expect(publishRequestPostData).not.toBe('');
        await expect(ownerPage).toHaveURL(/\/developer\/developments/);

        await expect
          .poll(async () =>
            query(
              `SELECT development.id AS developmentId, development.slug AS slug,
                      development.approval_status AS approvalStatus,
                      development.isPublished AS isPublished,
                      development.catalogue_publisher_id AS publisherId,
                      COUNT(unit.id) AS unitCount
                 FROM developments development
                 LEFT JOIN unit_types unit ON unit.development_id = development.id
                WHERE development.catalogue_publisher_id = ? AND development.name = ?
                GROUP BY development.id, development.slug, development.approval_status,
                         development.isPublished, development.catalogue_publisher_id
                ORDER BY development.id DESC LIMIT 1`,
              [publisherId, `${developerName} Residences`],
            ),
          )
          .toHaveLength(1);
        const [submittedDevelopment] = await query(
          `SELECT development.id AS developmentId, development.slug AS slug,
                  development.approval_status AS approvalStatus,
                  development.isPublished AS isPublished,
                  development.catalogue_publisher_id AS publisherId,
                  unit.id AS unitTypeId, unit.available_units AS availableUnits,
                  unit.total_units AS totalUnits, unit.base_media AS baseMedia
             FROM developments development
             INNER JOIN unit_types unit ON unit.development_id = development.id
            WHERE development.catalogue_publisher_id = ? AND development.name = ?
            ORDER BY development.id DESC, unit.id ASC LIMIT 1`,
          [publisherId, `${developerName} Residences`],
        );
        expect(submittedDevelopment).toMatchObject({
          approvalStatus: 'pending',
          isPublished: 0,
          publisherId,
          availableUnits: 6,
          totalUnits: 6,
        });
        expect(String(submittedDevelopment.baseMedia)).toContain('b06-unit-floorplan');
        developmentId = Number(submittedDevelopment.developmentId);
        unitTypeId = String(submittedDevelopment.unitTypeId ?? '');
        expect(developmentId).toBeGreaterThan(0);
        expect(unitTypeId).toMatch(/^[A-Za-z0-9-]{8,36}$/);

        await reviewerPage.goto('/admin/development-approvals');
        await expect(reviewerPage.getByRole('heading', { name: 'Development Management', exact: true })).toBeVisible();
        const reviewRow = reviewerPage.getByRole('row').filter({ hasText: `${developerName} Residences` }).first();
        await expect(reviewRow).toBeVisible();
        await reviewRow.getByRole('button', { name: 'Review Application', exact: true }).click();
        const reviewDialog = reviewerPage.getByRole('dialog', { name: 'Review Development Application' });
        await expect(reviewDialog.getByText('Two Bedroom Launch Apartment', { exact: true })).toBeVisible();
        await reviewDialog.getByRole('button', { name: 'Approve', exact: true }).click();
        const approved = reviewerPage.waitForResponse(
          candidate => candidate.url().includes('admin.adminApproveDevelopment') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await reviewDialog.getByRole('button', { name: 'Confirm Approval', exact: true }).click();
        expect((await approved).status()).toBe(200);
        await expect(reviewerPage.getByText('Development approved and published successfully', { exact: true })).toBeVisible();

        const [approvedDevelopment] = await query(
          `SELECT approval_status AS approvalStatus, isPublished, catalogue_publisher_id AS publisherId,
                  images, slug
             FROM developments WHERE id = ?`,
          [developmentId],
        );
        expect(approvedDevelopment).toMatchObject({ approvalStatus: 'approved', isPublished: 1, publisherId });
        expect(String(approvedDevelopment.images)).toContain('b06-development-hero');
        developmentSlug = String(approvedDevelopment.slug || '');
        expect(developmentSlug).not.toBe('');
      });

      await test.step('Public discovery renders the approved Developer development and captures one unit enquiry', async () => {
        const buyerContext = await browser.newContext();
        const buyerPage = await buyerContext.newPage();
        const prospectName = `B06 Prospect ${runId.slice(0, 8)}`;
        const prospectEmail = `b06-prospect-${runId}@example.test`;
        try {
          const publicSearch = buyerPage.waitForResponse(
            candidate =>
              candidate.url().includes('properties.searchDevelopments') &&
              candidate.request().method() === 'GET',
            { timeout: 45_000 },
          );
          // The primary Developments journey deliberately treats `search` as
          // a location compatibility input, so use its real public city
          // authority rather than accidentally asking it to resolve a
          // development name as geography.
          await buyerPage.goto('/new-developments?city=johannesburg');
          expect((await publicSearch).status()).toBe(200);
          await expect(buyerPage.getByText(`${developerName} Residences`, { exact: true })).toBeVisible();
          await buyerPage.getByText(`${developerName} Residences`, { exact: true }).click();
          await expect(buyerPage).toHaveURL(new RegExp(`/development/${developmentSlug}(?:\\?|$)`));
          await expect(buyerPage.getByRole('heading', { name: `${developerName} Residences`, exact: true }).first()).toBeVisible();
          await expect(
            buyerPage.locator('p:visible').filter({ hasText: developerName }).first(),
          ).toBeVisible();
          await expect(buyerPage.getByText('Two Bedroom Launch Apartment', { exact: true })).toBeVisible();
          await expect(buyerPage.getByText('6 available', { exact: true })).toBeVisible();
          await expect
            .poll(() => buyerPage.locator('img[src*="/api/local-media/object"]').count())
            .toBeGreaterThan(0);

          const capture = buyerPage.waitForRequest(
            candidate =>
              candidate.url().includes('developer.createLead') && candidate.method() === 'POST',
            { timeout: 45_000 },
          );
          await buyerPage.getByRole('button', { name: 'Request Callback', exact: true }).first().click();
          const enquiry = buyerPage.getByRole('dialog', { name: 'Contact Sales Team' });
          await expect(enquiry).toBeVisible();
          await enquiry.getByPlaceholder('Full name').fill(prospectName);
          await enquiry.getByPlaceholder('Email address').fill(prospectEmail);
          await enquiry.getByPlaceholder('Phone number').fill('+27825550199');
          await enquiry.getByPlaceholder('Message (optional)').fill(
            'Please contact me about the confirmed two-bedroom availability.',
          );
          await enquiry.locator('#development-lead-consent').check();
          await enquiry.getByRole('button', { name: 'Send Enquiry', exact: true }).click();
          const captureRequest = await capture;
          publicCaptureUrl = captureRequest.url();
          publicCaptureContentType =
            (await captureRequest.headerValue('content-type')) || 'application/json';
          publicCapturePostData = captureRequest.postData() || '';
          expect(publicCapturePostData).not.toBe('');

          const replay = await buyerPage.request.fetch(publicCaptureUrl, {
            method: captureRequest.method(),
            headers: { 'content-type': publicCaptureContentType },
            data: publicCapturePostData,
          });
          expect(replay.status()).toBe(200);
          await expect(enquiry).toHaveCount(0);
        } finally {
          await buyerContext.close();
        }

        const [lead] = await query(
          `SELECT enquiry.id AS leadId, enquiry.developmentId AS developmentId,
                  enquiry.catalogue_publisher_id AS publisherId, enquiry.unit_id AS unitId,
                  enquiry.capture_request_id AS captureRequestId, enquiry.assigned_to AS assignedTo,
                  delivery.recipient_type AS recipientType,
                  delivery.recipient_developer_organisation_id AS recipientOrganisationId,
                  delivery.recipient_publisher_id AS recipientPublisherId,
                  principal.id AS ownerUserId
             FROM leads enquiry
             INNER JOIN lead_deliveries delivery
               ON delivery.lead_id = enquiry.id AND delivery.purpose = 'primary_custody'
             INNER JOIN users principal ON principal.email = ?
            WHERE enquiry.developmentId = ? AND enquiry.email = ?
            ORDER BY enquiry.id DESC LIMIT 1`,
          [ownerEmail, developmentId, prospectEmail],
        );
        expect(lead).toMatchObject({
          developmentId,
          publisherId,
          unitId: unitTypeId,
          recipientType: 'developer',
          recipientOrganisationId: organisationId,
          recipientPublisherId: publisherId,
        });
        leadId = Number(lead.leadId);
        ownerUserId = Number(lead.ownerUserId);
        expect(leadId).toBeGreaterThan(0);
        expect(ownerUserId).toBeGreaterThan(0);
        const [replayCount] = await query(
          'SELECT COUNT(*) AS total FROM leads WHERE developmentId = ? AND capture_request_id = ?',
          [developmentId, lead.captureRequestId],
        );
        expect(Number(replayCount.total)).toBe(1);
      });

      await test.step('The canonical Developer operator assigns, contacts, notes, and schedules the retained enquiry', async () => {
        await ownerPage.goto('/developer/leads');
        await expect(ownerPage.getByRole('heading', { name: 'Leads Control Center', exact: true })).toBeVisible();
        const prospect = ownerPage.getByText(`B06 Prospect ${runId.slice(0, 8)}`, { exact: true }).first();
        await expect(prospect).toBeVisible();
        await prospect.click();

        const assigned = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.assignLead') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await ownerPage.getByRole('button', { name: 'Assign to Me', exact: true }).click();
        expect((await assigned).status()).toBe(200);
        await expect
          .poll(async () =>
            query(
              `SELECT assigned_to AS assignedTo FROM leads WHERE id = ?`,
              [leadId],
            ),
          )
          .toEqual([expect.objectContaining({ assignedTo: ownerUserId })]);

        const transitionSection = ownerPage.getByText('Transition Stage', { exact: true }).locator('..');
        await transitionSection.getByRole('combobox').click();
        await ownerPage.getByRole('option', { name: 'contacted', exact: true }).click();
        await transitionSection.getByPlaceholder('Optional transition note...').fill(
          'Initial buyer contact recorded by the canonical Developer operator.',
        );
        const transitioned = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.transitionLead') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await transitionSection.getByRole('button', { name: 'Move Lead', exact: true }).click();
        expect((await transitioned).status()).toBe(200);

        // A stage move correctly removes the lead from the current New pipeline view.
        // Resume the same canonical record through its new stage before recording the
        // remaining operational work.
        await ownerPage.getByRole('button', { name: /^Contacted/ }).click();
        await expect(prospect).toBeVisible();
        await prospect.click();

        const activitySection = ownerPage.getByText('Log Activity', { exact: true }).locator('..');
        await activitySection.getByPlaceholder('What happened?').fill(
          'Called the buyer and confirmed the requested two-bedroom availability.',
        );
        const activity = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.logLeadActivity') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await activitySection.getByRole('button', { name: 'Save Activity', exact: true }).click();
        expect((await activity).status()).toBe(200);

        const nextActionSection = ownerPage.getByText('Next Action', { exact: true }).locator('..');
        await nextActionSection.getByRole('button', { name: 'Follow up in 2 days', exact: true }).click();
        const nextAction = ownerPage.waitForResponse(
          candidate => candidate.url().includes('developer.setLeadNextAction') && candidate.request().method() === 'POST',
          { timeout: 45_000 },
        );
        await nextActionSection.getByRole('button', { name: 'Save Next Action', exact: true }).click();
        expect((await nextAction).status()).toBe(200);

        await ownerPage.goto('/developer/leads?stage=contacted');
        await expect(ownerPage.getByText(`B06 Prospect ${runId.slice(0, 8)}`, { exact: true }).first()).toBeVisible();
        const [operatedLead] = await query(
          `SELECT enquiry.assigned_to AS assignedTo, enquiry.status AS status,
                  enquiry.lastContactedAt AS lastContactedAt, enquiry.nextFollowUp AS nextFollowUp,
                  enquiry.notes AS notes, delivery.recipient_developer_organisation_id AS recipientOrganisationId,
                  delivery.recipient_publisher_id AS recipientPublisherId
             FROM leads enquiry
             INNER JOIN lead_deliveries delivery
               ON delivery.lead_id = enquiry.id AND delivery.purpose = 'primary_custody'
            WHERE enquiry.id = ?`,
          [leadId],
        );
        expect(operatedLead).toMatchObject({
          assignedTo: ownerUserId,
          status: 'contacted',
          recipientOrganisationId: organisationId,
          recipientPublisherId: publisherId,
        });
        expect(operatedLead.lastContactedAt).toBeTruthy();
        expect(operatedLead.nextFollowUp).toBeTruthy();
        expect(String(operatedLead.notes)).toContain('Initial buyer contact recorded');
        expect(String(operatedLead.notes)).toContain('Called the buyer');
        const [activityCount] = await query(
          `SELECT COUNT(*) AS total FROM lead_activities WHERE leadId = ?`,
          [leadId],
        );
        expect(Number(activityCount.total)).toBeGreaterThanOrEqual(3);
      });

      await test.step('A scoped expiry stops fresh publication and enquiry while retaining Developer business history', async () => {
        const unpublish = await ownerPage.evaluate(
          async ({ url, postData }) => {
            const response = await fetch(url.replace('developer.publishDevelopment', 'developer.unpublishDevelopment'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: postData,
            });
            return response.status;
          },
          { url: publishRequestUrl, postData: publishRequestPostData },
        );
        expect(unpublish).toBe(200);

        await connection!.execute(
          `UPDATE subscriptions
              SET current_period_end = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
            WHERE id = ?
              AND billable_account_id = ?
              AND owner_type = 'developer'
              AND owner_id = ?
              AND status = 'active'`,
          [subscriptionId, billableAccountId, organisationId],
        );
        const [expiredTerm] = await query(
          `SELECT current_period_end < UTC_TIMESTAMP() AS expired
             FROM subscriptions
            WHERE id = ? AND billable_account_id = ? AND owner_type = 'developer' AND owner_id = ?`,
          [subscriptionId, billableAccountId, organisationId],
        );
        expect(Number(expiredTerm.expired)).toBe(1);

        const deniedPublication = await ownerPage.evaluate(
          async ({ url, postData }) => {
            const response = await fetch(url, {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: postData,
            });
            return response.status;
          },
          { url: publishRequestUrl, postData: publishRequestPostData },
        );
        expect(deniedPublication).toBe(403);

        const expiredPublicContext = await browser.newContext();
        const expiredPublicPage = await expiredPublicContext.newPage();
        try {
          const expiredSearch = expiredPublicPage.waitForResponse(
            candidate =>
              candidate.url().includes('properties.searchDevelopments') &&
              candidate.request().method() === 'GET',
            { timeout: 45_000 },
          );
          await expiredPublicPage.goto('/new-developments?city=johannesburg');
          expect((await expiredSearch).status()).toBe(200);
          await expect(expiredPublicPage.getByText(`${developerName} Residences`, { exact: true })).toHaveCount(0);

          const freshCapture = await expiredPublicPage.request.fetch(publicCaptureUrl, {
            method: 'POST',
            headers: { 'content-type': publicCaptureContentType },
            data: withFreshCaptureRequestId(
              publicCapturePostData,
              `b06-expired-${runId}-${Date.now()}`,
            ),
          });
          expect(freshCapture.status()).toBe(404);
        } finally {
          await expiredPublicContext.close();
        }

        const [retained] = await query(
          `SELECT organisation.id AS organisationId, membership.status AS membershipStatus,
                  publisher.id AS publisherId, development.id AS developmentId,
                  COUNT(DISTINCT unit.id) AS unitCount, COUNT(DISTINCT enquiry.id) AS leadCount,
                  COUNT(DISTINCT activity.id) AS activityCount
             FROM developer_organisations organisation
             INNER JOIN developer_organisation_memberships membership
               ON membership.organisation_id = organisation.id
             INNER JOIN catalogue_publishers publisher
               ON publisher.developer_organisation_id = organisation.id
             INNER JOIN developments development ON development.catalogue_publisher_id = publisher.id
             LEFT JOIN unit_types unit ON unit.development_id = development.id
             LEFT JOIN leads enquiry ON enquiry.developmentId = development.id
             LEFT JOIN lead_activities activity ON activity.leadId = enquiry.id
            WHERE organisation.id = ? AND development.id = ?
            GROUP BY organisation.id, membership.status, publisher.id, development.id`,
          [organisationId, developmentId],
        );
        expect(retained).toMatchObject({
          organisationId,
          membershipStatus: 'active',
          publisherId,
          developmentId,
        });
        expect(Number(retained.unitCount)).toBeGreaterThanOrEqual(1);
        expect(Number(retained.leadCount)).toBe(1);
        expect(Number(retained.activityCount)).toBeGreaterThanOrEqual(3);
      });
    } finally {
      await reviewerContext.close();
    }
  });
});

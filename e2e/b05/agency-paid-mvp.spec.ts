import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const runId = randomUUID();
const apiOrigin = 'http://localhost:5000';
const appOrigin = 'http://localhost:5177';
const emailCapture = '/tmp/property-listify-b05-agency-paid-mvp-email-capture.jsonl';
const reviewerEmail = 'ple-reviewer@listify.local';
const ownerEmail = `b05-owner-${runId}@invalid.example`;
const ownerPassword = `B05!${randomUUID()}9a`;
const firstMemberEmail = `b05-new-member-${runId}@invalid.example`;
const firstMemberPassword = `B05!${randomUUID()}9a`;
const secondMemberEmail = `b05-existing-member-${runId}@invalid.example`;
const secondMemberPassword = `B05!${randomUUID()}9a`;
const agencyName = `B05 Agency ${runId.slice(0, 8)}`;
const firstMemberName = `B05 New Member ${runId.slice(0, 8)}`;
const secondMemberName = `B05 Existing Member ${runId.slice(0, 8)}`;
const saleTitle = `B05 Agency Sale ${runId.slice(0, 8)}`;
const rentalTitle = `B05 Agency Rental ${runId.slice(0, 8)}`;
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0uQAAAABJRU5ErkJggg==',
  'base64',
);

type Row = Record<string, unknown>;
type CapturedInvitation = {
  kind: 'agency_invitation';
  to: string;
  subject: string;
  invitationUrl: string;
  capturedAt: string;
};

let connection: AuthoritySqlConnection | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection) throw new Error('B05 Database Authority connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function latestVerificationToken(): string | null {
  try {
    const messages = readFileSync(emailCapture, 'utf8').split('\n').filter(Boolean)
      .flatMap(line => {
        try {
          const value = JSON.parse(line) as { kind?: string; verificationUrl?: string };
          return value.kind === 'agency_verification' && value.verificationUrl ? [value] : [];
        } catch { return []; }
      });
    return new URL(messages.at(-1)?.verificationUrl || 'http://localhost').searchParams.get('token');
  } catch {
    return null;
  }
}

function capturedInvitations(): CapturedInvitation[] {
  try {
    return readFileSync(emailCapture, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(line => {
        try {
          const value = JSON.parse(line) as CapturedInvitation;
          return value.kind === 'agency_invitation' ? [value] : [];
        } catch {
          // A concurrently appended final line may be incomplete briefly.
          return [];
        }
      });
  } catch {
    return [];
  }
}

async function waitForInvitationEmail(
  recipient: string,
  previousCount: number,
): Promise<CapturedInvitation> {
  let captured: CapturedInvitation | undefined;
  await expect
    .poll(
      () => {
        captured = capturedInvitations()
          .slice(previousCount)
          .filter(message => message.to.toLowerCase() === recipient.toLowerCase())
          .at(-1);
        return Boolean(captured);
      },
      { intervals: [250, 500, 1_000], timeout: 30_000 },
    )
    .toBe(true);
  if (!captured) throw new Error('The governed B05 transport did not capture the invitation email.');

  // Do not surface the token in a test report. The only link source is the
  // application-generated email captured in the private mode-0600 artifact.
  const parsed = new URL(captured.invitationUrl);
  expect(parsed.origin).toBe(appOrigin);
  expect(parsed.pathname).toBe('/accept-invitation');
  expect(parsed.searchParams.has('token')).toBe(true);
  return captured;
}

async function waitForVerificationToken(previous: string | null): Promise<string> {
  await expect
    .poll(() => latestVerificationToken(), { intervals: [250, 500, 1_000], timeout: 30_000 })
    .not.toBeNull();
  const token = latestVerificationToken();
  if (!token || token === previous) {
    throw new Error('The local verification transport did not produce a fresh application token.');
  }
  return token;
}

function reviewerPassword(): string {
  const password = process.env.LOCAL_PLE_REVIEWER_PASSWORD;
  if (!password) throw new Error('B05 needs the governed local finance/reviewer credential.');
  return password;
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

async function registerAndVerify(
  page: Page,
  input: {
    email: string;
    password: string;
    name: string;
    registrationPath: string;
    roleButton?: string;
    submitButton: string;
    expectedPath: RegExp;
  },
) {
  const previousToken = latestVerificationToken();
  await page.goto(input.registrationPath);
  if (input.roleButton) await page.getByRole('button', { name: input.roleButton }).click();
  const registration = page.getByRole('dialog');
  await expect(registration).toBeVisible();
  await registration.locator('input[name="name"]').fill(input.name);
  await registration.locator('input[name="email"]').fill(input.email);
  await registration.locator('input[name="password"]').fill(input.password);
  await registration.locator('input[name="confirmPassword"]').fill(input.password);
  const response = page.waitForResponse(
    candidate => candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST',
  );
  await registration.getByRole('button', { name: input.submitButton }).click();
  expect((await response).status()).toBe(201);

  const token = await waitForVerificationToken(previousToken);
  await page.goto(`${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  await expect(page).toHaveURL(input.expectedPath);
}

async function selectLocation(page: Page, id: string, name: string) {
  await page.locator(`#${id}`).click();
  await page.getByRole('option', { name, exact: true }).click();
}

async function next(page: Page) {
  const button = page.getByRole('button', { name: 'Next', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}

async function completeFirstMemberProfile(page: Page) {
  await page.goto('/agent/setup');
  await page.getByPlaceholder('Jane Doe').fill(firstMemberName);
  await page.getByPlaceholder('+27 82 000 0000').first().fill('+27820000021');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByPlaceholder('Search suburb, city, or province').fill('Sandton');
  await page.locator('[cmdk-item]').filter({ hasText: 'Sandton' }).first().click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page
    .getByPlaceholder('Tell clients about your experience and what you specialize in.')
    .fill('A verified Agency member completing the paid B05 operating journey.');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button', { name: 'Complete Setup' }).click();
  await expect(page).toHaveURL(/\/agent\/dashboard/);
}

async function createAndSubmitSaleListing(page: Page) {
  await page.goto('/listings/create');
  await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
  await page.getByRole('radio', { name: /For Sale/ }).click();
  await next(page);
  await page.getByRole('radio', { name: /House/ }).click();
  await next(page);
  await page.locator('#title').fill(saleTitle);
  await page
    .locator('#description')
    .fill('A complete Agency-owned sale listing for moderated B05 public discovery and enquiry custody.');
  await page.locator('#core-bedrooms').fill('3');
  await page.locator('#core-bathrooms').fill('2');
  await page.locator('#core-internal-area').fill('145');
  await page.locator('#core-erf-area').fill('600');
  await next(page);
  await next(page);
  await page.getByLabel('Asking price in Rand').fill('2500000');
  await next(page);
  await selectLocation(page, 'location-province', 'Gauteng');
  await selectLocation(page, 'location-city', 'Johannesburg');
  await selectLocation(page, 'location-suburb', 'Sandton');
  await page.locator('#location-street-number').fill('15');
  await page.locator('#location-street-name').fill('B05 Agency Avenue');
  await page.getByRole('button', { name: 'Confirm location', exact: true }).click();
  await expect(page.getByText(/Ready to continue/)).toBeVisible();
  await next(page);
  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `b05-sale-${index}.png`,
      mimeType: 'image/png',
      buffer: onePixelPng,
    })),
  );
  await expect(page.getByText('Uploaded Media (5)', { exact: true })).toBeVisible();
  await next(page);
  await expect(page.getByText(/Readiness Checklist \(85%/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Listing', exact: true })).toBeEnabled();
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('listing.submitForReview') && candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();
  expect((await response).status()).toBe(200);

  const [listing] = await query(
    `SELECT id, ownerId, agencyId, agentId, status, approvalStatus, suburb_id AS suburbId
       FROM listings WHERE title = ? LIMIT 1`,
    [saleTitle],
  );
  expect(listing).toMatchObject({ status: 'pending_review', approvalStatus: 'pending' });
  return {
    id: Number(listing.id),
    ownerId: Number(listing.ownerId),
    agencyId: Number(listing.agencyId),
    agentId: Number(listing.agentId),
    suburbId: Number(listing.suburbId),
  };
}

async function createAndSubmitRentalListing(page: Page) {
  await page.goto('/listings/create');
  await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
  await page.getByRole('radio', { name: /To Rent/ }).click();
  await next(page);
  await page.getByRole('radio', { name: /House/ }).click();
  await next(page);
  await page.locator('#title').fill(rentalTitle);
  await page
    .locator('#description')
    .fill('A proportional rental Agency listing for B05 public discovery coverage.');
  await page.locator('#core-bedrooms').fill('2');
  await page.locator('#core-bathrooms').fill('1');
  await page.locator('#core-internal-area').fill('85');
  await page.locator('#core-erf-area').fill('300');
  await next(page);
  await next(page);
  await page.getByLabel('Monthly rent in Rand').fill('18500');
  await page.getByLabel('Deposit status').selectOption('known');
  await page.getByLabel('Deposit amount in Rand').fill('18500');
  await page.getByLabel('Rental availability').selectOption('available_now');
  await page.getByLabel('Lease terms').selectOption('fixed_term');
  await page.getByLabel('Minimum lease months').fill('12');
  await page.getByLabel('Utilities responsibility').selectOption('not_included');
  await page.getByLabel('Rental furnishing').selectOption('unfurnished');
  await next(page);
  await selectLocation(page, 'location-province', 'Gauteng');
  await selectLocation(page, 'location-city', 'Johannesburg');
  await selectLocation(page, 'location-suburb', 'Sandton');
  await page.locator('#location-street-number').fill('17');
  await page.locator('#location-street-name').fill('B05 Rental Road');
  await page.getByRole('button', { name: 'Confirm location', exact: true }).click();
  await next(page);
  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `b05-rental-${index}.png`,
      mimeType: 'image/png',
      buffer: onePixelPng,
    })),
  );
  await next(page);
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('listing.submitForReview') && candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();
  expect((await response).status()).toBe(200);
  const [listing] = await query(
    `SELECT id, status, approvalStatus, suburb_id AS suburbId FROM listings WHERE title = ? LIMIT 1`,
    [rentalTitle],
  );
  expect(listing).toMatchObject({ status: 'pending_review', approvalStatus: 'pending' });
  return { id: Number(listing.id), suburbId: Number(listing.suburbId) };
}

async function approveListing(reviewerPage: Page, listingId: number) {
  await reviewerPage.goto(`/admin/review/${listingId}`);
  await expect(reviewerPage.getByText('Listing review', { exact: true })).toBeVisible();
  await reviewerPage.getByRole('button', { name: 'Approve & publish', exact: true }).click();
  await expect(reviewerPage.getByText('Approve this listing for publication', { exact: true })).toBeVisible();
  await reviewerPage.getByRole('checkbox').check();
  await reviewerPage.getByPlaceholder('Any internal context about this approval…').fill(
    'B05 controlled Agency moderation approval.',
  );
  await reviewerPage.getByRole('button', { name: 'Confirm approval', exact: true }).click();
  await expect(
    reviewerPage.getByText('Property approved and published successfully', { exact: true }),
  ).toBeVisible();
  const [projection] = await query(
    `SELECT property.id AS propertyId, property.sourceListingId, listing.status, listing.approvalStatus
       FROM properties property INNER JOIN listings listing ON listing.id = property.sourceListingId
      WHERE listing.id = ? LIMIT 1`,
    [listingId],
  );
  expect(projection).toMatchObject({ sourceListingId: listingId, status: 'published', approvalStatus: 'approved' });
  return Number(projection.propertyId);
}

test.describe('B05 Agency paid MVP controlled acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    if (
      authority.context.targetClass !== 'disposable-worktree' ||
      authority.context.targetFingerprintHash !== process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT
    ) {
      throw new Error('B05 requires the exact task-owned disposable Database Authority target.');
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

  test('joins, pays, operates Agency inventory and leads, then preserves history through scoped expiry', async ({
    page: ownerPage,
    browser,
  }) => {
    const reviewerContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    const firstMemberContext = await browser.newContext();
    const firstMemberPage = await firstMemberContext.newPage();
    const secondMemberContext = await browser.newContext();
    const secondMemberPage = await secondMemberContext.newPage();
    let subscriptionId = 0;
    let billableAccountId = 0;
    let agencyId = 0;
    let salePropertyId = 0;
    let leadId = 0;
    let firstMemberAgentId = 0;
    let secondMemberAgentId = 0;
    let prospectName = '';
    let contactSummary = '';
    let noteText = '';
    let followUpNote = '';

    try {
      await test.step('Agency-only product availability and owner registration', async () => {
        await ownerPage.goto('/advertise/sell/agencies');
        await expect(ownerPage.getByText(/R\s?999/).first()).toBeVisible();
        await expect(ownerPage.getByText(/once-off/i).first()).toBeVisible();
        await expect(ownerPage.getByText(/90 days/i).first()).toBeVisible();
        await expect(ownerPage.getByText(/no automatic renewal/i).first()).toBeVisible();
        await ownerPage.getByRole('link', { name: 'Create your Agency owner account' }).first().click();
        await expect(ownerPage).toHaveURL(/\/login\?mode=register/);
        const previousToken = latestVerificationToken();
        const registration = ownerPage.getByRole('dialog');
        await registration.locator('input[name="name"]').fill('B05 Agency Owner');
        await registration.locator('input[name="email"]').fill(ownerEmail);
        await registration.locator('input[name="password"]').fill(ownerPassword);
        await registration.locator('input[name="confirmPassword"]').fill(ownerPassword);
        const registered = ownerPage.waitForResponse(
          candidate => candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST',
        );
        await registration.getByRole('button', { name: 'Continue to agency setup' }).click();
        expect((await registered).status()).toBe(201);
        const verificationToken = await waitForVerificationToken(previousToken);
        await ownerPage.goto(`${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`);
        await expect(ownerPage).toHaveURL(/\/agency\/setup\?verified=true/);
      });

      await test.step('Agency setup creates the pending Agency-owned commercial principal', async () => {
        await ownerPage.locator('#name').fill(agencyName);
        await ownerPage.locator('#email').fill(ownerEmail);
        await ownerPage.locator('#phone').fill('+27820000020');
        await ownerPage.locator('#address').fill('20 B05 Agency Way');
        await ownerPage.locator('#city').fill('Johannesburg');
        await ownerPage.locator('#province').fill('Gauteng');
        await ownerPage
          .locator('#description')
          .fill('A controlled Agency business proving the paid member and operating value loop.');
        await ownerPage.getByRole('button', { name: 'Continue to Agency identity' }).click();
        await ownerPage.locator('#companyName').fill(`${agencyName} Realty`);
        await ownerPage.getByRole('button', { name: 'Continue to Team launch' }).click();
        await ownerPage.getByRole('button', { name: 'Continue to Launch Access' }).click();
        await expect(ownerPage.getByText(/does not issue an invoice, request payment, or activate publishing/i)).toBeVisible();
        await ownerPage.locator('label[for^="plan-"]').first().click();
        await ownerPage.locator('#agreeToTerms').click();
        await ownerPage.getByRole('button', { name: 'Review onboarding' }).click();
        const onboarding = ownerPage.waitForResponse(
          candidate => candidate.url().includes('agency.createOnboarding') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Save and open workspace' }).click();
        expect((await onboarding).status()).toBe(200);
        await expect(ownerPage).toHaveURL(/\/agency\/overview/);

        const [record] = await query(
          `SELECT agency.id AS agencyId, owner.id AS ownerId, owner.emailVerified,
                  account.id AS billableAccountId, account.account_kind AS accountKind,
                  subscription.id AS subscriptionId, subscription.owner_type AS ownerType,
                  subscription.owner_id AS ownerIdOnSubscription, subscription.status,
                  plan.name AS planName
             FROM users owner
             INNER JOIN agencies agency ON agency.id = owner.agencyId
             INNER JOIN billable_accounts account ON account.agency_id = agency.id
             INNER JOIN subscriptions subscription ON subscription.billable_account_id = account.id
             INNER JOIN plans plan ON plan.id = subscription.plan_id
            WHERE owner.email = ? LIMIT 1`,
          [ownerEmail],
        );
        expect(record).toMatchObject({
          emailVerified: 1,
          accountKind: 'agency',
          ownerType: 'agency',
          status: 'pending_payment',
          planName: 'agency_launch_access',
        });
        agencyId = Number(record.agencyId);
        billableAccountId = Number(record.billableAccountId);
        subscriptionId = Number(record.subscriptionId);
        expect(Number(record.ownerIdOnSubscription)).toBe(agencyId);
      });

      await test.step('Privileged Agency approval and once-off invoice/proof path', async () => {
        await signInAsReviewer(reviewerPage, '/admin/agencies');
        await reviewerPage.getByPlaceholder('Search agencies by name, email, or city...').fill(agencyName);
        await reviewerPage.getByRole('button', { name: 'Verify', exact: true }).click();
        await expect(reviewerPage.getByText('Agency verification updated')).toBeVisible();

        await ownerPage.goto('/agency/billing');
        await expect(ownerPage.getByText('R999 once-off', { exact: true })).toBeVisible();
        await expect(ownerPage.getByText('90 days of Agency Launch Access. No automatic renewal.')).toBeVisible();
        await expect(ownerPage.getByText('Monthly', { exact: true })).toHaveCount(0);
        await expect(ownerPage.getByText(/cancel at period end/i)).toHaveCount(0);
        const issueInvoice = ownerPage.getByRole('button', { name: 'Request R999 invoice', exact: true });
        await expect(issueInvoice).toBeEnabled();
        const issued = ownerPage.waitForResponse(
          candidate => candidate.url().includes('billing.startManualEftCheckout') && candidate.request().method() === 'POST',
        );
        await issueInvoice.click();
        expect((await issued).status()).toBe(200);
        await expect(ownerPage.getByRole('button', { name: 'Continue to outstanding invoice', exact: true })).toBeVisible();
        const continued = ownerPage.waitForResponse(
          candidate => candidate.url().includes('billing.startManualEftCheckout') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Continue to outstanding invoice', exact: true }).click();
        expect((await continued).status()).toBe(200);

        const [invoice] = await query(
          `SELECT id, invoice_number AS invoiceNumber, amount_due AS amountDue, status, payment_reference AS paymentReference
             FROM billing_invoices WHERE billable_account_id = ? ORDER BY id DESC LIMIT 1`,
          [billableAccountId],
        );
        expect(invoice).toMatchObject({ amountDue: 99900, status: 'issued' });
        const [invoiceCount] = await query(
          'SELECT COUNT(*) AS total FROM billing_invoices WHERE billable_account_id = ?',
          [billableAccountId],
        );
        expect(Number(invoiceCount.total)).toBe(1);

        await ownerPage.locator('#payment-amount').fill('999.00');
        await ownerPage.locator('#bank-reference').fill(`B05-EFT-${runId.slice(0, 8)}`);
        await ownerPage.locator('#payer-name').fill(agencyName);
        await ownerPage.locator('#proof-file').setInputFiles({
          name: 'b05-agency-proof.png',
          mimeType: 'image/png',
          buffer: onePixelPng,
        });
        const proof = ownerPage.waitForResponse(
          candidate => candidate.url().includes('billing.submitPaymentProof') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Submit proof', exact: true }).click();
        expect((await proof).status()).toBe(200);
        await expect(ownerPage.getByText('Proof submitted for finance review')).toBeVisible();

        const [underReview] = await query(
          `SELECT subscription.status, payment.state, invoice.status AS invoiceStatus
             FROM subscriptions subscription
             INNER JOIN billing_invoices invoice ON invoice.subscription_id = subscription.id
             INNER JOIN billing_payments payment ON payment.invoice_id = invoice.id
            WHERE subscription.id = ? ORDER BY payment.id DESC LIMIT 1`,
          [subscriptionId],
        );
        expect(underReview).toMatchObject({
          status: 'payment_under_review',
          state: 'under_review',
          invoiceStatus: 'submitted',
        });
      });

      await test.step('Finance approval creates only the Agency-owned 90-day term', async () => {
        await signInAsReviewer(reviewerPage, '/admin/finance');
        await expect(reviewerPage.getByRole('heading', { name: 'Subscription Management' })).toBeVisible();
        const financeRow = reviewerPage.getByRole('row').filter({ hasText: ownerEmail }).first();
        await expect(financeRow).toBeVisible();
        await financeRow.getByRole('button', { name: 'Approve', exact: true }).click();
        await reviewerPage.getByLabel('Verified amount in cents').fill('99900');
        await reviewerPage.getByLabel('Finance reconciliation note').fill(
          'B05 controlled EFT reconciliation against the Agency-owned R999 invoice.',
        );
        await reviewerPage.getByRole('button', { name: 'Confirm finance approval', exact: true }).click();
        await expect(reviewerPage.getByText('Finance review recorded')).toBeVisible();

        const [term] = await query(
          `SELECT subscription.status,
                  TIMESTAMPDIFF(SECOND, subscription.current_period_start, subscription.current_period_end) AS termSeconds,
                  account.account_kind AS accountKind, account.agency_id AS accountAgencyId,
                  subscription.owner_type AS ownerType, subscription.owner_id AS ownerId,
                  plan.name AS planName
             FROM subscriptions subscription
             INNER JOIN billable_accounts account ON account.id = subscription.billable_account_id
             INNER JOIN plans plan ON plan.id = subscription.plan_id
            WHERE subscription.id = ?`,
          [subscriptionId],
        );
        expect(term).toMatchObject({
          status: 'active',
          accountKind: 'agency',
          accountAgencyId: agencyId,
          ownerType: 'agency',
          ownerId: agencyId,
          planName: 'agency_launch_access',
        });
        expect(Number(term.termSeconds)).toBe(90 * 24 * 60 * 60);
      });

      await test.step('New-user invitation uses the captured application URL and grants one canonical membership', async () => {
        const captureCount = capturedInvitations().length;
        await ownerPage.goto('/agency/team/invitations');
        await ownerPage.getByPlaceholder('agent@example.com').fill(firstMemberEmail);
        const invitationRequest = ownerPage.waitForResponse(
          candidate => candidate.url().includes('invitation.create') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Send invitation', exact: true }).click();
        expect((await invitationRequest).status()).toBe(200);
        const message = await waitForInvitationEmail(firstMemberEmail, captureCount);
        await expect(ownerPage.getByText(firstMemberEmail, { exact: true })).toBeVisible();

        await registerAndVerify(firstMemberPage, {
          email: firstMemberEmail,
          password: firstMemberPassword,
          name: firstMemberName,
          registrationPath: '/login?mode=register',
          roleButton: 'Buyer / User',
          submitButton: 'Create free account',
          expectedPath: /\/user\/dashboard\?verified=true/,
        });
        // This is the URL delivered by the real invitation email, never a
        // reconstructed link or SQL token extraction.
        await firstMemberPage.goto(message.invitationUrl);
        await expect(firstMemberPage.getByText(agencyName, { exact: true })).toBeVisible();
        const accepted = firstMemberPage.waitForResponse(
          candidate => candidate.url().includes('invitation.accept') && candidate.request().method() === 'POST',
        );
        await firstMemberPage.getByRole('button', { name: 'Accept Invitation', exact: true }).click();
        expect((await accepted).status()).toBe(200);
        await expect(firstMemberPage).toHaveURL(/\/agent\/(dashboard|setup)/);
        await completeFirstMemberProfile(firstMemberPage);

        const [membership] = await query(
          `SELECT user.id AS userId, agent.id AS agentId, membership.status, membership.effective_to AS effectiveTo,
                  invitation.status AS invitationStatus
             FROM users user
             INNER JOIN agents agent ON agent.userId = user.id
             INNER JOIN agency_agent_memberships membership ON membership.agent_id = agent.id
             INNER JOIN invitations invitation ON invitation.acceptedBy = user.id
            WHERE user.email = ? AND membership.agency_id = ? ORDER BY invitation.id DESC LIMIT 1`,
          [firstMemberEmail, agencyId],
        );
        expect(membership).toMatchObject({ status: 'active', effectiveTo: null, invitationStatus: 'accepted' });
        firstMemberAgentId = Number(membership.agentId);
        await firstMemberPage.goto('/agent/dashboard');
        await expect(firstMemberPage.getByText('Your agency manages Launch Access')).toBeVisible();
        await firstMemberPage.goto('/agent/select-package');
        await expect(firstMemberPage.getByTestId('agent-package-preparation')).toBeVisible();
        const [personalBilling] = await query(
          `SELECT COUNT(*) AS total
             FROM billable_accounts account
             INNER JOIN users user ON user.id = account.user_id
            WHERE account.account_kind = 'agent' AND user.email = ?`,
          [firstMemberEmail],
        );
        expect(Number(personalBilling.total)).toBe(0);
      });

      await test.step('Existing verified user accepts a second delivered invitation', async () => {
        await registerAndVerify(secondMemberPage, {
          email: secondMemberEmail,
          password: secondMemberPassword,
          name: secondMemberName,
          registrationPath: '/login?mode=register',
          roleButton: 'Buyer / User',
          submitButton: 'Create free account',
          expectedPath: /\/user\/dashboard\?verified=true/,
        });
        const captureCount = capturedInvitations().length;
        await ownerPage.goto('/agency/team/invitations');
        await ownerPage.getByPlaceholder('agent@example.com').fill(secondMemberEmail);
        const invitationRequest = ownerPage.waitForResponse(
          candidate => candidate.url().includes('invitation.create') && candidate.request().method() === 'POST',
        );
        await ownerPage.getByRole('button', { name: 'Send invitation', exact: true }).click();
        expect((await invitationRequest).status()).toBe(200);
        const message = await waitForInvitationEmail(secondMemberEmail, captureCount);
        await secondMemberPage.goto(message.invitationUrl);
        await secondMemberPage.getByRole('button', { name: 'Accept Invitation', exact: true }).click();
        await expect(secondMemberPage).toHaveURL(/\/agent\/(dashboard|setup)/);

        const [membership] = await query(
          `SELECT agent.id AS agentId, membership.status, membership.effective_to AS effectiveTo
             FROM users user
             INNER JOIN agents agent ON agent.userId = user.id
             INNER JOIN agency_agent_memberships membership ON membership.agent_id = agent.id
            WHERE user.email = ? AND membership.agency_id = ? LIMIT 1`,
          [secondMemberEmail, agencyId],
        );
        expect(membership).toMatchObject({ status: 'active', effectiveTo: null });
        secondMemberAgentId = Number(membership.agentId);
      });

      await test.step('A current member creates Agency inventory, custody-confirmed media, and moderated public projections', async () => {
        const sale = await createAndSubmitSaleListing(firstMemberPage);
        expect(sale.ownerId).toBeGreaterThan(0);
        expect(sale.agencyId).toBe(agencyId);
        expect(sale.agentId).toBe(firstMemberAgentId);
        const [media] = await query(
          `SELECT COUNT(*) AS total FROM listing_media
            WHERE listingId = ? AND mediaType = 'image' AND processingStatus = 'completed'`,
          [sale.id],
        );
        expect(Number(media.total)).toBe(5);
        salePropertyId = await approveListing(reviewerPage, sale.id);
        const rental = await createAndSubmitRentalListing(firstMemberPage);
        const rentalPropertyId = await approveListing(reviewerPage, rental.id);
        const publicContext = await browser.newContext();
        const publicPage = await publicContext.newPage();
        try {
          await publicPage.goto(
            `/property-for-sale?locationId=${encodeURIComponent(`suburb:${sale.suburbId}`)}`,
          );
          await publicPage.getByRole('link', { name: `View ${saleTitle}` }).click();
          await expect(publicPage).toHaveURL(new RegExp(`/property/${salePropertyId}(?:-|$)`));
          await expect(publicPage.getByRole('heading', { name: saleTitle, exact: true })).toBeVisible();
          await expect(
            publicPage.getByLabel('Listing organization').getByText(agencyName, { exact: true }),
          ).toBeVisible();
          await expect(publicPage.getByRole('button', { name: `Open photo gallery for ${saleTitle}` })).toBeVisible();

          await publicPage.goto(
            `/property-to-rent?locationId=${encodeURIComponent(`suburb:${rental.suburbId}`)}`,
          );
          await publicPage.getByRole('link', { name: `View ${rentalTitle}` }).click();
          await expect(publicPage).toHaveURL(new RegExp(`/property/${rentalPropertyId}(?:-|$)`));
          await expect(
            publicPage.getByRole('complementary', { name: 'Rental decision summary' }),
          ).toBeVisible();
        } finally {
          await publicContext.close();
        }
      });

      await test.step('Buyer enquiry stays in Agency custody through replay, reassignment, and follow-up', async () => {
        const buyerContext = await browser.newContext();
        const buyerPage = await buyerContext.newPage();
        prospectName = `B05 Prospect ${runId.slice(0, 8)}`;
        const prospectEmail = `b05-prospect-${runId}@example.test`;
        const prospectMessage = `Please arrange a viewing for ${saleTitle}.`;
        try {
          await buyerPage.goto(`/property/${salePropertyId}`);
          await buyerPage.getByRole('button', { name: 'Send enquiry', exact: true }).first().click();
          const enquiry = buyerPage.getByRole('dialog', { name: 'Send an enquiry' });
          await enquiry.getByLabel('Your Name').fill(prospectName);
          await enquiry.getByLabel('Email Address').fill(prospectEmail);
          await enquiry.getByLabel('Phone Number').fill('+27825550199');
          await enquiry.getByLabel('Message').fill(prospectMessage);
          await enquiry.getByLabel(/I agree to be contacted about this enquiry/).check();
          const sent = buyerPage.waitForRequest(
            candidate => candidate.url().includes('/api/trpc/leads.create') && candidate.method() === 'POST',
          );
          await enquiry.getByRole('button', { name: 'Send enquiry', exact: true }).click();
          const request = await sent;
          await expect(buyerPage.getByRole('dialog', { name: 'Enquiry received' })).toBeVisible();
          const replay = await buyerPage.request.fetch(request.url(), {
            method: request.method(),
            headers: { 'content-type': (await request.headerValue('content-type')) || 'application/json' },
            data: request.postData() || undefined,
          });
          expect(replay.status()).toBe(200);
        } finally {
          await buyerContext.close();
        }

        const [lead] = await query(
          `SELECT id, agencyId, agentId, assigned_to AS assignedTo, capture_request_id AS captureRequestId
             FROM leads WHERE propertyId = ? AND email = ? ORDER BY id DESC LIMIT 1`,
          [salePropertyId, prospectEmail],
        );
        expect(lead).toMatchObject({ agencyId, agentId: firstMemberAgentId });
        leadId = Number(lead.id);
        const [replayCount] = await query(
          'SELECT COUNT(*) AS total FROM leads WHERE propertyId = ? AND capture_request_id = ?',
          [salePropertyId, lead.captureRequestId],
        );
        expect(Number(replayCount.total)).toBe(1);

        await ownerPage.goto('/agency/leads');
        await ownerPage.getByText(prospectName, { exact: true }).click();
        const detail = ownerPage.getByRole('dialog', { name: prospectName });
        await expect(detail).toBeVisible();
        await expect(detail.getByText(saleTitle, { exact: true })).toBeVisible();
        await detail.getByLabel('Lead assignee').selectOption(String(firstMemberAgentId));
        await expect
          .poll(async () => (await query('SELECT agentId, assigned_to AS assignedTo, agencyId FROM leads WHERE id = ?', [leadId]))[0])
          .toMatchObject({ agentId: firstMemberAgentId, agencyId });
        await detail.getByLabel('Lead assignee').selectOption(String(secondMemberAgentId));
        await expect
          .poll(async () => (await query('SELECT agentId, assigned_to AS assignedTo, agencyId FROM leads WHERE id = ?', [leadId]))[0])
          .toMatchObject({ agentId: secondMemberAgentId, agencyId });

        contactSummary = `Called ${prospectName}; confirmed interest and agreed next steps.`;
        noteText = `Owner note for ${prospectName}: confirm the property detail and representative.`;
        followUpNote = `Follow up with ${prospectName} after the Agency assignment handover.`;
        await detail.getByLabel('Buyer contact summary').fill(contactSummary);
        await detail.getByLabel('Buyer contact next action').fill('Confirm viewing availability');
        await detail.getByRole('button', { name: 'Record contact and next action', exact: true }).click();
        await expect(detail.getByText(contactSummary, { exact: true })).toBeVisible();
        await detail.getByPlaceholder('Add contact notes').fill(noteText);
        await detail.getByRole('button', { name: 'Save note', exact: true }).click();
        await expect(detail.getByText(noteText, { exact: true })).toBeVisible();
        const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        await detail.getByLabel('Lead follow-up at').fill(followUpAt);
        await detail.getByPlaceholder('Follow-up note').fill(followUpNote);
        const scheduled = ownerPage.waitForResponse(
          candidate => candidate.url().includes('agency.setLeadFollowUp') && candidate.request().method() === 'POST',
        );
        await detail.getByRole('button', { name: 'Schedule', exact: true }).click();
        expect((await scheduled).status()).toBe(200);
        await expect(detail.getByText(followUpNote, { exact: true }).last()).toBeVisible();
        await ownerPage.reload();
        await ownerPage.getByText(prospectName, { exact: true }).click();
        const reloadedDetail = ownerPage.getByRole('dialog', { name: prospectName });
        await expect(reloadedDetail.getByText(contactSummary, { exact: true })).toBeVisible();
        await expect(reloadedDetail.getByText(noteText, { exact: true })).toBeVisible();
        await expect(reloadedDetail.getByText(followUpNote, { exact: true }).last()).toBeVisible();

        const [custody] = await query(
          `SELECT agencyId, agentId, assigned_to AS assignedTo, firstRespondedAt, lastContactedAt, nextFollowUp
             FROM leads WHERE id = ?`,
          [leadId],
        );
        expect(custody).toMatchObject({ agencyId, agentId: secondMemberAgentId });
        expect(custody.firstRespondedAt).toBeTruthy();
        expect(custody.lastContactedAt).toBeTruthy();
        expect(custody.nextFollowUp).toBeTruthy();
      });

      await test.step('Ordinary member administration remains closed and same-browser drafts remain owner-bound', async () => {
        await secondMemberPage.goto('/agency/leads');
        await expect(secondMemberPage).toHaveURL(/\/agent\/dashboard/);
        await secondMemberPage.goto('/agency/team/invitations');
        await expect(secondMemberPage).toHaveURL(/\/agent\/dashboard/);

        await firstMemberPage.goto('/listings/create');
        await firstMemberPage.getByRole('radio', { name: /For Sale/ }).click();
        await next(firstMemberPage);
        await firstMemberPage.getByRole('radio', { name: /House/ }).click();
        await next(firstMemberPage);
        const privateDraftTitle = `B05 member-private-draft-${runId.slice(0, 8)}`;
        await firstMemberPage.locator('#title').fill(privateDraftTitle);
        await firstMemberPage.getByRole('button', { name: 'Save progress on this device' }).click();
        await expect(firstMemberPage.getByRole('button', { name: 'Saved on this device' })).toBeVisible();
        await firstMemberPage.goto('/agent/dashboard');
        await firstMemberPage.getByRole('button', { name: 'Logout', exact: true }).click();
        await expect(firstMemberPage).toHaveURL(/\/login$/);
        await signIn(firstMemberPage, {
          email: secondMemberEmail,
          password: secondMemberPassword,
          target: '/agent/dashboard',
        });
        await firstMemberPage.goto('/listings/create');
        await expect(firstMemberPage.getByRole('dialog', { name: 'Resume Draft Listing?' })).toHaveCount(0);
        await expect
          .poll(() => firstMemberPage.evaluate(() => window.localStorage.getItem('listing-wizard-storage')))
          .toBeNull();
      });

      await test.step('Scoped expiry stops new commercial value while preserving Agency history', async () => {
        // The single permitted terminal fixture transition is scoped to this
        // run's Agency-owned term after the live paid journey completed.
        await query(
          `UPDATE subscriptions
              SET current_period_end = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
            WHERE id = ? AND billable_account_id = ? AND owner_type = 'agency' AND owner_id = ? AND status = 'active'`,
          [subscriptionId, billableAccountId, agencyId],
        );

        const expiredBuyerContext = await browser.newContext();
        const expiredBuyerPage = await expiredBuyerContext.newPage();
        try {
          await expiredBuyerPage.goto(`/property/${salePropertyId}`);
          await expect(
            expiredBuyerPage.getByRole('heading', {
              name: /Property (no longer available|temporarily unavailable)/,
            }),
          ).toBeVisible();
          await expect(expiredBuyerPage.getByRole('button', { name: 'Send enquiry', exact: true })).toHaveCount(0);
        } finally {
          await expiredBuyerContext.close();
        }

        await secondMemberPage.goto('/listings/create');
        await expect(secondMemberPage.getByRole('status')).toContainText('Prepare your listing before activation');
        await expect(secondMemberPage.getByRole('button', { name: 'Submit Listing', exact: true })).toHaveCount(0);

        const [retained] = await query(
          `SELECT agency.id AS agencyId,
                  (SELECT COUNT(*) FROM agency_agent_memberships membership
                    INNER JOIN agents agent ON agent.id = membership.agent_id
                   WHERE membership.agency_id = agency.id AND membership.status = 'active') AS activeMemberships,
                  (SELECT COUNT(*) FROM leads lead_record WHERE lead_record.id = ? AND lead_record.agencyId = agency.id) AS retainedLead,
                  (SELECT COUNT(*) FROM lead_activities activity_record WHERE activity_record.leadId = ?) AS retainedActivities,
                  subscription.status, subscription.current_period_end AS currentPeriodEnd
             FROM agencies agency
             INNER JOIN subscriptions subscription ON subscription.owner_id = agency.id AND subscription.owner_type = 'agency'
            WHERE agency.id = ? AND subscription.id = ?`,
          [leadId, leadId, agencyId, subscriptionId],
        );
        expect(retained).toMatchObject({ agencyId, retainedLead: 1, status: 'expired' });
        expect(Number(retained.activeMemberships)).toBeGreaterThanOrEqual(2);
        expect(Number(retained.retainedActivities)).toBeGreaterThanOrEqual(4);
        expect(retained.currentPeriodEnd).toBeTruthy();
        const [noPersonalFallback] = await query(
          `SELECT COUNT(*) AS total
             FROM subscriptions subscription
             INNER JOIN billable_accounts account ON account.id = subscription.billable_account_id
             INNER JOIN users user ON user.id = account.user_id
            WHERE account.account_kind = 'agent'
              AND user.email IN (?, ?)
              AND subscription.status IN ('active', 'grace_period')`,
          [firstMemberEmail, secondMemberEmail],
        );
        expect(Number(noPersonalFallback.total)).toBe(0);
      });
    } finally {
      await Promise.allSettled([
        reviewerContext.close(),
        firstMemberContext.close(),
        secondMemberContext.close(),
      ]);
    }
  });
});

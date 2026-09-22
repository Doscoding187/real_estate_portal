import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const runtimeLog = '/tmp/property-listify-b04-independent-agent-paid-mvp-browser-runtime.log';
const apiOrigin = 'http://localhost:5000';
const reviewerEmail = 'ple-reviewer@listify.local';
const runId = randomUUID();
const agentEmail = `b04-agent-${runId}@invalid.example`;
const agentPassword = `B04!${randomUUID()}9a`;
const agentName = `B04 Independent Agent ${runId.slice(0, 8)}`;
const listingTitle = `B04 Sandton Agent Listing ${runId.slice(0, 8)}`;
const rentalListingTitle = `B04 Sandton Rental Listing ${runId.slice(0, 8)}`;
const listingDescription =
  'A controlled Independent Agent listing proving paid launch inventory, moderation, discovery, and enquiry custody.';
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0uQAAAABJRU5ErkJggg==',
  'base64',
);

type Row = Record<string, unknown>;
type AgentCredentials = {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
};

const primaryAgentCredentials: AgentCredentials = {
  email: agentEmail,
  password: agentPassword,
  name: agentName,
  phoneNumber: '+27820000010',
};

let connection: AuthoritySqlConnection | undefined;
let fixtureAgent: { userId: number; agentId: number } | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection) throw new Error('B04 database connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

async function archiveJourneyArtifacts(): Promise<void> {
  if (!fixtureAgent) return;

  const candidates = await query(
    `SELECT id
       FROM listings
      WHERE ownerId = ?
        AND title IN (?, ?)
        AND status <> 'archived'
      ORDER BY id ASC`,
    [fixtureAgent.userId, listingTitle, rentalListingTitle],
  );
  if (candidates.length === 0) return;

  const { appRouter } = await import('../../server/routers');
  const caller = appRouter.createCaller({
    req: {
      hostname: 'localhost',
      path: '/',
      method: 'POST',
      headers: { host: 'localhost:5000' },
      socket: { remoteAddress: '127.0.0.1' },
    },
    res: { cookie: () => undefined, clearCookie: () => undefined },
    user: { id: fixtureAgent.userId, email: agentEmail, role: 'agent', agencyId: null },
    requestId: `b04-fixture-cleanup-${runId}`,
  } as any);

  for (const candidate of candidates) {
    await caller.listing.archive({ id: Number(candidate.id) });
  }

  const remainingPublicProjections = await query(
    `SELECT property.id
       FROM properties property
       INNER JOIN listings listing ON listing.id = property.sourceListingId
      WHERE listing.ownerId = ?
        AND listing.title IN (?, ?)
        AND property.status <> 'archived'`,
    [fixtureAgent.userId, listingTitle, rentalListingTitle],
  );
  expect(remainingPublicProjections).toHaveLength(0);
}

function latestVerificationToken(): string | null {
  try {
    const contents = readFileSync(runtimeLog, 'utf8');
    const matches = [
      ...contents.matchAll(/\[Email Local Dev\] Verification URL: .*?[?&]token=([a-f0-9]{64})/g),
    ];
    return matches.at(-1)?.[1] || null;
  } catch {
    return null;
  }
}

async function waitForVerificationToken(previous: string | null): Promise<string> {
  await expect
    .poll(() => latestVerificationToken(), { timeout: 30_000, intervals: [250, 500, 1000] })
    .not.toBeNull();
  const token = latestVerificationToken();
  if (!token || token === previous) {
    throw new Error('The local verification transport did not produce a new token.');
  }
  return token;
}

function reviewerPassword(): string {
  const password = process.env.LOCAL_PLE_REVIEWER_PASSWORD;
  if (!password) throw new Error('The governed reviewer password is not available.');
  return password;
}

async function signInAsReviewer(page: Page, target: string) {
  await page.goto(`/login?mode=signin&next=${encodeURIComponent(target)}`);
  const signIn = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(signIn).toBeVisible();
  await signIn.getByPlaceholder('you@example.com').fill(reviewerEmail);
  await signIn.getByPlaceholder('Enter your password').fill(reviewerPassword());
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
  );
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
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

async function registerAndVerifyAgent(page: Page, credentials = primaryAgentCredentials) {
  const previousToken = latestVerificationToken();
  await page.goto('/advertise/sell/agents');
  await expect(page.getByText('R499 once-off')).toBeVisible();
  await page.getByRole('link', { name: 'Create your Agent account' }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=register&next=.*role=agent/);

  const registration = page.getByRole('dialog');
  await registration.locator('input[name="name"]').fill(credentials.name);
  await registration.locator('input[name="email"]').fill(credentials.email);
  await registration.locator('input[name="phoneNumber"]').fill(credentials.phoneNumber);
  await registration.locator('input[name="password"]').fill(credentials.password);
  await registration.locator('input[name="confirmPassword"]').fill(credentials.password);
  const registrationResponse = page.waitForResponse(
    candidate =>
      candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST',
  );
  await registration.getByRole('button', { name: 'Set up Agent OS' }).click();
  expect((await registrationResponse).status()).toBe(201);
  const [unverified] = await query('SELECT emailVerified, role FROM users WHERE email = ?', [
    credentials.email,
  ]);
  expect(unverified).toMatchObject({ emailVerified: 0, role: 'agent' });

  const token = await waitForVerificationToken(previousToken);
  await page.goto(`${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  await expect(page).toHaveURL(/\/agent\/setup\?verified=true/);
  await expect(page.getByRole('heading', { name: 'Finish your agent setup' })).toBeVisible();

  await page.getByPlaceholder('Jane Doe').fill(credentials.name);
  await page.getByPlaceholder('+27 82 000 0000').first().fill(credentials.phoneNumber);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'b04-agent-profile.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  });
  await expect(page.getByText('Profile photo uploaded.')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

  await page.getByPlaceholder('Search suburb, city, or province').fill('Sandton');
  await page.locator('[cmdk-item]').filter({ hasText: 'Sandton' }).first().click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByPlaceholder('Tell clients about your experience and what you specialize in.').fill(
    'Independent residential property professional completing the paid launch journey.',
  );
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button', { name: 'Complete Setup' }).click();
  await expect(page).toHaveURL(/\/agent\/dashboard/);

  const [profile] = await query(
    `SELECT u.id AS userId, u.emailVerified, u.role, a.id AS agentId, a.status, a.profileImage
      FROM users u INNER JOIN agents a ON a.userId = u.id WHERE u.email = ? LIMIT 1`,
    [credentials.email],
  );
  expect(profile).toMatchObject({ emailVerified: 1, role: 'agent', status: 'pending' });
  expect(Number(profile.userId)).toBeGreaterThan(0);
  expect(Number(profile.agentId)).toBeGreaterThan(0);
  return { userId: Number(profile.userId), agentId: Number(profile.agentId) };
}

async function createPrivateDraft(page: Page, title: string) {
  await page.goto('/listings/create');
  await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
  await page.getByRole('radio', { name: /For Sale/ }).click();
  await next(page);
  await page.getByRole('radio', { name: /House/ }).click();
  await next(page);
  await page.locator('#title').fill(title);
}

async function approveAgent(reviewerPage: Page, displayName: string) {
  await signInAsReviewer(reviewerPage, '/admin/agent-approvals');
  await expect(reviewerPage.getByRole('heading', { name: 'Agent Approvals' })).toBeVisible();
  const display = reviewerPage.getByText(displayName, { exact: true });
  await expect(display).toBeVisible();
  const card = display.locator('xpath=ancestor::div[.//button][1]');
  await card.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(reviewerPage.getByText('Agent approved successfully!')).toBeVisible();
}

async function requestInvoiceAndSubmitProof(page: Page) {
  await page.goto('/agent/select-package');
  await expect(page.getByRole('heading', { name: 'You selected Agent Launch Access.' })).toBeVisible();
  await expect(page.getByText('R499', { exact: true })).toBeVisible();
  await expect(page.getByText('Manual EFT', { exact: true })).toBeVisible();
  await expect(page.getByText('No automatic renewal', { exact: true })).toBeVisible();

  const request = page.waitForResponse(
    candidate =>
      candidate.url().includes('/agent/request-launch-access-invoice') &&
      candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Get Agent Launch Access', exact: true }).click();
  expect((await request).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Agent Launch Access invoice' })).toBeVisible();
  await expect(page.getByText(/R\s?499[,.]00 once-off for 90 days\./)).toBeVisible();

  await page.locator('#agent-payment-amount').fill('499.00');
  await page.locator('#agent-bank-reference').fill(`B04-EFT-${runId.slice(0, 8)}`);
  await page.locator('#agent-payer-name').fill(agentName);
  await page.locator('#agent-proof-file').setInputFiles({
    name: 'b04-payment-proof.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  });
  const proofRequest = page.waitForResponse(
    candidate =>
      candidate.url().includes('billing.submitLaunchAccessPaymentProof') &&
      candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit proof for review' }).click();
  expect((await proofRequest).status()).toBe(200);
  await expect(page).toHaveURL(/\/agent\/dashboard/);

  const [payment] = await query(
    `SELECT payment.state, payment.amount, invoice.status AS invoiceStatus,
            subscription.status AS subscriptionStatus
       FROM billing_payments payment
       INNER JOIN billing_invoices invoice ON invoice.id = payment.invoice_id
       LEFT JOIN subscriptions subscription ON subscription.id = payment.subscription_id
       INNER JOIN users owner ON owner.id = payment.submitted_by
      WHERE owner.email = ? ORDER BY payment.id DESC LIMIT 1`,
    [agentEmail],
  );
  expect(payment).toMatchObject({
    state: 'under_review',
    amount: 49900,
    invoiceStatus: 'submitted',
    subscriptionStatus: 'payment_under_review',
  });
}

async function approvePayment(reviewerPage: Page) {
  await reviewerPage.goto('/admin/finance');
  await expect(reviewerPage.getByRole('heading', { name: 'Subscription Management' })).toBeVisible();
  await expect(reviewerPage.getByText(agentEmail, { exact: true })).toBeVisible();
  const row = reviewerPage.locator('tr').filter({ hasText: agentEmail }).first();
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(reviewerPage.getByRole('dialog')).toBeVisible();
  await reviewerPage.getByLabel('Verified amount in cents').fill('49900');
  await reviewerPage.getByLabel('Finance reconciliation note').fill(
    'B04 controlled EFT receipt reconciled against the R499 Agent Launch Access invoice.',
  );
  await reviewerPage.getByRole('button', { name: 'Confirm finance approval' }).click();
  await expect(reviewerPage.getByText('Finance review recorded')).toBeVisible();

  const [subscription] = await query(
    `SELECT subscription.id AS subscriptionId,
            subscription.status,
            subscription.current_period_start AS currentPeriodStart,
            subscription.current_period_end AS currentPeriodEnd,
            TIMESTAMPDIFF(SECOND, subscription.current_period_start, subscription.current_period_end) AS termSeconds,
            JSON_UNQUOTE(JSON_EXTRACT(plan.metadata, '$.commercial_product_key')) AS productKey,
            plan.price
       FROM subscriptions subscription INNER JOIN plans plan ON plan.id = subscription.plan_id
       INNER JOIN billable_accounts account ON account.id = subscription.billable_account_id
       INNER JOIN users owner ON owner.id = account.user_id
      WHERE owner.email = ? ORDER BY subscription.id DESC LIMIT 1`,
    [agentEmail],
  );
  expect(subscription).toMatchObject({ status: 'active', productKey: 'agent_launch_access', price: 49900 });
  expect(Number(subscription.subscriptionId)).toBeGreaterThan(0);
  expect(subscription.currentPeriodStart).toBeTruthy();
  expect(subscription.currentPeriodEnd).toBeTruthy();
  expect(Number(subscription.termSeconds)).toBe(90 * 24 * 60 * 60);
  return { subscriptionId: Number(subscription.subscriptionId) };
}

async function createAndSubmitListing(page: Page) {
  await page.goto('/listings/create');
  await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
  await page.getByRole('radio', { name: /For Sale/ }).click();
  await next(page);
  await page.getByRole('radio', { name: /House/ }).click();
  await next(page);

  await page.locator('#title').fill(listingTitle);
  await page.locator('#description').fill(listingDescription);
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
  await page.locator('#location-street-number').fill('12');
  await page.locator('#location-street-name').fill('Katherine Street');
  await page.getByRole('button', { name: 'Confirm location', exact: true }).click();
  await expect(page.getByText(/Ready to continue/)).toBeVisible();
  await next(page);

  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `b04-listing-${index}.png`,
      mimeType: 'image/png',
      buffer: onePixelPng,
    })),
  );
  await expect(page.getByText('Uploaded Media (5)', { exact: true })).toBeVisible();
  await next(page);
  await expect(page.getByText('All readiness requirements are complete.')).toBeVisible();
  const submission = page.waitForResponse(
    candidate =>
      candidate.url().includes('listing.submitForReview') && candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();
  expect((await submission).status()).toBe(200);
  await expect(page).toHaveURL(/\/agent\/dashboard/);

  const [listing] = await query(
    `SELECT id, ownerId, agentId, status, approvalStatus, suburb_id AS suburbId
       FROM listings WHERE title = ? LIMIT 1`,
    [listingTitle],
  );
  expect(listing).toMatchObject({ status: 'pending_review', approvalStatus: 'pending' });
  expect(Number(listing.ownerId)).toBeGreaterThan(0);
  expect(Number(listing.agentId)).toBeGreaterThan(0);
  const [media] = await query(
    `SELECT COUNT(*) AS total FROM listing_media
      WHERE listingId = ? AND processingStatus = 'completed'`,
    [listing.id],
  );
  expect(Number(media.total)).toBe(5);
  return { id: Number(listing.id), suburbId: Number(listing.suburbId) };
}

async function createAndSubmitRentalListing(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/listings/create');
  await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
  await page.getByRole('radio', { name: /To Rent/ }).click();
  await next(page);
  await page.getByRole('radio', { name: /House/ }).click();
  await next(page);

  await page.locator('#title').fill(rentalListingTitle);
  await page.locator('#description').fill(
    'A controlled rental listing proving the approved Independent Agent launch path for tenants on mobile, with clear home facts, rental terms, and moderated public discovery.',
  );
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
  await page.locator('#location-street-number').fill('14');
  await page.locator('#location-street-name').fill('Katherine Street');
  await page.getByRole('button', { name: 'Confirm location', exact: true }).click();
  await expect(page.getByText(/Ready to continue/)).toBeVisible();
  await next(page);

  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `b04-rental-${index}.png`,
      mimeType: 'image/png',
      buffer: onePixelPng,
    })),
  );
  await expect(page.getByText('Uploaded Media (5)', { exact: true })).toBeVisible();
  await next(page);
  await expect(page.getByText('All readiness requirements are complete.')).toBeVisible();
  const rentalSubmission = page.waitForResponse(
    candidate =>
      candidate.url().includes('listing.submitForReview') && candidate.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();
  expect((await rentalSubmission).status()).toBe(200);

  const [listing] = await query(
    `SELECT id, action, ownerId, agentId, status, approvalStatus, suburb_id AS suburbId
       FROM listings WHERE title = ? LIMIT 1`,
    [rentalListingTitle],
  );
  expect(listing).toMatchObject({
    action: 'rent',
    status: 'pending_review',
    approvalStatus: 'pending',
  });
  expect(Number(listing.ownerId)).toBeGreaterThan(0);
  expect(Number(listing.agentId)).toBeGreaterThan(0);
  return { id: Number(listing.id), suburbId: Number(listing.suburbId) };
}

async function approveListing(reviewerPage: Page, listingId: number) {
  await reviewerPage.goto(`/admin/review/${listingId}`);
  await expect(reviewerPage.getByText('Listing review', { exact: true })).toBeVisible();
  await reviewerPage.getByRole('button', { name: 'Approve & publish', exact: true }).click();
  await expect(reviewerPage.getByText('Approve this listing for publication', { exact: true })).toBeVisible();
  await reviewerPage.getByRole('checkbox').check();
  await reviewerPage.getByPlaceholder('Any internal context about this approval…').fill(
    'B04 controlled Agent listing approved after readiness and media review.',
  );
  await reviewerPage.getByRole('button', { name: 'Confirm approval', exact: true }).click();
  await expect(reviewerPage.getByText('Property approved and published successfully', { exact: true })).toBeVisible();

  const [published] = await query(
    `SELECT listing.status, listing.approvalStatus, property.id AS propertyId,
            property.sourceListingId, propertyImages.id AS imageId
       FROM listings listing INNER JOIN properties property ON property.sourceListingId = listing.id
       LEFT JOIN propertyImages ON propertyImages.propertyId = property.id
      WHERE listing.id = ? LIMIT 1`,
    [listingId],
  );
  expect(published).toMatchObject({ status: 'published', approvalStatus: 'approved', sourceListingId: listingId });
  expect(Number(published.propertyId)).toBeGreaterThan(0);
  expect(Number(published.imageId)).toBeGreaterThan(0);
  return Number(published.propertyId);
}

async function verifyPublishedInventoryActions(
  page: Page,
  input: { listingId: number; propertyId: number; title: string },
) {
  expect(input.propertyId).not.toBe(input.listingId);

  await page.goto('/agent/listings');
  await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible();
  await expect(page.getByText(input.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View Property', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/property/${input.propertyId}(?:-|$)`));

  await page.goto('/agent/listings');
  await expect(page.getByTitle('Edit')).toBeEnabled();
  await page.getByTitle('Edit').click();
  await expect(page).toHaveURL(
    new RegExp(`/listings/create\\?id=${input.listingId}&edit=true(?:$|&)`),
  );
}

async function captureAndFollowLead(
  browser: Browser,
  agentPage: Page,
  propertyId: number,
  listingTitleValue: string,
) {
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  const prospectName = `B04 Prospect ${runId.slice(0, 8)}`;
  const prospectEmail = `b04-prospect-${runId}@example.test`;
  const prospectMessage = `Please arrange a viewing for ${listingTitleValue}.`;
  try {
    await buyerPage.goto(`/property/${propertyId}`);
    await expect(buyerPage.getByRole('heading', { name: listingTitleValue, exact: true })).toBeVisible();
    await buyerPage.getByRole('button', { name: 'Send enquiry', exact: true }).first().click();
    const enquiry = buyerPage.getByRole('dialog', { name: 'Send an enquiry' });
    await enquiry.getByLabel('Your Name').fill(prospectName);
    await enquiry.getByLabel('Email Address').fill(prospectEmail);
    await enquiry.getByLabel('Phone Number').fill('+27825550199');
    await enquiry.getByLabel('Message').fill(prospectMessage);
    await enquiry.getByLabel(/I agree to be contacted about this enquiry/).check();
    const request = buyerPage.waitForRequest(
      candidate => candidate.url().includes('/api/trpc/leads.create') && candidate.method() === 'POST',
    );
    await enquiry.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    const captured = await request;
    await expect(buyerPage.getByRole('dialog', { name: 'Enquiry received' })).toBeVisible();

    const replay = await buyerPage.request.fetch(captured.url(), {
      method: captured.method(),
      headers: { 'content-type': (await captured.headerValue('content-type')) || 'application/json' },
      data: captured.postData() || undefined,
    });
    expect(replay.status()).toBe(200);

    const [lead] = await query(
      `SELECT id, propertyId, agentId, email, message,
              capture_request_id AS captureRequestId
         FROM leads WHERE propertyId = ? AND email = ? ORDER BY id DESC LIMIT 1`,
      [propertyId, prospectEmail],
    );
    expect(lead).toMatchObject({ propertyId, email: prospectEmail, message: `[GENERAL ENQUIRY] ${prospectMessage}` });
    expect(Number(lead.agentId)).toBeGreaterThan(0);
    expect(lead.captureRequestId).toBeTruthy();
    const [replayed] = await query(
      `SELECT COUNT(*) AS total FROM leads
        WHERE propertyId = ? AND capture_request_id = ?`,
      [propertyId, lead.captureRequestId],
    );
    expect(Number(replayed.total)).toBe(1);

    await agentPage.goto(`/agent/leads?leadId=${lead.id}`);
    const workspace = agentPage.getByRole('dialog', { name: prospectName });
    await expect(workspace).toBeVisible();
    await expect(workspace.getByText(listingTitleValue, { exact: true })).toBeVisible();
    await expect(workspace.getByText(prospectMessage, { exact: false }).first()).toBeVisible();
    const contactOutcome = `Called ${prospectName}; confirmed interest.`;
    await workspace.locator(`#lead-note-${lead.id}`).fill(contactOutcome);
    await workspace.getByRole('button', { name: 'Record contact', exact: true }).click();
    await expect(workspace.getByText(contactOutcome, { exact: true })).toBeVisible();
    const followUpNote = `Follow up with ${prospectName} tomorrow.`;
    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    await workspace.locator(`#lead-follow-up-${lead.id}`).fill(followUpAt);
    await workspace.getByPlaceholder('What should happen next?').fill(followUpNote);
    await workspace.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
    await expect(workspace.getByRole('button', { name: 'Complete follow-up', exact: true })).toBeVisible();
    await agentPage.reload();
    await expect(agentPage.getByText(followUpNote, { exact: false })).toBeVisible();
    return {
      leadId: Number(lead.id),
      agentId: Number(lead.agentId),
      prospectEmail,
      prospectName,
      contactOutcome,
      followUpNote,
    };
  } finally {
    await buyerContext.close();
  }
}

async function expireAccessAndVerifyHistoricalLead(
  browser: Browser,
  agentPage: Page,
  input: {
    subscriptionId: number;
    propertyId: number;
    lead: {
      leadId: number;
      prospectName: string;
      contactOutcome: string;
      followUpNote: string;
    };
  },
) {
  await query(
    `UPDATE subscriptions
        SET current_period_end = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
      WHERE id = ? AND owner_type = 'agent' AND status = 'active'`,
    [input.subscriptionId],
  );
  const [expired] = await query(
    `SELECT status, current_period_end AS currentPeriodEnd
       FROM subscriptions WHERE id = ? LIMIT 1`,
    [input.subscriptionId],
  );
  expect(expired).toMatchObject({ status: 'active' });
  expect(expired.currentPeriodEnd).toBeTruthy();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  try {
    await buyerPage.goto(`/property/${input.propertyId}`);
    await expect(
      buyerPage.getByRole('heading', {
        name: /Property (no longer available|temporarily unavailable)/,
      }),
    ).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: 'Send enquiry', exact: true })).toHaveCount(0);
  } finally {
    await buyerContext.close();
  }

  await agentPage.goto('/listings/create');
  await expect(agentPage.getByRole('status')).toContainText('Prepare your listing before activation');
  await expect(agentPage.getByRole('button', { name: 'Submit Listing', exact: true })).toHaveCount(0);

  await agentPage.goto(`/agent/leads?leadId=${input.lead.leadId}`);
  const workspace = agentPage.getByRole('dialog', { name: input.lead.prospectName });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText(input.lead.contactOutcome, { exact: true })).toBeVisible();
  await expect(workspace.getByText(input.lead.followUpNote, { exact: false })).toBeVisible();
}

test.describe('B04 Independent Agent paid MVP value loop', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    if (
      authority.context.targetClass !== 'disposable-worktree' ||
      authority.context.targetFingerprintHash !== process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT
    ) {
      throw new Error('B04 browser proof requires the exact owned disposable target.');
    }
    connection = await createAuthoritySqlConnection(
      authority,
      authorizeDatabaseOperation(authority, { root: process.cwd() }),
    );
    reviewerPassword();
  });

  test.afterAll(async () => {
    try {
      await archiveJourneyArtifacts();
    } finally {
      await connection?.end();
    }
  });

  test('joins registration through durable Agent follow-up without paid-state seeding', async ({
    page,
    browser,
  }) => {
    const reviewerContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    try {
      const identity = await registerAndVerifyAgent(page);
      fixtureAgent = identity;
      await approveAgent(reviewerPage, agentName);
      await expect.poll(async () => (await query('SELECT status FROM agents WHERE id = ?', [identity.agentId]))[0]?.status).toBe('approved');

      await requestInvoiceAndSubmitProof(page);

      await page.goto('/listings/create');
      await expect(page.getByRole('status')).toContainText('Prepare your listing before activation');
      await expect(page.getByRole('button', { name: 'Submit Listing', exact: true })).toHaveCount(0);

      const entitlement = await approvePayment(reviewerPage);
      await page.goto('/agent/dashboard');
      await expect(page.getByText(/Launch Access active|90 days/i).first()).toBeVisible();

      const listing = await createAndSubmitListing(page);
      const propertyId = await approveListing(reviewerPage, listing.id);
      await verifyPublishedInventoryActions(page, {
        listingId: listing.id,
        propertyId,
        title: listingTitle,
      });
      await page.goto(`/property-for-sale?locationId=${encodeURIComponent(`suburb:${listing.suburbId}`)}`);
      await expect(page.getByRole('link', { name: `View ${listingTitle}` })).toBeVisible();
      await page.getByRole('link', { name: `View ${listingTitle}` }).click();
      await expect(page).toHaveURL(new RegExp(`/property/${propertyId}(?:-|$)`));
      await expect(page.getByText('1 / 5', { exact: true })).toBeVisible();

      const lead = await captureAndFollowLead(browser, page, propertyId, listingTitle);
      expect(lead.agentId).toBe(identity.agentId);
      const [stored] = await query(
        `SELECT firstRespondedAt, lastContactedAt, nextFollowUp FROM leads WHERE id = ?`,
        [lead.leadId],
      );
      expect(stored.firstRespondedAt).toBeTruthy();
      expect(stored.lastContactedAt).toBeTruthy();
      expect(stored.nextFollowUp).toBeTruthy();

      const rentalListing = await createAndSubmitRentalListing(page);
      const rentalPropertyId = await approveListing(reviewerPage, rentalListing.id);
      await page.goto(
        `/property-to-rent?locationId=${encodeURIComponent(`suburb:${rentalListing.suburbId}`)}`,
      );
      await expect(page.getByRole('link', { name: `View ${rentalListingTitle}` })).toBeVisible();
      await page.getByRole('link', { name: `View ${rentalListingTitle}` }).click();
      await expect(page).toHaveURL(new RegExp(`/property/${rentalPropertyId}(?:-|$)`));
      const rentalSummary = page.getByRole('complementary', { name: 'Rental decision summary' });
      await expect(rentalSummary.getByText('R 18 500 / month', { exact: true })).toBeVisible();
      await expect(rentalSummary.getByText('12-month minimum', { exact: true })).toBeVisible();

      await expireAccessAndVerifyHistoricalLead(browser, page, {
        subscriptionId: entitlement.subscriptionId,
        propertyId,
        lead,
      });
    } finally {
      await reviewerContext.close();
    }
  });

  test('keeps a private listing draft out of a second Agent account in the same browser', async ({
    page,
  }) => {
    const draftOwnerCredentials: AgentCredentials = {
      email: `b04-draft-owner-${randomUUID()}@invalid.example`,
      password: `B04!${randomUUID()}9a`,
      name: `B04 Draft Owner ${randomUUID().slice(0, 8)}`,
      phoneNumber: '+27820000011',
    };
    const draftViewerCredentials: AgentCredentials = {
      email: `b04-draft-viewer-${randomUUID()}@invalid.example`,
      password: `B04!${randomUUID()}9a`,
      name: `B04 Draft Viewer ${randomUUID().slice(0, 8)}`,
      phoneNumber: '+27820000012',
    };
    const privateTitle = `B04 Private Draft ${runId.slice(0, 8)}`;

    await registerAndVerifyAgent(page, draftOwnerCredentials);
    await createPrivateDraft(page, privateTitle);
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('listing-wizard-storage')),
      )
      .toContain(privateTitle);

    await page.goto('/agent/dashboard');
    const logoutResponse = page.waitForResponse(
      candidate =>
        candidate.url().includes('auth.logout') && candidate.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    expect((await logoutResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);

    await registerAndVerifyAgent(page, draftViewerCredentials);
    await page.goto('/listings/create');
    await expect(page.getByRole('heading', { name: 'How should this property be marketed?' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Resume Draft Listing?' })).toHaveCount(0);
    await expect(page.locator('#title')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('listing-wizard-storage')),
      )
      .toBeNull();
  });
});

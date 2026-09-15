import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const fixtureAgentEmail = 'agent@listify.local';
const fixtureReviewerEmail = 'ple-reviewer@listify.local';
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0uQAAAABJRU5ErkJggg==',
  'base64',
);

type Row = Record<string, unknown>;

let connection: AuthoritySqlConnection | undefined;
let submittedListing: { id: number; title: string; suburbId: number } | undefined;
let submittedFeedback: string | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection) throw new Error('PLE browser verification connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function fixturePassword(): string {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) {
    throw new Error('PLE browser verification requires the governed local fixture credential.');
  }
  return password;
}

function fixtureReviewerPassword(): string {
  const password = process.env.LOCAL_PLE_REVIEWER_PASSWORD;
  if (!password) {
    throw new Error('PLE browser verification requires the governed local reviewer credential.');
  }
  return password;
}

async function signInAsFixtureAgent(page: Page) {
  await page.goto('/login?mode=signin');
  const signIn = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(signIn).toBeVisible();
  await signIn.getByPlaceholder('you@example.com').fill(fixtureAgentEmail);
  await signIn.getByPlaceholder('Enter your password').fill(fixturePassword());
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
  );
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/agent\/dashboard/);
}

async function signInAsFixtureReviewer(page: Page, listingId: number) {
  await page.goto(`/login?mode=signin&next=${encodeURIComponent(`/admin/review/${listingId}`)}`);
  const signIn = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(signIn).toBeVisible();
  await signIn.getByPlaceholder('you@example.com').fill(fixtureReviewerEmail);
  await signIn.getByPlaceholder('Enter your password').fill(fixtureReviewerPassword());
  const response = page.waitForResponse(
    candidate =>
      candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
  );
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/admin/review/${listingId}$`));
}

async function moveToNextStep(page: Page) {
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
}

async function selectLocation(page: Page, triggerId: string, name: string) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name, exact: true }).click();
}

test.describe('PLE agency operating browser acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'browser-verification' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);

    const [fixture] = await query(
      `SELECT u.emailVerified AS emailVerified,
              u.role AS role,
              membership.status AS membershipStatus,
              subscription.status AS subscriptionStatus
         FROM users u
         INNER JOIN agents agent ON agent.userId = u.id
         INNER JOIN agency_agent_memberships membership ON membership.agent_id = agent.id
         INNER JOIN subscriptions subscription
           ON subscription.owner_type = 'agency'
          AND subscription.owner_id = membership.agency_id
        WHERE u.email = ?
        ORDER BY membership.id DESC, subscription.id DESC
        LIMIT 1`,
      [fixtureAgentEmail],
    );
    expect(fixture).toMatchObject({
      emailVerified: 1,
      role: 'agent',
      membershipStatus: 'active',
      subscriptionStatus: 'active',
    });
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('derives the agency workspace and retains a device-local private listing draft across reload', async ({
    page,
  }) => {
    await signInAsFixtureAgent(page);

    await page.goto('/listings/create');
    await expect(
      page.getByRole('heading', { name: 'How should this property be marketed?' }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.getByRole('radio', { name: /For Sale/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: /House/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    const title = `Browser local draft ${randomUUID().slice(0, 8)}`;
    const description =
      'A private local browser draft that proves the approved preparation workflow can resume after a reload without creating public inventory.';
    await page.locator('#title').fill(title);
    await page.locator('#description').fill(description);
    await page.locator('#core-bedrooms').fill('3');
    await page.locator('#core-bathrooms').fill('2');
    await page.locator('#core-internal-area').fill('145');
    await page.locator('#core-erf-area').fill('600');
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();

    await page.getByRole('button', { name: 'Save progress on this device' }).click();
    await expect(page.getByRole('button', { name: 'Saved on this device' })).toBeVisible();

    const persistedDraft = await page.evaluate(() => localStorage.getItem('listing-wizard-storage'));
    expect(persistedDraft).toContain(title);
    expect(persistedDraft).toContain('"currentStep":3');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Resume Draft Listing?' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume Draft' }).click();
    await expect(page.locator('#title')).toHaveValue(title);
    await expect(page.locator('#description')).toHaveValue(description);
    await expect(page.locator('#core-bedrooms')).toHaveValue('3');
    await expect(page.locator('#core-bathrooms')).toHaveValue('2');
    await expect(page.locator('#core-internal-area')).toHaveValue('145');
    await expect(page.locator('#core-erf-area')).toHaveValue('600');

    const [serverListing] = await query(
      `SELECT id FROM listings WHERE title = ? LIMIT 1`,
      [title],
    );
    expect(serverListing).toBeUndefined();
  });

  test('creates a complete, private agency listing with uploaded media and submits it for review', async ({
    page,
  }) => {
    await signInAsFixtureAgent(page);
    await page.goto('/listings/create');
    await expect(
      page.getByRole('heading', { name: 'How should this property be marketed?' }),
    ).toBeVisible();

    await page.getByRole('radio', { name: /For Sale/ }).click();
    await moveToNextStep(page);
    await page.getByRole('radio', { name: /House/ }).click();
    await moveToNextStep(page);

    const title = `PLE agency browser listing ${randomUUID().slice(0, 8)}`;
    const description =
      'A complete locally verified agency listing used to prove the governed browser authoring and review path with real uploaded presentation media.';
    await page.locator('#title').fill(title);
    await page.locator('#description').fill(description);
    await page.locator('#core-bedrooms').fill('3');
    await page.locator('#core-bathrooms').fill('2');
    await page.locator('#core-internal-area').fill('145');
    await page.locator('#core-erf-area').fill('600');
    await moveToNextStep(page);

    // Additional features are optional for the base residential authoring slice.
    await moveToNextStep(page);

    await page.getByLabel('Asking price in Rand').fill('2500000');
    await moveToNextStep(page);

    await selectLocation(page, 'location-province', 'Gauteng');
    await selectLocation(page, 'location-city', 'Johannesburg');
    await selectLocation(page, 'location-suburb', 'Sandton');
    await page.locator('#location-street-number').fill('12');
    await page.locator('#location-street-name').fill('Katherine Street');
    await page.getByRole('button', { name: 'Confirm location', exact: true }).click();
    await expect(page.getByText('Ready to continue. Coordinates are optional when the location is valid.')).toBeVisible();
    await moveToNextStep(page);

    const mediaInput = page.locator('input[type=file]');
    await mediaInput.setInputFiles(
      Array.from({ length: 5 }, (_, index) => ({
        name: `ple-agency-listing-${index}.png`,
        mimeType: 'image/png',
        buffer: onePixelPng,
      })),
    );
    await expect(page.getByText('Uploaded Media (5)', { exact: true })).toBeVisible();
    await expect(page.getByTestId('media-required-notice')).toHaveCount(0);
    await moveToNextStep(page);

    await expect(page.getByText('All readiness requirements are complete.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Listing', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();

    await expect
      .poll(async () => {
        const [listing] = await query(
          `SELECT id,
                  status,
                  suburb_id AS suburbId,
                  location_confirmation_state AS locationConfirmationState
             FROM listings
            WHERE title = ?
            LIMIT 1`,
          [title],
        );
        return listing;
      })
      .toMatchObject({
        status: 'pending_review',
        locationConfirmationState: 'confirmed',
      });

    const [listing] = await query(
      `SELECT id, suburb_id AS suburbId
         FROM listings
        WHERE title = ?
        LIMIT 1`,
      [title],
    );
    expect(Number(listing?.id)).toBeGreaterThan(0);
    expect(Number(listing?.suburbId)).toBeGreaterThan(0);
    submittedListing = {
      id: Number(listing.id),
      title,
      suburbId: Number(listing.suburbId),
    };

    const [media] = await query(
      `SELECT COUNT(*) AS completedImages
         FROM listing_media
        WHERE listingId = ?
          AND mediaType = 'image'
          AND processingStatus = 'completed'`,
      [submittedListing.id],
    );
    expect(Number(media?.completedImages)).toBe(5);

    const [publicProjection] = await query(
      `SELECT id FROM properties WHERE sourceListingId = ? LIMIT 1`,
      [submittedListing.id],
    );
    expect(publicProjection).toBeUndefined();
  });

  test('returns the submitted listing for correction through the reviewer workspace', async ({ page }) => {
    expect(submittedListing).toBeDefined();
    const listing = submittedListing!;
    const rejectionFeedback = `Replace the cover image with a clear exterior photo before resubmission for ${listing.title}.`;

    await signInAsFixtureReviewer(page, listing.id);
    await expect(page.getByText('Listing review', { exact: true })).toBeVisible();
    await expect(page.getByText(listing.title, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reject', exact: true }).click();

    const feedbackInput = page.getByPlaceholder(
      'For example: Replace the first photo, which does not show the property clearly.',
    );
    await expect(feedbackInput).toBeVisible();
    await feedbackInput.fill(rejectionFeedback);
    await page.getByRole('button', { name: 'Return for changes', exact: true }).click();
    await expect(page.getByText('Property rejected and feedback sent', { exact: true })).toBeVisible();
    submittedFeedback = rejectionFeedback;

    await expect
      .poll(async () => {
        const [updated] = await query(
          `SELECT status, approvalStatus, rejectionReason
             FROM listings
            WHERE id = ?`,
          [listing.id],
        );
        return updated;
      })
      .toMatchObject({
        status: 'rejected',
        approvalStatus: 'rejected',
        rejectionReason: rejectionFeedback,
      });

    const [publicProjection] = await query(
      `SELECT id FROM properties WHERE sourceListingId = ? LIMIT 1`,
      [listing.id],
    );
    expect(publicProjection).toBeUndefined();
  });

  test('lets the agency member see feedback, retain the persisted listing, and resubmit it', async ({
    page,
  }) => {
    expect(submittedListing).toBeDefined();
    expect(submittedFeedback).toBeDefined();
    const listing = submittedListing!;
    const rejectionFeedback = submittedFeedback!;

    await signInAsFixtureAgent(page);
    await page.goto('/agent/listings?tab=rejected');
    await expect(page.getByRole('heading', { name: 'My Listings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Changes needed', exact: true })).toBeVisible();
    await expect(page.getByText(listing.title, { exact: true })).toBeVisible();
    const feedbackItem = page.getByText(rejectionFeedback, { exact: true });
    await expect(feedbackItem).toBeVisible();
    await feedbackItem.locator('xpath=../..').getByRole('button', { name: 'Fix & Resubmit' }).click();
    await expect(page).toHaveURL(new RegExp(`/listings/create\\?id=${listing.id}&edit=true$`));

    await expect(
      page.getByRole('heading', { name: 'How should this property be marketed?' }),
    ).toBeVisible();
    await moveToNextStep(page);
    await moveToNextStep(page);
    await expect(page.locator('#title')).toHaveValue(listing.title);
    await expect(page.locator('#description')).toHaveValue(
      'A complete locally verified agency listing used to prove the governed browser authoring and review path with real uploaded presentation media.',
    );
    await page.locator('#description').fill(
      'A corrected locally verified agency listing that retains its trusted ownership, media and confirmed geography through the review resubmission path.',
    );
    await moveToNextStep(page);
    await moveToNextStep(page);
    await moveToNextStep(page);
    await moveToNextStep(page);
    await expect(page.getByText('Uploaded Media (5)', { exact: true })).toBeVisible();
    await moveToNextStep(page);
    await expect(page.getByText('All readiness requirements are complete.')).toBeVisible();
    await page.getByRole('button', { name: 'Submit Listing', exact: true }).click();

    await expect
      .poll(async () => {
        const [updated] = await query(
          `SELECT status, approvalStatus, rejectionReason
             FROM listings
            WHERE id = ?`,
          [listing.id],
        );
        return updated;
      })
      .toMatchObject({
        status: 'pending_review',
        approvalStatus: 'pending',
        // The source keeps the prior reviewer feedback as provenance while
        // the current approval state and a new queue row identify the
        // resubmission as pending.
        rejectionReason: rejectionFeedback,
      });

    const queues = await query(
      `SELECT status
         FROM listing_approval_queue
        WHERE listingId = ?
        ORDER BY id ASC`,
      [listing.id],
    );
    expect(queues.map(queue => queue.status)).toEqual(['rejected', 'pending']);

    const [media] = await query(
      `SELECT COUNT(*) AS completedImages
         FROM listing_media
        WHERE listingId = ?
          AND mediaType = 'image'
          AND processingStatus = 'completed'`,
      [listing.id],
    );
    expect(Number(media?.completedImages)).toBe(5);

    const [publicProjection] = await query(
      `SELECT id FROM properties WHERE sourceListingId = ? LIMIT 1`,
      [listing.id],
    );
    expect(publicProjection).toBeUndefined();
  });
});

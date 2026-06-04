import { expect, test, type Page, type Request } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developmentDrafts, developments, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { sanitizeDraftData } from '../../server/lib/sanitizeDraftData';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';
import { deriveDraftProgressMetadata } from '../../shared/developmentWorkflow';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type Seed = {
  developerId: number;
  developmentId: number;
  developmentName: string;
  draftId: number;
  draftName: string;
  email: string;
  unitId: string;
  userId: number;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getTrpcResponseData(payload: any) {
  const response = Array.isArray(payload) ? payload[0] : payload;
  return response?.result?.data?.json ?? response?.result?.data ?? null;
}

function getTrpcRequestInput(request: Request) {
  const payload = request.postDataJSON();
  const input = Array.isArray(payload) ? payload[0] : payload;
  return input?.json ?? input?.['0']?.json ?? input;
}

function buildCanonicalRentalDraft(name: string, unitId: string) {
  const description =
    'Autosave preflight browser proof keeps canonical rental data safe through hydration, failure, retry, and overlapping manual persistence.';
  const location = {
    address: '41 Autosave Proof Road',
    suburb: 'Autosave Proof',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
  };
  const unit = {
    id: unitId,
    name: 'Autosave Proof Rental Two Bed',
    bedrooms: 2,
    bathrooms: 2,
    monthlyRentFrom: 17_500,
    monthlyRentTo: 19_500,
    totalUnits: 8,
    availableUnits: 5,
    reservedUnits: 1,
  };

  return {
    _version: '3.0',
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    completedSteps: [
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'marketing_summary',
      'development_media',
      'unit_types',
      'review_publish',
    ],
    currentPhase: 10,
    developmentType: 'residential',
    transactionType: 'for_rent',
    classification: { type: 'residential' },
    developmentData: {
      name,
      description,
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'leasing',
      ownershipTypes: ['sectional-title'],
      location,
      highlights: ['Canonical hydration', 'Truthful failure state', 'One draft identity'],
      amenities: ['Security', 'Backup power'],
      media: {
        heroImage: {
          id: 'autosave-proof-hero',
          url: 'https://example.com/dle-autosave-proof-hero.jpg',
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [],
        videos: [],
        documents: [
          {
            id: 'autosave-proof-brochure',
            url: 'https://example.com/dle-autosave-proof-brochure.pdf',
            type: 'document',
            category: 'brochure',
          },
        ],
      },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      identity_market: {
        name,
        transactionType: 'for_rent',
        status: 'leasing',
        ownershipTypes: ['sectional-title'],
      },
      location,
      governance_finances: {
        levyRange: { min: 1_200, max: 1_500 },
        rightsAndTaxes: { min: 850, max: 1_050 },
      },
      amenities_features: {
        amenities: ['Security', 'Backup power'],
      },
      marketing_summary: {
        description,
        keySellingPoints: ['Canonical hydration', 'Truthful failure state', 'One draft identity'],
      },
      development_media: {
        heroImage: {
          id: 'autosave-proof-hero',
          url: 'https://example.com/dle-autosave-proof-hero.jpg',
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [],
        videos: [],
        floorPlans: [],
        documents: [
          {
            id: 'autosave-proof-brochure',
            url: 'https://example.com/dle-autosave-proof-brochure.pdf',
            type: 'document',
            category: 'brochure',
          },
        ],
      },
      unit_types: {
        selectedUnitId: unitId,
        unitTypes: [unit],
      },
      review_publish: {
        checklistConfirmed: true,
        readinessDismissals: ['autosave-preflight-proof'],
      },
    },
    unitTypes: [unit],
  };
}

async function seedAutosavePreflight(): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-autosave-preflight-${suffix}@example.com`;
  const draftName = `DLE Autosave Preflight Draft ${suffix}`;
  const developmentName = `DLE Autosave Preflight Edit ${suffix}`;
  const unitId = `autosave-proof-${suffix}`.slice(0, 36);

  const userInsert = await db!.insert(users).values({
    email,
    role: 'property_developer',
    firstName: 'Autosave',
    lastName: 'Preflight',
    name: `Autosave Preflight ${suffix}`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Autosave Preflight Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const draftData = sanitizeDraftData(buildCanonicalRentalDraft(draftName, unitId) as any);
  const editData = sanitizeDraftData(buildCanonicalRentalDraft(developmentName, unitId) as any);
  const { currentStep, progress } = deriveDraftProgressMetadata(draftData as any);
  const draftInsert = await db!.insert(developmentDrafts).values({
    developerId,
    draftName,
    draftData,
    currentStep,
    progress,
  });
  const draftId = getInsertId(draftInsert);

  const development = await developmentService.createDevelopment(userId, {
    name: developmentName,
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    completedSteps: (editData as any).completedSteps,
    stepData: (editData as any).stepData,
    developmentData: (editData as any).developmentData,
    developmentType: 'residential',
    transactionType: 'for_rent',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    address: '41 Autosave Proof Road',
    suburb: 'Autosave Proof',
    city: 'Cape Town',
    province: 'Western Cape',
    description: (editData as any).developmentData.description,
    highlights: (editData as any).developmentData.highlights,
    images: [{ url: 'https://example.com/dle-autosave-proof-hero.jpg' }],
    brochures: ['https://example.com/dle-autosave-proof-brochure.pdf'],
    unitTypes: (editData as any).unitTypes,
  } as any);

  return {
    developerId,
    developmentId: Number(development.id),
    developmentName,
    draftId,
    draftName,
    email,
    unitId,
    userId,
  };
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Autosave QA`,
  );

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: sessionToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: COOKIE_NAME,
      value: sessionToken,
      url: 'http://localhost:5000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function getDeveloperDrafts(developerId: number) {
  const db = await getDb();
  expect(db).toBeTruthy();
  return db!.select().from(developmentDrafts).where(eq(developmentDrafts.developerId, developerId));
}

test.describe.serial('DLE autosave browser preflight', () => {
  let seed: Seed;

  test.beforeAll(async () => {
    seed = await seedAutosavePreflight();
  });

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db.delete(developmentDrafts).where(eq(developmentDrafts.developerId, seed.developerId));
    await db.delete(developments).where(eq(developments.id, seed.developmentId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('does not persist while create, draft-resume, and edit routes hydrate', async ({ page }) => {
    await loginAsSeededDeveloper(page, seed);
    const persistenceRequests: string[] = [];
    page.on('request', request => {
      if (
        request.method() === 'POST' &&
        (request.url().includes('/api/trpc/developer.saveDraft') ||
          request.url().includes('/api/trpc/developer.updateDevelopment'))
      ) {
        persistenceRequests.push(request.url());
      }
    });

    await page.goto('/developer/create-development');
    await expect(page.getByRole('heading', { name: 'Project Setup' })).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(750);
    expect(persistenceRequests).toEqual([]);

    await page.goto(`/developer/create-development?draftId=${seed.draftId}`);
    await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(seed.draftName).first()).toBeVisible();
    await page.waitForTimeout(750);
    expect(persistenceRequests).toEqual([]);

    await page.goto(`/developer/create-development?id=${seed.developmentId}`);
    await expect(page.getByRole('button', { name: 'Save Progress', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(seed.developmentName).first()).toBeVisible();
    await page.waitForTimeout(750);
    expect(persistenceRequests).toEqual([]);

    await page.screenshot({
      path: `${evidenceDir}/qa-dle-autosave-edit-hydrated-without-save.png`,
    });
  });

  test('keeps a failed browser save visible until a real retry succeeds', async ({ page }) => {
    await loginAsSeededDeveloper(page, seed);
    await page.goto(`/developer/create-development?draftId=${seed.draftId}`);
    await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 20_000 });

    const [beforeFailure] = await getDeveloperDrafts(seed.developerId);
    const beforeSavedAt = Number((beforeFailure.draftData as any)?._savedAt ?? 0);
    let shouldFail = true;
    let failedRequestCount = 0;
    await page.route('**/api/trpc/developer.saveDraft**', async route => {
      if (shouldFail) {
        shouldFail = false;
        failedRequestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                json: {
                  id: seed.draftId,
                  success: false,
                  draftData: {},
                },
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect.poll(() => failedRequestCount).toBe(1);
    await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-autosave-browser-failure-visible.png`,
    });

    const [afterFailure] = await getDeveloperDrafts(seed.developerId);
    expect(Number((afterFailure.draftData as any)?._savedAt ?? 0)).toBe(beforeSavedAt);

    const retryResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/trpc/developer.saveDraft') &&
        response.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    const retryResponse = await retryResponsePromise;
    expect(retryResponse.ok()).toBeTruthy();
    expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    const [afterRetry] = await getDeveloperDrafts(seed.developerId);
    const retriedDraft = afterRetry.draftData as any;
    expect(Number(retriedDraft._savedAt ?? 0)).toBeGreaterThan(beforeSavedAt);
    expect(retriedDraft).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      developmentData: {
        name: seed.draftName,
        transactionType: 'for_rent',
      },
    });
    expect(retriedDraft.stepData.unit_types.unitTypes[0].id).toBe(seed.unitId);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-autosave-browser-retry-saved.png`,
    });
  });

  test('serializes overlapping new-draft saves into one real database row', async ({ page }) => {
    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/create-development');
    await page.getByText('For Sale', { exact: true }).click();
    await page.getByRole('button', { name: 'Start Wizard', exact: true }).click();
    const saveButton = page.getByRole('button', { name: 'Save Draft', exact: true }).first();
    await expect(saveButton).toBeVisible({ timeout: 20_000 });

    const beforeDrafts = await getDeveloperDrafts(seed.developerId);
    const requests: Request[] = [];
    let releaseFirstRequest!: () => void;
    let markFirstRequestSeen!: () => void;
    const firstRequestRelease = new Promise<void>(resolve => {
      releaseFirstRequest = resolve;
    });
    const firstRequestSeen = new Promise<void>(resolve => {
      markFirstRequestSeen = resolve;
    });

    await page.route('**/api/trpc/developer.saveDraft**', async route => {
      requests.push(route.request());
      if (requests.length === 1) {
        markFirstRequestSeen();
        await firstRequestRelease;
      }
      await route.continue();
    });

    await saveButton.evaluate(element => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await firstRequestSeen;

    try {
      await page.waitForTimeout(750);
      expect(requests).toHaveLength(1);
    } finally {
      releaseFirstRequest();
    }

    await expect.poll(() => requests.length, { timeout: 10_000 }).toBe(2);
    await expect
      .poll(async () => (await getDeveloperDrafts(seed.developerId)).length, { timeout: 10_000 })
      .toBe(beforeDrafts.length + 1);
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    const afterDrafts = await getDeveloperDrafts(seed.developerId);
    const createdDrafts = afterDrafts.filter(
      draft => !beforeDrafts.some(before => before.id === draft.id),
    );
    expect(createdDrafts).toHaveLength(1);

    const firstInput = getTrpcRequestInput(requests[0]);
    const secondInput = getTrpcRequestInput(requests[1]);
    expect(firstInput).not.toHaveProperty('id');
    expect(Number(secondInput.id)).toBe(Number(createdDrafts[0].id));
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-autosave-browser-one-draft-identity.png`,
    });
  });
});

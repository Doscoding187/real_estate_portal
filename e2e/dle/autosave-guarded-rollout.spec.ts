import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developmentDrafts, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { sanitizeDraftData } from '../../server/lib/sanitizeDraftData';
import { COOKIE_NAME } from '../../shared/const';
import { deriveDraftProgressMetadata } from '../../shared/developmentWorkflow';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type Lane = 'sale' | 'rental' | 'auction';

type Scenario = {
  draftId: number;
  lane: Lane;
  name: string;
  transactionType: 'for_sale' | 'for_rent' | 'auction';
  unitId: string;
  workflowId: 'residential_sale' | 'residential_rent' | 'residential_auction';
};

type Seed = {
  developerId: number;
  email: string;
  scenarios: Scenario[];
  userId: number;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getTrpcResponseData(payload: any) {
  const response = Array.isArray(payload) ? payload[0] : payload;
  return response?.result?.data?.json ?? response?.result?.data ?? null;
}

function buildCanonicalDraft(scenario: Omit<Scenario, 'draftId'>) {
  const location = {
    address: `10 ${scenario.lane} Autosave Road`,
    suburb: 'Autosave Rollout',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
  };
  const unit = {
    id: scenario.unitId,
    name: `${scenario.lane} Autosave Unit`,
    bedrooms: 2,
    bathrooms: 2,
    totalUnits: 8,
    availableUnits: 5,
    ...(scenario.lane === 'sale'
      ? { priceFrom: 2_100_000, priceTo: 2_450_000 }
      : scenario.lane === 'rental'
        ? { monthlyRentFrom: 18_500, monthlyRentTo: 21_000, depositRequired: 37_000 }
        : {
            startingBid: 950_000,
            reservePrice: 1_100_000,
            auctionStartDate: '2030-03-01T09:00:00.000Z',
            auctionEndDate: '2030-03-08T17:00:00.000Z',
            auctionStatus: 'scheduled',
          }),
  };
  const description =
    `${scenario.name} proves guarded create and draft autosave preserves the latest ` +
    'transaction-first canonical workflow state.';
  const highlights = ['Guarded autosave', 'Canonical resume', 'Manual fallback retained'];

  return {
    _version: '3.0',
    workflowId: scenario.workflowId,
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
    transactionType: scenario.transactionType,
    developmentData: {
      name: scenario.name,
      description,
      developmentType: 'residential',
      transactionType: scenario.transactionType,
      status: scenario.lane === 'rental' ? 'leasing' : 'selling',
      ownershipTypes: ['sectional-title'],
      location,
      highlights,
      amenities: ['Security', 'Backup power'],
      media: { photos: [], videos: [], documents: [] },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: scenario.transactionType,
      },
      identity_market: {
        name: scenario.name,
        transactionType: scenario.transactionType,
        status: scenario.lane === 'rental' ? 'leasing' : 'selling',
        ownershipTypes: ['sectional-title'],
      },
      location,
      governance_finances: {
        monthlyLevyFrom: 1_250,
        ratesFrom: 900,
      },
      amenities_features: {
        amenities: ['Security', 'Backup power'],
      },
      marketing_summary: {
        description,
        keySellingPoints: highlights,
      },
      development_media: {
        photos: [],
        videos: [],
        floorPlans: [],
        documents: [],
      },
      unit_types: {
        selectedUnitId: scenario.unitId,
        unitTypes: [unit],
      },
      review_publish: {
        checklistConfirmed: true,
        readinessDismissals: [`${scenario.lane}-guarded-autosave-proof`],
      },
    },
    unitTypes: [unit],
  };
}

async function seedGuardedRollout(): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-autosave-rollout-${suffix}@example.com`;
  const userInsert = await db!.insert(users).values({
    email,
    role: 'property_developer',
    firstName: 'Autosave',
    lastName: 'Rollout',
    name: `Autosave Rollout ${suffix}`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Autosave Rollout Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const definitions: Array<Omit<Scenario, 'draftId'>> = [
    {
      lane: 'sale',
      name: `DLE Sale Autosave Rollout ${suffix}`,
      transactionType: 'for_sale',
      unitId: `sale-autosave-${suffix}`.slice(0, 36),
      workflowId: 'residential_sale',
    },
    {
      lane: 'rental',
      name: `DLE Rental Autosave Rollout ${suffix}`,
      transactionType: 'for_rent',
      unitId: `rent-autosave-${suffix}`.slice(0, 36),
      workflowId: 'residential_rent',
    },
    {
      lane: 'auction',
      name: `DLE Auction Autosave Rollout ${suffix}`,
      transactionType: 'auction',
      unitId: `auction-autosave-${suffix}`.slice(0, 36),
      workflowId: 'residential_auction',
    },
  ];

  const scenarios: Scenario[] = [];
  for (const definition of definitions) {
    const draftData = sanitizeDraftData(buildCanonicalDraft(definition) as any);
    const { currentStep, progress } = deriveDraftProgressMetadata(draftData as any);
    const draftInsert = await db!.insert(developmentDrafts).values({
      developerId,
      draftName: definition.name,
      draftData,
      currentStep,
      progress,
    });
    scenarios.push({ ...definition, draftId: getInsertId(draftInsert) });
  }

  return { developerId, email, scenarios, userId };
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Autosave Rollout QA`,
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

async function getDraft(draftId: number) {
  const db = await getDb();
  expect(db).toBeTruthy();
  const [draft] = await db!
    .select()
    .from(developmentDrafts)
    .where(eq(developmentDrafts.id, draftId))
    .limit(1);
  return draft;
}

test.describe.serial('DLE guarded create/draft autosave rollout', () => {
  let seed: Seed;

  test.beforeAll(async () => {
    seed = await seedGuardedRollout();
  });

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;
    await db.delete(developmentDrafts).where(eq(developmentDrafts.developerId, seed.developerId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('autosaves and resumes the latest confirmed Sale, Rental, and Auction workflow step', async ({
    page,
  }) => {
    await loginAsSeededDeveloper(page, seed);

    for (const scenario of seed.scenarios) {
      let persistenceCount = 0;
      const countPersistence = () => {
        persistenceCount += 1;
      };
      page.on('request', request => {
        if (
          request.method() === 'POST' &&
          request.url().includes('/api/trpc/developer.saveDraft')
        ) {
          countPersistence();
        }
      });

      await page.goto(`/developer/create-development?draftId=${scenario.draftId}`);
      await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(1_000);
      expect(persistenceCount).toBe(0);

      const saveResponsePromise = page.waitForResponse(
        response =>
          response.url().includes('/api/trpc/developer.saveDraft') &&
          response.request().method() === 'POST',
        { timeout: 10_000 },
      );
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBeTruthy();
      expect(getTrpcResponseData(await saveResponse.json())).toMatchObject({ success: true });
      await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

      const savedDraft = await getDraft(scenario.draftId);
      const draftData = savedDraft.draftData as any;
      expect(draftData).toMatchObject({
        workflowId: scenario.workflowId,
        currentStepId: 'unit_types',
        developmentData: {
          name: scenario.name,
          transactionType: scenario.transactionType,
        },
      });
      expect(draftData.stepData.unit_types.unitTypes[0].id).toBe(scenario.unitId);

      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Unit Types', exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: `${evidenceDir}/qa-dle-${scenario.lane}-guarded-autosave-resume.png`,
      });

      page.removeAllListeners('request');
    }
  });

  test('keeps a failed background autosave visible and retries the latest rental step', async ({
    page,
  }) => {
    await loginAsSeededDeveloper(page, seed);
    const scenario = seed.scenarios.find(item => item.lane === 'rental')!;

    await page.goto(`/developer/create-development?draftId=${scenario.draftId}`);
    await expect(
      page.getByRole('heading', { name: 'Unit Types', exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    let failNextSave = true;
    await page.route('**/api/trpc/developer.saveDraft**', async route => {
      if (failNextSave) {
        failNextSave = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                json: {
                  id: scenario.draftId,
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

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({ timeout: 10_000 });
    expect((await getDraft(scenario.draftId)).draftData).toMatchObject({
      currentStepId: 'unit_types',
    });

    const retryResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/trpc/developer.saveDraft') &&
        response.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    const retryResponse = await retryResponsePromise;
    expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    const retriedDraft = (await getDraft(scenario.draftId)).draftData as any;
    expect(retriedDraft).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'marketing_summary',
      developmentData: {
        transactionType: 'for_rent',
      },
    });
    expect(retriedDraft.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: scenario.unitId,
      monthlyRentFrom: 18_500,
      monthlyRentTo: 21_000,
    });

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Marketing Summary', exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-guarded-autosave-retry.png`,
    });
  });
});

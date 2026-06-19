import { expect, test, type Page, type Request } from '@playwright/test';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

test.skip(
  process.env.VITE_DLE_EDIT_AUTOSAVE_ENABLED !== 'true',
  'Edit autosave browser proof requires VITE_DLE_EDIT_AUTOSAVE_ENABLED=true.',
);

type Seed = {
  developerId: number;
  developmentId: number;
  developmentName: string;
  email: string;
  initialDescription: string;
  mediaUrl: string;
  retryDescription: string;
  slug: string;
  unitId: string;
  unitName: string;
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

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Edit Autosave QA`,
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

async function getDevelopmentRow(developmentId: number) {
  const db = await getDb();
  expect(db).toBeTruthy();
  const [row] = await db!
    .select()
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  return row;
}

async function getFirstUnit(developmentId: number) {
  const development = await developmentService.getDevelopmentWithPhases(developmentId);
  return (development as any)?.unitTypes?.[0] ?? null;
}

async function expectSeedUnitPreserved(seed: Seed) {
  const unit = await getFirstUnit(seed.developmentId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.monthlyRentFrom)).toBe(18_500);
  expect(Number(unit.monthlyRentTo)).toBe(21_000);
}

async function seedPublishedRentalEditDevelopment(): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-edit-autosave-${suffix}@example.com`;
  const developmentName = `DLE Edit Autosave Rental ${suffix}`;
  const unitId = `edit-autosave-rent-${suffix}`.slice(0, 36);
  const unitName = `Edit Autosave Rental Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-original-${suffix}.jpg`;
  const initialDescription =
    'Initial rental edit autosave description proves a published development starts from a persisted baseline with stable inventory.';
  const retryDescription =
    'Retried rental edit autosave description proves the browser saves only the latest marketing copy after a failed autosave.';

  let userId: number | null = null;
  let developerId: number | null = null;
  let developmentId: number | null = null;

  try {
    const userInsert = await db!.insert(users).values({
      email,
      role: 'property_developer',
      firstName: 'Edit',
      lastName: 'Autosave',
      name: `Edit Autosave ${suffix}`,
      emailVerified: 1,
    });
    userId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Edit Autosave Developer ${suffix}`,
      email,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    developerId = getInsertId(developerInsert);

    const created = await developmentService.createDevelopment(userId, {
      name: developmentName,
      workflowId: 'residential_rent',
      currentStepId: 'marketing_summary',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types',
      ],
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '47 Edit Autosave Road',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Autosave Browser Proof',
      postalCode: '8001',
      status: 'leasing',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-04-01',
      completionDate: '2030-06-30',
      description: initialDescription,
      highlights: ['Stable edit baseline', 'Failure is visible', 'Retry saves latest copy'],
      images: [{ url: mediaUrl }],
      brochures: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 1_350,
      ratesFrom: 980,
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_rent',
        },
        identity_market: {
          name: developmentName,
          transactionType: 'for_rent',
          status: 'leasing',
          ownershipTypes: ['sectional-title'],
          launchDate: '2029-04-01',
          completionDate: '2030-06-30',
        },
        location: {
          address: '47 Edit Autosave Road',
          suburb: 'Autosave Browser Proof',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
        },
        governance_finances: {
          monthlyLevyFrom: 1_350,
          ratesFrom: 980,
        },
        amenities_features: {
          amenities: ['Security', 'Backup power'],
        },
        marketing_summary: {
          description: initialDescription,
          tagline: 'Truthful edit autosave proof',
          keySellingPoints: [
            'Stable edit baseline',
            'Failure is visible',
            'Retry saves latest copy',
          ],
        },
        development_media: {
          heroImage: { url: mediaUrl },
          photos: [],
          videos: [],
          floorPlans: [],
          documents: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
        },
        unit_types: {
          selectedUnitId: unitId,
          unitTypes: [
            {
              id: unitId,
              name: unitName,
              bedrooms: 2,
              bathrooms: 2,
              monthlyRentFrom: 18_500,
              monthlyRentTo: 21_000,
              depositRequired: 37_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
      developmentData: {
        name: developmentName,
        description: initialDescription,
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'leasing',
        ownershipTypes: ['sectional-title'],
        launchDate: '2029-04-01',
        completionDate: '2030-06-30',
        location: {
          address: '47 Edit Autosave Road',
          suburb: 'Autosave Browser Proof',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
        },
        highlights: ['Stable edit baseline', 'Failure is visible', 'Retry saves latest copy'],
        amenities: ['Security', 'Backup power'],
        media: {
          heroImage: { url: mediaUrl },
          photos: [],
          videos: [],
          documents: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom: 18_500,
          monthlyRentTo: 21_000,
          depositRequired: 37_000,
          totalUnits: 8,
          availableUnits: 5,
        },
      ],
    } as any);
    developmentId = Number(created.id);

    await developmentService.publishDevelopment(developmentId, userId);
    await developmentService.approveDevelopment(developmentId, 1);
    await db!
      .update(developments)
      .set({ currentStepId: 'marketing_summary' })
      .where(eq(developments.id, developmentId));
  } catch (error) {
    if (developmentId !== null) {
      await db!.delete(developments).where(eq(developments.id, developmentId));
    }
    if (developerId !== null) {
      await db!.delete(developers).where(eq(developers.id, developerId));
    }
    if (userId !== null) {
      await db!.delete(users).where(eq(users.id, userId));
    }
    throw error;
  }

  const row = await getDevelopmentRow(developmentId);

  return {
    developerId,
    developmentId,
    developmentName,
    email,
    initialDescription,
    mediaUrl,
    retryDescription,
    slug: row.slug,
    unitId,
    unitName,
    userId,
  };
}

test.describe.serial('DLE edit autosave browser proof', () => {
  test.setTimeout(75_000);

  let seed: Seed;

  test.beforeAll(async () => {
    seed = await seedPublishedRentalEditDevelopment();
  });

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db.delete(developments).where(eq(developments.id, seed.developmentId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('keeps failed edit autosave visible and retries the latest partial marketing payload', async ({
    page,
  }) => {
    await loginAsSeededDeveloper(page, seed);

    await page.goto(`/developer/create-development?id=${seed.developmentId}`);
    const marketingHeading = page.getByRole('heading', { name: 'Marketing Summary' }).first();
    await expect(marketingHeading).toBeVisible({ timeout: 20_000 });

    let failNextUpdate = true;
    const updateRequests: Request[] = [];
    await page.route('**/api/trpc/developer.updateDevelopment**', async route => {
      updateRequests.push(route.request());
      if (failNextUpdate) {
        failNextUpdate = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                json: {
                  success: false,
                },
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    const failedDescription =
      'Failed rental edit autosave description should stay out of the database until a real retry succeeds.';
    const descriptionInput = page.getByPlaceholder(
      'Describe the lifestyle, location benefits, and unique selling points...',
    );

    const failedResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/trpc/developer.updateDevelopment') &&
        response.request().method() === 'POST',
      { timeout: 20_000 },
    );
    await descriptionInput.fill(failedDescription);
    const failedResponse = await failedResponsePromise;
    expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
    await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: 'docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-failure-visible.png',
      fullPage: true,
    });

    const afterFailure = await getDevelopmentRow(seed.developmentId);
    expect(afterFailure.description).toBe(seed.initialDescription);
    expect(afterFailure.city).toBe('Cape Town');
    expect(afterFailure.suburb).toBe('Autosave Browser Proof');
    expect(asArray(afterFailure.images).some(image => image?.url === seed.mediaUrl)).toBe(true);
    await expectSeedUnitPreserved(seed);

    const retryResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/trpc/developer.updateDevelopment') &&
        response.request().method() === 'POST',
      { timeout: 20_000 },
    );
    await descriptionInput.fill(seed.retryDescription);
    const retryResponse = await retryResponsePromise;
    expect(retryResponse.ok()).toBeTruthy();
    expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: 'docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-retry-saved.png',
      fullPage: true,
    });

    expect(updateRequests).toHaveLength(2);
    const failedInput = getTrpcRequestInput(updateRequests[0]);
    const retryInput = getTrpcRequestInput(updateRequests[1]);
    expect(failedInput.data).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'marketing_summary',
      description: failedDescription,
    });
    expect(retryInput.data).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'marketing_summary',
      description: seed.retryDescription,
    });
    expect(retryInput.data).not.toHaveProperty('unitTypes');
    expect(retryInput.data).not.toHaveProperty('city');
    expect(retryInput.data).not.toHaveProperty('images');

    const afterRetry = await getDevelopmentRow(seed.developmentId);
    expect(afterRetry.description).toBe(seed.retryDescription);
    expect(afterRetry.city).toBe('Cape Town');
    expect(afterRetry.suburb).toBe('Autosave Browser Proof');
    expect(afterRetry.approvalStatus).toBe('approved');
    expect(asArray(afterRetry.images).some(image => image?.url === seed.mediaUrl)).toBe(true);
    await expectSeedUnitPreserved(seed);

    await page.goto(`/development/${seed.slug}`);
    await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Rent From R 18 500 - R 21 000').first()).toBeVisible();
    await expect(page.getByText('R 18 500 / month').first()).toBeVisible();
    await expect(page.getByText(seed.unitName).first()).toBeVisible();
    await page.screenshot({
      path: 'docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-public-preserved.png',
      fullPage: true,
    });
  });
});

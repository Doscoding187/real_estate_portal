import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developmentDrafts, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { sanitizeDraftData } from '../../server/lib/sanitizeDraftData';
import { COOKIE_NAME } from '../../shared/const';
import { deriveDraftProgressMetadata } from '../../shared/developmentWorkflow';

const evidenceDir = 'docs/dle/evidence/2026-06-05';
fs.mkdirSync(evidenceDir, { recursive: true });

type Lane = 'rental' | 'auction';

type Scenario = {
  expectedDetails: string[];
  expectedTitle: string;
  lane: Lane;
  name: string;
  transactionType: 'for_rent' | 'auction';
  unitId: string;
  unitName: string;
  workflowId: 'residential_rent' | 'residential_auction';
};

type Seed = {
  developerId: number;
  draftId: number;
  email: string;
  userId: number;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function buildCanonicalDraft(scenario: Scenario) {
  const isRental = scenario.lane === 'rental';
  const location = {
    address: isRental ? '18 Rental Readiness Road' : '28 Auction Readiness Road',
    suburb: isRental ? 'Rental Readiness Proof' : 'Auction Readiness Proof',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
  };
  const unit = isRental
    ? {
        id: scenario.unitId,
        name: scenario.unitName,
        description: 'Lease-ready rental unit with clear rent, deposit, terms, and availability.',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 74,
        monthlyRentFrom: 18_500,
        monthlyRentTo: 21_000,
        depositRequired: 37_000,
        leaseTerm: '12 months',
        isFurnished: true,
        totalUnits: 12,
        availableUnits: 8,
        reservedUnits: 2,
        parkingType: 'covered',
        parkingBays: 1,
      }
    : {
        id: scenario.unitId,
        name: scenario.unitName,
        description: 'Auction-ready unit with bidding window, reserve strategy, and open lots.',
        bedrooms: 3,
        bathrooms: 2,
        unitSize: 108,
        startingBid: 920_000,
        reservePrice: 1_080_000,
        auctionStartDate: '2030-03-01T09:00:00.000Z',
        auctionEndDate: '2030-03-08T17:00:00.000Z',
        auctionStatus: 'registration_open',
        totalUnits: 3,
        availableUnits: 2,
        reservedUnits: 0,
        parkingType: 'garage',
        parkingBays: 2,
      };
  const description = isRental
    ? 'Rental unit packaging readiness browser proof with lease terms, deposit, furnished state, and availability.'
    : 'Auction unit packaging readiness browser proof with bid terms, reserve strategy, auction window, and lot availability.';

  return {
    _version: '3.0',
    workflowId: scenario.workflowId,
    currentStepId: 'unit_types',
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
    currentPhase: 10,
    developmentType: 'residential',
    transactionType: scenario.transactionType,
    classification: { type: 'residential' },
    developmentData: {
      name: scenario.name,
      description,
      developmentType: 'residential',
      transactionType: scenario.transactionType,
      status: isRental ? 'leasing' : 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      location,
      highlights: ['Transaction-ready units', 'Developer packaging proof', 'Guided readiness'],
      amenities: ['Security', 'Backup power'],
      media: {
        photos: [],
        videos: [],
        documents: [],
      },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: scenario.transactionType,
      },
      identity_market: {
        name: scenario.name,
        transactionType: scenario.transactionType,
        status: isRental ? 'leasing' : 'launching-soon',
        ownershipTypes: ['sectional-title'],
        launchDate: '2029-01-10',
        completionDate: '2030-03-31',
      },
      location,
      governance_finances: {
        monthlyLevyFrom: isRental ? 1_250 : 1_600,
        ratesFrom: isRental ? 900 : 1_100,
      },
      amenities_features: {
        amenities: ['Security', 'Backup power'],
      },
      marketing_summary: {
        description,
        keySellingPoints: ['Transaction-ready units', 'Developer packaging proof', 'Guided readiness'],
        highlights: ['Transaction-ready units', 'Developer packaging proof', 'Guided readiness'],
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
    },
    unitTypes: [unit],
  };
}

async function seedDeveloperAndDraft(scenario: Scenario, suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-unit-readiness-${scenario.lane}-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Unit',
    lastName: 'Readiness',
    name: `Unit Readiness ${suffix}`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Unit Readiness Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const draftData = sanitizeDraftData(buildCanonicalDraft(scenario) as any);
  const { currentStep, progress } = deriveDraftProgressMetadata(draftData as any);
  const draftInsert = await db!.insert(developmentDrafts).values({
    developerId,
    draftName: scenario.name,
    draftData,
    currentStep,
    progress,
  });

  return { developerId, draftId: getInsertId(draftInsert), email, userId };
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Unit Readiness QA`,
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

async function openUnitPricingReadiness(page: Page, scenario: Scenario, draftId: number) {
  await page.goto(`/developer/create-development?draftId=${draftId}`);
  await expect(
    page.getByRole('heading', { name: 'Unit Types', exact: true }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(scenario.unitName).first()).toBeVisible();

  await page.getByRole('button', { name: `Edit ${scenario.unitName}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Pricing' }).click();

  const readiness = dialog.getByTestId('unit-packaging-readiness');
  await expect(readiness).toBeVisible();
  await expect(readiness.getByText(scenario.expectedTitle)).toBeVisible();
  await expect(readiness.getByText('5/5 ready')).toBeVisible();
  for (const detail of scenario.expectedDetails) {
    await expect(readiness.getByText(detail, { exact: true })).toBeVisible();
  }

  return readiness;
}

test.describe.serial('DLE Unit Types packaging readiness browser proof', () => {
  const createdUserIds: number[] = [];
  const createdDeveloperIds: number[] = [];
  const createdDraftIds: number[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDraftIds.length > 0) {
      await db.delete(developmentDrafts).where(inArray(developmentDrafts.id, createdDraftIds));
    }
    if (createdDeveloperIds.length > 0) {
      await db.delete(developers).where(inArray(developers.id, createdDeveloperIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  const scenarios: Scenario[] = [
    {
      lane: 'rental',
      name: 'DLE Rental Unit Readiness Proof',
      transactionType: 'for_rent',
      unitId: 'unit-readiness-rental',
      unitName: 'Readiness Rental Two Bed',
      workflowId: 'residential_rent',
      expectedTitle: 'Rental package readiness',
      expectedDetails: ['R 18 500 / month', 'R 37 000 deposit', '12 months', 'Furnished', '8 rental units available'],
    },
    {
      lane: 'auction',
      name: 'DLE Auction Unit Readiness Proof',
      transactionType: 'auction',
      unitId: 'unit-readiness-auction',
      unitName: 'Readiness Auction Three Bed',
      workflowId: 'residential_auction',
      expectedTitle: 'Auction package readiness',
      expectedDetails: ['R 920 000 starting bid', '01 Mar 2030 - 08 Mar 2030', 'Reserve tracked internally', 'Registration open', '2 lots open'],
    },
  ];

  for (const scenario of scenarios) {
    test(`shows ${scenario.lane} packaging readiness in the Unit Types pricing tab`, async ({
      page,
    }) => {
      const suffix = `${scenario.lane}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const seededScenario = {
        ...scenario,
        name: `${scenario.name} ${suffix}`,
        unitId: `${scenario.unitId}-${suffix}`.slice(0, 36),
        unitName: `${scenario.unitName} ${suffix}`,
      };
      const seed = await seedDeveloperAndDraft(seededScenario, suffix);
      createdUserIds.push(seed.userId);
      createdDeveloperIds.push(seed.developerId);
      createdDraftIds.push(seed.draftId);

      await loginAsSeededDeveloper(page, seed);

      const readiness = await openUnitPricingReadiness(page, seededScenario, seed.draftId);
      await page.screenshot({
        path: `${evidenceDir}/qa-dle-${scenario.lane}-unit-readiness-desktop.png`,
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await readiness.scrollIntoViewIfNeeded();
      const box = await readiness.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      await expect(readiness.getByText(scenario.expectedTitle)).toBeVisible();
      await page.screenshot({
        path: `${evidenceDir}/qa-dle-${scenario.lane}-unit-readiness-mobile.png`,
      });
    });
  }
});

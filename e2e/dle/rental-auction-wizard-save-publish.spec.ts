import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developmentDrafts, developments, leads, users } from '../../drizzle/schema';
import { getDb } from '../../server/db-connection';
import { authService } from '../../server/_core/auth';
import { sanitizeDraftData } from '../../server/lib/sanitizeDraftData';
import { COOKIE_NAME } from '../../shared/const';
import { deriveDraftProgressMetadata } from '../../shared/developmentWorkflow';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type TransactionLane = 'rental' | 'auction';

type DraftSeed = {
  developerId: number;
  draftId: number;
  email: string;
  password: string;
  userId: number;
};

type DraftScenario = {
  expectedEngineLabel: 'Rental Engine' | 'Auction Engine';
  expectedEngineOutcome: RegExp;
  expectedEngineSignal: string;
  expectedLeadCta: RegExp;
  expectedPriceLabel: string;
  expectedPublicPricing: RegExp;
  expectedReviewPricing: RegExp;
  expectedSearchPricing: RegExp;
  expectedSubmitCta: RegExp;
  expectedTransactionType: 'rent' | 'auction';
  highlights: string[];
  lane: TransactionLane;
  name: string;
  slugSearchName: string;
  unitId: string;
  unitName: string;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getLeadContext(row: any) {
  const raw = row?.affordabilityData;
  if (!raw) return {};
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.leadContext ?? {};
}

function getTrpcResponseData(payload: any) {
  const response = Array.isArray(payload) ? payload[0] : payload;
  return response?.result?.data?.json ?? response?.result?.data ?? null;
}

function buildCanonicalDraft(scenario: DraftScenario) {
  const isRental = scenario.lane === 'rental';
  const transactionType = isRental ? 'for_rent' : 'auction';
  const workflowId = isRental ? 'residential_rent' : 'residential_auction';
  const heroImage = `https://example.com/dle-${scenario.lane}-wizard-hero.jpg`;
  const brochure = `https://example.com/dle-${scenario.lane}-wizard-brochure.pdf`;
  const location = {
    address: isRental ? '15 Rental Wizard Road' : '25 Auction Wizard Road',
    suburb: isRental ? 'Rental Wizard Proof' : 'Auction Wizard Proof',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
  };
  const unit = isRental
    ? {
        id: scenario.unitId,
        name: scenario.unitName,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 72,
        monthlyRentFrom: 18_500,
        monthlyRentTo: 21_000,
        priceFrom: 2_200_000,
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
        bedrooms: 3,
        bathrooms: 2,
        unitSize: 108,
        priceFrom: 2_800_000,
        monthlyRentFrom: 24_000,
        startingBid: 920_000,
        reservePrice: 1_080_000,
        auctionStartDate: '2030-03-01T09:00:00.000Z',
        auctionEndDate: '2030-03-08T17:00:00.000Z',
        auctionStatus: 'scheduled',
        totalUnits: 3,
        availableUnits: 2,
        reservedUnits: 0,
        parkingType: 'garage',
        parkingBays: 2,
      };
  const description = isRental
    ? 'Browser-level rental wizard proof package with monthly rent, furnished terms, media, highlights, unit inventory, and publish readiness.'
    : 'Browser-level auction wizard proof package with bid pricing, reserve terms, auction dates, media, highlights, unit inventory, and publish readiness.';

  return {
    _version: '3.0',
    workflowId,
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
    transactionType,
    classification: { type: 'residential' },
    heroImage,
    developmentData: {
      name: scenario.name,
      description,
      developmentType: 'residential',
      transactionType,
      status: isRental ? 'leasing' : 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      location,
      highlights: scenario.highlights,
      amenities: ['Pool', 'Security', 'Backup power'],
      media: {
        heroImage: {
          id: `${scenario.lane}-wizard-hero`,
          url: heroImage,
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [
          {
            id: `${scenario.lane}-wizard-photo`,
            url: `https://example.com/dle-${scenario.lane}-wizard-gallery.jpg`,
            type: 'image',
            category: 'general',
          },
        ],
        videos: [],
        documents: [
          {
            id: `${scenario.lane}-wizard-brochure`,
            url: brochure,
            type: 'document',
            category: 'brochure',
          },
        ],
      },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType,
      },
      identity_market: {
        name: scenario.name,
        transactionType,
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
        amenities: ['Pool', 'Security', 'Backup power'],
      },
      marketing_summary: {
        description,
        keySellingPoints: scenario.highlights,
        highlights: scenario.highlights,
      },
      development_media: {
        heroImage: {
          id: `${scenario.lane}-wizard-hero`,
          url: heroImage,
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [
          {
            id: `${scenario.lane}-wizard-photo`,
            url: `https://example.com/dle-${scenario.lane}-wizard-gallery.jpg`,
            type: 'image',
            category: 'general',
          },
        ],
        videos: [],
        floorPlans: [],
        documents: [
          {
            id: `${scenario.lane}-wizard-brochure`,
            url: brochure,
            type: 'document',
            category: 'brochure',
          },
        ],
      },
      unit_types: {
        selectedUnitId: scenario.unitId,
        unitTypes: [unit],
      },
      review_publish: {
        checklistConfirmed: true,
        readinessDismissals: [`${scenario.lane}-wizard-proof`],
      },
    },
    unitTypes: [unit],
  };
}

async function seedDeveloperAndDraft(scenario: DraftScenario, suffix: string): Promise<DraftSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const password = `Password123!${suffix}`;
  const email = `dle-${scenario.lane}-wizard-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(password);

  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: scenario.lane,
    lastName: 'Wizard',
    name: `${scenario.lane} Wizard Developer`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `${scenario.lane} Wizard Developer ${suffix}`,
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
  const draftId = getInsertId(draftInsert);

  return { developerId, draftId, email, password, userId };
}

async function loginAsSeededDeveloper(page: Page, seed: DraftSeed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE QA`,
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

async function proveDraftListAndResume(page: Page, scenario: DraftScenario, seed: DraftSeed) {
  await page.goto('/developer/drafts');
  await expect(page.getByRole('heading', { name: 'My Development Drafts' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(scenario.name).first()).toBeVisible();
  await expect(page.getByText('1 unit type(s)').first()).toBeVisible();
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-draft-visible.png`,
  });

  await page.getByRole('button', { name: 'Resume' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/developer/create-development\\?draftId=${seed.draftId}`));
  await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name:
        scenario.lane === 'rental'
          ? 'Publish Rental Package'
          : 'Publish Auction Package',
    }),
  ).toBeEnabled();
  await expect(page.getByText(scenario.name).first()).toBeVisible();
  await expect(page.getByText(scenario.unitName).first()).toBeVisible();
  await expect(page.getByText(scenario.highlights[0]).first()).toBeVisible();
  await expect(page.getByText(scenario.expectedReviewPricing).first()).toBeVisible();
  await expect(page.locator(`img[src="${`https://example.com/dle-${scenario.lane}-wizard-hero.jpg`}"]`).first()).toBeVisible();
  const engineContext = page.getByLabel(`${scenario.expectedEngineLabel} packaging context`);
  await expect(engineContext).toBeVisible();
  await expect(engineContext.getByText(scenario.expectedEngineLabel)).toBeVisible();
  await expect(engineContext.getByText(scenario.expectedEngineSignal)).toBeVisible();
  await expect(engineContext).toContainText(scenario.expectedEngineOutcome);
  await expect(engineContext).toContainText('readiness, publish safety, and public conversion');

  if (scenario.lane === 'rental') {
    const rentalFeedback = page.getByLabel('Rental packaging feedback');
    await expect(rentalFeedback).toBeVisible();
    await expect(rentalFeedback.getByText('Lease-ready renter journey')).toBeVisible();
    await expect(rentalFeedback.getByText('6 of 6 ready')).toBeVisible();
    await expect(rentalFeedback.getByText(/Rent from/i)).toBeVisible();
    await expect(rentalFeedback.getByText(/Deposit from/i)).toBeVisible();
    await expect(rentalFeedback.getByText('12 months lease term ready.')).toBeVisible();
    await expect(rentalFeedback.getByText('Furnished option visible.')).toBeVisible();
    await expect(rentalFeedback.getByText('8 rental units available.')).toBeVisible();
    await expect(rentalFeedback.getByText(/rent, deposit, and lease expectations/i)).toBeVisible();
    await rentalFeedback.screenshot({
      path: `${evidenceDir}/qa-dle-rental-wizard-packaging-feedback.png`,
    });
  }

  if (scenario.lane === 'auction') {
    const auctionFeedback = page.getByLabel('Auction packaging feedback');
    await expect(auctionFeedback).toBeVisible();
    await expect(auctionFeedback.getByText('Bid-ready auction journey')).toBeVisible();
    await expect(auctionFeedback.getByText('6 of 6 ready')).toBeVisible();
    await expect(auctionFeedback.getByText(/Bid from/i)).toBeVisible();
    await expect(auctionFeedback.getByText('Auction window scheduled.')).toBeVisible();
    await expect(auctionFeedback.getByText('Reserve tracked internally.')).toBeVisible();
    await expect(auctionFeedback.getByText('scheduled lifecycle ready.')).toBeVisible();
    await expect(auctionFeedback.getByText('1 bidder document attached.')).toBeVisible();
    await expect(
      auctionFeedback.getByText('2 lots open inside a scheduled auction window.'),
    ).toBeVisible();
    await auctionFeedback.screenshot({
      path: `${evidenceDir}/qa-dle-auction-wizard-packaging-feedback.png`,
    });
  }

  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-engine-band.png`,
  });
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-resume-hydrated.png`,
  });
}

async function manualSaveAndAssert(page: Page, scenario: DraftScenario, seed: DraftSeed) {
  const saveResponsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.saveDraft') &&
      response.request().method() === 'POST',
    { timeout: 10_000 },
  );
  await page.getByRole('button', { name: 'Save Draft' }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();
  expect(getTrpcResponseData(await saveResponse.json())).toMatchObject({ success: true });

  const db = await getDb();
  expect(db).toBeTruthy();
  const [draft] = await db!
    .select()
    .from(developmentDrafts)
    .where(eq(developmentDrafts.id, seed.draftId))
    .limit(1);
  expect(draft).toBeTruthy();

  const draftData = draft.draftData as any;
  expect(draftData.workflowId).toBe(
    scenario.lane === 'rental' ? 'residential_rent' : 'residential_auction',
  );
  expect(draftData.currentStepId).toBe('review_publish');
  expect(draftData.stepData.unit_types.unitTypes[0].id).toBe(scenario.unitId);
  expect(draftData.stepData.unit_types.unitTypes[0].name).toBe(scenario.unitName);

  if (scenario.lane === 'rental') {
    expect(draftData.developmentData.transactionType).toBe('for_rent');
    expect(draftData.unitTypes[0].monthlyRentFrom).toBe(18_500);
    expect(draftData.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(draftData.unitTypes[0]).not.toHaveProperty('startingBid');
  } else {
    expect(draftData.developmentData.transactionType).toBe('auction');
    expect(draftData.unitTypes[0].startingBid).toBe(920_000);
    expect(draftData.unitTypes[0].reservePrice).toBe(1_080_000);
    expect(draftData.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(draftData.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  }
}

async function provePreReviewManualSave(page: Page, scenario: DraftScenario) {
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save Draft', exact: true })).toBeVisible();

  const saveResponsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.saveDraft') &&
      response.request().method() === 'POST',
    { timeout: 10_000 },
  );
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();
  const saveResponseData = getTrpcResponseData(await saveResponse.json());
  expect(saveResponseData).toMatchObject({ success: true });
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-pre-review-save.png`,
  });

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 15_000 });
}

async function publishAndFindDevelopment(page: Page, scenario: DraftScenario) {
  await page
    .getByRole('button', {
      name:
        scenario.lane === 'rental'
          ? 'Publish Rental Package'
          : 'Publish Auction Package',
    })
    .click();
  await page
    .getByRole('button', {
      name:
        scenario.lane === 'rental'
          ? 'Confirm & Publish Rental'
          : 'Confirm & Publish Auction',
    })
    .click();
  await expect(page).toHaveURL(/\/developer\/developments/, { timeout: 20_000 });

  const db = await getDb();
  expect(db).toBeTruthy();

  const published = await expect
    .poll(
      async () => {
        const [row] = await db!
          .select()
          .from(developments)
          .where(eq(developments.name, scenario.name))
          .limit(1);
        return row ?? null;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();

  void published;
  const [development] = await db!
    .select()
    .from(developments)
    .where(eq(developments.name, scenario.name))
    .limit(1);

  expect(development.isPublished).toBe(1);
  expect(development.approvalStatus).toBe('approved');
  expect(development.transactionType).toBe(
    scenario.lane === 'rental' ? 'for_rent' : 'auction',
  );
  return development as any;
}

async function provePublicSearchAndLead(page: Page, scenario: DraftScenario, development: any) {
  await page.goto(`/development/${development.slug}`);
  await expect(page.getByRole('heading', { name: scenario.name })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(scenario.unitName).first()).toBeVisible();
  await expect(page.getByText(scenario.highlights[0]).first()).toBeVisible();
  await expect(page.locator('body')).toContainText(scenario.expectedPublicPricing);
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-public-page.png`,
  });

  if (scenario.lane === 'rental') {
    await page.goto('/property-to-rent?city=Cape%20Town&province=western-cape&listingSource=development');
  } else {
    await page.goto(
      '/property-for-sale?listingType=auction&city=Cape%20Town&province=western-cape&listingSource=development',
    );
  }
  await expect(page.getByText(scenario.unitName).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(scenario.expectedSearchPricing).first()).toBeVisible();
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-search-card.png`,
  });

  await page.goto(`/development/${development.slug}`);
  await page.getByRole('button', { name: scenario.expectedLeadCta }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`Unit: ${scenario.unitName}`).first()).toBeVisible();
  await expect(dialog.getByText(scenario.expectedPriceLabel, { exact: false }).first()).toBeVisible();

  const email = `lead-${scenario.lane}-${Date.now()}@example.com`;
  await page.getByPlaceholder('Full name').fill(`${scenario.lane} Wizard Lead`);
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Phone number').fill('0820000000');
  await page.getByPlaceholder('Message (optional)').fill('Please send the wizard-published pack.');
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-${scenario.lane}-wizard-lead-context.png`,
  });
  await page.getByRole('button', { name: scenario.expectedSubmitCta }).click();

  const db = await getDb();
  expect(db).toBeTruthy();
  await expect
    .poll(
      async () => {
        const [lead] = await db!.select().from(leads).where(eq(leads.email, email)).limit(1);
        return lead ?? null;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();

  const [lead] = await db!.select().from(leads).where(eq(leads.email, email)).limit(1);
  const leadContext = getLeadContext(lead);
  expect(Number(lead.developmentId)).toBe(Number(development.id));
  expect(lead.unitId).toBe(scenario.unitId);
  expect(lead.unitName).toBe(scenario.unitName);
  expect(lead.leadSource).toBe('development_detail_contact');
  expect(lead.funnelStage).toBe('interest');
  expect(leadContext.transactionType).toBe(scenario.expectedTransactionType);
  expect(leadContext.unitPriceLabel).toBe(scenario.expectedPriceLabel);
}

test.describe.serial('DLE rental and auction wizard save-resume-publish proof', () => {
  const createdUserIds: number[] = [];
  const createdDeveloperIds: number[] = [];
  const createdDraftIds: number[] = [];
  const createdDevelopmentIds: number[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentIds.length > 0) {
      await db.delete(leads).where(inArray(leads.developmentId, createdDevelopmentIds));
      await db.delete(developments).where(inArray(developments.id, createdDevelopmentIds));
    }
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

  const scenarios: DraftScenario[] = [
    {
      lane: 'rental',
      name: 'DLE Wizard Rental Publish Proof',
      slugSearchName: 'DLE Wizard Rental Publish Proof',
      unitId: 'wizard-rental-unit',
      unitName: 'Wizard Rental Two Bed',
      highlights: ['Lease-ready homes', 'Managed tenant onboarding', 'Furnished option'],
      expectedEngineLabel: 'Rental Engine',
      expectedEngineSignal: 'Monthly rent ranges',
      expectedEngineOutcome: /rent language, unit fit, rental CTAs, and lease lead context/i,
      expectedLeadCta: /Request Rental Details/i,
      expectedSubmitCta: /Send Rental Enquiry/i,
      expectedTransactionType: 'rent',
      expectedPriceLabel: 'Rent from',
      expectedPublicPricing: /R\s*18[\s,]500\s*-\s*R\s*21[\s,]000/i,
      expectedReviewPricing: /R\s*18,500\s*\/ month/i,
      expectedSearchPricing: /Rent from\s+R\s*18,500/i,
    },
    {
      lane: 'auction',
      name: 'DLE Wizard Auction Publish Proof',
      slugSearchName: 'DLE Wizard Auction Publish Proof',
      unitId: 'wizard-auction-unit',
      unitName: 'Wizard Auction Three Bed',
      highlights: ['Bid window scheduled', 'Reserve guidance ready', 'Legal pack prepared'],
      expectedEngineLabel: 'Auction Engine',
      expectedEngineSignal: 'Auction window',
      expectedEngineOutcome: /bid language, auction timing, registration CTAs, and auction lead context/i,
      expectedLeadCta: /Register Auction Interest|Request Auction Details/i,
      expectedSubmitCta: /Register Auction Interest|Send Auction Enquiry/i,
      expectedTransactionType: 'auction',
      expectedPriceLabel: 'Starting bid',
      expectedPublicPricing: /R\s*920[\s,]000/i,
      expectedReviewPricing: /R\s*920,000\s*\(starting bid\)/i,
      expectedSearchPricing: /Bid from\s+R\s*920,000/i,
    },
  ];

  for (const scenario of scenarios) {
    test(`proves ${scenario.lane} wizard draft resume, manual save, publish, public output, search, and lead context`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const suffix = `${scenario.lane}-${Date.now()}`;
      const seed = await seedDeveloperAndDraft(
        {
          ...scenario,
          name: `${scenario.name} ${suffix}`,
          slugSearchName: `${scenario.slugSearchName} ${suffix}`,
          unitId: `${scenario.unitId}-${suffix}`.slice(0, 36),
          unitName: `${scenario.unitName} ${suffix}`,
        },
        suffix,
      );
      createdUserIds.push(seed.userId);
      createdDeveloperIds.push(seed.developerId);
      createdDraftIds.push(seed.draftId);

      const seededScenario = {
        ...scenario,
        name: `${scenario.name} ${suffix}`,
        slugSearchName: `${scenario.slugSearchName} ${suffix}`,
        unitId: `${scenario.unitId}-${suffix}`.slice(0, 36),
        unitName: `${scenario.unitName} ${suffix}`,
      };

      await loginAsSeededDeveloper(page, seed);
      await proveDraftListAndResume(page, seededScenario, seed);
      await provePreReviewManualSave(page, seededScenario);
      await manualSaveAndAssert(page, seededScenario, seed);
      const development = await publishAndFindDevelopment(page, seededScenario);
      createdDevelopmentIds.push(Number(development.id));
      await provePublicSearchAndLead(page, seededScenario, development);
    });
  }
});

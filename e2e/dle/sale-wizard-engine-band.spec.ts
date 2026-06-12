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

const evidenceDir = 'docs/dle/evidence/2026-06-12';
fs.mkdirSync(evidenceDir, { recursive: true });

type DraftSeed = {
  developerId: number;
  draftId: number;
  email: string;
  password: string;
  userId: number;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function buildSaleCanonicalDraft(name: string, unitId: string, unitName: string) {
  const heroImage = 'https://example.com/dle-sale-wizard-hero.jpg';
  const highlights = ['Launch-ready ownership story', 'Buyer costs visible', 'Reserved stock tracked'];
  const description =
    'Browser-level sale wizard proof package with sale pricing, buyer-cost confidence, media, highlights, unit inventory, and publish readiness.';
  const unit = {
    id: unitId,
    name: unitName,
    bedrooms: 2,
    bathrooms: 2,
    unitSize: 84,
    priceFrom: 1_950_000,
    priceTo: 2_250_000,
    totalUnits: 16,
    availableUnits: 11,
    reservedUnits: 3,
    parkingType: 'covered',
    parkingBays: 2,
  };
  const location = {
    address: '10 Sale Wizard Road',
    suburb: 'Sale Wizard Proof',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
  };

  return {
    _version: '3.0',
    workflowId: 'residential_sale',
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
    transactionType: 'for_sale',
    classification: { type: 'residential' },
    heroImage,
    developmentData: {
      name,
      description,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      location,
      highlights,
      amenities: ['Pool', 'Security', 'Backup power'],
      media: {
        heroImage: {
          id: 'sale-wizard-hero',
          url: heroImage,
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [
          {
            id: 'sale-wizard-photo',
            url: 'https://example.com/dle-sale-wizard-gallery.jpg',
            type: 'image',
            category: 'general',
          },
        ],
        videos: [],
        documents: [
          {
            id: 'sale-wizard-brochure',
            url: 'https://example.com/dle-sale-wizard-brochure.pdf',
            type: 'document',
            category: 'brochure',
          },
        ],
      },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_sale',
      },
      identity_market: {
        name,
        transactionType: 'for_sale',
        status: 'launching-soon',
        ownershipTypes: ['sectional-title'],
        launchDate: '2029-01-10',
        completionDate: '2030-03-31',
      },
      location,
      governance_finances: {
        monthlyLevyFrom: 1_650,
        ratesFrom: 1_150,
      },
      amenities_features: {
        amenities: ['Pool', 'Security', 'Backup power'],
      },
      marketing_summary: {
        description,
        keySellingPoints: highlights,
        highlights,
      },
      development_media: {
        heroImage: {
          id: 'sale-wizard-hero',
          url: heroImage,
          type: 'image',
          category: 'featured',
          isPrimary: true,
        },
        photos: [
          {
            id: 'sale-wizard-photo',
            url: 'https://example.com/dle-sale-wizard-gallery.jpg',
            type: 'image',
            category: 'general',
          },
        ],
        videos: [],
        floorPlans: [],
        documents: [
          {
            id: 'sale-wizard-brochure',
            url: 'https://example.com/dle-sale-wizard-brochure.pdf',
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
        readinessDismissals: ['sale-wizard-proof'],
      },
    },
    unitTypes: [unit],
  };
}

async function seedDeveloperAndDraft(suffix: string): Promise<DraftSeed & { name: string; unitName: string }> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-sale-wizard-${suffix}@example.com`;
  const password = `Password123!${suffix}`;
  const passwordHash = await authService.hashPassword(password);
  const name = `DLE Wizard Sale Engine Proof ${suffix}`;
  const unitId = `wizard-sale-unit-${suffix}`.slice(0, 36);
  const unitName = `Wizard Sale Two Bed ${suffix}`;

  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Sale',
    lastName: 'Wizard',
    name: 'Sale Wizard Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Sale Wizard Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const draftData = sanitizeDraftData(buildSaleCanonicalDraft(name, unitId, unitName) as any);
  const { currentStep, progress } = deriveDraftProgressMetadata(draftData as any);
  const draftInsert = await db!.insert(developmentDrafts).values({
    developerId,
    draftName: name,
    draftData,
    currentStep,
    progress,
  });
  const draftId = getInsertId(draftInsert);

  return { developerId, draftId, email, password, userId, name, unitName };
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

test.describe.serial('DLE sale wizard engine-band proof', () => {
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

  test('proves saved sale draft resume renders Sale Engine guidance in the real wizard shell', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const seed = await seedDeveloperAndDraft(`sale-${Date.now()}`);
    createdUserIds.push(seed.userId);
    createdDeveloperIds.push(seed.developerId);
    createdDraftIds.push(seed.draftId);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/drafts');
    await expect(page.getByRole('heading', { name: 'My Development Drafts' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seed.name).first()).toBeVisible();
    await expect(page.getByText('1 unit type(s)').first()).toBeVisible();

    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/developer/create-development\\?draftId=${seed.draftId}`));
    await expect(page.getByText('Publishing Controls')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish Listing' })).toBeEnabled();
    await expect(page.getByText(seed.name).first()).toBeVisible();
    await expect(page.getByText(seed.unitName).first()).toBeVisible();
    await expect(page.getByText('Launch-ready ownership story').first()).toBeVisible();
    await expect(page.getByText(/R\s*1,950,000/i).first()).toBeVisible();
    await expect(page.locator('img[src="https://example.com/dle-sale-wizard-hero.jpg"]').first()).toBeVisible();

    const engineContext = page.getByLabel('Sale Engine packaging context');
    await expect(engineContext).toBeVisible();
    await expect(engineContext.getByText('Sale Engine')).toBeVisible();
    await expect(engineContext.getByText('Sale price bands')).toBeVisible();
    await expect(engineContext.getByText('Buyer costs')).toBeVisible();
    await expect(engineContext).toContainText(/price ranges, unit cards, buyer CTAs, and purchase lead context/i);
    await expect(engineContext).toContainText('readiness, publish safety, and public conversion');

    const previewFeedback = page.getByLabel('Public preview feedback');
    await expect(previewFeedback).toBeVisible();
    await expect(previewFeedback.getByText('Buyer-facing basics before publish')).toBeVisible();
    await expect(previewFeedback.getByText('3 of 3 ready')).toBeVisible();
    await expect(previewFeedback.getByText(/is ready to anchor the public preview/i)).toBeVisible();
    await expect(previewFeedback.getByText(/3 highlights ready for buyer-facing chips/i)).toBeVisible();
    await expect(previewFeedback.getByText(/Hero media ready with 1 gallery photo/i)).toBeVisible();

    await page.screenshot({
      path: `${evidenceDir}/qa-dle-sale-wizard-engine-band.png`,
    });
    await previewFeedback.screenshot({
      path: `${evidenceDir}/qa-dle-sale-wizard-public-preview-feedback.png`,
    });
  });
});

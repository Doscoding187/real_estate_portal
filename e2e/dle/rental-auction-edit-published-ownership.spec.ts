import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, leads, users } from '../../drizzle/schema';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';

type SeededDevelopment = {
  id: number;
  slug: string;
  name: string;
  city: string;
  unitId: string;
  originalUnitName: string;
  updatedUnitName: string;
};

const evidenceDir = 'docs/dle/evidence/2026-06-03';

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getLeadContext(row: any) {
  const raw = row?.affordabilityData;
  if (!raw) return {};
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.leadContext ?? {};
}

async function submitUnitLead(input: {
  page: Page;
  development: SeededDevelopment;
  email: string;
  expectedTransactionType: 'rent' | 'auction';
  expectedPriceLabel: string;
  screenshotName: string;
}) {
  await input.page.goto(`/development/${input.development.slug}`);
  await expect(input.page.getByRole('heading', { name: input.development.name })).toBeVisible({
    timeout: 15_000,
  });
  await input.page.getByRole('button', { name: /Request Callback|Join Waitlist/i }).first().click();

  const dialog = input.page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`Unit: ${input.development.updatedUnitName}`).first()).toBeVisible();
  await expect(dialog.getByText(input.expectedPriceLabel, { exact: false }).first()).toBeVisible();

  await input.page.getByPlaceholder('Full name').fill(`${input.expectedTransactionType} Edited Lead`);
  await input.page.getByPlaceholder('Email address').fill(input.email);
  await input.page.getByPlaceholder('Phone number').fill('0820000000');
  await input.page.getByPlaceholder('Message (optional)').fill('Please send the updated pack.');
  await input.page.screenshot({ path: `${evidenceDir}/${input.screenshotName}` });
  await input.page.getByRole('button', { name: 'Send Enquiry' }).click();

  const db = await getDb();
  expect(db).toBeTruthy();

  await expect
    .poll(
      async () => {
        const [lead] = await db!.select().from(leads).where(eq(leads.email, input.email)).limit(1);
        return lead ?? null;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();

  const [lead] = await db!.select().from(leads).where(eq(leads.email, input.email)).limit(1);
  const leadContext = getLeadContext(lead);

  expect(Number(lead.developmentId)).toBe(input.development.id);
  expect(lead.unitId).toBe(input.development.unitId);
  expect(lead.unitName).toBe(input.development.updatedUnitName);
  expect(lead.leadSource).toBe('development_detail_contact');
  expect(lead.funnelStage).toBe('interest');
  expect(leadContext.transactionType).toBe(input.expectedTransactionType);
  expect(leadContext.unitPriceLabel).toBe(input.expectedPriceLabel);
}

test.describe.serial('DLE rental and auction edit-published browser ownership', () => {
  const createdUserIds: number[] = [];
  const createdDeveloperIds: number[] = [];
  const createdDevelopmentIds: number[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentIds.length > 0) {
      await db.delete(leads).where(inArray(leads.developmentId, createdDevelopmentIds));
      await db.delete(developments).where(inArray(developments.id, createdDevelopmentIds));
    }

    if (createdDeveloperIds.length > 0) {
      await db.delete(developers).where(inArray(developers.id, createdDeveloperIds));
    }

    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  async function createApprovedDeveloper(label: string, suffix: string) {
    const db = await getDb();
    expect(db).toBeTruthy();

    const userInsert = await db!.insert(users).values({
      email: `${label}-edit-browser-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: label,
      lastName: 'EditBrowser',
      name: `${label} Edit Browser User`,
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    createdUserIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `${label} Edit Browser Developer ${suffix}`,
      email: `${label}-edit-browser-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    createdDeveloperIds.push(developerId);

    return { userId };
  }

  async function publishSeededDevelopment(id: number, userId: number) {
    if (!createdDevelopmentIds.includes(id)) {
      createdDevelopmentIds.push(id);
    }
    await developmentService.publishDevelopment(id, userId);
    await developmentService.approveDevelopment(id, 1);
  }

  async function seedRentalDevelopment(suffix: string): Promise<SeededDevelopment & { userId: number }> {
    const { userId } = await createApprovedDeveloper('Rental', suffix);
    const unitId = `rent-edit-${suffix}`.slice(0, 36);
    const originalUnitName = `Rental Browser Edit 2 Bed ${suffix}`;
    const updatedUnitName = `Rental Browser Edit 2 Bed Updated ${suffix}`;
    const created = await developmentService.createDevelopment(userId, {
      name: `DLE Rental Edit Ownership ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '21 Rental Browser Edit Road',
      city: `dle edit rental city ${suffix}`,
      province: 'Gauteng',
      suburb: `Rental Edit Proof ${suffix}`,
      status: 'leasing',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      description: 'Rental edit-published browser proof keeps monthly rent and inventory stable.',
      highlights: ['Lease ready', 'Fibre ready', 'Managed access'],
      images: [{ url: `https://example.com/dle-rental-edit-original-${suffix}.jpg` }],
      videos: [`https://example.com/dle-rental-edit-original-${suffix}.mp4`],
      floorPlans: [`https://example.com/dle-rental-edit-original-${suffix}.pdf`],
      brochures: [`https://example.com/dle-rental-edit-original-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 950,
      ratesFrom: 650,
      unitTypes: [
        {
          id: unitId,
          name: originalUnitName,
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 72,
          monthlyRentFrom: 12_500,
          monthlyRentTo: 14_500,
          depositRequired: 25_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 18,
          availableUnits: 11,
          reservedUnits: 3,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
    } as any);

    await publishSeededDevelopment(Number(created.id), userId);

    return {
      id: Number(created.id),
      slug: String(created.slug),
      name: String(created.name),
      city: `dle edit rental city ${suffix}`,
      unitId,
      originalUnitName,
      updatedUnitName,
      userId,
    };
  }

  async function seedAuctionDevelopment(suffix: string): Promise<SeededDevelopment & { userId: number }> {
    const { userId } = await createApprovedDeveloper('Auction', suffix);
    const unitId = `auction-edit-${suffix}`.slice(0, 36);
    const originalUnitName = `Auction Browser Edit Lot ${suffix}`;
    const updatedUnitName = `Auction Browser Edit Lot Updated ${suffix}`;
    const created = await developmentService.createDevelopment(userId, {
      name: `DLE Auction Edit Ownership ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      address: '31 Auction Browser Edit Road',
      city: `dle edit auction city ${suffix}`,
      province: 'Gauteng',
      suburb: `Auction Edit Proof ${suffix}`,
      status: 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      description: 'Auction edit-published browser proof keeps bid terms and inventory stable.',
      highlights: ['Timed bidding', 'Legal pack ready', 'Secure estate'],
      images: [{ url: `https://example.com/dle-auction-edit-original-${suffix}.jpg` }],
      videos: [`https://example.com/dle-auction-edit-original-${suffix}.mp4`],
      floorPlans: [`https://example.com/dle-auction-edit-original-${suffix}.pdf`],
      brochures: [`https://example.com/dle-auction-edit-original-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 1_450,
      ratesFrom: 1_050,
      unitTypes: [
        {
          id: unitId,
          name: originalUnitName,
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 118,
          startingBid: 900_000,
          reservePrice: 1_050_000,
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
          auctionStatus: 'scheduled',
          totalUnits: 1,
          availableUnits: 1,
          reservedUnits: 0,
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
    } as any);

    await publishSeededDevelopment(Number(created.id), userId);

    return {
      id: Number(created.id),
      slug: String(created.slug),
      name: String(created.name),
      city: `dle edit auction city ${suffix}`,
      unitId,
      originalUnitName,
      updatedUnitName,
      userId,
    };
  }

  async function expectRentalPublicPage(page: Page, rental: SeededDevelopment, expected: {
    suburb: string;
    unitName: string;
    rentText: string;
    highlight: string;
    imagePattern?: RegExp;
  }) {
    await page.goto(`/development/${rental.slug}`);
    await expect(page.getByRole('heading', { name: rental.name })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(expected.suburb).first()).toBeVisible();
    await expect(page.getByText('Rent From').first()).toBeVisible();
    await expect(page.getByText('Monthly Rent').first()).toBeVisible();
    await expect(page.getByText(expected.unitName).first()).toBeVisible();
    await expect(page.getByText(expected.rentText).first()).toBeVisible();
    await expect(page.getByText(expected.highlight).first()).toBeVisible();
  }

  async function expectAuctionPublicPage(page: Page, auction: SeededDevelopment, expected: {
    suburb: string;
    unitName: string;
    bidText: string;
    highlight: string;
    imagePattern?: RegExp;
  }) {
    await page.goto(`/development/${auction.slug}`);
    await expect(page.getByRole('heading', { name: auction.name })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(expected.suburb).first()).toBeVisible();
    await expect(page.getByText('Starting Bid').first()).toBeVisible();
    await expect(page.getByText(expected.unitName).first()).toBeVisible();
    await expect(page.getByText(expected.bidText).first()).toBeVisible();
    await expect(page.getByText(expected.highlight).first()).toBeVisible();
  }

  test('proves rental edit-published ownership remains visible in browser output', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`;
    const rental = await seedRentalDevelopment(suffix);

    await developmentService.updateDevelopment(rental.id, rental.userId, {
      workflowId: 'residential_rent',
      currentStepId: 'location',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        location: {
          address: '21 Rental Browser Edit Road Updated',
          city: rental.city,
          province: 'Gauteng',
          suburb: `Rental Edit Heights ${suffix}`,
        },
      },
      address: '21 Rental Browser Edit Road Updated',
      city: rental.city,
      province: 'Gauteng',
      suburb: `Rental Edit Heights ${suffix}`,
      priceFrom: 999_999,
    } as any);
    await expectRentalPublicPage(page, rental, {
      suburb: `Rental Edit Heights ${suffix}`,
      unitName: rental.originalUnitName,
      rentText: 'R 12 500',
      highlight: 'Lease ready',
    });

    await developmentService.updateDevelopment(rental.id, rental.userId, {
      workflowId: 'residential_rent',
      currentStepId: 'development_media',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        development_media: {
          heroImage: { url: `https://example.com/dle-rental-edit-updated-${suffix}.jpg` },
          videos: [`https://example.com/dle-rental-edit-updated-${suffix}.mp4`],
          floorPlans: [`https://example.com/dle-rental-edit-updated-${suffix}.pdf`],
          brochures: [`https://example.com/dle-rental-edit-updated-brochure-${suffix}.pdf`],
        },
      },
      images: [{ url: `https://example.com/dle-rental-edit-updated-${suffix}.jpg` }],
      videos: [`https://example.com/dle-rental-edit-updated-${suffix}.mp4`],
      floorPlans: [`https://example.com/dle-rental-edit-updated-${suffix}.pdf`],
      brochures: [`https://example.com/dle-rental-edit-updated-brochure-${suffix}.pdf`],
      address: '99 Stale Rental Media Road',
      monthlyRentFrom: 99_999,
    } as any);
    await expectRentalPublicPage(page, rental, {
      suburb: `Rental Edit Heights ${suffix}`,
      unitName: rental.originalUnitName,
      rentText: 'R 12 500',
      highlight: 'Lease ready',
      imagePattern: /dle-rental-edit-updated-/,
    });

    await developmentService.updateDevelopment(rental.id, rental.userId, {
      workflowId: 'residential_rent',
      currentStepId: 'marketing_summary',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        marketing_summary: {
          description: 'Updated rental edit browser copy proves highlights survive safely.',
          highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
        },
      },
      description: 'Updated rental edit browser copy proves highlights survive safely.',
      highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
      priceFrom: 888_888,
      monthlyRentFrom: 88_888,
    } as any);
    await expectRentalPublicPage(page, rental, {
      suburb: `Rental Edit Heights ${suffix}`,
      unitName: rental.originalUnitName,
      rentText: 'R 12 500',
      highlight: 'Lease specials',
      imagePattern: /dle-rental-edit-updated-/,
    });

    await developmentService.updateDevelopment(rental.id, rental.userId, {
      workflowId: 'residential_rent',
      currentStepId: 'governance_finances',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        governance_finances: {
          levyRange: { min: 1_050, max: 1_350 },
          rightsAndTaxes: { min: 725, max: 950 },
          transferCostsIncluded: true,
        },
      },
      monthlyLevyFrom: 1_050,
      monthlyLevyTo: 1_350,
      ratesFrom: 725,
      ratesTo: 950,
      transferCostsIncluded: 1,
      address: '99 Stale Rental Governance Road',
      monthlyRentFrom: 77_777,
    } as any);
    await expectRentalPublicPage(page, rental, {
      suburb: `Rental Edit Heights ${suffix}`,
      unitName: rental.originalUnitName,
      rentText: 'R 12 500',
      highlight: 'Lease specials',
      imagePattern: /dle-rental-edit-updated-/,
    });

    await developmentService.updateDevelopment(rental.id, rental.userId, {
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      canonicalUpdateMode: 'partial_step',
      transactionType: 'for_rent',
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: rental.unitId,
              name: rental.updatedUnitName,
              bedrooms: 3,
              bathrooms: 2,
              unitSize: 82,
              priceFrom: 3_100_000,
              monthlyRentFrom: 13_500,
              monthlyRentTo: 15_500,
              depositRequired: 27_000,
              leaseTerm: '12 months',
              isFurnished: true,
              totalUnits: 20,
              availableUnits: 9,
              reservedUnits: 4,
              parkingType: 'covered',
              parkingBays: 1,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: rental.unitId,
          name: rental.updatedUnitName,
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 82,
          priceFrom: 3_100_000,
          monthlyRentFrom: 13_500,
          monthlyRentTo: 15_500,
          depositRequired: 27_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 20,
          availableUnits: 9,
          reservedUnits: 4,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
      priceFrom: 777_777,
      monthlyRentFrom: 13_500,
      monthlyRentTo: 15_500,
    } as any);
    await expectRentalPublicPage(page, rental, {
      suburb: `Rental Edit Heights ${suffix}`,
      unitName: rental.updatedUnitName,
      rentText: 'R 13 500 - R 15 500',
      highlight: 'Lease specials',
      imagePattern: /dle-rental-edit-updated-/,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-edit-published-public-page.png`,
    });

    await page.goto(
      `/property-to-rent?city=${encodeURIComponent(rental.city)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(rental.updatedUnitName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rent from R 13,500')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-edit-published-search-card.png`,
    });

    await submitUnitLead({
      page,
      development: rental,
      email: `rental-edit-lead-${suffix}@example.com`,
      expectedTransactionType: 'rent',
      expectedPriceLabel: 'Rent from',
      screenshotName: 'qa-dle-rental-edit-published-lead-context.png',
    });
  });

  test('proves auction edit-published ownership remains visible in browser output', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`;
    const auction = await seedAuctionDevelopment(suffix);

    await developmentService.updateDevelopment(auction.id, auction.userId, {
      workflowId: 'residential_auction',
      currentStepId: 'location',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        location: {
          address: '31 Auction Browser Edit Road Updated',
          city: auction.city,
          province: 'Gauteng',
          suburb: `Auction Edit Heights ${suffix}`,
        },
      },
      address: '31 Auction Browser Edit Road Updated',
      city: auction.city,
      province: 'Gauteng',
      suburb: `Auction Edit Heights ${suffix}`,
      priceFrom: 999_999,
      monthlyRentFrom: 99_999,
    } as any);
    await expectAuctionPublicPage(page, auction, {
      suburb: `Auction Edit Heights ${suffix}`,
      unitName: auction.originalUnitName,
      bidText: 'R 900 000 - R 1 050 000',
      highlight: 'Timed bidding',
    });

    await developmentService.updateDevelopment(auction.id, auction.userId, {
      workflowId: 'residential_auction',
      currentStepId: 'development_media',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        development_media: {
          heroImage: { url: `https://example.com/dle-auction-edit-updated-${suffix}.jpg` },
          videos: [`https://example.com/dle-auction-edit-updated-${suffix}.mp4`],
          floorPlans: [`https://example.com/dle-auction-edit-updated-${suffix}.pdf`],
          brochures: [`https://example.com/dle-auction-edit-updated-brochure-${suffix}.pdf`],
        },
      },
      images: [{ url: `https://example.com/dle-auction-edit-updated-${suffix}.jpg` }],
      videos: [`https://example.com/dle-auction-edit-updated-${suffix}.mp4`],
      floorPlans: [`https://example.com/dle-auction-edit-updated-${suffix}.pdf`],
      brochures: [`https://example.com/dle-auction-edit-updated-brochure-${suffix}.pdf`],
      address: '99 Stale Auction Media Road',
      startingBidFrom: 99_999,
    } as any);
    await expectAuctionPublicPage(page, auction, {
      suburb: `Auction Edit Heights ${suffix}`,
      unitName: auction.originalUnitName,
      bidText: 'R 900 000 - R 1 050 000',
      highlight: 'Timed bidding',
      imagePattern: /dle-auction-edit-updated-/,
    });

    await developmentService.updateDevelopment(auction.id, auction.userId, {
      workflowId: 'residential_auction',
      currentStepId: 'marketing_summary',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        marketing_summary: {
          description: 'Updated auction edit browser copy proves highlights survive safely.',
          highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
        },
      },
      description: 'Updated auction edit browser copy proves highlights survive safely.',
      highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
      priceFrom: 888_888,
      monthlyRentFrom: 88_888,
      startingBidFrom: 88_888,
    } as any);
    await expectAuctionPublicPage(page, auction, {
      suburb: `Auction Edit Heights ${suffix}`,
      unitName: auction.originalUnitName,
      bidText: 'R 900 000 - R 1 050 000',
      highlight: 'Registration open',
      imagePattern: /dle-auction-edit-updated-/,
    });

    await developmentService.updateDevelopment(auction.id, auction.userId, {
      workflowId: 'residential_auction',
      currentStepId: 'governance_finances',
      canonicalUpdateMode: 'partial_step',
      stepData: {
        governance_finances: {
          levyRange: { min: 1_650, max: 1_950 },
          rightsAndTaxes: { min: 1_225, max: 1_525 },
          transferCostsIncluded: true,
        },
      },
      monthlyLevyFrom: 1_650,
      monthlyLevyTo: 1_950,
      ratesFrom: 1_225,
      ratesTo: 1_525,
      transferCostsIncluded: 1,
      address: '99 Stale Auction Governance Road',
      startingBidFrom: 77_777,
    } as any);
    await expectAuctionPublicPage(page, auction, {
      suburb: `Auction Edit Heights ${suffix}`,
      unitName: auction.originalUnitName,
      bidText: 'R 900 000 - R 1 050 000',
      highlight: 'Registration open',
      imagePattern: /dle-auction-edit-updated-/,
    });

    await developmentService.updateDevelopment(auction.id, auction.userId, {
      workflowId: 'residential_auction',
      currentStepId: 'unit_types',
      canonicalUpdateMode: 'partial_step',
      transactionType: 'auction',
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: auction.unitId,
              name: auction.updatedUnitName,
              bedrooms: 4,
              bathrooms: 3,
              unitSize: 132,
              priceFrom: 3_800_000,
              monthlyRentFrom: 28_000,
              startingBid: 1_050_000,
              reservePrice: 1_250_000,
              auctionStartDate: '2030-03-01T09:00:00.000Z',
              auctionEndDate: '2030-03-08T17:00:00.000Z',
              auctionStatus: 'scheduled',
              totalUnits: 2,
              availableUnits: 1,
              reservedUnits: 1,
              parkingType: 'garage',
              parkingBays: 2,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: auction.unitId,
          name: auction.updatedUnitName,
          bedrooms: 4,
          bathrooms: 3,
          unitSize: 132,
          priceFrom: 3_800_000,
          monthlyRentFrom: 28_000,
          startingBid: 1_050_000,
          reservePrice: 1_250_000,
          auctionStartDate: '2030-03-01T09:00:00.000Z',
          auctionEndDate: '2030-03-08T17:00:00.000Z',
          auctionStatus: 'scheduled',
          totalUnits: 2,
          availableUnits: 1,
          reservedUnits: 1,
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
      priceFrom: 777_777,
      monthlyRentFrom: 77_777,
      startingBidFrom: 1_050_000,
      reservePriceFrom: 1_250_000,
    } as any);
    await expectAuctionPublicPage(page, auction, {
      suburb: `Auction Edit Heights ${suffix}`,
      unitName: auction.updatedUnitName,
      bidText: 'R 1 050 000 - R 1 250 000',
      highlight: 'Registration open',
      imagePattern: /dle-auction-edit-updated-/,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-edit-published-public-page.png`,
    });

    await page.goto(
      `/property-for-sale?listingType=auction&city=${encodeURIComponent(auction.city)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(auction.updatedUnitName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bid from R 1,050,000')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-edit-published-search-card.png`,
    });

    await submitUnitLead({
      page,
      development: auction,
      email: `auction-edit-lead-${suffix}@example.com`,
      expectedTransactionType: 'auction',
      expectedPriceLabel: 'Starting bid',
      screenshotName: 'qa-dle-auction-edit-published-lead-context.png',
    });
  });
});

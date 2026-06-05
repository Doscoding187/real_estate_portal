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
  unitName: string;
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

test.describe.serial('DLE rental and auction public merchandising', () => {
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
      email: `${label}-browser-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: label,
      lastName: 'Browser',
      name: `${label} Browser User`,
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    createdUserIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `${label} Browser Developer ${suffix}`,
      email: `${label}-browser-developer-${suffix}@example.com`,
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

  async function seedRentalDevelopment(suffix: string): Promise<SeededDevelopment> {
    const { userId } = await createApprovedDeveloper('Rental', suffix);
    const city = `dle browser city ${suffix}`;
    const unitId = `e2e-rent-${suffix}`.slice(0, 36);
    const unitName = `Browser Rental Studio ${suffix}`;
    const created = await developmentService.createDevelopment(userId, {
      name: `DLE Browser Rental Engine ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '12 Rental Browser Road',
      city,
      province: 'Gauteng',
      suburb: `Rental Proof ${suffix}`,
      status: 'leasing',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2027-03-31',
      description:
        'Browser rental proof package with monthly rent, rental highlights, and unit-level lead context.',
      highlights: ['Immediate occupation', 'Deposit ready', 'Managed leasing'],
      images: [{ url: 'https://example.com/dle-rental-browser-hero.jpg' }],
      brochures: ['https://example.com/dle-rental-browser-brochure.pdf'],
      monthlyLevyFrom: 1_100,
      ratesFrom: 850,
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 1,
          bathrooms: 1,
          unitSize: 48,
          monthlyRentFrom: 12_500,
          monthlyRentTo: 14_500,
          depositRequired: 25_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 6,
          availableUnits: 4,
          reservedUnits: 1,
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
      city,
      unitId,
      unitName,
    };
  }

  async function seedAuctionDevelopment(suffix: string): Promise<SeededDevelopment> {
    const { userId } = await createApprovedDeveloper('Auction', suffix);
    const city = `dle browser city ${suffix}`;
    const unitId = `e2e-auction-${suffix}`.slice(0, 36);
    const unitName = `Browser Auction Lot ${suffix}`;
    const created = await developmentService.createDevelopment(userId, {
      name: `DLE Browser Auction Engine ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      address: '44 Auction Browser Road',
      city,
      province: 'Gauteng',
      suburb: `Auction Proof ${suffix}`,
      status: 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-01-10',
      completionDate: '2030-03-31',
      description:
        'Browser auction proof package with starting bid, reserve pricing, and auction-window lead context.',
      highlights: ['Registration open', 'Legal pack ready', 'Timed bidding'],
      images: [{ url: 'https://example.com/dle-auction-browser-hero.jpg' }],
      brochures: ['https://example.com/dle-auction-browser-brochure.pdf'],
      monthlyLevyFrom: 1_350,
      ratesFrom: 900,
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 82,
          startingBid: 850_000,
          reservePrice: 950_000,
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
          auctionStatus: 'scheduled',
          totalUnits: 2,
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
      city,
      unitId,
      unitName,
    };
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
    await expect(input.page.getByText(input.development.unitName).first()).toBeVisible();
    await input.page
      .getByRole('button', {
        name: /Request Callback|Join Waitlist|Request Rental Details|Register Auction Interest|Request Auction Details/i,
      })
      .first()
      .click();

    const dialog = input.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Unit: ${input.development.unitName}`).first()).toBeVisible();
    await expect(dialog.getByText(input.expectedPriceLabel, { exact: false }).first()).toBeVisible();

    await input.page.getByPlaceholder('Full name').fill(`${input.expectedTransactionType} Browser Lead`);
    await input.page.getByPlaceholder('Email address').fill(input.email);
    await input.page.getByPlaceholder('Phone number').fill('0820000000');
    await input.page.getByPlaceholder('Message (optional)').fill('Please send the transaction-specific pack.');
    await input.page.screenshot({ path: `${evidenceDir}/${input.screenshotName}` });
    await input.page.getByRole('button', { name: 'Send Enquiry' }).click();

    const db = await getDb();
    expect(db).toBeTruthy();

    await expect
      .poll(
        async () => {
          const [lead] = await db!
            .select()
            .from(leads)
            .where(eq(leads.email, input.email))
            .limit(1);
          return lead ?? null;
        },
        { timeout: 10_000 },
      )
      .not.toBeNull();

    const [lead] = await db!.select().from(leads).where(eq(leads.email, input.email)).limit(1);
    const leadContext = getLeadContext(lead);

    expect(Number(lead.developmentId)).toBe(input.development.id);
    expect(lead.unitId).toBe(input.development.unitId);
    expect(lead.unitName).toBe(input.development.unitName);
    expect(lead.leadSource).toBe('development_detail_contact');
    expect(lead.funnelStage).toBe('interest');
    expect(leadContext.transactionType).toBe(input.expectedTransactionType);
    expect(leadContext.unitPriceLabel).toBe(input.expectedPriceLabel);
  }

  test('proves rental public page, search card, and unit lead context in the browser', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`;
    const rental = await seedRentalDevelopment(suffix);
    const rentalEmail = `rental-browser-lead-${suffix}@example.com`;

    await page.goto(`/development/${rental.slug}`);
    await expect(page.getByRole('heading', { name: rental.name })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rent From').first()).toBeVisible();
    await expect(page.getByText('Monthly Rent').first()).toBeVisible();
    await expect(page.getByText(rental.unitName).first()).toBeVisible();
    await expect(page.getByText('R 12 500').first()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/qa-dle-rental-browser-public-page.png` });

    await page.goto(
      `/property-to-rent?city=${encodeURIComponent(rental.city)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(rental.unitName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rent from R 12,500')).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/qa-dle-rental-browser-search-card.png` });

    await submitUnitLead({
      page,
      development: rental,
      email: rentalEmail,
      expectedTransactionType: 'rent',
      expectedPriceLabel: 'Rent from',
      screenshotName: 'qa-dle-rental-browser-lead-context.png',
    });
  });

  test('proves auction public page, search card, and unit lead context in the browser', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`;
    const auction = await seedAuctionDevelopment(suffix);
    const auctionEmail = `auction-browser-lead-${suffix}@example.com`;

    await page.goto(`/development/${auction.slug}`);
    await expect(page.getByRole('heading', { name: auction.name })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Starting Bid').first()).toBeVisible();
    await expect(page.getByText(auction.unitName).first()).toBeVisible();
    await expect(page.getByText('R 850 000 - R 950 000').first()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/qa-dle-auction-browser-public-page.png` });

    await page.goto(
      `/property-for-sale?listingType=auction&city=${encodeURIComponent(auction.city)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(auction.unitName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bid from R 850,000')).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/qa-dle-auction-browser-search-card.png` });

    await submitUnitLead({
      page,
      development: auction,
      email: auctionEmail,
      expectedTransactionType: 'auction',
      expectedPriceLabel: 'Starting bid',
      screenshotName: 'qa-dle-auction-browser-lead-context.png',
    });
  });
});

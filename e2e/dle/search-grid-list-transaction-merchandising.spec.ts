import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, users } from '../../drizzle/schema';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';

type Lane = 'sale' | 'rent' | 'auction';

type SeededDevelopment = {
  id: number;
  userId: number;
  developerId: number;
  name: string;
  city: string;
  unitName: string;
  lane: Lane;
};

type SeedTracker = {
  userIds: number[];
  developerIds: number[];
  developmentIds: number[];
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

async function createApprovedDeveloper(label: string, suffix: string) {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-search-${label}-${suffix}@example.com`;
  const userInsert = await db!.insert(users).values({
    email,
    role: 'property_developer',
    firstName: label,
    lastName: 'Search',
    name: `${label} Search Developer`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `${label} Search Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });

  return {
    userId,
    developerId: getInsertId(developerInsert),
  };
}

async function publishDevelopment(id: number, userId: number) {
  await developmentService.publishDevelopment(id, userId);
  await developmentService.approveDevelopment(id, 1);
}

async function seedSaleDevelopment(
  suffix: string,
  city: string,
  tracker: SeedTracker,
): Promise<SeededDevelopment> {
  const { userId, developerId } = await createApprovedDeveloper('Sale', suffix);
  const unitName = `Search Sale Two Bed ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Search Sale ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '10 Search Sale Road',
    city,
    province: 'Gauteng',
    suburb: 'Search Sale Proof',
    status: 'selling',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Sale search-card browser proof package with price ranges, available inventory, and developer contact language.',
    highlights: ['Sales launch ready', 'Transfer pack prepared', 'Developer team available'],
    images: [{ url: 'https://example.com/dle-search-sale.jpg' }],
    unitTypes: [
      {
        id: `search-sale-${suffix}`.slice(0, 36),
        name: unitName,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 74,
        priceFrom: 1_450_000,
        priceTo: 1_650_000,
        totalUnits: 8,
        availableUnits: 5,
        reservedUnits: 1,
      },
    ],
  } as any);

  const developmentId = Number(created.id);
  tracker.userIds.push(userId);
  tracker.developerIds.push(developerId);
  tracker.developmentIds.push(developmentId);

  await publishDevelopment(developmentId, userId);

  return {
    id: developmentId,
    userId,
    developerId,
    name: String(created.name),
    city,
    unitName,
    lane: 'sale',
  };
}

async function seedRentalDevelopment(
  suffix: string,
  city: string,
  tracker: SeedTracker,
): Promise<SeededDevelopment> {
  const { userId, developerId } = await createApprovedDeveloper('Rental', suffix);
  const unitName = `Search Rental Studio ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Search Rental ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '20 Search Rental Road',
    city,
    province: 'Gauteng',
    suburb: 'Search Rental Proof',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Rental search-card browser proof package with monthly rent, available rentals, and leasing team contact language.',
    highlights: ['Lease pack ready', 'Deposit ready', 'Leasing team available'],
    images: [{ url: 'https://example.com/dle-search-rental.jpg' }],
    unitTypes: [
      {
        id: `search-rent-${suffix}`.slice(0, 36),
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
        availableUnits: 2,
        reservedUnits: 1,
      },
    ],
  } as any);

  const developmentId = Number(created.id);
  tracker.userIds.push(userId);
  tracker.developerIds.push(developerId);
  tracker.developmentIds.push(developmentId);

  await publishDevelopment(developmentId, userId);

  return {
    id: developmentId,
    userId,
    developerId,
    name: String(created.name),
    city,
    unitName,
    lane: 'rent',
  };
}

async function seedAuctionDevelopment(
  suffix: string,
  city: string,
  tracker: SeedTracker,
): Promise<SeededDevelopment> {
  const { userId, developerId } = await createApprovedDeveloper('Auction', suffix);
  const unitName = `Search Auction Lot ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Search Auction ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '30 Search Auction Road',
    city,
    province: 'Gauteng',
    suburb: 'Search Auction Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Auction search-card browser proof package with starting bids, registration state, and auction team contact language.',
    highlights: ['Registration open', 'Legal pack ready', 'Auction team available'],
    images: [{ url: 'https://example.com/dle-search-auction.jpg' }],
    unitTypes: [
      {
        id: `search-auction-${suffix}`.slice(0, 36),
        name: unitName,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 82,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        auctionStatus: 'registration_open',
        totalUnits: 1,
        availableUnits: 1,
        reservedUnits: 0,
      },
    ],
  } as any);

  const developmentId = Number(created.id);
  tracker.userIds.push(userId);
  tracker.developerIds.push(developerId);
  tracker.developmentIds.push(developmentId);

  await publishDevelopment(developmentId, userId);

  return {
    id: developmentId,
    userId,
    developerId,
    name: String(created.name),
    city,
    unitName,
    lane: 'auction',
  };
}

async function assertSearchCardLanguage(input: {
  page: Page;
  route: string;
  unitName: string;
  listPrice: RegExp;
  gridPrice: RegExp;
  availability: string;
  contactLabel: string;
}) {
  await input.page.goto(input.route);
  await expect(input.page.getByText(input.unitName).first()).toBeVisible({ timeout: 15_000 });
  await expect(input.page.getByText(input.listPrice).first()).toBeVisible();
  await expect(input.page.getByText(input.availability).first()).toBeVisible();
  await expect(input.page.getByRole('button', { name: input.contactLabel }).first()).toBeVisible();

  await input.page.getByRole('button', { name: 'Grid' }).click();
  await expect(input.page.getByText(input.unitName).first()).toBeVisible({ timeout: 15_000 });
  await expect(input.page.getByText(input.gridPrice).first()).toBeVisible();
  await expect(input.page.getByText(input.availability).first()).toBeVisible();
  await expect(input.page.getByRole('button', { name: input.contactLabel }).first()).toBeVisible();
}

test.describe.serial('DLE search grid/list transaction merchandising', () => {
  const createdUserIds: number[] = [];
  const createdDeveloperIds: number[] = [];
  const createdDevelopmentIds: number[] = [];

  test.afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentIds.length > 0) {
      await db.delete(developments).where(inArray(developments.id, createdDevelopmentIds));
    }
    if (createdDeveloperIds.length > 0) {
      await db.delete(developers).where(inArray(developers.id, createdDeveloperIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  test('keeps Sale, Rental, and Auction search cards transaction-native when switching views', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`.slice(-8);
    const city = `dle search city ${suffix}`;
    const tracker = {
      userIds: createdUserIds,
      developerIds: createdDeveloperIds,
      developmentIds: createdDevelopmentIds,
    };
    const sale = await seedSaleDevelopment(suffix, city, tracker);
    const rental = await seedRentalDevelopment(suffix, city, tracker);
    const auction = await seedAuctionDevelopment(suffix, city, tracker);

    const encodedCity = encodeURIComponent(city);
    await assertSearchCardLanguage({
      page,
      route: `/property-for-sale?city=${encodedCity}&province=gauteng&listingSource=development`,
      unitName: sale.unitName,
      listPrice: /From R 1,450,000/i,
      gridPrice: /From/i,
      availability: '5 available',
      contactLabel: 'Contact Developer',
    });

    await assertSearchCardLanguage({
      page,
      route: `/property-to-rent?city=${encodedCity}&province=gauteng&listingSource=development`,
      unitName: rental.unitName,
      listPrice: /Rent from R 12,500/i,
      gridPrice: /Rent from/i,
      availability: '2 rentals available',
      contactLabel: 'Contact Leasing Team',
    });

    await assertSearchCardLanguage({
      page,
      route: `/property-for-sale?listingType=auction&city=${encodedCity}&province=gauteng&listingSource=development`,
      unitName: auction.unitName,
      listPrice: /Bid from R 850,000/i,
      gridPrice: /Bid from/i,
      availability: 'Registration open',
      contactLabel: 'Contact Auction Team',
    });
  });
});

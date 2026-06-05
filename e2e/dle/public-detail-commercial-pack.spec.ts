import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
import { inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, users } from '../../drizzle/schema';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';

type SeededDevelopment = {
  id: number;
  userId: number;
  developerId: number;
  slug: string;
  name: string;
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

  const email = `dle-pack-${label}-${suffix}@example.com`;
  const userInsert = await db!.insert(users).values({
    email,
    role: 'property_developer',
    firstName: label,
    lastName: 'Pack',
    name: `${label} Pack Developer`,
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `${label} Pack Developer ${suffix}`,
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

async function seedRentalDevelopment(
  suffix: string,
  tracker: SeedTracker,
): Promise<SeededDevelopment> {
  const { userId, developerId } = await createApprovedDeveloper('Rental', suffix);
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Commercial Pack Rental ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '70 Commercial Pack Rental Road',
    city: `commercial pack city ${suffix}`,
    province: 'Gauteng',
    suburb: 'Rental Pack Proof',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Rental commercial pack proof package with monthly rent, deposit signals, availability, and leasing team readiness.',
    highlights: ['Lease pack ready', 'Deposit ready', 'Managed leasing'],
    images: [{ url: 'https://example.com/dle-commercial-pack-rental.jpg' }],
    brochures: ['https://example.com/dle-commercial-pack-rental.pdf'],
    monthlyLevyFrom: 1_100,
    ratesFrom: 850,
    unitTypes: [
      {
        id: `pack-rent-${suffix}`.slice(0, 36),
        name: `Commercial Pack Rental Studio ${suffix}`,
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
    slug: String(created.slug),
    name: String(created.name),
  };
}

async function seedAuctionDevelopment(
  suffix: string,
  tracker: SeedTracker,
): Promise<SeededDevelopment> {
  const { userId, developerId } = await createApprovedDeveloper('Auction', suffix);
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Commercial Pack Auction ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '80 Commercial Pack Auction Road',
    city: `commercial pack city ${suffix}`,
    province: 'Gauteng',
    suburb: 'Auction Pack Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Auction commercial pack proof package with starting bid, reserve guidance, registration state, and bidder readiness.',
    highlights: ['Registration open', 'Legal pack ready', 'Auction team available'],
    images: [{ url: 'https://example.com/dle-commercial-pack-auction.jpg' }],
    brochures: ['https://example.com/dle-commercial-pack-auction.pdf'],
    monthlyLevyFrom: 1_350,
    ratesFrom: 900,
    unitTypes: [
      {
        id: `pack-auction-${suffix}`.slice(0, 36),
        name: `Commercial Pack Auction Lot ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 82,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        auctionStatus: 'registration_open',
        totalUnits: 2,
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
    slug: String(created.slug),
    name: String(created.name),
  };
}

test.describe.serial('DLE public detail commercial pack browser proof', () => {
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

  test('shows Rental and Auction commercial packs on the public development detail page', async ({
    page,
  }) => {
    const suffix = `${Date.now()}`.slice(-8);
    const tracker = {
      userIds: createdUserIds,
      developerIds: createdDeveloperIds,
      developmentIds: createdDevelopmentIds,
    };

    const rental = await seedRentalDevelopment(suffix, tracker);
    await page.goto(`/development/${rental.slug}`);
    await expect(page.getByRole('heading', { name: rental.name })).toBeVisible({ timeout: 15_000 });

    const rentalPack = page.locator('#commercial-pack');
    await expect(rentalPack).toBeVisible();
    await expect(rentalPack.getByText('Rental Pack', { exact: true }).first()).toBeVisible();
    await expect(rentalPack.getByText('Lease path at a glance')).toBeVisible();
    await expect(rentalPack.getByText('Rent From R 12 500 - R 14 500')).toBeVisible();
    await expect(rentalPack.getByText('4 of 6 rentals available')).toBeVisible();
    await expect(rentalPack.getByText(/deposit from R\s*25\s*000/i)).toBeVisible();
    await expect(rentalPack.getByText('Pack available')).toBeVisible();
    await expect(rentalPack.getByRole('button', { name: 'Check Rental Fit' })).toBeVisible();
    await expect(rentalPack.getByRole('button', { name: 'Download Rental Pack' })).toBeVisible();

    const auction = await seedAuctionDevelopment(suffix, tracker);
    await page.goto(`/development/${auction.slug}`);
    await expect(page.getByRole('heading', { name: auction.name })).toBeVisible({ timeout: 15_000 });

    const auctionPack = page.locator('#commercial-pack');
    await expect(auctionPack).toBeVisible();
    await expect(auctionPack.getByText('Auction Pack', { exact: true }).first()).toBeVisible();
    await expect(auctionPack.getByText('Bidder path at a glance')).toBeVisible();
    await expect(auctionPack.getByText('Starting Bid R 850 000 - R 950 000')).toBeVisible();
    await expect(auctionPack.getByText(/Registration Open.*reserve guidance from R\s*950\s*000/i)).toBeVisible();
    await expect(auctionPack.getByText('1 of 2 lots open')).toBeVisible();
    await expect(auctionPack.getByText('Pack available')).toBeVisible();
    await expect(auctionPack.getByRole('button', { name: 'Check Bidder Readiness' })).toBeVisible();
    await expect(auctionPack.getByRole('button', { name: 'Download Auction Pack' })).toBeVisible();
  });
});

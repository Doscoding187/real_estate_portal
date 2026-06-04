import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import {
  developers,
  developmentOperatingEvents,
  developments,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type Lane = 'sale' | 'rental' | 'auction';

type SeededDevelopment = {
  id: number;
  name: string;
  unitTypeId: string;
};

type Seed = {
  userId: number;
  developerId: number;
  email: string;
  developments: Record<Lane, SeededDevelopment>;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Failed Operating Mutation QA`,
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

async function publishAndApprove(id: number, userId: number) {
  await developmentService.publishDevelopment(id, userId);
  await developmentService.approveDevelopment(id, 1);
}

async function seedFailedMutationDevelopments(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-operating-failure-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Operating',
    lastName: 'Failure',
    name: 'Operating Failure Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Operating Failure Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const saleUnitTypeId = `fail-sale-${suffix}`.slice(0, 36);
  const sale = await developmentService.createDevelopment(userId, {
    name: `DLE Failed Sale Mutation ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '70 Failed Sale Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Failed Sale Proof',
    status: 'selling',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Sale failed mutation proof package with enough market-ready detail to satisfy publish validation.',
    highlights: ['Reserve path ready', 'No false success', 'Inventory truth refreshed'],
    images: [{ url: 'https://example.com/dle-failed-sale.jpg' }],
    priceFrom: 1_250_000,
    priceTo: 1_450_000,
    unitTypes: [
      {
        id: saleUnitTypeId,
        name: `Failed Sale Unit ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_250_000,
        basePriceTo: 1_450_000,
        totalUnits: 1,
        availableUnits: 1,
        reservedUnits: 0,
      },
    ],
  } as any);

  const rentalUnitTypeId = `fail-rental-${suffix}`.slice(0, 36);
  const rental = await developmentService.createDevelopment(userId, {
    name: `DLE Failed Rental Mutation ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '80 Failed Rental Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Failed Rental Proof',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Rental failed mutation proof package with enough lease-ready detail to satisfy publish validation.',
    highlights: ['Hold path ready', 'No false success', 'Leasing truth refreshed'],
    images: [{ url: 'https://example.com/dle-failed-rental.jpg' }],
    monthlyRentFrom: 12_500,
    monthlyRentTo: 13_500,
    unitTypes: [
      {
        id: rentalUnitTypeId,
        name: `Failed Rental Unit ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 13_500,
        depositRequired: 25_000,
        leaseTerm: '12 months',
        isFurnished: false,
        totalUnits: 1,
        availableUnits: 1,
        reservedUnits: 0,
      },
    ],
  } as any);

  const auctionUnitTypeId = `fail-auction-${suffix}`.slice(0, 36);
  const auction = await developmentService.createDevelopment(userId, {
    name: `DLE Failed Auction Mutation ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '90 Failed Auction Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Failed Auction Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description:
      'Auction failed mutation proof package with enough bidder-ready detail to satisfy publish validation.',
    highlights: ['Registration path ready', 'No false success', 'Auction truth refreshed'],
    images: [{ url: 'https://example.com/dle-failed-auction.jpg' }],
    startingBidFrom: 850_000,
    reservePriceFrom: 950_000,
    auctionStartDate: '2030-02-01T09:00:00.000Z',
    auctionEndDate: '2030-02-08T17:00:00.000Z',
    unitTypes: [
      {
        id: auctionUnitTypeId,
        name: `Failed Auction Lot ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        auctionStatus: 'scheduled',
        totalUnits: 1,
        availableUnits: 1,
        reservedUnits: 0,
      },
    ],
  } as any);

  await publishAndApprove(Number(sale.id), userId);
  await publishAndApprove(Number(rental.id), userId);
  await publishAndApprove(Number(auction.id), userId);

  return {
    userId,
    developerId,
    email,
    developments: {
      sale: {
        id: Number(sale.id),
        name: String(sale.name),
        unitTypeId: saleUnitTypeId,
      },
      rental: {
        id: Number(rental.id),
        name: String(rental.name),
        unitTypeId: rentalUnitTypeId,
      },
      auction: {
        id: Number(auction.id),
        name: String(auction.name),
        unitTypeId: auctionUnitTypeId,
      },
    },
  };
}

async function selectDevelopment(page: Page, developmentName: string) {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: developmentName }).click();
  await expect(page.getByText(`snapshot for ${developmentName}.`)).toBeVisible({
    timeout: 15_000,
  });
}

async function expectNoOperatingEvents(developmentId: number) {
  const db = await getDb();
  const events = await db!
    .select()
    .from(developmentOperatingEvents)
    .where(eq(developmentOperatingEvents.developmentId, developmentId));
  expect(events).toHaveLength(0);
}

test.describe.serial('DLE operating failed mutation browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    const developmentIds = Object.values(seed.developments).map(development => development.id);
    await db.delete(developmentOperatingEvents).where(
      inArray(developmentOperatingEvents.developmentId, developmentIds),
    );
    await db.delete(developments).where(inArray(developments.id, developmentIds));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('shows failure, refreshes truth, and records no false operating events', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedFailedMutationDevelopments(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });

    const sale = seed.developments.sale;
    await selectDevelopment(page, sale.name);
    await expect(page.getByText('1 available, 0 reserved')).toBeVisible();
    await db!
      .update(unitTypes)
      .set({ availableUnits: 0, reservedUnits: 0 })
      .where(eq(unitTypes.id, sale.unitTypeId));
    await db!.update(developments).set({ availableUnits: 0 }).where(eq(developments.id, sale.id));

    await page.getByRole('button', { name: 'Reserve', exact: true }).click();
    await expect(page.getByText('No available units can be reserved for this unit type.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Unit reserved.')).toHaveCount(0);
    await expect(page.getByText('0 available, 0 reserved')).toBeVisible({ timeout: 15_000 });
    await expectNoOperatingEvents(sale.id);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-operating-failed-sale-no-false-success.png`,
    });

    const rental = seed.developments.rental;
    await selectDevelopment(page, rental.name);
    await expect(page.getByText('1 rentals available, 0 held')).toBeVisible();
    await db!
      .update(unitTypes)
      .set({ availableUnits: 0, reservedUnits: 0 })
      .where(eq(unitTypes.id, rental.unitTypeId));
    await db!
      .update(developments)
      .set({ availableUnits: 0 })
      .where(eq(developments.id, rental.id));

    await page.getByRole('button', { name: 'Hold', exact: true }).click();
    await expect(
      page.getByText('No available rental units can be held for this unit type.'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rental unit held.')).toHaveCount(0);
    await expect(page.getByText('0 rentals available, 0 held')).toBeVisible({ timeout: 15_000 });
    await expectNoOperatingEvents(rental.id);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-operating-failed-rental-no-false-success.png`,
    });

    const auction = seed.developments.auction;
    await selectDevelopment(page, auction.name);
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible();
    await db!
      .update(unitTypes)
      .set({ auctionStatus: 'registration_open' })
      .where(eq(unitTypes.id, auction.unitTypeId));

    await page.getByRole('button', { name: 'Open Registration', exact: true }).click();
    await expect(
      page.getByText('Auction registration can only move from scheduled to registration open.'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Auction registration opened.')).toHaveCount(0);
    await expect(page.getByText('Registration open', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoOperatingEvents(auction.id);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-operating-failed-auction-no-false-success.png`,
    });
  });
});

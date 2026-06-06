import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-06';
fs.mkdirSync(evidenceDir, { recursive: true });

type Seed = {
  userId: number;
  developerId: number;
  email: string;
  rentalDevelopmentId: number;
  rentalDevelopmentName: string;
  auctionDevelopmentId: number;
  auctionDevelopmentName: string;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Pricing Health QA`,
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

async function seedPricingHealthDevelopments(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-pricing-health-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Pricing',
    lastName: 'Health',
    name: 'Pricing Health Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Pricing Health Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const rental = await developmentService.createDevelopment(userId, {
    name: `DLE Pricing Health Rental ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '88 Pricing Health Rental Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Pricing Health Rental Proof',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Rental pricing health browser proof keeps rent mirrors aligned.',
    highlights: ['Rent mirror aligned', 'Lease pack ready', 'Dashboard proof'],
    images: [{ url: 'https://example.com/dle-pricing-health-rental.jpg' }],
    monthlyRentFrom: 13_500,
    monthlyRentTo: 15_500,
    unitTypes: [
      {
        id: `pricing-rental-${suffix}`.slice(0, 36),
        name: `Pricing Health Rental Two Bed ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 76,
        monthlyRentFrom: 13_500,
        monthlyRentTo: 15_500,
        depositRequired: 27_000,
        leaseTerm: '12 months',
        isFurnished: true,
        totalUnits: 10,
        availableUnits: 6,
        reservedUnits: 1,
      },
    ],
  } as any);

  const auction = await developmentService.createDevelopment(userId, {
    name: `DLE Pricing Health Auction ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '98 Pricing Health Auction Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Pricing Health Auction Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Auction pricing health browser proof catches public bid mirror drift.',
    highlights: ['Bid mirror drift', 'Auction pack ready', 'Dashboard proof'],
    images: [{ url: 'https://example.com/dle-pricing-health-auction.jpg' }],
    startingBidFrom: 850_000,
    unitTypes: [
      {
        id: `pricing-auction-${suffix}`.slice(0, 36),
        name: `Pricing Health Auction Lot ${suffix}`,
        bedrooms: 3,
        bathrooms: 2,
        unitSize: 104,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-03-01 09:00:00',
        auctionEndDate: '2030-03-08 17:00:00',
        auctionStatus: 'registration_open',
        totalUnits: 2,
        availableUnits: 2,
        reservedUnits: 0,
      },
    ],
  } as any);

  await developmentService.publishDevelopment(Number(rental.id), userId);
  await developmentService.approveDevelopment(Number(rental.id), 1);
  await developmentService.publishDevelopment(Number(auction.id), userId);
  await developmentService.approveDevelopment(Number(auction.id), 1);

  await db!
    .update(developments)
    .set({ startingBidFrom: 800_000 } as any)
    .where(eq(developments.id, Number(auction.id)));

  return {
    userId,
    developerId,
    email,
    rentalDevelopmentId: Number(rental.id),
    rentalDevelopmentName: String(rental.name),
    auctionDevelopmentId: Number(auction.id),
    auctionDevelopmentName: String(auction.name),
  };
}

async function selectDevelopment(page: Page, developmentName: string) {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: developmentName }).click();
  await expect(page.getByText(`snapshot for ${developmentName}.`)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe.serial('DLE dashboard pricing health browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db
      .delete(developments)
      .where(inArray(developments.id, [seed.rentalDevelopmentId, seed.auctionDevelopmentId]));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('shows Rental aligned pricing health and Auction bid drift on the developer dashboard', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedPricingHealthDevelopments(suffix);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });

    await selectDevelopment(page, seed.rentalDevelopmentName);
    const rentalHealth = page.getByTestId('dle-pricing-health');
    await expect(rentalHealth.getByText('Rental pricing health')).toBeVisible({ timeout: 15_000 });
    await expect(rentalHealth.getByText('Aligned')).toBeVisible();
    await expect(rentalHealth.getByText('Public rent range')).toBeVisible();
    await expect(rentalHealth.getByText('Live unit rent range')).toBeVisible();
    await expect(rentalHealth.getByText('R13.5k - R15.5k / month')).toHaveCount(2);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-dashboard-rental-pricing-health.png`,
    });

    await selectDevelopment(page, seed.auctionDevelopmentName);
    const auctionHealth = page.getByTestId('dle-pricing-health');
    await expect(auctionHealth.getByText('Auction bid health')).toBeVisible({ timeout: 15_000 });
    await expect(auctionHealth.getByText('Review needed')).toBeVisible();
    await expect(auctionHealth.getByText('Public bid from')).toBeVisible();
    await expect(auctionHealth.getByText('Live lot bid from')).toBeVisible();
    await expect(auctionHealth.getByText('R800k')).toBeVisible();
    await expect(auctionHealth.getByText('R850k')).toBeVisible();
    await expect(auctionHealth.getByText('Review development bid mirrors')).toBeVisible();
    await expect(
      auctionHealth.getByRole('button', { name: 'Review Auction Bids' }),
    ).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-dashboard-auction-pricing-health.png`,
    });

    await auctionHealth.getByRole('button', { name: 'Review Auction Bids' }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `/developer/create-development\\?id=${seed.auctionDevelopmentId}&remediation=pricing`,
      ),
    );
    await expect(page.getByText('Pricing health review')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 2, name: 'Unit Types' })).toBeVisible();
  });
});

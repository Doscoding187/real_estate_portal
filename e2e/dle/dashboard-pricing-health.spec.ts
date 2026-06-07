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

const evidenceDir = 'docs/dle/evidence/2026-06-07';
fs.mkdirSync(evidenceDir, { recursive: true });

type Seed = {
  userId: number;
  developerId: number;
  email: string;
  saleDevelopmentId: number;
  saleDevelopmentName: string;
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

  const sale = await developmentService.createDevelopment(userId, {
    name: `DLE Pricing Health Sale ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '78 Pricing Health Sale Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Pricing Health Sale Proof',
    status: 'selling',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Sale pricing health browser proof catches public price mirror drift.',
    highlights: ['Price mirror drift', 'Sales pack ready', 'Dashboard proof'],
    images: [{ url: 'https://example.com/dle-pricing-health-sale.jpg' }],
    priceFrom: 1_200_000,
    priceTo: 1_650_000,
    unitTypes: [
      {
        id: `pricing-sale-${suffix}`.slice(0, 36),
        name: `Pricing Health Sale Two Bed ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 82,
        priceFrom: 1_200_000,
        priceTo: 1_650_000,
        totalUnits: 8,
        availableUnits: 5,
        reservedUnits: 1,
      },
    ],
  } as any);

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

  await developmentService.publishDevelopment(Number(sale.id), userId);
  await developmentService.approveDevelopment(Number(sale.id), 1);
  await developmentService.publishDevelopment(Number(rental.id), userId);
  await developmentService.approveDevelopment(Number(rental.id), 1);
  await developmentService.publishDevelopment(Number(auction.id), userId);
  await developmentService.approveDevelopment(Number(auction.id), 1);

  await db!
    .update(developments)
    .set({ priceFrom: 1_000_000, priceTo: 1_500_000 } as any)
    .where(eq(developments.id, Number(sale.id)));
  await db!
    .update(developments)
    .set({ monthlyRentFrom: 12_000, monthlyRentTo: 15_000 } as any)
    .where(eq(developments.id, Number(rental.id)));
  await db!
    .update(developments)
    .set({ startingBidFrom: 800_000 } as any)
    .where(eq(developments.id, Number(auction.id)));

  return {
    userId,
    developerId,
    email,
    saleDevelopmentId: Number(sale.id),
    saleDevelopmentName: String(sale.name),
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

async function correctPricingMirrors(seed: Seed) {
  await developmentService.updateDevelopment(seed.saleDevelopmentId, seed.userId, {
    priceFrom: 1_200_000,
    priceTo: 1_650_000,
  } as any);
  await developmentService.updateDevelopment(seed.rentalDevelopmentId, seed.userId, {
    monthlyRentFrom: 13_500,
    monthlyRentTo: 15_500,
  } as any);
  await developmentService.updateDevelopment(seed.auctionDevelopmentId, seed.userId, {
    startingBidFrom: 850_000,
  } as any);
}

test.describe.serial('DLE dashboard pricing health browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db
      .delete(developments)
      .where(
        inArray(developments.id, [
          seed.saleDevelopmentId,
          seed.rentalDevelopmentId,
          seed.auctionDevelopmentId,
        ]),
      );
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('shows Sale, Rental, and Auction pricing drift remediation on the developer dashboard', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedPricingHealthDevelopments(suffix);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });

    await selectDevelopment(page, seed.saleDevelopmentName);
    const saleHealth = page.getByTestId('dle-pricing-health');
    await expect(saleHealth.getByText('Sale pricing health')).toBeVisible({ timeout: 15_000 });
    await expect(saleHealth.getByText('Review needed')).toBeVisible();
    await expect(saleHealth.getByText('Public price band')).toBeVisible();
    await expect(saleHealth.getByText('Live unit price band')).toBeVisible();
    await expect(saleHealth.getByText('R1M - R1.5M')).toBeVisible();
    await expect(saleHealth.getByText('R1.2M - R1.7M')).toBeVisible();
    await expect(saleHealth.getByRole('button', { name: 'Review Sale Pricing' })).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-dashboard-sale-pricing-health.png`,
    });

    await saleHealth.getByRole('button', { name: 'Review Sale Pricing' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/developer/create-development\\?id=${seed.saleDevelopmentId}&remediation=pricing`),
    );
    await expect(page.getByText('Pricing health review')).toBeVisible({ timeout: 15_000 });
    const saleRepairHints = page.getByTestId('unit-pricing-repair-hints');
    await expect(saleRepairHints.getByText('Sale price repair fields')).toBeVisible();
    await expect(saleRepairHints.getByText('Public price band', { exact: true })).toBeVisible();
    await expect(saleRepairHints.getByText('Live unit price band', { exact: true })).toBeVisible();
    await expect(saleRepairHints.getByText('R 1 000 000 - R 1 500 000')).toBeVisible();
    await expect(saleRepairHints.getByText('R 1 200 000 - R 1 650 000')).toBeVisible();
    await expect(saleRepairHints.getByText('Rows to review')).toBeVisible();
    await expect(
      saleRepairHints.getByText(new RegExp(`Pricing Health Sale Two Bed ${suffix}`)),
    ).toBeVisible();
    await expect(
      page.getByText('Pricing attention: Sets live price from, Sets live price to'),
    ).toBeVisible();

    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.rentalDevelopmentName);
    const rentalHealth = page.getByTestId('dle-pricing-health');
    await expect(rentalHealth.getByText('Rental pricing health')).toBeVisible({ timeout: 15_000 });
    await expect(rentalHealth.getByText('Review needed')).toBeVisible();
    await expect(rentalHealth.getByText('Public rent range')).toBeVisible();
    await expect(rentalHealth.getByText('Live unit rent range')).toBeVisible();
    await expect(rentalHealth.getByText('R12k - R15k / month')).toBeVisible();
    await expect(rentalHealth.getByText('R13.5k - R15.5k / month')).toBeVisible();
    await expect(
      rentalHealth.getByRole('button', { name: 'Review Rental Pricing' }),
    ).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-dashboard-rental-pricing-health.png`,
    });

    await rentalHealth.getByRole('button', { name: 'Review Rental Pricing' }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `/developer/create-development\\?id=${seed.rentalDevelopmentId}&remediation=pricing`,
      ),
    );
    await expect(page.getByText('Pricing health review')).toBeVisible({ timeout: 15_000 });
    const rentalRepairHints = page.getByTestId('unit-pricing-repair-hints');
    await expect(rentalRepairHints.getByText('Rental rent repair fields')).toBeVisible();
    await expect(rentalRepairHints.getByText('Public rent range', { exact: true })).toBeVisible();
    await expect(rentalRepairHints.getByText('Live unit rent range', { exact: true })).toBeVisible();
    await expect(rentalRepairHints.getByText('R 12 000 - R 15 000 / month')).toBeVisible();
    await expect(rentalRepairHints.getByText('R 13 500 - R 15 500 / month')).toBeVisible();
    await expect(rentalRepairHints.getByText('Rows to review')).toBeVisible();
    await expect(
      rentalRepairHints.getByText(new RegExp(`Pricing Health Rental Two Bed ${suffix}`)),
    ).toBeVisible();
    await expect(
      page.getByText('Pricing attention: Sets live rent from, Sets live rent to'),
    ).toBeVisible();

    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
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
    const repairHints = page.getByTestId('unit-pricing-repair-hints');
    await expect(repairHints.getByText('Auction bid repair fields')).toBeVisible();
    await expect(repairHints.getByText('Starting bid', { exact: true })).toBeVisible();
    await expect(repairHints.getByText('Reserve price', { exact: true })).toBeVisible();
    await expect(repairHints.getByText('Auction window', { exact: true })).toBeVisible();
    await expect(repairHints.getByText('Public bid from', { exact: true })).toBeVisible();
    await expect(repairHints.getByText('Live lot bid from', { exact: true })).toBeVisible();
    await expect(repairHints.getByText('R 800 000')).toBeVisible();
    await expect(repairHints.getByText('R 850 000')).toHaveCount(2);
    await expect(repairHints.getByText('Rows to review')).toBeVisible();
    await expect(
      repairHints.getByText(new RegExp(`Pricing Health Auction Lot ${suffix}`)),
    ).toBeVisible();
    await expect(page.getByText('Pricing attention: Sets live bid from')).toBeVisible();

    await correctPricingMirrors(seed);

    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.saleDevelopmentName);
    const alignedSaleHealth = page.getByTestId('dle-pricing-health');
    await expect(alignedSaleHealth.getByText('Sale pricing health')).toBeVisible({
      timeout: 15_000,
    });
    await expect(alignedSaleHealth.getByText('Aligned')).toBeVisible();
    await expect(alignedSaleHealth.getByText('R1.2M - R1.7M')).toHaveCount(2);

    await selectDevelopment(page, seed.rentalDevelopmentName);
    const alignedRentalHealth = page.getByTestId('dle-pricing-health');
    await expect(alignedRentalHealth.getByText('Rental pricing health')).toBeVisible({
      timeout: 15_000,
    });
    await expect(alignedRentalHealth.getByText('Aligned')).toBeVisible();
    await expect(alignedRentalHealth.getByText('R13.5k - R15.5k / month')).toHaveCount(2);

    await selectDevelopment(page, seed.auctionDevelopmentName);
    const alignedAuctionHealth = page.getByTestId('dle-pricing-health');
    await expect(alignedAuctionHealth.getByText('Auction bid health')).toBeVisible({
      timeout: 15_000,
    });
    await expect(alignedAuctionHealth.getByText('Aligned')).toBeVisible();
    await expect(alignedAuctionHealth.getByText('R850k')).toHaveCount(2);
  });
});

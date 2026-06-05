import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { desc, eq } from 'drizzle-orm';

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

type Seed = {
  userId: number;
  developerId: number;
  developmentId: number;
  developmentName: string;
  developmentSlug: string;
  developmentCity: string;
  email: string;
  soldLotId: string;
  passedLotId: string;
  withdrawnLotId: string;
  soldLotName: string;
  passedLotName: string;
  withdrawnLotName: string;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toMysqlDateTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Auction Outcome QA`,
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

async function seedAuctionOutcomeDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-auction-outcome-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Auction',
    lastName: 'Outcome',
    name: 'Auction Outcome Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Auction Outcome Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const futureStart = toMysqlDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const futureEnd = toMysqlDateTime(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const developmentCity = `auction outcome city ${suffix}`;
  const soldLotId = `auction-sold-${suffix}`.slice(0, 36);
  const passedLotId = `auction-passed-${suffix}`.slice(0, 36);
  const withdrawnLotId = `auction-withdraw-${suffix}`.slice(0, 36);
  const soldLotName = `Auction Sold Lot ${suffix}`;
  const passedLotName = `Auction Passed Lot ${suffix}`;
  const withdrawnLotName = `Auction Withdrawn Lot ${suffix}`;
  const commonUnit = {
    bedrooms: 2,
    bathrooms: 2,
    unitSize: 82,
    startingBid: 850_000,
    reservePrice: 950_000,
    auctionStartDate: futureStart,
    auctionEndDate: futureEnd,
    totalUnits: 1,
    availableUnits: 1,
    reservedUnits: 0,
    parkingType: 'garage',
    parkingBays: 2,
  };

  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Auction Outcome ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '110 Auction Outcome Road',
    city: developmentCity,
    province: 'Gauteng',
    suburb: 'Auction Outcome Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Auction outcome browser proof keeps lot packaging fields stable.',
    highlights: ['Outcome audit ready', 'Legal pack intact', 'Auction language preserved'],
    images: [{ url: 'https://example.com/dle-auction-outcome-hero.jpg' }],
    brochures: ['https://example.com/dle-auction-outcome-legal-pack.pdf'],
    monthlyLevyFrom: 1_350,
    ratesFrom: 900,
    unitTypes: [
      {
        ...commonUnit,
        id: soldLotId,
        name: soldLotName,
        auctionStatus: 'active',
      },
      {
        ...commonUnit,
        id: passedLotId,
        name: passedLotName,
        startingBid: 910_000,
        reservePrice: 1_050_000,
        auctionStatus: 'active',
      },
      {
        ...commonUnit,
        id: withdrawnLotId,
        name: withdrawnLotName,
        startingBid: 780_000,
        reservePrice: 900_000,
        auctionStatus: 'registration_open',
      },
    ],
  } as any);

  await developmentService.publishDevelopment(Number(created.id), userId);
  await developmentService.approveDevelopment(Number(created.id), 1);

  return {
    userId,
    developerId,
    developmentId: Number(created.id),
    developmentName: String(created.name),
    developmentSlug: String(created.slug),
    developmentCity,
    email,
    soldLotId,
    passedLotId,
    withdrawnLotId,
    soldLotName,
    passedLotName,
    withdrawnLotName,
  };
}

async function selectDevelopment(page: Page, developmentName: string) {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: developmentName }).click();
  await expect(page.getByText(`snapshot for ${developmentName}.`)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe.serial('DLE Auction operating outcome browser proof', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    await db
      .delete(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId));
    await db.delete(developments).where(eq(developments.id, seed.developmentId));
    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('records sold, passed-in, and withdrawn Auction outcomes without wiping packaging', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedAuctionOutcomeDevelopment(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);
    const beforeUnits = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, seed.developmentId));

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.developmentName);
    await expect(page.getByText('Auction Lots')).toBeVisible();

    await page
      .getByRole('button', { name: `Mark ${seed.soldLotName} sold`, exact: true })
      .click();
    await expect(page.getByText('Auction lot marked sold.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Sold at auction', { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole('button', { name: `Mark ${seed.passedLotName} passed in`, exact: true })
      .click();
    await expect(page.getByText('Auction lot marked passed in.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Passed in', { exact: true })).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole('button', { name: `Withdraw ${seed.withdrawnLotName}`, exact: true })
      .click();
    await expect(page.getByText('Auction lot withdrawn.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Withdrawn', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-outcomes-dashboard.png`,
    });

    const afterUnits = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, seed.developmentId));
    const unitsById = new Map(afterUnits.map(unit => [unit.id, unit]));
    expect(unitsById.get(seed.soldLotId)?.auctionStatus).toBe('sold');
    expect(unitsById.get(seed.passedLotId)?.auctionStatus).toBe('passed_in');
    expect(unitsById.get(seed.withdrawnLotId)?.auctionStatus).toBe('withdrawn');
    for (const beforeUnit of beforeUnits) {
      const afterUnit = unitsById.get(beforeUnit.id);
      expect(afterUnit).toBeTruthy();
      expect(afterUnit?.availableUnits).toBe(beforeUnit.availableUnits);
      expect(afterUnit?.reservedUnits).toBe(beforeUnit.reservedUnits);
      expect(afterUnit?.startingBid).toBe(beforeUnit.startingBid);
      expect(afterUnit?.reservePrice).toBe(beforeUnit.reservePrice);
      expect(afterUnit?.auctionStartDate).toBe(beforeUnit.auctionStartDate);
      expect(afterUnit?.auctionEndDate).toBe(beforeUnit.auctionEndDate);
      expect(afterUnit?.unitSize).toBe(beforeUnit.unitSize);
      expect(afterUnit?.parkingType).toBe(beforeUnit.parkingType);
      expect(afterUnit?.parkingBays).toBe(beforeUnit.parkingBays);
    }

    const events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(3);
    const [withdrawnEvent, passedEvent, soldEvent] = events;
    expect(soldEvent.eventType).toBe('auction_outcome_recorded');
    expect(soldEvent.transactionType).toBe('auction');
    expect(soldEvent.unitTypeId).toBe(seed.soldLotId);
    expect(soldEvent.fromStatus).toBe('active');
    expect(soldEvent.toStatus).toBe('sold');
    expect(soldEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(soldEvent.metadata).outcome).toBe('sold');

    expect(passedEvent.eventType).toBe('auction_outcome_recorded');
    expect(passedEvent.unitTypeId).toBe(seed.passedLotId);
    expect(passedEvent.fromStatus).toBe('active');
    expect(passedEvent.toStatus).toBe('passed_in');
    expect(passedEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(passedEvent.metadata).outcome).toBe('passed_in');

    expect(withdrawnEvent.eventType).toBe('auction_outcome_recorded');
    expect(withdrawnEvent.unitTypeId).toBe(seed.withdrawnLotId);
    expect(withdrawnEvent.fromStatus).toBe('registration_open');
    expect(withdrawnEvent.toStatus).toBe('withdrawn');
    expect(withdrawnEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(withdrawnEvent.metadata).outcome).toBe('withdrawn');

    const [afterDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);
    expect(afterDevelopment.availableUnits).toBe(beforeDevelopment.availableUnits);
    expect(afterDevelopment.name).toBe(beforeDevelopment.name);
    expect(afterDevelopment.address).toBe(beforeDevelopment.address);
    expect(afterDevelopment.city).toBe(beforeDevelopment.city);
    expect(afterDevelopment.province).toBe(beforeDevelopment.province);
    expect(afterDevelopment.suburb).toBe(beforeDevelopment.suburb);
    expect(afterDevelopment.description).toBe(beforeDevelopment.description);
    expect(afterDevelopment.transactionType).toBe('auction');
    expect(afterDevelopment.startingBidFrom).toBe(beforeDevelopment.startingBidFrom);
    expect(afterDevelopment.reservePriceFrom).toBe(beforeDevelopment.reservePriceFrom);
    expect(afterDevelopment.ownershipType).toBe(beforeDevelopment.ownershipType);
    expect(parseJsonArray(afterDevelopment.images)).toEqual(parseJsonArray(beforeDevelopment.images));
    expect(parseJsonArray(afterDevelopment.highlights)).toEqual(
      parseJsonArray(beforeDevelopment.highlights),
    );
    expect(parseJsonArray(afterDevelopment.brochures)).toEqual(
      parseJsonArray(beforeDevelopment.brochures),
    );

    await page.goto(`/development/${seed.developmentSlug}`);
    await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Sold at auction').first()).toBeVisible();
    await expect(page.getByText('Passed in').first()).toBeVisible();
    await expect(page.getByText('Withdrawn').first()).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-outcomes-public.png`,
    });

    await page.goto(
      `/property-for-sale?listingType=auction&city=${encodeURIComponent(seed.developmentCity)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(seed.soldLotName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bid from R 850,000')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-outcomes-search.png`,
    });
  });
});

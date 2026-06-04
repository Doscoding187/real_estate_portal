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
  unitTypeId: string;
  unitTypeName: string;
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
    `${seed.email} DLE Auction Activation QA`,
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

async function seedAuctionDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-auction-activation-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Auction',
    lastName: 'Activation',
    name: 'Auction Activation Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Auction Activation Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const futureStart = toMysqlDateTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
  const futureEnd = toMysqlDateTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const developmentCity = `auction activation city ${suffix}`;
  const unitTypeId = `auction-activate-${suffix}`.slice(0, 36);
  const unitTypeName = `Auction Activation Lot ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Auction Activation ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '100 Auction Activation Road',
    city: developmentCity,
    province: 'Gauteng',
    suburb: 'Auction Activation Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Auction activation browser proof keeps lot packaging fields stable.',
    highlights: ['Legal pack ready', 'Activation guarded', 'Timed bidding'],
    images: [{ url: 'https://example.com/dle-auction-activation-hero.jpg' }],
    brochures: ['https://example.com/dle-auction-activation-legal-pack.pdf'],
    monthlyLevyFrom: 1_350,
    ratesFrom: 900,
    unitTypes: [
      {
        id: unitTypeId,
        name: unitTypeName,
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 82,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: futureStart,
        auctionEndDate: futureEnd,
        auctionStatus: 'scheduled',
        totalUnits: 3,
        availableUnits: 2,
        reservedUnits: 0,
        parkingType: 'garage',
        parkingBays: 2,
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
    unitTypeId,
    unitTypeName,
  };
}

async function selectDevelopment(page: Page, developmentName: string) {
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: developmentName }).click();
  await expect(page.getByText(`snapshot for ${developmentName}.`)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe.serial('DLE Auction activation browser proof', () => {
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

  test('rejects early activation and activates only inside the auction window', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedAuctionDevelopment(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);
    const [beforeUnit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.developmentName);
    await expect(page.getByText('Auction Lots')).toBeVisible();
    await expect(page.getByText(seed.unitTypeName)).toBeVisible();
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Open Registration', exact: true }).click();
    await expect(page.getByText('Auction registration opened.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Registration open', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Activate Auction', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Activate Auction', exact: true }).click();
    await expect(
      page.getByText('Auction activation can only start at or after the auction start time.'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Auction lot activated.')).toHaveCount(0);
    await expect(page.getByText('Registration open', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-activation-early-failed.png`,
    });

    let [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(unit.auctionStatus).toBe('registration_open');
    expect(Number(unit.availableUnits)).toBe(2);
    expect(Number(unit.reservedUnits)).toBe(0);

    let events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('registration_status_changed');

    const inWindowStart = toMysqlDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const inWindowEnd = toMysqlDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
    await db!
      .update(unitTypes)
      .set({
        auctionStartDate: inWindowStart,
        auctionEndDate: inWindowEnd,
      })
      .where(eq(unitTypes.id, seed.unitTypeId));

    const [preActivationUnit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);

    await page.getByRole('button', { name: 'Activate Auction', exact: true }).click();
    await expect(page.getByText('Auction lot activated.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Auction active', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Activate Auction', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close Registration', exact: true })).toHaveCount(0);
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-activation-active.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(unit.auctionStatus).toBe('active');
    expect(Number(unit.availableUnits)).toBe(2);
    expect(Number(unit.reservedUnits)).toBe(0);

    events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(2);
    const [activationEvent, registrationEvent] = events;
    expect(registrationEvent.eventType).toBe('registration_status_changed');
    expect(activationEvent.eventType).toBe('inventory_status_changed');
    expect(activationEvent.transactionType).toBe('auction');
    expect(activationEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(activationEvent.fromStatus).toBe('registration_open');
    expect(activationEvent.toStatus).toBe('active');
    expect(activationEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(activationEvent.metadata).transition).toBe('activate');
    expect(parseJsonObject(activationEvent.beforeData).auctionStatus).toBe('registration_open');
    expect(parseJsonObject(activationEvent.afterData).auctionStatus).toBe('active');

    const [afterDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);
    const [afterUnit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
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

    expect(afterUnit.name).toBe(beforeUnit.name);
    expect(afterUnit.totalUnits).toBe(beforeUnit.totalUnits);
    expect(afterUnit.availableUnits).toBe(beforeUnit.availableUnits);
    expect(afterUnit.reservedUnits).toBe(beforeUnit.reservedUnits);
    expect(afterUnit.startingBid).toBe(beforeUnit.startingBid);
    expect(afterUnit.reservePrice).toBe(beforeUnit.reservePrice);
    expect(afterUnit.auctionStartDate).toBe(preActivationUnit.auctionStartDate);
    expect(afterUnit.auctionEndDate).toBe(preActivationUnit.auctionEndDate);
    expect(afterUnit.unitSize).toBe(beforeUnit.unitSize);
    expect(afterUnit.parkingType).toBe(beforeUnit.parkingType);
    expect(afterUnit.parkingBays).toBe(beforeUnit.parkingBays);

    await page.goto(`/development/${seed.developmentSlug}`);
    await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Starting Bid').first()).toBeVisible();
    await expect(page.getByText('Auction active', { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-activation-public-active.png`,
    });

    await page.goto(
      `/property-for-sale?listingType=auction&city=${encodeURIComponent(seed.developmentCity)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(seed.unitTypeName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bid from R 850,000')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-activation-search-language.png`,
    });
  });
});

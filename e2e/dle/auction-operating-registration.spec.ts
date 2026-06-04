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

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Auction Registration QA`,
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

  const email = `dle-auction-registration-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Auction',
    lastName: 'Registration',
    name: 'Auction Registration Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Auction Registration Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const developmentCity = `auction operating city ${suffix}`;
  const unitTypeId = `auction-register-${suffix}`.slice(0, 36);
  const unitTypeName = `Auction Registration Lot ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Auction Registration ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '60 Auction Registration Road',
    city: developmentCity,
    province: 'Gauteng',
    suburb: 'Auction Registration Proof',
    status: 'launching-soon',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Auction registration browser proof keeps lot packaging fields stable.',
    highlights: ['Legal pack ready', 'Registration opening', 'Timed bidding'],
    images: [{ url: 'https://example.com/dle-auction-registration-hero.jpg' }],
    brochures: ['https://example.com/dle-auction-registration-legal-pack.pdf'],
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
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
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

test.describe.serial('DLE Auction registration lifecycle browser proof', () => {
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

  test('opens and closes registration without count or Auction package drift', async ({ page }) => {
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
    await expect(page.getByText('Sales Inventory')).toHaveCount(0);
    await expect(page.getByText('Rental Inventory')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reserve', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hold', exact: true })).toHaveCount(0);
    await expect(page.getByText(seed.unitTypeName)).toBeVisible();
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible();
    await expect(page.getByText('Starting bid R850k', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Open Registration', exact: true }).click();
    await expect(page.getByText('Auction registration opened.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Registration open', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('registration status changed')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-registration-open.png`,
    });

    let [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(unit.auctionStatus).toBe('registration_open');
    expect(Number(unit.availableUnits)).toBe(2);
    expect(Number(unit.reservedUnits)).toBe(0);

    await page.goto(`/development/${seed.developmentSlug}`);
    await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Starting Bid').first()).toBeVisible();
    await expect(page.getByText('Registration open', { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-public-registration.png`,
    });

    await page.goto(
      `/property-for-sale?listingType=auction&city=${encodeURIComponent(seed.developmentCity)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(seed.unitTypeName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Bid from R 850,000')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-search-language.png`,
    });

    await page.goto('/developer/dashboard');
    await selectDevelopment(page, seed.developmentName);
    await page.getByRole('button', { name: 'Close Registration', exact: true }).click();
    await expect(page.getByText('Auction registration closed.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-auction-operating-registration-closed.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(unit.auctionStatus).toBe('scheduled');
    expect(Number(unit.availableUnits)).toBe(2);
    expect(Number(unit.reservedUnits)).toBe(0);

    const events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(2);
    const [closeEvent, openEvent] = events;
    expect(openEvent.eventType).toBe('registration_status_changed');
    expect(openEvent.transactionType).toBe('auction');
    expect(openEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(openEvent.fromStatus).toBe('scheduled');
    expect(openEvent.toStatus).toBe('registration_open');
    expect(openEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(openEvent.metadata).transition).toBe('open_registration');
    expect(parseJsonObject(openEvent.beforeData).auctionStatus).toBe('scheduled');
    expect(parseJsonObject(openEvent.afterData).auctionStatus).toBe('registration_open');

    expect(closeEvent.eventType).toBe('registration_status_changed');
    expect(closeEvent.transactionType).toBe('auction');
    expect(closeEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(closeEvent.fromStatus).toBe('registration_open');
    expect(closeEvent.toStatus).toBe('scheduled');
    expect(closeEvent.quantityDelta).toBeNull();
    expect(parseJsonObject(closeEvent.metadata).transition).toBe('close_registration');

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
    expect(afterDevelopment.auctionStartDate).toBe(beforeDevelopment.auctionStartDate);
    expect(afterDevelopment.auctionEndDate).toBe(beforeDevelopment.auctionEndDate);
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
    expect(afterUnit.auctionStartDate).toBe(beforeUnit.auctionStartDate);
    expect(afterUnit.auctionEndDate).toBe(beforeUnit.auctionEndDate);
    expect(afterUnit.unitSize).toBe(beforeUnit.unitSize);
    expect(afterUnit.parkingType).toBe(beforeUnit.parkingType);
    expect(afterUnit.parkingBays).toBe(beforeUnit.parkingBays);
  });
});

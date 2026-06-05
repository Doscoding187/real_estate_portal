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
    `${seed.email} DLE Sale Reservation QA`,
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

async function seedSaleDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-sale-reservation-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Sale',
    lastName: 'Reservation',
    name: 'Sale Reservation Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Sale Reservation Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const unitTypeId = `sale-reserve-${suffix}`.slice(0, 36);
  const unitTypeName = `Sale Reservation Two Bed ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Sale Reservation ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '40 Sale Reservation Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Sale Reservation Proof',
    status: 'selling',
    description: 'Sale reservation browser proof keeps packaging fields stable.',
    highlights: ['Reservation ready', 'Buyer callback queue', 'Transfer guidance'],
    images: [{ url: 'https://example.com/dle-sale-reservation-hero.jpg' }],
    videos: ['https://example.com/dle-sale-reservation-video.mp4'],
    brochures: ['https://example.com/dle-sale-reservation-brochure.pdf'],
    priceFrom: 1_250_000,
    priceTo: 1_550_000,
    unitTypes: [
      {
        id: unitTypeId,
        name: unitTypeName,
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_250_000,
        basePriceTo: 1_550_000,
        totalUnits: 12,
        availableUnits: 8,
        reservedUnits: 2,
        parkingType: 'covered',
        parkingBays: 1,
      },
    ],
  } as any);

  return {
    userId,
    developerId,
    developmentId: Number(created.id),
    developmentName: String(created.name),
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

test.describe.serial('DLE Sale operating reservation browser proof', () => {
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

  test('reserves and releases Sale unit inventory without wiping packaging fields', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedSaleDevelopment(suffix);
    const db = await getDb();
    expect(db).toBeTruthy();

    const [beforeDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });
    await selectDevelopment(page, seed.developmentName);
    await expect(page.getByText(seed.unitTypeName)).toBeVisible();
    await expect(page.getByText('8 available, 2 reserved, 2 sold')).toBeVisible();

    await page.getByRole('button', { name: 'Reserve' }).click();
    await expect(page.getByText('Unit reserved.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('7 available, 3 reserved, 2 sold')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('inventory status changed')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-sale-operating-reserve.png`,
    });

    let [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(7);
    expect(Number(unit.reservedUnits)).toBe(3);
    expect(Number(unit.soldUnits)).toBe(2);

    await page.getByRole('button', { name: 'Mark Sold' }).click();
    await expect(page.getByText('Sale unit marked sold.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('7 available, 2 reserved, 3 sold')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-sale-operating-sold.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(7);
    expect(Number(unit.reservedUnits)).toBe(2);
    expect(Number(unit.soldUnits)).toBe(3);

    await page.getByRole('button', { name: 'Release' }).click();
    await expect(page.getByText('Reservation released.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('8 available, 1 reserved, 3 sold')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-sale-operating-release.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(8);
    expect(Number(unit.reservedUnits)).toBe(1);
    expect(Number(unit.soldUnits)).toBe(3);

    await page.getByRole('button', { name: 'Direct Sold' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm Direct Sale' })).toBeVisible();
    await expect(page.getByText('reduces public availability')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Direct Sold' }).click();
    await expect(page.getByText('Available Sale unit marked sold.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('7 available, 1 reserved, 4 sold')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-sale-operating-direct-sold.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(7);
    expect(Number(unit.reservedUnits)).toBe(1);
    expect(Number(unit.soldUnits)).toBe(4);

    const events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(4);
    const [directSoldEvent, releaseEvent, soldEvent, reserveEvent] = events;
    expect(reserveEvent.eventType).toBe('inventory_status_changed');
    expect(reserveEvent.transactionType).toBe('for_sale');
    expect(reserveEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(reserveEvent.fromStatus).toBe('available');
    expect(reserveEvent.toStatus).toBe('reserved');
    expect(Number(reserveEvent.quantityDelta)).toBe(-1);
    expect(parseJsonObject(reserveEvent.metadata).transition).toBe('reserve');
    expect(parseJsonObject(reserveEvent.beforeData).availableUnits).toBe(8);
    expect(parseJsonObject(reserveEvent.afterData).availableUnits).toBe(7);

    expect(soldEvent.eventType).toBe('inventory_status_changed');
    expect(soldEvent.transactionType).toBe('for_sale');
    expect(soldEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(soldEvent.fromStatus).toBe('reserved');
    expect(soldEvent.toStatus).toBe('sold');
    expect(Number(soldEvent.quantityDelta)).toBe(0);
    expect(parseJsonObject(soldEvent.metadata).transition).toBe('mark_sold');
    expect(parseJsonObject(soldEvent.metadata).outcome).toBe('sold');
    expect(parseJsonObject(soldEvent.beforeData).reservedUnits).toBe(3);
    expect(parseJsonObject(soldEvent.afterData).reservedUnits).toBe(2);
    expect(parseJsonObject(soldEvent.beforeData).soldUnits).toBe(2);
    expect(parseJsonObject(soldEvent.afterData).soldUnits).toBe(3);
    expect(parseJsonObject(soldEvent.metadata).outcomeProjectionColumn).toBe(
      'unit_types.sold_units',
    );

    expect(releaseEvent.eventType).toBe('inventory_status_changed');
    expect(releaseEvent.transactionType).toBe('for_sale');
    expect(releaseEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(releaseEvent.fromStatus).toBe('reserved');
    expect(releaseEvent.toStatus).toBe('available');
    expect(Number(releaseEvent.quantityDelta)).toBe(1);
    expect(parseJsonObject(releaseEvent.metadata).transition).toBe('release');
    expect(parseJsonObject(releaseEvent.beforeData).reservedUnits).toBe(2);
    expect(parseJsonObject(releaseEvent.afterData).reservedUnits).toBe(1);

    expect(directSoldEvent.eventType).toBe('inventory_status_changed');
    expect(directSoldEvent.transactionType).toBe('for_sale');
    expect(directSoldEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(directSoldEvent.fromStatus).toBe('available');
    expect(directSoldEvent.toStatus).toBe('sold');
    expect(Number(directSoldEvent.quantityDelta)).toBe(-1);
    expect(parseJsonObject(directSoldEvent.metadata).transition).toBe('mark_sold');
    expect(parseJsonObject(directSoldEvent.metadata).outcome).toBe('sold');
    expect(parseJsonObject(directSoldEvent.metadata).outcomeSource).toBe('available_direct');
    expect(parseJsonObject(directSoldEvent.metadata).inventoryProjectionColumn).toBe(
      'unit_types.available_units',
    );
    expect(parseJsonObject(directSoldEvent.metadata).outcomeProjectionColumn).toBe(
      'unit_types.sold_units',
    );
    expect(parseJsonObject(directSoldEvent.beforeData).availableUnits).toBe(8);
    expect(parseJsonObject(directSoldEvent.afterData).availableUnits).toBe(7);
    expect(parseJsonObject(directSoldEvent.beforeData).reservedUnits).toBe(1);
    expect(parseJsonObject(directSoldEvent.afterData).reservedUnits).toBe(1);
    expect(parseJsonObject(directSoldEvent.beforeData).soldUnits).toBe(3);
    expect(parseJsonObject(directSoldEvent.afterData).soldUnits).toBe(4);

    const [afterDevelopment] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, seed.developmentId))
      .limit(1);

    expect(afterDevelopment.availableUnits).toBe(7);
    expect(afterDevelopment.name).toBe(beforeDevelopment.name);
    expect(afterDevelopment.city).toBe(beforeDevelopment.city);
    expect(afterDevelopment.suburb).toBe(beforeDevelopment.suburb);
    expect(afterDevelopment.transactionType).toBe('for_sale');
    expect(afterDevelopment.priceFrom).toBe(beforeDevelopment.priceFrom);
    expect(afterDevelopment.priceTo).toBe(beforeDevelopment.priceTo);
    expect(parseJsonArray(afterDevelopment.images)).toEqual(parseJsonArray(beforeDevelopment.images));
    expect(parseJsonArray(afterDevelopment.highlights)).toEqual(
      parseJsonArray(beforeDevelopment.highlights),
    );
  });
});

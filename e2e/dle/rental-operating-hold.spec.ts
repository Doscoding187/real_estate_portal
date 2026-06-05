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
    `${seed.email} DLE Rental Hold QA`,
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

async function seedRentalDevelopment(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-rental-hold-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Rental',
    lastName: 'Hold',
    name: 'Rental Hold Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Rental Hold Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const developmentCity = `rental operating city ${suffix}`;
  const unitTypeId = `rental-hold-${suffix}`.slice(0, 36);
  const unitTypeName = `Rental Hold Two Bed ${suffix}`;
  const created = await developmentService.createDevelopment(userId, {
    name: `DLE Rental Hold ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '50 Rental Hold Road',
    city: developmentCity,
    province: 'Gauteng',
    suburb: 'Rental Hold Proof',
    status: 'leasing',
    ownershipType: 'sectional-title',
    ownershipTypes: ['sectional-title'],
    launchDate: '2029-01-10',
    completionDate: '2030-03-31',
    description: 'Rental hold browser proof keeps lease packaging fields stable.',
    highlights: ['Lease pack ready', 'Managed leasing', 'Immediate occupation'],
    images: [{ url: 'https://example.com/dle-rental-hold-hero.jpg' }],
    brochures: ['https://example.com/dle-rental-hold-brochure.pdf'],
    monthlyLevyFrom: 1_100,
    ratesFrom: 850,
    unitTypes: [
      {
        id: unitTypeId,
        name: unitTypeName,
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
        parkingType: 'covered',
        parkingBays: 1,
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

test.describe.serial('DLE Rental operating hold browser proof', () => {
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

  test('holds and releases Rental inventory with lease-native language and stable packaging', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedRentalDevelopment(suffix);
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
    await expect(page.getByText('Rental Inventory')).toBeVisible();
    await expect(page.getByText('Sales Inventory')).toHaveCount(0);
    await expect(page.getByText(seed.unitTypeName)).toBeVisible();
    await expect(page.getByText('6 rentals available, 1 held, 3 let')).toBeVisible();
    await expect(page.getByText('12 months', { exact: false })).toBeVisible();
    await expect(page.getByText('R27k deposit', { exact: false })).toBeVisible();
    await expect(page.getByText('Furnished', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Hold', exact: true }).click();
    await expect(page.getByText('Rental unit held.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('5 rentals available, 2 held, 3 let')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('inventory status changed')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-operating-hold.png`,
    });

    let [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(5);
    expect(Number(unit.reservedUnits)).toBe(2);
    expect(Number(unit.letUnits)).toBe(3);

    await page.getByRole('button', { name: 'Mark Let', exact: true }).click();
    await expect(page.getByText('Rental unit marked let.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('5 rentals available, 1 held, 4 let')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-operating-let.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(5);
    expect(Number(unit.reservedUnits)).toBe(1);
    expect(Number(unit.letUnits)).toBe(4);

    await page.getByRole('button', { name: 'Release', exact: true }).click();
    await expect(page.getByText('Rental hold released.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('6 rentals available, 0 held, 4 let')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-operating-release.png`,
    });

    [unit] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.id, seed.unitTypeId))
      .limit(1);
    expect(Number(unit.availableUnits)).toBe(6);
    expect(Number(unit.reservedUnits)).toBe(0);
    expect(Number(unit.letUnits)).toBe(4);

    const events = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(eq(developmentOperatingEvents.developmentId, seed.developmentId))
      .orderBy(desc(developmentOperatingEvents.id));
    expect(events).toHaveLength(3);
    const [releaseEvent, letEvent, holdEvent] = events;
    expect(holdEvent.eventType).toBe('inventory_status_changed');
    expect(holdEvent.transactionType).toBe('for_rent');
    expect(holdEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(holdEvent.fromStatus).toBe('available');
    expect(holdEvent.toStatus).toBe('held');
    expect(Number(holdEvent.quantityDelta)).toBe(-1);
    expect(parseJsonObject(holdEvent.metadata).transition).toBe('hold');
    expect(parseJsonObject(holdEvent.beforeData).heldUnits).toBe(1);
    expect(parseJsonObject(holdEvent.afterData).heldUnits).toBe(2);

    expect(letEvent.eventType).toBe('inventory_status_changed');
    expect(letEvent.transactionType).toBe('for_rent');
    expect(letEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(letEvent.fromStatus).toBe('held');
    expect(letEvent.toStatus).toBe('let');
    expect(Number(letEvent.quantityDelta)).toBe(0);
    expect(parseJsonObject(letEvent.metadata).transition).toBe('mark_let');
    expect(parseJsonObject(letEvent.metadata).outcome).toBe('let');
    expect(parseJsonObject(letEvent.beforeData).heldUnits).toBe(2);
    expect(parseJsonObject(letEvent.afterData).heldUnits).toBe(1);
    expect(parseJsonObject(letEvent.beforeData).letUnits).toBe(3);
    expect(parseJsonObject(letEvent.afterData).letUnits).toBe(4);
    expect(parseJsonObject(letEvent.metadata).outcomeProjectionColumn).toBe(
      'unit_types.let_units',
    );

    expect(releaseEvent.eventType).toBe('inventory_status_changed');
    expect(releaseEvent.transactionType).toBe('for_rent');
    expect(releaseEvent.unitTypeId).toBe(seed.unitTypeId);
    expect(releaseEvent.fromStatus).toBe('held');
    expect(releaseEvent.toStatus).toBe('available');
    expect(Number(releaseEvent.quantityDelta)).toBe(1);
    expect(parseJsonObject(releaseEvent.metadata).transition).toBe('release');
    expect(parseJsonObject(releaseEvent.beforeData).heldUnits).toBe(1);
    expect(parseJsonObject(releaseEvent.afterData).heldUnits).toBe(0);

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

    expect(afterDevelopment.availableUnits).toBe(6);
    expect(afterDevelopment.name).toBe(beforeDevelopment.name);
    expect(afterDevelopment.address).toBe(beforeDevelopment.address);
    expect(afterDevelopment.city).toBe(beforeDevelopment.city);
    expect(afterDevelopment.province).toBe(beforeDevelopment.province);
    expect(afterDevelopment.suburb).toBe(beforeDevelopment.suburb);
    expect(afterDevelopment.description).toBe(beforeDevelopment.description);
    expect(afterDevelopment.transactionType).toBe('for_rent');
    expect(afterDevelopment.monthlyRentFrom).toBe(beforeDevelopment.monthlyRentFrom);
    expect(afterDevelopment.monthlyRentTo).toBe(beforeDevelopment.monthlyRentTo);
    expect(afterDevelopment.monthlyLevyFrom).toBe(beforeDevelopment.monthlyLevyFrom);
    expect(afterDevelopment.ratesFrom).toBe(beforeDevelopment.ratesFrom);
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
    expect(afterUnit.monthlyRentFrom).toBe(beforeUnit.monthlyRentFrom);
    expect(afterUnit.monthlyRentTo).toBe(beforeUnit.monthlyRentTo);
    expect(afterUnit.depositRequired).toBe(beforeUnit.depositRequired);
    expect(afterUnit.leaseTerm).toBe(beforeUnit.leaseTerm);
    expect(afterUnit.isFurnished).toBe(beforeUnit.isFurnished);
    expect(afterUnit.unitSize).toBe(beforeUnit.unitSize);
    expect(afterUnit.parkingType).toBe(beforeUnit.parkingType);
    expect(afterUnit.parkingBays).toBe(beforeUnit.parkingBays);

    await page.goto(`/development/${seed.developmentSlug}`);
    await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Rent From').first()).toBeVisible();
    await expect(page.getByText('Monthly Rent').first()).toBeVisible();
    await expect(page.getByText(seed.unitTypeName).first()).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-operating-public-language.png`,
    });

    await page.goto(
      `/property-to-rent?city=${encodeURIComponent(seed.developmentCity)}&province=gauteng&listingSource=development`,
    );
    await expect(page.getByText(seed.unitTypeName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rent from R 13,500')).toBeVisible();
    await page.screenshot({
      path: `${evidenceDir}/qa-dle-rental-operating-search-language.png`,
    });
  });
});

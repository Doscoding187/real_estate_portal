import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import {
  developers,
  developmentOperatingEvents,
  developments,
  users,
} from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const evidenceDir = 'docs/dle/evidence/2026-06-04';
fs.mkdirSync(evidenceDir, { recursive: true });

type OperatingScenario = {
  lane: 'sale' | 'rental' | 'auction';
  transactionType: 'for_sale' | 'for_rent' | 'auction';
  note: string;
};

type SeededDevelopment = {
  id: number;
  name: string;
  transactionType: 'for_sale' | 'for_rent' | 'auction';
};

type Seed = {
  userId: number;
  developerId: number;
  email: string;
  developments: Record<OperatingScenario['lane'], SeededDevelopment>;
};

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function parseEventJson(value: unknown): Record<string, any> {
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
    `${seed.email} DLE Operating QA`,
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

async function seedOperatingDevelopments(suffix: string): Promise<Seed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const email = `dle-operating-${suffix}@example.com`;
  const passwordHash = await authService.hashPassword(`Password123!${suffix}`);
  const userInsert = await db!.insert(users).values({
    email,
    passwordHash,
    role: 'property_developer',
    firstName: 'Operating',
    lastName: 'Proof',
    name: 'Operating Proof Developer',
    emailVerified: 1,
  });
  const userId = getInsertId(userInsert);

  const developerInsert = await db!.insert(developers).values({
    userId,
    name: `Operating Proof Developer ${suffix}`,
    email,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = getInsertId(developerInsert);

  const sale = await developmentService.createDevelopment(userId, {
    name: `DLE Operating Sale ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_sale',
    address: '10 Operating Sale Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Operating Sale Proof',
    status: 'selling',
    description: 'Sale operating note proof package.',
    highlights: ['Buyer queue ready', 'Reservation path prepared'],
    images: [{ url: 'https://example.com/dle-operating-sale.jpg' }],
    priceFrom: 1_250_000,
    priceTo: 1_550_000,
    unitTypes: [
      {
        id: `op-sale-${suffix}`.slice(0, 36),
        name: `Operating Sale Two Bed ${suffix}`,
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

  const rental = await developmentService.createDevelopment(userId, {
    name: `DLE Operating Rental ${suffix}`,
    developmentType: 'residential',
    transactionType: 'for_rent',
    address: '20 Operating Rental Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Operating Rental Proof',
    status: 'leasing',
    description: 'Rental operating note proof package.',
    highlights: ['Leasing queue ready', 'Deposit path prepared'],
    images: [{ url: 'https://example.com/dle-operating-rental.jpg' }],
    monthlyRentFrom: 13_500,
    monthlyRentTo: 15_500,
    unitTypes: [
      {
        id: `op-rental-${suffix}`.slice(0, 36),
        name: `Operating Rental Two Bed ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 13_500,
        monthlyRentTo: 15_500,
        totalUnits: 10,
        availableUnits: 6,
        reservedUnits: 1,
        parkingType: 'covered',
        parkingBays: 1,
      },
    ],
  } as any);

  const auction = await developmentService.createDevelopment(userId, {
    name: `DLE Operating Auction ${suffix}`,
    developmentType: 'residential',
    transactionType: 'auction',
    address: '30 Operating Auction Road',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Operating Auction Proof',
    status: 'launching-soon',
    description: 'Auction operating note proof package.',
    highlights: ['Bidder queue ready', 'Registration path prepared'],
    images: [{ url: 'https://example.com/dle-operating-auction.jpg' }],
    startingBidFrom: 850_000,
    reservePriceFrom: 950_000,
    auctionStartDate: '2030-02-01T09:00:00.000Z',
    auctionEndDate: '2030-02-08T17:00:00.000Z',
    unitTypes: [
      {
        id: `op-auction-${suffix}`.slice(0, 36),
        name: `Operating Auction Lot ${suffix}`,
        bedrooms: 2,
        bathrooms: 2,
        startingBid: 850_000,
        reservePrice: 950_000,
        totalUnits: 3,
        availableUnits: 2,
        reservedUnits: 0,
        parkingType: 'garage',
        parkingBays: 2,
      },
    ],
  } as any);

  return {
    userId,
    developerId,
    email,
    developments: {
      sale: {
        id: Number(sale.id),
        name: String(sale.name),
        transactionType: 'for_sale',
      },
      rental: {
        id: Number(rental.id),
        name: String(rental.name),
        transactionType: 'for_rent',
      },
      auction: {
        id: Number(auction.id),
        name: String(auction.name),
        transactionType: 'auction',
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

async function addOperatingNoteAndAssert(input: {
  page: Page;
  development: SeededDevelopment;
  scenario: OperatingScenario;
}) {
  const { page, development, scenario } = input;
  await selectDevelopment(page, development.name);

  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.addOperatingNote') &&
      response.request().method() === 'POST',
    { timeout: 10_000 },
  );

  await page.getByPlaceholder('Add an internal operating note').fill(scenario.note);
  await page.getByRole('button', { name: 'Add Note' }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.getByText(scenario.note)).toBeVisible({ timeout: 15_000 });
  await page.screenshot({
    path: `${evidenceDir}/qa-dle-operating-note-${scenario.lane}.png`,
  });

  const db = await getDb();
  expect(db).toBeTruthy();

  await expect
    .poll(
      async () => {
        const rows = await db!
          .select()
          .from(developmentOperatingEvents)
          .where(eq(developmentOperatingEvents.developmentId, development.id));
        return rows.length;
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  const [event] = await db!
    .select()
    .from(developmentOperatingEvents)
    .where(eq(developmentOperatingEvents.developmentId, development.id))
    .limit(1);

  expect(event.eventType).toBe('operating_note_added');
  expect(event.transactionType).toBe(development.transactionType);
  expect(event.sourceSurface).toBe('developer_dashboard');
  expect(event.actorUserId).toBeTruthy();
  expect(parseEventJson(event.metadata).note).toBe(scenario.note);
  expect(parseEventJson(event.afterData).note).toBe(scenario.note);
}

test.describe.serial('DLE operating note browser readback', () => {
  let seed: Seed | null = null;

  test.afterAll(async () => {
    const db = await getDb();
    if (!db || !seed) return;

    const developmentIds = Object.values(seed.developments).map(dev => dev.id);
    if (developmentIds.length > 0) {
      await db
        .delete(developmentOperatingEvents)
        .where(inArray(developmentOperatingEvents.developmentId, developmentIds));
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    await db.delete(developers).where(eq(developers.id, seed.developerId));
    await db.delete(users).where(eq(users.id, seed.userId));
  });

  test('proves Sale, Rental, and Auction operating notes write events and read back in dashboard', async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    seed = await seedOperatingDevelopments(suffix);

    await loginAsSeededDeveloper(page, seed);
    await page.goto('/developer/dashboard');
    await expect(page.getByRole('heading', { name: 'Developer Control Tower' })).toBeVisible({
      timeout: 15_000,
    });

    const scenarios: OperatingScenario[] = [
      {
        lane: 'sale',
        transactionType: 'for_sale',
        note: `Sale reservation call checked ${suffix}`,
      },
      {
        lane: 'rental',
        transactionType: 'for_rent',
        note: `Rental lease pack checked ${suffix}`,
      },
      {
        lane: 'auction',
        transactionType: 'auction',
        note: `Auction bidder pack checked ${suffix}`,
      },
    ];

    for (const scenario of scenarios) {
      const development = seed.developments[scenario.lane];
      expect(development.transactionType).toBe(scenario.transactionType);
      await addOperatingNoteAndAssert({ page, development, scenario });
    }
  });
});

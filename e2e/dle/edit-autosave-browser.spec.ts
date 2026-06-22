import { expect, test, type Page, type Request } from '@playwright/test';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, users } from '../../drizzle/schema';
import { authService } from '../../server/_core/auth';
import { getDb } from '../../server/db-connection';
import { developmentService } from '../../server/services/developmentService';
import { COOKIE_NAME } from '../../shared/const';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const AUTOSAVE_RESPONSE_TIMEOUT_MS = 45_000;

test.skip(
  process.env.VITE_DLE_EDIT_AUTOSAVE_ENABLED !== 'true',
  'Edit autosave browser proof requires VITE_DLE_EDIT_AUTOSAVE_ENABLED=true.',
);

type SeedBase = {
  developerId: number;
  developmentId: number;
  developmentName: string;
  email: string;
  initialDescription: string;
  mediaUrl: string;
  retryDescription: string;
  slug: string;
  userId: number;
};

type RentalSeed = SeedBase & {
  unitId: string;
  unitName: string;
  monthlyRentFrom: number;
  monthlyRentTo: number;
};

type SaleSeed = SeedBase & {
  unitId: string;
  unitName: string;
  priceFrom: number;
  priceTo: number;
};

type AuctionSeed = SeedBase & {
  unitId: string;
  unitName: string;
  startingBid: number;
  reservePrice: number;
};

type Seed = RentalSeed | SaleSeed | AuctionSeed;

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

function getTrpcResponseData(payload: any) {
  const response = Array.isArray(payload) ? payload[0] : payload;
  return response?.result?.data?.json ?? response?.result?.data ?? null;
}

function getTrpcRequestInput(request: Request) {
  const payload = request.postDataJSON();
  const input = Array.isArray(payload) ? payload[0] : payload;
  return input?.json ?? input?.['0']?.json ?? input;
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loginAsSeededDeveloper(page: Page, seed: Seed) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const sessionToken = await authService.createSessionToken(
    seed.userId,
    seed.email,
    `${seed.email} DLE Edit Autosave QA`,
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

async function getDevelopmentRow(developmentId: number) {
  const db = await getDb();
  expect(db).toBeTruthy();
  const [row] = await db!
    .select()
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  return row;
}

async function getFirstUnit(developmentId: number) {
  const development = await developmentService.getDevelopmentWithPhases(developmentId);
  return (development as any)?.unitTypes?.[0] ?? null;
}

async function expectSeedRentalUnitPreserved(seed: RentalSeed) {
  const unit = await getFirstUnit(seed.developmentId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.monthlyRentFrom)).toBe(seed.monthlyRentFrom);
  expect(Number(unit.monthlyRentTo)).toBe(seed.monthlyRentTo);
}

async function expectSeedSaleUnitPreserved(seed: SaleSeed) {
  const unit = await getFirstUnit(seed.developmentId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.priceFrom)).toBe(seed.priceFrom);
  expect(Number(unit.priceTo)).toBe(seed.priceTo);
}

async function expectSeedAuctionUnitPreserved(seed: AuctionSeed) {
  const unit = await getFirstUnit(seed.developmentId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.startingBid)).toBe(seed.startingBid);
  expect(Number(unit.reservePrice)).toBe(seed.reservePrice);
}

async function seedPublishedRentalEditDevelopment(): Promise<RentalSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-edit-autosave-rental-${suffix}@example.com`;
  const developmentName = `DLE Edit Autosave Rental ${suffix}`;
  const unitId = `edit-autosave-rent-${suffix}`.slice(0, 36);
  const unitName = `Edit Autosave Rental Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-original-${suffix}.jpg`;
  const monthlyRentFrom = 18_500;
  const monthlyRentTo = 21_000;
  const initialDescription =
    'Initial rental edit autosave description proves a published development starts from a persisted baseline with stable inventory.';
  const retryDescription =
    'Retried rental edit autosave description proves the browser saves only the latest marketing copy after a failed autosave.';

  let userId: number | null = null;
  let developerId: number | null = null;
  let developmentId: number | null = null;

  try {
    const userInsert = await db!.insert(users).values({
      email,
      role: 'property_developer',
      firstName: 'Edit',
      lastName: 'Autosave',
      name: `Edit Autosave ${suffix}`,
      emailVerified: 1,
    });
    userId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Edit Autosave Developer ${suffix}`,
      email,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    developerId = getInsertId(developerInsert);

    const created = await developmentService.createDevelopment(userId, {
      name: developmentName,
      workflowId: 'residential_rent',
      currentStepId: 'marketing_summary',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types',
      ],
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '47 Edit Autosave Road',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Autosave Browser Proof',
      postalCode: '8001',
      status: 'leasing',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2029-04-01',
      completionDate: '2030-06-30',
      description: initialDescription,
      highlights: ['Stable edit baseline', 'Failure is visible', 'Retry saves latest copy'],
      images: [{ url: mediaUrl }],
      brochures: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 1_350,
      ratesFrom: 980,
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_rent',
        },
        identity_market: {
          name: developmentName,
          transactionType: 'for_rent',
          status: 'leasing',
          ownershipTypes: ['sectional-title'],
          launchDate: '2029-04-01',
          completionDate: '2030-06-30',
        },
        location: {
          address: '47 Edit Autosave Road',
          suburb: 'Autosave Browser Proof',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
        },
        governance_finances: {
          monthlyLevyFrom: 1_350,
          ratesFrom: 980,
        },
        amenities_features: {
          amenities: ['Security', 'Backup power'],
        },
        marketing_summary: {
          description: initialDescription,
          tagline: 'Truthful edit autosave proof',
          keySellingPoints: [
            'Stable edit baseline',
            'Failure is visible',
            'Retry saves latest copy',
          ],
        },
        development_media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          floorPlans: [],
          documents: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
        },
        unit_types: {
          selectedUnitId: unitId,
          unitTypes: [
            {
              id: unitId,
              name: unitName,
              bedrooms: 2,
              bathrooms: 2,
              monthlyRentFrom,
              monthlyRentTo,
              depositRequired: 37_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
      developmentData: {
        name: developmentName,
        description: initialDescription,
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'leasing',
        ownershipTypes: ['sectional-title'],
        launchDate: '2029-04-01',
        completionDate: '2030-06-30',
        location: {
          address: '47 Edit Autosave Road',
          suburb: 'Autosave Browser Proof',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
        },
        highlights: ['Stable edit baseline', 'Failure is visible', 'Retry saves latest copy'],
        amenities: ['Security', 'Backup power'],
        media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          documents: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom,
          monthlyRentTo,
          depositRequired: 37_000,
          totalUnits: 8,
          availableUnits: 5,
        },
      ],
    } as any);
    developmentId = Number(created.id);

    await developmentService.publishDevelopment(developmentId, userId);
    await developmentService.approveDevelopment(developmentId, 1);
    await db!
      .update(developments)
      .set({ currentStepId: 'marketing_summary' })
      .where(eq(developments.id, developmentId));
  } catch (error) {
    if (developmentId !== null) {
      await db!.delete(developments).where(eq(developments.id, developmentId));
    }
    if (developerId !== null) {
      await db!.delete(developers).where(eq(developers.id, developerId));
    }
    if (userId !== null) {
      await db!.delete(users).where(eq(users.id, userId));
    }
    throw error;
  }

  const row = await getDevelopmentRow(developmentId);

  return {
    developerId,
    developmentId,
    developmentName,
    email,
    initialDescription,
    mediaUrl,
    retryDescription,
    slug: row.slug,
    unitId,
    unitName,
    monthlyRentFrom,
    monthlyRentTo,
    userId,
  };
}

async function seedPublishedSaleEditDevelopment(): Promise<SaleSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-edit-autosave-sale-${suffix}@example.com`;
  const developmentName = `DLE Edit Autosave Sale ${suffix}`;
  const unitId = `edit-autosave-sale-${suffix}`.slice(0, 36);
  const unitName = `Edit Autosave Sale Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-sale-original-${suffix}.jpg`;
  const priceFrom = 1_750_000;
  const priceTo = 2_200_000;
  const initialDescription =
    'Initial sale edit autosave description proves a published sale development starts from a persisted baseline with stable inventory.';
  const retryDescription =
    'Retried sale edit autosave description proves the browser saves only the latest marketing copy after a failed autosave.';

  let userId: number | null = null;
  let developerId: number | null = null;
  let developmentId: number | null = null;

  try {
    const userInsert = await db!.insert(users).values({
      email,
      role: 'property_developer',
      firstName: 'Edit',
      lastName: 'Autosave',
      name: `Edit Autosave ${suffix}`,
      emailVerified: 1,
    });
    userId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Edit Autosave Developer ${suffix}`,
      email,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    developerId = getInsertId(developerInsert);

    const created = await developmentService.createDevelopment(userId, {
      name: developmentName,
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types',
      ],
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '81 Sale Autosave Avenue',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      postalCode: '2196',
      status: 'selling',
      ownershipType: 'full-title',
      ownershipTypes: ['full-title'],
      launchDate: '2026-09-01',
      completionDate: '2027-12-31',
      description: initialDescription,
      highlights: ['Prime location', 'Sale edit baseline stable', 'Retry preserves sale fields'],
      images: [{ url: mediaUrl }],
      brochures: [`https://example.com/dle-edit-autosale-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 2_500,
      ratesFrom: 1_200,
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        identity_market: {
          name: developmentName,
          transactionType: 'for_sale',
          status: 'selling',
          ownershipTypes: ['full-title'],
          launchDate: '2026-09-01',
          completionDate: '2027-12-31',
        },
        location: {
          address: '81 Sale Autosave Avenue',
          suburb: 'Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2196',
        },
        governance_finances: {
          monthlyLevyFrom: 2_500,
          ratesFrom: 1_200,
        },
        amenities_features: {
          amenities: ['Pool', 'Gym', '24hr Security'],
        },
        marketing_summary: {
          description: initialDescription,
          tagline: 'Sale edit autosave proof',
          keySellingPoints: [
            'Prime location',
            'Sale edit baseline stable',
            'Retry preserves sale fields',
          ],
        },
        development_media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          floorPlans: [],
          documents: [`https://example.com/dle-edit-autosale-brochure-${suffix}.pdf`],
        },
        unit_types: {
          selectedUnitId: unitId,
          unitTypes: [
            {
              id: unitId,
              name: unitName,
              bedrooms: 3,
              bathrooms: 2,
              priceFrom,
              priceTo,
              totalUnits: 12,
              availableUnits: 7,
            },
          ],
        },
      },
      developmentData: {
        name: developmentName,
        description: initialDescription,
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        ownershipTypes: ['full-title'],
        ownershipType: 'full-title',
        launchDate: '2026-09-01',
        completionDate: '2027-12-31',
        location: {
          address: '81 Sale Autosave Avenue',
          suburb: 'Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2196',
        },
        highlights: ['Prime location', 'Sale edit baseline stable', 'Retry preserves sale fields'],
        amenities: ['Pool', 'Gym', '24hr Security'],
        media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          documents: [`https://example.com/dle-edit-autosale-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 3,
          bathrooms: 2,
          priceFrom,
          priceTo,
          totalUnits: 12,
          availableUnits: 7,
        },
      ],
    } as any);
    developmentId = Number(created.id);

    await developmentService.publishDevelopment(developmentId, userId);
    await developmentService.approveDevelopment(developmentId, 1);
    await db!
      .update(developments)
      .set({ currentStepId: 'marketing_summary' })
      .where(eq(developments.id, developmentId));
  } catch (error) {
    if (developmentId !== null) {
      await db!.delete(developments).where(eq(developments.id, developmentId));
    }
    if (developerId !== null) {
      await db!.delete(developers).where(eq(developers.id, developerId));
    }
    if (userId !== null) {
      await db!.delete(users).where(eq(users.id, userId));
    }
    throw error;
  }

  const row = await getDevelopmentRow(developmentId);

  return {
    developerId,
    developmentId,
    developmentName,
    email,
    initialDescription,
    mediaUrl,
    retryDescription,
    slug: row.slug,
    unitId,
    unitName,
    priceFrom,
    priceTo,
    userId,
  };
}

async function seedPublishedAuctionEditDevelopment(): Promise<AuctionSeed> {
  const db = await getDb();
  expect(db).toBeTruthy();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `dle-edit-autosave-auction-${suffix}@example.com`;
  const developmentName = `DLE Edit Autosave Auction ${suffix}`;
  const unitId = `edit-autosave-auction-${suffix}`.slice(0, 36);
  const unitName = `Edit Autosave Auction Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-auction-original-${suffix}.jpg`;
  const startingBid = 800_000;
  const reservePrice = 1_200_000;
  const initialDescription =
    'Initial auction edit autosave description proves a published auction development starts from a persisted baseline with stable inventory.';
  const retryDescription =
    'Retried auction edit autosave description proves the browser saves only the latest marketing copy after a failed autosave.';

  let userId: number | null = null;
  let developerId: number | null = null;
  let developmentId: number | null = null;

  try {
    const userInsert = await db!.insert(users).values({
      email,
      role: 'property_developer',
      firstName: 'Edit',
      lastName: 'Autosave',
      name: `Edit Autosave ${suffix}`,
      emailVerified: 1,
    });
    userId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Edit Autosave Developer ${suffix}`,
      email,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    developerId = getInsertId(developerInsert);

    const created = await developmentService.createDevelopment(userId, {
      name: developmentName,
      workflowId: 'residential_auction',
      currentStepId: 'marketing_summary',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types',
      ],
      developmentType: 'residential',
      transactionType: 'auction',
      address: '12 Auction Lane',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      suburb: 'Umhlanga',
      postalCode: '4319',
      status: 'registering',
      ownershipType: 'full-title',
      ownershipTypes: ['full-title'],
      launchDate: '2026-08-01',
      completionDate: '2027-11-30',
      description: initialDescription,
      highlights: ['Auction prime lot', 'Auction edit baseline stable', 'Retry preserves auction fields'],
      images: [{ url: mediaUrl }],
      brochures: [`https://example.com/dle-edit-autosave-auction-brochure-${suffix}.pdf`],
      monthlyLevyFrom: 1_800,
      ratesFrom: 850,
      auctionStartDate: '2026-09-15T10:00:00.000Z',
      auctionEndDate: '2026-09-17T10:00:00.000Z',
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'auction',
        },
        identity_market: {
          name: developmentName,
          transactionType: 'auction',
          status: 'registering',
          ownershipTypes: ['full-title'],
          launchDate: '2026-08-01',
          completionDate: '2027-11-30',
        },
        location: {
          address: '12 Auction Lane',
          suburb: 'Umhlanga',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          postalCode: '4319',
        },
        governance_finances: {
          monthlyLevyFrom: 1_800,
          ratesFrom: 850,
        },
        amenities_features: {
          amenities: ['Beach access', 'Clubhouse'],
        },
        marketing_summary: {
          description: initialDescription,
          tagline: 'Auction edit autosave proof',
          keySellingPoints: [
            'Auction prime lot',
            'Auction edit baseline stable',
            'Retry preserves auction fields',
          ],
        },
        development_media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          floorPlans: [],
          documents: [`https://example.com/dle-edit-autosave-auction-brochure-${suffix}.pdf`],
        },
        unit_types: {
          selectedUnitId: unitId,
          unitTypes: [
            {
              id: unitId,
              name: unitName,
              bedrooms: 4,
              bathrooms: 3,
              startingBid,
              reservePrice,
              auctionStartDate: '2026-09-15T10:00:00.000Z',
              auctionEndDate: '2026-09-17T10:00:00.000Z',
              totalUnits: 6,
              availableUnits: 4,
            },
          ],
        },
      },
      developmentData: {
        name: developmentName,
        description: initialDescription,
        developmentType: 'residential',
        transactionType: 'auction',
        status: 'registering',
        ownershipTypes: ['full-title'],
        ownershipType: 'full-title',
        launchDate: '2026-08-01',
        completionDate: '2027-11-30',
        location: {
          address: '12 Auction Lane',
          suburb: 'Umhlanga',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          postalCode: '4319',
        },
        highlights: ['Auction prime lot', 'Auction edit baseline stable', 'Retry preserves auction fields'],
        amenities: ['Beach access', 'Clubhouse'],
        media: {
          heroImage: { url: mediaUrl },
          photos: [{ url: mediaUrl, type: 'image', category: 'hero', isPrimary: true }],
          videos: [],
          documents: [`https://example.com/dle-edit-autosave-auction-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          bedrooms: 4,
          bathrooms: 3,
          startingBid,
          reservePrice,
          auctionStartDate: '2026-09-15T10:00:00.000Z',
          auctionEndDate: '2026-09-17T10:00:00.000Z',
          totalUnits: 6,
          availableUnits: 4,
        },
      ],
    } as any);
    developmentId = Number(created.id);

    await developmentService.publishDevelopment(developmentId, userId);
    await developmentService.approveDevelopment(developmentId, 1);
    await db!
      .update(developments)
      .set({ currentStepId: 'marketing_summary' })
      .where(eq(developments.id, developmentId));
  } catch (error) {
    if (developmentId !== null) {
      await db!.delete(developments).where(eq(developments.id, developmentId));
    }
    if (developerId !== null) {
      await db!.delete(developers).where(eq(developers.id, developerId));
    }
    if (userId !== null) {
      await db!.delete(users).where(eq(users.id, userId));
    }
    throw error;
  }

  const row = await getDevelopmentRow(developmentId);

  return {
    developerId,
    developmentId,
    developmentName,
    email,
    initialDescription,
    mediaUrl,
    retryDescription,
    slug: row.slug,
    unitId,
    unitName,
    startingBid,
    reservePrice,
    userId,
  };
}

type Lane = {
  name: 'rental' | 'sale' | 'auction';
  seed: () => Promise<Seed>;
  failedAddress: string;
  retryAddress: string;
  expectedCity: string;
  expectedSuburb: string;
  failedDescription: string;
  pricingFields: string[];
  expectUnitPreserved: (seed: Seed) => Promise<void>;
  expectPublicOutput: (page: Page, seed: Seed) => Promise<void>;
};

const lanes: Lane[] = [
  {
    name: 'rental',
    seed: seedPublishedRentalEditDevelopment,
    failedAddress: '999 Failed Rental Autosave Road',
    retryAddress: '51 Retried Rental Autosave Road',
    expectedCity: 'Cape Town',
    expectedSuburb: 'Autosave Browser Proof',
    failedDescription:
      'Failed rental edit autosave description should stay out of the database until a real retry succeeds.',
    pricingFields: ['monthlyRentFrom', 'monthlyRentTo'],
    expectUnitPreserved: seed => expectSeedRentalUnitPreserved(seed as RentalSeed),
    expectPublicOutput: async (page, seed) => {
      await expect(page.getByText('Rent From R 18 500 - R 21 000').first()).toBeVisible();
      await expect(page.getByText('R 18 500 / month').first()).toBeVisible();
      await expect(page.getByText(seed.unitName).first()).toBeVisible();
    },
  },
  {
    name: 'sale',
    seed: seedPublishedSaleEditDevelopment,
    failedAddress: '999 Failed Sale Autosave Avenue',
    retryAddress: '83 Retried Sale Autosave Avenue',
    expectedCity: 'Johannesburg',
    expectedSuburb: 'Sandton',
    failedDescription:
      'Failed sale edit autosave description should stay out of the database until a real retry succeeds.',
    pricingFields: ['priceFrom', 'priceTo'],
    expectUnitPreserved: seed => expectSeedSaleUnitPreserved(seed as SaleSeed),
    expectPublicOutput: async (page, seed) => {
      await expect(page.getByText(seed.unitName).first()).toBeVisible();
      await expect(page.getByText('Price From R 1').first()).toBeVisible();
    },
  },
  {
    name: 'auction',
    seed: seedPublishedAuctionEditDevelopment,
    failedAddress: '999 Failed Auction Autosave Lane',
    retryAddress: '14 Retried Auction Autosave Lane',
    expectedCity: 'Durban',
    expectedSuburb: 'Umhlanga',
    failedDescription:
      'Failed auction edit autosave description should stay out of the database until a real retry succeeds.',
    pricingFields: ['startingBid', 'reservePrice'],
    expectUnitPreserved: seed => expectSeedAuctionUnitPreserved(seed as AuctionSeed),
    expectPublicOutput: async (page, seed) => {
      await expect(page.getByText('Starting Bid').first()).toBeVisible();
      await expect(page.getByText(seed.unitName).first()).toBeVisible();
    },
  },
];

async function cleanupSeed(seed: Seed | undefined) {
  const db = await getDb();
  if (!db || !seed) return;
  await db.delete(developments).where(eq(developments.id, seed.developmentId));
  await db.delete(developers).where(eq(developers.id, seed.developerId));
  await db.delete(users).where(eq(users.id, seed.userId));
}

async function openMarketingSummary(page: Page, seed: Seed) {
  await loginAsSeededDeveloper(page, seed);
  await page.goto(`/developer/create-development?id=${seed.developmentId}`);
  await expect(page.getByRole('heading', { name: 'Marketing Summary' }).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function openLocation(page: Page, seed: Seed) {
  await setCurrentStep(seed, 'location');
  await loginAsSeededDeveloper(page, seed);
  await page.goto(`/developer/create-development?id=${seed.developmentId}`);
  await expect(page.getByRole('heading', { name: 'Location & Address' }).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function openMedia(page: Page, seed: Seed) {
  await setCurrentStep(seed, 'development_media');
  await loginAsSeededDeveloper(page, seed);
  await page.goto(`/developer/create-development?id=${seed.developmentId}`);
  await expect(page.getByRole('heading', { name: 'Development Media' }).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function setCurrentStep(seed: Seed, currentStepId: string) {
  const db = await getDb();
  expect(db).toBeTruthy();
  await db!
    .update(developments)
    .set({ currentStepId })
    .where(eq(developments.id, seed.developmentId));
}

async function interceptFirstFailedUpdate(page: Page) {
  let failNextUpdate = true;
  const updateRequests: Request[] = [];

  await page.route('**/api/trpc/developer.updateDevelopment**', async route => {
    updateRequests.push(route.request());
    if (failNextUpdate) {
      failNextUpdate = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: {
                success: false,
              },
            },
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  return updateRequests;
}

async function fillDescriptionAndWaitForUpdate(page: Page, description: string) {
  const descriptionInput = page.getByPlaceholder(
    'Describe the lifestyle, location benefits, and unique selling points...',
  );
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await descriptionInput.fill(description);
  return responsePromise;
}

async function fillLocationAddressAndWaitForUpdate(page: Page, address: string) {
  const addressInput = page.locator('[data-field="location.address"]');
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await addressInput.fill(address);
  return responsePromise;
}

async function uploadGalleryImageAndWaitForUpdate(page: Page, fileName: string) {
  const imageInputs = page.locator('input[type="file"][accept="image/*"]');
  await expect(imageInputs.first()).toBeAttached({ timeout: 20_000 });
  const inputIndex = (await imageInputs.count()) > 1 ? 1 : 0;
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await imageInputs.nth(inputIndex).setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
  return responsePromise;
}

function expectMarketingPayload(request: Request, description: string) {
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'marketing_summary',
    description,
  });
  return input.data;
}

function expectLocationPayload(request: Request, address: string) {
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'location',
    address,
  });
  return input.data;
}

function expectMediaPayload(request: Request) {
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'development_media',
  });
  expect(input.data.images).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        url: expect.stringContaining('/local-uploads/'),
      }),
    ]),
  );
  expect(input.data.stepData).toMatchObject({
    development_media: {
      photos: expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining('/local-uploads/'),
        }),
      ]),
    },
  });
  return input.data;
}

function expectPayloadOwnsOnlyMarketing(data: Record<string, unknown>, lane: Lane) {
  for (const field of [
    'unitTypes',
    'city',
    'images',
    'address',
    'suburb',
    ...lane.pricingFields,
  ]) {
    expect(data).not.toHaveProperty(field);
  }
}

function expectPayloadOwnsOnlyLocation(data: Record<string, unknown>, lane: Lane) {
  for (const field of [
    'unitTypes',
    'images',
    'description',
    'tagline',
    'highlights',
    'monthlyLevyFrom',
    'ratesFrom',
    ...lane.pricingFields,
  ]) {
    expect(data).not.toHaveProperty(field);
  }
}

function expectPayloadOwnsOnlyMedia(data: Record<string, unknown>, lane: Lane) {
  for (const field of [
    'address',
    'city',
    'province',
    'suburb',
    'postalCode',
    'description',
    'tagline',
    'highlights',
    'monthlyLevyFrom',
    'ratesFrom',
    'unitTypes',
    ...lane.pricingFields,
  ]) {
    expect(data).not.toHaveProperty(field);
  }
  expect(data.stepData).not.toHaveProperty('location');
  expect(data.stepData).not.toHaveProperty('marketing_summary');
  expect(data.stepData).not.toHaveProperty('governance_finances');
  expect(data.stepData).not.toHaveProperty('unit_types');
}

async function expectBaselinePreserved(seed: Seed, lane: Lane, expectedDescription: string) {
  const row = await getDevelopmentRow(seed.developmentId);
  expect(row.description).toBe(expectedDescription);
  expect(row.city).toBe(lane.expectedCity);
  expect(row.suburb).toBe(lane.expectedSuburb);
  expect(asArray(row.images).some(image => image?.url === seed.mediaUrl)).toBe(true);
  await lane.expectUnitPreserved(seed);
  return row;
}

function getUploadedMediaUrls(data: Record<string, any>): string[] {
  const imageUrls = asArray(data.images)
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string' && url.includes('/local-uploads/'));
  const stepUrls = asArray(data.stepData?.development_media?.photos)
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string' && url.includes('/local-uploads/'));
  return Array.from(new Set([...imageUrls, ...stepUrls]));
}

async function expectCommercialPackagePreserved(
  seed: Seed,
  lane: Lane,
  baseline: Awaited<ReturnType<typeof getDevelopmentRow>>,
) {
  const row = await getDevelopmentRow(seed.developmentId);
  expect(row.description).toBe(baseline.description);
  expect(row.city).toBe(baseline.city);
  expect(row.province).toBe(baseline.province);
  expect(row.suburb).toBe(baseline.suburb);
  expect(row.postalCode).toBe(baseline.postalCode);
  expect(row.monthlyLevyFrom).toEqual(baseline.monthlyLevyFrom);
  expect(row.ratesFrom).toEqual(baseline.ratesFrom);
  expect(row.approvalStatus).toBe('approved');
  expect(asArray(row.images).some(image => image?.url === seed.mediaUrl)).toBe(true);
  await lane.expectUnitPreserved(seed);
  return row;
}

async function expectCommercialPackagePreservedExceptMedia(
  seed: Seed,
  lane: Lane,
  baseline: Awaited<ReturnType<typeof getDevelopmentRow>>,
) {
  const row = await expectCommercialPackagePreserved(seed, lane, baseline);
  expect(row.address).toBe(baseline.address);
  return row;
}

test.describe.serial('DLE edit autosave browser proof', () => {
  test.setTimeout(120_000);

  for (const lane of lanes) {
    test.describe.serial(`${lane.name} edit autosave`, () => {
      let seed: Seed;

      test.beforeAll(async () => {
        seed = await lane.seed();
      });

      test.afterAll(async () => {
        await cleanupSeed(seed);
      });

      test('keeps failed edit autosave visible and retries latest partial marketing payload', async ({
        page,
      }) => {
        await openMarketingSummary(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await fillDescriptionAndWaitForUpdate(
          page,
          lane.failedDescription,
        );
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-20/qa-dle-${lane.name}-edit-autosave-failure-visible.png`,
          fullPage: true,
        });

        await expectBaselinePreserved(seed, lane, seed.initialDescription);

        const retryResponse = await fillDescriptionAndWaitForUpdate(page, seed.retryDescription);
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-20/qa-dle-${lane.name}-edit-autosave-retry-saved.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(2);
        const failedData = expectMarketingPayload(updateRequests[0], lane.failedDescription);
        const retryData = expectMarketingPayload(updateRequests[1], seed.retryDescription);
        expectPayloadOwnsOnlyMarketing(failedData, lane);
        expectPayloadOwnsOnlyMarketing(retryData, lane);

        const afterRetry = await expectBaselinePreserved(seed, lane, seed.retryDescription);
        expect(afterRetry.approvalStatus).toBe('approved');

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await lane.expectPublicOutput(page, seed);
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-20/qa-dle-${lane.name}-edit-autosave-public-preserved.png`,
          fullPage: true,
        });
      });

      test('retry payload owns only marketing fields', async ({ page }) => {
        await openMarketingSummary(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        await fillDescriptionAndWaitForUpdate(page, lane.failedDescription);
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 20_000,
        });

        await fillDescriptionAndWaitForUpdate(page, seed.retryDescription);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        expect(updateRequests.length).toBeGreaterThanOrEqual(2);
        const retryData = expectMarketingPayload(
          updateRequests[updateRequests.length - 1],
          seed.retryDescription,
        );
        expectPayloadOwnsOnlyMarketing(retryData, lane);
      });

      test('keeps failed location autosave visible and retries latest partial location payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openLocation(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await fillLocationAddressAndWaitForUpdate(
          page,
          lane.failedAddress,
        );
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-location-failure-visible.png`,
          fullPage: true,
        });

        const afterFailure = await expectCommercialPackagePreserved(seed, lane, baseline);
        expect(afterFailure.address).toBe(baseline.address);

        const retryResponse = await fillLocationAddressAndWaitForUpdate(
          page,
          lane.retryAddress,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-location-retry-saved.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(2);
        const failedData = expectLocationPayload(updateRequests[0], lane.failedAddress);
        const retryData = expectLocationPayload(updateRequests[1], lane.retryAddress);
        expectPayloadOwnsOnlyLocation(failedData, lane);
        expectPayloadOwnsOnlyLocation(retryData, lane);

        const afterRetry = await expectCommercialPackagePreserved(seed, lane, baseline);
        expect(afterRetry.address).toBe(lane.retryAddress);

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await lane.expectPublicOutput(page, seed);
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-location-public-preserved.png`,
          fullPage: true,
        });
      });

      test('retry payload owns only location fields', async ({ page }) => {
        await openLocation(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        await fillLocationAddressAndWaitForUpdate(page, lane.failedAddress);
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 20_000,
        });

        await fillLocationAddressAndWaitForUpdate(page, lane.retryAddress);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        expect(updateRequests.length).toBeGreaterThanOrEqual(2);
        const retryData = expectLocationPayload(
          updateRequests[updateRequests.length - 1],
          lane.retryAddress,
        );
        expectPayloadOwnsOnlyLocation(retryData, lane);
      });

      test('keeps failed media autosave visible and retries latest partial media payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openMedia(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await uploadGalleryImageAndWaitForUpdate(
          page,
          `failed-${lane.name}-media.png`,
        );
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-media-failure-visible.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(1);
        const failedData = expectMediaPayload(updateRequests[0]);
        expectPayloadOwnsOnlyMedia(failedData, lane);
        const failedUrls = getUploadedMediaUrls(failedData);
        expect(failedUrls.length).toBeGreaterThan(0);

        const afterFailure = await expectCommercialPackagePreservedExceptMedia(seed, lane, baseline);
        const afterFailureImages = asArray(afterFailure.images);
        expect(afterFailureImages.some(image => image?.url === seed.mediaUrl)).toBe(true);
        for (const failedUrl of failedUrls) {
          expect(afterFailureImages.some(image => image?.url === failedUrl)).toBe(false);
        }

        const retryResponse = await uploadGalleryImageAndWaitForUpdate(
          page,
          `retry-${lane.name}-media.png`,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-media-retry-saved.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectMediaPayload(updateRequests[1]);
        expectPayloadOwnsOnlyMedia(retryData, lane);
        const retryUrls = getUploadedMediaUrls(retryData);
        expect(retryUrls.length).toBeGreaterThan(failedUrls.length);

        const afterRetry = await expectCommercialPackagePreservedExceptMedia(seed, lane, baseline);
        const afterRetryImages = asArray(afterRetry.images);
        expect(afterRetryImages.some(image => image?.url === seed.mediaUrl)).toBe(true);
        for (const retryUrl of retryUrls) {
          expect(afterRetryImages.some(image => image?.url === retryUrl)).toBe(true);
        }

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await lane.expectPublicOutput(page, seed);
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-media-public-preserved.png`,
          fullPage: true,
        });
      });

      test('retry payload owns only media fields', async ({ page }) => {
        await openMedia(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        await uploadGalleryImageAndWaitForUpdate(page, `failed-${lane.name}-media-payload.png`);
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 20_000,
        });

        await uploadGalleryImageAndWaitForUpdate(page, `retry-${lane.name}-media-payload.png`);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        expect(updateRequests.length).toBeGreaterThanOrEqual(2);
        const retryData = expectMediaPayload(updateRequests[updateRequests.length - 1]);
        expectPayloadOwnsOnlyMedia(retryData, lane);
      });
    });
  }
});

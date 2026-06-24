import { expect, test, type Page, type Request } from '@playwright/test';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

import { developers, developments, leads, users } from '../../drizzle/schema';
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
  galleryMediaFileName: string;
  galleryMediaId: string;
  galleryMediaUrl: string;
  galleryReorderMediaFileName: string;
  galleryReorderMediaId: string;
  galleryReorderMediaUrl: string;
  initialDescription: string;
  mediaUrl: string;
  removableUnitId: string;
  removableUnitName: string;
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
  return getUnitsFromDevelopment(development)[0] ?? null;
}

function getUnitsFromDevelopment(development: unknown) {
  return ((development as any)?.unitTypes ?? []) as any[];
}

async function getUnits(developmentId: number) {
  const development = await developmentService.getDevelopmentWithPhases(developmentId);
  return getUnitsFromDevelopment(development);
}

async function getUnitById(developmentId: number, unitId: string) {
  const units = await getUnits(developmentId);
  const unit = units.find(candidate => candidate?.id === unitId);
  expect(unit).toBeTruthy();
  return unit!;
}

async function expectSeedRentalUnitPreserved(seed: RentalSeed) {
  const unit = await getUnitById(seed.developmentId, seed.unitId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.monthlyRentFrom)).toBe(seed.monthlyRentFrom);
  expect(Number(unit.monthlyRentTo)).toBe(seed.monthlyRentTo);
}

async function expectSeedSaleUnitPreserved(seed: SaleSeed) {
  const unit = await getUnitById(seed.developmentId, seed.unitId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  expect(Number(unit.priceFrom)).toBe(seed.priceFrom);
  expect(Number(unit.priceTo)).toBe(seed.priceTo);
}

async function expectSeedAuctionUnitPreserved(seed: AuctionSeed) {
  const unit = await getUnitById(seed.developmentId, seed.unitId);
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
  const removableUnitId = `remove-autosave-rent-${suffix}`.slice(0, 36);
  const removableUnitName = `Remove Autosave Rental Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-original-${suffix}.jpg`;
  const galleryMediaId = `gallery-autosave-rent-${suffix}`.slice(0, 36);
  const galleryReorderMediaId = `gallery-reorder-rent-${suffix}`.slice(0, 36);
  const galleryMediaFileName = `rental-gallery-${suffix}.jpg`;
  const galleryReorderMediaFileName = `rental-gallery-reorder-${suffix}.jpg`;
  const galleryMediaUrl = `https://example.com/dle-edit-autosave-gallery-${suffix}.jpg`;
  const galleryReorderMediaUrl = `https://example.com/dle-edit-autosave-gallery-reorder-${suffix}.jpg`;
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
      images: [
        { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
        {
          id: galleryMediaId,
          url: galleryMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 1,
          fileName: galleryMediaFileName,
        },
        {
          id: galleryReorderMediaId,
          url: galleryReorderMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 2,
          fileName: galleryReorderMediaFileName,
        },
      ],
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
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
              description: 'Two bedroom rental apartment for edit autosave proof.',
              bedrooms: 2,
              bathrooms: 2,
              parkingBays: 1,
              parkingType: 'open',
              unitSize: 82,
              unitCategory: 'apartment',
              unitSubType: 'apartment',
              structuralType: 'apartment',
              monthlyRentFrom,
              monthlyRentTo,
              depositRequired: 37_000,
              totalUnits: 8,
              availableUnits: 5,
            },
            {
              id: removableUnitId,
              name: removableUnitName,
              description: 'Secondary rental apartment used to prove unit removal autosave.',
              bedrooms: 3,
              bathrooms: 2,
              parkingBays: 2,
              parkingType: 'covered',
              unitSize: 96,
              unitCategory: 'apartment',
              unitSubType: 'apartment',
              structuralType: 'apartment',
              monthlyRentFrom: 22_500,
              monthlyRentTo: 25_000,
              depositRequired: 45_000,
              totalUnits: 3,
              availableUnits: 2,
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
          videos: [],
          documents: [`https://example.com/dle-edit-autosave-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          description: 'Two bedroom rental apartment for edit autosave proof.',
          bedrooms: 2,
          bathrooms: 2,
          parkingBays: 1,
          parkingType: 'open',
          unitSize: 82,
          unitCategory: 'apartment',
          unitSubType: 'apartment',
          structuralType: 'apartment',
          monthlyRentFrom,
          monthlyRentTo,
          depositRequired: 37_000,
          totalUnits: 8,
          availableUnits: 5,
        },
        {
          id: removableUnitId,
          name: removableUnitName,
          description: 'Secondary rental apartment used to prove unit removal autosave.',
          bedrooms: 3,
          bathrooms: 2,
          parkingBays: 2,
          parkingType: 'covered',
          unitSize: 96,
          unitCategory: 'apartment',
          unitSubType: 'apartment',
          structuralType: 'apartment',
          monthlyRentFrom: 22_500,
          monthlyRentTo: 25_000,
          depositRequired: 45_000,
          totalUnits: 3,
          availableUnits: 2,
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
    galleryMediaFileName,
    galleryMediaId,
    galleryMediaUrl,
    galleryReorderMediaFileName,
    galleryReorderMediaId,
    galleryReorderMediaUrl,
    initialDescription,
    mediaUrl,
    removableUnitId,
    removableUnitName,
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
  const removableUnitId = `remove-autosave-sale-${suffix}`.slice(0, 36);
  const removableUnitName = `Remove Autosave Sale Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-sale-original-${suffix}.jpg`;
  const galleryMediaId = `gallery-autosave-sale-${suffix}`.slice(0, 36);
  const galleryReorderMediaId = `gallery-reorder-sale-${suffix}`.slice(0, 36);
  const galleryMediaFileName = `sale-gallery-${suffix}.jpg`;
  const galleryReorderMediaFileName = `sale-gallery-reorder-${suffix}.jpg`;
  const galleryMediaUrl = `https://example.com/dle-edit-autosave-sale-gallery-${suffix}.jpg`;
  const galleryReorderMediaUrl = `https://example.com/dle-edit-autosave-sale-gallery-reorder-${suffix}.jpg`;
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
      images: [
        { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
        {
          id: galleryMediaId,
          url: galleryMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 1,
          fileName: galleryMediaFileName,
        },
        {
          id: galleryReorderMediaId,
          url: galleryReorderMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 2,
          fileName: galleryReorderMediaFileName,
        },
      ],
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
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
              description: 'Three bedroom sale unit for edit autosave proof.',
              bedrooms: 3,
              bathrooms: 2,
              parkingBays: 2,
              parkingType: 'covered',
              unitSize: 118,
              unitCategory: 'apartment',
              unitSubType: 'apartment',
              structuralType: 'apartment',
              priceFrom,
              priceTo,
              totalUnits: 12,
              availableUnits: 7,
            },
            {
              id: removableUnitId,
              name: removableUnitName,
              description: 'Secondary sale unit used to prove unit removal autosave.',
              bedrooms: 4,
              bathrooms: 3,
              parkingBays: 2,
              parkingType: 'garage',
              unitSize: 140,
              unitCategory: 'apartment',
              unitSubType: 'apartment',
              structuralType: 'apartment',
              priceFrom: 2_450_000,
              priceTo: 2_900_000,
              totalUnits: 5,
              availableUnits: 3,
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
          videos: [],
          documents: [`https://example.com/dle-edit-autosale-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          description: 'Three bedroom sale unit for edit autosave proof.',
          bedrooms: 3,
          bathrooms: 2,
          parkingBays: 2,
          parkingType: 'covered',
          unitSize: 118,
          unitCategory: 'apartment',
          unitSubType: 'apartment',
          structuralType: 'apartment',
          priceFrom,
          priceTo,
          totalUnits: 12,
          availableUnits: 7,
        },
        {
          id: removableUnitId,
          name: removableUnitName,
          description: 'Secondary sale unit used to prove unit removal autosave.',
          bedrooms: 4,
          bathrooms: 3,
          parkingBays: 2,
          parkingType: 'garage',
          unitSize: 140,
          unitCategory: 'apartment',
          unitSubType: 'apartment',
          structuralType: 'apartment',
          priceFrom: 2_450_000,
          priceTo: 2_900_000,
          totalUnits: 5,
          availableUnits: 3,
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
    galleryMediaFileName,
    galleryMediaId,
    galleryMediaUrl,
    galleryReorderMediaFileName,
    galleryReorderMediaId,
    galleryReorderMediaUrl,
    initialDescription,
    mediaUrl,
    removableUnitId,
    removableUnitName,
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
  const removableUnitId = `remove-autosave-auction-${suffix}`.slice(0, 36);
  const removableUnitName = `Remove Autosave Auction Unit ${suffix}`;
  const mediaUrl = `https://example.com/dle-edit-autosave-auction-original-${suffix}.jpg`;
  const galleryMediaId = `gallery-autosave-auction-${suffix}`.slice(0, 36);
  const galleryReorderMediaId = `gallery-reorder-auction-${suffix}`.slice(0, 36);
  const galleryMediaFileName = `auction-gallery-${suffix}.jpg`;
  const galleryReorderMediaFileName = `auction-gallery-reorder-${suffix}.jpg`;
  const galleryMediaUrl = `https://example.com/dle-edit-autosave-auction-gallery-${suffix}.jpg`;
  const galleryReorderMediaUrl = `https://example.com/dle-edit-autosave-auction-gallery-reorder-${suffix}.jpg`;
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
      images: [
        { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
        {
          id: galleryMediaId,
          url: galleryMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 1,
          fileName: galleryMediaFileName,
        },
        {
          id: galleryReorderMediaId,
          url: galleryReorderMediaUrl,
          type: 'image',
          category: 'general',
          displayOrder: 2,
          fileName: galleryReorderMediaFileName,
        },
      ],
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
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
              description: 'Four bedroom auction lot for edit autosave proof.',
              bedrooms: 4,
              bathrooms: 3,
              parkingBays: 2,
              parkingType: 'garage',
              unitSize: 162,
              unitCategory: 'house',
              unitSubType: 'duplex',
              structuralType: 'duplex',
              startingBid,
              reservePrice,
              auctionStartDate: '2026-09-15T10:00:00.000Z',
              auctionEndDate: '2026-09-17T10:00:00.000Z',
              totalUnits: 6,
              availableUnits: 4,
            },
            {
              id: removableUnitId,
              name: removableUnitName,
              description: 'Secondary auction lot used to prove unit removal autosave.',
              bedrooms: 5,
              bathrooms: 4,
              parkingBays: 3,
              parkingType: 'garage',
              unitSize: 188,
              unitCategory: 'house',
              unitSubType: 'duplex',
              structuralType: 'duplex',
              startingBid: 1_100_000,
              reservePrice: 1_500_000,
              auctionStartDate: '2026-09-15T10:00:00.000Z',
              auctionEndDate: '2026-09-17T10:00:00.000Z',
              totalUnits: 2,
              availableUnits: 1,
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
          photos: [
            { url: mediaUrl, type: 'image', category: 'hero', isPrimary: true, displayOrder: 0 },
            {
              id: galleryMediaId,
              url: galleryMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 1,
              fileName: galleryMediaFileName,
            },
            {
              id: galleryReorderMediaId,
              url: galleryReorderMediaUrl,
              type: 'image',
              category: 'general',
              displayOrder: 2,
              fileName: galleryReorderMediaFileName,
            },
          ],
          videos: [],
          documents: [`https://example.com/dle-edit-autosave-auction-brochure-${suffix}.pdf`],
        },
      },
      unitTypes: [
        {
          id: unitId,
          name: unitName,
          description: 'Four bedroom auction lot for edit autosave proof.',
          bedrooms: 4,
          bathrooms: 3,
          parkingBays: 2,
          parkingType: 'garage',
          unitSize: 162,
          unitCategory: 'house',
          unitSubType: 'duplex',
          structuralType: 'duplex',
          startingBid,
          reservePrice,
          auctionStartDate: '2026-09-15T10:00:00.000Z',
          auctionEndDate: '2026-09-17T10:00:00.000Z',
          totalUnits: 6,
          availableUnits: 4,
        },
        {
          id: removableUnitId,
          name: removableUnitName,
          description: 'Secondary auction lot used to prove unit removal autosave.',
          bedrooms: 5,
          bathrooms: 4,
          parkingBays: 3,
          parkingType: 'garage',
          unitSize: 188,
          unitCategory: 'house',
          unitSubType: 'duplex',
          structuralType: 'duplex',
          startingBid: 1_100_000,
          reservePrice: 1_500_000,
          auctionStartDate: '2026-09-15T10:00:00.000Z',
          auctionEndDate: '2026-09-17T10:00:00.000Z',
          totalUnits: 2,
          availableUnits: 1,
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
    galleryMediaFileName,
    galleryMediaId,
    galleryMediaUrl,
    galleryReorderMediaFileName,
    galleryReorderMediaId,
    galleryReorderMediaUrl,
    initialDescription,
    mediaUrl,
    removableUnitId,
    removableUnitName,
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
  failedUnitValue: number;
  retryUnitValue: number;
  merchandisingUnitValue: number;
  expectedCity: string;
  expectedProvinceSlug: string;
  expectedSuburb: string;
  expectedLeadTransactionType: 'sale' | 'rent' | 'auction';
  expectedLeadPriceLabel: string;
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
    failedUnitValue: 19_500,
    retryUnitValue: 20_500,
    merchandisingUnitValue: 20_750,
    expectedCity: 'Cape Town',
    expectedProvinceSlug: 'western-cape',
    expectedSuburb: 'Autosave Browser Proof',
    expectedLeadTransactionType: 'rent',
    expectedLeadPriceLabel: 'Rent from',
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
    failedUnitValue: 1_850_000,
    retryUnitValue: 1_950_000,
    merchandisingUnitValue: 2_050_000,
    expectedCity: 'Johannesburg',
    expectedProvinceSlug: 'gauteng',
    expectedSuburb: 'Sandton',
    expectedLeadTransactionType: 'sale',
    expectedLeadPriceLabel: 'Price from',
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
    failedUnitValue: 900_000,
    retryUnitValue: 950_000,
    merchandisingUnitValue: 990_000,
    expectedCity: 'Durban',
    expectedProvinceSlug: 'kwazulu-natal',
    expectedSuburb: 'Umhlanga',
    expectedLeadTransactionType: 'auction',
    expectedLeadPriceLabel: 'Starting bid',
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
  await db.delete(leads).where(eq(leads.developmentId, seed.developmentId));
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

async function openUnitTypes(page: Page, seed: Seed) {
  await setCurrentStep(seed, 'unit_types');
  await loginAsSeededDeveloper(page, seed);
  await page.goto(`/developer/create-development?id=${seed.developmentId}`);
  await expect(page.getByRole('heading', { name: 'Unit Types' }).first()).toBeVisible({
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

async function interceptFirstSuccessfulUpdateUntilReleased(page: Page) {
  let releaseFirstSuccess!: () => void;
  const firstRelease = new Promise<void>(resolve => {
    releaseFirstSuccess = resolve;
  });
  const updateRequests: Request[] = [];

  await page.route('**/api/trpc/developer.updateDevelopment**', async route => {
    updateRequests.push(route.request());
    if (updateRequests.length === 1) {
      await firstRelease;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: {
                success: true,
              },
            },
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  return {
    releaseFirstSuccess,
    updateRequests,
  };
}

async function waitForUpdateRequestCount(updateRequests: Request[], count: number) {
  await expect
    .poll(() => updateRequests.length, {
      timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS,
    })
    .toBe(count);
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

async function fillDescriptionWithoutWaitingForResponse(page: Page, description: string) {
  await page
    .getByPlaceholder('Describe the lifestyle, location benefits, and unique selling points...')
    .fill(description);
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

async function uploadGalleryImageWithoutWaitingForResponse(page: Page, fileName: string) {
  const imageInputs = page.locator('input[type="file"][accept="image/*"]');
  await expect(imageInputs.first()).toBeAttached({ timeout: 20_000 });
  const inputIndex = (await imageInputs.count()) > 1 ? 1 : 0;

  await imageInputs.nth(inputIndex).setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
}

async function uploadGalleryImageAndWaitForUpdate(page: Page, fileName: string) {
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await uploadGalleryImageWithoutWaitingForResponse(page, fileName);
  return responsePromise;
}

async function removeGalleryImageAndWaitForUpdate(page: Page, imageUrl: string) {
  const fileName = imageUrl.split('/').pop() ?? imageUrl;
  const image = page.locator(`img[src*="${fileName}"]`).first();
  await expect(image).toBeVisible({ timeout: 20_000 });
  const mediaCard = image.locator('xpath=ancestor::div[contains(@class,"group")]').first();
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await mediaCard.hover();
  await mediaCard.locator('button').last().click();
  return responsePromise;
}

async function reorderGeneralGalleryAndWaitForUpdate(page: Page, seed: Seed) {
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );
  const sourceHandle = page.getByLabel(`Reorder ${seed.galleryReorderMediaFileName}`);
  const targetHandle = page.getByLabel(`Reorder ${seed.galleryMediaFileName}`);

  await expect(sourceHandle).toBeAttached({ timeout: 20_000 });
  await expect(targetHandle).toBeAttached({ timeout: 20_000 });
  await sourceHandle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');

  return responsePromise;
}

async function removeUnitAndWaitForUpdate(page: Page, unitName: string) {
  const unitCard = page
    .getByText(unitName)
    .locator('xpath=ancestor::div[contains(@class,"group")]')
    .first();
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await unitCard.hover();
  await page.getByLabel(`Remove ${unitName}`).click();
  return responsePromise;
}

async function movePrimaryUnitDownAndWaitForUpdate(page: Page, seed: Seed) {
  const unitCard = page
    .getByText(seed.unitName)
    .locator('xpath=ancestor::div[contains(@class,"group")]')
    .first();
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await unitCard.hover();
  await page.getByLabel(`Move ${seed.unitName} down`).click();
  return responsePromise;
}

function getUnitPricingFieldLabel(lane: Lane) {
  if (lane.name === 'rental') return 'Monthly Rent From';
  if (lane.name === 'auction') return 'Starting Bid';
  return 'Base Price (Starting From)';
}

function getUnitPricingPayloadField(lane: Lane) {
  if (lane.name === 'rental') return 'monthlyRentFrom';
  if (lane.name === 'auction') return 'startingBid';
  return 'basePriceFrom';
}

function formatRand(value: number) {
  return `R ${Math.round(value).toLocaleString('en-ZA')}`;
}

function formatSearchRand(value: number) {
  return `R ${Math.round(value).toLocaleString('en-US')}`;
}

function getLeadContext(row: any) {
  const raw = row?.affordabilityData;
  if (!raw) return {};
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.leadContext ?? {};
}

function getSearchRoute(lane: Lane) {
  const query = new URLSearchParams({
    city: lane.expectedCity,
    province: lane.expectedProvinceSlug,
    listingSource: 'development',
  });

  if (lane.name === 'rental') return `/property-to-rent?${query.toString()}`;
  if (lane.name === 'auction') {
    query.set('listingType', 'auction');
    return `/property-for-sale?${query.toString()}`;
  }
  return `/property-for-sale?${query.toString()}`;
}

function getSearchPriceText(lane: Lane, value: number) {
  if (lane.name === 'rental') return `Rent from ${formatSearchRand(value)}`;
  if (lane.name === 'auction') return `Bid from ${formatSearchRand(value)}`;
  return `From ${formatSearchRand(value)}`;
}

function getLeadSubmitLabel(lane: Lane) {
  if (lane.name === 'rental') return 'Send Rental Enquiry';
  if (lane.name === 'auction') return 'Send Auction Enquiry';
  return 'Send Enquiry';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateUnitPricingWithoutWaitingForResponse(
  page: Page,
  seed: Seed,
  lane: Lane,
  value: number,
) {
  const unitCard = page
    .getByText(seed.unitName)
    .locator('xpath=ancestor::div[contains(@class,"group")]')
    .first();
  await unitCard.hover();
  await page.getByLabel(`Edit ${seed.unitName}`).click();
  await expect(page.getByRole('heading', { name: 'Edit Unit Type' })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('tab', { name: 'Basic Info' }).click();
  await page
    .getByPlaceholder('Highlight unique features...')
    .fill(`Updated ${lane.name} unit package for edit autosave proof.`);
  await page
    .locator('label')
    .filter({ hasText: 'Unit Size' })
    .first()
    .locator('xpath=following::input[1]')
    .fill(lane.name === 'auction' ? '162' : lane.name === 'sale' ? '118' : '82');

  await page.getByRole('tab', { name: 'Pricing' }).click();
  const pricingInput = page
    .locator('label')
    .filter({ hasText: getUnitPricingFieldLabel(lane) })
    .first()
    .locator('xpath=following::input[1]');
  await pricingInput.fill(String(value));

  await page.getByRole('tab', { name: 'Stock' }).click();
  await page.getByRole('button', { name: 'Update Unit Type' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Unit Type' })).toBeHidden({
    timeout: 10_000,
  });
}

async function updateUnitPricingAndWaitForUpdate(page: Page, seed: Seed, lane: Lane, value: number) {
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/trpc/developer.updateDevelopment') &&
      response.request().method() === 'POST',
    { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
  );

  await updateUnitPricingWithoutWaitingForResponse(page, seed, lane, value);
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

function expectMediaPayload(request: Request, options: { requireLocalUpload?: boolean } = {}) {
  const { requireLocalUpload = true } = options;
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'development_media',
  });
  if (requireLocalUpload) {
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
  }
  return input.data;
}

function expectUnitPayload(request: Request, lane: Lane, seed: Seed, value: number) {
  const input = getTrpcRequestInput(request);
  const pricingField = getUnitPricingPayloadField(lane);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'unit_types',
  });
  expect(input.data.unitTypes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: seed.unitId,
        name: seed.unitName,
        [pricingField]: value,
      }),
    ]),
  );
  expect(input.data.stepData).toMatchObject({
    unit_types: {
      unitTypes: expect.arrayContaining([
        expect.objectContaining({
          id: seed.unitId,
          [pricingField]: value,
        }),
      ]),
    },
  });
  if (lane.name === 'rental') {
    expect(input.data.monthlyRentFrom).toBe(value);
  } else if (lane.name === 'auction') {
    expect(input.data.startingBidFrom).toBe(value);
  } else {
    expect(input.data.priceFrom).toBe(value);
  }
  return input.data;
}

function expectUnitRemovalPayload(request: Request, seed: Seed) {
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'unit_types',
  });

  const payloadUnits = asArray(input.data.unitTypes);
  const stepUnits = asArray(input.data.stepData?.unit_types?.unitTypes);
  expect(payloadUnits.some(unit => unit?.id === seed.unitId)).toBe(true);
  expect(stepUnits.some(unit => unit?.id === seed.unitId)).toBe(true);
  expect(payloadUnits.some(unit => unit?.id === seed.removableUnitId)).toBe(false);
  expect(stepUnits.some(unit => unit?.id === seed.removableUnitId)).toBe(false);

  return input.data;
}

function getSeededUnitOrder(units: any[], seed: Seed): string[] {
  return units
    .map(unit => unit?.id)
    .filter((id): id is string => id === seed.unitId || id === seed.removableUnitId);
}

function expectOriginalSeededUnitOrder(units: any[], seed: Seed) {
  expect(getSeededUnitOrder(units, seed)).toEqual([seed.unitId, seed.removableUnitId]);
}

function expectReorderedSeededUnitOrder(units: any[], seed: Seed) {
  expect(getSeededUnitOrder(units, seed)).toEqual([seed.removableUnitId, seed.unitId]);
}

function expectUnitReorderPayload(request: Request, seed: Seed) {
  const input = getTrpcRequestInput(request);
  expect(input.data).toMatchObject({
    canonicalUpdateMode: 'partial_step',
    currentStepId: 'unit_types',
  });

  const payloadUnits = asArray(input.data.unitTypes);
  const stepUnits = asArray(input.data.stepData?.unit_types?.unitTypes);
  expectReorderedSeededUnitOrder(payloadUnits, seed);
  expectReorderedSeededUnitOrder(stepUnits, seed);

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

function expectPayloadOwnsOnlyUnitTypes(data: Record<string, unknown>) {
  for (const field of [
    'address',
    'city',
    'province',
    'suburb',
    'postalCode',
    'description',
    'tagline',
    'highlights',
    'images',
    'videos',
    'floorPlans',
    'brochures',
    'monthlyLevyFrom',
    'ratesFrom',
  ]) {
    expect(data).not.toHaveProperty(field);
  }
  expect(data.stepData).not.toHaveProperty('location');
  expect(data.stepData).not.toHaveProperty('marketing_summary');
  expect(data.stepData).not.toHaveProperty('development_media');
  expect(data.stepData).not.toHaveProperty('governance_finances');
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

function getMediaPayloadUrls(data: Record<string, any>): string[] {
  const imageUrls = asArray(data.images)
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string');
  const stepUrls = asArray(data.stepData?.development_media?.photos)
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string');
  return Array.from(new Set([...imageUrls, ...stepUrls]));
}

function getGeneralMediaPayloadUrls(data: Record<string, any>): string[] {
  return asArray(data.stepData?.development_media?.photos)
    .filter(image => image?.category === 'general')
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string');
}

function getPersistedImageUrls(row: Awaited<ReturnType<typeof getDevelopmentRow>>): string[] {
  return asArray(row.images)
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string');
}

function getPersistedGeneralImageUrls(row: Awaited<ReturnType<typeof getDevelopmentRow>>): string[] {
  return asArray(row.images)
    .filter(image => image?.category === 'general')
    .map(image => image?.url)
    .filter((url): url is string => typeof url === 'string');
}

function expectReorderedGalleryUrls(urls: string[], seed: Seed) {
  const seededGalleryUrls = urls.filter(
    url => url === seed.galleryMediaUrl || url === seed.galleryReorderMediaUrl,
  );
  expect(seededGalleryUrls).toEqual([seed.galleryReorderMediaUrl, seed.galleryMediaUrl]);
}

function expectOriginalGalleryUrls(urls: string[], seed: Seed) {
  const seededGalleryUrls = urls.filter(
    url => url === seed.galleryMediaUrl || url === seed.galleryReorderMediaUrl,
  );
  expect(seededGalleryUrls).toEqual([seed.galleryMediaUrl, seed.galleryReorderMediaUrl]);
}

async function expectUnitPricingValue(seed: Seed, lane: Lane, value: number) {
  const unit = await getUnitById(seed.developmentId, seed.unitId);
  expect(unit).toMatchObject({
    id: seed.unitId,
    name: seed.unitName,
  });
  if (lane.name === 'sale') {
    expect(Number(unit.priceFrom ?? unit.basePriceFrom)).toBe(value);
    return;
  }
  expect(Number(unit[getUnitPricingPayloadField(lane)])).toBe(value);
}

async function expectUnitPresence(seed: Seed, unitId: string, shouldExist: boolean) {
  const units = await getUnits(seed.developmentId);
  expect(units.some(unit => unit?.id === unitId)).toBe(shouldExist);
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

async function expectCommercialPackagePreservedExceptUnitPricing(
  seed: Seed,
  baseline: Awaited<ReturnType<typeof getDevelopmentRow>>,
) {
  const row = await getDevelopmentRow(seed.developmentId);
  expect(row.description).toBe(baseline.description);
  expect(row.address).toBe(baseline.address);
  expect(row.city).toBe(baseline.city);
  expect(row.province).toBe(baseline.province);
  expect(row.suburb).toBe(baseline.suburb);
  expect(row.postalCode).toBe(baseline.postalCode);
  expect(row.monthlyLevyFrom).toEqual(baseline.monthlyLevyFrom);
  expect(row.ratesFrom).toEqual(baseline.ratesFrom);
  expect(row.approvalStatus).toBe('approved');
  expect(asArray(row.images).some(image => image?.url === seed.mediaUrl)).toBe(true);
  return row;
}

async function expectCommercialPackagePreservedExceptMedia(
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
  await lane.expectUnitPreserved(seed);
  expect(row.address).toBe(baseline.address);
  return row;
}

async function expectPublicOutputForEditedUnit(page: Page, seed: Seed, lane: Lane, value: number) {
  await expect(page.getByText(seed.unitName).first()).toBeVisible();
  const label =
    lane.name === 'rental' ? 'Rent From' : lane.name === 'auction' ? 'Starting Bid' : 'Price From';
  await expect(
    page
      .locator('#commercial-pack')
      .getByText(new RegExp(`${escapeRegExp(label)}\\s+${escapeRegExp(formatRand(value))}`))
      .first(),
  ).toBeVisible();
}

async function expectPublicReorderedUnitCards(page: Page, seed: Seed) {
  await page.goto(`/development/${seed.slug}`);
  await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
    timeout: 20_000,
  });

  const availableUnits = page.locator('#available-units');
  const movedFirstUnit = availableUnits.getByText(/Remove Autosave/).first();
  await expect(movedFirstUnit).toBeVisible({ timeout: 20_000 });

  const tabTriggers = availableUnits.getByRole('tab');
  await expect(tabTriggers.first()).toHaveAttribute('data-state', 'active');
  await expect(tabTriggers.first()).toContainText(/Bedroom|Other|Studio|Unknown/);
  await expect(tabTriggers.nth(1)).toBeVisible();

  await tabTriggers.nth(1).click();
  await expect(availableUnits.getByText(/Edit Autosave/).first()).toBeVisible({
    timeout: 10_000,
  });
}

async function expectSearchCardForEditedUnit(page: Page, seed: Seed, lane: Lane, value: number) {
  await page.goto(getSearchRoute(lane));
  await expect(page.getByText(seed.unitName).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(getSearchPriceText(lane, value)).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function submitEditedUnitLeadAndExpectContext(
  page: Page,
  seed: Seed,
  lane: Lane,
  value: number,
) {
  const leadEmail = `dle-edit-autosave-${lane.name}-lead-${Date.now()}@example.com`;

  await page.goto(`/development/${seed.slug}`);
  await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
    timeout: 20_000,
  });
  await expectPublicOutputForEditedUnit(page, seed, lane, value);

  await page
    .getByRole('button', {
      name: /Request Callback|Request Rental Details|Register Auction Interest|Request Auction Details/i,
    })
    .first()
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(`Unit: ${seed.unitName}`).first()).toBeVisible();
  await expect(
    dialog.getByText(lane.expectedLeadPriceLabel, { exact: false }).first(),
  ).toBeVisible();

  await page.getByPlaceholder('Full name').fill(`DLE ${lane.name} autosave lead`);
  await page.getByPlaceholder('Email address').fill(leadEmail);
  await page.getByPlaceholder('Phone number').fill('0820000000');
  await page
    .getByPlaceholder('Message (optional)')
    .fill('Please send the autosaved transaction-specific development pack.');
  await page.getByRole('button', { name: getLeadSubmitLabel(lane) }).click();

  const db = await getDb();
  expect(db).toBeTruthy();
  await expect
    .poll(
      async () => {
        const [lead] = await db!.select().from(leads).where(eq(leads.email, leadEmail)).limit(1);
        return lead ?? null;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();

  const [lead] = await db!.select().from(leads).where(eq(leads.email, leadEmail)).limit(1);
  const leadContext = getLeadContext(lead);

  expect(Number(lead.developmentId)).toBe(seed.developmentId);
  expect(lead.unitId).toBe(seed.unitId);
  expect(lead.unitName).toBe(seed.unitName);
  expect(lead.leadSource).toBe('development_detail_contact');
  expect(lead.funnelStage).toBe('interest');
  expect(leadContext.transactionType).toBe(lane.expectedLeadTransactionType);
  expect(leadContext.unitPriceLabel).toBe(lane.expectedLeadPriceLabel);
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

      test('does not let stale successful marketing autosave claim a newer edit is saved', async ({
        page,
      }) => {
        await openMarketingSummary(page, seed);
        const { releaseFirstSuccess, updateRequests } =
          await interceptFirstSuccessfulUpdateUntilReleased(page);
        const olderDescription =
          `Older ${lane.name} edit autosave response must not claim the newer copy is saved.`;
        const newerDescription =
          `Newer ${lane.name} edit autosave copy must remain unsaved until its own response succeeds.`;

        const firstResponsePromise = page.waitForResponse(
          response =>
            response.url().includes('/api/trpc/developer.updateDevelopment') &&
            response.request().method() === 'POST',
          { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
        );
        await fillDescriptionWithoutWaitingForResponse(page, olderDescription);
        await waitForUpdateRequestCount(updateRequests, 1);
        const olderPayload = expectMarketingPayload(updateRequests[0], olderDescription);
        expectPayloadOwnsOnlyMarketing(olderPayload, lane);

        await fillDescriptionWithoutWaitingForResponse(page, newerDescription);
        releaseFirstSuccess();
        const firstResponse = await firstResponsePromise;
        expect(getTrpcResponseData(await firstResponse.json())).toMatchObject({ success: true });

        await expect(page.getByText('Saved', { exact: true })).toBeHidden({ timeout: 1_000 });
        await expect(page.getByText('Manual save ready', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        const afterStaleSuccess = await getDevelopmentRow(seed.developmentId);
        expect(afterStaleSuccess.description).not.toBe(newerDescription);

        await waitForUpdateRequestCount(updateRequests, 2);
        const newerPayload = expectMarketingPayload(updateRequests[1], newerDescription);
        expectPayloadOwnsOnlyMarketing(newerPayload, lane);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        const afterNewerSuccess = await expectBaselinePreserved(seed, lane, newerDescription);
        expect(afterNewerSuccess.approvalStatus).toBe('approved');
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

      test('keeps failed media reorder visible and retries latest partial media payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        expectOriginalGalleryUrls(getPersistedGeneralImageUrls(baseline), seed);

        await openMedia(page, seed);
        await expect(page.getByText('Interior & Living')).toBeVisible({ timeout: 20_000 });
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await reorderGeneralGalleryAndWaitForUpdate(page, seed);
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        expect(updateRequests).toHaveLength(1);
        const failedData = expectMediaPayload(updateRequests[0], {
          requireLocalUpload: false,
        });
        expectPayloadOwnsOnlyMedia(failedData, lane);
        expectReorderedGalleryUrls(getGeneralMediaPayloadUrls(failedData), seed);

        const afterFailure = await expectCommercialPackagePreservedExceptMedia(
          seed,
          lane,
          baseline,
        );
        expectOriginalGalleryUrls(getPersistedGeneralImageUrls(afterFailure), seed);

        const retryResponse = await uploadGalleryImageAndWaitForUpdate(
          page,
          `retry-after-reorder-${lane.name}-media.png`,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectMediaPayload(updateRequests[1]);
        expectPayloadOwnsOnlyMedia(retryData, lane);
        expectReorderedGalleryUrls(getGeneralMediaPayloadUrls(retryData), seed);
        const retryUrls = getUploadedMediaUrls(retryData);

        const afterRetry = await expectCommercialPackagePreservedExceptMedia(seed, lane, baseline);
        expectReorderedGalleryUrls(getPersistedGeneralImageUrls(afterRetry), seed);
        const afterRetryUrls = getPersistedImageUrls(afterRetry);
        for (const retryUrl of retryUrls) {
          expect(afterRetryUrls).toContain(retryUrl);
        }
      });

      test('does not let stale successful media autosave claim newer media is saved', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openMedia(page, seed);
        const { releaseFirstSuccess, updateRequests } =
          await interceptFirstSuccessfulUpdateUntilReleased(page);

        const firstResponsePromise = page.waitForResponse(
          response =>
            response.url().includes('/api/trpc/developer.updateDevelopment') &&
            response.request().method() === 'POST',
          { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
        );

        await uploadGalleryImageWithoutWaitingForResponse(
          page,
          `older-stale-${lane.name}-media.png`,
        );
        await waitForUpdateRequestCount(updateRequests, 1);
        const olderPayload = expectMediaPayload(updateRequests[0]);
        expectPayloadOwnsOnlyMedia(olderPayload, lane);
        const olderUploadUrls = getUploadedMediaUrls(olderPayload);
        expect(olderUploadUrls.length).toBeGreaterThan(0);

        await uploadGalleryImageWithoutWaitingForResponse(
          page,
          `newer-stale-${lane.name}-media.png`,
        );
        releaseFirstSuccess();
        const firstResponse = await firstResponsePromise;
        expect(getTrpcResponseData(await firstResponse.json())).toMatchObject({ success: true });

        await expect(page.getByText('Saved', { exact: true })).toBeHidden({ timeout: 1_000 });
        await expect(page.getByText('Manual save ready', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        const afterStaleSuccess = await expectCommercialPackagePreservedExceptMedia(
          seed,
          lane,
          baseline,
        );
        const staleSuccessUrls = getPersistedImageUrls(afterStaleSuccess);
        for (const olderUploadUrl of olderUploadUrls) {
          expect(staleSuccessUrls).not.toContain(olderUploadUrl);
        }

        await waitForUpdateRequestCount(updateRequests, 2);
        const newerPayload = expectMediaPayload(updateRequests[1]);
        expectPayloadOwnsOnlyMedia(newerPayload, lane);
        const newerUploadUrls = getUploadedMediaUrls(newerPayload);
        expect(newerUploadUrls.length).toBeGreaterThan(olderUploadUrls.length);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        const afterNewerSuccess = await expectCommercialPackagePreservedExceptMedia(
          seed,
          lane,
          baseline,
        );
        const newerSuccessUrls = getPersistedImageUrls(afterNewerSuccess);
        for (const newerUploadUrl of newerUploadUrls) {
          expect(newerSuccessUrls).toContain(newerUploadUrl);
        }
      });

      test('keeps failed media removal visible and retries latest partial media payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openMedia(page, seed);

        const updateRequests = await interceptFirstFailedUpdate(page);
        const failedRemoveResponse = await removeGalleryImageAndWaitForUpdate(
          page,
          seed.mediaUrl,
        );
        expect(getTrpcResponseData(await failedRemoveResponse.json())).toMatchObject({
          success: false,
        });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        expect(updateRequests).toHaveLength(1);
        const failedRemoveData = expectMediaPayload(updateRequests[0], {
          requireLocalUpload: false,
        });
        expectPayloadOwnsOnlyMedia(failedRemoveData, lane);
        expect(getMediaPayloadUrls(failedRemoveData)).not.toContain(seed.mediaUrl);

        const afterFailedRemove = await expectCommercialPackagePreservedExceptMedia(
          seed,
          lane,
          baseline,
        );
        expect(getPersistedImageUrls(afterFailedRemove)).toContain(seed.mediaUrl);

        const retryResponse = await uploadGalleryImageAndWaitForUpdate(
          page,
          `retry-after-remove-${lane.name}-media.png`,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectMediaPayload(updateRequests[1]);
        expectPayloadOwnsOnlyMedia(retryData, lane);
        const retryUrls = getUploadedMediaUrls(retryData);
        expect(getMediaPayloadUrls(retryData)).not.toContain(seed.mediaUrl);

        const afterRetry = await expectCommercialPackagePreservedExceptMedia(seed, lane, baseline);
        const afterRetryUrls = getPersistedImageUrls(afterRetry);
        expect(afterRetryUrls).not.toContain(seed.mediaUrl);
        for (const retryUrl of retryUrls) {
          expect(afterRetryUrls).toContain(retryUrl);
        }
      });

      test('keeps failed unit autosave visible and retries latest partial unit payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openUnitTypes(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.failedUnitValue,
        );
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-unit-failure-visible.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(1);
        const failedData = expectUnitPayload(
          updateRequests[0],
          lane,
          seed,
          lane.failedUnitValue,
        );
        expectPayloadOwnsOnlyUnitTypes(failedData);
        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await lane.expectUnitPreserved(seed);

        const retryResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.retryUnitValue,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-unit-retry-saved.png`,
          fullPage: true,
        });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectUnitPayload(
          updateRequests[1],
          lane,
          seed,
          lane.retryUnitValue,
        );
        expectPayloadOwnsOnlyUnitTypes(retryData);

        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await expectUnitPricingValue(seed, lane, lane.retryUnitValue);

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await expectPublicOutputForEditedUnit(page, seed, lane, lane.retryUnitValue);
        await page.screenshot({
          path: `docs/dle/evidence/2026-06-22/qa-dle-${lane.name}-edit-autosave-unit-public-preserved.png`,
          fullPage: true,
        });
      });

      test('does not let stale successful unit autosave claim a newer unit edit is saved', async ({
        page,
      }) => {
        await openUnitTypes(page, seed);
        const { releaseFirstSuccess, updateRequests } =
          await interceptFirstSuccessfulUpdateUntilReleased(page);

        const firstResponsePromise = page.waitForResponse(
          response =>
            response.url().includes('/api/trpc/developer.updateDevelopment') &&
            response.request().method() === 'POST',
          { timeout: AUTOSAVE_RESPONSE_TIMEOUT_MS },
        );

        await updateUnitPricingWithoutWaitingForResponse(
          page,
          seed,
          lane,
          lane.failedUnitValue,
        );
        await waitForUpdateRequestCount(updateRequests, 1);
        const olderPayload = expectUnitPayload(updateRequests[0], lane, seed, lane.failedUnitValue);
        expectPayloadOwnsOnlyUnitTypes(olderPayload);

        await updateUnitPricingWithoutWaitingForResponse(
          page,
          seed,
          lane,
          lane.retryUnitValue,
        );
        releaseFirstSuccess();
        const firstResponse = await firstResponsePromise;
        expect(getTrpcResponseData(await firstResponse.json())).toMatchObject({ success: true });

        await expect(page.getByText('Saved', { exact: true })).toBeHidden({ timeout: 1_000 });
        await expect(page.getByText('Manual save ready', { exact: true })).toBeVisible({
          timeout: 10_000,
        });
        const afterStaleSuccessUnit = await getFirstUnit(seed.developmentId);
        expect(Number(afterStaleSuccessUnit[getUnitPricingPayloadField(lane)])).not.toBe(
          lane.retryUnitValue,
        );

        await waitForUpdateRequestCount(updateRequests, 2);
        const newerPayload = expectUnitPayload(updateRequests[1], lane, seed, lane.retryUnitValue);
        expectPayloadOwnsOnlyUnitTypes(newerPayload);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        await expectUnitPricingValue(seed, lane, lane.retryUnitValue);
      });

      test('keeps failed unit reorder visible and retries latest partial unit payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        expectOriginalSeededUnitOrder(await getUnits(seed.developmentId), seed);

        await openUnitTypes(page, seed);
        await expect(page.getByText(seed.unitName).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(seed.removableUnitName).first()).toBeVisible({
          timeout: 10_000,
        });
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedReorderResponse = await movePrimaryUnitDownAndWaitForUpdate(page, seed);
        expect(getTrpcResponseData(await failedReorderResponse.json())).toMatchObject({
          success: false,
        });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        expect(updateRequests).toHaveLength(1);
        const failedReorderData = expectUnitReorderPayload(updateRequests[0], seed);
        expectPayloadOwnsOnlyUnitTypes(failedReorderData);
        expectOriginalSeededUnitOrder(await getUnits(seed.developmentId), seed);

        const retryResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.retryUnitValue,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectUnitPayload(updateRequests[1], lane, seed, lane.retryUnitValue);
        expectPayloadOwnsOnlyUnitTypes(retryData);
        expectReorderedSeededUnitOrder(asArray(retryData.unitTypes), seed);
        expectReorderedSeededUnitOrder(asArray(retryData.stepData?.unit_types?.unitTypes), seed);

        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await expectUnitPricingValue(seed, lane, lane.retryUnitValue);
        expectReorderedSeededUnitOrder(await getUnits(seed.developmentId), seed);
        await expectPublicReorderedUnitCards(page, seed);
      });

      test('keeps failed unit removal visible and retries latest partial unit payload', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openUnitTypes(page, seed);
        await expect(page.getByText(seed.removableUnitName).first()).toBeVisible({
          timeout: 10_000,
        });
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedRemoveResponse = await removeUnitAndWaitForUpdate(
          page,
          seed.removableUnitName,
        );
        expect(getTrpcResponseData(await failedRemoveResponse.json())).toMatchObject({
          success: false,
        });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        expect(updateRequests).toHaveLength(1);
        const failedRemoveData = expectUnitRemovalPayload(updateRequests[0], seed);
        expectPayloadOwnsOnlyUnitTypes(failedRemoveData);
        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await lane.expectUnitPreserved(seed);
        await expectUnitPresence(seed, seed.removableUnitId, true);

        const retryResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.retryUnitValue,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

        expect(updateRequests).toHaveLength(2);
        const retryData = expectUnitPayload(updateRequests[1], lane, seed, lane.retryUnitValue);
        expectPayloadOwnsOnlyUnitTypes(retryData);
        expect(asArray(retryData.unitTypes).some(unit => unit?.id === seed.removableUnitId)).toBe(
          false,
        );
        expect(
          asArray(retryData.stepData?.unit_types?.unitTypes).some(
            unit => unit?.id === seed.removableUnitId,
          ),
        ).toBe(false);

        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await expectUnitPricingValue(seed, lane, lane.retryUnitValue);
        await expectUnitPresence(seed, seed.removableUnitId, false);

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await expectPublicOutputForEditedUnit(page, seed, lane, lane.retryUnitValue);
        await expect(page.getByText(seed.removableUnitName).first()).toBeHidden({
          timeout: 10_000,
        });
      });

      test('retry payload owns only unit fields', async ({ page }) => {
        await openUnitTypes(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        await updateUnitPricingAndWaitForUpdate(page, seed, lane, lane.failedUnitValue);
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 20_000,
        });

        await updateUnitPricingAndWaitForUpdate(page, seed, lane, lane.retryUnitValue);
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 15_000 });

        expect(updateRequests.length).toBeGreaterThanOrEqual(2);
        const retryData = expectUnitPayload(
          updateRequests[updateRequests.length - 1],
          lane,
          seed,
          lane.retryUnitValue,
        );
        expectPayloadOwnsOnlyUnitTypes(retryData);
      });

      test('keeps search card and lead context transaction-native after unit autosave', async ({
        page,
      }) => {
        const baseline = await getDevelopmentRow(seed.developmentId);
        await openUnitTypes(page, seed);
        const updateRequests = await interceptFirstFailedUpdate(page);

        const failedResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.failedUnitValue,
        );
        expect(getTrpcResponseData(await failedResponse.json())).toMatchObject({ success: false });
        await expect(page.getByText('Save Failed', { exact: true })).toBeVisible({
          timeout: 10_000,
        });

        const retryResponse = await updateUnitPricingAndWaitForUpdate(
          page,
          seed,
          lane,
          lane.merchandisingUnitValue,
        );
        expect(retryResponse.ok()).toBeTruthy();
        expect(getTrpcResponseData(await retryResponse.json())).toMatchObject({ success: true });
        await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

        expect(updateRequests).toHaveLength(2);
        const failedData = expectUnitPayload(updateRequests[0], lane, seed, lane.failedUnitValue);
        const retryData = expectUnitPayload(
          updateRequests[1],
          lane,
          seed,
          lane.merchandisingUnitValue,
        );
        expectPayloadOwnsOnlyUnitTypes(failedData);
        expectPayloadOwnsOnlyUnitTypes(retryData);

        await expectCommercialPackagePreservedExceptUnitPricing(seed, baseline);
        await expectUnitPricingValue(seed, lane, lane.merchandisingUnitValue);

        await page.goto(`/development/${seed.slug}`);
        await expect(page.getByRole('heading', { name: seed.developmentName })).toBeVisible({
          timeout: 20_000,
        });
        await expectPublicOutputForEditedUnit(page, seed, lane, lane.merchandisingUnitValue);

        await expectSearchCardForEditedUnit(page, seed, lane, lane.merchandisingUnitValue);
        await submitEditedUnitLeadAndExpectContext(
          page,
          seed,
          lane,
          lane.merchandisingUnitValue,
        );
      });
    });
  }
});

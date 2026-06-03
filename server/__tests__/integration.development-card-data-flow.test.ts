import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const { mockSearchProperties } = vi.hoisted(() => ({
  mockSearchProperties: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developers, developments, users } from '../../drizzle/schema';
import { developmentService } from '../services/developmentService';
import { buildDevelopmentUpdatePayload } from '../../client/src/lib/developmentSubmitPayload';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('Development Card Data Flow Integration', () => {
  let createdDevelopmentId: number | null = null;
  let createdDeveloperId: number | null = null;
  let createdUserId: number | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockSearchProperties.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  async function createApprovedDeveloper(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    suffix: number,
    label: string,
  ) {
    const userInsertResult = await db.insert(users).values({
      email: `${label}-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: label,
      lastName: 'Flow',
      name: `${label} Flow User`,
      emailVerified: 1,
    });
    const testUserId = Number(userInsertResult[0].insertId);
    createdUserId = testUserId;

    const insertResult = await db.insert(developers).values({
      userId: testUserId,
      name: `${label} Builder ${suffix}`,
      email: `${label}-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    return {
      testUserId,
      builderName: `${label} Builder ${suffix}`,
    };
  }

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentId) {
      await db.delete(developments).where(eq(developments.id, createdDevelopmentId));
      createdDevelopmentId = null;
    }

    if (createdDeveloperId) {
      await db.delete(developers).where(eq(developers.id, createdDeveloperId));
      createdDeveloperId = null;
    }

    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
      createdUserId = null;
    }
  });

  it('keeps wizard-origin development fields intact through properties.search includeDevelopments', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const builderName = `Card Flow Builder ${suffix}`;
    const developmentName = `Card Flow Development ${suffix}`;
    const unitTypeId = `card-unit-${suffix}`;
    const description =
      'This description is created in the wizard flow and should be shown exactly on result cards.';
    const highlights = ['24-Hour Security', 'Prime Location', 'Lifestyle Amenities'];
    const videos = ['https://example.com/card-flow-video.mp4'];
    const floorPlans = ['https://example.com/card-flow-floorplan.pdf'];
    const brochures = ['https://example.com/card-flow-brochure.pdf'];

    const userInsertResult = await db!.insert(users).values({
      email: `card-flow-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Card',
      lastName: 'Flow',
      name: 'Card Flow User',
      emailVerified: 1,
    });
    const testUserId = Number(userInsertResult[0].insertId);
    createdUserId = testUserId;

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: builderName,
      email: `card-flow-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '1 Card Flow Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      ownershipType: 'sectional-title',
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description,
      highlights,
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Card+Flow' }],
      videos,
      floorPlans,
      brochures,
      unitTypes: [
        {
          id: unitTypeId,
          name: '2 Bed Apartment',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 70,
          yardSize: 0,
          priceFrom: 1200000,
          totalUnits: 10,
          availableUnits: 10,
          parkingType: 'none',
          parkingBays: 0,
          description: 'Card-flow test unit type',
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    const [publishedState] = await db!
      .select({
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(Number(publishedState?.isPublished ?? 0)).toBe(1);
    expect(publishedState?.approvalStatus).toBe('approved');
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city: 'Johannesburg',
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toBeTruthy();
    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      city: 'Johannesburg',
      suburb: 'Berea',
      province: 'Gauteng',
      status: 'selling',
      isFeatured: false,
      description,
      highlights,
      builderName,
    });

    expect(Array.isArray(matched.images)).toBe(true);
    expect(matched.images.length).toBeGreaterThan(0);
    expect(matched.videos).toEqual(videos);
    expect(matched.floorPlans).toEqual(floorPlans);
    expect(matched.brochures).toEqual(brochures);
    expect(matched.media).toMatchObject({
      photos: matched.images,
      videos,
      floorPlans,
      brochures,
      documents: brochures,
    });
    expect(Array.isArray(matched.configurations)).toBe(true);
    expect(matched.configurations.length).toBeGreaterThan(0);
    expect(matched.configurations[0]).toMatchObject({
      unitTypeId,
      label: '2 Bed Apartment',
      priceFrom: 1200000,
    });

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
    });

    expect(detail).toBeTruthy();
    expect(detail?.videos).toEqual(videos);
    expect(detail?.floorPlans).toEqual(floorPlans);
    expect(detail?.brochures).toEqual(brochures);
    expect(detail?.media).toMatchObject({
      photos: detail?.images,
      videos,
      floorPlans,
      brochures,
      documents: brochures,
    });
    expect(detail?.unitTypes?.[0]).toMatchObject({
      id: unitTypeId,
      name: '2 Bed Apartment',
    });
  });

  it('uses rental unit inventory for public development configurations instead of stale sale shadows', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(db!, suffix, 'Rental Card');
    const developmentName = `Rental Card Development ${suffix}`;

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '11 Rental Card Road',
      city: `Rental City ${suffix}`,
      province: 'Gauteng',
      suburb: 'Rentview',
      status: 'leasing',
      ownershipType: 'sectional-title',
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description:
        'Rental public search should use monthly rent fields from canonical unit inventory.',
      highlights: ['Pet friendly', 'Fibre ready', 'Security'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Rental+Card' }],
      unitTypes: [
        {
          name: 'Rental 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 70,
          yardSize: 0,
          priceFrom: 2200000,
          priceTo: 2400000,
          monthlyRentFrom: 12500,
          monthlyRentTo: 14500,
          totalUnits: 10,
          availableUnits: 6,
          parkingType: 'covered',
          parkingBays: 1,
          description: 'Rental card test unit type',
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city: `Rental City ${suffix}`,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      transactionType: 'for_rent',
      monthlyRentFrom: 12500,
      monthlyRentTo: 14500,
      priceFrom: null,
      priceTo: null,
      builderName,
    });
    expect(matched.configurations[0]).toMatchObject({
      label: 'Rental 2 Bed',
      listingType: 'rent',
      priceFrom: 12500,
      priceTo: 14500,
    });
  });

  it('preserves published rental ownership across partial edits and public output', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(
      db!,
      suffix,
      'Rental Ownership',
    );
    const developmentName = `Rental Ownership Development ${suffix}`;
    const unitTypeId = `rental-own-${suffix}`;
    const city = `Rental Ownership City ${suffix}`;
    const originalImages = [
      { url: 'https://example.com/rental-ownership-original-hero.jpg' },
    ];
    const updatedImages = [
      { url: 'https://example.com/rental-ownership-updated-hero.jpg' },
    ];
    const updatedVideos = ['https://example.com/rental-ownership-updated-video.mp4'];
    const updatedFloorPlans = ['https://example.com/rental-ownership-updated-plan.pdf'];
    const updatedBrochures = ['https://example.com/rental-ownership-updated-brochure.pdf'];

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_rent',
      address: '21 Rental Ownership Road',
      city,
      province: 'Gauteng',
      suburb: 'Leaseview',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description:
        'Published rental ownership proof keeps monthly rent and inventory stable across edits.',
      highlights: ['Lease-ready units', 'Fibre ready', 'Secure access'],
      images: originalImages,
      videos: ['https://example.com/rental-ownership-original-video.mp4'],
      floorPlans: ['https://example.com/rental-ownership-original-plan.pdf'],
      brochures: ['https://example.com/rental-ownership-original-brochure.pdf'],
      monthlyLevyFrom: 950,
      ratesFrom: 650,
      transferCostsIncluded: 0,
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Rental Ownership 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 72,
          priceFrom: 2_400_000,
          priceTo: 2_700_000,
          monthlyRentFrom: 12_500,
          monthlyRentTo: 14_500,
          depositRequired: 25_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 18,
          availableUnits: 11,
          reservedUnits: 3,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    async function assertRentalPublicState(expected: {
      address: string;
      suburb: string;
      images: Array<Record<string, string>>;
      videos: string[];
      floorPlans: string[];
      brochures: string[];
      description: string;
      highlights: string[];
      levyFrom: number;
      ratesFrom: number;
      transferCostsIncluded: boolean;
      unitName: string;
      bedrooms: number;
      monthlyRentFrom: number;
      monthlyRentTo: number;
      totalUnits: number;
      availableUnits: number;
    }) {
      const result = await caller.properties.search({
        city,
        province: 'Gauteng',
        limit: 20,
        offset: 0,
        includeDevelopments: true,
      });

      const developmentItems = (result as any)?.developments?.items ?? [];
      const matched = developmentItems.find(
        (dev: any) => Number(dev.id) === createdDevelopmentId,
      );

      expect(matched).toMatchObject({
        id: createdDevelopmentId,
        name: developmentName,
        city,
        suburb: expected.suburb,
        province: 'Gauteng',
        transactionType: 'for_rent',
        monthlyRentFrom: expected.monthlyRentFrom,
        monthlyRentTo: expected.monthlyRentTo,
        priceFrom: null,
        priceTo: null,
        builderName,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
      });
      expect(matched.images).toEqual(expected.images);
      expect(matched.configurations[0]).toMatchObject({
        unitTypeId,
        label: expected.unitName,
        listingType: 'rent',
        priceFrom: expected.monthlyRentFrom,
        priceTo: expected.monthlyRentTo,
      });

      const detail = await caller.developer.getPublicDevelopmentBySlug({
        slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
      });

      expect(detail).toMatchObject({
        id: createdDevelopmentId,
        name: developmentName,
        address: expected.address,
        city,
        suburb: expected.suburb,
        province: 'Gauteng',
        description: expected.description,
        priceFrom: null,
        priceTo: null,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
      });
      expect(detail?.images).toEqual(expected.images);
      expect(detail?.highlights).toEqual(expected.highlights);
      expect(Number(detail?.monthlyRentFrom)).toBe(expected.monthlyRentFrom);
      expect(Number(detail?.monthlyRentTo)).toBe(expected.monthlyRentTo);
      expect(detail?.estateSpecs).toMatchObject({
        levyRange: { min: expected.levyFrom },
        rightsAndTaxes: { min: expected.ratesFrom },
        transferCostsIncluded: expected.transferCostsIncluded,
      });
      expect(detail?.unitTypes?.[0]).toMatchObject({
        id: unitTypeId,
        name: expected.unitName,
        bedrooms: expected.bedrooms,
        totalUnits: expected.totalUnits,
        availableUnits: expected.availableUnits,
      });
      expect(Number(detail?.unitTypes?.[0]?.monthlyRentFrom)).toBe(expected.monthlyRentFrom);
      expect(Number(detail?.unitTypes?.[0]?.monthlyRentTo)).toBe(expected.monthlyRentTo);
      expect(Number(detail?.unitTypes?.[0]?.priceFrom ?? 0)).toBe(0);
      expect(detail?.media).toMatchObject({
        photos: expected.images,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
        documents: expected.brochures,
      });
    }

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_rent',
      currentStepId: 'location',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Rental Location Name',
        transactionType: 'for_rent',
        priceFrom: 900_000,
        unitTypes: [{ id: unitTypeId, priceFrom: 900_000 }],
      },
      stepData: {
        location: {
          address: '21 Rental Ownership Road Updated',
          city,
          province: 'Gauteng',
          suburb: 'Leaseview Heights',
          postalCode: '2196',
        },
        unit_types: {
          unitTypes: [{ id: unitTypeId, name: 'Stale Rental Location Unit', priceFrom: 900_000 }],
        },
      },
      address: '21 Rental Ownership Road Updated',
      city,
      province: 'Gauteng',
      suburb: 'Leaseview Heights',
      postalCode: '2196',
      priceFrom: 900_000,
      priceTo: 950_000,
    } as any);

    await assertRentalPublicState({
      address: '21 Rental Ownership Road Updated',
      suburb: 'Leaseview Heights',
      images: originalImages,
      videos: ['https://example.com/rental-ownership-original-video.mp4'],
      floorPlans: ['https://example.com/rental-ownership-original-plan.pdf'],
      brochures: ['https://example.com/rental-ownership-original-brochure.pdf'],
      description:
        'Published rental ownership proof keeps monthly rent and inventory stable across edits.',
      highlights: ['Lease-ready units', 'Fibre ready', 'Secure access'],
      levyFrom: 950,
      ratesFrom: 650,
      transferCostsIncluded: false,
      unitName: 'Rental Ownership 2 Bed',
      bedrooms: 2,
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_500,
      totalUnits: 18,
      availableUnits: 11,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_rent',
      currentStepId: 'development_media',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Rental Media Name',
        location: {
          address: '99 Stale Rental Media Road',
          city: 'Stale Rental City',
          province: 'Western Cape',
          suburb: 'Stale Rental Suburb',
        },
        monthlyRentFrom: 99_999,
      },
      stepData: {
        development_media: {
          heroImage: updatedImages[0],
          photos: [],
          videos: updatedVideos,
          floorPlans: updatedFloorPlans,
          brochures: updatedBrochures,
          documents: updatedBrochures,
        },
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Stale Rental Media Unit',
              monthlyRentFrom: 99_999,
              monthlyRentTo: 100_000,
            },
          ],
        },
      },
      address: '99 Stale Rental Media Road',
      city: 'Stale Rental City',
      province: 'Western Cape',
      monthlyRentFrom: 99_999,
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
    } as any);

    await assertRentalPublicState({
      address: '21 Rental Ownership Road Updated',
      suburb: 'Leaseview Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description:
        'Published rental ownership proof keeps monthly rent and inventory stable across edits.',
      highlights: ['Lease-ready units', 'Fibre ready', 'Secure access'],
      levyFrom: 950,
      ratesFrom: 650,
      transferCostsIncluded: false,
      unitName: 'Rental Ownership 2 Bed',
      bedrooms: 2,
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_500,
      totalUnits: 18,
      availableUnits: 11,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_rent',
      currentStepId: 'marketing_summary',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Rental Marketing Name',
        images: [{ url: 'https://example.com/stale-rental-marketing-hero.jpg' }],
        monthlyRentFrom: 88_888,
      },
      stepData: {
        marketing_summary: {
          description:
            'Updated rental marketing copy proves public highlights can change safely.',
          highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
          tagline: 'Rental ownership proof',
        },
      },
      description: 'Updated rental marketing copy proves public highlights can change safely.',
      highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
      tagline: 'Rental ownership proof',
      priceFrom: 888_888,
      monthlyRentFrom: 88_888,
    } as any);

    await assertRentalPublicState({
      address: '21 Rental Ownership Road Updated',
      suburb: 'Leaseview Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated rental marketing copy proves public highlights can change safely.',
      highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
      levyFrom: 950,
      ratesFrom: 650,
      transferCostsIncluded: false,
      unitName: 'Rental Ownership 2 Bed',
      bedrooms: 2,
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_500,
      totalUnits: 18,
      availableUnits: 11,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_rent',
      currentStepId: 'governance_finances',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Rental Governance Name',
        location: {
          address: '99 Stale Rental Governance Road',
          city: 'Stale Rental City',
          province: 'Western Cape',
        },
        monthlyRentFrom: 77_777,
      },
      stepData: {
        governance_finances: {
          levyRange: { min: 1_050, max: 1_350 },
          rightsAndTaxes: { min: 725, max: 950 },
          transferCostsIncluded: true,
        },
      },
      monthlyLevyFrom: 1_050,
      monthlyLevyTo: 1_350,
      ratesFrom: 725,
      ratesTo: 950,
      transferCostsIncluded: 1,
      address: '99 Stale Rental Governance Road',
      monthlyRentFrom: 77_777,
    } as any);

    await assertRentalPublicState({
      address: '21 Rental Ownership Road Updated',
      suburb: 'Leaseview Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated rental marketing copy proves public highlights can change safely.',
      highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
      levyFrom: 1_050,
      ratesFrom: 725,
      transferCostsIncluded: true,
      unitName: 'Rental Ownership 2 Bed',
      bedrooms: 2,
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_500,
      totalUnits: 18,
      availableUnits: 11,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      transactionType: 'for_rent',
      developmentData: {
        name: 'Stale Rental Unit Name',
        transactionType: 'for_rent',
        location: {
          address: '99 Stale Rental Unit Road',
          city: 'Stale Rental City',
          province: 'Western Cape',
        },
        priceFrom: 777_777,
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Rental Ownership 2 Bed Updated',
              bedrooms: 3,
              bathrooms: 2,
              unitSize: 82,
              priceFrom: 3_100_000,
              monthlyRentFrom: 13_500,
              monthlyRentTo: 15_500,
              depositRequired: 27_000,
              leaseTerm: '12 months',
              isFurnished: true,
              totalUnits: 20,
              availableUnits: 9,
              reservedUnits: 4,
              parkingType: 'covered',
              parkingBays: 1,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Rental Ownership 2 Bed Updated',
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 82,
          priceFrom: 3_100_000,
          monthlyRentFrom: 13_500,
          monthlyRentTo: 15_500,
          depositRequired: 27_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 20,
          availableUnits: 9,
          reservedUnits: 4,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
      priceFrom: 777_777,
      monthlyRentFrom: 13_500,
      monthlyRentTo: 15_500,
    } as any);

    await assertRentalPublicState({
      address: '21 Rental Ownership Road Updated',
      suburb: 'Leaseview Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated rental marketing copy proves public highlights can change safely.',
      highlights: ['Lease specials', 'Walkable lifestyle', 'Managed access'],
      levyFrom: 1_050,
      ratesFrom: 725,
      transferCostsIncluded: true,
      unitName: 'Rental Ownership 2 Bed Updated',
      bedrooms: 3,
      monthlyRentFrom: 13_500,
      monthlyRentTo: 15_500,
      totalUnits: 20,
      availableUnits: 9,
    });

    const [publishedState] = await db!
      .select({
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
        totalUnits: developments.totalUnits,
        availableUnits: developments.availableUnits,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(publishedState?.isPublished ?? 0)).toBe(1);
    expect(publishedState?.approvalStatus).toBe('approved');
    expect(publishedState?.priceFrom).toBeNull();
    expect(publishedState?.priceTo).toBeNull();
    expect(Number(publishedState?.monthlyRentFrom)).toBe(13_500);
    expect(Number(publishedState?.monthlyRentTo)).toBe(15_500);
    expect(Number(publishedState?.totalUnits)).toBe(20);
    expect(Number(publishedState?.availableUnits)).toBe(9);
  }, 120_000);

  it('uses edited canonical sale inventory for public search instead of stale development aggregates', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(db!, suffix, 'Sale Card');
    const developmentName = `Sale Card Development ${suffix}`;
    const unitTypeId = `saleagg-${suffix}`;
    const city = `Sale City ${suffix}`;

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '12 Sale Card Road',
      city,
      province: 'Gauteng',
      suburb: 'Saleview',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description: 'Sale public search should follow edited canonical unit inventory prices.',
      highlights: ['Inventory-owned pricing', 'Stable drafts', 'Public search ready'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Sale+Card' }],
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Sale 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 76,
          yardSize: 0,
          priceFrom: 1_200_000,
          priceTo: 1_400_000,
          totalUnits: 10,
          availableUnits: 6,
          parkingType: 'covered',
          parkingBays: 1,
          description: 'Sale card test unit type',
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      developmentData: {
        name: developmentName,
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        description: 'Sale public search should follow edited canonical unit inventory prices.',
        location: {
          address: '12 Sale Card Road',
          city,
          province: 'Gauteng',
          suburb: 'Saleview',
        },
        priceFrom: 1_200_000,
        priceTo: 1_400_000,
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Sale 2 Bed Updated',
              bedrooms: 2,
              bathrooms: 2,
              unitSize: 80,
              priceFrom: 1_500_000,
              priceTo: 1_700_000,
              totalUnits: 10,
              availableUnits: 5,
              reservedUnits: 2,
              parkingType: 'covered',
              parkingBays: 1,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Stale Root Sale 2 Bed',
          priceFrom: 1_200_000,
          priceTo: 1_400_000,
        },
      ],
      priceFrom: 1_200_000,
      priceTo: 1_400_000,
    } as any);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      transactionType: 'for_sale',
      priceFrom: 1_500_000,
      priceTo: 1_700_000,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      builderName,
    });
    expect(matched.configurations[0]).toMatchObject({
      unitTypeId,
      label: 'Sale 2 Bed Updated',
      listingType: 'sale',
      priceFrom: 1_500_000,
      priceTo: 1_700_000,
    });
  });

  it('publishes canonical unit catalogue identity and order through public development search cards', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId } = await createApprovedDeveloper(db!, suffix, 'Public Catalogue');
    const developmentName = `Public Catalogue Development ${suffix}`;
    const city = `Catalogue City ${suffix}`;
    const firstUnitTypeId = `catalogue-first-${suffix}`;
    const secondUnitTypeId = `catalogue-second-${suffix}`;

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '21 Catalogue Road',
      city,
      province: 'Gauteng',
      suburb: 'Catalogue Gardens',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description: 'Canonical unit catalogue order should survive publish into public search cards.',
      highlights: ['Stable inventory', 'Public search ready', 'Canonical unit catalogue'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Catalogue' }],
      unitTypes: [
        {
          id: secondUnitTypeId,
          name: 'Displayed Second 3 Bed',
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 104,
          priceFrom: 1_850_000,
          priceTo: 2_050_000,
          totalUnits: 6,
          availableUnits: 3,
          parkingType: 'covered',
          parkingBays: 2,
          displayOrder: 1,
        },
        {
          id: firstUnitTypeId,
          name: 'Displayed First 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 82,
          priceFrom: 1_450_000,
          priceTo: 1_650_000,
          totalUnits: 10,
          availableUnits: 7,
          parkingType: 'covered',
          parkingBays: 1,
          displayOrder: 0,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.searchDevelopmentListings({
      city,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      listingType: 'sale',
    });

    const cardsForDevelopment = ((result as any).cards ?? []).filter(
      (card: any) => Number(card.developmentId) === createdDevelopmentId,
    );
    const itemsForDevelopment = ((result as any).items ?? []).filter(
      (item: any) => Number(item.developmentId) === createdDevelopmentId,
    );

    expect(itemsForDevelopment.map((item: any) => item.unitTypeId)).toEqual([
      firstUnitTypeId,
      secondUnitTypeId,
    ]);
    expect(itemsForDevelopment.map((item: any) => item.unitDisplayOrder)).toEqual([0, 1]);
    expect(cardsForDevelopment.map((card: any) => card.unitTypeId)).toEqual([
      firstUnitTypeId,
      secondUnitTypeId,
    ]);
    expect(cardsForDevelopment.map((card: any) => card.unitDisplayOrder)).toEqual([0, 1]);
    expect(cardsForDevelopment[0]).toMatchObject({
      kind: 'development',
      developmentId: createdDevelopmentId,
      unitTypeId: firstUnitTypeId,
      unitDisplayOrder: 0,
      href: `/development/${createdDevelopment.slug}/unit/${firstUnitTypeId}`,
    });

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
    });

    expect(detail?.unitTypes?.map((unit: any) => unit.id)).toEqual([
      firstUnitTypeId,
      secondUnitTypeId,
    ]);
    expect(detail?.unitTypes?.map((unit: any) => unit.displayOrder)).toEqual([0, 1]);
  }, 60_000);

  it('keeps public location and inventory stable after canonical media partial saves', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(db!, suffix, 'Media Save');
    const developmentName = `Media Partial Development ${suffix}`;
    const unitTypeId = `media-${suffix}`;
    const city = `Media City ${suffix}`;
    const originalImages = [{ url: 'https://example.com/media-partial-original-hero.jpg' }];
    const originalVideos = ['https://example.com/media-partial-original-video.mp4'];
    const updatedImages = [{ url: 'https://example.com/media-partial-updated-hero.jpg' }];
    const updatedVideos = ['https://example.com/media-partial-updated-video.mp4'];
    const updatedFloorPlans = ['https://example.com/media-partial-updated-floorplan.pdf'];
    const updatedBrochures = ['https://example.com/media-partial-updated-brochure.pdf'];

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '31 Stable Media Road',
      city,
      province: 'Gauteng',
      suburb: 'Media Gardens',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description:
        'Media-only partial saves should update public media without owning location or inventory.',
      highlights: ['Canonical media', 'Stable public search', 'Inventory preserved'],
      images: originalImages,
      videos: originalVideos,
      monthlyLevyFrom: 1_150,
      ratesFrom: 850,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Media Stable 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 78,
          priceFrom: 1_350_000,
          priceTo: 1_550_000,
          totalUnits: 12,
          availableUnits: 7,
          reservedUnits: 2,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Media Partial Name',
        transactionType: 'for_sale',
        location: {
          address: '99 Stale Media Road',
          city: 'Stale City',
          province: 'Western Cape',
          suburb: 'Stale Suburb',
        },
        monthlyLevyFrom: 9_999,
        ratesFrom: 8_888,
        priceFrom: 900_000,
        priceTo: 950_000,
      },
      stepData: {
        development_media: {
          heroImage: updatedImages[0],
          photos: [],
          videos: updatedVideos,
          floorPlans: updatedFloorPlans,
          brochures: updatedBrochures,
          documents: updatedBrochures,
        },
        location: {
          address: '99 Stale Media Road',
          city: 'Stale City',
          province: 'Western Cape',
          suburb: 'Stale Suburb',
        },
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Stale Media Unit',
              priceFrom: 900_000,
              priceTo: 950_000,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Stale Root Media Unit',
          priceFrom: 900_000,
          priceTo: 950_000,
        },
      ],
      address: '99 Stale Media Road',
      city: 'Stale City',
      province: 'Western Cape',
      priceFrom: 900_000,
      priceTo: 950_000,
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
    } as any);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      city,
      suburb: 'Media Gardens',
      province: 'Gauteng',
      priceFrom: 1_350_000,
      priceTo: 1_550_000,
      builderName,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
    });
    expect(matched.images).toEqual(updatedImages);
    expect(matched.media).toMatchObject({
      photos: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      documents: updatedBrochures,
    });
    expect(matched.configurations[0]).toMatchObject({
      unitTypeId,
      label: 'Media Stable 2 Bed',
      listingType: 'sale',
      priceFrom: 1_350_000,
      priceTo: 1_550_000,
    });

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
    });

    expect(detail).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      address: '31 Stable Media Road',
      city,
      suburb: 'Media Gardens',
      province: 'Gauteng',
      priceFrom: 1_350_000,
      priceTo: 1_550_000,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
    });
    expect(detail?.images).toEqual(updatedImages);
    expect(detail?.media).toMatchObject({
      photos: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      documents: updatedBrochures,
    });
    expect(detail?.unitTypes?.[0]).toMatchObject({
      id: unitTypeId,
      name: 'Media Stable 2 Bed',
    });
    expect(Number(detail?.unitTypes?.[0]?.priceFrom)).toBe(1_350_000);
    expect(Number(detail?.unitTypes?.[0]?.priceTo)).toBe(1_550_000);
    expect(detail?.estateSpecs).toMatchObject({
      levyRange: { min: 1_150 },
      rightsAndTaxes: { min: 850 },
      transferCostsIncluded: true,
    });
  });

  it('shows canonical edit-resume media, governance, and inventory on public search and detail', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(db!, suffix, 'Public Resume');
    const developmentName = `Public Resume Development ${suffix}`;
    const updatedName = `Public Resume Updated ${suffix}`;
    const unitTypeId = `public-resume-${suffix}`;
    const city = `Public Resume City ${suffix}`;
    const originalImages = [{ url: 'https://example.com/public-resume-original-hero.jpg' }];

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '41 Public Resume Road',
      city,
      province: 'Gauteng',
      suburb: 'Resume Gardens',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description:
        'Public routes should reflect canonical edit resume updates without stale mirror leakage.',
      highlights: ['Canonical resume', 'Public boundary', 'Inventory source'],
      images: originalImages,
      videos: ['https://example.com/public-resume-original-video.mp4'],
      floorPlans: ['https://example.com/public-resume-original-plan.pdf'],
      brochures: ['https://example.com/public-resume-original-brochure.pdf'],
      monthlyLevyFrom: 1_100,
      monthlyLevyTo: 1_300,
      ratesFrom: 800,
      ratesTo: 950,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Public Resume 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 82,
          priceFrom: 1_250_000,
          priceTo: 1_450_000,
          totalUnits: 14,
          availableUnits: 9,
          reservedUnits: 1,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    const hydrated = await developmentService.getDevelopmentWithPhases(createdDevelopmentId);
    const canonicalSnapshot = {
      ...(hydrated as any),
      editingId: createdDevelopmentId,
      developmentId: createdDevelopmentId,
      currentStepId: 'review_publish',
      completedSteps: [
        'identity_market',
        'configuration',
        'location',
        'governance_finances',
        'development_media',
        'unit_types',
        'review_publish',
      ],
    };

    canonicalSnapshot.developmentData = {
      ...(canonicalSnapshot.developmentData ?? {}),
      name: 'Stale Public Resume Name',
      media: {
        heroImage: { url: 'https://example.com/stale-public-resume-hero.jpg' },
        photos: [],
        videos: ['https://example.com/stale-public-resume-video.mp4'],
        floorPlans: ['https://example.com/stale-public-resume-plan.pdf'],
        documents: ['https://example.com/stale-public-resume-brochure.pdf'],
      },
      monthlyLevyFrom: 9_999,
      monthlyLevyTo: 9_999,
      ratesFrom: 8_888,
      ratesTo: 8_888,
      transferCostsIncluded: true,
    };
    canonicalSnapshot.images = [{ url: 'https://example.com/stale-public-resume-hero.jpg' }];
    canonicalSnapshot.videos = ['https://example.com/stale-public-resume-video.mp4'];
    canonicalSnapshot.floorPlans = ['https://example.com/stale-public-resume-plan.pdf'];
    canonicalSnapshot.brochures = ['https://example.com/stale-public-resume-brochure.pdf'];
    canonicalSnapshot.stepData.identity_market = {
      ...(canonicalSnapshot.stepData.identity_market ?? {}),
      name: updatedName,
      status: 'selling',
      transactionType: 'for_sale',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
    };
    canonicalSnapshot.stepData.governance_finances = {
      levyRange: { min: 1_225, max: 1_525 },
      rightsAndTaxes: { min: 925, max: 1_125 },
      transferCostsIncluded: false,
    };
    canonicalSnapshot.stepData.development_media = {
      heroImage: {
        id: 'public-resume-hero',
        url: 'https://example.com/public-resume-updated-hero.jpg',
      },
      photos: [{ id: 'public-resume-photo', url: 'https://example.com/public-resume-photo.jpg' }],
      videos: ['https://example.com/public-resume-updated-video.mp4'],
      floorPlans: ['https://example.com/public-resume-updated-plan.pdf'],
      documents: ['https://example.com/public-resume-updated-brochure.pdf'],
    };
    canonicalSnapshot.stepData.unit_types.unitTypes[0] = {
      ...canonicalSnapshot.stepData.unit_types.unitTypes[0],
      id: unitTypeId,
      name: 'Public Resume 2 Bed Updated',
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
      totalUnits: 14,
      availableUnits: 8,
      reservedUnits: 2,
    };
    canonicalSnapshot.unitTypes = canonicalSnapshot.stepData.unit_types.unitTypes;

    const updatePayload = buildDevelopmentUpdatePayload({
      amenities: canonicalSnapshot.amenities ?? [],
      canonicalSnapshot,
      residentialConfig: canonicalSnapshot.developmentData?.residentialConfig,
    });

    expect(updatePayload).toMatchObject({
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
      unitTypes: [
        expect.objectContaining({
          id: unitTypeId,
          basePriceFrom: 1_500_000,
          basePriceTo: 1_750_000,
        }),
      ],
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, updatePayload);
    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: updatedName,
      city,
      suburb: 'Resume Gardens',
      province: 'Gauteng',
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
      builderName,
      videos: ['https://example.com/public-resume-updated-video.mp4'],
      floorPlans: ['https://example.com/public-resume-updated-plan.pdf'],
      brochures: ['https://example.com/public-resume-updated-brochure.pdf'],
    });
    expect(matched.images).toMatchObject([
      { id: 'public-resume-hero', url: 'https://example.com/public-resume-updated-hero.jpg' },
      { id: 'public-resume-photo', url: 'https://example.com/public-resume-photo.jpg' },
    ]);
    expect(String(JSON.stringify(matched))).not.toContain('stale-public-resume');
    expect(matched.configurations[0]).toMatchObject({
      unitTypeId,
      label: 'Public Resume 2 Bed Updated',
      listingType: 'sale',
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
    });

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
    });

    expect(detail).toMatchObject({
      id: createdDevelopmentId,
      name: updatedName,
      address: '41 Public Resume Road',
      city,
      suburb: 'Resume Gardens',
      province: 'Gauteng',
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
      videos: ['https://example.com/public-resume-updated-video.mp4'],
      floorPlans: ['https://example.com/public-resume-updated-plan.pdf'],
      brochures: ['https://example.com/public-resume-updated-brochure.pdf'],
    });
    expect(detail?.images).toEqual(matched.images);
    expect(String(JSON.stringify(detail))).not.toContain('stale-public-resume');
    expect(detail?.estateSpecs).toMatchObject({
      levyRange: { min: 1_225, max: 1_525 },
      rightsAndTaxes: { min: 925, max: 1_125 },
      transferCostsIncluded: false,
    });
    expect(detail?.unitTypes?.[0]).toMatchObject({
      id: unitTypeId,
      name: 'Public Resume 2 Bed Updated',
    });
    expect(Number(detail?.unitTypes?.[0]?.priceFrom)).toBe(1_500_000);
    expect(Number(detail?.unitTypes?.[0]?.priceTo)).toBe(1_750_000);
  });

  it('derives development inventory totals from partial unit-type edits', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId } = await createApprovedDeveloper(db!, suffix, 'Inventory Patch');
    const unitTypeId = `inventory-patch-${suffix}`;

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: `Inventory Patch Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '22 Inventory Patch Road',
      city: `Inventory Patch City ${suffix}`,
      province: 'Gauteng',
      suburb: 'Patchview',
      status: 'selling',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-08-01',
      completionDate: '2027-03-31',
      description: 'Partial unit edits should keep development inventory summaries aligned.',
      highlights: ['Inventory safe', 'Edit proof', 'Commercial stock'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Inventory+Patch' }],
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Patch 2 Bed',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 78,
          priceFrom: 1_250_000,
          priceTo: 1_350_000,
          totalUnits: 10,
          availableUnits: 7,
          parkingType: 'covered',
          parkingBays: 1,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      canonicalUpdateMode: 'partial_step',
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      transactionType: 'for_sale',
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Patch 2 Bed Updated',
              bedrooms: 2,
              bathrooms: 2,
              unitSize: 78,
              priceFrom: 1_450_000,
              priceTo: 1_550_000,
              totalUnits: 12,
              availableUnits: 5,
              parkingType: 'covered',
              parkingBays: 1,
            },
          ],
        },
      },
    } as any);

    const updated = await developmentService.getDevelopmentWithPhases(createdDevelopmentId);

    expect(Number(updated.totalUnits)).toBe(12);
    expect(Number(updated.availableUnits)).toBe(5);
    expect(Number(updated.priceFrom)).toBe(1_450_000);
    expect(Number(updated.priceTo)).toBe(1_550_000);
    expect(updated.unitTypes).toHaveLength(1);
    expect(updated.unitTypes[0]).toMatchObject({
      id: unitTypeId,
      name: 'Patch 2 Bed Updated',
    });
    expect(Number(updated.unitTypes[0].totalUnits)).toBe(12);
    expect(Number(updated.unitTypes[0].availableUnits)).toBe(5);
  });

  it('uses auction unit inventory for public development configurations instead of stale sale shadows', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId } = await createApprovedDeveloper(db!, suffix, 'Auction Card');
    const developmentName = `Auction Card Development ${suffix}`;

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'auction',
      address: '12 Auction Card Road',
      city: `Auction City ${suffix}`,
      province: 'Gauteng',
      suburb: 'Bidview',
      status: 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-08-01',
      completionDate: '2027-03-31',
      description: 'Auction public search should use bid fields from canonical unit inventory.',
      highlights: ['Reserve disclosed', 'Prime stand', 'Secure estate'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Auction+Card' }],
      unitTypes: [
        {
          name: 'Auction House',
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 120,
          yardSize: 300,
          priceFrom: 3200000,
          priceTo: 3500000,
          startingBid: 850000,
          reservePrice: 950000,
          auctionStartDate: '2026-09-01T09:00:00.000Z',
          auctionEndDate: '2026-09-15T09:00:00.000Z',
          totalUnits: 1,
          availableUnits: 1,
          parkingType: 'garage',
          parkingBays: 2,
          description: 'Auction card test unit type',
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city: `Auction City ${suffix}`,
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      transactionType: 'auction',
      startingBidFrom: 850000,
      reservePriceFrom: 950000,
      priceFrom: null,
      priceTo: null,
    });
    expect(matched.configurations[0]).toMatchObject({
      label: 'Auction House',
      listingType: 'auction',
      priceFrom: 850000,
      priceTo: 950000,
    });
  });

  it('preserves published auction ownership across partial edits and public output', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const { testUserId, builderName } = await createApprovedDeveloper(
      db!,
      suffix,
      'Auction Ownership',
    );
    const developmentName = `Auction Ownership Development ${suffix}`;
    const unitTypeId = `auction-own-${suffix}`;
    const city = `Auction Ownership City ${suffix}`;
    const originalImages = [
      { url: 'https://example.com/auction-ownership-original-hero.jpg' },
    ];
    const updatedImages = [
      { url: 'https://example.com/auction-ownership-updated-hero.jpg' },
    ];
    const updatedVideos = ['https://example.com/auction-ownership-updated-video.mp4'];
    const updatedFloorPlans = ['https://example.com/auction-ownership-updated-plan.pdf'];
    const updatedBrochures = ['https://example.com/auction-ownership-updated-brochure.pdf'];
    const originalAuctionStart = '2026-11-10T10:00:00.000Z';
    const originalAuctionEnd = '2026-11-20T17:00:00.000Z';
    const updatedAuctionStart = '2026-12-03T09:00:00.000Z';
    const updatedAuctionEnd = '2026-12-12T17:00:00.000Z';

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'auction',
      address: '31 Auction Ownership Road',
      city,
      province: 'Gauteng',
      suburb: 'Bidtown',
      status: 'launching-soon',
      ownershipType: 'sectional-title',
      ownershipTypes: ['sectional-title'],
      launchDate: '2026-08-01',
      completionDate: '2027-03-31',
      description:
        'Published auction ownership proof keeps bid terms and inventory stable across edits.',
      highlights: ['Timed bidding', 'Legal pack ready', 'Secure estate'],
      images: originalImages,
      videos: ['https://example.com/auction-ownership-original-video.mp4'],
      floorPlans: ['https://example.com/auction-ownership-original-plan.pdf'],
      brochures: ['https://example.com/auction-ownership-original-brochure.pdf'],
      monthlyLevyFrom: 1_450,
      ratesFrom: 1_050,
      transferCostsIncluded: 0,
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Auction Ownership Lot A',
          bedrooms: 3,
          bathrooms: 2,
          unitSize: 118,
          yardSize: 220,
          priceFrom: 3_200_000,
          priceTo: 3_500_000,
          monthlyRentFrom: 22_000,
          startingBid: 900_000,
          reservePrice: 1_050_000,
          auctionStartDate: originalAuctionStart,
          auctionEndDate: originalAuctionEnd,
          auctionStatus: 'scheduled',
          totalUnits: 1,
          availableUnits: 1,
          reservedUnits: 0,
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    async function assertAuctionPublicState(expected: {
      address: string;
      suburb: string;
      images: Array<Record<string, string>>;
      videos: string[];
      floorPlans: string[];
      brochures: string[];
      description: string;
      highlights: string[];
      levyFrom: number;
      ratesFrom: number;
      transferCostsIncluded: boolean;
      unitName: string;
      bedrooms: number;
      startingBidFrom: number;
      reservePriceFrom: number;
      auctionStartDate: string;
      auctionEndDate: string;
      totalUnits: number;
      availableUnits: number;
    }) {
      const result = await caller.properties.search({
        city,
        province: 'Gauteng',
        limit: 20,
        offset: 0,
        includeDevelopments: true,
      });

      const developmentItems = (result as any)?.developments?.items ?? [];
      const matched = developmentItems.find(
        (dev: any) => Number(dev.id) === createdDevelopmentId,
      );

      expect(matched).toMatchObject({
        id: createdDevelopmentId,
        name: developmentName,
        city,
        suburb: expected.suburb,
        province: 'Gauteng',
        transactionType: 'auction',
        startingBidFrom: expected.startingBidFrom,
        reservePriceFrom: expected.reservePriceFrom,
        priceFrom: null,
        priceTo: null,
        monthlyRentFrom: null,
        monthlyRentTo: null,
        builderName,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
      });
      expect(matched.images).toEqual(expected.images);
      expect(matched.configurations[0]).toMatchObject({
        unitTypeId,
        label: expected.unitName,
        listingType: 'auction',
        priceFrom: expected.startingBidFrom,
        priceTo: expected.reservePriceFrom,
      });

      const detail = await caller.developer.getPublicDevelopmentBySlug({
        slugOrId: String(createdDevelopment.slug || createdDevelopmentId),
      });

      expect(detail).toMatchObject({
        id: createdDevelopmentId,
        name: developmentName,
        address: expected.address,
        city,
        suburb: expected.suburb,
        province: 'Gauteng',
        description: expected.description,
        priceFrom: null,
        priceTo: null,
        monthlyRentFrom: null,
        monthlyRentTo: null,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
      });
      expect(detail?.images).toEqual(expected.images);
      expect(detail?.highlights).toEqual(expected.highlights);
      expect(Number(detail?.startingBidFrom)).toBe(expected.startingBidFrom);
      expect(Number(detail?.reservePriceFrom)).toBe(expected.reservePriceFrom);
      expect(String(detail?.auctionStartDate)).toContain(expected.auctionStartDate.slice(0, 10));
      expect(String(detail?.auctionEndDate)).toContain(expected.auctionEndDate.slice(0, 10));
      expect(detail?.estateSpecs).toMatchObject({
        levyRange: { min: expected.levyFrom },
        rightsAndTaxes: { min: expected.ratesFrom },
        transferCostsIncluded: expected.transferCostsIncluded,
      });
      expect(detail?.unitTypes?.[0]).toMatchObject({
        id: unitTypeId,
        name: expected.unitName,
        bedrooms: expected.bedrooms,
        totalUnits: expected.totalUnits,
        availableUnits: expected.availableUnits,
      });
      expect(Number(detail?.unitTypes?.[0]?.startingBid)).toBe(expected.startingBidFrom);
      expect(Number(detail?.unitTypes?.[0]?.reservePrice)).toBe(expected.reservePriceFrom);
      expect(String(detail?.unitTypes?.[0]?.auctionStartDate)).toContain(
        expected.auctionStartDate.slice(0, 10),
      );
      expect(String(detail?.unitTypes?.[0]?.auctionEndDate)).toContain(
        expected.auctionEndDate.slice(0, 10),
      );
      expect(Number(detail?.unitTypes?.[0]?.priceFrom ?? 0)).toBe(0);
      expect(Number(detail?.unitTypes?.[0]?.monthlyRentFrom ?? 0)).toBe(0);
      expect(detail?.media).toMatchObject({
        photos: expected.images,
        videos: expected.videos,
        floorPlans: expected.floorPlans,
        brochures: expected.brochures,
        documents: expected.brochures,
      });
    }

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_auction',
      currentStepId: 'location',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Auction Location Name',
        transactionType: 'auction',
        priceFrom: 999_999,
        monthlyRentFrom: 99_999,
        unitTypes: [{ id: unitTypeId, priceFrom: 999_999, monthlyRentFrom: 99_999 }],
      },
      stepData: {
        location: {
          address: '31 Auction Ownership Road Updated',
          city,
          province: 'Gauteng',
          suburb: 'Bidtown Heights',
          postalCode: '2196',
        },
        unit_types: {
          unitTypes: [{ id: unitTypeId, name: 'Stale Auction Location Unit', priceFrom: 999_999 }],
        },
      },
      address: '31 Auction Ownership Road Updated',
      city,
      province: 'Gauteng',
      suburb: 'Bidtown Heights',
      postalCode: '2196',
      priceFrom: 999_999,
      monthlyRentFrom: 99_999,
    } as any);

    await assertAuctionPublicState({
      address: '31 Auction Ownership Road Updated',
      suburb: 'Bidtown Heights',
      images: originalImages,
      videos: ['https://example.com/auction-ownership-original-video.mp4'],
      floorPlans: ['https://example.com/auction-ownership-original-plan.pdf'],
      brochures: ['https://example.com/auction-ownership-original-brochure.pdf'],
      description:
        'Published auction ownership proof keeps bid terms and inventory stable across edits.',
      highlights: ['Timed bidding', 'Legal pack ready', 'Secure estate'],
      levyFrom: 1_450,
      ratesFrom: 1_050,
      transferCostsIncluded: false,
      unitName: 'Auction Ownership Lot A',
      bedrooms: 3,
      startingBidFrom: 900_000,
      reservePriceFrom: 1_050_000,
      auctionStartDate: originalAuctionStart,
      auctionEndDate: originalAuctionEnd,
      totalUnits: 1,
      availableUnits: 1,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_auction',
      currentStepId: 'development_media',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Auction Media Name',
        location: {
          address: '99 Stale Auction Media Road',
          city: 'Stale Auction City',
          province: 'Western Cape',
          suburb: 'Stale Auction Suburb',
        },
        startingBidFrom: 99_999,
      },
      stepData: {
        development_media: {
          heroImage: updatedImages[0],
          photos: [],
          videos: updatedVideos,
          floorPlans: updatedFloorPlans,
          brochures: updatedBrochures,
          documents: updatedBrochures,
        },
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Stale Auction Media Unit',
              startingBid: 99_999,
              reservePrice: 100_000,
            },
          ],
        },
      },
      address: '99 Stale Auction Media Road',
      city: 'Stale Auction City',
      province: 'Western Cape',
      startingBidFrom: 99_999,
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
    } as any);

    await assertAuctionPublicState({
      address: '31 Auction Ownership Road Updated',
      suburb: 'Bidtown Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description:
        'Published auction ownership proof keeps bid terms and inventory stable across edits.',
      highlights: ['Timed bidding', 'Legal pack ready', 'Secure estate'],
      levyFrom: 1_450,
      ratesFrom: 1_050,
      transferCostsIncluded: false,
      unitName: 'Auction Ownership Lot A',
      bedrooms: 3,
      startingBidFrom: 900_000,
      reservePriceFrom: 1_050_000,
      auctionStartDate: originalAuctionStart,
      auctionEndDate: originalAuctionEnd,
      totalUnits: 1,
      availableUnits: 1,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_auction',
      currentStepId: 'marketing_summary',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Auction Marketing Name',
        images: [{ url: 'https://example.com/stale-auction-marketing-hero.jpg' }],
        startingBidFrom: 88_888,
      },
      stepData: {
        marketing_summary: {
          description:
            'Updated auction marketing copy proves timed-bid highlights can change safely.',
          highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
          tagline: 'Auction ownership proof',
        },
      },
      description: 'Updated auction marketing copy proves timed-bid highlights can change safely.',
      highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
      tagline: 'Auction ownership proof',
      priceFrom: 888_888,
      monthlyRentFrom: 88_888,
      startingBidFrom: 88_888,
    } as any);

    await assertAuctionPublicState({
      address: '31 Auction Ownership Road Updated',
      suburb: 'Bidtown Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated auction marketing copy proves timed-bid highlights can change safely.',
      highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
      levyFrom: 1_450,
      ratesFrom: 1_050,
      transferCostsIncluded: false,
      unitName: 'Auction Ownership Lot A',
      bedrooms: 3,
      startingBidFrom: 900_000,
      reservePriceFrom: 1_050_000,
      auctionStartDate: originalAuctionStart,
      auctionEndDate: originalAuctionEnd,
      totalUnits: 1,
      availableUnits: 1,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_auction',
      currentStepId: 'governance_finances',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      developmentData: {
        name: 'Stale Auction Governance Name',
        location: {
          address: '99 Stale Auction Governance Road',
          city: 'Stale Auction City',
          province: 'Western Cape',
        },
        startingBidFrom: 77_777,
      },
      stepData: {
        governance_finances: {
          levyRange: { min: 1_650, max: 1_950 },
          rightsAndTaxes: { min: 1_225, max: 1_525 },
          transferCostsIncluded: true,
        },
      },
      monthlyLevyFrom: 1_650,
      monthlyLevyTo: 1_950,
      ratesFrom: 1_225,
      ratesTo: 1_525,
      transferCostsIncluded: 1,
      address: '99 Stale Auction Governance Road',
      startingBidFrom: 77_777,
    } as any);

    await assertAuctionPublicState({
      address: '31 Auction Ownership Road Updated',
      suburb: 'Bidtown Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated auction marketing copy proves timed-bid highlights can change safely.',
      highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
      levyFrom: 1_650,
      ratesFrom: 1_225,
      transferCostsIncluded: true,
      unitName: 'Auction Ownership Lot A',
      bedrooms: 3,
      startingBidFrom: 900_000,
      reservePriceFrom: 1_050_000,
      auctionStartDate: originalAuctionStart,
      auctionEndDate: originalAuctionEnd,
      totalUnits: 1,
      availableUnits: 1,
    });

    await developmentService.updateDevelopment(createdDevelopmentId, testUserId, {
      workflowId: 'residential_auction',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      canonicalUpdateMode: 'partial_step',
      transactionType: 'auction',
      developmentData: {
        name: 'Stale Auction Unit Name',
        transactionType: 'auction',
        location: {
          address: '99 Stale Auction Unit Road',
          city: 'Stale Auction City',
          province: 'Western Cape',
        },
        priceFrom: 777_777,
        monthlyRentFrom: 77_777,
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: unitTypeId,
              name: 'Auction Ownership Lot A Updated',
              bedrooms: 4,
              bathrooms: 3,
              unitSize: 132,
              priceFrom: 3_800_000,
              monthlyRentFrom: 28_000,
              startingBid: 1_050_000,
              reservePrice: 1_250_000,
              auctionStartDate: updatedAuctionStart,
              auctionEndDate: updatedAuctionEnd,
              auctionStatus: 'scheduled',
              totalUnits: 2,
              availableUnits: 1,
              reservedUnits: 1,
              parkingType: 'garage',
              parkingBays: 2,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: unitTypeId,
          name: 'Auction Ownership Lot A Updated',
          bedrooms: 4,
          bathrooms: 3,
          unitSize: 132,
          priceFrom: 3_800_000,
          monthlyRentFrom: 28_000,
          startingBid: 1_050_000,
          reservePrice: 1_250_000,
          auctionStartDate: updatedAuctionStart,
          auctionEndDate: updatedAuctionEnd,
          auctionStatus: 'scheduled',
          totalUnits: 2,
          availableUnits: 1,
          reservedUnits: 1,
          parkingType: 'garage',
          parkingBays: 2,
        },
      ],
      priceFrom: 777_777,
      monthlyRentFrom: 77_777,
      startingBidFrom: 1_050_000,
      reservePriceFrom: 1_250_000,
    } as any);

    await assertAuctionPublicState({
      address: '31 Auction Ownership Road Updated',
      suburb: 'Bidtown Heights',
      images: updatedImages,
      videos: updatedVideos,
      floorPlans: updatedFloorPlans,
      brochures: updatedBrochures,
      description: 'Updated auction marketing copy proves timed-bid highlights can change safely.',
      highlights: ['Registration open', 'Viewing weekend', 'Reserve guided'],
      levyFrom: 1_650,
      ratesFrom: 1_225,
      transferCostsIncluded: true,
      unitName: 'Auction Ownership Lot A Updated',
      bedrooms: 4,
      startingBidFrom: 1_050_000,
      reservePriceFrom: 1_250_000,
      auctionStartDate: updatedAuctionStart,
      auctionEndDate: updatedAuctionEnd,
      totalUnits: 2,
      availableUnits: 1,
    });

    const [publishedState] = await db!
      .select({
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
        startingBidFrom: developments.startingBidFrom,
        reservePriceFrom: developments.reservePriceFrom,
        auctionStartDate: developments.auctionStartDate,
        auctionEndDate: developments.auctionEndDate,
        totalUnits: developments.totalUnits,
        availableUnits: developments.availableUnits,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(publishedState?.isPublished ?? 0)).toBe(1);
    expect(publishedState?.approvalStatus).toBe('approved');
    expect(publishedState?.priceFrom).toBeNull();
    expect(publishedState?.priceTo).toBeNull();
    expect(publishedState?.monthlyRentFrom).toBeNull();
    expect(publishedState?.monthlyRentTo).toBeNull();
    expect(Number(publishedState?.startingBidFrom)).toBe(1_050_000);
    expect(Number(publishedState?.reservePriceFrom)).toBe(1_250_000);
    expect(String(publishedState?.auctionStartDate)).toContain(updatedAuctionStart.slice(0, 10));
    expect(String(publishedState?.auctionEndDate)).toContain(updatedAuctionEnd.slice(0, 10));
    expect(Number(publishedState?.totalUnits)).toBe(2);
    expect(Number(publishedState?.availableUnits)).toBe(1);
  }, 120_000);

  it('blocks publishing when description is empty', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const userInsertResult = await db!.insert(users).values({
      email: `no-description-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'No',
      lastName: 'Description',
      name: 'No Description User',
      emailVerified: 1,
    });
    const testUserId = Number(userInsertResult[0].insertId);
    createdUserId = testUserId;

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: `No Description Builder ${suffix}`,
      email: `no-description-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: `No Description Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '2 No Description Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      ownershipType: 'sectional-title',
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Description' }],
      unitTypes: [
        {
          name: '1 Bed Apartment',
          bedrooms: 1,
          bathrooms: 1,
          unitSize: 55,
          yardSize: 0,
          priceFrom: 850000,
          totalUnits: 8,
          availableUnits: 8,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await expect(
      developmentService.publishDevelopment(createdDevelopmentId, testUserId),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Description is required before publishing',
    });

    const [stillDraft] = await db!
      .select({ isPublished: developments.isPublished })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(stillDraft?.isPublished ?? 0)).toBe(0);
  });

  it('blocks DB-row publish when shared canonical basics are missing', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const userInsertResult = await db!.insert(users).values({
      email: `missing-ownership-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Missing',
      lastName: 'Ownership',
      name: 'Missing Ownership User',
      emailVerified: 1,
    });
    const testUserId = Number(userInsertResult[0].insertId);
    createdUserId = testUserId;

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: `Missing Ownership Builder ${suffix}`,
      email: `missing-ownership-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: `Missing Ownership Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '3 Missing Ownership Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      launchDate: '2026-06-01',
      completionDate: '2027-03-31',
      description:
        'A complete description that leaves ownership as the only canonical publish blocker.',
      highlights: ['Security', 'Location', 'Lifestyle'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Missing+Ownership' }],
      unitTypes: [
        {
          name: '1 Bed Apartment',
          bedrooms: 1,
          bathrooms: 1,
          unitSize: 55,
          yardSize: 0,
          priceFrom: 850000,
          totalUnits: 8,
          availableUnits: 8,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await expect(
      developmentService.publishDevelopment(createdDevelopmentId, testUserId),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Select at least one ownership type',
    });

    const [stillDraft] = await db!
      .select({ isPublished: developments.isPublished })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(stillDraft?.isPublished ?? 0)).toBe(0);
  });

  it('blocks DB-row publish when launch date is missing for a selling development', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const userInsertResult = await db!.insert(users).values({
      email: `missing-launch-user-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Missing',
      lastName: 'Launch',
      name: 'Missing Launch User',
      emailVerified: 1,
    });
    const testUserId = Number(userInsertResult[0].insertId);
    createdUserId = testUserId;

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: `Missing Launch Builder ${suffix}`,
      email: `missing-launch-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: `Missing Launch Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '4 Missing Launch Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      ownershipType: 'sectional-title',
      completionDate: '2027-03-31',
      description:
        'A complete description that leaves launch date as the only canonical publish blocker.',
      highlights: ['Security', 'Location', 'Lifestyle'],
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Missing+Launch' }],
      unitTypes: [
        {
          name: '1 Bed Apartment',
          bedrooms: 1,
          bathrooms: 1,
          unitSize: 55,
          yardSize: 0,
          priceFrom: 850000,
          totalUnits: 8,
          availableUnits: 8,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await expect(
      developmentService.publishDevelopment(createdDevelopmentId, testUserId),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Launch date is required for this status',
    });

    const [stillDraft] = await db!
      .select({ isPublished: developments.isPublished })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(stillDraft?.isPublished ?? 0)).toBe(0);
  });
});

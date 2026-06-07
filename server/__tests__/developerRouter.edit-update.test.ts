import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developmentService } from '../services/developmentService';
import { developments, developers, unitTypes, users } from '../../drizzle/schema';
import {
  buildDevelopmentEditSavePayload,
  buildDevelopmentPartialUpdatePayload,
  buildDevelopmentSubmitPayload,
} from '../../client/src/lib/developmentSubmitPayload';
import { CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP } from '../lib/canonicalDevelopmentPayload';
import { DEVELOPMENT_WORKFLOW_STEPS } from '../../shared/developmentWorkflow';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const getInsertId = (insertResult: unknown): number => {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    return Number((candidate as { insertId: number }).insertId);
  }
  throw new Error('Unable to read insertId from insert result');
};

describeWithDb('developerRouter canonical edit updates', () => {
  let createdUserId: number | null = null;
  let createdDeveloperId: number | null = null;
  let createdDevelopmentId: number | null = null;
  let createdSecondaryDevelopmentId: number | null = null;

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentId) {
      await developmentService.deleteDevelopment(createdDevelopmentId, createdUserId ?? -1);
      createdDevelopmentId = null;
    }
    if (createdSecondaryDevelopmentId) {
      await developmentService.deleteDevelopment(
        createdSecondaryDevelopmentId,
        createdUserId ?? -1,
      );
      createdSecondaryDevelopmentId = null;
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

  const createDeveloperCaller = async (prefix: string, developerName: string) => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `${prefix}-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Canonical',
      lastName: 'Tester',
      name: 'Canonical Tester',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: developerName,
      email: `${prefix}-profile-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = getInsertId(developerInsert);

    return {
      db: db!,
      suffix,
      caller: appRouter.createCaller({
        req: { headers: {} },
        res: {},
        user: { id: createdUserId, role: 'property_developer' },
      } as any),
    };
  };

  it('roundtrips canonical unit edit payloads through the router and public listing read model', async () => {
    const unitTypesOwnedFields = new Set(CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.unitTypes);
    expect(unitTypesOwnedFields).toEqual(new Set(['unitTypes']));
    expect(
      [
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
      ].some(field => unitTypesOwnedFields.has(field)),
    ).toBe(false);

    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-edit-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Edit',
      lastName: 'Tester',
      name: 'Edit Tester',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Edit Roundtrip Developer',
      email: `dev-edit-profile-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = getInsertId(developerInsert);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: createdUserId, role: 'property_developer' },
    } as any);

    const created = await caller.developer.createDevelopment({
      name: `Canonical Edit Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '12 Edit Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Router edit roundtrip development with stable unit inventory.',
      images: [{ url: 'https://example.com/edit.jpg' }],
      videos: ['https://example.com/edit-video.mp4'],
      brochures: ['https://example.com/edit-brochure.pdf'],
      monthlyLevyFrom: 1_050,
      monthlyLevyTo: 1_450,
      ratesFrom: 750,
      ratesTo: 1_100,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_500_000,
          basePriceTo: 1_650_000,
          unitSize: 85,
          parkingType: 'carport',
          parkingBays: 2,
          totalUnits: 10,
          availableUnits: 7,
          reservedUnits: 1,
          description: 'Type A original description',
        },
        {
          name: 'Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 2_100_000,
          basePriceTo: 2_350_000,
          unitSize: 120,
          parkingType: 'garage',
          parkingBays: 2,
          totalUnits: 6,
          availableUnits: 4,
          reservedUnits: 1,
          description: 'Type B original description',
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(hydrated?.unitTypes).toHaveLength(2);
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration'],
        developmentData: {
          name: hydrated!.name,
          transactionType: 'for_sale',
        },
        stepData: {
          unit_types: {
            unitTypes: [{ id: typeA.id }, { id: typeB.id }],
          },
        },
        unitTypes: [
          {
            id: typeA.id,
            label: typeA.label,
            name: typeA.name,
            priceFrom: 1_575_000,
            priceTo: 1_725_000,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
            configDescription: 'Updated through router canonical payload',
          },
          {
            id: typeB.id,
            name: typeB.name,
          },
        ],
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(updated?.unitTypes).toHaveLength(2);
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(updatedTypeA).toMatchObject({
      id: typeA.id,
      name: 'Type A',
      configDescription: 'Updated through router canonical payload',
      totalUnits: typeA.totalUnits,
      availableUnits: typeA.availableUnits,
      reservedUnits: typeA.reservedUnits,
    });
    expect(Number(updatedTypeA.basePriceFrom)).toBe(1_575_000);
    expect(Number(updatedTypeA.basePriceTo)).toBe(1_725_000);
    expect(updatedTypeB).toMatchObject({
      id: typeB.id,
      name: 'Type B',
      totalUnits: typeB.totalUnits,
      availableUnits: typeB.availableUnits,
      reservedUnits: typeB.reservedUnits,
      description: typeB.description,
    });

    const [rawAfter] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.address).toBe('12 Edit Road');
    expect(rawAfter.suburb).toBe('Sea Point');
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(rawAfter.postalCode).toBe('8005');
    expect(String(rawAfter.images)).toContain('edit.jpg');
    expect(String(rawAfter.videos)).toContain('edit-video.mp4');
    expect(String(rawAfter.brochures)).toContain('edit-brochure.pdf');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_050);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_450);
    expect(Number(rawAfter.ratesFrom)).toBe(750);
    expect(Number(rawAfter.ratesTo)).toBe(1_100);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(1);
    expect(Number(rawAfter.priceFrom)).toBe(1_575_000);
    expect(Number(rawAfter.priceTo)).toBe(2_350_000);

    expect(updated!.developmentData.location).toMatchObject({
      address: '12 Edit Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
    });
    expect(updated!.developmentData.media.heroImage?.url).toBe('https://example.com/edit.jpg');
    expect(Number(updated!.developmentData.monthlyLevyFrom)).toBe(1_050);
    expect(Number(updated!.developmentData.transferCostsIncluded)).toBe(1);

    await db!
      .update(developments)
      .set({
        isPublished: 1,
        approvalStatus: 'approved' as any,
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(developments.id, createdDevelopmentId));

    const publicResult = await caller.developer.getPublishedDevelopments({
      province: 'Western Cape',
      developmentType: 'residential',
      limit: 50,
    });
    const publicDevelopment = publicResult.developments.find(
      (development: any) => Number(development.id) === createdDevelopmentId,
    );

    expect(publicDevelopment).toBeDefined();
    expect(publicDevelopment.configurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Type A',
          listingType: 'sale',
          priceFrom: 1_575_000,
          priceTo: 1_725_000,
        }),
        expect.objectContaining({
          label: 'Type B',
          listingType: 'sale',
          priceFrom: 2_100_000,
          priceTo: 2_350_000,
        }),
      ]),
    );
  }, 120000);

  it('uses canonical unit_types snapshot over stale root unitTypes during full-sync edits', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-inventory-owner',
      'Canonical Inventory Owner Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Inventory Owner ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '9 Inventory Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Created to prove canonical unit_types owns inventory updates.',
      images: [{ url: 'https://example.com/inventory-owner.jpg' }],
      unitTypes: [
        {
          name: 'Owner Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_500_000,
          basePriceTo: 1_650_000,
          unitSize: 85,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 7,
          reservedUnits: 1,
        },
        {
          name: 'Owner Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 2_100_000,
          basePriceTo: 2_350_000,
          unitSize: 120,
          parkingType: 'garage',
          parkingBays: 2,
          totalUnits: 6,
          availableUnits: 4,
          reservedUnits: 1,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = before!.unitTypes.find((unit: any) => unit.name === 'Owner Type A');
    const typeB = before!.unitTypes.find((unit: any) => unit.name === 'Owner Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        developmentData: {
          name: before!.name,
          transactionType: 'for_sale',
        },
        stepData: {
          unit_types: {
            unitTypes: [
              {
                id: typeA.id,
                name: 'Owner Type A Canonical',
                bedrooms: 2,
                bathrooms: 2,
                priceFrom: 1_625_000,
                priceTo: 1_825_000,
                unitSize: 88,
                parkingType: 'covered',
                parkingBays: 2,
                totalUnits: 9,
                availableUnits: 5,
                reservedUnits: 2,
                configDescription: 'Canonical step snapshot wins',
              },
            ],
          },
        },
        unitTypes: [
          {
            id: typeA.id,
            name: 'Owner Type A Stale Root',
            priceFrom: 999_000,
            priceTo: 1_111_000,
            totalUnits: 99,
            availableUnits: 98,
          },
          {
            id: typeB.id,
            name: 'Owner Type B Stale Root',
            priceFrom: 2_500_000,
            priceTo: 2_800_000,
          },
        ],
      },
    });

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id)).toEqual([typeA.id]);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes.find((unit: any) => unit.id === typeB.id)).toBeUndefined();
    const afterTypeA = after!.unitTypes[0];
    expect(afterTypeA).toMatchObject({
      id: typeA.id,
      name: 'Owner Type A Canonical',
      unitSize: 88,
      parkingType: 'covered',
      parkingBays: 2,
      totalUnits: 9,
      availableUnits: 5,
      reservedUnits: 2,
      configDescription: 'Canonical step snapshot wins',
    });
    expect(Number(afterTypeA.bathrooms)).toBe(2);
    expect(Number(afterTypeA.basePriceFrom)).toBe(1_625_000);
    expect(Number(afterTypeA.basePriceTo)).toBe(1_825_000);
    expect(afterTypeA.name).not.toBe('Owner Type A Stale Root');
    expect(Number(after!.priceFrom)).toBe(1_625_000);
    expect(Number(after!.priceTo)).toBe(1_825_000);
    expect(after!.stepData.unit_types.unitTypes).toHaveLength(1);
    expect(after!.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: typeA.id,
      name: 'Owner Type A Canonical',
    });
  }, 120000);

  it('preserves omitted nested unit media during canonical unit inventory edits', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-unit-media-preserve',
      'Unit Media Preserve Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Unit Media Preserve ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '9 Media Preserve Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Created to prove unit media subfields survive partial inventory edits.',
      unitTypes: [
        {
          name: 'Media Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 1,
          baseMedia: {
            gallery: [{ url: 'https://example.com/unit-original-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/unit-original-plan.pdf' }],
            renders: [{ url: 'https://example.com/unit-original-render.jpg' }],
          },
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const beforeUnit = before!.unitTypes[0];
    expect(beforeUnit.baseMedia).toMatchObject({
      gallery: [{ url: 'https://example.com/unit-original-gallery.jpg' }],
      floorPlans: [{ url: 'https://example.com/unit-original-plan.pdf' }],
      renders: [{ url: 'https://example.com/unit-original-render.jpg' }],
    });

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: {
          unit_types: {
            unitTypes: [
              {
                id: beforeUnit.id,
                name: 'Media Type A Updated',
                bedrooms: 2,
                bathrooms: 2,
                basePriceFrom: 1_500_000,
                basePriceTo: 1_700_000,
                totalUnits: 10,
                availableUnits: 5,
                reservedUnits: 2,
                baseMedia: {
                  gallery: [{ url: 'https://example.com/unit-updated-gallery.jpg' }],
                },
              },
            ],
          },
        },
        unitTypes: [
          {
            id: beforeUnit.id,
            name: 'Stale Root Media Type',
            baseMedia: {
              gallery: [{ url: 'https://example.com/stale-root-gallery.jpg' }],
              floorPlans: [],
              renders: [],
            },
          },
        ],
      },
    });

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter).toHaveLength(1);
    const rawMedia =
      typeof rawUnitsAfter[0].baseMedia === 'string'
        ? JSON.parse(rawUnitsAfter[0].baseMedia)
        : rawUnitsAfter[0].baseMedia;
    expect(rawMedia).toEqual({
      gallery: [{ url: 'https://example.com/unit-updated-gallery.jpg' }],
      floorPlans: [{ url: 'https://example.com/unit-original-plan.pdf' }],
      renders: [{ url: 'https://example.com/unit-original-render.jpg' }],
    });

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes[0]).toMatchObject({
      id: beforeUnit.id,
      name: 'Media Type A Updated',
      baseMedia: rawMedia,
    });
    expect(after!.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: beforeUnit.id,
      name: 'Media Type A Updated',
      baseMedia: rawMedia,
    });
  }, 120000);

  it('persists canonical unit reorder while preserving unit identity and omitted media fields', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-unit-reorder',
      'Unit Reorder Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Unit Reorder ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '12 Reorder Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Created to prove canonical unit reorder preserves identity and media.',
      unitTypes: [
        {
          name: 'Reorder Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_400_000,
          basePriceTo: 1_600_000,
          unitSize: 82,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 1,
          displayOrder: 0,
          baseMedia: {
            gallery: [{ url: 'https://example.com/reorder-a-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/reorder-a-plan.pdf' }],
            renders: [{ url: 'https://example.com/reorder-a-render.jpg' }],
          },
        },
        {
          name: 'Reorder Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_900_000,
          basePriceTo: 2_200_000,
          unitSize: 118,
          totalUnits: 6,
          availableUnits: 4,
          reservedUnits: 0,
          displayOrder: 1,
          baseMedia: {
            gallery: [{ url: 'https://example.com/reorder-b-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/reorder-b-plan.pdf' }],
            renders: [{ url: 'https://example.com/reorder-b-render.jpg' }],
          },
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = before!.unitTypes.find((unit: any) => unit.name === 'Reorder Type A');
    const typeB = before!.unitTypes.find((unit: any) => unit.name === 'Reorder Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
        stepData: {
          unit_types: {
            unitTypes: [
              {
                id: typeB.id,
                name: 'Reorder Type B Updated',
                bedrooms: 3,
                bathrooms: 2,
                priceFrom: 1_950_000,
                priceTo: 2_250_000,
                unitSize: 119,
                totalUnits: 6,
                availableUnits: 3,
                reservedUnits: 1,
                displayOrder: 0,
                baseMedia: {
                  gallery: [{ url: 'https://example.com/reorder-b-updated-gallery.jpg' }],
                },
              },
              {
                id: typeA.id,
                name: 'Reorder Type A',
                bedrooms: 2,
                bathrooms: 2,
                priceFrom: 1_400_000,
                priceTo: 1_600_000,
                unitSize: 82,
                totalUnits: 10,
                availableUnits: 6,
                reservedUnits: 1,
                displayOrder: 1,
              },
            ],
          },
        },
      },
    });

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId))
      .orderBy(unitTypes.displayOrder);
    expect(rawUnitsAfter.map((unit: any) => unit.id)).toEqual([typeB.id, typeA.id]);
    expect(rawUnitsAfter.map((unit: any) => Number(unit.displayOrder))).toEqual([0, 1]);
    const rawTypeB = rawUnitsAfter.find((unit: any) => unit.id === typeB.id);
    const rawTypeBMedia =
      typeof rawTypeB.baseMedia === 'string' ? JSON.parse(rawTypeB.baseMedia) : rawTypeB.baseMedia;
    expect(rawTypeBMedia).toEqual({
      gallery: [{ url: 'https://example.com/reorder-b-updated-gallery.jpg' }],
      floorPlans: [{ url: 'https://example.com/reorder-b-plan.pdf' }],
      renders: [{ url: 'https://example.com/reorder-b-render.jpg' }],
    });

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes.map((unit: any) => unit.id)).toEqual([typeB.id, typeA.id]);
    expect(after!.stepData.unit_types.unitTypes.map((unit: any) => unit.id)).toEqual([
      typeB.id,
      typeA.id,
    ]);
    expect(after!.unitTypes[0]).toMatchObject({
      id: typeB.id,
      name: 'Reorder Type B Updated',
      displayOrder: 0,
      baseMedia: rawTypeBMedia,
    });
    expect(after!.unitTypes[1]).toMatchObject({
      id: typeA.id,
      name: 'Reorder Type A',
      displayOrder: 1,
    });
  }, 120000);

  it('preserves omitted unit rows during canonical unit_types partial saves', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-unit-partial-preserve',
      'Unit Partial Preserve Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Unit Partial Preserve ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '14 Partial Preserve Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Created to prove partial unit saves do not delete omitted unit rows.',
      images: [{ url: 'https://example.com/partial-preserve-hero.jpg' }],
      unitTypes: [
        {
          name: 'Partial Preserve Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_300_000,
          basePriceTo: 1_450_000,
          unitSize: 78,
          totalUnits: 8,
          availableUnits: 5,
          reservedUnits: 1,
          displayOrder: 0,
        },
        {
          name: 'Partial Preserve Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_800_000,
          basePriceTo: 2_000_000,
          unitSize: 112,
          totalUnits: 5,
          availableUnits: 3,
          reservedUnits: 1,
          displayOrder: 1,
          baseMedia: {
            gallery: [{ url: 'https://example.com/partial-preserve-b-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/partial-preserve-b-plan.pdf' }],
            renders: [{ url: 'https://example.com/partial-preserve-b-render.jpg' }],
          },
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = before!.unitTypes.find((unit: any) => unit.name === 'Partial Preserve Type A');
    const typeB = before!.unitTypes.find((unit: any) => unit.name === 'Partial Preserve Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        canonicalUpdateMode: 'partial_step',
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
        developmentType: 'residential',
        transactionType: 'for_sale',
        stepData: {
          unit_types: {
            selectedUnitId: typeA.id,
            unitTypes: [
              {
                id: typeA.id,
                name: 'Partial Preserve Type A Updated',
                bedrooms: 2,
                bathrooms: 2,
                priceFrom: 1_350_000,
                priceTo: 1_500_000,
                unitSize: 80,
                totalUnits: 8,
                availableUnits: 4,
                reservedUnits: 2,
                displayOrder: 0,
              },
            ],
          },
        },
        unitTypes: [
          {
            id: typeA.id,
            name: 'Partial Preserve Type A Updated',
            priceFrom: 1_350_000,
            priceTo: 1_500_000,
            unitSize: 80,
            totalUnits: 8,
            availableUnits: 4,
            reservedUnits: 2,
            displayOrder: 0,
          },
        ],
      },
    });

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId))
      .orderBy(unitTypes.displayOrder);
    expect(rawUnitsAfter.map((unit: any) => unit.id)).toEqual([typeA.id, typeB.id]);
    expect(rawUnitsAfter.find((unit: any) => unit.id === typeA.id)).toMatchObject({
      name: 'Partial Preserve Type A Updated',
      availableUnits: 4,
      reservedUnits: 2,
    });
    const preservedTypeB = rawUnitsAfter.find((unit: any) => unit.id === typeB.id);
    const preservedTypeBMedia =
      typeof preservedTypeB.baseMedia === 'string'
        ? JSON.parse(preservedTypeB.baseMedia)
        : preservedTypeB.baseMedia;
    expect(preservedTypeBMedia).toEqual({
      gallery: [{ url: 'https://example.com/partial-preserve-b-gallery.jpg' }],
      floorPlans: [{ url: 'https://example.com/partial-preserve-b-plan.pdf' }],
      renders: [{ url: 'https://example.com/partial-preserve-b-render.jpg' }],
    });

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes.map((unit: any) => unit.id)).toEqual([typeA.id, typeB.id]);
    expect(after!.stepData.unit_types.unitTypes.map((unit: any) => unit.id)).toEqual([
      typeA.id,
      typeB.id,
    ]);
  }, 120000);

  it('accepts FinalisationPhase submit helper payloads without losing sale ranges or unit identity', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-submit-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Submit',
      lastName: 'Tester',
      name: 'Submit Tester',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Submit Payload Developer',
      email: `dev-submit-profile-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = getInsertId(developerInsert);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: createdUserId, role: 'property_developer' },
    } as any);

    const createPayload = buildDevelopmentSubmitPayload({
      amenities: ['Pool', 'Gym'],
      residentialConfig: { residentialType: 'apartment', communityTypes: ['security_estate'] },
      wizardData: {
        name: `Final Submit Development ${suffix}`,
        subtitle: 'Canonical final submit',
        description: 'Created through the same payload helper used by FinalisationPhase.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
        location: {
          address: '34 Submit Road',
          suburb: 'Sea Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8005',
        },
        heroImage: 'https://example.com/final-submit-hero.jpg',
        media: {
          photos: [{ url: 'https://example.com/final-submit-gallery.jpg', category: 'gallery' }],
          videos: ['https://example.com/final-submit-video.mp4'],
          floorPlans: [{ url: 'https://example.com/final-submit-floorplan.pdf' }],
          documents: [{ url: 'https://example.com/final-submit-brochure.pdf' }],
        },
        unitTypes: [
          {
            id: `submit-unit-a-${suffix}`,
            name: 'Submit Type A',
            bedrooms: 2,
            bathrooms: 2,
            basePriceFrom: 1_250_000,
            basePriceTo: 1_450_000,
            extras: [{ price: 50_000 }],
            unitSize: 78,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 10,
            availableUnits: 7,
            reservedUnits: 1,
          },
          {
            id: `submit-unit-b-${suffix}`,
            name: 'Submit Type B',
            bedrooms: 3,
            bathrooms: 2,
            basePriceFrom: 1_900_000,
            basePriceTo: 2_250_000,
            unitSize: 112,
            parkingType: 'garage',
            parkingBays: 2,
            totalUnits: 6,
            availableUnits: 4,
            reservedUnits: 1,
          },
        ],
      },
    });

    expect(createPayload.priceFrom).toBe(1_300_000);
    expect(createPayload.priceTo).toBe(2_250_000);
    expect(createPayload.floorPlans).toEqual(['https://example.com/final-submit-floorplan.pdf']);
    expect(createPayload.unitTypes[0]).toMatchObject({
      basePriceFrom: 1_250_000,
      basePriceTo: 1_450_000,
    });

    const created = await caller.developer.createDevelopment(createPayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(hydrated?.unitTypes).toHaveLength(2);
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Submit Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Submit Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();
    expect(Number(typeA.basePriceFrom)).toBe(1_250_000);
    expect(Number(typeA.basePriceTo)).toBe(1_450_000);
    expect(typeA.parkingType).toBe('covered');
    expect(typeA.parkingBays).toBe(1);
    expect(Number(typeB.basePriceFrom)).toBe(1_900_000);
    expect(Number(typeB.basePriceTo)).toBe(2_250_000);
    expect(hydrated!.workflowId).toBe('residential_sale');
    expect(hydrated!.currentStepId).toEqual(expect.any(String));
    expect(hydrated!.developmentData).toMatchObject({
      name: hydrated!.name,
      transactionType: 'for_sale',
      location: expect.objectContaining({
        city: hydrated!.city,
        province: hydrated!.province,
      }),
    });
    expect(hydrated!.stepData.unit_types.unitTypes).toHaveLength(2);
    expect(hydrated!.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: typeA.id,
      name: 'Submit Type A',
      basePriceFrom: '1250000.00',
      basePriceTo: '1450000.00',
    });
    const [storedAfterCreate] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(String(storedAfterCreate.floorPlans)).toContain('final-submit-floorplan.pdf');

    const updatePayload = buildDevelopmentSubmitPayload({
      amenities: ['Pool', 'Gym'],
      residentialConfig: { residentialType: 'apartment', communityTypes: ['security_estate'] },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            basePriceFrom: 1_400_000,
            basePriceTo: 1_650_000,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(updatePayload.unitTypes[1]).not.toHaveProperty('basePriceFrom');
    expect(updatePayload.unitTypes[1]).not.toHaveProperty('basePriceTo');
    expect(updatePayload).not.toHaveProperty('floorPlans');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: updatePayload.unitTypes } },
        developmentData: {
          name: updatePayload.name,
          transactionType: updatePayload.transactionType,
          location: {
            address: updatePayload.address,
            city: updatePayload.city,
            province: updatePayload.province,
            suburb: updatePayload.suburb,
            postalCode: updatePayload.postalCode,
          },
        },
        ...updatePayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(1_400_000);
    expect(Number(updatedTypeA.basePriceTo)).toBe(1_650_000);
    expect(updatedTypeA.parkingType).toBe('covered');
    expect(updatedTypeA.parkingBays).toBe(1);
    expect(Number(updatedTypeB.basePriceFrom)).toBe(1_900_000);
    expect(Number(updatedTypeB.basePriceTo)).toBe(2_250_000);
    const [storedAfterUpdate] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(String(storedAfterUpdate.images)).toContain('final-submit-hero.jpg');
    expect(String(storedAfterUpdate.videos)).toContain('final-submit-video.mp4');
    expect(String(storedAfterUpdate.floorPlans)).toContain('final-submit-floorplan.pdf');
    expect(String(storedAfterUpdate.brochures)).toContain('final-submit-brochure.pdf');

    await db!
      .update(developments)
      .set({
        isPublished: 1,
        approvalStatus: 'approved' as any,
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(developments.id, createdDevelopmentId));

    const publicResult = await caller.developer.getPublishedDevelopments({
      province: 'Western Cape',
      developmentType: 'residential',
      limit: 50,
    });
    const publicDevelopment = publicResult.developments.find(
      (development: any) => Number(development.id) === createdDevelopmentId,
    );

    expect(publicDevelopment).toBeDefined();
    expect(publicDevelopment.configurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Submit Type A',
          listingType: 'sale',
          priceFrom: 1_400_000,
          priceTo: 1_650_000,
        }),
        expect.objectContaining({
          label: 'Submit Type B',
          listingType: 'sale',
          priceFrom: 1_900_000,
          priceTo: 2_250_000,
        }),
      ]),
    );
  }, 120000);

  it('preserves rental ranges and inactive sale fields through helper submit and partial edit', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-rental-submit',
      'Rental Submit Developer',
    );

    const createPayload = buildDevelopmentSubmitPayload({
      amenities: ['Rooftop terrace'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: `Rental Submit Development ${suffix}`,
        description: 'Rental canonical submit coverage.',
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'selling',
        location: {
          address: '18 Rental Road',
          suburb: 'Green Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8051',
        },
        heroImage: 'https://example.com/rental-submit-hero.jpg',
        unitTypes: [
          {
            id: `rental-unit-a-${suffix}`,
            name: 'Rental Type A',
            bedrooms: 1,
            bathrooms: 1,
            monthlyRentFrom: 14_500,
            monthlyRentTo: 16_500,
            basePriceFrom: 1_500_000,
            startingBid: 900_000,
            unitSize: 58,
            parkingType: 'open',
            parkingBays: 1,
            totalUnits: 12,
            availableUnits: 8,
            reservedUnits: 1,
          },
          {
            id: `rental-unit-b-${suffix}`,
            name: 'Rental Type B',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 22_000,
            monthlyRentTo: 25_000,
            unitSize: 88,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 8,
            availableUnits: 5,
            reservedUnits: 1,
          },
        ],
      },
    });

    expect(createPayload.monthlyRentFrom).toBe(14_500);
    expect(createPayload.monthlyRentTo).toBe(25_000);
    expect(createPayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(createPayload.unitTypes[0]).not.toHaveProperty('startingBid');

    const created = await caller.developer.createDevelopment(createPayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Rental Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Rental Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();
    expect(Number(typeA.monthlyRentFrom)).toBe(14_500);
    expect(Number(typeB.monthlyRentTo)).toBe(25_000);
    expect(Number(typeA.basePriceFrom)).toBe(0);
    expect(typeA.basePriceTo).toBeNull();
    expect(typeA.startingBid).toBeNull();
    expect(hydrated!.workflowId).toBe('residential_rent');
    expect(hydrated!.developmentData.transactionType).toBe('for_rent');
    expect(hydrated!.developmentData.location).toMatchObject({
      city: hydrated!.city,
      province: hydrated!.province,
    });
    const rentalStepTypeA = hydrated!.stepData.unit_types.unitTypes.find(
      (unit: any) => unit.id === typeA.id,
    );
    expect(Number(rentalStepTypeA.monthlyRentFrom)).toBe(14_500);
    expect(Number(rentalStepTypeA.monthlyRentTo)).toBe(16_500);
    expect(rentalStepTypeA).not.toHaveProperty('basePriceFrom');
    expect(rentalStepTypeA).not.toHaveProperty('startingBid');

    const updatePayload = buildDevelopmentSubmitPayload({
      amenities: ['Rooftop terrace'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            monthlyRentFrom: 15_500,
            monthlyRentTo: 18_000,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(updatePayload.unitTypes[1].monthlyRentFrom).toBeUndefined();
    expect(updatePayload.unitTypes[1].monthlyRentTo).toBeUndefined();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_rent',
        currentStepId: 'review_publish',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: updatePayload.unitTypes } },
        developmentData: {
          name: updatePayload.name,
          transactionType: updatePayload.transactionType,
        },
        ...updatePayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(Number(updatedTypeA.monthlyRentFrom)).toBe(15_500);
    expect(Number(updatedTypeA.monthlyRentTo)).toBe(18_000);
    expect(Number(updatedTypeB.monthlyRentFrom)).toBe(22_000);
    expect(Number(updatedTypeB.monthlyRentTo)).toBe(25_000);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(0);
    expect(updatedTypeA.basePriceTo).toBeNull();
    expect(updatedTypeA.startingBid).toBeNull();
    expect(Number(updated!.monthlyRentTo)).toBe(25_000);

    await db
      .update(developments)
      .set({
        isPublished: 1,
        approvalStatus: 'approved' as any,
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(developments.id, createdDevelopmentId));

    const publicResult = await caller.developer.getPublishedDevelopments({
      province: 'Western Cape',
      developmentType: 'residential',
      transactionType: 'for_rent',
      limit: 50,
    });
    const publicDevelopment = publicResult.developments.find(
      (development: any) => Number(development.id) === createdDevelopmentId,
    );

    expect(publicDevelopment).toBeDefined();
    expect(publicDevelopment.configurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Rental Type A',
          listingType: 'rent',
          priceFrom: 15_500,
          priceTo: 18_000,
        }),
        expect.objectContaining({
          label: 'Rental Type B',
          listingType: 'rent',
          priceFrom: 22_000,
          priceTo: 25_000,
        }),
      ]),
    );
  }, 120000);

  it('switches sale inventory to rental without changing unit identity or leaking stale sale prices', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-sale-to-rent',
      'Sale To Rent Developer',
    );

    const salePayload = buildDevelopmentSubmitPayload({
      amenities: ['Clubhouse'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: `Sale To Rent Development ${suffix}`,
        description: 'Canonical transaction switching coverage.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: '21 Switch Road',
          suburb: 'Sea Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8005',
        },
        heroImage: 'https://example.com/sale-to-rent-hero.jpg',
        unitTypes: [
          {
            id: `switch-unit-a-${suffix}`,
            name: 'Switch Type A',
            bedrooms: 1,
            bathrooms: 1,
            priceFrom: 1_250_000,
            priceTo: 1_450_000,
            unitSize: 55,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 10,
            availableUnits: 7,
            reservedUnits: 1,
          },
          {
            id: `switch-unit-b-${suffix}`,
            name: 'Switch Type B',
            bedrooms: 2,
            bathrooms: 2,
            priceFrom: 1_850_000,
            priceTo: 2_100_000,
            unitSize: 82,
            parkingType: 'garage',
            parkingBays: 1,
            totalUnits: 6,
            availableUnits: 4,
            reservedUnits: 1,
          },
        ],
      },
    });

    const created = await caller.developer.createDevelopment(salePayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Switch Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Switch Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();
    expect(Number(hydrated!.priceFrom)).toBe(1_250_000);
    expect(Number(hydrated!.priceTo)).toBe(2_100_000);

    const rentPayload = buildDevelopmentSubmitPayload({
      amenities: ['Clubhouse'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        heroImage: 'https://example.com/sale-to-rent-hero.jpg',
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            priceFrom: 99_999_999,
            monthlyRentFrom: 12_500,
            monthlyRentTo: 14_000,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            priceFrom: 88_888_888,
            monthlyRentFrom: 18_500,
            monthlyRentTo: 21_000,
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(rentPayload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(rentPayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_rent',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: rentPayload.unitTypes } },
        developmentData: {
          name: rentPayload.name,
          transactionType: rentPayload.transactionType,
        },
        ...rentPayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(updated!.developmentData.transactionType).toBe('for_rent');
    expect(updated!.workflowId).toBe('residential_rent');
    expect(updated!.unitTypes).toHaveLength(2);
    expect(updatedTypeA?.id).toBe(typeA.id);
    expect(updatedTypeB?.id).toBe(typeB.id);
    expect(Number(updatedTypeA.monthlyRentFrom)).toBe(12_500);
    expect(Number(updatedTypeB.monthlyRentTo)).toBe(21_000);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(0);
    expect(updatedTypeA.basePriceTo).toBeNull();
    expect(updated!.priceFrom).toBeNull();
    expect(updated!.priceTo).toBeNull();
    expect(Number(updated!.monthlyRentFrom)).toBe(12_500);
    expect(Number(updated!.monthlyRentTo)).toBe(21_000);

    const [storedDevelopment] = await db
      .select({
        transactionType: developments.transactionType,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(storedDevelopment).toMatchObject({
      transactionType: 'for_rent',
      priceFrom: null,
      priceTo: null,
    });
    expect(Number(storedDevelopment.monthlyRentFrom)).toBe(12_500);
    expect(Number(storedDevelopment.monthlyRentTo)).toBe(21_000);
    expect(updated!.stepData.unit_types.unitTypes.map((unit: any) => unit.id)).toEqual(
      expect.arrayContaining([typeA.id, typeB.id]),
    );
    expect(updated!.stepData.unit_types.unitTypes).toHaveLength(2);
    for (const unit of updated!.stepData.unit_types.unitTypes) {
      expect(unit).not.toHaveProperty('priceFrom');
      expect(unit).not.toHaveProperty('basePriceFrom');
    }
  }, 120000);

  it('switches sale inventory to rental through a canonical unit_types partial save without owning unrelated fields', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-unit-types-partial-switch',
      'Unit Types Partial Switch Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Unit Types Partial Switch ${suffix}`,
      tagline: 'Original inventory tagline',
      subtitle: 'Original inventory subtitle',
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      ownershipType: 'sectional-title',
      address: '11 Inventory Switch Road',
      suburb: 'Green Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8051',
      description:
        'Created to prove canonical unit_types partial saves own inventory but not metadata.',
      images: [{ url: 'https://example.com/unit-types-partial-original-hero.jpg' }],
      videos: ['https://example.com/unit-types-partial-original-video.mp4'],
      floorPlans: ['https://example.com/unit-types-partial-original-floorplan.pdf'],
      brochures: ['https://example.com/unit-types-partial-original-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_150,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Partial Switch Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          unitSize: 82,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 2,
          baseMedia: {
            gallery: [{ url: 'https://example.com/unit-types-partial-original-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/unit-types-partial-original-plan.pdf' }],
            renders: [{ url: 'https://example.com/unit-types-partial-original-render.jpg' }],
          },
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_450_000);
    expect(Number(before!.priceTo)).toBe(1_650_000);
    expect(before!.unitTypes).toHaveLength(1);
    const beforeUnit = before!.unitTypes[0];

    const unitTypesPartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_rent',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          tagline: 'Stale inventory tagline',
          description: 'Stale inventory description',
          developmentType: 'residential',
          transactionType: 'for_rent',
          monthlyLevyFrom: 99_999,
          location: {
            address: '99 Stale Inventory Road',
            city: 'Stale Inventory City',
            province: 'Stale Inventory Province',
          },
          media: {
            heroImage: { url: 'https://example.com/stale-inventory-hero.jpg' },
          },
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'for_rent',
          },
          identity_market: {
            name: `${before!.name} Stale Step`,
            subtitle: 'Stale inventory subtitle',
          },
          location: {
            address: '88 Stale Step Inventory Road',
            city: 'Stale Step Inventory City',
            province: 'Stale Step Inventory Province',
          },
          development_media: {
            heroImage: { url: 'https://example.com/stale-step-inventory-hero.jpg' },
          },
          governance_finances: {
            levyRange: { min: 88_888, max: 99_999 },
            rightsAndTaxes: { min: 77_777, max: 88_888 },
          },
          unit_types: {
            selectedUnitId: beforeUnit.id,
            unitTypes: [
              {
                id: beforeUnit.id,
                name: beforeUnit.name,
                bedrooms: beforeUnit.bedrooms,
                bathrooms: beforeUnit.bathrooms,
                priceFrom: 99_999_999,
                priceTo: 111_111_111,
                monthlyRentFrom: 14_500,
                monthlyRentTo: 17_250,
                unitSize: beforeUnit.unitSize,
                parkingType: beforeUnit.parkingType,
                parkingBays: beforeUnit.parkingBays,
                totalUnits: beforeUnit.totalUnits,
                availableUnits: 5,
                reservedUnits: beforeUnit.reservedUnits,
                baseMedia: {
                  gallery: [
                    { url: 'https://example.com/unit-types-partial-updated-gallery.jpg' },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    expect(unitTypesPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(unitTypesPartialPayload).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      developmentType: 'residential',
      transactionType: 'for_rent',
      monthlyRentFrom: 14_500,
      monthlyRentTo: 17_250,
      totalUnits: 10,
      availableUnits: 5,
      stepData: {
        unit_types: {
          selectedUnitId: beforeUnit.id,
          unitTypes: [
            expect.objectContaining({
              id: beforeUnit.id,
              monthlyRentFrom: 14_500,
              monthlyRentTo: 17_250,
            }),
          ],
        },
      },
    });
    expect(unitTypesPartialPayload).not.toHaveProperty('name');
    expect(unitTypesPartialPayload).not.toHaveProperty('tagline');
    expect(unitTypesPartialPayload).not.toHaveProperty('description');
    expect(unitTypesPartialPayload).not.toHaveProperty('city');
    expect(unitTypesPartialPayload).not.toHaveProperty('images');
    expect(unitTypesPartialPayload).not.toHaveProperty('monthlyLevyFrom');
    expect(unitTypesPartialPayload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(unitTypesPartialPayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: unitTypesPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.name).toBe(`Unit Types Partial Switch ${suffix}`);
    expect(rawAfter.tagline).toBe('Original inventory tagline');
    expect(rawAfter.description).toBe(
      'Created to prove canonical unit_types partial saves own inventory but not metadata.',
    );
    expect(rawAfter.address).toBe('11 Inventory Switch Road');
    expect(rawAfter.city).toBe('Cape Town');
    expect(String(rawAfter.images)).toContain('unit-types-partial-original-hero.jpg');
    expect(String(rawAfter.videos)).toContain('unit-types-partial-original-video.mp4');
    expect(String(rawAfter.floorPlans)).toContain('unit-types-partial-original-floorplan.pdf');
    expect(String(rawAfter.brochures)).toContain('unit-types-partial-original-brochure.pdf');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(Number(rawAfter.ratesFrom)).toBe(950);
    expect(rawAfter.transactionType).toBe('for_rent');
    expect(rawAfter.priceFrom).toBeNull();
    expect(rawAfter.priceTo).toBeNull();
    expect(Number(rawAfter.monthlyRentFrom)).toBe(14_500);
    expect(Number(rawAfter.monthlyRentTo)).toBe(17_250);
    expect(Number(rawAfter.totalUnits)).toBe(10);
    expect(Number(rawAfter.availableUnits)).toBe(5);

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter).toHaveLength(1);
    expect(rawUnitsAfter[0].id).toBe(beforeUnit.id);
    expect(rawUnitsAfter[0].name).toBe('Partial Switch Type A');
    expect(Number(rawUnitsAfter[0].monthlyRentFrom)).toBe(14_500);
    expect(Number(rawUnitsAfter[0].monthlyRentTo)).toBe(17_250);
    expect(Number(rawUnitsAfter[0].basePriceFrom)).toBe(0);
    expect(rawUnitsAfter[0].basePriceTo).toBeNull();
    const rawBaseMedia =
      typeof rawUnitsAfter[0].baseMedia === 'string'
        ? JSON.parse(rawUnitsAfter[0].baseMedia)
        : rawUnitsAfter[0].baseMedia;
    expect(rawBaseMedia.gallery).toEqual([
      { url: 'https://example.com/unit-types-partial-updated-gallery.jpg' },
    ]);
    expect(rawBaseMedia.floorPlans).toEqual([
      { url: 'https://example.com/unit-types-partial-original-plan.pdf' },
    ]);
    expect(rawBaseMedia.renders).toEqual([
      { url: 'https://example.com/unit-types-partial-original-render.jpg' },
    ]);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.workflowId).toBe('residential_rent');
    expect(after!.currentStepId).toBe('unit_types');
    expect(after!.developmentData.transactionType).toBe('for_rent');
    expect(after!.developmentData.location).toMatchObject({
      address: '11 Inventory Switch Road',
      city: 'Cape Town',
      province: 'Western Cape',
    });
    expect(after!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/unit-types-partial-original-hero.jpg',
    );
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes[0].id).toBe(beforeUnit.id);
    expect(Number(after!.unitTypes[0].monthlyRentFrom)).toBe(14_500);
    expect(after!.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: beforeUnit.id,
      baseMedia: rawBaseMedia,
    });
    expect(Number(after!.stepData.unit_types.unitTypes[0].monthlyRentFrom)).toBe(14_500);
    expect(Number(after!.stepData.unit_types.unitTypes[0].monthlyRentTo)).toBe(17_250);
    expect(after!.stepData.unit_types.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(after!.stepData.unit_types.unitTypes[0]).not.toHaveProperty('basePriceFrom');
  }, 120000);

  it('rejects partial transaction switches when the unit_types snapshot omits existing units', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-partial-switch-omitted-units',
      'Partial Switch Omitted Units Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Partial Switch Omitted Units ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '16 Partial Switch Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Created to prove partial transaction switches require all units.',
      images: [{ url: 'https://example.com/partial-switch-omitted-hero.jpg' }],
      unitTypes: [
        {
          name: 'Partial Switch Omitted Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_250_000,
          basePriceTo: 1_450_000,
          unitSize: 76,
          totalUnits: 8,
          availableUnits: 5,
          reservedUnits: 1,
        },
        {
          name: 'Partial Switch Omitted Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_850_000,
          basePriceTo: 2_050_000,
          unitSize: 114,
          totalUnits: 5,
          availableUnits: 3,
          reservedUnits: 0,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = before!.unitTypes.find(
      (unit: any) => unit.name === 'Partial Switch Omitted Type A',
    );
    const typeB = before!.unitTypes.find(
      (unit: any) => unit.name === 'Partial Switch Omitted Type B',
    );
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    await expect(
      caller.developer.updateDevelopment({
        id: createdDevelopmentId,
        data: {
          canonicalUpdateMode: 'partial_step',
          workflowId: 'residential_rent',
          currentStepId: 'unit_types',
          completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
          developmentType: 'residential',
          transactionType: 'for_rent',
          monthlyRentFrom: 14_500,
          monthlyRentTo: 16_000,
          stepData: {
            unit_types: {
              selectedUnitId: typeA.id,
              unitTypes: [
                {
                  id: typeA.id,
                  name: 'Partial Switch Omitted Type A',
                  bedrooms: 2,
                  bathrooms: 2,
                  monthlyRentFrom: 14_500,
                  monthlyRentTo: 16_000,
                  unitSize: 76,
                  totalUnits: 8,
                  availableUnits: 4,
                  reservedUnits: 2,
                },
              ],
            },
          },
          unitTypes: [
            {
              id: typeA.id,
              name: 'Partial Switch Omitted Type A',
              monthlyRentFrom: 14_500,
              monthlyRentTo: 16_000,
              totalUnits: 8,
              availableUnits: 4,
              reservedUnits: 2,
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('full unit_types snapshot'),
    });

    const [rawAfter] = await db
      .select({ transactionType: developments.transactionType })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter.transactionType).toBe('for_sale');

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id).sort()).toEqual([typeA.id, typeB.id].sort());
  }, 120000);

  it('clears stale development aggregates when transaction type changes without a unit payload', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-transaction-only-switch',
      'Transaction Only Switch Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Transaction Only Switch ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '8 Mode Road',
      suburb: 'Gardens',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      description: 'Transaction-only switch coverage.',
      images: [{ url: 'https://example.com/transaction-only-hero.jpg' }],
      unitTypes: [
        {
          id: `transaction-only-unit-a-${suffix}`,
          name: 'Transaction Only Type A',
          bedrooms: 1,
          bathrooms: 1,
          priceFrom: 1_100_000,
          priceTo: 1_300_000,
          unitSize: 52,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 8,
          availableUnits: 5,
          reservedUnits: 1,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const existingUnitId = before!.unitTypes[0].id;
    expect(Number(before!.priceFrom)).toBe(1_100_000);
    expect(Number(before!.priceTo)).toBe(1_300_000);

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_rent',
        currentStepId: 'configuration',
        completedSteps: ['identity_market', 'configuration'],
        developmentData: {
          name: before!.name,
          transactionType: 'for_rent',
        },
        name: before!.name,
        transactionType: 'for_rent',
        description: before!.description,
      },
    });

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.developmentData.transactionType).toBe('for_rent');
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes[0].id).toBe(existingUnitId);
    expect(after!.priceFrom).toBeNull();
    expect(after!.priceTo).toBeNull();
    expect(after!.monthlyRentFrom).toBeNull();
    expect(after!.monthlyRentTo).toBeNull();
    expect(after!.stepData.unit_types.unitTypes[0].id).toBe(existingUnitId);
    expect(after!.stepData.unit_types.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(after!.stepData.unit_types.unitTypes[0]).not.toHaveProperty('basePriceFrom');

    const [storedDevelopment] = await db
      .select({
        transactionType: developments.transactionType,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(storedDevelopment).toMatchObject({
      transactionType: 'for_rent',
      priceFrom: null,
      priceTo: null,
      monthlyRentFrom: null,
      monthlyRentTo: null,
    });
  }, 120000);

  it('persists canonical configuration step data without owning location, media, governance, or inventory', async () => {
    const configurationOwnedFields = new Set(
      CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.configuration,
    );
    expect(configurationOwnedFields).toEqual(new Set(['developmentType', 'transactionType']));
    expect(
      [
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.unitTypes,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.identityMarket,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.marketingSummary,
      ].some(field => configurationOwnedFields.has(field)),
    ).toBe(false);

    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-configuration',
      'Canonical Configuration Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Configuration Development ${suffix}`,
      tagline: 'Original configuration tagline',
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      ownershipType: 'sectional-title',
      launchDate: '2026-08-01',
      completionDate: '2027-12-15',
      address: '4 Configuration Road',
      suburb: 'Morningside',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2057',
      description:
        'Created with location, media, governance, and inventory that configuration edits must preserve.',
      images: [{ url: 'https://example.com/configuration-original-hero.jpg' }],
      videos: ['https://example.com/configuration-original-video.mp4'],
      floorPlans: ['https://example.com/configuration-original-floorplan.pdf'],
      brochures: ['https://example.com/configuration-original-brochure.pdf'],
      monthlyLevyFrom: 1_400,
      monthlyLevyTo: 1_950,
      ratesFrom: 975,
      ratesTo: 1_225,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Configuration Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_600_000,
          basePriceTo: 1_850_000,
          unitSize: 90,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 11,
          availableUnits: 8,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(before!.developmentData.transactionType).toBe('for_sale');
    expect(Number(before!.priceFrom)).toBe(1_600_000);
    expect(Number(before!.priceTo)).toBe(1_850_000);
    const beforeUnitId = before!.unitTypes[0].id;

    const configurationPartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_rent',
        currentStepId: 'configuration',
        completedSteps: ['identity_market'],
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'for_rent',
          },
          identity_market: {
            name: `Stale Configuration Mirror ${suffix}`,
            tagline: 'Stale configuration tagline',
            status: 'sold-out',
          },
          location: {
            address: '99 Stale Configuration Road',
            city: 'Stale Configuration City',
            province: 'Stale Configuration Province',
          },
          marketing_summary: {
            description: 'Stale configuration-step marketing mirror.',
          },
          governance_finances: {
            levyRange: { min: 9_999, max: 10_999 },
            rightsAndTaxes: { min: 8_888, max: 9_888 },
            transferCostsIncluded: false,
          },
          development_media: {
            heroImage: { url: 'https://example.com/stale-configuration-hero.jpg' },
          },
          unit_types: {
            unitTypes: [
              {
                id: beforeUnitId,
                name: 'Stale configuration-step unit mirror',
                monthlyRentFrom: 99_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `Stale Configuration Development Data ${suffix}`,
          developmentType: 'residential',
          transactionType: 'for_rent',
          location: {
            address: '88 Stale Nested Configuration Road',
            city: 'Stale Nested Configuration City',
            province: 'Stale Nested Configuration Province',
          },
          media: {
            heroImage: { url: 'https://example.com/stale-nested-configuration-hero.jpg' },
          },
        },
        unitTypes: [],
      },
    });
    expect(configurationPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(configurationPartialPayload.stepData).toEqual({
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
    });
    expect(configurationPartialPayload).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'configuration',
      developmentType: 'residential',
      transactionType: 'for_rent',
    });
    expect(configurationPartialPayload).not.toHaveProperty('name');
    expect(configurationPartialPayload).not.toHaveProperty('description');
    expect(configurationPartialPayload).not.toHaveProperty('unitTypes');
    expect(configurationPartialPayload).not.toHaveProperty('priceFrom');
    expect(configurationPartialPayload).not.toHaveProperty('monthlyRentFrom');
    expect(configurationPartialPayload).not.toHaveProperty('city');
    expect(configurationPartialPayload).not.toHaveProperty('images');
    expect(configurationPartialPayload).not.toHaveProperty('monthlyLevyFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: configurationPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.developmentType).toBe('residential');
    expect(rawAfter.transactionType).toBe('for_rent');
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.tagline).toBe('Original configuration tagline');
    expect(rawAfter.description).toBe(
      'Created with location, media, governance, and inventory that configuration edits must preserve.',
    );
    expect(rawAfter.address).toBe('4 Configuration Road');
    expect(rawAfter.suburb).toBe('Morningside');
    expect(rawAfter.city).toBe('Johannesburg');
    expect(rawAfter.province).toBe('Gauteng');
    expect(rawAfter.postalCode).toBe('2057');
    expect(String(rawAfter.images)).toContain('configuration-original-hero.jpg');
    expect(String(rawAfter.videos)).toContain('configuration-original-video.mp4');
    expect(String(rawAfter.floorPlans)).toContain('configuration-original-floorplan.pdf');
    expect(String(rawAfter.brochures)).toContain('configuration-original-brochure.pdf');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_400);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_950);
    expect(Number(rawAfter.ratesFrom)).toBe(975);
    expect(Number(rawAfter.ratesTo)).toBe(1_225);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(1);
    expect(rawAfter.priceFrom).toBeNull();
    expect(rawAfter.priceTo).toBeNull();
    expect(rawAfter.monthlyRentFrom).toBeNull();
    expect(rawAfter.monthlyRentTo).toBeNull();

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter).toHaveLength(1);
    expect(rawUnitsAfter[0].id).toBe(beforeUnitId);
    expect(rawUnitsAfter[0].name).toBe('Configuration Type A');
    expect(Number(rawUnitsAfter[0].basePriceFrom)).toBe(1_600_000);
    expect(Number(rawUnitsAfter[0].basePriceTo)).toBe(1_850_000);
    expect(Number(rawUnitsAfter[0].totalUnits)).toBe(11);
    expect(Number(rawUnitsAfter[0].availableUnits)).toBe(8);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.workflowId).toBe('residential_rent');
    expect(after!.developmentData.transactionType).toBe('for_rent');
    expect(after!.developmentData.location).toMatchObject({
      address: '4 Configuration Road',
      suburb: 'Morningside',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2057',
    });
    expect(after!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/configuration-original-hero.jpg',
    );
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes[0].id).toBe(beforeUnitId);
    expect(after!.priceFrom).toBeNull();
    expect(after!.priceTo).toBeNull();
    expect(after!.monthlyRentFrom).toBeNull();
    expect(after!.monthlyRentTo).toBeNull();
    expect(after!.stepData.configuration).toMatchObject({
      developmentType: 'residential',
      transactionType: 'for_rent',
    });
    expect(after!.stepData.unit_types.unitTypes[0].id).toBe(beforeUnitId);
  }, 120000);

  it('switches rental inventory to sale without changing unit identity or leaking stale rent', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-rent-to-sale',
      'Rent To Sale Developer',
    );

    const rentPayload = buildDevelopmentSubmitPayload({
      amenities: ['Co-working lounge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: `Rent To Sale Development ${suffix}`,
        description: 'Canonical rent to sale transaction switch coverage.',
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'selling',
        location: {
          address: '32 Conversion Road',
          suburb: 'Rosebank',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2196',
        },
        heroImage: 'https://example.com/rent-to-sale-hero.jpg',
        unitTypes: [
          {
            id: `rent-sale-unit-a-${suffix}`,
            name: 'Rent Sale Type A',
            bedrooms: 1,
            bathrooms: 1,
            monthlyRentFrom: 11_500,
            monthlyRentTo: 13_000,
            unitSize: 54,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 9,
            availableUnits: 6,
            reservedUnits: 1,
          },
          {
            id: `rent-sale-unit-b-${suffix}`,
            name: 'Rent Sale Type B',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 17_500,
            monthlyRentTo: 19_500,
            unitSize: 86,
            parkingType: 'garage',
            parkingBays: 1,
            totalUnits: 5,
            availableUnits: 3,
            reservedUnits: 1,
          },
        ],
      },
    });

    const created = await caller.developer.createDevelopment(rentPayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Rent Sale Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Rent Sale Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();
    expect(Number(hydrated!.monthlyRentFrom)).toBe(11_500);
    expect(Number(hydrated!.monthlyRentTo)).toBe(19_500);

    const salePayload = buildDevelopmentSubmitPayload({
      amenities: ['Co-working lounge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        heroImage: 'https://example.com/rent-to-sale-hero.jpg',
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            monthlyRentFrom: 77_777,
            priceFrom: 1_350_000,
            priceTo: 1_525_000,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            monthlyRentFrom: 88_888,
            priceFrom: 1_950_000,
            priceTo: 2_150_000,
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(salePayload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(salePayload.unitTypes[0]).not.toHaveProperty('monthlyRentTo');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: salePayload.unitTypes } },
        developmentData: {
          name: salePayload.name,
          transactionType: salePayload.transactionType,
        },
        ...salePayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(updated!.developmentData.transactionType).toBe('for_sale');
    expect(updated!.workflowId).toBe('residential_sale');
    expect(updated!.unitTypes).toHaveLength(2);
    expect(updatedTypeA?.id).toBe(typeA.id);
    expect(updatedTypeB?.id).toBe(typeB.id);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(1_350_000);
    expect(Number(updatedTypeB.basePriceTo)).toBe(2_150_000);
    expect(updatedTypeA.monthlyRentFrom).toBeNull();
    expect(updatedTypeB.monthlyRentTo).toBeNull();
    expect(Number(updated!.priceFrom)).toBe(1_350_000);
    expect(Number(updated!.priceTo)).toBe(2_150_000);
    expect(updated!.monthlyRentFrom).toBeNull();
    expect(updated!.monthlyRentTo).toBeNull();

    const [storedDevelopment] = await db
      .select({
        transactionType: developments.transactionType,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(storedDevelopment).toMatchObject({
      transactionType: 'for_sale',
      monthlyRentFrom: null,
      monthlyRentTo: null,
    });
    expect(Number(storedDevelopment.priceFrom)).toBe(1_350_000);
    expect(Number(storedDevelopment.priceTo)).toBe(2_150_000);
    expect(updated!.stepData.unit_types.unitTypes.map((unit: any) => unit.id)).toEqual(
      expect.arrayContaining([typeA.id, typeB.id]),
    );
    expect(updated!.stepData.unit_types.unitTypes).toHaveLength(2);
    for (const unit of updated!.stepData.unit_types.unitTypes) {
      expect(unit).not.toHaveProperty('monthlyRentFrom');
    }
  }, 120000);

  it('switches sale inventory to auction without changing unit identity or leaking stale sale/rent fields', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-sale-to-auction',
      'Sale To Auction Developer',
    );

    const salePayload = buildDevelopmentSubmitPayload({
      amenities: ['Concierge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: `Sale To Auction Development ${suffix}`,
        description: 'Canonical sale to auction transaction switch coverage.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: '9 Auction Switch Road',
          suburb: 'Umhlanga Rocks',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          postalCode: '4319',
        },
        heroImage: 'https://example.com/sale-to-auction-hero.jpg',
        unitTypes: [
          {
            id: `sale-auction-unit-a-${suffix}`,
            name: 'Sale Auction Type A',
            bedrooms: 2,
            bathrooms: 2,
            priceFrom: 1_700_000,
            priceTo: 1_950_000,
            unitSize: 78,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 7,
            availableUnits: 4,
            reservedUnits: 1,
          },
          {
            id: `sale-auction-unit-b-${suffix}`,
            name: 'Sale Auction Type B',
            bedrooms: 3,
            bathrooms: 2,
            priceFrom: 2_300_000,
            priceTo: 2_600_000,
            unitSize: 112,
            parkingType: 'garage',
            parkingBays: 2,
            totalUnits: 4,
            availableUnits: 2,
            reservedUnits: 1,
          },
        ],
      },
    });

    const created = await caller.developer.createDevelopment(salePayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Sale Auction Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Sale Auction Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();

    const auctionPayload = buildDevelopmentSubmitPayload({
      amenities: ['Concierge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'auction',
        auctionType: 'online',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        heroImage: 'https://example.com/sale-to-auction-hero.jpg',
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            priceFrom: 99_999_999,
            monthlyRentFrom: 55_555,
            startingBid: 1_200_000,
            reservePrice: 1_425_000,
            auctionStartDate: '2026-11-10T10:00:00.000Z',
            auctionEndDate: '2026-11-20T17:00:00.000Z',
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            priceFrom: 88_888_888,
            monthlyRentFrom: 44_444,
            startingBid: 1_650_000,
            reservePrice: 1_900_000,
            auctionStartDate: '2026-11-08T10:00:00.000Z',
            auctionEndDate: '2026-11-22T17:00:00.000Z',
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(auctionPayload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(auctionPayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(auctionPayload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_auction',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: auctionPayload.unitTypes } },
        developmentData: {
          name: auctionPayload.name,
          transactionType: auctionPayload.transactionType,
        },
        ...auctionPayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(updated!.developmentData.transactionType).toBe('auction');
    expect(updated!.workflowId).toBe('residential_auction');
    expect(updated!.unitTypes).toHaveLength(2);
    expect(updatedTypeA?.id).toBe(typeA.id);
    expect(updatedTypeB?.id).toBe(typeB.id);
    expect(Number(updatedTypeA.startingBid)).toBe(1_200_000);
    expect(Number(updatedTypeB.reservePrice)).toBe(1_900_000);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(0);
    expect(updatedTypeA.basePriceTo).toBeNull();
    expect(updatedTypeA.monthlyRentFrom).toBeNull();
    expect(updated!.priceFrom).toBeNull();
    expect(updated!.priceTo).toBeNull();
    expect(updated!.monthlyRentFrom).toBeNull();
    expect(updated!.monthlyRentTo).toBeNull();
    expect(Number(updated!.startingBidFrom)).toBe(1_200_000);
    expect(Number(updated!.reservePriceFrom)).toBe(1_425_000);

    const [storedDevelopment] = await db
      .select({
        transactionType: developments.transactionType,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        monthlyRentFrom: developments.monthlyRentFrom,
        monthlyRentTo: developments.monthlyRentTo,
        startingBidFrom: developments.startingBidFrom,
        reservePriceFrom: developments.reservePriceFrom,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(storedDevelopment).toMatchObject({
      transactionType: 'auction',
      priceFrom: null,
      priceTo: null,
      monthlyRentFrom: null,
      monthlyRentTo: null,
    });
    expect(Number(storedDevelopment.startingBidFrom)).toBe(1_200_000);
    expect(Number(storedDevelopment.reservePriceFrom)).toBe(1_425_000);
    expect(updated!.stepData.unit_types.unitTypes.map((unit: any) => unit.id)).toEqual(
      expect.arrayContaining([typeA.id, typeB.id]),
    );
    expect(updated!.stepData.unit_types.unitTypes).toHaveLength(2);
    for (const unit of updated!.stepData.unit_types.unitTypes) {
      expect(unit).not.toHaveProperty('priceFrom');
      expect(unit).not.toHaveProperty('monthlyRentFrom');
    }
  }, 120000);

  it('preserves auction terms through helper submit and partial edit', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-auction-submit',
      'Auction Submit Developer',
    );

    const createPayload = buildDevelopmentSubmitPayload({
      amenities: ['Concierge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: `Auction Submit Development ${suffix}`,
        description: 'Auction canonical submit coverage.',
        developmentType: 'residential',
        transactionType: 'auction',
        auctionType: 'online',
        status: 'selling',
        location: {
          address: '22 Auction Avenue',
          suburb: 'Sea Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8005',
        },
        heroImage: 'https://example.com/auction-submit-hero.jpg',
        unitTypes: [
          {
            id: `auction-unit-a-${suffix}`,
            name: 'Auction Type A',
            bedrooms: 2,
            bathrooms: 2,
            startingBid: 1_200_000,
            reservePrice: 1_400_000,
            auctionStartDate: '2026-09-10T10:00:00.000Z',
            auctionEndDate: '2026-09-20T17:00:00.000Z',
            basePriceFrom: 2_000_000,
            monthlyRentFrom: 18_000,
            unitSize: 84,
            parkingType: 'covered',
            parkingBays: 1,
            totalUnits: 5,
            availableUnits: 3,
            reservedUnits: 1,
          },
          {
            id: `auction-unit-b-${suffix}`,
            name: 'Auction Type B',
            bedrooms: 1,
            bathrooms: 1,
            startingBid: 850_000,
            reservePrice: 1_050_000,
            auctionStartDate: '2026-09-08T10:00:00.000Z',
            auctionEndDate: '2026-09-18T17:00:00.000Z',
            unitSize: 62,
            parkingType: 'open',
            parkingBays: 1,
            totalUnits: 7,
            availableUnits: 4,
            reservedUnits: 1,
          },
        ],
      },
    });

    expect(createPayload.startingBidFrom).toBe(850_000);
    expect(createPayload.reservePriceFrom).toBe(1_050_000);
    expect(createPayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(createPayload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');

    const created = await caller.developer.createDevelopment(createPayload as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const typeA = hydrated!.unitTypes.find((unit: any) => unit.name === 'Auction Type A');
    const typeB = hydrated!.unitTypes.find((unit: any) => unit.name === 'Auction Type B');
    expect(typeA?.id).toBeTruthy();
    expect(typeB?.id).toBeTruthy();
    expect(Number(typeA.startingBid)).toBe(1_200_000);
    expect(Number(typeB.reservePrice)).toBe(1_050_000);
    expect(Number(typeA.basePriceFrom)).toBe(0);
    expect(typeA.basePriceTo).toBeNull();
    expect(typeA.monthlyRentFrom).toBeNull();
    expect(hydrated!.workflowId).toBe('residential_auction');
    expect(hydrated!.developmentData.transactionType).toBe('auction');
    expect(hydrated!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/auction-submit-hero.jpg',
    );
    const auctionStepTypeA = hydrated!.stepData.unit_types.unitTypes.find(
      (unit: any) => unit.id === typeA.id,
    );
    expect(Number(auctionStepTypeA.startingBid)).toBe(1_200_000);
    expect(Number(auctionStepTypeA.reservePrice)).toBe(1_400_000);
    expect(auctionStepTypeA).not.toHaveProperty('basePriceFrom');
    expect(auctionStepTypeA).not.toHaveProperty('monthlyRentFrom');

    const updatePayload = buildDevelopmentSubmitPayload({
      amenities: ['Concierge'],
      residentialConfig: { residentialType: 'apartment' },
      wizardData: {
        name: hydrated!.name,
        description: hydrated!.description,
        developmentType: 'residential',
        transactionType: 'auction',
        auctionType: 'online',
        status: 'selling',
        location: {
          address: hydrated!.address,
          suburb: hydrated!.suburb,
          city: hydrated!.city,
          province: hydrated!.province,
          postalCode: hydrated!.postalCode,
        },
        unitTypes: [
          {
            id: typeA.id,
            name: typeA.name,
            bedrooms: typeA.bedrooms,
            bathrooms: typeA.bathrooms,
            startingBid: 1_300_000,
            reservePrice: 1_500_000,
            auctionStartDate: typeA.auctionStartDate,
            auctionEndDate: typeA.auctionEndDate,
            unitSize: typeA.unitSize,
            parkingType: typeA.parkingType,
            parkingBays: typeA.parkingBays,
            totalUnits: typeA.totalUnits,
            availableUnits: typeA.availableUnits,
            reservedUnits: typeA.reservedUnits,
          },
          {
            id: typeB.id,
            name: typeB.name,
            bedrooms: typeB.bedrooms,
            bathrooms: typeB.bathrooms,
            unitSize: typeB.unitSize,
            parkingType: typeB.parkingType,
            parkingBays: typeB.parkingBays,
            totalUnits: typeB.totalUnits,
            availableUnits: typeB.availableUnits,
            reservedUnits: typeB.reservedUnits,
          },
        ],
      },
    });

    expect(updatePayload.unitTypes[1].startingBid).toBeUndefined();
    expect(updatePayload.unitTypes[1].reservePrice).toBeUndefined();

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_auction',
        currentStepId: 'review_publish',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: { unit_types: { unitTypes: updatePayload.unitTypes } },
        developmentData: {
          name: updatePayload.name,
          transactionType: updatePayload.transactionType,
        },
        ...updatePayload,
      },
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const updatedTypeA = updated!.unitTypes.find((unit: any) => unit.id === typeA.id);
    const updatedTypeB = updated!.unitTypes.find((unit: any) => unit.id === typeB.id);
    expect(Number(updatedTypeA.startingBid)).toBe(1_300_000);
    expect(Number(updatedTypeA.reservePrice)).toBe(1_500_000);
    expect(Number(updatedTypeB.startingBid)).toBe(850_000);
    expect(Number(updatedTypeB.reservePrice)).toBe(1_050_000);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(0);
    expect(updatedTypeA.basePriceTo).toBeNull();
    expect(updatedTypeA.monthlyRentFrom).toBeNull();
    expect(Number(updated!.startingBidFrom)).toBe(850_000);
    expect(Number(updated!.reservePriceFrom)).toBe(1_050_000);

    const completedStepsShapeResult = await db.execute(sql`
      SELECT JSON_TYPE(${developments.completedSteps}) AS completedStepsType
      FROM ${developments}
      WHERE ${developments.id} = ${createdDevelopmentId}
    `);
    const completedStepsShapeRows = Array.isArray(completedStepsShapeResult)
      ? (completedStepsShapeResult[0] as Array<{ completedStepsType: string }>)
      : [];
    expect(completedStepsShapeRows[0]?.completedStepsType).toBe('ARRAY');

    await db
      .update(developments)
      .set({
        isPublished: 1,
        approvalStatus: 'approved' as any,
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(developments.id, createdDevelopmentId));

    const publicResult = await caller.developer.getPublishedDevelopments({
      province: 'Western Cape',
      developmentType: 'residential',
      transactionType: 'auction',
      limit: 50,
    });
    const publicDevelopment = publicResult.developments.find(
      (development: any) => Number(development.id) === createdDevelopmentId,
    );

    expect(publicDevelopment).toBeDefined();
    expect(publicDevelopment.configurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Auction Type A',
          listingType: 'auction',
          priceFrom: 1_300_000,
          priceTo: 1_500_000,
        }),
        expect.objectContaining({
          label: 'Auction Type B',
          listingType: 'auction',
          priceFrom: 850_000,
          priceTo: 1_050_000,
        }),
      ]),
    );

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        startingBidFrom: 900_000,
        reservePriceFrom: 1_100_000,
      },
    });

    const [storedAfterMirrorCorrection] = await db
      .select({
        startingBidFrom: developments.startingBidFrom,
        reservePriceFrom: developments.reservePriceFrom,
      })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(storedAfterMirrorCorrection.startingBidFrom)).toBe(900_000);
    expect(Number(storedAfterMirrorCorrection.reservePriceFrom)).toBe(1_100_000);
  }, 120000);

  it('preserves omitted database fields during canonical metadata-only edits', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-partial',
      'Canonical Partial Edit Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Partial Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '44 Snapshot Road',
      suburb: 'Claremont',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7708',
      description: 'Created with commercial inventory and fields that partial edits must preserve.',
      images: [{ url: 'https://example.com/canonical-partial.jpg' }],
      videos: ['https://example.com/canonical-partial-video.mp4'],
      floorPlans: ['https://example.com/canonical-partial-floorplan.pdf'],
      brochures: ['https://example.com/canonical-partial-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Partial Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_350_000,
          basePriceTo: 1_550_000,
          unitSize: 82,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
        },
        {
          name: 'Partial Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_900_000,
          basePriceTo: 2_250_000,
          unitSize: 118,
          parkingType: 'garage',
          parkingBays: 2,
          totalUnits: 6,
          availableUnits: 4,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_350_000);
    expect(Number(before!.priceTo)).toBe(2_250_000);
    expect(Number(before!.monthlyLevyFrom)).toBe(1_250);
    expect(Number(before!.ratesFrom)).toBe(950);
    expect(before!.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com/canonical-partial.jpg' }),
      ]),
    );
    expect(String(before!.videos)).toContain('canonical-partial-video.mp4');
    expect(String(before!.floorPlans)).toContain('canonical-partial-floorplan.pdf');
    expect(String(before!.brochures)).toContain('canonical-partial-brochure.pdf');
    const beforeTypeA = before!.unitTypes.find((unit: any) => unit.name === 'Partial Type A');
    const beforeTypeB = before!.unitTypes.find((unit: any) => unit.name === 'Partial Type B');
    expect(beforeTypeA?.id).toBeTruthy();
    expect(beforeTypeB?.id).toBeTruthy();

    const marketingPartialPayload = buildDevelopmentEditSavePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'marketing_summary',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: {
          marketing_summary: {
            description: 'Metadata-only edit through the canonical snapshot path.',
            tagline: 'Updated marketing tagline',
            keySellingPoints: ['Updated outlook', 'Walkable address'],
          },
          location: {
            city: 'Stale Marketing City',
            province: 'Stale Marketing Province',
          },
          unit_types: {
            unitTypes: [
              {
                id: beforeTypeA!.id,
                name: 'Stale marketing-step unit mirror',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          transactionType: 'for_sale',
          description: 'Stale nested marketing description.',
          location: {
            city: 'Stale Nested City',
            province: 'Stale Nested Province',
          },
        },
      },
    });
    expect(marketingPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(marketingPartialPayload).toMatchObject({
      currentStepId: 'marketing_summary',
      description: 'Metadata-only edit through the canonical snapshot path.',
      tagline: 'Updated marketing tagline',
      highlights: ['Updated outlook', 'Walkable address'],
      stepData: {
        marketing_summary: {
          description: 'Metadata-only edit through the canonical snapshot path.',
          tagline: 'Updated marketing tagline',
          keySellingPoints: ['Updated outlook', 'Walkable address'],
        },
      },
    });
    expect(marketingPartialPayload).not.toHaveProperty('unitTypes');
    expect(marketingPartialPayload).not.toHaveProperty('priceFrom');
    expect(marketingPartialPayload).not.toHaveProperty('city');
    expect(marketingPartialPayload).not.toHaveProperty('images');
    expect(marketingPartialPayload).not.toHaveProperty('monthlyLevyFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: marketingPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.description).toBe('Metadata-only edit through the canonical snapshot path.');
    expect(rawAfter.tagline).toBe('Updated marketing tagline');
    expect(Number(rawAfter.priceFrom)).toBe(1_350_000);
    expect(Number(rawAfter.priceTo)).toBe(2_250_000);
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_750);
    expect(Number(rawAfter.ratesFrom)).toBe(950);
    expect(Number(rawAfter.ratesTo)).toBe(1_200);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(1);
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(String(rawAfter.images)).toContain('canonical-partial.jpg');
    expect(String(rawAfter.videos)).toContain('canonical-partial-video.mp4');
    expect(String(rawAfter.floorPlans)).toContain('canonical-partial-floorplan.pdf');
    expect(String(rawAfter.brochures)).toContain('canonical-partial-brochure.pdf');
    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id).sort()).toEqual(
      [beforeTypeA!.id, beforeTypeB!.id].sort(),
    );

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes).toHaveLength(2);
    const afterTypeA = after!.unitTypes.find((unit: any) => unit.id === beforeTypeA!.id);
    const afterTypeB = after!.unitTypes.find((unit: any) => unit.id === beforeTypeB!.id);
    expect(afterTypeA).toMatchObject({
      id: beforeTypeA!.id,
      name: 'Partial Type A',
      bedrooms: 2,
      unitSize: 82,
      parkingType: 'covered',
      parkingBays: 1,
      totalUnits: 10,
      availableUnits: 6,
    });
    expect(Number(afterTypeA!.bathrooms)).toBe(2);
    expect(Number(afterTypeA!.basePriceFrom)).toBe(1_350_000);
    expect(Number(afterTypeA!.basePriceTo)).toBe(1_550_000);
    expect(afterTypeB).toMatchObject({
      id: beforeTypeB!.id,
      name: 'Partial Type B',
      bedrooms: 3,
      unitSize: 118,
      parkingType: 'garage',
      parkingBays: 2,
      totalUnits: 6,
      availableUnits: 4,
    });
    expect(Number(afterTypeB!.bathrooms)).toBe(2);
    expect(Number(afterTypeB!.basePriceFrom)).toBe(1_900_000);
    expect(Number(afterTypeB!.basePriceTo)).toBe(2_250_000);
    expect(Number(after!.priceFrom)).toBe(1_350_000);
    expect(Number(after!.priceTo)).toBe(2_250_000);
    expect(after!.developmentData.media.videos).toEqual([
      'https://example.com/canonical-partial-video.mp4',
    ]);
    expect(after!.developmentData.media.documents).toEqual([
      'https://example.com/canonical-partial-brochure.pdf',
    ]);
    expect(after!.stepData.unit_types.unitTypes).toHaveLength(2);
  }, 120000);

  it('preserves DB fields and unit identity during review-step manual saves', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-review-manual-save',
      'Review Manual Save Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Review Manual Save Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '55 Review Road',
      suburb: 'Claremont',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7708',
      description: 'Created with fields that review manual saves must preserve.',
      images: [{ url: 'https://example.com/review-manual-original.jpg' }],
      videos: ['https://example.com/review-manual-original-video.mp4'],
      floorPlans: ['https://example.com/review-manual-original-floorplan.pdf'],
      brochures: ['https://example.com/review-manual-original-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Review Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_350_000,
          basePriceTo: 1_550_000,
          unitSize: 82,
          totalUnits: 10,
          availableUnits: 6,
        },
        {
          name: 'Review Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_900_000,
          basePriceTo: 2_250_000,
          unitSize: 118,
          totalUnits: 6,
          availableUnits: 4,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const beforeUnitIds = before!.unitTypes.map((unit: any) => unit.id).sort();

    const reviewPartialPayload = buildDevelopmentEditSavePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        completedSteps: DEVELOPMENT_WORKFLOW_STEPS,
        stepData: {
          review_publish: {
            confirmed: true,
          },
          unit_types: {
            unitTypes: [
              {
                id: before!.unitTypes[0].id,
                name: 'Stale review mirror unit',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `${before!.name} Stale Review Mirror`,
          transactionType: 'for_sale',
          description: 'Stale review mirror description.',
          location: {
            city: 'Stale Review City',
            province: 'Stale Review Province',
          },
          media: {
            heroImage: { url: 'https://example.com/stale-review-hero.jpg' },
          },
        },
      },
    });

    expect(reviewPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(reviewPartialPayload).not.toHaveProperty('name');
    expect(reviewPartialPayload).not.toHaveProperty('description');
    expect(reviewPartialPayload).not.toHaveProperty('city');
    expect(reviewPartialPayload).not.toHaveProperty('images');
    expect(reviewPartialPayload).not.toHaveProperty('unitTypes');
    expect(reviewPartialPayload.stepData).toEqual({
      review_publish: {
        confirmed: true,
      },
    });

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: reviewPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    const completedSteps =
      typeof rawAfter.completedSteps === 'string'
        ? JSON.parse(rawAfter.completedSteps)
        : rawAfter.completedSteps;

    expect(rawAfter.workflowId).toBe('residential_sale');
    expect(rawAfter.currentStepId).toBe('review_publish');
    expect(completedSteps).toEqual(DEVELOPMENT_WORKFLOW_STEPS);
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.description).toBe('Created with fields that review manual saves must preserve.');
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(String(rawAfter.images)).toContain('review-manual-original.jpg');
    expect(String(rawAfter.videos)).toContain('review-manual-original-video.mp4');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(Number(rawAfter.ratesFrom)).toBe(950);
    expect(Number(rawAfter.priceFrom)).toBe(1_350_000);
    expect(Number(rawAfter.priceTo)).toBe(2_250_000);

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id).sort()).toEqual(beforeUnitIds);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes.map((unit: any) => unit.id).sort()).toEqual(beforeUnitIds);
    expect(after!.stepData.unit_types.unitTypes).toHaveLength(2);
  }, 120000);

  it('persists canonical identity step data without owning location, media, governance, or inventory', async () => {
    const identityOwnedFields = new Set(
      CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.identityMarket,
    );
    expect(identityOwnedFields).toEqual(
      new Set([
        'name',
        'subtitle',
        'status',
        'nature',
        'ownershipTypes',
        'ownershipType',
        'marketingRole',
        'launchDate',
        'completionDate',
      ]),
    );
    expect(
      [
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.unitTypes,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.marketingSummary,
      ].some(field => identityOwnedFields.has(field)),
    ).toBe(false);

    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-identity',
      'Canonical Identity Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Identity Development ${suffix}`,
      tagline: 'Original identity tagline',
      subtitle: 'Original identity subtitle',
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      ownershipType: 'sectional-title',
      launchDate: '2026-08-01',
      completionDate: '2027-12-15',
      address: '7 Original Identity Road',
      suburb: 'Parktown',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2193',
      description:
        'Created with location, media, governance, and inventory that identity edits must preserve.',
      images: [{ url: 'https://example.com/identity-original-hero.jpg' }],
      videos: ['https://example.com/identity-original-video.mp4'],
      floorPlans: ['https://example.com/identity-original-floorplan.pdf'],
      brochures: ['https://example.com/identity-original-brochure.pdf'],
      monthlyLevyFrom: 1_300,
      monthlyLevyTo: 1_900,
      ratesFrom: 900,
      ratesTo: 1_150,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Identity Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_500_000,
          basePriceTo: 1_750_000,
          unitSize: 88,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 7,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_500_000);
    expect(Number(before!.monthlyLevyFrom)).toBe(1_300);
    expect(before!.address).toBe('7 Original Identity Road');
    expect(before!.unitTypes).toHaveLength(1);
    const beforeUnitId = before!.unitTypes[0].id;

    const identityPartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'identity_market',
        completedSteps: ['configuration', 'location', 'unit_types'],
        stepData: {
          identity_market: {
            name: `Canonical Identity Updated ${suffix}`,
            subtitle: 'Updated identity subtitle',
            status: 'launching-soon',
            ownershipType: 'full-title',
            ownershipTypes: ['full-title'],
            launchDate: '2026-09-15',
            completionDate: '2028-01-20',
          },
          location: {
            address: '99 Stale Identity Road',
            city: 'Stale Identity City',
            province: 'Stale Identity Province',
          },
          marketing_summary: {
            description: 'Stale identity-step marketing mirror.',
          },
          development_media: {
            heroImage: { url: 'https://example.com/stale-identity-hero.jpg' },
          },
          unit_types: {
            unitTypes: [
              {
                id: beforeUnitId,
                name: 'Stale identity-step unit mirror',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `Stale Development Data Name ${suffix}`,
          transactionType: 'for_sale',
          description: 'Stale nested identity description.',
          location: {
            address: '88 Stale Nested Identity Road',
            city: 'Stale Nested Identity City',
            province: 'Stale Nested Identity Province',
          },
          media: {
            heroImage: { url: 'https://example.com/stale-nested-identity-hero.jpg' },
          },
        },
      },
    });
    expect(identityPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(identityPartialPayload.stepData).toEqual({
      identity_market: {
        name: `Canonical Identity Updated ${suffix}`,
        subtitle: 'Updated identity subtitle',
        status: 'launching-soon',
        ownershipType: 'full-title',
        ownershipTypes: ['full-title'],
        launchDate: '2026-09-15',
        completionDate: '2028-01-20',
      },
    });
    expect(identityPartialPayload).toMatchObject({
      name: `Canonical Identity Updated ${suffix}`,
      subtitle: 'Updated identity subtitle',
      status: 'launching-soon',
      ownershipType: 'full-title',
      launchDate: '2026-09-15',
      completionDate: '2028-01-20',
    });
    expect(identityPartialPayload).not.toHaveProperty('tagline');
    expect(identityPartialPayload).not.toHaveProperty('description');
    expect(identityPartialPayload).not.toHaveProperty('unitTypes');
    expect(identityPartialPayload).not.toHaveProperty('priceFrom');
    expect(identityPartialPayload).not.toHaveProperty('city');
    expect(identityPartialPayload).not.toHaveProperty('images');
    expect(identityPartialPayload).not.toHaveProperty('monthlyLevyFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: identityPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.name).toBe(`Canonical Identity Updated ${suffix}`);
    expect(rawAfter.tagline).toBe('Original identity tagline');
    expect(rawAfter.subtitle).toBe('Updated identity subtitle');
    expect(rawAfter.status).toBe('launching-soon');
    expect(rawAfter.ownershipType).toBe('full-title');
    expect(String(rawAfter.launchDate)).toContain('2026-09-15');
    expect(String(rawAfter.completionDate)).toContain('2028-01-20');
    expect(rawAfter.description).toBe(
      'Created with location, media, governance, and inventory that identity edits must preserve.',
    );
    expect(rawAfter.address).toBe('7 Original Identity Road');
    expect(rawAfter.suburb).toBe('Parktown');
    expect(rawAfter.city).toBe('Johannesburg');
    expect(rawAfter.province).toBe('Gauteng');
    expect(rawAfter.postalCode).toBe('2193');
    expect(String(rawAfter.images)).toContain('identity-original-hero.jpg');
    expect(String(rawAfter.videos)).toContain('identity-original-video.mp4');
    expect(String(rawAfter.floorPlans)).toContain('identity-original-floorplan.pdf');
    expect(String(rawAfter.brochures)).toContain('identity-original-brochure.pdf');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_300);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_900);
    expect(Number(rawAfter.ratesFrom)).toBe(900);
    expect(Number(rawAfter.ratesTo)).toBe(1_150);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(1);
    expect(Number(rawAfter.priceFrom)).toBe(1_500_000);
    expect(Number(rawAfter.priceTo)).toBe(1_750_000);

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter).toHaveLength(1);
    expect(rawUnitsAfter[0].id).toBe(beforeUnitId);
    expect(rawUnitsAfter[0].name).toBe('Identity Type A');
    expect(Number(rawUnitsAfter[0].basePriceFrom)).toBe(1_500_000);
    expect(Number(rawUnitsAfter[0].totalUnits)).toBe(10);
    expect(Number(rawUnitsAfter[0].availableUnits)).toBe(7);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.developmentData.location).toMatchObject({
      address: '7 Original Identity Road',
      suburb: 'Parktown',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2193',
    });
    expect(after!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/identity-original-hero.jpg',
    );
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes[0].id).toBe(beforeUnitId);
    expect(Number(after!.priceFrom)).toBe(1_500_000);
    expect(Number(after!.developmentData.monthlyLevyFrom)).toBe(1_300);
    expect(after!.stepData.identity_market).toMatchObject({
      name: `Canonical Identity Updated ${suffix}`,
      subtitle: 'Updated identity subtitle',
      status: 'launching-soon',
      ownershipType: 'full-title',
    });
  }, 120000);

  it('persists canonical amenities partial saves without owning unrelated fields', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-amenities-partial',
      'Amenities Partial Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Amenities Partial Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '12 Amenity Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      description: 'Created to prove amenities partial saves only own amenities fields.',
      images: [{ url: 'https://example.com/amenities-partial.jpg' }],
      amenities: ['Pool', 'Gym'],
      features: ['Solar ready', 'Backup power'],
      monthlyLevyFrom: 1_450,
      ratesFrom: 875,
      unitTypes: [
        {
          name: 'Amenity Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          totalUnits: 10,
          availableUnits: 6,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const beforeUnitId = before!.unitTypes[0].id;

    const amenitiesPartialPayload = buildDevelopmentEditSavePayload({
      amenities: ['Stale caller amenity'],
      residentialConfig: {
        residentialType: 'apartment',
      },
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'amenities_features',
        completedSteps: ['configuration', 'identity_market', 'location', 'amenities_features'],
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          developmentType: 'residential',
          transactionType: 'for_sale',
          amenities: ['Stale nested amenity'],
          features: ['Stale nested feature'],
          location: {
            city: 'Stale Nested City',
            province: 'Stale Nested Province',
          },
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'for_sale',
          },
          location: {
            city: 'Stale Step City',
            province: 'Stale Step Province',
          },
          amenities_features: {
            amenities: [],
            features: [],
          },
          unit_types: {
            unitTypes: [
              {
                id: beforeUnitId,
                name: 'Stale amenities-step unit mirror',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
      },
    });

    expect(amenitiesPartialPayload).toMatchObject({
      currentStepId: 'amenities_features',
      canonicalUpdateMode: 'partial_step',
      amenities: [],
      features: [],
      stepData: {
        amenities_features: {
          amenities: [],
          features: [],
        },
      },
    });
    expect(amenitiesPartialPayload).not.toHaveProperty('city');
    expect(amenitiesPartialPayload).not.toHaveProperty('unitTypes');
    expect(amenitiesPartialPayload.features).not.toContain('cfg:res_type:apartment');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: amenitiesPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(JSON.parse(String(rawAfter.amenities))).toEqual([]);
    expect(JSON.parse(String(rawAfter.features))).toEqual([]);
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(Number(rawAfter.priceFrom)).toBe(1_450_000);
    expect(Number(rawAfter.priceTo)).toBe(1_650_000);
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_450);
    expect(Number(rawAfter.ratesFrom)).toBe(875);
    expect(String(rawAfter.images)).toContain('amenities-partial.jpg');

    const afterUnits = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(afterUnits).toHaveLength(1);
    expect(afterUnits[0]).toMatchObject({
      id: beforeUnitId,
      name: 'Amenity Type A',
      totalUnits: 10,
      availableUnits: 6,
    });
    expect(Number(afterUnits[0].basePriceFrom)).toBe(1_450_000);
  }, 120000);

  it('ignores malformed canonical partial updates instead of broadening to legacy fields', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-malformed-partial',
      'Malformed Partial Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Malformed Partial Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '4 Guardrail Road',
      suburb: 'Gardens',
      city: 'Cape Town',
      province: 'Western Cape',
      description: 'Created to prove malformed partial updates cannot broaden ownership.',
      images: [{ url: 'https://example.com/malformed-partial.jpg' }],
      monthlyLevyFrom: 1_250,
      unitTypes: [
        {
          name: 'Malformed Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_350_000,
          basePriceTo: 1_550_000,
          totalUnits: 10,
          availableUnits: 6,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const beforeUnitId = before!.unitTypes[0].id;

    const consoleLogSpy = vi.spyOn(console, 'log');
    try {
      await caller.developer.updateDevelopment({
        id: createdDevelopmentId,
        data: {
          workflowId: 'residential_sale',
          currentStepId: 'unknown_step',
          canonicalUpdateMode: 'partial_step',
          name: `${before!.name} Stale Mirror`,
          city: 'Stale City',
          priceFrom: 999_999,
          developmentData: {
            name: `${before!.name} Stale Nested Mirror`,
            location: {
              city: 'Stale Nested City',
              province: 'Stale Nested Province',
            },
          },
          stepData: {
            unknown_step: {
              name: 'Unknown step should not own anything',
            },
            unit_types: {
              unitTypes: [
                {
                  id: beforeUnitId,
                  name: 'Stale malformed unit mirror',
                  priceFrom: 999_999,
                  totalUnits: 99,
                  availableUnits: 99,
                },
              ],
            },
          },
          unitTypes: [
            {
              id: beforeUnitId,
              name: 'Stale root unit mirror',
              priceFrom: 999_999,
              totalUnits: 99,
              availableUnits: 99,
            },
          ],
        },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[updateDevelopment] Unit types update mode:',
        'none',
      );
    } finally {
      consoleLogSpy.mockRestore();
    }

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(Number(rawAfter.priceFrom)).toBe(1_350_000);
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(String(rawAfter.images)).toContain('malformed-partial.jpg');

    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter).toHaveLength(1);
    expect(rawUnitsAfter[0].id).toBe(beforeUnitId);
    expect(rawUnitsAfter[0].name).toBe('Malformed Type A');
    expect(Number(rawUnitsAfter[0].basePriceFrom)).toBe(1_350_000);
    expect(Number(rawUnitsAfter[0].totalUnits)).toBe(10);
    expect(Number(rawUnitsAfter[0].availableUnits)).toBe(6);
  }, 120000);

  it('persists canonical location step data without owning media, governance, or inventory', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-location',
      'Canonical Location Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Location Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '1 Original Street',
      suburb: 'Claremont',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7708',
      description:
        'Created with media, governance, and inventory that location edits must preserve.',
      images: [{ url: 'https://example.com/location-original-hero.jpg' }],
      videos: ['https://example.com/location-original-video.mp4'],
      brochures: ['https://example.com/location-original-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Location Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_350_000,
          basePriceTo: 1_550_000,
          unitSize: 82,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_350_000);
    expect(Number(before!.monthlyLevyFrom)).toBe(1_250);
    expect(before!.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com/location-original-hero.jpg' }),
      ]),
    );

    const locationPartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'location',
        completedSteps: ['identity_market', 'configuration'],
        stepData: {
          location: {
            address: '22 Canonical Location Lane',
            suburb: 'Green Point',
            city: 'Cape Town',
            province: 'Western Cape',
            postalCode: '8051',
            latitude: '-33.906',
            longitude: '18.405',
          },
          unit_types: {
            unitTypes: [
              {
                id: before!.unitTypes[0].id,
                name: 'Stale location-step unit mirror',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          transactionType: 'for_sale',
          media: {
            heroImage: { url: 'https://example.com/stale-location-hero.jpg' },
          },
        },
      },
    });
    expect(locationPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(locationPartialPayload.stepData).toEqual({
      location: {
        address: '22 Canonical Location Lane',
        suburb: 'Green Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8051',
        latitude: '-33.906',
        longitude: '18.405',
      },
    });
    expect(locationPartialPayload).not.toHaveProperty('unitTypes');
    expect(locationPartialPayload).not.toHaveProperty('priceFrom');
    expect(locationPartialPayload).not.toHaveProperty('monthlyLevyFrom');
    expect(locationPartialPayload).not.toHaveProperty('images');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: locationPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.address).toBe('22 Canonical Location Lane');
    expect(rawAfter.suburb).toBe('Green Point');
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(rawAfter.postalCode).toBe('8051');
    expect(String(rawAfter.latitude)).toBe('-33.906');
    expect(String(rawAfter.longitude)).toBe('18.405');
    expect(rawAfter.name).toBe(before!.name);
    expect(String(rawAfter.images)).toContain('location-original-hero.jpg');
    expect(String(rawAfter.videos)).toContain('location-original-video.mp4');
    expect(String(rawAfter.brochures)).toContain('location-original-brochure.pdf');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_750);
    expect(Number(rawAfter.ratesFrom)).toBe(950);
    expect(Number(rawAfter.ratesTo)).toBe(1_200);
    expect(Number(rawAfter.priceFrom)).toBe(1_350_000);
    expect(Number(rawAfter.priceTo)).toBe(1_550_000);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.developmentData.location).toMatchObject({
      address: '22 Canonical Location Lane',
      suburb: 'Green Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8051',
    });
    expect(after!.stepData.location).toMatchObject({
      address: '22 Canonical Location Lane',
      suburb: 'Green Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8051',
    });
    expect(Number(after!.priceFrom)).toBe(1_350_000);
    expect(Number(after!.developmentData.monthlyLevyFrom)).toBe(1_250);
  }, 120000);

  it('uses the route id as the update target when canonical draft identity fields conflict', async () => {
    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-update-target',
      'Canonical Update Target Developer',
    );

    const target = await caller.developer.createDevelopment({
      name: `Route Target Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '10 Target Road',
      city: 'Cape Town',
      province: 'Western Cape',
      description: 'The route id should identify this development during update.',
      images: [{ url: 'https://example.com/route-target.jpg' }],
      unitTypes: [
        {
          name: 'Target Type',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_250_000,
          totalUnits: 8,
          availableUnits: 5,
        },
      ],
    } as any);
    createdDevelopmentId = Number(target.development.id);

    const decoy = await caller.developer.createDevelopment({
      name: `Conflicting Identity Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '99 Decoy Road',
      city: 'Cape Town',
      province: 'Western Cape',
      description: 'This development id is carried only as stale draft identity.',
      images: [{ url: 'https://example.com/route-decoy.jpg' }],
      unitTypes: [
        {
          name: 'Decoy Type',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_950_000,
          totalUnits: 4,
          availableUnits: 3,
        },
      ],
    } as any);
    createdSecondaryDevelopmentId = Number(decoy.development.id);

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: {
        workflowId: 'residential_sale',
        currentStepId: 'marketing_summary',
        completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
        editingId: createdSecondaryDevelopmentId,
        developmentId: createdSecondaryDevelopmentId,
        stepData: {
          marketing_summary: {
            description: 'Updated through route-id-owned canonical mutation.',
          },
        },
        developmentData: {
          name: `Route Target Development ${suffix} Updated`,
          transactionType: 'for_sale',
          description: 'Updated through route-id-owned canonical mutation.',
        },
      },
    });

    const [storedTarget] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    const [storedDecoy] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdSecondaryDevelopmentId))
      .limit(1);

    expect(storedTarget.name).toBe(`Route Target Development ${suffix} Updated`);
    expect(storedTarget.description).toBe('Updated through route-id-owned canonical mutation.');
    expect(Number(storedTarget.priceFrom)).toBe(1_250_000);
    expect(storedDecoy.name).toBe(`Conflicting Identity Development ${suffix}`);
    expect(storedDecoy.description).toBe(
      'This development id is carried only as stale draft identity.',
    );
    expect(Number(storedDecoy.priceFrom)).toBe(1_950_000);
  }, 120000);

  it('persists canonical governance finances without owning location, media, or inventory', async () => {
    const governanceOwnedFields = new Set(
      CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
    );
    expect(governanceOwnedFields).toEqual(
      new Set([
        'monthlyLevyFrom',
        'monthlyLevyTo',
        'ratesFrom',
        'ratesTo',
        'transferCostsIncluded',
      ]),
    );
    expect(
      [
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.unitTypes,
      ].some(field => governanceOwnedFields.has(field)),
    ).toBe(false);

    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-governance',
      'Canonical Governance Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Governance Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '19 Finance Lane',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      description:
        'Created with location, media, and inventory so governance edits must not own them.',
      images: [{ url: 'https://example.com/canonical-governance.jpg' }],
      videos: ['https://example.com/canonical-governance-video.mp4'],
      brochures: ['https://example.com/canonical-governance-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Governance Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          unitSize: 84,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 12,
          availableUnits: 7,
        },
        {
          name: 'Governance Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 2_100_000,
          basePriceTo: 2_450_000,
          unitSize: 126,
          parkingType: 'garage',
          parkingBays: 2,
          totalUnits: 8,
          availableUnits: 5,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_450_000);
    expect(Number(before!.priceTo)).toBe(2_450_000);
    expect(before!.address).toBe('19 Finance Lane');
    expect(before!.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com/canonical-governance.jpg' }),
      ]),
    );
    expect(before!.unitTypes).toHaveLength(2);

    const governancePartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'governance_finances',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: {
          governance_finances: {
            levyRange: { min: 1_500, max: 2_100 },
            rightsAndTaxes: { min: 1_000, max: 1_300 },
            transferCostsIncluded: false,
          },
          location: {
            address: '99 Stale Governance Mirror',
            city: 'Stale Governance City',
            province: 'Stale Governance Province',
          },
          unit_types: {
            unitTypes: [
              {
                id: before!.unitTypes[0].id,
                name: 'Stale governance-step unit mirror',
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          transactionType: 'for_sale',
          media: {
            heroImage: { url: 'https://example.com/stale-governance-hero.jpg' },
          },
        },
      },
    });
    expect(governancePartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(governancePartialPayload.stepData).toEqual({
      governance_finances: {
        levyRange: { min: 1_500, max: 2_100 },
        rightsAndTaxes: { min: 1_000, max: 1_300 },
        transferCostsIncluded: false,
      },
    });
    expect(governancePartialPayload).not.toHaveProperty('unitTypes');
    expect(governancePartialPayload).not.toHaveProperty('priceFrom');
    expect(governancePartialPayload).not.toHaveProperty('city');
    expect(governancePartialPayload).not.toHaveProperty('images');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: governancePartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_500);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(2_100);
    expect(Number(rawAfter.ratesFrom)).toBe(1_000);
    expect(Number(rawAfter.ratesTo)).toBe(1_300);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(0);
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.address).toBe('19 Finance Lane');
    expect(rawAfter.suburb).toBe('Rosebank');
    expect(rawAfter.city).toBe('Johannesburg');
    expect(rawAfter.province).toBe('Gauteng');
    expect(rawAfter.postalCode).toBe('2196');
    expect(String(rawAfter.images)).toContain('canonical-governance.jpg');
    expect(String(rawAfter.videos)).toContain('canonical-governance-video.mp4');
    expect(String(rawAfter.brochures)).toContain('canonical-governance-brochure.pdf');
    expect(Number(rawAfter.priceFrom)).toBe(1_450_000);
    expect(Number(rawAfter.priceTo)).toBe(2_450_000);

    const estateSpecs =
      typeof rawAfter.estateSpecs === 'string'
        ? JSON.parse(rawAfter.estateSpecs)
        : rawAfter.estateSpecs;
    expect(estateSpecs).toMatchObject({
      levyRange: { min: 1_500, max: 2_100 },
      rightsAndTaxes: { min: 1_000, max: 1_300 },
      transferCostsIncluded: false,
    });

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes).toHaveLength(2);
    expect(after!.developmentData.location).toMatchObject({
      address: '19 Finance Lane',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
    });
    expect(after!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/canonical-governance.jpg',
    );
    expect(Number(after!.priceFrom)).toBe(1_450_000);
    expect(Number(after!.priceTo)).toBe(2_450_000);
    expect(Number(after!.developmentData.transferCostsIncluded)).toBe(0);
    expect(Number(after!.stepData.governance_finances.levyRange.min)).toBe(1_500);
    expect(Number(after!.stepData.governance_finances.rightsAndTaxes.min)).toBe(1_000);
  }, 120000);

  it('persists canonical media step data without owning location, governance, or inventory', async () => {
    const mediaOwnedFields = new Set(CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia);
    expect(mediaOwnedFields).toEqual(new Set(['images', 'videos', 'floorPlans', 'brochures']));
    expect(
      [
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
        ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.unitTypes,
      ].some(field => mediaOwnedFields.has(field)),
    ).toBe(false);

    const { db, suffix, caller } = await createDeveloperCaller(
      'dev-canonical-media',
      'Canonical Media Developer',
    );

    const created = await caller.developer.createDevelopment({
      name: `Canonical Media Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '12 Media Avenue',
      suburb: 'Umhlanga',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postalCode: '4320',
      description:
        'Created with location, governance, and inventory so media edits must not own them.',
      images: [{ url: 'https://example.com/original-hero.jpg' }],
      videos: ['https://example.com/original-video.mp4'],
      floorPlans: ['https://example.com/original-floorplan.pdf'],
      brochures: ['https://example.com/original-brochure.pdf'],
      monthlyLevyFrom: 1_100,
      monthlyLevyTo: 1_800,
      ratesFrom: 800,
      ratesTo: 1_050,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Media Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_250_000,
          basePriceTo: 1_450_000,
          unitSize: 76,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(Number(before!.priceFrom)).toBe(1_250_000);
    expect(Number(before!.monthlyLevyFrom)).toBe(1_100);
    expect(before!.address).toBe('12 Media Avenue');
    expect(before!.unitTypes).toHaveLength(1);
    const beforeUnitId = before!.unitTypes[0].id;

    const mediaPartialPayload = buildDevelopmentPartialUpdatePayload({
      amenities: before!.amenities ?? [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'development_media',
        completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
        stepData: {
          development_media: {
            heroImage: { url: 'https://example.com/canonical-media-hero.jpg' },
            photos: [{ url: 'https://example.com/canonical-media-gallery.jpg' }],
            videos: [{ url: 'https://example.com/canonical-media-video.mp4' }],
            floorPlans: [{ url: 'https://example.com/canonical-media-floorplan.pdf' }],
            documents: [{ url: 'https://example.com/canonical-media-brochure.pdf' }],
          },
          unit_types: {
            unitTypes: [
              {
                id: beforeUnitId,
                name: 'Stale media-step unit mirror',
                bedrooms: 1,
                bathrooms: 1,
                priceFrom: 999_999,
                totalUnits: 99,
                availableUnits: 99,
              },
            ],
          },
        },
        developmentData: {
          name: `${before!.name} Stale Mirror`,
          transactionType: 'for_sale',
          developmentType: 'residential',
          location: {
            city: 'Stale Mirror City',
            province: 'Stale Mirror Province',
          },
        },
        unitTypes: [],
      },
    });
    expect(mediaPartialPayload.canonicalUpdateMode).toBe('partial_step');
    expect(mediaPartialPayload).not.toHaveProperty('unitTypes');
    expect(mediaPartialPayload).not.toHaveProperty('priceFrom');
    expect(mediaPartialPayload).not.toHaveProperty('totalUnits');
    expect(mediaPartialPayload).not.toHaveProperty('media');
    expect(mediaPartialPayload.stepData).not.toHaveProperty('unit_types');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: mediaPartialPayload,
    });

    const [rawAfter] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter).toBeDefined();
    expect(rawAfter.name).toBe(before!.name);
    expect(JSON.parse(String(rawAfter.images))).toEqual([
      { url: 'https://example.com/canonical-media-hero.jpg' },
      { url: 'https://example.com/canonical-media-gallery.jpg' },
    ]);
    expect(JSON.parse(String(rawAfter.videos))).toEqual([
      'https://example.com/canonical-media-video.mp4',
    ]);
    expect(JSON.parse(String(rawAfter.floorPlans))).toEqual([
      'https://example.com/canonical-media-floorplan.pdf',
    ]);
    expect(JSON.parse(String(rawAfter.brochures))).toEqual([
      'https://example.com/canonical-media-brochure.pdf',
    ]);
    expect(rawAfter.address).toBe('12 Media Avenue');
    expect(rawAfter.suburb).toBe('Umhlanga');
    expect(rawAfter.city).toBe('Durban');
    expect(rawAfter.province).toBe('KwaZulu-Natal');
    expect(rawAfter.postalCode).toBe('4320');
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_100);
    expect(Number(rawAfter.monthlyLevyTo)).toBe(1_800);
    expect(Number(rawAfter.ratesFrom)).toBe(800);
    expect(Number(rawAfter.ratesTo)).toBe(1_050);
    expect(Number(rawAfter.transferCostsIncluded)).toBe(1);
    expect(Number(rawAfter.priceFrom)).toBe(1_250_000);
    expect(Number(rawAfter.priceTo)).toBe(1_450_000);
    const rawUnitsAfter = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id)).toEqual([beforeUnitId]);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes).toHaveLength(1);
    expect(after!.unitTypes[0].id).toBe(beforeUnitId);
    expect(after!.developmentData.location).toMatchObject({
      address: '12 Media Avenue',
      suburb: 'Umhlanga',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      postalCode: '4320',
    });
    expect(Number(after!.developmentData.monthlyLevyFrom)).toBe(1_100);
    expect(Number(after!.developmentData.transferCostsIncluded)).toBe(1);
    expect(after!.developmentData.media.heroImage?.url).toBe(
      'https://example.com/canonical-media-hero.jpg',
    );
    expect(after!.developmentData.media.floorPlans).toEqual([
      'https://example.com/canonical-media-floorplan.pdf',
    ]);
    expect(after!.stepData.development_media.videos).toEqual([
      'https://example.com/canonical-media-video.mp4',
    ]);
    expect(after!.stepData.development_media.floorPlans).toEqual([
      'https://example.com/canonical-media-floorplan.pdf',
    ]);
    expect(after!.stepData.development_media.documents).toEqual([
      'https://example.com/canonical-media-brochure.pdf',
    ]);
  }, 120000);
});

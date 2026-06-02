import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developmentService } from '../services/developmentService';
import {
  buildDevelopmentEditProgressPayload,
  buildDevelopmentEditSavePayload,
  buildDevelopmentUpdatePayload,
} from '../../client/src/lib/developmentSubmitPayload';
import { buildCanonicalRentalEditSnapshotFixture } from '../test-utils/canonicalDevelopmentFixtures';
import { resolveDevelopmentUpdateIntent } from '../lib/developmentUpdateIntent';
import { DEVELOPMENT_WORKFLOW_STEPS } from '../../shared/developmentWorkflow';
import {
  developmentDrafts,
  developments,
  developerBrandProfiles,
  developers,
  unitTypes,
  users,
} from '../../drizzle/schema';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const getInsertId = (insertResult: unknown): number => {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    return Number((candidate as { insertId: number }).insertId);
  }
  throw new Error('Unable to read insertId from insert result');
};

const parseCompletedSteps = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== 'string' || !value.trim()) return [];
  return JSON.parse(value) as string[];
};

describeWithDb('developerRouter development drafts', () => {
  let createdUserId: number | null = null;
  let createdDeveloperId: number | null = null;
  let createdDraftId: number | null = null;
  let createdDevelopmentId: number | null = null;
  let createdSecondaryDevelopmentId: number | null = null;
  let createdBrandProfileId: number | null = null;

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdSecondaryDevelopmentId) {
      await developmentService.deleteDevelopment(
        createdSecondaryDevelopmentId,
        createdUserId ?? -1,
        createdBrandProfileId ? { brandProfileId: createdBrandProfileId } : undefined,
      );
      createdSecondaryDevelopmentId = null;
    }
    if (createdDevelopmentId) {
      await developmentService.deleteDevelopment(
        createdDevelopmentId,
        createdUserId ?? -1,
        createdBrandProfileId ? { brandProfileId: createdBrandProfileId } : undefined,
      );
      createdDevelopmentId = null;
    }
    if (createdDraftId) {
      await db.delete(developmentDrafts).where(eq(developmentDrafts.id, createdDraftId));
      createdDraftId = null;
    }
    if (createdDeveloperId) {
      await db.delete(developers).where(eq(developers.id, createdDeveloperId));
      createdDeveloperId = null;
    }
    if (createdBrandProfileId) {
      await db.delete(developerBrandProfiles).where(eq(developerBrandProfiles.id, createdBrandProfileId));
      createdBrandProfileId = null;
    }
    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
      createdUserId = null;
    }
  });

  it('roundtrips a canonical wizard draft snapshot through saveDraft and getDraft', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Tester',
      name: 'Draft Tester',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Roundtrip Developer',
      email: `dev-draft-profile-${suffix}@example.com`,
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

    const draftSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration'],
      currentPhase: 10,
      currentStep: 5,
      developmentType: 'residential',
      developmentData: {
        name: 'Stale Root Draft Name',
        description: 'Stale root description that must not survive canonical save reload.',
        transactionType: 'for_rent',
        monthlyLevyFrom: 99,
        ratesFrom: 88,
        transferCostsIncluded: false,
        location: {
          address: '1 Stale Draft Road',
          city: 'Old City',
          province: 'Old Province',
        },
        media: {
          heroImage: { id: 'stale-hero', url: 'https://example.com/stale-draft-hero.jpg' },
          photos: [],
          videos: [],
          documents: [],
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        identity_market: {
          name: 'Canonical Draft Roundtrip',
          transactionType: 'for_sale',
          status: 'selling',
          ownershipTypes: ['sectional-title'],
        },
        location: {
          address: '1 Draft Road',
          suburb: 'Sea Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8005',
        },
        governance_finances: {
          levyRange: { min: 1_250, max: 1_750 },
          rightsAndTaxes: { min: 950, max: 1_200 },
          transferCostsIncluded: true,
        },
        marketing_summary: {
          description: 'A canonical draft snapshot that should resume from a keyed workflow step.',
          tagline: 'Canonical draft tagline',
          keySellingPoints: ['Sea views', 'Secure parking', 'Walkable location'],
        },
        development_media: {
          heroImage: { id: 'step-hero', url: 'https://example.com/step-draft-hero.jpg' },
          photos: [{ id: 'step-photo', url: 'https://example.com/step-draft-photo.jpg' }],
          videos: [{ id: 'step-video', url: 'https://example.com/step-draft-video.mp4' }],
          floorPlans: [{ id: 'step-plan', url: 'https://example.com/step-draft-plan.pdf' }],
          documents: [{ id: 'step-doc', url: 'https://example.com/step-draft-brochure.pdf' }],
        },
        unit_types: {
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_500_000,
              priceTo: 1_650_000,
              monthlyRentFrom: 12_500,
              totalUnits: 10,
              availableUnits: 7,
              reservedUnits: 1,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'db-unit-1',
          name: 'Type A',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: 1_500_000,
          priceTo: 1_650_000,
          monthlyRentFrom: 12_500,
          totalUnits: 10,
          availableUnits: 7,
          reservedUnits: 1,
        },
      ],
      _version: '3.0',
      _savedAt: 1_710_000_000_000,
    };

    const saved = await caller.developer.saveDraft({ draftData: draftSnapshot });
    expect(saved.success).toBe(true);
    expect(saved.id).toBeGreaterThan(0);
    expect((saved as any).draftMeta).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      currentStep: 8,
      progress: 89,
      totalSteps: 9,
      stepLabel: 'Unit Types',
      source: 'workflowId',
    });
    createdDraftId = saved.id;

    const [storedDraft] = await db!
      .select({
        currentStep: developmentDrafts.currentStep,
        progress: developmentDrafts.progress,
      })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, createdDraftId))
      .limit(1);
    expect(storedDraft).toMatchObject({ currentStep: 8, progress: 89 });

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    expect(loaded).toBeTruthy();
    expect((loaded as any).draftMeta).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      currentStep: 8,
      progress: 89,
      totalSteps: 9,
      stepLabel: 'Unit Types',
    });
    expect((loaded as any).currentStep).toBe(8);
    expect((loaded as any).progress).toBe(89);

    const drafts = await caller.developer.getDrafts();
    const listedDraft = (drafts as any[]).find(draft => draft.id === createdDraftId);
    expect(listedDraft?.draftMeta).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      currentStep: 8,
      progress: 89,
      totalSteps: 9,
      stepLabel: 'Unit Types',
    });

    const draftData = (loaded as any).draftData;
    expect(draftData.workflowId).toBe('residential_sale');
    expect(draftData.currentStepId).toBe('unit_types');
    expect(draftData.completedSteps).toEqual(['configuration', 'identity_market']);
    expect(draftData.developmentData.name).toBe('Canonical Draft Roundtrip');
    expect(draftData.developmentData.transactionType).toBe('for_sale');
    expect(draftData.developmentData.description).toBe(
      'A canonical draft snapshot that should resume from a keyed workflow step.',
    );
    expect(draftData.developmentData.tagline).toBe('Canonical draft tagline');
    expect(draftData.developmentData.highlights).toEqual([
      'Sea views',
      'Secure parking',
      'Walkable location',
    ]);
    expect(draftData.developmentData.location).toMatchObject({
      address: '1 Draft Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
    });
    expect(draftData.developmentData.monthlyLevyFrom).toBe(1_250);
    expect(draftData.developmentData.monthlyLevyTo).toBe(1_750);
    expect(draftData.developmentData.ratesFrom).toBe(950);
    expect(draftData.developmentData.ratesTo).toBe(1_200);
    expect(draftData.developmentData.transferCostsIncluded).toBe(true);
    expect(draftData.developmentData.media.heroImage).toMatchObject({ id: 'step-hero' });
    expect(draftData.developmentData.media.videos).toEqual([
      expect.objectContaining({
        id: 'step-video',
        url: 'https://example.com/step-draft-video.mp4',
      }),
    ]);
    expect(draftData.developmentData.media.floorPlans).toEqual([
      expect.objectContaining({ id: 'step-plan', url: 'https://example.com/step-draft-plan.pdf' }),
    ]);
    expect(draftData.developmentData.media.documents).toEqual([
      expect.objectContaining({
        id: 'step-doc',
        url: 'https://example.com/step-draft-brochure.pdf',
      }),
    ]);
    expect(draftData.stepData.development_media).toEqual(draftData.developmentData.media);
    expect(draftData.stepData.location).toMatchObject({
      address: draftData.developmentData.location.address,
      suburb: draftData.developmentData.location.suburb,
      city: draftData.developmentData.location.city,
      province: draftData.developmentData.location.province,
      postalCode: draftData.developmentData.location.postalCode,
    });
    expect(draftData.stepData.marketing_summary).toMatchObject({
      description: 'A canonical draft snapshot that should resume from a keyed workflow step.',
      tagline: 'Canonical draft tagline',
      keySellingPoints: ['Sea views', 'Secure parking', 'Walkable location'],
    });
    expect(draftData.stepData.governance_finances).toMatchObject({
      levyRange: { min: 1_250, max: 1_750 },
      rightsAndTaxes: { min: 950, max: 1_200 },
      transferCostsIncluded: true,
    });
    expect(draftData.unitTypes).toHaveLength(1);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'db-unit-1',
      name: 'Type A',
      bedrooms: 2,
      bathrooms: 2,
      priceFrom: 1_500_000,
      priceTo: 1_650_000,
      totalUnits: 10,
      availableUnits: 7,
      reservedUnits: 1,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(draftData.stepData.unit_types.unitTypes[0]).toBe(draftData.unitTypes[0]);
  });

  it('saves an edit-hydrated canonical rental draft snapshot without losing inventory ownership', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-edit-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Editor',
      name: 'Draft Editor',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Edit Developer',
      email: `dev-draft-edit-profile-${suffix}@example.com`,
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

    const editSnapshot = buildCanonicalRentalEditSnapshotFixture({
      name: 'Canonical Rental Edit Draft',
      description: 'A DB edit snapshot that should survive route-level manual Save Draft.',
    });

    const saved = await caller.developer.saveDraft({
      draftData: {
        ...editSnapshot,
        currentPhase: 10,
        currentStep: 4,
        _version: '3.0',
        _savedAt: 1_710_000_000_000,
      },
    });

    expect(saved.success).toBe(true);
    expect((saved as any).draftMeta).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: editSnapshot.currentStepId,
      currentStep: 4,
      progress: 44,
      totalSteps: 9,
      stepLabel: 'Governance & Finances',
      source: 'workflowId',
    });
    createdDraftId = saved.id;

    const [storedDraft] = await db!
      .select({
        currentStep: developmentDrafts.currentStep,
        progress: developmentDrafts.progress,
      })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, createdDraftId))
      .limit(1);
    expect(storedDraft).toMatchObject({ currentStep: 4, progress: 44 });

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    const draftData = (loaded as any).draftData;
    expect(draftData.editingId).toBe(editSnapshot.id);
    expect(draftData.developmentId).toBe(editSnapshot.id);

    expect((loaded as any).draftMeta).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: editSnapshot.currentStepId,
      currentStep: 4,
      progress: 44,
      totalSteps: 9,
      stepLabel: 'Governance & Finances',
    });
    expect(draftData.workflowId).toBe('residential_rent');
    expect(draftData.currentStepId).toBe(editSnapshot.currentStepId);
    expect(draftData.developmentData).toMatchObject({
      name: 'Canonical Rental Edit Draft',
      transactionType: 'for_rent',
      location: {
        city: 'Cape Town',
        province: 'Western Cape',
        suburb: 'Sea Point',
      },
    });
    expect(draftData.unitTypes).toHaveLength(1);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'rent-unit-db-1',
      name: 'Rental Type A',
      monthlyRentFrom: 14_500,
      monthlyRentTo: 18_000,
      totalUnits: 12,
      availableUnits: 8,
      reservedUnits: 2,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(draftData.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(draftData.unitTypes[0]).not.toHaveProperty('startingBid');
    expect(draftData.stepData.unit_types.unitTypes[0]).toBe(draftData.unitTypes[0]);

    const drafts = await caller.developer.getDrafts();
    const listedDraft = (drafts as any[]).find(draft => draft.id === createdDraftId);
    expect(listedDraft?.draftMeta).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: editSnapshot.currentStepId,
      currentStep: 4,
      progress: 44,
      totalSteps: 9,
      stepLabel: 'Governance & Finances',
    });
  });

  it('partial saves a reloaded edit draft without owning unrelated DB fields or inventory', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-partial-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Partial',
      name: 'Draft Partial Developer',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Partial Developer',
      email: `dev-draft-partial-profile-${suffix}@example.com`,
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
      name: `Draft Partial Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '31 Partial Draft Road',
      suburb: 'Claremont',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '7708',
      description: 'Created with fields that a reloaded draft partial save must preserve.',
      images: [{ url: 'https://example.com/draft-partial-original.jpg' }],
      videos: ['https://example.com/draft-partial-original-video.mp4'],
      brochures: ['https://example.com/draft-partial-original-brochure.pdf'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          name: 'Draft Partial Type A',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          unitSize: 84,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 1,
        },
        {
          name: 'Draft Partial Type B',
          bedrooms: 3,
          bathrooms: 2,
          basePriceFrom: 1_950_000,
          basePriceTo: 2_250_000,
          unitSize: 122,
          parkingType: 'garage',
          parkingBays: 2,
          totalUnits: 6,
          availableUnits: 4,
          reservedUnits: 0,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const beforeUnitIds = before!.unitTypes.map((unit: any) => unit.id).sort();
    expect(Number(before!.priceFrom)).toBe(1_450_000);
    expect(Number(before!.priceTo)).toBe(2_250_000);
    expect(Number(before!.monthlyLevyFrom)).toBe(1_250);

    const editSnapshot = {
      ...(before as any),
      editingId: createdDevelopmentId,
      developmentId: createdDevelopmentId,
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
    };
    editSnapshot.stepData.marketing_summary = {
      description: 'Reloaded draft partial marketing description.',
      tagline: 'Reloaded draft tagline',
      keySellingPoints: ['Draft-safe partial save'],
    };
    editSnapshot.stepData.unit_types = {
      unitTypes: [
        {
          id: before!.unitTypes[0].id,
          name: 'Stale draft unit mirror',
          priceFrom: 999_999,
          totalUnits: 99,
          availableUnits: 99,
        },
      ],
    };
    editSnapshot.unitTypes = editSnapshot.stepData.unit_types.unitTypes;
    editSnapshot.developmentData.location = {
      city: 'Stale Draft City',
      province: 'Stale Draft Province',
    };
    editSnapshot.developmentData.media = {
      heroImage: { url: 'https://example.com/stale-draft-hero.jpg' },
      photos: [],
      videos: [],
      documents: [],
    };
    editSnapshot.developmentData.monthlyLevyFrom = 9_999;
    editSnapshot.developmentData.ratesFrom = 8_888;

    const saved = await caller.developer.saveDraft({ draftData: editSnapshot });
    expect(saved.success).toBe(true);
    createdDraftId = saved.id;

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    const draftData = (loaded as any).draftData;
    expect(draftData.currentStepId).toBe('marketing_summary');

    const partialPayload = buildDevelopmentEditProgressPayload(
      {
        amenities: draftData.amenities ?? [],
        canonicalSnapshot: draftData,
        residentialConfig: draftData.developmentData?.residentialConfig,
      },
      { previousCanonicalSnapshot: draftData },
    );
    expect(partialPayload).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'marketing_summary',
      description: 'Reloaded draft partial marketing description.',
      tagline: 'Reloaded draft tagline',
      highlights: ['Draft-safe partial save'],
      stepData: {
        marketing_summary: {
          description: 'Reloaded draft partial marketing description.',
          tagline: 'Reloaded draft tagline',
          keySellingPoints: ['Draft-safe partial save'],
        },
      },
    });
    expect(partialPayload).not.toHaveProperty('unitTypes');
    expect(partialPayload).not.toHaveProperty('priceFrom');
    expect(partialPayload).not.toHaveProperty('city');
    expect(partialPayload).not.toHaveProperty('images');
    expect(partialPayload).not.toHaveProperty('monthlyLevyFrom');

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: partialPayload,
    });

    const [rawAfter] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawAfter.name).toBe(before!.name);
    expect(rawAfter.description).toBe('Reloaded draft partial marketing description.');
    expect(rawAfter.tagline).toBe('Reloaded draft tagline');
    expect(rawAfter.city).toBe('Cape Town');
    expect(rawAfter.province).toBe('Western Cape');
    expect(String(rawAfter.images)).toContain('draft-partial-original.jpg');
    expect(String(rawAfter.videos)).toContain('draft-partial-original-video.mp4');
    expect(String(rawAfter.brochures)).toContain('draft-partial-original-brochure.pdf');
    expect(Number(rawAfter.priceFrom)).toBe(1_450_000);
    expect(Number(rawAfter.priceTo)).toBe(2_250_000);
    expect(Number(rawAfter.monthlyLevyFrom)).toBe(1_250);
    expect(Number(rawAfter.ratesFrom)).toBe(950);

    const rawUnitsAfter = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId));
    expect(rawUnitsAfter.map((unit: any) => unit.id).sort()).toEqual(beforeUnitIds);

    const after = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(after!.unitTypes.map((unit: any) => unit.id).sort()).toEqual(beforeUnitIds);
    expect(after!.unitTypes).toHaveLength(2);
    expect(after!.stepData.unit_types.unitTypes).toHaveLength(2);
    expect(Number(after!.priceFrom)).toBe(1_450_000);
    expect(Number(after!.priceTo)).toBe(2_250_000);
  }, 120000);

  it('updates an existing development from a reloaded canonical edit draft snapshot', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-update-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Updater',
      name: 'Draft Updater',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Update Developer',
      email: `dev-draft-update-profile-${suffix}@example.com`,
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
    const requestedUnitId = `draft-update-unit-a-${suffix}`;

    const created = await caller.developer.createDevelopment({
      name: `Draft Resume Existing ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'planning',
      address: '12 Draft Resume Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Existing development edited from a reloaded canonical draft.',
      monthlyLevyFrom: 1_100,
      ratesFrom: 900,
      images: [{ url: 'https://example.com/draft-resume-existing.jpg' }],
      unitTypes: [
        {
          id: requestedUnitId,
          name: 'Resume Rental Type',
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom: 14_500,
          monthlyRentTo: 18_000,
          totalUnits: 12,
          availableUnits: 8,
          reservedUnits: 2,
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);
    const before = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const unitId = before!.unitTypes[0].id;

    const editSnapshot = buildCanonicalRentalEditSnapshotFixture({
      id: createdDevelopmentId,
      name: `Draft Resume Updated ${suffix}`,
      description: 'Reloaded draft update should keep canonical unit ownership.',
    }) as any;
    editSnapshot.editingId = createdDevelopmentId;
    editSnapshot.developmentId = createdDevelopmentId;
    editSnapshot.currentStepId = 'review_publish';
    editSnapshot.completedSteps = [
      'identity_market',
      'configuration',
      'location',
      'amenities_features',
      'marketing_summary',
      'unit_types',
      'governance_finances',
      'review_publish',
    ];
    editSnapshot.developmentData.status = 'selling';
    editSnapshot.developmentData.highlights = [
      'Stable rental demand',
      'Secure parking',
      'Close to transport',
    ];
    editSnapshot.highlights = ['Stable rental demand', 'Secure parking', 'Close to transport'];
    editSnapshot.developmentData.launchDate = '2026-06-01';
    editSnapshot.developmentData.completionDate = '2027-03-31';
    editSnapshot.stepData.identity_market.status = 'selling';
    editSnapshot.stepData.identity_market.launchDate = '2026-06-01';
    editSnapshot.stepData.identity_market.completionDate = '2027-03-31';
    editSnapshot.stepData.marketing_summary = {
      ...(editSnapshot.stepData.marketing_summary ?? {}),
      keySellingPoints: ['Stable rental demand', 'Secure parking', 'Close to transport'],
      highlights: ['Stable rental demand', 'Secure parking', 'Close to transport'],
    };
    editSnapshot.developmentData.monthlyLevyFrom = 1_100;
    editSnapshot.developmentData.ratesFrom = 900;
    editSnapshot.stepData.governance_finances = {
      ...(editSnapshot.stepData.governance_finances ?? {}),
      levyRange: { min: 1_100, max: 1_400 },
      rightsAndTaxes: { min: 900, max: 1_100 },
    };
    editSnapshot.developmentData.media = {
      heroImage: {
        id: 'draft-resume-hero',
        url: 'https://example.com/draft-resume-existing.jpg',
        type: 'image',
      },
      photos: [],
      videos: [],
      documents: [],
    };
    editSnapshot.stepData.unit_types.unitTypes[0] = {
      ...editSnapshot.stepData.unit_types.unitTypes[0],
      id: unitId,
      name: 'Resume Rental Type Updated',
      monthlyRentFrom: 15_250,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 3,
      basePriceFrom: 2_500_000,
    };
    editSnapshot.unitTypes = editSnapshot.stepData.unit_types.unitTypes;

    const saved = await caller.developer.saveDraft({ draftData: editSnapshot });
    expect(saved.success).toBe(true);
    createdDraftId = saved.id;

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    const draftData = (loaded as any).draftData;
    expect(draftData.editingId).toBe(createdDevelopmentId);
    expect(draftData.developmentId).toBe(createdDevelopmentId);
    expect(draftData.stepData.unit_types.unitTypes[0]).toBe(draftData.unitTypes[0]);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: unitId,
      name: 'Resume Rental Type Updated',
      monthlyRentFrom: 15_250,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 3,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('basePriceFrom');

    const updatePayload = buildDevelopmentUpdatePayload({
      amenities: draftData.amenities ?? [],
      canonicalSnapshot: draftData,
      residentialConfig: draftData.developmentData?.residentialConfig,
    });

    expect(resolveDevelopmentUpdateIntent(updatePayload)).toMatchObject({
      unitTypesMode: 'canonical_full_sync',
      deleteMissingUnitTypes: true,
    });
    expect(updatePayload.highlights).toEqual([
      'Stable rental demand',
      'Secure parking',
      'Close to transport',
    ]);
    expect(updatePayload.stepData.unit_types.unitTypes[0]).toEqual(updatePayload.unitTypes[0]);

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: updatePayload,
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(updated).toMatchObject({
      name: `Draft Resume Updated ${suffix}`,
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
    });
    expect(Number(updated!.monthlyRentFrom)).toBe(15_250);
    expect(Number(updated!.monthlyRentTo)).toBe(19_000);
    expect(Number(updated!.monthlyLevyFrom)).toBe(1_100);
    expect(Number(updated!.ratesFrom)).toBe(900);
    expect(updated!.unitTypes).toHaveLength(1);
    expect(updated!.unitTypes[0]).toMatchObject({
      id: unitId,
      name: 'Resume Rental Type Updated',
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 3,
    });
    expect(Number(updated!.unitTypes[0].monthlyRentFrom)).toBe(15_250);
    expect(Number(updated!.unitTypes[0].monthlyRentTo)).toBe(19_000);
    expect(Number(updated!.unitTypes[0].basePriceFrom)).toBe(0);

    const published = await caller.developer.publishDevelopment({ id: createdDevelopmentId });
    expect(Number(published.id)).toBe(createdDevelopmentId);
    expect(Number(published.isPublished)).toBe(1);
    expect(published.workflowId).toBe('residential_rent');
    expect(published.currentStepId).toBe('review_publish');
    expect(parseCompletedSteps(published.completedSteps)).toEqual(DEVELOPMENT_WORKFLOW_STEPS);

    const [rawPublished] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawPublished).toBeDefined();
    expect(rawPublished.workflowId).toBe('residential_rent');
    expect(rawPublished.currentStepId).toBe('review_publish');
    expect(parseCompletedSteps(rawPublished.completedSteps)).toEqual(DEVELOPMENT_WORKFLOW_STEPS);
    expect(rawPublished.address).toBe('9 Ocean View');
    expect(rawPublished.suburb).toBe('Sea Point');
    expect(rawPublished.city).toBe('Cape Town');
    expect(rawPublished.province).toBe('Western Cape');
    expect(rawPublished.postalCode).toBe('8005');
    expect(String(rawPublished.images)).toContain('rental-hero.jpg');
    expect(String(rawPublished.brochures)).toContain('rental-brochure.pdf');
    expect(Number(rawPublished.monthlyRentFrom)).toBe(15_250);
    expect(Number(rawPublished.monthlyRentTo)).toBe(19_000);
    expect(Number(rawPublished.monthlyLevyFrom)).toBe(1_100);
    expect(Number(rawPublished.ratesFrom)).toBe(900);

    const hydratedPublished = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(hydratedPublished!.workflowId).toBe('residential_rent');
    expect(hydratedPublished!.currentStepId).toBe('review_publish');
    expect(hydratedPublished!.completedSteps).toEqual(DEVELOPMENT_WORKFLOW_STEPS);

    await db!
      .update(developments)
      .set({
        approvalStatus: 'approved' as any,
        isPublished: 1,
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
          label: 'Resume Rental Type Updated',
          listingType: 'rent',
          priceFrom: 15_250,
          priceTo: 19_000,
        }),
      ]),
    );
  }, 120000);

  it('roundtrips edit-hydrated development media, governance, and unit media through manual Save Draft and update', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-media-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Media',
      name: 'Draft Media',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Media Developer',
      email: `dev-draft-media-profile-${suffix}@example.com`,
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

    const requestedUnitId = `dm-${suffix}`;
    const created = await caller.developer.createDevelopment({
      name: `Draft Media Existing ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      address: '18 Draft Media Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'Existing development with unit media edited through a saved draft.',
      images: [{ url: 'https://example.com/draft-media-hero.jpg' }],
      videos: ['https://example.com/draft-media-original-video.mp4'],
      floorPlans: ['https://example.com/draft-media-original-plan.pdf'],
      brochures: ['https://example.com/draft-media-original-brochure.pdf'],
      monthlyLevyFrom: 1_100,
      monthlyLevyTo: 1_350,
      ratesFrom: 800,
      ratesTo: 950,
      transferCostsIncluded: 1,
      unitTypes: [
        {
          id: requestedUnitId,
          name: 'Draft Media Type',
          bedrooms: 2,
          bathrooms: 2,
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          unitSize: 84,
          parkingType: 'covered',
          parkingBays: 1,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 1,
          baseMedia: {
            gallery: [{ url: 'https://example.com/draft-media-original-gallery.jpg' }],
            floorPlans: [{ url: 'https://example.com/draft-media-original-plan.pdf' }],
            renders: [{ url: 'https://example.com/draft-media-original-render.jpg' }],
          },
        },
      ],
    } as any);
    createdDevelopmentId = Number(created.development.id);

    const hydrated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(hydrated!.developmentData.media).toMatchObject({
      videos: ['https://example.com/draft-media-original-video.mp4'],
      floorPlans: ['https://example.com/draft-media-original-plan.pdf'],
      documents: ['https://example.com/draft-media-original-brochure.pdf'],
    });
    expect(hydrated!.stepData.development_media).toMatchObject({
      videos: ['https://example.com/draft-media-original-video.mp4'],
      floorPlans: ['https://example.com/draft-media-original-plan.pdf'],
      documents: ['https://example.com/draft-media-original-brochure.pdf'],
    });
    expect(Number(hydrated!.developmentData.monthlyLevyFrom)).toBe(1_100);
    expect(Number(hydrated!.developmentData.ratesFrom)).toBe(800);
    const hydratedUnit = hydrated!.unitTypes[0];
    expect(hydratedUnit).toMatchObject({
      id: requestedUnitId,
      name: 'Draft Media Type',
      baseMedia: {
        gallery: [{ url: 'https://example.com/draft-media-original-gallery.jpg' }],
        floorPlans: [{ url: 'https://example.com/draft-media-original-plan.pdf' }],
        renders: [{ url: 'https://example.com/draft-media-original-render.jpg' }],
      },
    });

    const editSnapshot = {
      ...(hydrated as any),
      editingId: createdDevelopmentId,
      developmentId: createdDevelopmentId,
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
    };
    editSnapshot.developmentData.media = {
      heroImage: { id: 'stale-dev-hero', url: 'https://example.com/stale-dev-hero.jpg' },
      photos: [],
      videos: ['https://example.com/stale-dev-video.mp4'],
      floorPlans: ['https://example.com/stale-dev-plan.pdf'],
      documents: ['https://example.com/stale-dev-brochure.pdf'],
    };
    editSnapshot.images = [{ url: 'https://example.com/stale-dev-hero.jpg' }];
    editSnapshot.videos = ['https://example.com/stale-dev-video.mp4'];
    editSnapshot.floorPlans = ['https://example.com/stale-dev-plan.pdf'];
    editSnapshot.brochures = ['https://example.com/stale-dev-brochure.pdf'];
    editSnapshot.stepData.development_media = {
      heroImage: {
        id: 'draft-dev-hero',
        url: 'https://example.com/draft-media-updated-hero.jpg',
      },
      photos: [{ id: 'draft-dev-photo', url: 'https://example.com/draft-media-updated-photo.jpg' }],
      videos: ['https://example.com/draft-media-updated-video.mp4'],
      floorPlans: ['https://example.com/draft-media-updated-plan.pdf'],
      documents: ['https://example.com/draft-media-updated-brochure.pdf'],
    };
    editSnapshot.developmentData.monthlyLevyFrom = 9_999;
    editSnapshot.developmentData.monthlyLevyTo = 9_999;
    editSnapshot.developmentData.ratesFrom = 8_888;
    editSnapshot.developmentData.ratesTo = 8_888;
    editSnapshot.developmentData.transferCostsIncluded = true;
    editSnapshot.stepData.governance_finances = {
      levyRange: { min: 1_225, max: 1_500 },
      rightsAndTaxes: { min: 925, max: 1_050 },
      transferCostsIncluded: false,
    };
    editSnapshot.stepData.unit_types.unitTypes[0] = {
      ...editSnapshot.stepData.unit_types.unitTypes[0],
      name: 'Draft Media Type Updated',
      priceFrom: 1_500_000,
      priceTo: 1_700_000,
      availableUnits: 5,
      reservedUnits: 2,
      baseMedia: {
        ...editSnapshot.stepData.unit_types.unitTypes[0].baseMedia,
        gallery: [{ url: 'https://example.com/draft-media-updated-gallery.jpg' }],
      },
    };
    editSnapshot.unitTypes = editSnapshot.stepData.unit_types.unitTypes;

    const saved = await caller.developer.saveDraft({ draftData: editSnapshot });
    expect(saved.success).toBe(true);
    createdDraftId = saved.id;

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    const draftData = (loaded as any).draftData;
    expect(draftData.editingId).toBe(createdDevelopmentId);
    expect(draftData.stepData.unit_types.unitTypes[0]).toBe(draftData.unitTypes[0]);
    expect(draftData.developmentData.media).toMatchObject({
      heroImage: {
        id: 'draft-dev-hero',
        url: 'https://example.com/draft-media-updated-hero.jpg',
      },
      videos: [
        expect.objectContaining({ url: 'https://example.com/draft-media-updated-video.mp4' }),
      ],
      floorPlans: [
        expect.objectContaining({ url: 'https://example.com/draft-media-updated-plan.pdf' }),
      ],
      documents: [
        expect.objectContaining({ url: 'https://example.com/draft-media-updated-brochure.pdf' }),
      ],
    });
    expect(draftData.stepData.development_media).toEqual(draftData.developmentData.media);
    expect(Number(draftData.developmentData.monthlyLevyFrom)).toBe(1_225);
    expect(Number(draftData.developmentData.monthlyLevyTo)).toBe(1_500);
    expect(Number(draftData.developmentData.ratesFrom)).toBe(925);
    expect(Number(draftData.developmentData.ratesTo)).toBe(1_050);
    expect(draftData.developmentData.transferCostsIncluded).toBe(false);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: requestedUnitId,
      name: 'Draft Media Type Updated',
      priceFrom: 1_500_000,
      priceTo: 1_700_000,
      availableUnits: 5,
      reservedUnits: 2,
      baseMedia: {
        gallery: [{ url: 'https://example.com/draft-media-updated-gallery.jpg' }],
        floorPlans: [{ url: 'https://example.com/draft-media-original-plan.pdf' }],
        renders: [{ url: 'https://example.com/draft-media-original-render.jpg' }],
      },
    });

    const updatePayload = buildDevelopmentUpdatePayload({
      amenities: draftData.amenities ?? [],
      canonicalSnapshot: draftData,
      residentialConfig: draftData.developmentData?.residentialConfig,
    });
    expect(updatePayload.stepData.unit_types.unitTypes[0]).toEqual(updatePayload.unitTypes[0]);
    expect(updatePayload).toMatchObject({
      videos: ['https://example.com/draft-media-updated-video.mp4'],
      floorPlans: ['https://example.com/draft-media-updated-plan.pdf'],
      brochures: ['https://example.com/draft-media-updated-brochure.pdf'],
      monthlyLevyFrom: 1_225,
      monthlyLevyTo: 1_500,
      ratesFrom: 925,
      ratesTo: 1_050,
      transferCostsIncluded: false,
    });

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: updatePayload,
    });

    const [rawDevelopmentAfter] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(String(rawDevelopmentAfter.images)).toContain('draft-media-updated-hero.jpg');
    expect(String(rawDevelopmentAfter.videos)).toContain('draft-media-updated-video.mp4');
    expect(String(rawDevelopmentAfter.floorPlans)).toContain('draft-media-updated-plan.pdf');
    expect(String(rawDevelopmentAfter.brochures)).toContain('draft-media-updated-brochure.pdf');
    expect(String(rawDevelopmentAfter.images)).not.toContain('stale-dev-hero.jpg');
    expect(Number(rawDevelopmentAfter.monthlyLevyFrom)).toBe(1_225);
    expect(Number(rawDevelopmentAfter.monthlyLevyTo)).toBe(1_500);
    expect(Number(rawDevelopmentAfter.ratesFrom)).toBe(925);
    expect(Number(rawDevelopmentAfter.ratesTo)).toBe(1_050);
    expect(Number(rawDevelopmentAfter.transferCostsIncluded)).toBe(0);

    const [rawUnitAfter] = await db!
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, createdDevelopmentId))
      .limit(1);
    const rawMedia =
      typeof rawUnitAfter.baseMedia === 'string'
        ? JSON.parse(rawUnitAfter.baseMedia)
        : rawUnitAfter.baseMedia;
    expect(rawMedia).toEqual({
      gallery: [{ url: 'https://example.com/draft-media-updated-gallery.jpg' }],
      floorPlans: [{ url: 'https://example.com/draft-media-original-plan.pdf' }],
      renders: [{ url: 'https://example.com/draft-media-original-render.jpg' }],
    });

    const updated = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(updated!.unitTypes[0]).toMatchObject({
      id: requestedUnitId,
      name: 'Draft Media Type Updated',
      availableUnits: 5,
      reservedUnits: 2,
      baseMedia: rawMedia,
    });
    expect(updated!.developmentData.media).toMatchObject({
      videos: ['https://example.com/draft-media-updated-video.mp4'],
      floorPlans: ['https://example.com/draft-media-updated-plan.pdf'],
      documents: ['https://example.com/draft-media-updated-brochure.pdf'],
    });
    expect(Number(updated!.developmentData.monthlyLevyFrom)).toBe(1_225);
    expect(Number(updated!.developmentData.ratesFrom)).toBe(925);
    expect(Number(updated!.developmentData.transferCostsIncluded)).toBe(0);
    expect(Number(updated!.unitTypes[0].basePriceFrom)).toBe(1_500_000);
    expect(Number(updated!.unitTypes[0].basePriceTo)).toBe(1_700_000);
    expect(Number(updated!.priceFrom)).toBe(1_500_000);
    expect(Number(updated!.priceTo)).toBe(1_700_000);
  }, 120000);

  it('uses the explicit update id when a reloaded draft carries stale edit identity', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-stale-edit-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'StaleIdentity',
      name: 'Draft Stale Identity',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Stale Identity Developer',
      email: `dev-draft-stale-edit-profile-${suffix}@example.com`,
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

    const target = await caller.developer.createDevelopment({
      name: `Draft Stale Target ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'planning',
      address: '14 Draft Target Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      description: 'The route id should choose this development.',
      unitTypes: [
        {
          id: `draft-stale-target-unit-${suffix}`,
          name: 'Stale Target Type',
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom: 14_000,
          monthlyRentTo: 17_500,
          totalUnits: 10,
          availableUnits: 6,
          reservedUnits: 1,
        },
      ],
    } as any);
    createdDevelopmentId = Number(target.development.id);

    const decoy = await caller.developer.createDevelopment({
      name: `Draft Stale Decoy ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'planning',
      address: '99 Draft Decoy Road',
      suburb: 'Gardens',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      description: 'A stale draft identity must not update this development.',
      unitTypes: [
        {
          id: `draft-stale-decoy-unit-${suffix}`,
          name: 'Stale Decoy Type',
          bedrooms: 1,
          bathrooms: 1,
          monthlyRentFrom: 9_500,
          monthlyRentTo: 11_000,
          totalUnits: 5,
          availableUnits: 4,
          reservedUnits: 0,
        },
      ],
    } as any);
    createdSecondaryDevelopmentId = Number(decoy.development.id);

    const targetBefore = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    const targetUnitId = targetBefore!.unitTypes[0].id;

    const editSnapshot = buildCanonicalRentalEditSnapshotFixture({
      id: createdDevelopmentId,
      name: `Draft Stale Target Updated ${suffix}`,
      description: 'Reloaded draft update should follow the explicit update route id.',
    }) as any;
    editSnapshot.editingId = createdSecondaryDevelopmentId;
    editSnapshot.developmentId = createdSecondaryDevelopmentId;
    editSnapshot.currentStepId = 'unit_types';
    editSnapshot.completedSteps = ['identity_market', 'configuration', 'location', 'unit_types'];
    editSnapshot.developmentData.status = 'selling';
    editSnapshot.stepData.identity_market.status = 'selling';
    editSnapshot.stepData.unit_types.unitTypes[0] = {
      ...editSnapshot.stepData.unit_types.unitTypes[0],
      id: targetUnitId,
      name: 'Stale Target Type Updated',
      monthlyRentFrom: 16_250,
      monthlyRentTo: 20_000,
      totalUnits: 10,
      availableUnits: 5,
      reservedUnits: 2,
      basePriceFrom: 2_500_000,
    };
    editSnapshot.unitTypes = editSnapshot.stepData.unit_types.unitTypes;

    const saved = await caller.developer.saveDraft({ draftData: editSnapshot });
    expect(saved.success).toBe(true);
    createdDraftId = saved.id;

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    const draftData = (loaded as any).draftData;
    expect(draftData.editingId).toBe(createdSecondaryDevelopmentId);
    expect(draftData.developmentId).toBe(createdSecondaryDevelopmentId);

    const updatePayload = buildDevelopmentUpdatePayload({
      amenities: draftData.amenities ?? [],
      canonicalSnapshot: draftData,
      residentialConfig: draftData.developmentData?.residentialConfig,
    });

    expect(updatePayload).not.toHaveProperty('editingId');
    expect(updatePayload).not.toHaveProperty('developmentId');
    expect(resolveDevelopmentUpdateIntent(updatePayload)).toMatchObject({
      unitTypesMode: 'canonical_full_sync',
      deleteMissingUnitTypes: true,
    });

    await caller.developer.updateDevelopment({
      id: createdDevelopmentId,
      data: updatePayload,
    });

    const updatedTarget = await caller.developer.getDevelopment({ id: createdDevelopmentId });
    expect(updatedTarget).toMatchObject({
      name: `Draft Stale Target Updated ${suffix}`,
      transactionType: 'for_rent',
      city: 'Cape Town',
    });
    expect(updatedTarget!.unitTypes[0]).toMatchObject({
      id: targetUnitId,
      name: 'Stale Target Type Updated',
      totalUnits: 10,
      availableUnits: 5,
      reservedUnits: 2,
    });
    expect(Number(updatedTarget!.monthlyRentFrom)).toBe(16_250);
    expect(Number(updatedTarget!.monthlyRentTo)).toBe(20_000);

    const unchangedDecoy = await caller.developer.getDevelopment({
      id: createdSecondaryDevelopmentId,
    });
    expect(unchangedDecoy).toMatchObject({
      name: `Draft Stale Decoy ${suffix}`,
      description: 'A stale draft identity must not update this development.',
    });
    expect(Number(unchangedDecoy!.monthlyRentFrom)).toBe(9_500);
    expect(Number(unchangedDecoy!.monthlyRentTo)).toBe(11_000);
    expect(unchangedDecoy!.unitTypes[0]).toMatchObject({
      name: 'Stale Decoy Type',
      totalUnits: 5,
      availableUnits: 4,
      reservedUnits: 0,
    });
  }, 120000);

  it('publishes a reloaded canonical draft snapshot without losing workflow or unit identity', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-publish-${suffix}@example.com`,
      role: 'property_developer',
      firstName: 'Draft',
      lastName: 'Publisher',
      name: 'Draft Publisher',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const developerInsert = await db!.insert(developers).values({
      userId: createdUserId,
      name: 'Draft Publish Developer',
      email: `dev-draft-publish-profile-${suffix}@example.com`,
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

    const draftSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      currentPhase: 10,
      currentStep: 9,
      developmentType: 'residential',
      classification: { type: 'residential' },
      developmentData: {
        name: `Canonical Draft Publish ${suffix}`,
        description: 'A canonical draft snapshot that can publish after resume.',
        transactionType: 'for_sale',
        status: 'selling',
        highlights: ['Sea-facing homes', 'Secure parking', 'Close to transport'],
        launchDate: '2026-06-01',
        completionDate: '2027-03-31',
        ownershipTypes: ['sectional-title'],
        location: {
          address: '10 Draft Publish Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: {
            id: 'hero-publish',
            url: 'https://example.com/draft-publish-hero.jpg',
            type: 'image',
          },
          photos: [],
          videos: [],
          documents: [],
        },
      },
      stepData: {
        identity_market: {
          name: `Canonical Draft Publish ${suffix}`,
          transactionType: 'for_sale',
        },
        review_publish: {
          checklistConfirmed: true,
          readinessDismissals: ['launch-date-warning'],
          reviewerNote: 'Review UI state should stay in the canonical draft snapshot.',
        },
        unit_types: {
          unitTypes: [
            {
              id: 'draft-publish-unit-1',
              name: 'Draft Publish Type',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_525_000,
              priceTo: 1_675_000,
              unitSize: 86,
              parkingType: 'carport',
              parkingBays: 2,
              totalUnits: 12,
              availableUnits: 8,
              reservedUnits: 2,
              monthlyRentFrom: 12_500,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'draft-publish-unit-1',
          name: 'Draft Publish Type',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: 1_525_000,
          priceTo: 1_675_000,
          unitSize: 86,
          parkingType: 'carport',
          parkingBays: 2,
          totalUnits: 12,
          availableUnits: 8,
          reservedUnits: 2,
          monthlyRentFrom: 12_500,
        },
      ],
      _version: '3.0',
      _savedAt: 1_710_000_000_000,
    };

    const saved = await caller.developer.saveDraft({ draftData: draftSnapshot });
    expect(saved.success).toBe(true);
    expect((saved as any).draftMeta).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      stepLabel: 'Review & Publish',
    });
    createdDraftId = saved.id;

    const [storedDraft] = await db!
      .select({
        currentStep: developmentDrafts.currentStep,
        progress: developmentDrafts.progress,
      })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, createdDraftId))
      .limit(1);
    expect(storedDraft).toMatchObject({ currentStep: 9, progress: 100 });

    const loaded = await caller.developer.getDraft({ id: createdDraftId });
    expect((loaded as any).draftMeta).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      stepLabel: 'Review & Publish',
    });
    const draftData = (loaded as any).draftData;

    expect(draftData.workflowId).toBe('residential_sale');
    expect(draftData.currentStepId).toBe('review_publish');
    expect(draftData.stepData.review_publish).toEqual({
      checklistConfirmed: true,
      readinessDismissals: ['launch-date-warning'],
      reviewerNote: 'Review UI state should stay in the canonical draft snapshot.',
    });
    expect(draftData.stepData.unit_types.unitTypes[0]).toBe(draftData.unitTypes[0]);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'draft-publish-unit-1',
      priceFrom: 1_525_000,
      priceTo: 1_675_000,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');

    const published = await developmentService.publishDevelopmentStrict(createdUserId, draftData);
    createdDevelopmentId = published.developmentId;
    expect(published.unitTypesCount).toBe(1);

    const created = await developmentService.getDevelopmentWithPhases(createdDevelopmentId);
    expect(created).toMatchObject({
      name: draftData.developmentData.name,
      city: 'Cape Town',
      province: 'Western Cape',
      transactionType: 'for_sale',
    });
    expect(created.workflowId).toBe('residential_sale');
    expect(created.currentStepId).toBe('review_publish');
    expect(created.completedSteps).toEqual(DEVELOPMENT_WORKFLOW_STEPS);
    expect(Number(created.priceFrom)).toBe(1_525_000);
    expect(Number(created.priceTo)).toBe(1_675_000);
    expect(created.unitTypes).toHaveLength(1);
    expect(created.unitTypes[0]).toMatchObject({
      id: 'draft-publish-unit-1',
      name: 'Draft Publish Type',
      totalUnits: 12,
      availableUnits: 8,
      reservedUnits: 2,
    });

    const [rawCreated] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);
    expect(rawCreated.workflowId).toBe('residential_sale');
    expect(rawCreated.currentStepId).toBe('review_publish');
    expect(parseCompletedSteps(rawCreated.completedSteps)).toEqual(DEVELOPMENT_WORKFLOW_STEPS);

    await db!
      .update(developments)
      .set({
        approvalStatus: 'approved' as any,
        isPublished: 1,
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
          label: 'Draft Publish Type',
          listingType: 'sale',
          priceFrom: 1_525_000,
          priceTo: 1_675_000,
        }),
      ]),
    );
  }, 120000);

  it('stores canonical final workflow state when super-admin brand creation auto-publishes', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userInsert = await db!.insert(users).values({
      email: `dev-draft-super-admin-${suffix}@example.com`,
      role: 'super_admin',
      firstName: 'Platform',
      lastName: 'Publisher',
      name: 'Platform Publisher',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const brandInsert = await db!.insert(developerBrandProfiles).values({
      brandName: `Canonical Brand Publish ${suffix}`,
      slug: `canonical-brand-publish-${suffix}`,
      ownerType: 'platform',
      identityType: 'developer',
      profileType: 'industry_reference',
      isVisible: 1,
      createdBy: createdUserId,
    });
    createdBrandProfileId = getInsertId(brandInsert);

    const created = await developmentService.createDevelopment(
      createdUserId,
      {
        name: `Super Admin Canonical Publish ${suffix}`,
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'launching-soon',
        address: '18 Platform Publish Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
        description: 'Auto-published brand content should still persist canonical workflow state.',
        images: [{ url: 'https://example.com/super-admin-canonical-publish.jpg' }],
        unitTypes: [
          {
            id: `sa-rent-unit-${suffix}`.slice(0, 36),
            name: 'Platform Rental Type',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 14_500,
            monthlyRentTo: 18_000,
            totalUnits: 10,
            availableUnits: 7,
            reservedUnits: 1,
          },
        ],
      } as any,
      { ownerType: 'platform', brandProfileId: createdBrandProfileId },
      { brandProfileId: createdBrandProfileId },
    );
    createdDevelopmentId = Number(created.id);

    const [rawCreated] = await db!
      .select()
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(rawCreated).toBeDefined();
    expect(Number(rawCreated.isPublished)).toBe(1);
    expect(rawCreated.publishedAt).toBeTruthy();
    expect(rawCreated.workflowId).toBe('residential_rent');
    expect(rawCreated.currentStepId).toBe('review_publish');
    expect(parseCompletedSteps(rawCreated.completedSteps)).toEqual(DEVELOPMENT_WORKFLOW_STEPS);

    const hydrated = await developmentService.getDevelopmentWithPhases(createdDevelopmentId);
    expect(hydrated.workflowId).toBe('residential_rent');
    expect(hydrated.currentStepId).toBe('review_publish');
    expect(hydrated.completedSteps).toEqual(DEVELOPMENT_WORKFLOW_STEPS);
    expect(hydrated.unitTypes).toHaveLength(1);
    expect(hydrated.unitTypes[0]).toMatchObject({
      name: 'Platform Rental Type',
      totalUnits: 10,
      availableUnits: 7,
      reservedUnits: 1,
    });
  }, 120000);
});

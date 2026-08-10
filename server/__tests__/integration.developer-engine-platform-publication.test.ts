import { afterEach, describe, expect, it } from 'vitest';
import { asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../db-connection';
import {
  developerBrandProfiles,
  developmentApprovalQueue,
  developers,
  developments,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { developmentService } from '../services/developmentService';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)` as string, fn)) as typeof describe);

type UserRole = 'property_developer' | 'super_admin';

type CreatedState = {
  userIds: number[];
  developerIds: number[];
  brandProfileIds: number[];
  developmentIds: number[];
  unitTypeIds: string[];
};

type PlatformBrandOptions = {
  ownerType?: 'platform' | 'developer';
  linkedDeveloperAccountId?: number | null;
  sourceAttribution?: string | null;
  isClaimable?: number;
};

type DevelopmentOptions = {
  description?: string;
  transactionType?: 'for_sale' | 'auction';
  unitTypes?: Array<Record<string, unknown>>;
};

type PublicationState = {
  name: string;
  description: string | null;
  isPublished: number;
  approvalStatus: string | null;
  publishedAt: string | null;
  rejectionNote: string | null;
  developerBrandProfileId: number | null;
  devOwnerType: string | null;
  transactionType: string;
};

const createdState: CreatedState = {
  userIds: [],
  developerIds: [],
  brandProfileIds: [],
  developmentIds: [],
  unitTypeIds: [],
};

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return db;
}

function fixtureSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function insertUser(role: UserRole) {
  const db = await database();
  const suffix = fixtureSuffix();
  const [result] = await db.insert(users).values({
    email: `platform-publication-${role}-${suffix}@example.com`,
    role,
    firstName: 'Platform',
    lastName: 'Publication',
    name: `Platform Publication ${role}`,
    emailVerified: 1,
    onboardingComplete: 1,
  });
  const userId = Number(result.insertId);
  createdState.userIds.push(userId);
  return userId;
}

async function insertDeveloperProfile(userId: number) {
  const db = await database();
  const suffix = fixtureSuffix();
  const [result] = await db.insert(developers).values({
    userId,
    name: `Platform Publication Developer ${suffix}`,
    email: `platform-publication-developer-${suffix}@example.com`,
    category: 'residential',
    status: 'approved',
    isVerified: 1,
  });
  const developerId = Number(result.insertId);
  createdState.developerIds.push(developerId);
  return developerId;
}

async function insertBrand(createdBy: number, options: PlatformBrandOptions = {}) {
  const db = await database();
  const suffix = fixtureSuffix();
  const [result] = await db.insert(developerBrandProfiles).values({
    brandName: `Platform Publication Brand ${suffix}`,
    slug: `platform-publication-brand-${suffix}`,
    ownerType: options.ownerType ?? 'platform',
    linkedDeveloperAccountId: options.linkedDeveloperAccountId ?? null,
    sourceAttribution:
      options.sourceAttribution === undefined
        ? 'Official developer website, accessed for Property Listify catalogue curation.'
        : options.sourceAttribution,
    profileType: 'industry_reference',
    isVisible: 1,
    isClaimable: options.isClaimable ?? 1,
    createdBy,
  });
  const brandProfileId = Number(result.insertId);
  createdState.brandProfileIds.push(brandProfileId);
  return brandProfileId;
}

function canonicalUnitType(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Two Bedroom Apartment',
    bedrooms: 2,
    bathrooms: 2,
    unitSize: 70,
    priceFrom: 1_200_000,
    totalUnits: 10,
    availableUnits: 10,
    parkingType: 'none',
    parkingBays: 0,
    ...overrides,
  };
}

async function insertDevelopment(
  actorUserId: number,
  brandProfileId: number,
  options: DevelopmentOptions = {},
) {
  const suffix = fixtureSuffix();
  const development = await developmentService.createDevelopment(
    actorUserId,
    {
      name: `Platform Publication Development ${suffix}`,
      developmentType: 'residential',
      transactionType: options.transactionType ?? 'for_sale',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      address: '1 Platform Publication Road, Berea',
      status: 'selling',
      ownershipType: 'sectional-title',
      highlights: ['Secure estate', 'Close to transport', 'Energy efficient'],
      description:
        options.description ??
        'A canonical platform-curated development description with sufficient persisted detail for publication readiness.',
      images: [{ url: 'https://example.com/platform-publication-hero.jpg', category: 'hero' }],
      unitTypes: options.unitTypes ?? [canonicalUnitType()],
    } as any,
    {},
    { brandProfileId },
  );
  const developmentId = Number(development.id);
  createdState.developmentIds.push(developmentId);

  const db = await database();
  const persistedUnits = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));
  createdState.unitTypeIds.push(...persistedUnits.map(unit => unit.id));

  return developmentId;
}

async function readPublicationState(developmentId: number): Promise<PublicationState> {
  const db = await database();
  const [state] = await db
    .select({
      name: developments.name,
      description: developments.description,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      publishedAt: developments.publishedAt,
      rejectionNote: developments.rejectionNote,
      developerBrandProfileId: developments.developerBrandProfileId,
      devOwnerType: developments.devOwnerType,
      transactionType: developments.transactionType,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!state) throw new Error(`Development ${developmentId} was not found after fixture setup`);
  return state as PublicationState;
}

async function readApprovalHistory(developmentId: number) {
  const db = await database();
  return db
    .select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, developmentId))
    .orderBy(asc(developmentApprovalQueue.id));
}

async function expectRejectedWithoutMutation(
  developmentId: number,
  operation: () => Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'PRECONDITION_FAILED' | 'BAD_REQUEST',
) {
  const db = await database();
  const before = await readPublicationState(developmentId);
  const historyBefore = await db
    .select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, developmentId));
  await expect(operation()).rejects.toMatchObject({ code });
  const after = await readPublicationState(developmentId);
  const historyAfter = await db
    .select()
    .from(developmentApprovalQueue)
    .where(eq(developmentApprovalQueue.developmentId, developmentId));
  expect(after).toEqual(before);
  expect(historyAfter).toEqual(historyBefore);
  expect(historyAfter.filter(row => row.status === 'approved')).toHaveLength(
    historyBefore.filter(row => row.status === 'approved').length,
  );
  expect(after).not.toMatchObject({ isPublished: 1, approvalStatus: 'approved' });
}

describeWithDb('Developer Engine platform-curated publication authority integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const unitTypeIds = uniqueStrings(createdState.unitTypeIds);
    if (unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, unitTypeIds));
    }

    const developmentIds = uniqueNumbers(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const brandProfileIds = uniqueNumbers(createdState.brandProfileIds);
    if (brandProfileIds.length) {
      await db
        .delete(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, brandProfileIds));
    }

    const developerIds = uniqueNumbers(createdState.developerIds);
    if (developerIds.length) {
      await db.delete(developers).where(inArray(developers.id, developerIds));
    }

    const userIds = uniqueNumbers(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.developerIds = [];
    createdState.brandProfileIds = [];
    createdState.developmentIds = [];
    createdState.unitTypeIds = [];
  });

  it('publishes a valid platform-curated sale development with canonical attribution and state', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);

    const db = await database();
    const persistedUnits = await db
      .select({ id: unitTypes.id, developmentId: unitTypes.developmentId })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId));
    expect(persistedUnits.length).toBeGreaterThan(0);
    expect(persistedUnits.every(unit => Number(unit.developmentId) === developmentId)).toBe(true);

    const published = await developmentService.publishPlatformCuratedDevelopment(
      developmentId,
      superAdminId,
      { brandProfileId },
    );

    expect(published).toMatchObject({
      id: developmentId,
      isPublished: 1,
      approvalStatus: 'approved',
      developerBrandProfileId: brandProfileId,
      devOwnerType: 'platform',
      transactionType: 'for_sale',
    });
    expect(published.publishedAt).toBeTruthy();

    const persisted = await readPublicationState(developmentId);
    expect(persisted).toMatchObject({
      isPublished: 1,
      approvalStatus: 'approved',
      developerBrandProfileId: brandProfileId,
      devOwnerType: 'platform',
      transactionType: 'for_sale',
    });
    expect(persisted.publishedAt).toBeTruthy();

    const approvalHistory = await readApprovalHistory(developmentId);
    expect(approvalHistory).toHaveLength(1);
    expect(approvalHistory[0]).toMatchObject({
      developmentId,
      submittedBy: superAdminId,
      status: 'approved',
      submissionType: 'initial',
      reviewedBy: superAdminId,
    });
    expect(approvalHistory[0].submittedAt).toBeTruthy();
    expect(approvalHistory[0].reviewedAt).toBeTruthy();
    expect(approvalHistory[0].submittedAt).toBe(approvalHistory[0].reviewedAt);
    expect(approvalHistory[0].reviewedAt).toBe(published.publishedAt);

    await expect(
      developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
        brandProfileId,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const afterRetryHistory = await readApprovalHistory(developmentId);
    expect(afterRetryHistory).toHaveLength(1);
  });

  it('takes a published curator development private before a successful update republish', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);

    await developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
      brandProfileId,
    });

    const editedName = 'Platform Publication Development — Updated Catalogue';
    const editedDescription =
      'An updated canonical platform-curated development description with sufficient detail for republishing.';
    await developmentService.updateDevelopment(
      developmentId,
      superAdminId,
      { name: editedName, description: editedDescription } as any,
      { brandProfileId },
    );

    const privateState = await readPublicationState(developmentId);
    expect(privateState).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      developerBrandProfileId: brandProfileId,
    });

    const beforeRepublishHistory = await readApprovalHistory(developmentId);
    expect(beforeRepublishHistory).toHaveLength(1);
    expect(beforeRepublishHistory[0]).toMatchObject({
      status: 'approved',
      submissionType: 'initial',
      reviewedBy: superAdminId,
    });

    const republished = await developmentService.publishPlatformCuratedDevelopment(
      developmentId,
      superAdminId,
      { brandProfileId },
    );

    expect(republished).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 1,
      approvalStatus: 'approved',
      developerBrandProfileId: brandProfileId,
    });
    expect(republished.publishedAt).toBeTruthy();

    const liveState = await readPublicationState(developmentId);
    expect(liveState).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 1,
      approvalStatus: 'approved',
      developerBrandProfileId: brandProfileId,
    });
    expect(liveState.publishedAt).toBeTruthy();

    const republishHistory = await readApprovalHistory(developmentId);
    expect(republishHistory).toHaveLength(2);
    expect(republishHistory.map(row => row.submissionType)).toEqual(['initial', 'update']);
    expect(republishHistory[1]).toMatchObject({
      developmentId,
      status: 'approved',
      submissionType: 'update',
      submittedBy: superAdminId,
      reviewedBy: superAdminId,
    });
    expect(republishHistory[1].reviewedAt).toBe(republished.publishedAt);

    await expect(
      developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
        brandProfileId,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await readApprovalHistory(developmentId)).toHaveLength(2);
  });

  it('keeps an edited curator development private when republish readiness fails', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);

    await developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
      brandProfileId,
    });

    await developmentService.updateDevelopment(
      developmentId,
      superAdminId,
      { description: '' } as any,
      { brandProfileId },
    );

    const privateState = await readPublicationState(developmentId);
    expect(privateState).toMatchObject({
      description: null,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      developerBrandProfileId: brandProfileId,
    });

    await expect(
      developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
        brandProfileId,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const afterFailedRepublish = await readPublicationState(developmentId);
    expect(afterFailedRepublish).toMatchObject({
      description: null,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      developerBrandProfileId: brandProfileId,
    });

    const history = await readApprovalHistory(developmentId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      status: 'approved',
      submissionType: 'initial',
      reviewedBy: superAdminId,
    });
    expect(history.some(row => row.submissionType === 'update')).toBe(false);
  });

  it('rejects an ordinary persisted developer actor at the service boundary', async () => {
    const superAdminId = await insertUser('super_admin');
    const ordinaryUserId = await insertUser('property_developer');
    await insertDeveloperProfile(ordinaryUserId);
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, ordinaryUserId, {
          brandProfileId,
        }),
      'FORBIDDEN',
    );
  });

  it('rejects a developer-owned brand even for a valid super-admin actor', async () => {
    const superAdminId = await insertUser('super_admin');
    const developerUserId = await insertUser('property_developer');
    const developerId = await insertDeveloperProfile(developerUserId);
    const brandProfileId = await insertBrand(superAdminId, {
      ownerType: 'developer',
      linkedDeveloperAccountId: developerId,
      isClaimable: 0,
    });
    const developmentId = await insertDevelopment(developerUserId, brandProfileId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId,
        }),
      'FORBIDDEN',
    );
  });

  it('rejects a platform brand after it becomes claimed', async () => {
    const superAdminId = await insertUser('super_admin');
    const claimantUserId = await insertUser('property_developer');
    const claimantDeveloperId = await insertDeveloperProfile(claimantUserId);
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);
    const db = await database();

    await db
      .update(developerBrandProfiles)
      .set({ isClaimable: 0, linkedDeveloperAccountId: claimantDeveloperId })
      .where(eq(developerBrandProfiles.id, brandProfileId));

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId,
        }),
      'FORBIDDEN',
    );
  });

  it('rejects a development that belongs to a different brand context', async () => {
    const superAdminId = await insertUser('super_admin');
    const contextBrandId = await insertBrand(superAdminId);
    const owningBrandId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, owningBrandId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId: contextBrandId,
        }),
      'NOT_FOUND',
    );
  });

  it('rejects platform publication when the brand has no source attribution', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId, { sourceAttribution: null });
    const developmentId = await insertDevelopment(superAdminId, brandProfileId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId,
        }),
      'PRECONDITION_FAILED',
    );
  });

  it('rejects platform publication when persisted readiness fails', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId, {
      description: '',
    });

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId,
        }),
      'BAD_REQUEST',
    );
  });

  it('rejects auction publication while preserving the private catalogue state', async () => {
    const superAdminId = await insertUser('super_admin');
    const brandProfileId = await insertBrand(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, brandProfileId, {
      transactionType: 'auction',
      unitTypes: [
        canonicalUnitType({
          startingBid: 1_000_000,
          reservePrice: 1_100_000,
          auctionStartDate: '2099-06-01T10:00:00.000Z',
          auctionEndDate: '2099-06-02T10:00:00.000Z',
        }),
      ],
    });

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          brandProfileId,
        }),
      'PRECONDITION_FAILED',
    );
  });
});

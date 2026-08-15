import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  developmentApprovalQueue,
  developments,
  leads,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import { developerIdentityService } from '../services/developerIdentityService';
import { developmentService } from '../services/developmentService';
import { capturePublicLead } from '../services/publicLeadCaptureService';
import {
  acquireDevelopmentIntegrationMutex,
  DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS,
  releaseDevelopmentIntegrationMutex,
} from '../test-utils/developmentIntegrationMutex';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)` as string, fn)) as typeof describe);

type UserRole = 'property_developer' | 'super_admin';

type CreatedState = {
  userIds: number[];
  organisationIds: number[];
  membershipIds: number[];
  cataloguePublisherIds: number[];
  developmentIds: number[];
  unitTypeIds: string[];
  leadIds: number[];
};

type PlatformPublisherOptions = {
  sourceAttribution?: string | null;
  isVisible?: boolean;
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
  cataloguePublisherId: number | null;
  transactionType: string;
};

const createdState: CreatedState = {
  userIds: [],
  organisationIds: [],
  membershipIds: [],
  cataloguePublisherIds: [],
  developmentIds: [],
  unitTypeIds: [],
  leadIds: [],
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

async function insertDeveloperIdentity(userId: number) {
  const suffix = fixtureSuffix();
  const identity = await developerIdentityService.createDeveloperOrganisation({
    name: `Platform Publication Developer ${suffix}`,
    email: `platform-publication-developer-${suffix}@example.com`,
    category: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    createdByUserId: userId,
  });
  createdState.organisationIds.push(identity.organisationId);
  createdState.membershipIds.push(identity.membership.id);
  createdState.cataloguePublisherIds.push(identity.publisherId);
  return identity;
}

async function insertPlatformPublisher(
  createdBy: number,
  options: PlatformPublisherOptions = {},
) {
  const suffix = fixtureSuffix();
  const publisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: `Platform Publication Brand ${suffix}`,
    slug: `platform-publication-brand-${suffix}`,
    sourceAttribution:
      options.sourceAttribution === undefined
        ? 'Official developer website, accessed for Property Listify catalogue curation.'
        : options.sourceAttribution,
    identityType: 'developer',
    isVisible: options.isVisible ?? true,
    createdBy,
  });
  const cataloguePublisherId = Number(publisher.id);
  createdState.cataloguePublisherIds.push(cataloguePublisherId);
  return cataloguePublisherId;
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
  cataloguePublisherId: number,
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
    { cataloguePublisherId },
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
      cataloguePublisherId: developments.cataloguePublisherId,
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
  beforeAll(acquireDevelopmentIntegrationMutex, DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS);

  afterAll(releaseDevelopmentIntegrationMutex);

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const leadIds = uniqueNumbers(createdState.leadIds);
    if (leadIds.length) {
      await db.delete(leads).where(inArray(leads.id, leadIds));
    }

    const unitTypeIds = uniqueStrings(createdState.unitTypeIds);
    if (unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, unitTypeIds));
    }

    const developmentIds = uniqueNumbers(createdState.developmentIds);
    if (developmentIds.length) {
      await db
        .delete(developmentApprovalQueue)
        .where(inArray(developmentApprovalQueue.developmentId, developmentIds));
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const cataloguePublisherIds = uniqueNumbers(createdState.cataloguePublisherIds);
    if (cataloguePublisherIds.length) {
      await db
        .delete(cataloguePublishers)
        .where(inArray(cataloguePublishers.id, cataloguePublisherIds));
    }

    const membershipIds = uniqueNumbers(createdState.membershipIds);
    if (membershipIds.length) {
      await db
        .delete(developerOrganisationMemberships)
        .where(inArray(developerOrganisationMemberships.id, membershipIds));
    }

    const organisationIds = uniqueNumbers(createdState.organisationIds);
    if (organisationIds.length) {
      await db
        .delete(developerOrganisations)
        .where(inArray(developerOrganisations.id, organisationIds));
    }

    const userIds = uniqueNumbers(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.organisationIds = [];
    createdState.membershipIds = [];
    createdState.cataloguePublisherIds = [];
    createdState.developmentIds = [];
    createdState.unitTypeIds = [];
    createdState.leadIds = [];
  });

  it('converges curated submit, review, public discovery, enquiry custody, and unpublish', async () => {
    const submitterId = await insertUser('super_admin');
    const reviewerId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(submitterId);

    const incompleteDevelopmentId = await insertDevelopment(
      submitterId,
      cataloguePublisherId,
      { description: '' },
    );
    await expect(
      developmentService.submitPlatformCuratedDevelopment(
        incompleteDevelopmentId,
        submitterId,
        { cataloguePublisherId },
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await readPublicationState(incompleteDevelopmentId)).toMatchObject({
      isPublished: 0,
      approvalStatus: 'draft',
    });

    const developmentId = await insertDevelopment(submitterId, cataloguePublisherId);
    const submitted = await developmentService.submitPlatformCuratedDevelopment(
      developmentId,
      submitterId,
      { cataloguePublisherId },
    );
    expect(submitted).toMatchObject({
      id: developmentId,
      approvalStatus: 'pending',
      isPublished: 0,
      cataloguePublisherId,
    });

    const changesRequested = await developmentService.reviewPlatformCuratedDevelopment(
      developmentId,
      reviewerId,
      { cataloguePublisherId },
      'changes_requested',
      { reviewNotes: 'Please confirm the current public unit-type pricing source.' },
    );
    expect(changesRequested).toMatchObject({
      approvalStatus: 'draft',
      isPublished: 0,
      rejectionNote: 'Please confirm the current public unit-type pricing source.',
    });

    const resubmitted = await developmentService.submitPlatformCuratedDevelopment(
      developmentId,
      submitterId,
      { cataloguePublisherId },
    );
    expect(resubmitted).toMatchObject({ approvalStatus: 'pending', isPublished: 0 });

    const approved = await developmentService.reviewPlatformCuratedDevelopment(
      developmentId,
      reviewerId,
      { cataloguePublisherId },
      'approved',
    );
    expect(approved).toMatchObject({
      approvalStatus: 'approved',
      isPublished: 1,
      cataloguePublisherId,
    });

    const approvalHistory = await readApprovalHistory(developmentId);
    expect(approvalHistory.map(row => [row.submissionType, row.status])).toEqual([
      ['initial', 'changes_requested'],
      ['update', 'approved'],
    ]);

    const publicRows = await developmentService.listPublicDevelopments({ limit: 100 });
    expect(publicRows.map(row => Number(row.id))).toContain(developmentId);
    expect(await developmentService.getPublicDevelopment(developmentId)).toMatchObject({
      id: developmentId,
      cataloguePublisherId,
      isPublished: 1,
      approvalStatus: 'approved',
    });
    expect(
      (await developmentService.searchPublicDevelopments({
        query: 'Platform Publication Development',
        limit: 100,
      })).map(row => Number(row.id)),
    ).toContain(developmentId);

    const captured = await capturePublicLead({
      developmentId,
      cataloguePublisherId,
      name: 'Curated Catalogue Prospect',
      email: `curated-prospect-${fixtureSuffix()}@example.com`,
      message: 'Please send the current unit-type information.',
      source: 'curated_detail',
      sourceSurface: 'curated_detail',
      leadSource: 'curated_detail',
      captureRequestId: `curated-capture-${fixtureSuffix()}`,
      consent: { accepted: true, version: 'slice3-test', source: 'curated_detail' },
    });
    expect(captured).toMatchObject({
      delivered: false,
      deliveryStatus: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientId: null,
    });
    createdState.leadIds.push(captured.leadId);

    const [capturedLead] = await (await database())
      .select({
        cataloguePublisherId: leads.cataloguePublisherId,
        developmentId: leads.developmentId,
        deliveryStatus: leads.deliveryStatus,
        consentVersion: leads.consentVersion,
      })
      .from(leads)
      .where(eq(leads.id, captured.leadId));
    expect(capturedLead).toMatchObject({
      cataloguePublisherId,
      developmentId,
      deliveryStatus: 'attention_required',
      consentVersion: 'slice3-test',
    });

    const unpublished = await developmentService.unpublishPlatformCuratedDevelopment(
      developmentId,
      reviewerId,
      { cataloguePublisherId },
    );
    expect(unpublished).toMatchObject({
      id: developmentId,
      isPublished: 0,
      approvalStatus: 'approved',
      name: expect.any(String),
    });
    expect(await developmentService.getPublicDevelopment(developmentId)).toBeNull();
    expect(await readPublicationState(developmentId)).toMatchObject({
      isPublished: 0,
      approvalStatus: 'approved',
    });
  });

  it('publishes a valid platform-curated sale development with canonical attribution and state', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId);

    const db = await database();
    const persistedUnits = await db
      .select({ id: unitTypes.id, developmentId: unitTypes.developmentId })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId));
    expect(persistedUnits.length).toBeGreaterThan(0);
    expect(persistedUnits.every(unit => Number(unit.developmentId) === developmentId)).toBe(true);

    const publisher = await cataloguePublisherService.getPublisherById(cataloguePublisherId);
    expect(publisher).toMatchObject({
      id: cataloguePublisherId,
      authorityKind: 'platform_reference',
      developerOrganisationId: null,
    });

    const published = await developmentService.publishPlatformCuratedDevelopment(
      developmentId,
      superAdminId,
      { cataloguePublisherId },
    );

    expect(published).toMatchObject({
      id: developmentId,
      isPublished: 1,
      approvalStatus: 'approved',
      cataloguePublisherId,
      transactionType: 'for_sale',
    });
    expect(published.publishedAt).toBeTruthy();

    const persisted = await readPublicationState(developmentId);
    expect(persisted).toMatchObject({
      isPublished: 1,
      approvalStatus: 'approved',
      cataloguePublisherId,
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
        cataloguePublisherId,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const afterRetryHistory = await readApprovalHistory(developmentId);
    expect(afterRetryHistory).toHaveLength(1);
  });

  it('takes a published curator development private before a successful update republish', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId);

    await developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
      cataloguePublisherId,
    });

    const editedName = 'Platform Publication Development — Updated Catalogue';
    const editedDescription =
      'An updated canonical platform-curated development description with sufficient detail for republishing.';
    await developmentService.updateDevelopment(
      developmentId,
      superAdminId,
      { name: editedName, description: editedDescription } as any,
      { cataloguePublisherId },
    );

    const privateState = await readPublicationState(developmentId);
    expect(privateState).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      cataloguePublisherId,
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
      { cataloguePublisherId },
    );

    expect(republished).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 1,
      approvalStatus: 'approved',
      cataloguePublisherId,
    });
    expect(republished.publishedAt).toBeTruthy();

    const liveState = await readPublicationState(developmentId);
    expect(liveState).toMatchObject({
      name: editedName,
      description: editedDescription,
      isPublished: 1,
      approvalStatus: 'approved',
      cataloguePublisherId,
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
        cataloguePublisherId,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await readApprovalHistory(developmentId)).toHaveLength(2);
  });

  it('keeps an edited curator development private when republish readiness fails', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId);

    await developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
      cataloguePublisherId,
    });

    await developmentService.updateDevelopment(
      developmentId,
      superAdminId,
      { description: '' } as any,
      { cataloguePublisherId },
    );

    const privateState = await readPublicationState(developmentId);
    expect(privateState).toMatchObject({
      description: null,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      cataloguePublisherId,
    });

    await expect(
      developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
        cataloguePublisherId,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const afterFailedRepublish = await readPublicationState(developmentId);
    expect(afterFailedRepublish).toMatchObject({
      description: null,
      isPublished: 0,
      approvalStatus: 'draft',
      publishedAt: null,
      cataloguePublisherId,
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
    await insertDeveloperIdentity(ordinaryUserId);
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, ordinaryUserId, {
          cataloguePublisherId,
        }),
      'FORBIDDEN',
    );
  });

  it('rejects a first-party publisher even for a valid super-admin actor', async () => {
    const superAdminId = await insertUser('super_admin');
    const developerUserId = await insertUser('property_developer');
    const developerIdentity = await insertDeveloperIdentity(developerUserId);
    const developmentId = await insertDevelopment(
      developerUserId,
      developerIdentity.publisherId,
    );

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          cataloguePublisherId: developerIdentity.publisherId,
        }),
      'FORBIDDEN',
    );
  });

  it('rejects a hidden platform-reference publisher without converting its authority', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId);
    await cataloguePublisherService.toggleVisibility(cataloguePublisherId, false);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          cataloguePublisherId,
        }),
      'FORBIDDEN',
    );

    const publisher = await cataloguePublisherService.getPublisherById(cataloguePublisherId);
    expect(publisher).toMatchObject({
      authorityKind: 'platform_reference',
      developerOrganisationId: null,
      isVisible: 0,
    });
  });

  it('rejects a development that belongs to a different publisher context', async () => {
    const superAdminId = await insertUser('super_admin');
    const contextPublisherId = await insertPlatformPublisher(superAdminId);
    const owningPublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, owningPublisherId);

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          cataloguePublisherId: contextPublisherId,
        }),
      'NOT_FOUND',
    );
  });

  it('rejects a platform-reference publisher without source attribution before publication', async () => {
    const superAdminId = await insertUser('super_admin');
    const suffix = fixtureSuffix();

    await expect(
      cataloguePublisherService.createPlatformReferencePublisher({
        brandName: `Invalid Platform Publisher ${suffix}`,
        slug: `invalid-platform-publisher-${suffix}`,
        sourceAttribution: null,
        createdBy: superAdminId,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects platform publication when persisted readiness fails', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId, {
      description: '',
    });

    await expectRejectedWithoutMutation(
      developmentId,
      () =>
        developmentService.publishPlatformCuratedDevelopment(developmentId, superAdminId, {
          cataloguePublisherId,
        }),
      'BAD_REQUEST',
    );
  });

  it('rejects auction publication while preserving the private catalogue state', async () => {
    const superAdminId = await insertUser('super_admin');
    const cataloguePublisherId = await insertPlatformPublisher(superAdminId);
    const developmentId = await insertDevelopment(superAdminId, cataloguePublisherId, {
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
          cataloguePublisherId,
        }),
      'PRECONDITION_FAILED',
    );
  });
});

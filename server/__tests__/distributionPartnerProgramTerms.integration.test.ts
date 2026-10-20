import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developmentRequiredDocuments,
  developments,
  distributionAgentAccess,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  distributionIdentities,
  distributionPrograms,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import {
  upsertBrandPartnership,
  upsertDevelopmentAccess,
} from '../services/distributionAccessRepository';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const INTEGRATION_TIMEOUT_MS = 30_000;
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  userIds: [] as number[],
  identityIds: [] as number[],
  cataloguePublisherIds: [] as number[],
  developmentIds: [] as number[],
  unitTypeIds: [] as string[],
  programIds: [] as number[],
  brandPartnershipIds: [] as number[],
  accessIds: [] as number[],
  templateIds: [] as number[],
};

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueStringIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(userId: number, role: 'agent' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

async function insertUser(role: 'agent' | 'super_admin') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [insertResult] = await db.insert(users).values({
    email: `distribution-partner-terms-${role}-${suffix}@example.com`,
    role,
    firstName: 'Partner',
    lastName: 'Viewer',
    name: 'Partner Viewer',
    emailVerified: 1,
    onboardingComplete: 1,
  });

  const userId = Number(insertResult.insertId || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertReferrerIdentity(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(distributionIdentities).values({
    userId,
    identityType: 'referrer',
    active: 1,
    displayName: 'Partner Viewer',
  });

  const identityId = Number((insertResult as any).insertId || 0);
  createdState.identityIds.push(identityId);
  return identityId;
}

/**
 * Creates a platform-reference publisher, a for-sale development with one
 * active unit type, an active brand partnership and an included development
 * access row. No per-referrer opportunity access grant is created anywhere:
 * availability follows the published opportunity under the retired-grant
 * model.
 */
async function insertNetworkedDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const curatorUserId = await insertUser('super_admin');
  const publisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: `${name} Publisher`,
    slug: `distribution-terms-brand-${suffix}`,
    identityType: 'developer',
    sourceAttribution: 'Publicly available referral integration fixture source',
    isVisible: true,
    createdBy: curatorUserId,
  });
  const cataloguePublisherId = Number(publisher.id);
  createdState.cataloguePublisherIds.push(cataloguePublisherId);

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    cataloguePublisherId,
    transactionType: 'for_sale',
    isPublished: 1,
    approvalStatus: 'approved',
    publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    status: 'selling',
  } as any);

  const developmentId = Number((insertResult as any).insertId || 0);
  createdState.developmentIds.push(developmentId);

  const unitTypeId = randomUUID();
  await db.insert(unitTypes).values({
    id: unitTypeId,
    developmentId,
    name: 'Terms Fixture Unit',
    bedrooms: 2,
    bathrooms: '1.0',
    basePriceFrom: '1000000.00',
    isActive: 1,
    totalUnits: 1,
    availableUnits: 1,
  });
  createdState.unitTypeIds.push(unitTypeId);

  const partnership = await upsertBrandPartnership(db, {
    cataloguePublisherId,
    status: 'active',
    actorUserId: curatorUserId,
  });
  const brandPartnershipId = Number(partnership.id);
  createdState.brandPartnershipIds.push(brandPartnershipId);

  const access = await upsertDevelopmentAccess(db, {
    developmentId,
    brandPartnershipId,
    cataloguePublisherId,
    status: 'included',
    submissionAllowed: true,
    excludedByMandate: false,
    excludedByExclusivity: false,
    actorUserId: curatorUserId,
  });
  createdState.accessIds.push(Number(access.id));

  return developmentId;
}

async function insertDevelopmentWithoutNetworkAccess(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const curatorUserId = await insertUser('super_admin');
  const publisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: `${name} Publisher`,
    slug: `distribution-terms-brand-${suffix}`,
    identityType: 'developer',
    sourceAttribution: 'Publicly available referral integration fixture source',
    isVisible: true,
    createdBy: curatorUserId,
  });
  const cataloguePublisherId = Number(publisher.id);
  createdState.cataloguePublisherIds.push(cataloguePublisherId);

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    cataloguePublisherId,
    transactionType: 'for_sale',
    isPublished: 1,
    approvalStatus: 'approved',
    publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    status: 'selling',
  } as any);

  const developmentId = Number((insertResult as any).insertId || 0);
  createdState.developmentIds.push(developmentId);
  return developmentId;
}

async function insertProgram(input: {
  developmentId: number;
  isActive: boolean;
  isReferralEnabled: boolean;
  commissionModel: 'flat_percentage' | 'fixed_amount';
  defaultCommissionPercent?: number | null;
  defaultCommissionAmount?: number | null;
  referrerCommissionType?: 'percentage' | 'flat' | null;
  referrerCommissionValue?: number | null;
  referrerCommissionBasis?: 'sale_price' | 'base_price' | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(distributionPrograms).values({
    developmentId: input.developmentId,
    isActive: input.isActive ? 1 : 0,
    isReferralEnabled: input.isReferralEnabled ? 1 : 0,
    commissionModel: input.commissionModel,
    defaultCommissionPercent:
      typeof input.defaultCommissionPercent === 'number' ? input.defaultCommissionPercent : null,
    defaultCommissionAmount:
      typeof input.defaultCommissionAmount === 'number' ? input.defaultCommissionAmount : null,
    referrerCommissionType: input.referrerCommissionType ?? null,
    referrerCommissionValue:
      typeof input.referrerCommissionValue === 'number' ? input.referrerCommissionValue : null,
    referrerCommissionBasis: input.referrerCommissionBasis ?? null,
    tierAccessPolicy: 'open',
    payoutMilestone: 'transfer_registration',
    payoutMilestoneNotes: null,
    currencyCode: 'ZAR',
  } as any);

  const programId = Number((insertResult as any).insertId || 0);
  createdState.programIds.push(programId);
  return programId;
}

async function insertRequiredDocument(input: {
  developmentId: number;
  documentCode:
    | 'id_document'
    | 'proof_of_address'
    | 'proof_of_income'
    | 'bank_statement'
    | 'custom';
  documentLabel: string;
  isRequired: boolean;
  sortOrder: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(developmentRequiredDocuments).values({
    developmentId: input.developmentId,
    documentCode: input.documentCode,
    documentLabel: input.documentLabel,
    category: 'client_required_document',
    isRequired: input.isRequired ? 1 : 0,
    sortOrder: input.sortOrder,
    isActive: 1,
  });

  const templateId = Number((insertResult as any).insertId || 0);
  createdState.templateIds.push(templateId);
  return templateId;
}

describeWithDb('distribution.partner program terms', () => {
  // Cleanup runs once per file. Every fixture row is suffixed uniquely, so no
  // test depends on a previous test's deletion for isolation, and per-test
  // cascades cannot take next-key/gap locks against sibling worker files on a
  // parallel disposable-DB runner.
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    const templateIds = uniqueIds(createdState.templateIds);
    if (templateIds.length) {
      await db
        .delete(developmentRequiredDocuments)
        .where(inArray(developmentRequiredDocuments.id, templateIds));
    }

    const accessIds = uniqueIds(createdState.accessIds);
    if (accessIds.length) {
      await db
        .delete(distributionDevelopmentAccess)
        .where(inArray(distributionDevelopmentAccess.id, accessIds));
    }

    const brandPartnershipIds = uniqueIds(createdState.brandPartnershipIds);
    if (brandPartnershipIds.length) {
      await db
        .delete(distributionBrandPartnerships)
        .where(inArray(distributionBrandPartnerships.id, brandPartnershipIds));
    }

    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const unitTypeIds = uniqueStringIds(createdState.unitTypeIds);
    if (unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, unitTypeIds));
    }

    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const publisherIds = uniqueIds(createdState.cataloguePublisherIds);
    if (publisherIds.length) {
      await db.delete(cataloguePublishers).where(inArray(cataloguePublishers.id, publisherIds));
    }

    const identityIds = uniqueIds(createdState.identityIds);
    if (identityIds.length) {
      await db.delete(distributionIdentities).where(inArray(distributionIdentities.id, identityIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
  });

  it(
    'lists active referral-enabled programs for an active referrer identity with no access grant',
    async () => {
      const userId = await insertUser('agent');
      await insertReferrerIdentity(userId);
      const caller = createCaller(userId, 'agent');

      const enabledDevelopmentId = await insertNetworkedDevelopment(`Enabled Dev ${Date.now()}`);
      const referralDisabledDevelopmentId = await insertNetworkedDevelopment(
        `Disabled Ref ${Date.now()}`,
      );
      const inactiveDevelopmentId = await insertNetworkedDevelopment(`Inactive Dev ${Date.now()}`);
      const noNetworkDevelopmentId = await insertDevelopmentWithoutNetworkAccess(
        `Unnetworked Dev ${Date.now()}`,
      );

      await insertProgram({
        developmentId: enabledDevelopmentId,
        isActive: true,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });
      await insertProgram({
        developmentId: referralDisabledDevelopmentId,
        isActive: true,
        isReferralEnabled: false,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });
      await insertProgram({
        developmentId: inactiveDevelopmentId,
        isActive: false,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });
      await insertProgram({
        developmentId: noNetworkDevelopmentId,
        isActive: true,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });

      const result = await caller.distribution.partner.listProgramTerms({
        developmentIds: [
          enabledDevelopmentId,
          referralDisabledDevelopmentId,
          inactiveDevelopmentId,
          noNetworkDevelopmentId,
        ],
      });
      const returnedDevelopmentIds = result.items.map(item => item.developmentId);

      expect(returnedDevelopmentIds).toEqual([enabledDevelopmentId]);
      expect(result.items[0]?.opportunity.partnerEntitled).toBe(true);

      // Retired-grant regression guard: availability must not depend on rows
      // in distribution_agent_access.
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const grants = await db
        .select({ id: distributionAgentAccess.id })
        .from(distributionAgentAccess)
        .where(eq(distributionAgentAccess.agentId, userId));
      expect(grants).toHaveLength(0);
    },
    INTEGRATION_TIMEOUT_MS,
  );

  it(
    'never exposes referral-disabled or inactive programs even when includeDisabled is requested',
    async () => {
      const userId = await insertUser('agent');
      await insertReferrerIdentity(userId);
      const caller = createCaller(userId, 'agent');

      const referralDisabledDevelopmentId = await insertNetworkedDevelopment(
        `Include Disabled Ref ${Date.now()}`,
      );
      const inactiveDevelopmentId = await insertNetworkedDevelopment(
        `Include Inactive ${Date.now()}`,
      );

      await insertProgram({
        developmentId: referralDisabledDevelopmentId,
        isActive: true,
        isReferralEnabled: false,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });
      await insertProgram({
        developmentId: inactiveDevelopmentId,
        isActive: false,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });

      const result = await caller.distribution.partner.listProgramTerms({
        includeDisabled: true,
        developmentIds: [referralDisabledDevelopmentId, inactiveDevelopmentId],
      });

      expect(result.items).toEqual([]);
    },
    INTEGRATION_TIMEOUT_MS,
  );

  it(
    'returns required documents ordered by sortOrder with accurate summary',
    async () => {
      const userId = await insertUser('agent');
      await insertReferrerIdentity(userId);
      const caller = createCaller(userId, 'agent');

      const developmentId = await insertNetworkedDevelopment(`Doc Order Dev ${Date.now()}`);
      await insertProgram({
        developmentId,
        isActive: true,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 2.5,
        referrerCommissionBasis: 'sale_price',
      });

      await insertRequiredDocument({
        developmentId,
        documentCode: 'custom',
        documentLabel: 'Optional Supporting Doc',
        isRequired: false,
        sortOrder: 3,
      });
      await insertRequiredDocument({
        developmentId,
        documentCode: 'proof_of_address',
        documentLabel: 'Proof of Address',
        isRequired: true,
        sortOrder: 2,
      });
      await insertRequiredDocument({
        developmentId,
        documentCode: 'id_document',
        documentLabel: 'ID Document',
        isRequired: true,
        sortOrder: 1,
      });

      const result = await caller.distribution.partner.getProgramTerms({ developmentId });

      expect(result.requiredDocuments.map(document => document.sortOrder)).toEqual([1, 2, 3]);
      expect(result.requiredDocuments.map(document => document.documentLabel)).toEqual([
        'ID Document',
        'Proof of Address',
        'Optional Supporting Doc',
      ]);
      expect(result.requiredDocuments.map(document => document.isRequired)).toEqual([
        true,
        true,
        false,
      ]);
      expect(result.computed.requiredDocsSummary).toBe('2 required referral documents');
    },
    INTEGRATION_TIMEOUT_MS,
  );

  it(
    'formats payout display from referrer commission terms for percentage and flat models',
    async () => {
      const userId = await insertUser('agent');
      await insertReferrerIdentity(userId);
      const caller = createCaller(userId, 'agent');

      const percentDevelopmentId = await insertNetworkedDevelopment(`Percent Dev ${Date.now()}`);
      const amountDevelopmentId = await insertNetworkedDevelopment(`Amount Dev ${Date.now()}`);

      await insertProgram({
        developmentId: percentDevelopmentId,
        isActive: true,
        isReferralEnabled: true,
        commissionModel: 'flat_percentage',
        referrerCommissionType: 'percentage',
        referrerCommissionValue: 3.25,
        referrerCommissionBasis: 'sale_price',
      });
      await insertProgram({
        developmentId: amountDevelopmentId,
        isActive: true,
        isReferralEnabled: true,
        commissionModel: 'fixed_amount',
        referrerCommissionType: 'flat',
        referrerCommissionValue: 15000,
      });

      const allTerms = await caller.distribution.partner.listProgramTerms({
        developmentIds: [percentDevelopmentId, amountDevelopmentId],
      });
      const percentTerms = allTerms.items.find(item => item.developmentId === percentDevelopmentId);
      const amountTerms = allTerms.items.find(item => item.developmentId === amountDevelopmentId);

      expect(percentTerms?.computed.commissionDisplay).toBe(
        '3.25% referral payout of sale price',
      );
      expect(amountTerms?.computed.commissionDisplay).toBe(
        `R${Math.round(15000).toLocaleString('en-ZA')} referral payout`,
      );
    },
    INTEGRATION_TIMEOUT_MS,
  );
});

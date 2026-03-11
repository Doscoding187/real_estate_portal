import { afterEach, describe, expect, it } from 'vitest';
import { inArray, sql } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  affordabilityAssessments,
  affordabilityMatchSnapshots,
  developerBrandProfiles,
  developmentManagerAssignments,
  developments,
  distributionPrograms,
  qualificationPackExports,
  unitTypes,
  users,
} from '../../drizzle/schema';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  userIds: [] as number[],
  brandProfileIds: [] as number[],
  developmentIds: [] as number[],
  programIds: [] as number[],
  assessmentIds: [] as string[],
  snapshotIds: [] as string[],
  unitTypeIds: [] as string[],
};

function uniqueNumberIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueStringIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(userId: number, role: 'agent' | 'agency_admin' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

async function insertUser(role: 'agent' | 'agency_admin' | 'super_admin' = 'agent') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [insertResult] = await db.insert(users).values({
    email: `distribution-accelerator-${suffix}@example.com`,
    role,
    firstName: 'Accelerator',
    lastName: 'Tester',
    name: 'Accelerator Tester',
    emailVerified: 1,
  });
  const id = Number((insertResult as any).insertId || 0);
  createdState.userIds.push(id);
  return id;
}

async function insertDevelopment(input: { name: string; city: string; province: string; suburb: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [brandInsertResult] = await db.insert(developerBrandProfiles).values({
    brandName: `${input.name} Brand`,
    slug: `distribution-accelerator-brand-${suffix}`,
    ownerType: 'platform',
    profileType: 'industry_reference',
    isVisible: 1,
    identityType: 'developer',
  } as any);
  const brandProfileId = Number((brandInsertResult as any).insertId || 0);
  createdState.brandProfileIds.push(brandProfileId);

  const [insertResult] = await db.insert(developments).values({
    name: input.name,
    developmentType: 'residential',
    city: input.city,
    province: input.province,
    suburb: input.suburb,
    developerBrandProfileId: brandProfileId,
    isPublished: 1,
    approvalStatus: 'approved',
  } as any);
  const developmentId = Number((insertResult as any).insertId || 0);
  createdState.developmentIds.push(developmentId);
  return developmentId;
}

async function insertProgram(developmentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [insertResult] = await db.insert(distributionPrograms).values({
    developmentId,
    isActive: 1,
    isReferralEnabled: 1,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    tierAccessPolicy: 'open',
    payoutMilestone: 'transfer_registration',
    currencyCode: 'ZAR',
  });
  const programId = Number((insertResult as any).insertId || 0);
  createdState.programIds.push(programId);
  return programId;
}

async function insertPrimaryManagerAssignment(developmentId: number, managerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(developmentManagerAssignments).values({
    developmentId,
    managerUserId,
    isPrimary: 1,
    isActive: 1,
    assignedAt: sql`CURRENT_TIMESTAMP`,
  } as any);
}

async function insertUnitType(input: {
  unitTypeId: string;
  developmentId: number;
  name: string;
  basePriceFrom: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(unitTypes).values({
    id: input.unitTypeId,
    developmentId: input.developmentId,
    name: input.name,
    bedrooms: 2,
    bathrooms: '1.0',
    basePriceFrom: String(input.basePriceFrom),
    isActive: 1,
  } as any);
  createdState.unitTypeIds.push(input.unitTypeId);
}

describeWithDb('distribution.partner accelerator integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const snapshotIds = uniqueStringIds(createdState.snapshotIds);
    if (snapshotIds.length) {
      await db.delete(affordabilityMatchSnapshots).where(inArray(affordabilityMatchSnapshots.id, snapshotIds));
    }

    const assessmentIds = uniqueStringIds(createdState.assessmentIds);
    if (assessmentIds.length) {
      await db.delete(qualificationPackExports).where(inArray(qualificationPackExports.assessmentId, assessmentIds));
      await db.delete(affordabilityAssessments).where(inArray(affordabilityAssessments.id, assessmentIds));
    }

    const unitTypeIds = uniqueStringIds(createdState.unitTypeIds);
    if (unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, unitTypeIds));
    }

    const programIds = uniqueNumberIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const developmentIds = uniqueNumberIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db
        .delete(developmentManagerAssignments)
        .where(inArray(developmentManagerAssignments.developmentId, developmentIds));
    }

    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const brandProfileIds = uniqueNumberIds(createdState.brandProfileIds);
    if (brandProfileIds.length) {
      await db
        .delete(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, brandProfileIds));
    }

    const userIds = uniqueNumberIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.brandProfileIds = [];
    createdState.developmentIds = [];
    createdState.programIds = [];
    createdState.assessmentIds = [];
    createdState.snapshotIds = [];
    createdState.unitTypeIds = [];
  });

  it('matching respects price ceiling and location filter', async () => {
    const actorUserId = await insertUser();
    const managerUserId = await insertUser('super_admin');
    const caller = createCaller(actorUserId, 'agent');

    const matchingDevelopmentId = await insertDevelopment({
      name: `Accelerator Match ${Date.now()}`,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
    });
    await insertProgram(matchingDevelopmentId);
    await insertPrimaryManagerAssignment(matchingDevelopmentId, managerUserId);

    const otherProvinceDevelopmentId = await insertDevelopment({
      name: `Accelerator Other Province ${Date.now()}`,
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Sea Point',
    });
    await insertProgram(otherProvinceDevelopmentId);

    await insertUnitType({
      unitTypeId: `unit-${Date.now()}-1`,
      developmentId: matchingDevelopmentId,
      name: '2 Bed Standard',
      basePriceFrom: 1000000,
    });
    await insertUnitType({
      unitTypeId: `unit-${Date.now()}-2`,
      developmentId: matchingDevelopmentId,
      name: '3 Bed Premium',
      basePriceFrom: 2000000,
    });
    await insertUnitType({
      unitTypeId: `unit-${Date.now()}-3`,
      developmentId: otherProvinceDevelopmentId,
      name: '2 Bed Cape',
      basePriceFrom: 900000,
    });

    const createResult = await caller.distribution.partner.createAffordabilityAssessment({
      grossIncomeMonthly: 50000,
      deductionsMonthly: 0,
      depositAmount: 100000,
      locationFilter: {
        province: 'Gauteng',
      },
    });
    createdState.assessmentIds.push(String(createResult.assessmentId));

    const matchResult = await caller.distribution.partner.getAffordabilityMatches({
      assessmentId: String(createResult.assessmentId),
    });
    createdState.snapshotIds.push(String(matchResult.matchSnapshotId));

    expect(matchResult.matches.length).toBeGreaterThan(0);
    expect(matchResult.matches.every(match => match.province === 'Gauteng')).toBe(true);
    expect(
      matchResult.matches.every(match =>
        match.unitOptions.every(unit => Number(unit.priceFrom) <= Number(matchResult.purchasePrice)),
      ),
    ).toBe(true);
    expect(
      matchResult.matches.some(match =>
        match.unitOptions.some(unit => Number(unit.priceFrom) >= 2000000),
      ),
    ).toBe(false);
  });

  it('matching excludes developments that are not submission-ready', async () => {
    const actorUserId = await insertUser();
    const managerUserId = await insertUser('super_admin');
    const caller = createCaller(actorUserId, 'agent');

    const readyDevelopmentId = await insertDevelopment({
      name: `Accelerator Ready ${Date.now()}`,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
    });
    await insertProgram(readyDevelopmentId);
    await insertPrimaryManagerAssignment(readyDevelopmentId, managerUserId);

    const notReadyDevelopmentId = await insertDevelopment({
      name: `Accelerator Not Ready ${Date.now()}`,
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
    });
    await insertProgram(notReadyDevelopmentId);

    await insertUnitType({
      unitTypeId: `unit-${Date.now()}-ready`,
      developmentId: readyDevelopmentId,
      name: 'Ready Unit',
      basePriceFrom: 900000,
    });
    await insertUnitType({
      unitTypeId: `unit-${Date.now()}-not-ready`,
      developmentId: notReadyDevelopmentId,
      name: 'Not Ready Unit',
      basePriceFrom: 850000,
    });

    const createResult = await caller.distribution.partner.createAffordabilityAssessment({
      grossIncomeMonthly: 50000,
      deductionsMonthly: 0,
      depositAmount: 100000,
      locationFilter: {
        province: 'Gauteng',
        city: 'Johannesburg',
      },
    });
    createdState.assessmentIds.push(String(createResult.assessmentId));

    const matchResult = await caller.distribution.partner.getAffordabilityMatches({
      assessmentId: String(createResult.assessmentId),
    });
    createdState.snapshotIds.push(String(matchResult.matchSnapshotId));

    expect(matchResult.matches.map(match => Number(match.developmentId))).toContain(readyDevelopmentId);
    expect(matchResult.matches.map(match => Number(match.developmentId))).not.toContain(
      notReadyDevelopmentId,
    );
  });
});

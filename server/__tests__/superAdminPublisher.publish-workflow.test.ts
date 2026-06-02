import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developerBrandProfiles, developments, users } from '../../drizzle/schema';
import { DEVELOPMENT_WORKFLOW_STEPS } from '../../shared/developmentWorkflow';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const createdState = {
  userIds: [] as number[],
  brandProfileIds: [] as number[],
  developmentIds: [] as number[],
};

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

async function insertSuperAdminUser() {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const insert = await db.insert(users).values({
    email: `publisher-workflow-${suffix}@example.com`,
    role: 'super_admin',
    firstName: 'Publisher',
    lastName: 'Workflow',
    name: 'Publisher Workflow',
    emailVerified: 1,
  });
  const userId = getInsertId(insert);
  createdState.userIds.push(userId);
  return userId;
}

async function insertBrandProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const insert = await db.insert(developerBrandProfiles).values({
    brandName: `Publisher Workflow Brand ${suffix}`,
    slug: `publisher-workflow-brand-${suffix}`,
    ownerType: 'platform',
    identityType: 'developer',
    profileType: 'industry_reference',
    isVisible: 1,
    createdBy: userId,
  });
  const brandProfileId = getInsertId(insert);
  createdState.brandProfileIds.push(brandProfileId);
  return brandProfileId;
}

async function insertDevelopment(input: {
  brandProfileId: number;
  name: string;
  transactionType?: 'for_sale' | 'for_rent' | 'auction';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  const insert = await db.insert(developments).values({
    name: input.name,
    slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    developmentType: 'residential',
    transactionType: input.transactionType ?? 'for_sale',
    city: 'Cape Town',
    province: 'Western Cape',
    suburb: 'Sea Point',
    description: 'Publisher route workflow-state regression fixture.',
    developerBrandProfileId: input.brandProfileId,
    devOwnerType: 'platform',
    isPublished: 0,
    approvalStatus: 'draft',
  } as any);
  const developmentId = getInsertId(insert);
  createdState.developmentIds.push(developmentId);
  return developmentId;
}

function createSuperAdminCaller(userId: number) {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role: 'super_admin' },
  } as any);
}

describeWithDb('superAdminPublisher publish workflow state', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdState.developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, createdState.developmentIds));
    }
    if (createdState.brandProfileIds.length) {
      await db
        .delete(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, createdState.brandProfileIds));
    }
    if (createdState.userIds.length) {
      await db.delete(users).where(inArray(users.id, createdState.userIds));
    }

    createdState.developmentIds = [];
    createdState.brandProfileIds = [];
    createdState.userIds = [];
  });

  it('single publish writes canonical final workflow state', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const userId = await insertSuperAdminUser();
    const brandProfileId = await insertBrandProfile(userId);
    const developmentId = await insertDevelopment({
      brandProfileId,
      name: `Publisher Single Workflow ${Date.now()}`,
      transactionType: 'for_rent',
    });

    const caller = createSuperAdminCaller(userId);
    const result = await caller.superAdminPublisher.publishDevelopment({
      brandProfileId,
      developmentId,
    });

    expect(result.success).toBe(true);
    expect(result.development?.workflowId).toBe('residential_rent');
    expect(result.development?.currentStepId).toBe('review_publish');

    const [rawDevelopment] = await db!
      .select()
      .from(developments)
      .where(inArray(developments.id, [developmentId]))
      .limit(1);

    expect(Number(rawDevelopment.isPublished)).toBe(1);
    expect(rawDevelopment.approvalStatus).toBe('approved');
    expect(rawDevelopment.workflowId).toBe('residential_rent');
    expect(rawDevelopment.currentStepId).toBe('review_publish');
    expect(parseCompletedSteps(rawDevelopment.completedSteps)).toEqual(DEVELOPMENT_WORKFLOW_STEPS);
  });

  it('bulk brand publish writes canonical final workflow state per development', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const userId = await insertSuperAdminUser();
    const brandProfileId = await insertBrandProfile(userId);
    const saleDevelopmentId = await insertDevelopment({
      brandProfileId,
      name: `Publisher Bulk Sale Workflow ${Date.now()}`,
      transactionType: 'for_sale',
    });
    const auctionDevelopmentId = await insertDevelopment({
      brandProfileId,
      name: `Publisher Bulk Auction Workflow ${Date.now()}`,
      transactionType: 'auction',
    });

    const caller = createSuperAdminCaller(userId);
    const result = await caller.superAdminPublisher.publishAllBrandDevelopments({
      brandProfileId,
    });

    expect(result).toMatchObject({
      success: true,
      brandProfileId,
      totalDevelopments: 2,
      updatedDevelopments: 2,
    });

    const rawDevelopments = await db!
      .select()
      .from(developments)
      .where(inArray(developments.id, [saleDevelopmentId, auctionDevelopmentId]));

    expect(rawDevelopments).toHaveLength(2);
    expect(
      rawDevelopments.map(development => ({
        id: development.id,
        isPublished: Number(development.isPublished),
        approvalStatus: development.approvalStatus,
        workflowId: development.workflowId,
        currentStepId: development.currentStepId,
        completedSteps: parseCompletedSteps(development.completedSteps),
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          id: saleDevelopmentId,
          isPublished: 1,
          approvalStatus: 'approved',
          workflowId: 'residential_sale',
          currentStepId: 'review_publish',
          completedSteps: DEVELOPMENT_WORKFLOW_STEPS,
        },
        {
          id: auctionDevelopmentId,
          isPublished: 1,
          approvalStatus: 'approved',
          workflowId: 'residential_auction',
          currentStepId: 'review_publish',
          completedSteps: DEVELOPMENT_WORKFLOW_STEPS,
        },
      ]),
    );
  });
});

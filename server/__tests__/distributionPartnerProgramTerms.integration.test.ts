import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  developmentRequiredDocuments,
  developments,
  distributionPrograms,
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
  developmentIds: [] as number[],
  programIds: [] as number[],
  templateIds: [] as number[],
};

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function insertUser(role: 'agent' | 'visitor') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [insertResult] = await db.insert(users).values({
    email: `distribution-partner-${suffix}@example.com`,
    role,
    firstName: 'Partner',
    lastName: 'Viewer',
    name: 'Partner Viewer',
    emailVerified: 1,
  });

  const userId = Number((insertResult as any).insertId || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    isPublished: 1,
    approvalStatus: 'approved',
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
    tierAccessPolicy: 'restricted',
    payoutMilestone: 'transfer_registration',
    payoutMilestoneNotes: null,
    currencyCode: 'ZAR',
  });

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
    isRequired: input.isRequired ? 1 : 0,
    sortOrder: input.sortOrder,
    isActive: 1,
  });

  const templateId = Number((insertResult as any).insertId || 0);
  createdState.templateIds.push(templateId);
  return templateId;
}

describeWithDb('distribution.partner program terms', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const templateIds = uniqueIds(createdState.templateIds);
    if (templateIds.length) {
      await db
        .delete(developmentRequiredDocuments)
        .where(inArray(developmentRequiredDocuments.id, templateIds));
    }

    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.developmentIds = [];
    createdState.programIds = [];
    createdState.templateIds = [];
  });

  it('returns only active and referral-enabled programs by default', async () => {
    const userId = await insertUser('agent');
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: userId, role: 'agent' },
    } as any);

    const enabledDevelopmentId = await insertDevelopment(`Enabled Dev ${Date.now()}`);
    const referralDisabledDevelopmentId = await insertDevelopment(`Disabled Ref ${Date.now()}`);
    const inactiveDevelopmentId = await insertDevelopment(`Inactive Dev ${Date.now()}`);

    await insertProgram({
      developmentId: enabledDevelopmentId,
      isActive: true,
      isReferralEnabled: true,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 2.5,
    });
    await insertProgram({
      developmentId: referralDisabledDevelopmentId,
      isActive: true,
      isReferralEnabled: false,
      commissionModel: 'fixed_amount',
      defaultCommissionAmount: 15000,
    });
    await insertProgram({
      developmentId: inactiveDevelopmentId,
      isActive: false,
      isReferralEnabled: true,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 1.75,
    });

    const result = await caller.distribution.partner.listProgramTerms();
    const returnedDevelopmentIds = result.items.map(item => item.developmentId);

    expect(returnedDevelopmentIds).toEqual([enabledDevelopmentId]);
  });

  it('returns required documents ordered by sortOrder', async () => {
    const userId = await insertUser('agent');
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: userId, role: 'agent' },
    } as any);

    const developmentId = await insertDevelopment(`Doc Order Dev ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 2.5,
    });

    await insertRequiredDocument({
      developmentId,
      documentCode: 'custom',
      documentLabel: 'Optional Supporting Doc',
      isRequired: false,
      sortOrder: 2,
    });
    await insertRequiredDocument({
      developmentId,
      documentCode: 'proof_of_address',
      documentLabel: 'Proof of Address',
      isRequired: true,
      sortOrder: 0,
    });
    await insertRequiredDocument({
      developmentId,
      documentCode: 'id_document',
      documentLabel: 'ID Document',
      isRequired: true,
      sortOrder: 1,
    });

    const result = await caller.distribution.partner.getProgramTerms({ developmentId });

    expect(result.requiredDocuments.map(document => document.sortOrder)).toEqual([0, 1, 2]);
    expect(result.requiredDocuments.map(document => document.documentLabel)).toEqual([
      'Proof of Address',
      'ID Document',
      'Optional Supporting Doc',
    ]);
    expect(result.computed.requiredDocsSummary).toBe('2 required documents');
  });

  it('formats commission display for percentage and amount models', async () => {
    const userId = await insertUser('agent');
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: userId, role: 'agent' },
    } as any);

    const percentDevelopmentId = await insertDevelopment(`Percent Dev ${Date.now()}`);
    const amountDevelopmentId = await insertDevelopment(`Amount Dev ${Date.now()}`);

    await insertProgram({
      developmentId: percentDevelopmentId,
      isActive: true,
      isReferralEnabled: true,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 3.25,
    });
    await insertProgram({
      developmentId: amountDevelopmentId,
      isActive: true,
      isReferralEnabled: false,
      commissionModel: 'fixed_amount',
      defaultCommissionAmount: 15000,
    });

    const percentTerms = await caller.distribution.partner.getProgramTerms({
      developmentId: percentDevelopmentId,
    });
    const allTerms = await caller.distribution.partner.listProgramTerms({
      includeDisabled: true,
      developmentIds: [percentDevelopmentId, amountDevelopmentId],
    });
    const amountTerms = allTerms.items.find(item => item.developmentId === amountDevelopmentId);

    expect(percentTerms.computed.commissionDisplay).toBe('3.25% referral fee');
    expect(amountTerms?.computed.commissionDisplay).toContain('referral fee');
    expect(amountTerms?.computed.commissionDisplay).toContain('15');
  });
});

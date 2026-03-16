import { TRPCError } from '@trpc/server';
import { and, eq, sql } from 'drizzle-orm';

import { developments, distributionDevelopmentAccess } from '../../drizzle/schema';
import { logAudit } from '../_core/auditLog';
import { getDb } from '../db';
import {
  evaluateDevelopmentDistributionAccess,
  type DevelopmentDistributionAccessEvaluation,
} from './distributionAccessPolicy';
import {
  getBrandPartnershipByBrandProfileId,
  getDevelopmentAccessByDevelopmentId,
  upsertBrandPartnership,
  upsertDevelopmentAccess,
  type DistributionBrandPartnershipRow,
  type DistributionDevelopmentAccessRow,
  type UpsertBrandPartnershipInput,
} from './distributionAccessRepository';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type UpsertBrandPartnershipAdminInput = Omit<UpsertBrandPartnershipInput, 'actorUserId'> & {
  actorUserId: number;
};

type UpsertDevelopmentAccessAdminInput = {
  actorUserId: number;
  developmentId: number;
  status: DistributionDevelopmentAccessRow['status'];
  submissionAllowed?: boolean;
  excludedByMandate?: boolean;
  excludedByExclusivity?: boolean;
  reasonCode?: string | null;
  notes?: string | null;
};

type ChildAccessStatusSummary = Record<DistributionDevelopmentAccessRow['status'], number>;

function normalizeChannelScope(channelScope?: string[]) {
  if (!channelScope?.length) return ['distribution_network'];
  return Array.from(
    new Set(channelScope.map(value => String(value || '').trim()).filter(Boolean)),
  ).sort();
}

function normalizeNullableText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function isSameJsonArray(a: unknown, b: string[]) {
  const left = Array.isArray(a)
    ? a
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .sort()
    : [];
  return JSON.stringify(left) === JSON.stringify(b);
}

function buildEmptyStatusSummary(): ChildAccessStatusSummary {
  return {
    listed: 0,
    included: 0,
    excluded: 0,
    paused: 0,
  };
}

async function logDistributionAccessAudit(params: {
  userId: number;
  action: string;
  targetType: string;
  targetId: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    await logAudit({
      userId: params.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
    });
  } catch {
    // Never block product workflows on audit-log write failures.
  }
}

async function summarizeChildAccessStatuses(
  db: DbHandle,
  brandPartnershipId: number,
): Promise<ChildAccessStatusSummary> {
  const rows = await db
    .select({
      status: distributionDevelopmentAccess.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(distributionDevelopmentAccess)
    .where(eq(distributionDevelopmentAccess.brandPartnershipId, brandPartnershipId))
    .groupBy(distributionDevelopmentAccess.status);

  const summary = buildEmptyStatusSummary();
  for (const row of rows) {
    const status = row.status;
    if (status in summary) {
      summary[status] = Number(row.count || 0);
    }
  }
  return summary;
}

async function forceChildSubmissionOffForInactivePartnership(
  db: DbHandle,
  input: {
    brandPartnershipId: number;
    actorUserId: number;
  },
) {
  await db
    .update(distributionDevelopmentAccess)
    .set({
      submissionAllowed: 0,
      updatedBy: input.actorUserId,
    })
    .where(
      and(
        eq(distributionDevelopmentAccess.brandPartnershipId, input.brandPartnershipId),
        eq(distributionDevelopmentAccess.submissionAllowed, 1),
      ),
    );
}

async function resolveDevelopmentBrandContext(db: DbHandle, developmentId: number) {
  const [development] = await db
    .select({
      id: developments.id,
      developerBrandProfileId: developments.developerBrandProfileId,
      marketingBrandProfileId: developments.marketingBrandProfileId,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  const brandProfileId =
    Number(development.developerBrandProfileId || 0) ||
    Number(development.marketingBrandProfileId || 0) ||
    null;

  if (!brandProfileId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Development is missing a brand profile link.',
    });
  }

  const partnership = await getBrandPartnershipByBrandProfileId(db, brandProfileId);
  if (!partnership) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Brand partnership record is required before development access can be managed.',
    });
  }

  return {
    developmentId: Number(development.id),
    brandProfileId,
    partnership,
  };
}

function normalizeDevelopmentAccessInput(
  input: UpsertDevelopmentAccessAdminInput,
  partnership: DistributionBrandPartnershipRow,
) {
  const reasonCode = normalizeNullableText(input.reasonCode);
  const notes = normalizeNullableText(input.notes);
  const excludedByMandate = Boolean(input.excludedByMandate);
  const excludedByExclusivity = Boolean(input.excludedByExclusivity);

  let status = input.status;
  if (excludedByMandate || excludedByExclusivity) {
    status = 'excluded';
  }

  let submissionAllowed = input.submissionAllowed === true;
  if (
    status === 'excluded' ||
    status === 'paused' ||
    partnership.status !== 'active' ||
    excludedByMandate ||
    excludedByExclusivity
  ) {
    submissionAllowed = false;
  }

  return {
    status,
    submissionAllowed,
    excludedByMandate,
    excludedByExclusivity,
    reasonCode,
    notes,
  };
}

function isBrandPartnershipNoOp(
  existing: DistributionBrandPartnershipRow,
  input: {
    status: DistributionBrandPartnershipRow['status'];
    channelScope: string[];
    reasonCode?: string | null;
    notes?: string | null;
  },
) {
  return (
    existing.status === input.status &&
    isSameJsonArray(existing.channelScope, input.channelScope) &&
    (input.reasonCode === undefined || (existing.reasonCode || null) === input.reasonCode) &&
    (input.notes === undefined || (existing.notes || null) === input.notes)
  );
}

function isDevelopmentAccessNoOp(
  existing: DistributionDevelopmentAccessRow,
  input: {
    brandPartnershipId: number;
    brandProfileId: number;
    status: DistributionDevelopmentAccessRow['status'];
    submissionAllowed: boolean;
    excludedByMandate: boolean;
    excludedByExclusivity: boolean;
    reasonCode?: string | null;
    notes?: string | null;
  },
) {
  return (
    Number(existing.brandPartnershipId) === input.brandPartnershipId &&
    Number(existing.brandProfileId) === input.brandProfileId &&
    existing.status === input.status &&
    Number(existing.submissionAllowed || 0) === (input.submissionAllowed ? 1 : 0) &&
    Number(existing.excludedByMandate || 0) === (input.excludedByMandate ? 1 : 0) &&
    Number(existing.excludedByExclusivity || 0) === (input.excludedByExclusivity ? 1 : 0) &&
    (input.reasonCode === undefined || (existing.reasonCode || null) === input.reasonCode) &&
    (input.notes === undefined || (existing.notes || null) === input.notes)
  );
}

export async function upsertBrandPartnershipWithAudit(
  input: UpsertBrandPartnershipAdminInput & {
    db?: DbHandle;
  },
) {
  const db = input.db || (await getDb());
  if (!db) throw new Error('Database not available');

  const existing = await getBrandPartnershipByBrandProfileId(db, input.brandProfileId);
  const normalized = {
    status: input.status,
    channelScope: normalizeChannelScope(input.channelScope),
    reasonCode: normalizeNullableText(input.reasonCode),
    notes: normalizeNullableText(input.notes),
  };

  let partnership: DistributionBrandPartnershipRow;
  const changed = !existing || !isBrandPartnershipNoOp(existing, normalized);

  if (changed) {
    partnership = await upsertBrandPartnership(db, {
      brandProfileId: input.brandProfileId,
      status: normalized.status,
      channelScope: normalized.channelScope,
      reasonCode: normalized.reasonCode,
      notes: normalized.notes,
      actorUserId: input.actorUserId,
    });

    if (partnership.status === 'paused' || partnership.status === 'ended') {
      await forceChildSubmissionOffForInactivePartnership(db, {
        brandPartnershipId: Number(partnership.id),
        actorUserId: input.actorUserId,
      });
    }

    await logDistributionAccessAudit({
      userId: input.actorUserId,
      action: `distribution.brand_partnership.${partnership.status}`,
      targetType: 'distribution_brand_partnership',
      targetId: Number(partnership.id),
      metadata: {
        brandProfileId: input.brandProfileId,
        fromStatus: existing?.status || null,
        toStatus: partnership.status,
        channelScope: normalized.channelScope,
        reasonCode: normalized.reasonCode ?? null,
        notes: normalized.notes ?? null,
      },
    });
  } else {
    partnership = existing;
  }

  return {
    changed,
    partnership,
    childAccessStatusCounts: await summarizeChildAccessStatuses(db, Number(partnership.id)),
    submissionBlockedByParent: partnership.status !== 'active',
  };
}

export async function upsertDevelopmentAccessWithAudit(
  input: UpsertDevelopmentAccessAdminInput & { db?: DbHandle },
): Promise<{
  changed: boolean;
  access: DistributionDevelopmentAccessRow;
  evaluation: DevelopmentDistributionAccessEvaluation;
}> {
  const db = input.db || (await getDb());
  if (!db) throw new Error('Database not available');

  const context = await resolveDevelopmentBrandContext(db, input.developmentId);
  const normalized = normalizeDevelopmentAccessInput(input, context.partnership);
  const existing = await getDevelopmentAccessByDevelopmentId(db, input.developmentId);

  let access: DistributionDevelopmentAccessRow;
  const changed =
    !existing ||
    !isDevelopmentAccessNoOp(existing, {
      brandPartnershipId: Number(context.partnership.id),
      brandProfileId: context.brandProfileId,
      status: normalized.status,
      submissionAllowed: normalized.submissionAllowed,
      excludedByMandate: normalized.excludedByMandate,
      excludedByExclusivity: normalized.excludedByExclusivity,
      reasonCode: normalized.reasonCode,
      notes: normalized.notes,
    });

  if (changed) {
    access = await upsertDevelopmentAccess(db, {
      developmentId: input.developmentId,
      brandPartnershipId: Number(context.partnership.id),
      brandProfileId: context.brandProfileId,
      status: normalized.status,
      submissionAllowed: normalized.submissionAllowed,
      excludedByMandate: normalized.excludedByMandate,
      excludedByExclusivity: normalized.excludedByExclusivity,
      reasonCode: normalized.reasonCode,
      notes: normalized.notes,
      actorUserId: input.actorUserId,
    });

    await logDistributionAccessAudit({
      userId: input.actorUserId,
      action: `distribution.development_access.${access.status}`,
      targetType: 'distribution_development_access',
      targetId: Number(access.id),
      metadata: {
        developmentId: input.developmentId,
        brandProfileId: context.brandProfileId,
        brandPartnershipId: Number(context.partnership.id),
        fromStatus: existing?.status || null,
        toStatus: access.status,
        submissionAllowed: Boolean(Number(access.submissionAllowed || 0)),
        excludedByMandate: Boolean(Number(access.excludedByMandate || 0)),
        excludedByExclusivity: Boolean(Number(access.excludedByExclusivity || 0)),
        reasonCode: access.reasonCode || null,
        notes: access.notes || null,
      },
    });
  } else {
    access = existing;
  }

  return {
    changed,
    access,
    evaluation: await evaluateDevelopmentDistributionAccess({
      db,
      developmentId: input.developmentId,
      actor: { role: 'admin', userId: input.actorUserId },
      channel: 'admin_catalog',
    }),
  };
}

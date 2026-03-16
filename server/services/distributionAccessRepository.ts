import { and, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm';

import {
  developments,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
} from '../../drizzle/schema';
import { getDb } from '../db';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type DistributionBrandPartnershipRow = typeof distributionBrandPartnerships.$inferSelect;
export type DistributionDevelopmentAccessRow = typeof distributionDevelopmentAccess.$inferSelect;

export type UpsertBrandPartnershipInput = {
  brandProfileId: number;
  status: DistributionBrandPartnershipRow['status'];
  channelScope?: string[];
  reasonCode?: string | null;
  notes?: string | null;
  actorUserId: number;
};

export type UpsertDevelopmentAccessInput = {
  developmentId: number;
  brandPartnershipId: number;
  brandProfileId: number;
  status: DistributionDevelopmentAccessRow['status'];
  submissionAllowed?: boolean;
  excludedByMandate?: boolean;
  excludedByExclusivity?: boolean;
  reasonCode?: string | null;
  notes?: string | null;
  actorUserId: number;
};

export async function getBrandPartnershipByBrandProfileId(
  db: DbHandle,
  brandProfileId: number,
): Promise<DistributionBrandPartnershipRow | null> {
  const [row] = await db
    .select()
    .from(distributionBrandPartnerships)
    .where(eq(distributionBrandPartnerships.brandProfileId, brandProfileId))
    .limit(1);

  return row || null;
}

export async function upsertBrandPartnership(
  db: DbHandle,
  input: UpsertBrandPartnershipInput,
): Promise<DistributionBrandPartnershipRow> {
  const existing = await getBrandPartnershipByBrandProfileId(db, input.brandProfileId);

  if (!existing) {
    const partneredAt =
      input.status === 'active' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    const endedAt =
      input.status === 'ended' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    const [insertResult] = await db.insert(distributionBrandPartnerships).values({
      brandProfileId: input.brandProfileId,
      status: input.status,
      channelScope: input.channelScope ?? ['distribution_network'],
      partneredAt,
      endedAt,
      reasonCode: input.reasonCode ?? null,
      notes: input.notes ?? null,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    });

    const insertedId = Number((insertResult as { insertId?: number })?.insertId || 0);
    const [inserted] = await db
      .select()
      .from(distributionBrandPartnerships)
      .where(eq(distributionBrandPartnerships.id, insertedId))
      .limit(1);

    if (!inserted) {
      throw new Error('Failed to load inserted distribution brand partnership.');
    }

    return inserted;
  }

  const updateSet: Partial<typeof distributionBrandPartnerships.$inferInsert> = {
    status: input.status,
    updatedBy: input.actorUserId,
  };

  if (input.channelScope) {
    updateSet.channelScope = input.channelScope;
  }
  if (input.reasonCode !== undefined) {
    updateSet.reasonCode = input.reasonCode ?? null;
  }
  if (input.notes !== undefined) {
    updateSet.notes = input.notes ?? null;
  }

  if (input.status === 'active' && !existing.partneredAt) {
    updateSet.partneredAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  if (input.status === 'ended') {
    updateSet.endedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  } else if (existing.endedAt) {
    updateSet.endedAt = null;
  }

  await db
    .update(distributionBrandPartnerships)
    .set(updateSet)
    .where(eq(distributionBrandPartnerships.id, existing.id));

  const [updated] = await db
    .select()
    .from(distributionBrandPartnerships)
    .where(eq(distributionBrandPartnerships.id, existing.id))
    .limit(1);

  if (!updated) {
    throw new Error('Failed to load updated distribution brand partnership.');
  }

  return updated;
}

export async function getDevelopmentAccessByDevelopmentId(
  db: DbHandle,
  developmentId: number,
): Promise<DistributionDevelopmentAccessRow | null> {
  const [row] = await db
    .select()
    .from(distributionDevelopmentAccess)
    .where(eq(distributionDevelopmentAccess.developmentId, developmentId))
    .limit(1);

  return row || null;
}

export async function upsertDevelopmentAccess(
  db: DbHandle,
  input: UpsertDevelopmentAccessInput,
): Promise<DistributionDevelopmentAccessRow> {
  const existing = await getDevelopmentAccessByDevelopmentId(db, input.developmentId);

  if (!existing) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [insertResult] = await db.insert(distributionDevelopmentAccess).values({
      developmentId: input.developmentId,
      brandPartnershipId: input.brandPartnershipId,
      brandProfileId: input.brandProfileId,
      status: input.status,
      submissionAllowed: input.submissionAllowed ? 1 : 0,
      excludedByMandate: input.excludedByMandate ? 1 : 0,
      excludedByExclusivity: input.excludedByExclusivity ? 1 : 0,
      reasonCode: input.reasonCode ?? null,
      notes: input.notes ?? null,
      includedAt: input.status === 'included' ? now : null,
      excludedAt: input.status === 'excluded' ? now : null,
      pausedAt: input.status === 'paused' ? now : null,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    });

    const insertedId = Number((insertResult as { insertId?: number })?.insertId || 0);
    const [inserted] = await db
      .select()
      .from(distributionDevelopmentAccess)
      .where(eq(distributionDevelopmentAccess.id, insertedId))
      .limit(1);

    if (!inserted) {
      throw new Error('Failed to load inserted distribution development access row.');
    }

    return inserted;
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateSet: Partial<typeof distributionDevelopmentAccess.$inferInsert> = {
    brandPartnershipId: input.brandPartnershipId,
    brandProfileId: input.brandProfileId,
    status: input.status,
    updatedBy: input.actorUserId,
  };

  if (input.submissionAllowed !== undefined) {
    updateSet.submissionAllowed = input.submissionAllowed ? 1 : 0;
  }
  if (input.excludedByMandate !== undefined) {
    updateSet.excludedByMandate = input.excludedByMandate ? 1 : 0;
  }
  if (input.excludedByExclusivity !== undefined) {
    updateSet.excludedByExclusivity = input.excludedByExclusivity ? 1 : 0;
  }
  if (input.reasonCode !== undefined) {
    updateSet.reasonCode = input.reasonCode ?? null;
  }
  if (input.notes !== undefined) {
    updateSet.notes = input.notes ?? null;
  }

  if (input.status === 'included' && !existing.includedAt) {
    updateSet.includedAt = now;
  }
  if (input.status === 'excluded') {
    updateSet.excludedAt = now;
  }
  if (input.status === 'paused') {
    updateSet.pausedAt = now;
  }

  await db
    .update(distributionDevelopmentAccess)
    .set(updateSet)
    .where(eq(distributionDevelopmentAccess.id, existing.id));

  const [updated] = await db
    .select()
    .from(distributionDevelopmentAccess)
    .where(eq(distributionDevelopmentAccess.id, existing.id))
    .limit(1);

  if (!updated) {
    throw new Error('Failed to load updated distribution development access row.');
  }

  return updated;
}

export async function listDevelopmentAccess(
  db: DbHandle,
  filters: {
    brandProfileId?: number;
    partnershipStatus?: Array<DistributionBrandPartnershipRow['status']>;
    accessStatus?: Array<DistributionDevelopmentAccessRow['status']>;
    submitReady?: boolean;
    search?: string;
    limit?: number;
  },
) {
  const conditions: SQL[] = [];

  if (typeof filters.brandProfileId === 'number') {
    conditions.push(eq(distributionDevelopmentAccess.brandProfileId, filters.brandProfileId));
  }

  if (filters.partnershipStatus?.length) {
    conditions.push(inArray(distributionBrandPartnerships.status, filters.partnershipStatus));
  }

  if (filters.accessStatus?.length) {
    conditions.push(inArray(distributionDevelopmentAccess.status, filters.accessStatus));
  }

  if (typeof filters.submitReady === 'boolean') {
    conditions.push(
      eq(distributionDevelopmentAccess.submissionAllowed, filters.submitReady ? 1 : 0),
    );
  }

  const search = filters.search?.trim();
  if (search) {
    conditions.push(
      or(
        like(developments.name, `%${search}%`),
        like(developments.city, `%${search}%`),
        like(developments.province, `%${search}%`),
      )!,
    );
  }

  return await db
    .select({
      access: distributionDevelopmentAccess,
      partnership: distributionBrandPartnerships,
      development: developments,
    })
    .from(distributionDevelopmentAccess)
    .innerJoin(
      distributionBrandPartnerships,
      eq(distributionDevelopmentAccess.brandPartnershipId, distributionBrandPartnerships.id),
    )
    .innerJoin(developments, eq(distributionDevelopmentAccess.developmentId, developments.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(distributionDevelopmentAccess.updatedAt))
    .limit(filters.limit ?? 200);
}

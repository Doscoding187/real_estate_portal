import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

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

function nowSqlDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

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
    const [insertResult] = await db.insert(distributionBrandPartnerships).values({
      brandProfileId: input.brandProfileId,
      status: input.status,
      partneredAt: input.status === 'active' ? nowSqlDateTime() : null,
      endedAt: input.status === 'ended' ? nowSqlDateTime() : null,
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

    if (!inserted) throw new Error('Failed to load inserted brand partnership.');
    return inserted;
  }

  const updateSet: Partial<typeof distributionBrandPartnerships.$inferInsert> = {
    status: input.status,
    updatedBy: input.actorUserId,
  };

  if (input.reasonCode !== undefined) updateSet.reasonCode = input.reasonCode ?? null;
  if (input.notes !== undefined) updateSet.notes = input.notes ?? null;
  if (input.status === 'active' && !existing.partneredAt) updateSet.partneredAt = nowSqlDateTime();
  if (input.status === 'ended') {
    updateSet.endedAt = nowSqlDateTime();
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

  if (!updated) throw new Error('Failed to load updated brand partnership.');
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
  const now = nowSqlDateTime();

  if (!existing) {
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

    if (!inserted) throw new Error('Failed to load inserted development access row.');
    return inserted;
  }

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
  if (input.reasonCode !== undefined) updateSet.reasonCode = input.reasonCode ?? null;
  if (input.notes !== undefined) updateSet.notes = input.notes ?? null;
  if (input.status === 'included' && !existing.includedAt) updateSet.includedAt = now;
  if (input.status === 'excluded') updateSet.excludedAt = now;
  if (input.status === 'paused') updateSet.pausedAt = now;

  await db
    .update(distributionDevelopmentAccess)
    .set(updateSet)
    .where(eq(distributionDevelopmentAccess.id, existing.id));

  const [updated] = await db
    .select()
    .from(distributionDevelopmentAccess)
    .where(eq(distributionDevelopmentAccess.id, existing.id))
    .limit(1);

  if (!updated) throw new Error('Failed to load updated development access row.');
  return updated;
}

export async function listDevelopmentAccess(
  db: DbHandle,
  filters: {
    brandProfileId?: number;
    partnershipStatus?: Array<DistributionBrandPartnershipRow['status']>;
    accessStatus?: Array<DistributionDevelopmentAccessRow['status']>;
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
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      sql`(
        LOWER(COALESCE(${developments.name}, '')) LIKE LOWER(${term})
        OR LOWER(COALESCE(${developments.city}, '')) LIKE LOWER(${term})
        OR LOWER(COALESCE(${developments.province}, '')) LIKE LOWER(${term})
      )`,
    );
  }

  return await db
    .select({
      developmentId: developments.id,
      developmentName: developments.name,
      city: developments.city,
      province: developments.province,
      brandProfileId: distributionDevelopmentAccess.brandProfileId,
      partnershipId: distributionBrandPartnerships.id,
      partnershipStatus: distributionBrandPartnerships.status,
      accessId: distributionDevelopmentAccess.id,
      accessStatus: distributionDevelopmentAccess.status,
      submissionAllowed: distributionDevelopmentAccess.submissionAllowed,
      excludedByMandate: distributionDevelopmentAccess.excludedByMandate,
      excludedByExclusivity: distributionDevelopmentAccess.excludedByExclusivity,
      reasonCode: distributionDevelopmentAccess.reasonCode,
      updatedAt: distributionDevelopmentAccess.updatedAt,
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

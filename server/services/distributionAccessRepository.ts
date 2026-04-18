import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import {
  developments,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
} from '../../drizzle/schema';
import { getDb } from '../db';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const STATUS_VALUE_ERROR_CODES = new Set([
  'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
  'ER_WRONG_VALUE_FOR_TYPE',
]);
const UNKNOWN_COLUMN_ERROR_CODES = new Set(['ER_BAD_FIELD_ERROR']);
const LEGACY_STATUS_FALLBACKS: Record<string, string[]> = {
  listed: ['active'],
  included: ['active', 'listed'],
  excluded: ['ended', 'inactive'],
  paused: ['inactive'],
};
const LEGACY_STATUS_NORMALIZATION: Record<string, DistributionDevelopmentAccessRow['status']> = {
  active: 'included',
  pending: 'listed',
  ended: 'excluded',
  inactive: 'excluded',
  revoked: 'excluded',
};

function isMissingSchemaError(error: unknown) {
  const candidate = error as { code?: string; errno?: number; cause?: unknown } | null;
  if (!candidate) return false;
  if (candidate.code === 'ER_NO_SUCH_TABLE' || candidate.code === 'ER_BAD_FIELD_ERROR') return true;
  if (candidate.errno === 1146 || candidate.errno === 1054) return true;
  if (candidate.cause && candidate.cause !== error) return isMissingSchemaError(candidate.cause);
  return false;
}

function extractDbErrorCode(error: unknown): string {
  const candidate = error as { code?: string; cause?: unknown } | null;
  if (!candidate) return '';
  const own = String(candidate.code || '').trim();
  if (own) return own;
  if (candidate.cause && candidate.cause !== error) return extractDbErrorCode(candidate.cause);
  return '';
}

function extractDbErrorMessage(error: unknown): string {
  const candidate = error as { message?: string; sqlMessage?: string; cause?: unknown } | null;
  if (!candidate) return '';
  const own = String(candidate.sqlMessage || candidate.message || '').toLowerCase();
  if (own) return own;
  if (candidate.cause && candidate.cause !== error) return extractDbErrorMessage(candidate.cause);
  return '';
}

function isStatusValueError(error: unknown): boolean {
  const code = extractDbErrorCode(error);
  if (!STATUS_VALUE_ERROR_CODES.has(code)) return false;
  return extractDbErrorMessage(error).includes('status');
}

function readUnknownColumnName(error: unknown): string | null {
  const code = extractDbErrorCode(error);
  if (!UNKNOWN_COLUMN_ERROR_CODES.has(code)) return null;
  const message = extractDbErrorMessage(error);
  const match = message.match(/unknown column '([^']+)'/i);
  return match?.[1]?.toLowerCase() || null;
}

function normalizeDevelopmentAccessStatus(status: string | null | undefined) {
  if (!status) return status;
  const normalized =
    LEGACY_STATUS_NORMALIZATION[status.toLowerCase()] ||
    (status as DistributionDevelopmentAccessRow['status']);
  return normalized;
}

function normalizeDevelopmentAccessRow(
  row: DistributionDevelopmentAccessRow,
): DistributionDevelopmentAccessRow {
  return {
    ...row,
    status: normalizeDevelopmentAccessStatus(String(row.status || '')) as DistributionDevelopmentAccessRow['status'],
  };
}

function getDevelopmentAccessStatusCandidates(status: DistributionDevelopmentAccessRow['status']) {
  const candidates = [status as string, ...(LEGACY_STATUS_FALLBACKS[status as string] || [])];
  return Array.from(new Set(candidates));
}

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
  try {
    const [row] = await db
      .select()
      .from(distributionBrandPartnerships)
      .where(eq(distributionBrandPartnerships.brandProfileId, brandProfileId))
      .limit(1);

    return row || null;
  } catch (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }
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
  try {
    const [row] = await db
      .select()
      .from(distributionDevelopmentAccess)
      .where(eq(distributionDevelopmentAccess.developmentId, developmentId))
      .limit(1);

    return row ? normalizeDevelopmentAccessRow(row) : null;
  } catch (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }
}

export async function upsertDevelopmentAccess(
  db: DbHandle,
  input: UpsertDevelopmentAccessInput,
): Promise<DistributionDevelopmentAccessRow> {
  const existing = await getDevelopmentAccessByDevelopmentId(db, input.developmentId);
  const now = nowSqlDateTime();

  if (!existing) {
    let includeIncludedAt = true;
    let includeExcludedAt = true;
    let includePausedAt = true;
    let insertResult: { insertId?: number } | null = null;
    let lastInsertError: unknown = null;

    for (const statusCandidate of getDevelopmentAccessStatusCandidates(input.status)) {
      while (true) {
        const values: Partial<typeof distributionDevelopmentAccess.$inferInsert> = {
          developmentId: input.developmentId,
          brandPartnershipId: input.brandPartnershipId,
          brandProfileId: input.brandProfileId,
          status: statusCandidate as any,
          submissionAllowed: input.submissionAllowed ? 1 : 0,
          excludedByMandate: input.excludedByMandate ? 1 : 0,
          excludedByExclusivity: input.excludedByExclusivity ? 1 : 0,
          reasonCode: input.reasonCode ?? null,
          notes: input.notes ?? null,
          createdBy: input.actorUserId,
          updatedBy: input.actorUserId,
        };

        if (includeIncludedAt && input.status === 'included') values.includedAt = now;
        if (includeExcludedAt && input.status === 'excluded') values.excludedAt = now;
        if (includePausedAt && input.status === 'paused') values.pausedAt = now;

        try {
          const [result] = await db.insert(distributionDevelopmentAccess).values(values);
          insertResult = result as { insertId?: number };
          break;
        } catch (error) {
          lastInsertError = error;
          const unknownColumn = readUnknownColumnName(error);
          if (unknownColumn === 'included_at' && includeIncludedAt) {
            includeIncludedAt = false;
            continue;
          }
          if (unknownColumn === 'excluded_at' && includeExcludedAt) {
            includeExcludedAt = false;
            continue;
          }
          if (unknownColumn === 'paused_at' && includePausedAt) {
            includePausedAt = false;
            continue;
          }
          if (isStatusValueError(error) && statusCandidate !== input.status) {
            break;
          }
          if (isStatusValueError(error) && statusCandidate === input.status) {
            break;
          }
          throw error;
        }
      }
      if (insertResult) break;
    }

    if (!insertResult) {
      if (lastInsertError) throw lastInsertError;
      throw new Error('Failed to insert development access row.');
    }

    const insertedId = Number(insertResult.insertId || 0);
    const [inserted] = await db
      .select()
      .from(distributionDevelopmentAccess)
      .where(eq(distributionDevelopmentAccess.id, insertedId))
      .limit(1);

    if (!inserted) throw new Error('Failed to load inserted development access row.');
    return normalizeDevelopmentAccessRow(inserted);
  }

  let includeIncludedAt = true;
  let includeExcludedAt = true;
  let includePausedAt = true;
  let didUpdate = false;
  let lastUpdateError: unknown = null;

  for (const statusCandidate of getDevelopmentAccessStatusCandidates(input.status)) {
    while (true) {
      const updateSet: Partial<typeof distributionDevelopmentAccess.$inferInsert> = {
        brandPartnershipId: input.brandPartnershipId,
        brandProfileId: input.brandProfileId,
        status: statusCandidate as any,
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
      if (includeIncludedAt && input.status === 'included' && !existing.includedAt) {
        updateSet.includedAt = now;
      }
      if (includeExcludedAt && input.status === 'excluded') updateSet.excludedAt = now;
      if (includePausedAt && input.status === 'paused') updateSet.pausedAt = now;

      try {
        await db
          .update(distributionDevelopmentAccess)
          .set(updateSet)
          .where(eq(distributionDevelopmentAccess.id, existing.id));
        didUpdate = true;
        break;
      } catch (error) {
        lastUpdateError = error;
        const unknownColumn = readUnknownColumnName(error);
        if (unknownColumn === 'included_at' && includeIncludedAt) {
          includeIncludedAt = false;
          continue;
        }
        if (unknownColumn === 'excluded_at' && includeExcludedAt) {
          includeExcludedAt = false;
          continue;
        }
        if (unknownColumn === 'paused_at' && includePausedAt) {
          includePausedAt = false;
          continue;
        }
        if (isStatusValueError(error) && statusCandidate !== input.status) {
          break;
        }
        if (isStatusValueError(error) && statusCandidate === input.status) {
          break;
        }
        throw error;
      }
    }
    if (didUpdate) break;
  }

  if (!didUpdate) {
    if (lastUpdateError) throw lastUpdateError;
    throw new Error('Failed to update development access row.');
  }

  const [updatedRow] = await db
    .select()
    .from(distributionDevelopmentAccess)
    .where(eq(distributionDevelopmentAccess.id, existing.id))
    .limit(1);

  if (!updatedRow) throw new Error('Failed to load updated development access row.');
  return normalizeDevelopmentAccessRow(updatedRow);
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
    .limit(filters.limit ?? 200)
    .then(rows =>
      rows.map(row => ({
        ...row,
        accessStatus: normalizeDevelopmentAccessStatus(String(row.accessStatus || '')) as DistributionDevelopmentAccessRow['status'],
      })),
    );
}

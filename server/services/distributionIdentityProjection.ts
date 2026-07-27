import { and, eq } from 'drizzle-orm';

import { distributionIdentities } from '../../drizzle/schema';
import { getDb } from '../db';

export type DistributionIdentityFlags = {
  hasManagerIdentity: boolean;
  hasReferrerIdentity: boolean;
};

/**
 * Produces the safe, persistent distribution projection for authenticated-user responses.
 * Callers intentionally decide how to handle an unavailable database; this helper never
 * substitutes a compatibility data source or exposes identity rows to clients.
 */
export async function getActiveDistributionIdentityFlags(
  userId: number,
): Promise<DistributionIdentityFlags> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable while resolving distribution identity flags');
  }

  const rows = await db
    .select({
      active: distributionIdentities.active,
      id: distributionIdentities.id,
      identityType: distributionIdentities.identityType,
    })
    .from(distributionIdentities)
    .where(and(eq(distributionIdentities.userId, userId), eq(distributionIdentities.active, 1)));

  return {
    hasManagerIdentity: rows.some(
      row => Boolean(row.id) && row.active === 1 && row.identityType === 'manager',
    ),
    hasReferrerIdentity: rows.some(
      row => Boolean(row.id) && row.active === 1 && row.identityType === 'referrer',
    ),
  };
}

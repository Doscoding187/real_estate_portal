import { and, desc, eq, inArray } from 'drizzle-orm';
import { auditLogs } from '../../drizzle/schema';
import { getDb } from '../db';

export interface ListingAuditRow {
  action: string;
  metadata: string | null;
}

/** Audit actions written when the lister (or their agency) withdraws a listing. */
const LISTER_ACTIONS = [
  'listing.unpublish',
  'listing.sold',
  'listing.let',
  'listing.republish',
  'agency.listing_archived',
];
/** Written by adminRouter property moderation (approve / reject / archive). */
const MODERATION_ACTION = 'reject_property';

/**
 * True when the most recent withdrawal of this listing was a moderator
 * takedown (admin moderation with lifecycleAction "archive"). Uses the existing
 * audit log only; rows are newest first.
 */
export function wasLastArchivedByModerator(rows: readonly ListingAuditRow[]): boolean {
  for (const row of rows) {
    if (LISTER_ACTIONS.includes(row.action)) return false;
    if (row.action === MODERATION_ACTION) {
      try {
        const metadata = row.metadata ? JSON.parse(row.metadata) : {};
        if (metadata?.lifecycleAction === 'archive') return true;
      } catch {
        return true; // unreadable moderation record: fail closed
      }
    }
  }
  return false;
}

export async function isListingTakenDownByModerator(listingId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const rows = await database
    .select({ action: auditLogs.action, metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, 'listing'),
        eq(auditLogs.targetId, listingId),
        inArray(auditLogs.action, [...LISTER_ACTIONS, MODERATION_ACTION]),
      ),
    )
    .orderBy(desc(auditLogs.id))
    .limit(25);
  return wasLastArchivedByModerator(rows);
}

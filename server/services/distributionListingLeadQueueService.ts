import { eq } from 'drizzle-orm';
import {
  distributionListingLeadQueue,
  distributionListingLeadQueueEvents,
  type DISTRIBUTION_LISTING_LEAD_QUEUE_SOURCE_VALUES,
} from '../../drizzle/schema';

export type DistributionListingLeadQueueSource =
  (typeof DISTRIBUTION_LISTING_LEAD_QUEUE_SOURCE_VALUES)[number];

export async function enqueueDistributionListingLeadInTransaction(
  tx: any,
  input: { leadId: number; source: DistributionListingLeadQueueSource },
): Promise<number> {
  const [existing] = await tx
    .select({ id: distributionListingLeadQueue.id })
    .from(distributionListingLeadQueue)
    .where(eq(distributionListingLeadQueue.leadId, input.leadId))
    .limit(1);
  if (existing) return Number(existing.id);

  const [insertResult] = await tx.insert(distributionListingLeadQueue).values({
    leadId: input.leadId,
    source: input.source,
    status: 'open',
  });
  const queueItemId = Number((insertResult as any).insertId || 0);
  if (!queueItemId) throw new Error('Distribution listing lead queue item was not created.');

  await tx.insert(distributionListingLeadQueueEvents).values({
    queueItemId,
    eventType: 'queued',
    actorUserId: null,
    fromAgentId: null,
    toAgentId: null,
    note: null,
  });
  return queueItemId;
}

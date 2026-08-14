import { and, eq } from 'drizzle-orm';

import { plans, subscriptions } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  getCommercialProductKey,
  isPaidCommercialTermExpired,
  resolveCommercialTerm,
} from './commercialTerm';
import { isPaidSubscriptionEntitled, type SubscriptionStatus } from './planAccessService';

type PublicationAccessDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type DeveloperPublicationAccessReason =
  | 'active_launch_access'
  | 'missing_launch_access'
  | 'expired_launch_access'
  | 'inactive_launch_access'
  | 'invalid_launch_access';

export type DeveloperPublicationAccess = {
  eligible: boolean;
  reason: DeveloperPublicationAccessReason;
  status: string | null;
  planName: string | null;
  planDisplayName: string | null;
  expiresAt: string | null;
};

function accessResult(
  input: Partial<DeveloperPublicationAccess> &
    Pick<DeveloperPublicationAccess, 'eligible' | 'reason'>,
): DeveloperPublicationAccess {
  return {
    eligible: input.eligible,
    reason: input.reason,
    status: input.status ?? null,
    planName: input.planName ?? null,
    planDisplayName: input.planDisplayName ?? null,
    expiresAt: input.expiresAt ?? null,
  };
}

export async function getDeveloperPublicationAccess(
  organisationId: number,
  options: { db?: PublicationAccessDatabase; now?: Date } = {},
): Promise<DeveloperPublicationAccess> {
  const database = options.db ?? (await getDb());
  if (!database) throw new Error('Database not available');

  const [row] = await database
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.ownerType, 'developer'),
        eq(subscriptions.ownerId, organisationId),
        eq(plans.segment, 'developer'),
        eq(plans.name, 'developer_launch_access'),
      ),
    )
    .limit(1);

  if (!row) {
    return accessResult({ eligible: false, reason: 'missing_launch_access' });
  }
  if (!row.subscription || !row.plan) {
    return accessResult({ eligible: false, reason: 'invalid_launch_access' });
  }

  const status = String(row.subscription.status || '') as SubscriptionStatus;
  const expiresAt = row.subscription.currentPeriodEnd || null;
  const term = resolveCommercialTerm(row.plan);
  const productKey = getCommercialProductKey(row.plan);
  const shared = {
    status,
    planName: row.plan.name,
    planDisplayName: row.plan.displayName,
    expiresAt,
  };

  if (term.kind !== 'paid_launch_access' || productKey !== 'developer_launch_access') {
    return accessResult({ eligible: false, reason: 'invalid_launch_access', ...shared });
  }

  const now = options.now ?? new Date();
  if (isPaidCommercialTermExpired(term, status, expiresAt, now)) {
    return accessResult({ eligible: false, reason: 'expired_launch_access', ...shared });
  }

  if (!isPaidSubscriptionEntitled(status)) {
    return accessResult({ eligible: false, reason: 'inactive_launch_access', ...shared });
  }

  const end = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  if (!Number.isFinite(end) || end <= now.getTime()) {
    return accessResult({ eligible: false, reason: 'expired_launch_access', ...shared });
  }

  return accessResult({ eligible: true, reason: 'active_launch_access', ...shared });
}

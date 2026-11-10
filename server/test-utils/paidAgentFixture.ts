import { and, eq } from 'drizzle-orm';
import { billableAccounts, plans, subscriptions } from '../../drizzle/schema';

function toMySqlTimestamp(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Gives an independent agent a real, current Launch Access term in exactly the
 * form the lead gate reads (canonical `agent_launch_access` plan plus an active
 * subscription with a future period end). Test runtimes enable the product
 * through the controlled-fixture activation policy; production code is untouched.
 *
 * Returns the created subscription id so the caller can remove it before
 * deleting the user.
 */
export async function grantAgentLaunchAccess(
  db: any,
  userId: number,
  options: { periodDays?: number } = {},
): Promise<number> {
  await db
    .insert(billableAccounts)
    .values({ accountKind: 'agent', userId })
    .onDuplicateKeyUpdate({ set: { accountKind: 'agent' } });
  const [account] = await db
    .select({ id: billableAccounts.id })
    .from(billableAccounts)
    .where(and(eq(billableAccounts.accountKind, 'agent'), eq(billableAccounts.userId, userId)))
    .limit(1);
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, 'agent_launch_access'))
    .limit(1);
  if (!account || !plan) {
    throw new Error('Paid agent fixture requires the canonical agent_launch_access plan.');
  }
  const now = new Date();
  const periodMs = (options.periodDays ?? 90) * 86_400_000;
  const [result] = await db.insert(subscriptions).values({
    ownerType: 'agent',
    ownerId: userId,
    billableAccountId: account.id,
    planId: plan.id,
    status: 'active',
    currentPeriodStart: toMySqlTimestamp(now),
    currentPeriodEnd: toMySqlTimestamp(new Date(now.getTime() + periodMs)),
    cancelAtPeriodEnd: 0,
  } as any);
  return Number(result?.insertId ?? result?.[0]?.insertId ?? 0);
}

export async function removeAgentLaunchAccess(db: any, subscriptionId: number): Promise<void> {
  if (!subscriptionId) return;
  await db
    .delete(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .catch(() => undefined);
}

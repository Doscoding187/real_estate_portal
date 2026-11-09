import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { users } from '../../drizzle/schema';
import { getDb } from '../db';
import { getAgentEntitlementsForUserId } from './agentEntitlementService';

export const AGENT_LEADS_LOCKED_MESSAGE = 'Leads unlock with Launch Access.';

type GateUser = { id: number; role?: string | null };

/**
 * Whether lead and showing data may be shown to this user. Independent and
 * agency-member agents need CURRENT commercial access (paid Launch Access or
 * agency-managed access) in addition to existing-lead custody. Agency admins
 * and super admins are not gated here. Data is never deleted; it is hidden.
 */
export async function hasAgentLeadAccess(user: GateUser): Promise<boolean> {
  if (user.role !== 'agent') return true;
  const entitlements = await getAgentEntitlementsForUserId(user.id);
  return Boolean(entitlements?.hasCommercialAccess && entitlements.canAccessExistingLeads);
}

export async function requireAgentLeadAccess(ctx: { user?: GateUser | null }): Promise<void> {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  if (await hasAgentLeadAccess(ctx.user)) return;
  throw new TRPCError({ code: 'FORBIDDEN', message: AGENT_LEADS_LOCKED_MESSAGE });
}

export const AGENT_NOT_ASSIGNABLE_MESSAGE =
  'This agent cannot be assigned leads until they have Launch Access.';

/**
 * Refuse lead assignment to an agent user who cannot currently receive leads
 * (no current Launch Access, unverified, unapproved, or no phone). Non-agent
 * assignees are not governed by agent entitlements and pass through.
 */
export async function requireAgentCanReceiveAssignedLeads(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.role !== 'agent') return;
  const entitlements = await getAgentEntitlementsForUserId(userId);
  if (entitlements?.canReceiveLeads) return;
  throw new TRPCError({ code: 'FORBIDDEN', message: AGENT_NOT_ASSIGNABLE_MESSAGE });
}

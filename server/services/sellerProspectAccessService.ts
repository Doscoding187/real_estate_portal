import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { agents, sellerProspects } from '../../drizzle/schema';

export const SELLER_PROSPECT_LISTING_HANDOFF_STAGES = ['qualified', 'mandate_won'] as const;

type AgencyUser = {
  id: number;
  role?: string | null;
  agencyId?: number | null;
};

export type SellerProspectActorScope = {
  agencyId: number;
  agentId: number | null;
  isManager: boolean;
};

export type SellerProspectListingConversion = {
  sellerProspectId: number;
  agencyId: number;
  assignedAgentId: number | null;
  actorUserId: number;
};

export async function getSellerProspectActorScope(
  db: any,
  user: AgencyUser,
): Promise<SellerProspectActorScope> {
  const agencyId = Number(user.agencyId || 0);
  if (!agencyId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must belong to an agency to work seller prospects.',
    });
  }

  const isManager = user.role === 'agency_admin' || user.role === 'super_admin';
  if (isManager) {
    return { agencyId, agentId: null, isManager: true };
  }

  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(
      and(
        eq(agents.userId, user.id),
        eq(agents.agencyId, agencyId),
        eq(agents.status, 'approved'),
      ),
    )
    .limit(1);

  if (!agent) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'An approved agency agent profile is required to work seller prospects.',
    });
  }

  return { agencyId, agentId: Number(agent.id), isManager: false };
}

export async function requireSellerProspect(
  db: any,
  scope: SellerProspectActorScope,
  sellerProspectId: number,
) {
  const [prospect] = await db
    .select()
    .from(sellerProspects)
    .where(and(eq(sellerProspects.id, sellerProspectId), eq(sellerProspects.agencyId, scope.agencyId)))
    .limit(1);

  if (!prospect || (!scope.isManager && Number(prospect.assignedAgentId || 0) !== scope.agentId)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Seller prospect not found.' });
  }

  return prospect;
}

export async function requireAgencyAssignableAgent(db: any, agencyId: number, agentId: number) {
  const [agent] = await db
    .select({ id: agents.id, userId: agents.userId, displayName: agents.displayName })
    .from(agents)
    .where(
      and(eq(agents.id, agentId), eq(agents.agencyId, agencyId), eq(agents.status, 'approved')),
    )
    .limit(1);

  if (!agent) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Agent is not an approved member of this agency.',
    });
  }

  return agent;
}

export async function prepareSellerProspectListingConversion(
  db: any,
  user: AgencyUser,
  sellerProspectId: number,
): Promise<SellerProspectListingConversion> {
  const scope = await getSellerProspectActorScope(db, user);
  const prospect = await requireSellerProspect(db, scope, sellerProspectId);

  if (prospect.convertedListingId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This seller prospect is already linked to a canonical listing.',
    });
  }

  if (!SELLER_PROSPECT_LISTING_HANDOFF_STAGES.includes(prospect.stage as any)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Qualify the seller prospect before creating a listing draft.',
    });
  }

  return {
    sellerProspectId: prospect.id,
    agencyId: scope.agencyId,
    assignedAgentId: prospect.assignedAgentId ? Number(prospect.assignedAgentId) : null,
    actorUserId: user.id,
  };
}

import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { agents, sellerMandateOperations, sellerProspects } from '../../drizzle/schema';

export const SELLER_PROSPECT_LISTING_HANDOFF_STAGES = ['qualified', 'mandate_won'] as const;
export const MANDATE_READINESS_REQUIREMENTS = [
  'sellerIdentityRecorded', 'propertyAddressConfirmed', 'contactDetailsConfirmed',
  'mandateTypeSelected', 'pricingDiscussionCompleted', 'agreedPriceRecorded',
  'mandateDocumentRecorded', 'disclosureStatusRecorded', 'mediaPlanRecorded',
  'accessArrangementsRecorded', 'responsibleAgentConfirmed', 'nextActionRecorded',
] as const;

export function getMandateReadiness(operation: any, prospect: any) {
  const requirements = (operation?.requirements || {}) as Record<string, unknown>;
  const missing: string[] = MANDATE_READINESS_REQUIREMENTS.filter(key => requirements[key] !== true);
  if (!prospect?.mandateType) missing.push('mandateTypeSelected');
  if (!operation?.pricingDiscussedAt) missing.push('pricingDiscussionCompleted');
  if (!operation?.agreedListingPrice && !prospect?.agreedAskingPrice) missing.push('agreedPriceRecorded');
  if (!['received', 'signed', 'not_applicable'].includes(String(operation?.documentStatus))) missing.push('mandateDocumentRecorded');
  if (!prospect?.mandateSignedAt) missing.push('mandateSignedAt');
  if (prospect?.mandateExpiresAt && new Date(prospect.mandateExpiresAt).getTime() <= Date.now()) missing.push('mandateNotExpired');
  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

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

  const [operation] = await db
    .select()
    .from(sellerMandateOperations)
    .where(and(eq(sellerMandateOperations.sellerProspectId, prospect.id), eq(sellerMandateOperations.agencyId, scope.agencyId)))
    .limit(1);
  const readiness = getMandateReadiness(operation, prospect);
  if (!operation || operation.status !== 'listing_ready' || !readiness.ready) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Complete mandate and seller onboarding before creating a listing draft${readiness.missing.length ? `: ${readiness.missing.join(', ')}` : '.'}`,
    });
  }

  return {
    sellerProspectId: prospect.id,
    agencyId: scope.agencyId,
    assignedAgentId: prospect.assignedAgentId ? Number(prospect.assignedAgentId) : null,
    actorUserId: user.id,
  };
}

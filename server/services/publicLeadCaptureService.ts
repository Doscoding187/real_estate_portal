import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { agents, developments, leads, properties, users } from '../../drizzle/schema';
import { brandLeadService } from './brandLeadService';

type LeadType = 'inquiry' | 'viewing_request' | 'offer' | 'callback';
type LeadInsert = typeof leads.$inferInsert;

interface AffordabilityData {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlyDebts?: number;
  availableDeposit?: number;
  maxAffordable?: number;
  calculatedAt?: string;
}

export interface PublicLeadCaptureInput {
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  leadType?: LeadType;
  source?: string;
  leadSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  affordabilityData?: AffordabilityData;
}

export interface ResolvedLeadOwnership {
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
  ownerUserId?: number;
}

export interface PublicLeadCaptureResult {
  success: true;
  leadId: number;
  route: 'brand' | 'direct';
  delivered?: boolean;
  brandLeadStatus?: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber' | 'claimed';
  message?: string;
}

function coerceLeadType(input?: string): LeadType {
  if (input === 'viewing_request') return 'viewing_request';
  if (input === 'offer') return 'offer';
  if (input === 'callback') return 'callback';
  return 'inquiry';
}

interface OwnerContext {
  ownerUserId: number;
  ownerRole?: string | null;
  ownerAgencyId?: number | null;
  ownerAgentId?: number | null;
  ownerAgentAgencyId?: number | null;
}

export class LeadOwnershipResolutionError extends Error {
  constructor(message: string = 'Unable to resolve lead owner context') {
    super(message);
    this.name = 'LeadOwnershipResolutionError';
  }
}

export function applyOwnershipFallback(
  resolved: ResolvedLeadOwnership,
  ownerContext?: OwnerContext,
): ResolvedLeadOwnership {
  if (!ownerContext) return resolved;

  const next: ResolvedLeadOwnership = { ...resolved };

  if (!next.ownerUserId) {
    next.ownerUserId = ownerContext.ownerUserId;
  }

  if (!next.agentId && ownerContext.ownerAgentId) {
    next.agentId = ownerContext.ownerAgentId;
  }

  if (!next.agencyId) {
    const canUseOwnerAgencyRole =
      ownerContext.ownerRole === 'agency_admin' || ownerContext.ownerRole === 'agent';

    if (
      next.agentId &&
      ownerContext.ownerAgentId &&
      next.agentId === ownerContext.ownerAgentId &&
      ownerContext.ownerAgentAgencyId
    ) {
      next.agencyId = ownerContext.ownerAgentAgencyId;
    } else if (canUseOwnerAgencyRole && ownerContext.ownerAgencyId) {
      // Agency-managed fallback when listing/property has no explicit agent assignment.
      next.agencyId = ownerContext.ownerAgencyId;
    }
  }

  return next;
}

export function hasDeterministicOwnerContext(resolved: ResolvedLeadOwnership): boolean {
  return Boolean(
    resolved.developerBrandProfileId || resolved.agentId || resolved.agencyId || resolved.ownerUserId,
  );
}

async function resolveLeadOwnership(input: PublicLeadCaptureInput): Promise<ResolvedLeadOwnership> {
  const db = await getDb();
  if (!db) {
    return {
      propertyId: input.propertyId,
      developmentId: input.developmentId,
      developerBrandProfileId: input.developerBrandProfileId,
      agencyId: input.agencyId,
      agentId: input.agentId,
    };
  }

  const resolved: ResolvedLeadOwnership = {
    propertyId: input.propertyId,
    developmentId: input.developmentId,
    developerBrandProfileId: input.developerBrandProfileId,
    agencyId: input.agencyId,
    agentId: input.agentId,
  };

  if (resolved.propertyId) {
    const [property] = await db
      .select({
        developmentId: properties.developmentId,
        developerBrandProfileId: properties.developerBrandProfileId,
        agentId: properties.agentId,
        ownerId: properties.ownerId,
      })
      .from(properties)
      .where(eq(properties.id, resolved.propertyId))
      .limit(1);

    if (property) {
      resolved.developmentId = resolved.developmentId || property.developmentId || undefined;
      resolved.developerBrandProfileId =
        resolved.developerBrandProfileId || property.developerBrandProfileId || undefined;
      resolved.agentId = resolved.agentId || property.agentId || undefined;
      resolved.ownerUserId = property.ownerId || undefined;
    } else {
      resolved.propertyId = undefined;
    }
  }

  if (resolved.developmentId && !resolved.developerBrandProfileId) {
    const [development] = await db
      .select({
        id: developments.id,
        developerBrandProfileId: developments.developerBrandProfileId,
      })
      .from(developments)
      .where(eq(developments.id, resolved.developmentId))
      .limit(1);

    if (!development) {
      resolved.developmentId = undefined;
    } else if (development.developerBrandProfileId) {
      resolved.developerBrandProfileId = development.developerBrandProfileId;
    }
  }

  if (resolved.agentId && !resolved.agencyId) {
    const [agent] = await db
      .select({
        id: agents.id,
        agencyId: agents.agencyId,
      })
      .from(agents)
      .where(eq(agents.id, resolved.agentId))
      .limit(1);

    if (!agent) {
      resolved.agentId = undefined;
    } else if (agent.agencyId) {
      resolved.agencyId = agent.agencyId;
    }
  }

  if (resolved.ownerUserId) {
    const [ownerUser] = await db
      .select({
        id: users.id,
        role: users.role,
        agencyId: users.agencyId,
      })
      .from(users)
      .where(eq(users.id, resolved.ownerUserId))
      .limit(1);

    if (!ownerUser) {
      resolved.ownerUserId = undefined;
      return resolved;
    }

    const [ownerAgent] = await db
      .select({
        id: agents.id,
        agencyId: agents.agencyId,
      })
      .from(agents)
      .where(eq(agents.userId, ownerUser.id))
      .limit(1);

    return applyOwnershipFallback(resolved, {
      ownerUserId: ownerUser.id,
      ownerRole: ownerUser.role,
      ownerAgencyId: ownerUser.agencyId,
      ownerAgentId: ownerAgent?.id,
      ownerAgentAgencyId: ownerAgent?.agencyId,
    });
  }

  return resolved;
}

export async function capturePublicLead(
  input: PublicLeadCaptureInput,
): Promise<PublicLeadCaptureResult> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const resolved = await resolveLeadOwnership(input);
  if (!hasDeterministicOwnerContext(resolved)) {
    throw new LeadOwnershipResolutionError();
  }

  const source = input.source || input.leadSource || 'web';
  const leadSource = input.leadSource || input.source || 'web';
  const leadType = coerceLeadType(input.leadType);

  if (resolved.developerBrandProfileId) {
    const brandCapture = await brandLeadService.captureBrandLead({
      developerBrandProfileId: resolved.developerBrandProfileId,
      developmentId: resolved.developmentId,
      propertyId: resolved.propertyId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      leadSource,
      referrerUrl: input.referrerUrl,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
    });

    const leadPatch: Partial<LeadInsert> = {};
    if (resolved.agentId) leadPatch.agentId = resolved.agentId;
    if (resolved.agencyId) leadPatch.agencyId = resolved.agencyId;
    if (resolved.ownerUserId) leadPatch.assignedTo = resolved.ownerUserId;
    if (leadType !== 'inquiry') leadPatch.leadType = leadType;
    if (source) leadPatch.source = source;
    if (input.affordabilityData) {
      leadPatch.affordabilityData = input.affordabilityData as any;
      leadPatch.funnelStage = 'affordability';
    }

    if (Object.keys(leadPatch).length > 0) {
      await db.update(leads).set(leadPatch).where(eq(leads.id, brandCapture.leadId));
    }

    return {
      success: true,
      leadId: brandCapture.leadId,
      route: 'brand',
      delivered: brandCapture.delivered,
      brandLeadStatus: brandCapture.brandLeadStatus,
      message: brandCapture.message,
    };
  }

  const [insertResult] = await db.insert(leads).values({
    propertyId: resolved.propertyId || null,
    developmentId: resolved.developmentId || null,
    developerBrandProfileId: resolved.developerBrandProfileId || null,
    agencyId: resolved.agencyId || null,
    agentId: resolved.agentId || null,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null,
    leadType,
    status: 'new',
    source,
    leadSource,
    referrerUrl: input.referrerUrl || null,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    affordabilityData: input.affordabilityData ? (input.affordabilityData as any) : null,
    funnelStage: input.affordabilityData ? 'affordability' : 'interest',
    qualificationStatus: 'pending',
    assignedTo: resolved.ownerUserId || null,
  });

  return {
    success: true,
    leadId: insertResult.insertId,
    route: 'direct',
    message: 'Lead captured',
  };
}

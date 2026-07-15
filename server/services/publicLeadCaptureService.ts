import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  agents,
  developments,
  leads,
  listings,
  properties,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { brandLeadService } from './brandLeadService';
import { recordAgentOsEventForAgentId } from './agentOsEventService';
import { recordProspectLeadAction } from './prospectJourneyService';

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
  /** Set only by an authenticated server boundary; never a public client field. */
  authenticatedUserId?: number;
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
  unitId?: string;
  unitName?: string;
  unitPriceFrom?: number;
  unitBedrooms?: number;
  unitBathrooms?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  leadType?: LeadType;
  source?: string;
  sourceSurface?: string;
  leadSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  affordabilityData?: AffordabilityData;
}

interface ResolvedLeadOwnership {
  propertyId?: number;
  developmentId?: number;
  developerBrandProfileId?: number;
  agencyId?: number;
  agentId?: number;
}

export interface PublicLeadCaptureResult {
  success: true;
  leadId: number;
  route: 'brand' | 'direct';
  delivered?: boolean;
  brandLeadStatus?: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber' | 'claimed';
  message?: string;
}

function normalizeLeadSource(value?: string | null): string {
  const normalized = (value || '').trim().toLowerCase();

  if (!normalized) return 'web';

  if (normalized === 'website' || normalized === 'site' || normalized === 'direct') {
    return 'web';
  }

  if (normalized === 'property_listify' || normalized === 'property' || normalized === 'property-page') {
    return 'property_detail';
  }

  if (
    normalized === 'agent' ||
    normalized === 'agent-page' ||
    normalized === 'agent_detail' ||
    normalized === 'agent-detail'
  ) {
    return 'agent_profile';
  }

  if (normalized === 'development' || normalized === 'development-page') {
    return 'development_detail';
  }

  if (normalized === 'referrer') {
    return 'referral';
  }

  return normalized;
}

function coerceLeadType(input?: string): LeadType {
  if (input === 'viewing_request') return 'viewing_request';
  if (input === 'offer') return 'offer';
  if (input === 'callback') return 'callback';
  return 'inquiry';
}

function isPublicPropertyStatus(status: unknown): boolean {
  return status === 'available' || status === 'published';
}

async function resolveLeadOwnership(input: PublicLeadCaptureInput): Promise<ResolvedLeadOwnership> {
  const db = await getDb();
  const hasExplicitDevelopmentId = Number.isFinite(Number(input.developmentId)) && Number(input.developmentId) > 0;
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
  let canonicalSourceListingId: number | undefined;
  let canonicalPropertyOwnerId: number | undefined;

  if (resolved.propertyId) {
    const [property] = await db
      .select({
        id: properties.id,
        status: properties.status,
        developmentId: properties.developmentId,
        developerBrandProfileId: properties.developerBrandProfileId,
        agentId: properties.agentId,
        sourceListingId: properties.sourceListingId,
        ownerId: properties.ownerId,
      })
      .from(properties)
      .where(eq(properties.id, resolved.propertyId))
      .limit(1);

    if (!property || !isPublicPropertyStatus(property.status)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not available for public enquiries.',
      });
    }

    resolved.propertyId = property.id;
    resolved.developmentId = property.developmentId || undefined;
    resolved.developerBrandProfileId = property.developerBrandProfileId || undefined;
    resolved.agentId = property.agentId || undefined;
    resolved.agencyId = undefined;
    canonicalSourceListingId = property.sourceListingId || undefined;
    canonicalPropertyOwnerId = property.ownerId || undefined;
  }

  if (hasExplicitDevelopmentId && resolved.developmentId) {
    const [development] = await db
      .select({
        id: developments.id,
        developerBrandProfileId: developments.developerBrandProfileId,
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
      })
      .from(developments)
      .where(eq(developments.id, resolved.developmentId))
      .limit(1);

    if (!development) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Development not found.',
      });
    }

    if (Number(development.isPublished || 0) !== 1 || development.approvalStatus !== 'approved') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Development not available for public enquiries.',
      });
    }

    if (
      input.developerBrandProfileId &&
      development.developerBrandProfileId &&
      Number(input.developerBrandProfileId) !== Number(development.developerBrandProfileId)
    ) {
      console.warn('[capturePublicLead] Ignoring mismatched client developerBrandProfileId', {
        developmentId: resolved.developmentId,
        clientDeveloperBrandProfileId: input.developerBrandProfileId,
        canonicalDeveloperBrandProfileId: development.developerBrandProfileId,
      });
    }

    resolved.developerBrandProfileId = development.developerBrandProfileId || undefined;

    if (input.unitId) {
      const [unit] = await db
        .select({
          id: unitTypes.id,
          developmentId: unitTypes.developmentId,
          isActive: unitTypes.isActive,
        })
        .from(unitTypes)
        .where(eq(unitTypes.id, input.unitId))
        .limit(1);

      if (
        !unit ||
        Number(unit.developmentId) !== Number(resolved.developmentId) ||
        Number(unit.isActive || 0) !== 1
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unit does not belong to this public development.',
        });
      }
    }
  } else if (resolved.developmentId && !resolved.developerBrandProfileId) {
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

  // A canonical listing's explicit agency wins. Older projections then fall
  // back through the public agent and finally the owner's current membership.
  if (canonicalSourceListingId) {
    const [sourceListing] = await db
      .select({ agencyId: listings.agencyId })
      .from(listings)
      .where(eq(listings.id, canonicalSourceListingId))
      .limit(1);

    if (sourceListing?.agencyId) {
      resolved.agencyId = sourceListing.agencyId;
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

  if (canonicalPropertyOwnerId && !resolved.agencyId) {
    const [owner] = await db
      .select({ agencyId: users.agencyId })
      .from(users)
      .where(eq(users.id, canonicalPropertyOwnerId))
      .limit(1);

    if (owner?.agencyId) {
      resolved.agencyId = owner.agencyId;
    }
  }

  return resolved;
}

export async function capturePublicLead(input: PublicLeadCaptureInput): Promise<PublicLeadCaptureResult> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const resolved = await resolveLeadOwnership(input);
  const source = normalizeLeadSource(input.sourceSurface || input.source || input.leadSource);
  const leadSource = normalizeLeadSource(input.leadSource || input.source || input.sourceSurface);
  const leadType = coerceLeadType(input.leadType);

  if (resolved.developerBrandProfileId) {
    const brandCapture = await brandLeadService.captureBrandLead({
      developerBrandProfileId: resolved.developerBrandProfileId,
      developmentId: resolved.developmentId,
      propertyId: resolved.propertyId,
      unitId: input.unitId,
      unitName: input.unitName,
      unitPriceFrom: input.unitPriceFrom,
      unitBedrooms: input.unitBedrooms,
      unitBathrooms: input.unitBathrooms,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      leadSource,
      sourceSurface: source,
      referrerUrl: input.referrerUrl,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      affordabilityData: input.affordabilityData,
    });

    const leadPatch: Partial<LeadInsert> = {};
    if (resolved.agentId) leadPatch.agentId = resolved.agentId;
    if (resolved.agencyId) leadPatch.agencyId = resolved.agencyId;
    if (leadType !== 'inquiry') leadPatch.leadType = leadType;
    if (source) leadPatch.source = source;
    if (input.affordabilityData) {
      leadPatch.affordabilityData = input.affordabilityData as any;
      leadPatch.funnelStage = 'affordability';
    }

    if (Object.keys(leadPatch).length > 0) {
      await db.update(leads).set(leadPatch).where(eq(leads.id, brandCapture.leadId));
    }

    if (resolved.propertyId) {
      await db
        .update(properties)
        .set({ enquiries: sql`${properties.enquiries} + 1` })
        .where(eq(properties.id, resolved.propertyId));
    }

    await recordAgentOsEventForAgentId({
      agentId: resolved.agentId,
      eventType: 'agent_lead_received',
      eventData: {
        leadId: brandCapture.leadId,
        propertyId: resolved.propertyId ?? null,
        developmentId: resolved.developmentId ?? null,
        leadSource,
        leadType,
        route: 'brand',
      },
    });

    await recordProspectLeadAction({
      db,
      leadId: brandCapture.leadId,
      authenticatedUserId: input.authenticatedUserId,
      source,
      propertyId: resolved.propertyId,
      developmentId: resolved.developmentId,
      referrerUrl: input.referrerUrl,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
    });

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
    unitId: input.unitId || null,
    unitName: input.unitName || null,
    unitPriceFrom: input.unitPriceFrom ?? null,
    unitBedrooms: input.unitBedrooms ?? null,
    unitBathrooms: input.unitBathrooms ?? null,
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
  });

  if (resolved.propertyId) {
    await db
      .update(properties)
      .set({ enquiries: sql`${properties.enquiries} + 1` })
      .where(eq(properties.id, resolved.propertyId));
  }

  await recordAgentOsEventForAgentId({
    agentId: resolved.agentId,
    eventType: 'agent_lead_received',
    eventData: {
      leadId: insertResult.insertId,
      propertyId: resolved.propertyId ?? null,
      developmentId: resolved.developmentId ?? null,
      leadSource,
      leadType,
      route: 'direct',
    },
  });

  await recordProspectLeadAction({
    db,
    leadId: Number(insertResult.insertId),
    authenticatedUserId: input.authenticatedUserId,
    source,
    propertyId: resolved.propertyId,
    developmentId: resolved.developmentId,
    referrerUrl: input.referrerUrl,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
  });

  return {
    success: true,
    leadId: insertResult.insertId,
    route: 'direct',
    message: 'Lead captured',
  };
}

import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { agents, developments, leads, properties } from '../../drizzle/schema';
import { brandLeadService } from './brandLeadService';
import { recordAgentOsEventForAgentId } from './agentOsEventService';

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
      })
      .from(properties)
      .where(eq(properties.id, resolved.propertyId))
      .limit(1);

    if (property) {
      resolved.developmentId = resolved.developmentId || property.developmentId || undefined;
      resolved.developerBrandProfileId =
        resolved.developerBrandProfileId || property.developerBrandProfileId || undefined;
      resolved.agentId = resolved.agentId || property.agentId || undefined;
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

  return resolved;
}

export async function capturePublicLead(input: PublicLeadCaptureInput): Promise<PublicLeadCaptureResult> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const resolved = await resolveLeadOwnership(input);
  const source = normalizeLeadSource(input.source || input.leadSource);
  const leadSource = normalizeLeadSource(input.leadSource || input.source);
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
      referrerUrl: input.referrerUrl,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
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

  return {
    success: true,
    leadId: insertResult.insertId,
    route: 'direct',
    message: 'Lead captured',
  };
}

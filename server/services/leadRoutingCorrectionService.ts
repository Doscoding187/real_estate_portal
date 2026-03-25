import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import {
  agencies,
  agents,
  developerBrandProfiles,
  leadActivities,
  leads,
} from '../../drizzle/schema';
import { nowAsDbTimestamp } from '../utils/dbTypeUtils';

export type LeadRoutingCorrectionRoute = 'agent' | 'agency' | 'brand' | 'private' | 'clear';

export interface LeadRoutingCorrectionInput {
  leadId: number;
  routeType: LeadRoutingCorrectionRoute;
  agentId?: number;
  agencyId?: number;
  developerBrandProfileId?: number;
  note?: string;
}

function getBrandRoutingState(brandProfile: {
  isSubscriber: number;
  publicContactEmail: string | null;
  isContactVerified: number;
}) {
  if (brandProfile.isSubscriber) {
    return {
      brandLeadStatus: 'delivered_subscriber' as const,
      leadDeliveryMethod: 'crm_export' as const,
    };
  }

  if (brandProfile.publicContactEmail && brandProfile.isContactVerified) {
    return {
      brandLeadStatus: 'delivered_unsubscribed' as const,
      leadDeliveryMethod: 'email' as const,
    };
  }

  if (brandProfile.publicContactEmail) {
    return {
      brandLeadStatus: 'delivered_unsubscribed' as const,
      leadDeliveryMethod: 'email' as const,
    };
  }

  return {
    brandLeadStatus: 'captured' as const,
    leadDeliveryMethod: 'none' as const,
  };
}

export async function correctLeadRouting(input: LeadRoutingCorrectionInput, actorUserId: number) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  const existingRows = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
  const existingLead = existingRows[0];
  if (!existingLead) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
  }

  const currentRouteLabel = [
    existingLead.developerBrandProfileId ? `brand:${existingLead.developerBrandProfileId}` : null,
    existingLead.agentId ? `agent:${existingLead.agentId}` : null,
    existingLead.agencyId ? `agency:${existingLead.agencyId}` : null,
  ]
    .filter(Boolean)
    .join(', ') || 'unassigned';

  const updateData: Record<string, any> = {
    updatedAt: nowAsDbTimestamp(),
  };

  if (input.routeType === 'agent') {
    if (!input.agentId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent ID is required.' });
    }

    const agentRows = await db
      .select({
        id: agents.id,
        agencyId: agents.agencyId,
      })
      .from(agents)
      .where(eq(agents.id, input.agentId))
      .limit(1);

    const agent = agentRows[0];
    if (!agent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
    }

    updateData.agentId = agent.id;
    updateData.agencyId = agent.agencyId ?? null;
    updateData.developerBrandProfileId = null;
    updateData.brandLeadStatus = null;
    updateData.leadDeliveryMethod = null;
  } else if (input.routeType === 'agency') {
    if (!input.agencyId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agency ID is required.' });
    }

    const agencyRows = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.id, input.agencyId))
      .limit(1);

    const agency = agencyRows[0];
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
    }

    updateData.agentId = null;
    updateData.agencyId = agency.id;
    updateData.developerBrandProfileId = null;
    updateData.brandLeadStatus = null;
    updateData.leadDeliveryMethod = null;
  } else if (input.routeType === 'brand') {
    if (!input.developerBrandProfileId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Developer brand ID is required.' });
    }

    const brandRows = await db
      .select({
        id: developerBrandProfiles.id,
        isSubscriber: developerBrandProfiles.isSubscriber,
        publicContactEmail: developerBrandProfiles.publicContactEmail,
        isContactVerified: developerBrandProfiles.isContactVerified,
      })
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.id, input.developerBrandProfileId))
      .limit(1);

    const brand = brandRows[0];
    if (!brand) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer brand not found' });
    }

    const brandRouting = getBrandRoutingState(brand);
    updateData.agentId = null;
    updateData.agencyId = null;
    updateData.developerBrandProfileId = brand.id;
    updateData.brandLeadStatus = brandRouting.brandLeadStatus;
    updateData.leadDeliveryMethod = brandRouting.leadDeliveryMethod;
  } else if (input.routeType === 'private') {
    updateData.agentId = null;
    updateData.agencyId = null;
    updateData.developerBrandProfileId = null;
    updateData.brandLeadStatus = null;
    updateData.leadDeliveryMethod = null;
  } else {
    updateData.agentId = null;
    updateData.agencyId = null;
    updateData.developerBrandProfileId = null;
    updateData.brandLeadStatus = null;
    updateData.leadDeliveryMethod = null;
  }

  await db.update(leads).set(updateData).where(eq(leads.id, input.leadId));

  const targetRouteLabel =
    input.routeType === 'agent'
      ? `agent:${input.agentId}`
      : input.routeType === 'agency'
        ? `agency:${input.agencyId}`
        : input.routeType === 'brand'
          ? `brand:${input.developerBrandProfileId}`
          : input.routeType;

  const activityDescription =
    input.note?.trim() ||
    `Lead routing corrected from ${currentRouteLabel} to ${targetRouteLabel}`;

  await db.insert(leadActivities).values({
    leadId: input.leadId,
    userId: actorUserId,
    type: 'note',
    description: activityDescription,
  });

  const updatedRows = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
  const updatedLead = updatedRows[0];

  return {
    id: updatedLead.id,
    agentId: updatedLead.agentId,
    agencyId: updatedLead.agencyId,
    developerBrandProfileId: updatedLead.developerBrandProfileId,
    brandLeadStatus: updatedLead.brandLeadStatus,
    leadDeliveryMethod: updatedLead.leadDeliveryMethod,
  };
}

import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';

import { commercialLeadContexts, leadActivities, leads } from '../../drizzle/schema';
import { getDb } from '../db';
import { nowAsDbTimestamp } from '../utils/dbTypeUtils';
import {
  createInitialLeadDeliveryAttempt,
  leadDeliverySummaryForAttempts,
  parseDeliveryAttempts,
  type LeadDeliveryStatus,
} from './leadDeliveryService';
import { resolveLeadOwnership, type ResolvedLeadOwnership } from './publicLeadCaptureService';

export type LeadRoutingCorrectionRoute = 'agent' | 'agency' | 'developer' | 'platform';

export interface LeadRoutingCorrectionInput {
  leadId: number;
  routeType: LeadRoutingCorrectionRoute;
  agentId?: number;
  agencyId?: number;
  cataloguePublisherId?: number;
  note?: string;
}

export interface PlatformLeadActionInput {
  leadId: number;
  action: 'contacted' | 'resolved';
  note?: string;
}

interface CorrectionPlan {
  routeLabel: string;
  agentId: number | null;
  agencyId: number | null;
  cataloguePublisherId: number | null;
  brandLeadStatus: ResolvedLeadOwnership['brandLeadStatus'] | null;
  leadDeliveryMethod: 'crm_export' | 'manual';
  deliveryStatus: LeadDeliveryStatus;
  supplyOrigin: ResolvedLeadOwnership['supplyOrigin'];
  leadCustody: ResolvedLeadOwnership['leadCustody'];
  recipientType: ResolvedLeadOwnership['recipientType'];
  recipientId: number | null;
  reason: string | null;
}

export function requirePlatformOperationsCustody(lead: {
  deliveryStatus: string | null;
  deliveryAttempts: unknown;
  agentId: number | null;
  agencyId: number | null;
}) {
  const attempts = parseDeliveryAttempts(lead.deliveryAttempts);
  const latestAttempt = attempts[attempts.length - 1];
  if (
    lead.deliveryStatus !== 'attention_required' ||
    lead.agentId ||
    lead.agencyId ||
    latestAttempt?.leadCustody !== 'platform_managed' ||
    latestAttempt.recipientType !== 'manual'
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only an explicitly platform-custodied attention lead can be completed here.',
    });
  }
  return { attempts, latestAttempt };
}

function positiveId(value: unknown): number | null {
  const normalized = Number(value || 0);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function routingContextFingerprint(lead: typeof leads.$inferSelect): string {
  return [
    lead.listingId,
    lead.propertyId,
    lead.developmentId,
    lead.unitId,
    lead.agentId,
    lead.agencyId,
    lead.cataloguePublisherId,
    lead.deliveryStatus,
    lead.updatedAt,
  ]
    .map(value => String(value ?? ''))
    .join('|');
}

function currentRouteLabel(lead: typeof leads.$inferSelect): string {
  return (
    [
      lead.cataloguePublisherId ? `publisher:${lead.cataloguePublisherId}` : null,
      lead.agentId ? `agent:${lead.agentId}` : null,
      lead.agencyId ? `agency:${lead.agencyId}` : null,
    ]
      .filter(Boolean)
      .join(', ') || 'platform-operations'
  );
}

/**
 * A correction may restore the recipient already authorized by the public
 * supply graph, or place unresolved historical custody in the monitored
 * platform queue. A super-admin ID is never authority to disclose buyer PII
 * to an otherwise unrelated recipient.
 */
export function buildLeadRoutingCorrectionPlan(
  input: LeadRoutingCorrectionInput,
  canonical: ResolvedLeadOwnership | null,
  canonicalUnavailableReason?: string,
): CorrectionPlan {
  if (input.routeType === 'platform') {
    if (canonical?.leadCustody === 'verified_customer_recipient') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'This lead has an actionable canonical recipient. Restore that recipient or reconcile the supply provenance first.',
      });
    }

    const canonicalPlatform = canonical?.leadCustody === 'platform_managed' ? canonical : null;
    return {
      routeLabel: 'platform-operations',
      agentId: null,
      agencyId: null,
      cataloguePublisherId: canonicalPlatform?.cataloguePublisherId ?? null,
      brandLeadStatus: canonicalPlatform?.brandLeadStatus ?? 'captured',
      leadDeliveryMethod: 'manual',
      deliveryStatus: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
      reason:
        canonicalPlatform?.reason ||
        canonicalUnavailableReason ||
        'Lead held in Property Listify operations custody pending provenance reconciliation.',
    };
  }

  if (!canonical || canonical.leadCustody !== 'verified_customer_recipient') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'The requested customer recipient is not authorized by the lead’s current public supply provenance.',
    });
  }

  if (
    input.routeType === 'agent' &&
    (canonical.recipientType !== 'agent' ||
      positiveId(input.agentId) !== positiveId(canonical.agentId))
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The requested agent is not the canonical recipient for this lead.',
    });
  }

  if (
    input.routeType === 'agency' &&
    (canonical.recipientType !== 'agency' ||
      positiveId(input.agencyId) !== positiveId(canonical.agencyId))
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The requested agency is not the canonical recipient for this lead.',
    });
  }

  if (
    input.routeType === 'developer' &&
    (canonical.recipientType !== 'developer' ||
      positiveId(input.cataloguePublisherId) !== positiveId(canonical.cataloguePublisherId))
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The requested developer is not the canonical recipient for this lead.',
    });
  }

  const routeLabel =
    input.routeType === 'agent'
      ? `agent:${canonical.agentId}`
      : input.routeType === 'agency'
        ? `agency:${canonical.agencyId}`
        : `publisher:${canonical.cataloguePublisherId}`;

  return {
    routeLabel,
    agentId: canonical.agentId ?? null,
    agencyId: canonical.agencyId ?? null,
    cataloguePublisherId: canonical.cataloguePublisherId ?? null,
    brandLeadStatus: canonical.brandLeadStatus ?? null,
    leadDeliveryMethod: canonical.leadDeliveryMethod,
    deliveryStatus: 'delivered',
    supplyOrigin: canonical.supplyOrigin,
    leadCustody: canonical.leadCustody,
    recipientType: canonical.recipientType,
    recipientId: canonical.recipientId,
    reason: null,
  };
}

async function resolveCanonicalTarget(lead: typeof leads.$inferSelect) {
  if (positiveId(lead.listingId)) {
    const database = await getDb();
    if (!database)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const [commercialContext] = await database
      .select({ commercialAvailabilityId: commercialLeadContexts.commercialAvailabilityId })
      .from(commercialLeadContexts)
      .where(eq(commercialLeadContexts.leadId, Number(lead.id)))
      .limit(1);

    return resolveLeadOwnership({
      listingId: Number(lead.listingId),
      ...(commercialContext?.commercialAvailabilityId
        ? { commercialAvailabilityId: Number(commercialContext.commercialAvailabilityId) }
        : {}),
      name: lead.name,
      email: lead.email,
    });
  }

  if (positiveId(lead.propertyId)) {
    return resolveLeadOwnership({
      propertyId: Number(lead.propertyId),
      name: lead.name,
      email: lead.email,
    });
  }

  if (positiveId(lead.developmentId)) {
    return resolveLeadOwnership({
      developmentId: Number(lead.developmentId),
      unitId: lead.unitId || undefined,
      name: lead.name,
      email: lead.email,
    });
  }

  if (positiveId(lead.cataloguePublisherId)) {
    return resolveLeadOwnership({
      cataloguePublisherId: Number(lead.cataloguePublisherId),
      name: lead.name,
      email: lead.email,
    });
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Lead has no public supply context to reconcile.',
  });
}

export async function correctLeadRouting(input: LeadRoutingCorrectionInput, actorUserId: number) {
  const database = await getDb();
  if (!database) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  const [existingLead] = await database
    .select()
    .from(leads)
    .where(eq(leads.id, input.leadId))
    .limit(1);
  if (!existingLead) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
  }

  let canonical: ResolvedLeadOwnership | null = null;
  let canonicalUnavailableReason: string | undefined;
  try {
    canonical = await resolveCanonicalTarget(existingLead);
  } catch (error) {
    canonicalUnavailableReason =
      error instanceof Error ? error.message : 'Canonical supply provenance could not be resolved.';
  }

  const plan = buildLeadRoutingCorrectionPlan(input, canonical, canonicalUnavailableReason);
  const initialFingerprint = routingContextFingerprint(existingLead);
  const fromLabel = currentRouteLabel(existingLead);

  return database.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM leads WHERE id = ${input.leadId} FOR UPDATE`);
    const [lockedLead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

    if (!lockedLead) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
    }
    if (routingContextFingerprint(lockedLead) !== initialFingerprint) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Lead custody changed while the correction was being prepared. Review and retry.',
      });
    }

    let refreshedCanonical: ResolvedLeadOwnership | null = null;
    let refreshedUnavailableReason: string | undefined;
    try {
      refreshedCanonical = await resolveCanonicalTarget(lockedLead);
    } catch (error) {
      refreshedUnavailableReason =
        error instanceof Error
          ? error.message
          : 'Canonical supply provenance could not be resolved.';
    }
    const refreshedPlan = buildLeadRoutingCorrectionPlan(
      input,
      refreshedCanonical,
      refreshedUnavailableReason,
    );
    const authorityFingerprint = (candidate: CorrectionPlan) =>
      [
        candidate.agentId,
        candidate.agencyId,
        candidate.cataloguePublisherId,
        candidate.recipientType,
        candidate.recipientId,
        candidate.leadCustody,
      ]
        .map(value => String(value ?? ''))
        .join('|');
    if (authorityFingerprint(refreshedPlan) !== authorityFingerprint(plan)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Canonical supply custody changed while the correction was being prepared.',
      });
    }

    const attempts = parseDeliveryAttempts(lockedLead.deliveryAttempts);
    const targetKey = [
      'routing-correction',
      plan.recipientType,
      plan.recipientId ?? 'operations',
      plan.agentId ?? 'none',
      plan.agencyId ?? 'none',
      plan.cataloguePublisherId ?? 'none',
    ].join(':');
    const latestAttempt = attempts[attempts.length - 1];
    const isIdempotentReplay =
      latestAttempt?.deliveryKey === targetKey && latestAttempt.status === plan.deliveryStatus;
    const correctionAttempt = isIdempotentReplay
      ? latestAttempt
      : createInitialLeadDeliveryAttempt({
          deliveryKey: targetKey,
          recipientType: plan.recipientType,
          recipientId: plan.recipientId,
          channel: plan.leadDeliveryMethod,
          status: plan.deliveryStatus,
          supplyOrigin: plan.supplyOrigin,
          leadCustody: plan.leadCustody,
          error: plan.reason,
        });
    const nextAttempts = isIdempotentReplay ? attempts : [...attempts, correctionAttempt];

    await tx
      .update(leads)
      .set({
        agentId: plan.agentId,
        agencyId: plan.agencyId,
        cataloguePublisherId: plan.cataloguePublisherId,
        brandLeadStatus: plan.brandLeadStatus,
        leadDeliveryMethod: plan.leadDeliveryMethod,
        ...leadDeliverySummaryForAttempts(plan.deliveryStatus, nextAttempts),
        updatedAt: nowAsDbTimestamp(),
      })
      .where(eq(leads.id, input.leadId));

    if (!isIdempotentReplay) {
      const noteSuffix = input.note?.trim();
      const description = noteSuffix
        ? `Lead custody corrected from ${fromLabel} to ${plan.routeLabel} — ${noteSuffix}`
        : `Lead custody corrected from ${fromLabel} to ${plan.routeLabel}`;
      await tx.insert(leadActivities).values({
        leadId: input.leadId,
        userId: actorUserId,
        type: 'note',
        description,
        metadata: JSON.stringify({
          authority: 'canonical_public_supply',
          deliveryAttemptId: correctionAttempt.id,
          supplyOrigin: plan.supplyOrigin,
          leadCustody: plan.leadCustody,
          recipientType: plan.recipientType,
          recipientId: plan.recipientId,
        }),
      });
    }

    return {
      id: input.leadId,
      agentId: plan.agentId,
      agencyId: plan.agencyId,
      cataloguePublisherId: plan.cataloguePublisherId,
      brandLeadStatus: plan.brandLeadStatus,
      leadDeliveryMethod: plan.leadDeliveryMethod,
      deliveryStatus: plan.deliveryStatus,
      deliveryAttemptId: correctionAttempt.id,
      supplyOrigin: plan.supplyOrigin,
      leadCustody: plan.leadCustody,
      recipientType: plan.recipientType,
      recipientId: plan.recipientId,
      duplicate: isIdempotentReplay,
    };
  });
}

/**
 * Completes the monitored operations obligation for an explicitly
 * platform-custodied lead. This is deliberately not a generic status editor:
 * customer-owned leads and unaudited historical rows cannot use this path.
 */
export async function completePlatformLeadAction(
  input: PlatformLeadActionInput,
  actorUserId: number,
) {
  const database = await getDb();
  if (!database) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  return database.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM leads WHERE id = ${input.leadId} FOR UPDATE`);
    const [lead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
    if (!lead) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
    }

    const { attempts, latestAttempt } = requirePlatformOperationsCustody(lead);

    const deliveryKey = `platform-operations:${input.action}:${latestAttempt.id}`;
    const actionAttempt = createInitialLeadDeliveryAttempt({
      deliveryKey,
      recipientType: 'manual',
      recipientId: null,
      channel: 'manual',
      status: 'delivered',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
    });
    const nextAttempts = [...attempts, actionAttempt];
    const note = input.note?.trim();
    const nextLeadStatus = lead.status === 'new' ? 'contacted' : lead.status;
    const description = note
      ? `Property Listify operations marked lead ${input.action} — ${note}`
      : `Property Listify operations marked lead ${input.action}`;

    await tx
      .update(leads)
      .set({
        // Operations completion proves custody handling, not a property-sale
        // conversion. Preserve an advanced CRM state and only advance `new`.
        status: nextLeadStatus,
        leadDeliveryMethod: 'manual',
        ...leadDeliverySummaryForAttempts('delivered', nextAttempts),
        updatedAt: nowAsDbTimestamp(),
      })
      .where(eq(leads.id, input.leadId));

    await tx.insert(leadActivities).values({
      leadId: input.leadId,
      userId: actorUserId,
      type: input.action === 'contacted' ? 'contact_attempt' : 'status_change',
      description,
      metadata: JSON.stringify({
        authority: 'platform_operations_custody',
        action: input.action,
        deliveryAttemptId: actionAttempt.id,
      }),
    });

    return {
      id: input.leadId,
      action: input.action,
      status: nextLeadStatus,
      deliveryStatus: 'delivered' as const,
      deliveryAttemptId: actionAttempt.id,
    };
  });
}

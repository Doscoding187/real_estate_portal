/**
 * Catalogue Publisher Lead Service
 *
 * Delegates public lead capture to the canonical custody service and exposes
 * Catalogue Publisher-scoped delivery and reporting operations.
 * Implements Refinement #3: Async counter increments
 * Implements Refinement #4: Non-subscribers MUST NOT see leads in dashboard
 *
 * Lead Flow:
 * 1. User submits lead on property/development
 * 2. Lead is captured with cataloguePublisherId
 * 3. Lead is routed via public email (if available)
 * 4. Counters are updated asynchronously
 */

import { db } from '../db';
import { leads } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { cataloguePublisherService } from './cataloguePublisherService';
import { EmailService } from '../_core/emailService';
import { ENV } from '../_core/env';
import { capturePublicLead } from './publicLeadCaptureService';
import {
  appendLeadDeliveryRetryAttempt,
  claimLeadDeliveryAttempt,
  updateLeadDeliveryAttempt,
  type LeadDeliveryStatus,
} from './leadDeliveryService';

// ============================================================================
// Types
// ============================================================================

interface AffordabilityData {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlyDebts?: number;
  availableDeposit?: number;
  maxAffordable?: number;
  calculatedAt?: string;
}

export interface CapturePublisherLeadInput {
  cataloguePublisherId: number;
  developmentId?: number;
  propertyId?: number;
  unitId?: string;
  unitName?: string;
  unitPriceFrom?: number;
  unitBedrooms?: number;
  unitBathrooms?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  leadSource?: string;
  sourceSurface?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  affordabilityData?: AffordabilityData;
  captureRequestId?: string;
  consent?: {
    accepted: true;
    version: string;
    source?: string;
  };
}

export interface LeadRoutingResult {
  leadId: number;
  delivered: boolean;
  deliveryMethod: 'email' | 'crm_export' | 'manual' | 'none';
  deliveryStatus: LeadDeliveryStatus;
  deliveryAttemptId?: string;
  brandLeadStatus: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber' | 'claimed';
  message: string;
}

// ============================================================================
// Lead Capture
// ============================================================================

/**
 * Compatibility adapter for older internal callers.
 *
 * Public brand capture is owned by publicLeadCaptureService. Keeping this
 * adapter avoids a second persistence authority while allowing existing
 * non-router callers to converge without fabricating customer ownership.
 */
async function capturePublisherLead(input: CapturePublisherLeadInput): Promise<LeadRoutingResult> {
  const result = await capturePublicLead({
    ...input,
    leadType: 'inquiry',
    source: input.sourceSurface || input.leadSource || 'catalogue_publisher',
    sourceSurface: input.sourceSurface || 'catalogue_publisher',
    leadSource: input.leadSource || 'catalogue_publisher',
  });

  return {
    leadId: result.leadId,
    delivered: result.delivered === true,
    deliveryMethod: result.deliveryMethod,
    deliveryStatus: result.deliveryStatus,
    deliveryAttemptId: result.deliveryAttemptId,
    brandLeadStatus: result.brandLeadStatus || 'captured',
    message: result.message || 'Your enquiry has been received.',
  };
}

// ============================================================================
// Lead Routing
// ============================================================================

/**
 * Route lead to developer via email
 * Note: Email clearly states lead originated from Property Listify
 */
async function routePublisherLeadToEmail(
  leadId: number,
  publisher: {
    brandName: string;
    publicContactEmail: string | null;
    isContactVerified: number;
  },
  leadData: CapturePublisherLeadInput,
): Promise<boolean> {
  if (!publisher.publicContactEmail) {
    console.warn(`Catalogue Publisher has no delivery email; lead ${leadId} remains undelivered.`);
    return false;
  }

  // Email-only delivery is a commercial side effect. A console log from the
  // generic development fallback is not delivery evidence.
  if (!ENV.resendApiKey) {
    console.warn(`Resend is not configured; lead ${leadId} remains undelivered.`);
    return false;
  }

  try {
    // Send lead notification email
    await EmailService.sendBrandLeadNotification(
      publisher.publicContactEmail,
      publisher.brandName,
      {
        leadId,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || 'Not provided',
        message: leadData.message || 'No message',
        developmentId: leadData.developmentId,
        propertyId: leadData.propertyId,
      },
    );

    // Update lead delivery status
    await db
      .update(leads)
      .set({ brandLeadStatus: 'delivered_unsubscribed' })
      .where(eq(leads.id, leadId));

    return true;
  } catch (error) {
    console.error('Failed to route lead via email:', error);
    return false;
  }
}

async function retryPublisherLeadDelivery(leadId: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead?.cataloguePublisherId || lead.leadDeliveryMethod !== 'email') {
    return { success: false as const, status: lead?.deliveryStatus || 'attention_required' };
  }

  const profile = await cataloguePublisherService.getPublisherById(lead.cataloguePublisherId);
  if (
    !profile?.publicContactEmail ||
    profile.ownerType === 'platform' ||
    !profile.developerOrganisationId
  ) {
    return { success: false as const, status: 'attention_required' as const };
  }

  const attempt = await appendLeadDeliveryRetryAttempt({
    leadId,
    deliveryKey: `publisher:${lead.cataloguePublisherId}`,
  });
  if (!attempt) {
    return { success: false as const, status: lead.deliveryStatus };
  }

  const claimedAttempt = await claimLeadDeliveryAttempt({
    leadId,
    attemptId: attempt.id,
  });
  if (!claimedAttempt) {
    return { success: false as const, status: lead.deliveryStatus };
  }

  const delivered = await routePublisherLeadToEmail(leadId, profile, {
    cataloguePublisherId: lead.cataloguePublisherId,
    developmentId: lead.developmentId || undefined,
    propertyId: lead.propertyId || undefined,
    unitId: lead.unitId || undefined,
    unitName: lead.unitName || undefined,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || undefined,
    message: lead.message || undefined,
  });
  const updated = await updateLeadDeliveryAttempt({
    leadId,
    attemptId: attempt.id,
    status: delivered ? 'delivered' : 'failed',
    error: delivered ? null : 'The configured email provider did not accept the lead notification.',
  });

  return {
    success: delivered,
    status: updated?.status || (delivered ? 'delivered' : 'failed'),
    attemptId: attempt.id,
  };
}

// ============================================================================
// Lead Visibility (Refinement #4)
// ============================================================================

/**
 * Check if a brand can view their leads in dashboard
 * Non-subscribers MUST NOT see leads in dashboard
 */
async function canViewDashboardLeads(cataloguePublisherId: number): Promise<boolean> {
  const profile = await cataloguePublisherService.getPublisherById(cataloguePublisherId);

  if (!profile) {
    return false;
  }

  // Refinement #4: Only subscribers can see leads in dashboard
  return profile.isSubscriber === 1;
}

/**
 * Get leads for a brand (only if subscriber)
 * Returns empty array for non-subscribers
 */
async function getPublisherLeads(
  cataloguePublisherId: number,
  filters: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  // Check subscription status first
  const canView = await canViewDashboardLeads(cataloguePublisherId);

  if (!canView) {
    // Non-subscribers cannot see leads
    return {
      leads: [],
      total: 0,
      message: 'Subscribe to view leads in your dashboard.',
    };
  }

  // Subscribers can view their leads
  const conditions = [eq(leads.cataloguePublisherId, cataloguePublisherId)];

  if (filters.status) {
    conditions.push(eq(leads.status, filters.status as (typeof leads.status.enumValues)[number]));
  }

  const leadResults = await db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  return {
    leads: leadResults,
    total: leadResults.length,
    message: null,
  };
}

// ============================================================================
// Lead Statistics (For Sales Outreach)
// ============================================================================

/**
 * Get sales pitch statistics for a brand
 * Used for conversion messaging
 */
async function getSalesPitchStats(cataloguePublisherId: number) {
  const profile = await cataloguePublisherService.getPublisherById(cataloguePublisherId);

  if (!profile) {
    return null;
  }

  return {
    brandName: profile.brandName,
    totalLeadsReceived: profile.totalLeadsReceived,
    lastLeadDate: profile.lastLeadDate,
    unclaimedLeadCount: profile.unclaimedLeadCount,
    isSubscriber: profile.isSubscriber === 1,
    message: profile.isSubscriber
      ? null
      : `Your developments on Property Listify have received ${profile.totalLeadsReceived} buyer enquiries. Subscribe to view leads in real time, contact buyers directly, and access analytics.`,
  };
}

// ============================================================================
// Export Service
// ============================================================================

export const publisherLeadService = {
  // Lead capture
  capturePublisherLead,

  // Lead routing
  routePublisherLeadToEmail,
  retryPublisherLeadDelivery,

  // Lead visibility (Refinement #4)
  canViewDashboardLeads,
  getPublisherLeads,

  // Sales stats
  getSalesPitchStats,
};

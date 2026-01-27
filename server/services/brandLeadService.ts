/**
 * Brand Lead Service
 *
 * Handles lead capture and routing for developer brand profiles.
 * Implements Refinement #3: Async counter increments
 * Implements Refinement #4: Non-subscribers MUST NOT see leads in dashboard
 *
 * Lead Flow:
 * 1. User submits lead on property/development
 * 2. Lead is captured with developerBrandProfileId
 * 3. Lead is routed via public email (if available)
 * 4. Counters are updated asynchronously
 */

import { db } from '../db';
import { leads, developerBrandProfiles } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { developerBrandProfileService } from './developerBrandProfileService';
import { EmailService } from '../_core/emailService';

// ============================================================================
// Types
// ============================================================================

export interface CaptureBrandLeadInput {
  developerBrandProfileId: number;
  developmentId?: number;
  propertyId?: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  leadSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface LeadRoutingResult {
  leadId: number;
  delivered: boolean;
  deliveryMethod: 'email' | 'crm_export' | 'manual' | 'none';
  brandLeadStatus: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber' | 'claimed';
  message: string;
}

// ============================================================================
// Lead Capture
// ============================================================================

/**
 * Capture a lead and associate with brand profile
 * This is the main entry point for brand lead capture
 */
async function captureBrandLead(input: CaptureBrandLeadInput): Promise<LeadRoutingResult> {
  // Get brand profile to determine routing
  const brandProfile = await developerBrandProfileService.getBrandProfileById(
    input.developerBrandProfileId,
  );

  if (!brandProfile) {
    throw new Error('Brand profile not found');
  }

  // Determine lead status based on brand subscription
  let brandLeadStatus: 'captured' | 'delivered_unsubscribed' | 'delivered_subscriber' | 'claimed';
  let deliveryMethod: 'email' | 'crm_export' | 'manual' | 'none' = 'none';

  if (brandProfile.isSubscriber) {
    // Subscriber gets direct access
    brandLeadStatus = 'delivered_subscriber';
    deliveryMethod = 'crm_export'; // Will appear in their dashboard
  } else if (brandProfile.publicContactEmail && brandProfile.isContactVerified) {
    // Non-subscriber with verified email gets external delivery
    brandLeadStatus = 'delivered_unsubscribed';
    deliveryMethod = 'email';
  } else if (brandProfile.publicContactEmail) {
    // Non-subscriber with unverified email - still attempt delivery
    brandLeadStatus = 'delivered_unsubscribed';
    deliveryMethod = 'email';
  } else {
    // No email available - capture only
    brandLeadStatus = 'captured';
    deliveryMethod = 'none';
  }

  // Insert lead
  const [result] = await db.insert(leads).values({
    developerBrandProfileId: input.developerBrandProfileId,
    developmentId: input.developmentId || null,
    propertyId: input.propertyId || null,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null,
    leadType: 'inquiry',
    status: 'new',
    source: input.leadSource || 'property_listify',
    leadSource: input.leadSource || 'property_listify',
    referrerUrl: input.referrerUrl || null,
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    brandLeadStatus,
    leadDeliveryMethod: deliveryMethod,
    funnelStage: 'interest',
    qualificationStatus: 'pending',
  });

  const leadId = result.insertId;

  // Route lead asynchronously (don't block response)
  // In production, this would be an event/queue
  setImmediate(async () => {
    try {
      if (deliveryMethod === 'email' && brandProfile.publicContactEmail) {
        await routeLeadToEmail(leadId, brandProfile, input);
      }

      // Increment counters asynchronously (Refinement #3)
      await developerBrandProfileService.incrementLeadCountAsync(input.developerBrandProfileId);
    } catch (error) {
      console.error('Error in async lead processing:', error);
    }
  });

  return {
    leadId,
    delivered: deliveryMethod !== 'none',
    deliveryMethod,
    brandLeadStatus,
    message: getLeadCaptureMessage(brandLeadStatus),
  };
}

/**
 * Get user-friendly message for lead capture result
 */
function getLeadCaptureMessage(status: string): string {
  switch (status) {
    case 'delivered_subscriber':
      return 'Your enquiry has been sent to the developer. They will contact you shortly.';
    case 'delivered_unsubscribed':
      return 'Your enquiry has been forwarded to the developer.';
    case 'captured':
    default:
      return 'Your enquiry has been received. We will connect you with the developer.';
  }
}

// ============================================================================
// Lead Routing
// ============================================================================

/**
 * Route lead to developer via email
 * Note: Email clearly states lead originated from Property Listify
 */
async function routeLeadToEmail(
  leadId: number,
  brandProfile: {
    brandName: string;
    publicContactEmail: string | null;
    isContactVerified: number;
  },
  leadData: CaptureBrandLeadInput,
): Promise<boolean> {
  if (!brandProfile.publicContactEmail) {
    console.warn(`No email for brand profile, cannot route lead ${leadId}`);
    return false;
  }

  try {
    // Send lead notification email
    await EmailService.sendBrandLeadNotification(
      brandProfile.publicContactEmail,
      brandProfile.brandName,
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

// ============================================================================
// Lead Visibility (Refinement #4)
// ============================================================================

/**
 * Check if a brand can view their leads in dashboard
 * Non-subscribers MUST NOT see leads in dashboard
 */
async function canViewDashboardLeads(brandProfileId: number): Promise<boolean> {
  const profile = await developerBrandProfileService.getBrandProfileById(brandProfileId);

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
async function getBrandLeads(
  brandProfileId: number,
  filters: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  // Check subscription status first
  const canView = await canViewDashboardLeads(brandProfileId);

  if (!canView) {
    // Non-subscribers cannot see leads
    return {
      leads: [],
      total: 0,
      message: 'Subscribe to view leads in your dashboard.',
    };
  }

  // Subscribers can view their leads
  const conditions = [eq(leads.developerBrandProfileId, brandProfileId)];

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
async function getSalesPitchStats(brandProfileId: number) {
  const profile = await developerBrandProfileService.getBrandProfileById(brandProfileId);

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

export const brandLeadService = {
  // Lead capture
  captureBrandLead,

  // Lead routing
  routeLeadToEmail,

  // Lead visibility (Refinement #4)
  canViewDashboardLeads,
  getBrandLeads,

  // Sales stats
  getSalesPitchStats,
};

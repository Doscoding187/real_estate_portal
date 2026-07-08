import { z } from 'zod';
import {
  router,
  superAdminProcedure,
  agencyAdminProcedure,
  publicProcedure,
  protectedProcedure,
} from './_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  agencies,
  agents,
  leadActivities,
  leads,
  plans,
  agencySubscriptions,
  showings,
  subscriptions,
  properties,
  users,
  agencyBranding,
  invitations,
  listings,
  listingApprovalQueue,
  listingMedia,
} from '../drizzle/schema';
import { eq, like, or, desc, and, inArray, sql, isNull, isNotNull, ne } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  getDb,
  getAgencyDashboardStats,
  getAgencyPerformanceData,
  getAgencyRecentLeads,
  getAgencyRecentListings,
  getLeadConversionStats,
  getAgencyCommissionStats,
  getAgentPerformanceLeaderboard,
  submitListingForReview as submitListingForReviewById,
  archiveListing as archiveListingById,
} from './db';
import { logAudit } from './_core/auditLog';
import { requireUser } from './_core/requireUser';
import { isPaidSubscriptionEntitled, setSubscriptionPlanForOwner } from './services/planAccessService';
import { nowAsDbTimestamp, toDbTimestampRequired } from './utils/dbTypeUtils';

/**
 * Agency Router - Manages real estate agencies
 * Super admins can create and manage all agencies
 * Agency admins can only view/update their own agency
 */

// Validation schemas
const createAgencySchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

const updateAgencySchema = createAgencySchema.partial().extend({
  id: z.number(),
});

const agencyFiltersSchema = z.object({
  search: z.string().optional(),
  province: z.string().optional(),
  subscriptionPlan: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
  isVerified: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'converted',
  'closed',
  'viewing_scheduled',
  'offer_sent',
  'lost',
]);

type LeadStatus = z.infer<typeof leadStatusSchema>;
type AgencyDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type AgencyBillingStatus =
  | 'not_started'
  | 'pending_payment'
  | 'payment_under_review'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired'
  | 'unavailable';

const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'qualified', 'viewing_scheduled', 'lost'],
  contacted: ['qualified', 'viewing_scheduled', 'lost'],
  qualified: ['viewing_scheduled', 'offer_sent', 'converted', 'lost'],
  viewing_scheduled: ['offer_sent', 'converted', 'lost'],
  offer_sent: ['converted', 'closed', 'lost'],
  converted: ['closed'],
  closed: [],
  lost: [],
};

const ACTIVE_BILLING_STATUSES = new Set(['active']);
const PENDING_BILLING_STATUSES = new Set([
  'pending_payment',
  'payment_under_review',
  'incomplete',
  'incomplete_expired',
  'trial',
  'trialing',
]);
const PAST_DUE_BILLING_STATUSES = new Set(['past_due']);
const SUSPENDED_BILLING_STATUSES = new Set(['suspended', 'unpaid']);
const CANCELLED_BILLING_STATUSES = new Set(['cancelled', 'canceled']);
const ACTIVE_MEMBER_ROLES = new Set(['agent', 'agency_admin']);
const ACTIVE_WORK_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_sent',
] as const;
const ACTIVE_WORK_LISTING_STATUSES = ['available', 'published'] as const;
const PENDING_WORK_LISTING_STATUSES = ['pending', 'draft'] as const;
const ACTIVE_CANONICAL_LISTING_STATUSES = ['approved', 'published'] as const;
const PENDING_CANONICAL_LISTING_STATUSES = ['draft', 'pending_review', 'rejected'] as const;

function normalizeBillingStatus(value: unknown): AgencyBillingStatus {
  const status = String(value || '')
    .toLowerCase()
    .trim();
  if (!status) return 'not_started';
  if (ACTIVE_BILLING_STATUSES.has(status)) return 'active';
  if (status === 'grace_period') return 'grace_period';
  if (status === 'payment_under_review') return 'payment_under_review';
  if (status === 'pending_payment') return 'pending_payment';
  if (PAST_DUE_BILLING_STATUSES.has(status)) return 'past_due';
  if (SUSPENDED_BILLING_STATUSES.has(status)) return 'suspended';
  if (CANCELLED_BILLING_STATUSES.has(status)) return 'cancelled';
  if (status === 'expired') return 'expired';
  if (PENDING_BILLING_STATUSES.has(status)) return 'pending_payment';
  return 'unavailable';
}

function isProductionRuntime() {
  return (
    String(process.env.NODE_ENV || '').toLowerCase() === 'production' ||
    String(process.env.APP_ENV || '').toLowerCase() === 'production'
  );
}

function isPricingGovernanceSchemaError(error: unknown): boolean {
  const cause = (error as any)?.cause;
  const code = String((error as any)?.code ?? cause?.code ?? '');
  const message = String(
    [
      (error as any)?.message,
      cause?.message,
      cause?.sqlMessage,
      cause?.sql,
      (error as any)?.query,
    ]
      .filter(Boolean)
      .join(' '),
  ).toLowerCase();
  const touchesPricingGovernance =
    message.includes('subscriptions') ||
    message.includes('agency_subscriptions') ||
    message.includes('plans') ||
    message.includes('owner_type') ||
    message.includes('plan_id');

  return (
    code === 'ER_NO_SUCH_TABLE' ||
    code === 'ER_BAD_FIELD_ERROR' ||
    ((message.includes("doesn't exist") ||
      message.includes('unknown column') ||
      message.includes('failed query:')) &&
      touchesPricingGovernance)
  );
}

function toLeadTemperature(score: unknown): {
  label: 'hot' | 'warm' | 'cool';
  score: number;
  source: 'server-derived';
  thresholds: { hot: number; warm: number };
} {
  const numeric = Number(score || 0);
  const safeScore = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
  return {
    label: safeScore >= 80 ? 'hot' : safeScore >= 55 ? 'warm' : 'cool',
    score: safeScore,
    source: 'server-derived',
    thresholds: { hot: 80, warm: 55 },
  };
}

function deriveLeadReadiness(lead: typeof leads.$inferSelect) {
  const blockers: string[] = [];
  const hasAssignee = Boolean(lead.agentId || lead.assignedTo);
  const hasContact = Boolean(lead.lastContactedAt);
  const qualificationScore = Number(lead.qualificationScore || 0);
  const qualificationStatus = String(lead.qualificationStatus || 'pending');

  if (!hasAssignee) blockers.push('Lead must be assigned before offer work.');
  if (!hasContact) blockers.push('Lead must be contacted before offer work.');
  if (qualificationScore < 60 && qualificationStatus !== 'qualified') {
    blockers.push('Qualification must be recorded before offer work.');
  }

  return {
    canMoveToOffer: blockers.length === 0,
    blockers,
    source: 'server-derived' as const,
  };
}

function assertLeadTransitionAllowed(
  lead: typeof leads.$inferSelect,
  targetStatus: LeadStatus,
  options: { lostReason?: string | null } = {},
) {
  const currentStatus = (lead.status || 'new') as LeadStatus;
  if (currentStatus === targetStatus) return;

  const allowed = LEAD_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot move lead from ${currentStatus} to ${targetStatus}.`,
    });
  }

  if (targetStatus === 'lost' && !String(options.lostReason || '').trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A lost reason is required before closing a lead as lost.',
    });
  }

  if (targetStatus === 'offer_sent') {
    const readiness = deriveLeadReadiness(lead);
    if (!readiness.canMoveToOffer) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: readiness.blockers.join(' '),
      });
    }
  }
}

function mapStatusToFunnelStage(status: LeadStatus, fallback: string | null | undefined) {
  if (status === 'qualified') return 'qualification';
  if (status === 'viewing_scheduled') return 'viewing';
  if (status === 'offer_sent') return 'offer';
  if (status === 'converted' || status === 'closed') return 'sale';
  return fallback || undefined;
}

function getNextLeadAction(lead: typeof leads.$inferSelect) {
  if (!lead.agentId && !lead.assignedTo) return 'Assign owner';
  if (lead.nextFollowUp) {
    const followUpTime = new Date(lead.nextFollowUp).getTime();
    if (Number.isFinite(followUpTime) && followUpTime < Date.now()) return 'Follow-up overdue';
    return 'Follow-up scheduled';
  }
  if (lead.status === 'new') return 'First response';
  if (lead.status === 'contacted') return 'Qualify buyer';
  if (lead.status === 'qualified') return 'Schedule viewing';
  if (lead.status === 'viewing_scheduled') return 'Capture viewing outcome';
  if (lead.status === 'offer_sent') return 'Track offer';
  return 'Review activity';
}

function isLeadOverdue(lead: typeof leads.$inferSelect) {
  if (!lead.nextFollowUp) return false;
  const followUpTime = new Date(lead.nextFollowUp).getTime();
  return Number.isFinite(followUpTime) && followUpTime < Date.now();
}

function decorateLeadForWorkspace(lead: typeof leads.$inferSelect) {
  return {
    ...lead,
    temperature: toLeadTemperature(lead.qualificationScore),
    readiness: deriveLeadReadiness(lead),
    nextAction: getNextLeadAction(lead),
    overdueFollowUp: isLeadOverdue(lead),
  };
}

function requireAgencyId(user: ReturnType<typeof requireUser>) {
  if (!user.agencyId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be part of an agency',
    });
  }

  return user.agencyId;
}

async function requireAgencyLead(
  db: AgencyDb,
  user: ReturnType<typeof requireUser>,
  leadId: number,
) {
  const agencyId = requireAgencyId(user);

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.agencyId, agencyId)))
    .limit(1);

  if (!lead) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Lead not found',
    });
  }

  return lead;
}

async function requireAgencyAgent(
  db: AgencyDb,
  agencyId: number,
  agentId: number,
) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.agencyId, agencyId), eq(agents.status, 'approved')))
    .limit(1);

  if (!agent) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Agent is not an approved member of your agency',
    });
  }

  return agent;
}

function getUserDisplayName(user: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    String(user.name || '').trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    String(user.email || '').trim() ||
    'Team member'
  );
}

function getAgentDisplayName(agent: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    String(agent.displayName || '').trim() ||
    [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim() ||
    String(agent.email || '').trim() ||
    'Agent profile'
  );
}

function getMemberNameParts(user: typeof users.$inferSelect) {
  const display = getUserDisplayName(user);
  const parts = display.split(/\s+/).filter(Boolean);
  const emailStem = String(user.email || 'agency-agent@example.com')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: user.firstName || parts[0] || emailStem[0] || 'Agency',
    lastName: user.lastName || parts.slice(1).join(' ') || emailStem.slice(1).join(' ') || 'Agent',
  };
}

async function ensureAgentProfileForAgencyMember(
  db: AgencyDb,
  targetUser: typeof users.$inferSelect,
  agencyId: number,
  actorUserId: number,
) {
  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, targetUser.id))
    .limit(1);

  if (existingAgent) {
    if (existingAgent.agencyId !== agencyId || existingAgent.status !== 'approved') {
      await db
        .update(agents)
        .set({
          agencyId,
          status: 'approved',
          approvedBy: actorUserId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, existingAgent.id));
    }
    return existingAgent.id;
  }

  const { firstName, lastName } = getMemberNameParts(targetUser);
  const [result] = await db.insert(agents).values({
    userId: targetUser.id,
    agencyId,
    firstName,
    lastName,
    displayName: getUserDisplayName(targetUser),
    email: targetUser.email,
    phone: targetUser.phone,
    role: 'agent',
    isVerified: 0,
    isFeatured: 0,
    status: 'approved',
    approvedBy: actorUserId,
    approvedAt: new Date(),
    profileCompletionScore: 35,
  });

  return Number(result.insertId || 0);
}

function leadOwnerCondition(userId: number, agentId?: number | null) {
  if (agentId) {
    return or(eq(leads.agentId, agentId), eq(leads.assignedTo, userId))!;
  }
  return eq(leads.assignedTo, userId);
}

function propertyOwnerCondition(userId: number, agentId?: number | null) {
  if (agentId) {
    return or(eq(properties.agentId, agentId), eq(properties.ownerId, userId))!;
  }
  return eq(properties.ownerId, userId);
}

function canonicalListingOwnerCondition(userId: number, agentId?: number | null) {
  if (agentId) {
    return or(eq(listings.agentId, agentId), eq(listings.ownerId, userId))!;
  }
  return eq(listings.ownerId, userId);
}

function agencyListingScopeCondition(agencyId: number) {
  return or(
    eq(listings.agencyId, agencyId),
    and(
      isNull(listings.agencyId),
      or(
        eq(users.agencyId, agencyId),
        and(isNull(users.agencyId), eq(agents.agencyId, agencyId)),
      ),
    ),
  )!;
}

const listingInventoryFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z
    .enum([
      'all',
      'draft',
      'ready_to_submit',
      'pending_review',
      'rejected',
      'approved',
      'published',
      'private_pending_edits',
      'archived',
    ])
    .default('all'),
  assignment: z.enum(['all', 'unassigned', 'inactive']).default('all'),
  assignedAgentId: z.number().int().positive().optional(),
  ownerUserId: z.number().int().positive().optional(),
  transactionType: z.enum(['all', 'sell', 'rent', 'auction']).default('all'),
  attention: z
    .enum([
      'all',
      'ready_to_submit',
      'needs_attention',
      'missing_media',
      'rejected',
      'stale',
      'no_enquiries',
      'inactive_agent',
      'publication_mismatch',
    ])
    .default('all'),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

function priceForListing(row: {
  askingPrice?: string | number | null;
  monthlyRent?: string | number | null;
  startingBid?: string | number | null;
}) {
  const value = row.askingPrice || row.monthlyRent || row.startingBid || null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function daysBetweenNow(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function isPublicMirrorStatus(status?: string | null) {
  return ['available', 'published'].includes(String(status || ''));
}

function derivePublicationState(row: any) {
  const status = String(row.status || 'draft');
  const publicPropertyId = row.publicPropertyId ? Number(row.publicPropertyId) : null;
  const publicStatus = row.publicPropertyStatus ? String(row.publicPropertyStatus) : null;

  if (status === 'archived') return 'archived';
  if (publicPropertyId && isPublicMirrorStatus(publicStatus) && status === 'pending_review') {
    return 'public_with_private_pending_edits';
  }
  if (publicPropertyId && isPublicMirrorStatus(publicStatus)) return 'published';
  if (publicPropertyId && publicStatus === 'archived') return 'withdrawn';
  if (status === 'published') return 'publication_mismatch';
  if (status === 'approved') return 'approved_not_published';
  return 'private';
}

function agentBelongsToAgency(row: any, agencyId: number) {
  return Boolean(row.agentId && Number(row.agentAgencyId || 0) === agencyId);
}

function deriveListingHealth(row: any, publicationState: string, agencyId: number) {
  const reasons: string[] = [];
  const status = String(row.status || 'draft');
  const readinessScore = Number(row.readinessScore || 0);
  const mediaCount = Number(row.mediaCount || 0);
  const price = priceForListing(row);
  const updatedAgeDays = daysBetweenNow(row.updatedAt);
  const daysLive = daysBetweenNow(row.publishedAt);
  const publicEnquiries = Number(row.publicEnquiries || 0);

  if (!row.agentId) reasons.push('unassigned_listing');
  if (row.agentId && !agentBelongsToAgency(row, agencyId)) {
    reasons.push('assigned_agent_outside_agency');
  }
  if (row.agentId && agentBelongsToAgency(row, agencyId) && row.agentStatus !== 'approved') {
    reasons.push('assigned_agent_inactive');
  }
  if (status === 'rejected') reasons.push('rejection_correction_required');
  if (readinessScore < 100) reasons.push('required_details_missing');
  if (mediaCount === 0) reasons.push('missing_media');
  if (!row.address || !row.city || !row.province) reasons.push('location_incomplete');
  if (!price) reasons.push('pricing_missing');
  if (['draft', 'rejected'].includes(status) && updatedAgeDays !== null && updatedAgeDays >= 14) {
    reasons.push('stale_draft');
  }
  if (publicationState === 'publication_mismatch') reasons.push('publication_mismatch');
  if (
    publicationState === 'published' &&
    daysLive !== null &&
    daysLive >= 14 &&
    publicEnquiries === 0
  ) {
    reasons.push('published_no_recent_enquiries');
  }

  const score = Math.max(0, Math.min(100, readinessScore));
  return {
    score,
    reasons: Array.from(new Set(reasons)),
    needsAttention: reasons.length > 0,
  };
}

function deriveListingNextAction(row: any, publicationState: string, health: { reasons: string[] }) {
  const status = String(row.status || 'draft');
  if (health.reasons.includes('assigned_agent_outside_agency')) return 'Reassign outside-agency agent';
  if (health.reasons.includes('assigned_agent_inactive')) return 'Reassign inactive agent';
  if (!row.agentId) return 'Assign listing';
  if (status === 'rejected') return 'Correct and resubmit';
  if (status === 'draft' && Number(row.readinessScore || 0) >= 75) return 'Submit for review';
  if (status === 'draft') return 'Complete draft';
  if (status === 'pending_review') {
    return publicationState === 'public_with_private_pending_edits'
      ? 'Await edit review'
      : 'Await admin review';
  }
  if (publicationState === 'publication_mismatch') return 'Resolve publication mirror';
  if (publicationState === 'published') return 'Monitor performance';
  if (status === 'archived') return 'Archived';
  return 'Review listing';
}

function mapAgencyListingRow(row: any, agencyId: number) {
  const publicationState = derivePublicationState(row);
  const health = deriveListingHealth(row, publicationState, agencyId);
  const price = priceForListing(row);
  const publicPropertyId = row.publicPropertyId ? Number(row.publicPropertyId) : null;
  const assignmentInAgency = agentBelongsToAgency(row, agencyId);
  const hasPropertyPerformance = Boolean(publicPropertyId);
  const hasListingAnalytics = Boolean(row.analyticsUpdatedAt);
  const listingLeadCount = Number(row.listingLeadCount || 0);
  const performanceSource = hasPropertyPerformance
    ? 'properties_mirror'
    : hasListingAnalytics
      ? 'listing_analytics'
      : listingLeadCount > 0
        ? 'listing_leads'
        : 'unavailable';
  const publicViews =
    row.publicViews === null || row.publicViews === undefined ? null : Number(row.publicViews);
  const publicEnquiries =
    row.publicEnquiries === null || row.publicEnquiries === undefined
      ? listingLeadCount > 0
        ? listingLeadCount
        : null
      : Number(row.publicEnquiries);
  const daysLive = daysBetweenNow(row.publishedAt);
  const publicUrl =
    publicPropertyId && ['published', 'public_with_private_pending_edits'].includes(publicationState)
      ? `/property/${publicPropertyId}`
      : null;

  return {
    id: Number(row.id),
    title: row.title,
    address: row.address,
    city: row.city,
    suburb: row.suburb,
    province: row.province,
    transactionType: row.action,
    propertyType: row.propertyType,
    price,
    authoringStatus: row.status,
    approvalStatus: row.approvalStatus,
    publicationState,
    publicPropertyId,
    publicUrl,
    assignedAgent: row.agentId && assignmentInAgency
      ? {
          id: Number(row.agentId),
          name: getAgentDisplayName({
            displayName: row.agentDisplayName,
            firstName: row.agentFirstName,
            lastName: row.agentLastName,
            email: row.agentEmail,
          }),
          email: row.agentEmail,
          status: row.agentStatus,
        }
      : null,
    assignment: {
      agentId: row.agentId ? Number(row.agentId) : null,
      inAgency: assignmentInAgency,
      label: row.agentId ? (assignmentInAgency ? 'Assigned' : 'Outside agency assignment') : 'Unassigned',
      status: row.agentStatus || null,
    },
    creator: {
      id: Number(row.ownerId),
      name: getUserDisplayName({
        name: row.ownerName,
        firstName: row.ownerFirstName,
        lastName: row.ownerLastName,
        email: row.ownerEmail,
      }),
      email: row.ownerEmail,
    },
    agencyId: row.agencyId ? Number(row.agencyId) : null,
    readinessScore: Number(row.readinessScore || 0),
    qualityScore: Number(row.qualityScore || 0),
    health,
    media: {
      total: Number(row.mediaCount || 0),
      images: Number(row.imageCount || 0),
    },
    performance: {
      views: publicViews,
      enquiries: publicEnquiries,
      daysLive,
      conversionRate:
        publicViews !== null && publicViews > 0 && publicEnquiries !== null
          ? Number(((publicEnquiries / publicViews) * 100).toFixed(1))
          : null,
      source: performanceSource,
      available: performanceSource !== 'unavailable',
    },
    rejection: {
      reason: row.rejectionReason || row.queueRejectionReason || null,
      reasons: parseStringArray(row.rejectionReasons),
      note: row.rejectionNote || row.queueReviewNotes || null,
      reviewedAt: row.reviewedAt || row.queueReviewedAt || null,
    },
    review: {
      submittedAt: row.queueSubmittedAt || null,
      reviewedAt: row.queueReviewedAt || row.reviewedAt || null,
      status: row.queueStatus || row.approvalStatus || null,
    },
    timestamps: {
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      archivedAt: row.archivedAt,
    },
    nextAction: deriveListingNextAction(row, publicationState, health),
  };
}

export const __agencyListingInventoryTestHooks = {
  derivePublicationState,
  mapAgencyListingRow,
};

function agencyListingSelectFields() {
  return {
    id: listings.id,
    title: listings.title,
    address: listings.address,
    city: listings.city,
    suburb: listings.suburb,
    province: listings.province,
    action: listings.action,
    propertyType: listings.propertyType,
    askingPrice: listings.askingPrice,
    monthlyRent: listings.monthlyRent,
    startingBid: listings.startingBid,
    status: listings.status,
    approvalStatus: listings.approvalStatus,
    agencyId: listings.agencyId,
    ownerId: listings.ownerId,
    agentId: listings.agentId,
    readinessScore: listings.readinessScore,
    qualityScore: listings.qualityScore,
    rejectionReason: listings.rejectionReason,
    rejectionReasons: listings.rejectionReasons,
    rejectionNote: listings.rejectionNote,
    reviewedAt: listings.reviewedAt,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    publishedAt: listings.publishedAt,
    archivedAt: listings.archivedAt,
    agentFirstName: agents.firstName,
    agentLastName: agents.lastName,
    agentDisplayName: agents.displayName,
    agentEmail: agents.email,
    agentStatus: agents.status,
    agentAgencyId: agents.agencyId,
    ownerName: users.name,
    ownerFirstName: users.firstName,
    ownerLastName: users.lastName,
    ownerEmail: users.email,
    ownerAgencyId: users.agencyId,
    mediaCount: sql<number>`(
      SELECT COUNT(*)
      FROM listing_media lm
      WHERE lm.listingId = ${listings.id}
    )`,
    imageCount: sql<number>`(
      SELECT COUNT(*)
      FROM listing_media lm
      WHERE lm.listingId = ${listings.id}
        AND lm.mediaType = 'image'
    )`,
    publicPropertyId: sql<number | null>`(
      SELECT p.id
      FROM properties p
      WHERE p.sourceListingId = ${listings.id}
      ORDER BY p.updatedAt DESC
      LIMIT 1
    )`,
    publicPropertyStatus: sql<string | null>`(
      SELECT p.status
      FROM properties p
      WHERE p.sourceListingId = ${listings.id}
      ORDER BY p.updatedAt DESC
      LIMIT 1
    )`,
    publicViews: sql<number | null>`COALESCE(
      (
        SELECT p.views
        FROM properties p
        WHERE p.sourceListingId = ${listings.id}
        ORDER BY p.updatedAt DESC
        LIMIT 1
      ),
      (
        SELECT la.totalViews
        FROM listing_analytics la
        WHERE la.listingId = ${listings.id}
        ORDER BY la.lastUpdated DESC
        LIMIT 1
      )
    )`,
    publicEnquiries: sql<number | null>`COALESCE(
      (
        SELECT p.enquiries
        FROM properties p
        WHERE p.sourceListingId = ${listings.id}
        ORDER BY p.updatedAt DESC
        LIMIT 1
      ),
      (
        SELECT la.totalLeads
        FROM listing_analytics la
        WHERE la.listingId = ${listings.id}
        ORDER BY la.lastUpdated DESC
        LIMIT 1
      )
    )`,
    listingLeadCount: sql<number>`(
      SELECT COUNT(*)
      FROM listing_leads ll
      WHERE ll.listingId = ${listings.id}
    )`,
    analyticsUpdatedAt: sql<string | null>`(
      SELECT la.lastUpdated
      FROM listing_analytics la
      WHERE la.listingId = ${listings.id}
      ORDER BY la.lastUpdated DESC
      LIMIT 1
    )`,
    queueSubmittedAt: sql<string | null>`(
      SELECT q.submittedAt
      FROM listing_approval_queue q
      WHERE q.listingId = ${listings.id}
      ORDER BY q.submittedAt DESC
      LIMIT 1
    )`,
    queueReviewedAt: sql<string | null>`(
      SELECT q.reviewedAt
      FROM listing_approval_queue q
      WHERE q.listingId = ${listings.id}
      ORDER BY q.submittedAt DESC
      LIMIT 1
    )`,
    queueStatus: sql<string | null>`(
      SELECT q.status
      FROM listing_approval_queue q
      WHERE q.listingId = ${listings.id}
      ORDER BY q.submittedAt DESC
      LIMIT 1
    )`,
    queueReviewNotes: sql<string | null>`(
      SELECT q.reviewNotes
      FROM listing_approval_queue q
      WHERE q.listingId = ${listings.id}
      ORDER BY q.submittedAt DESC
      LIMIT 1
    )`,
    queueRejectionReason: sql<string | null>`(
      SELECT q.rejectionReason
      FROM listing_approval_queue q
      WHERE q.listingId = ${listings.id}
      ORDER BY q.submittedAt DESC
      LIMIT 1
    )`,
  };
}

function applyAgencyListingFilterConditions(
  conditions: SQL[],
  filters: z.infer<typeof listingInventoryFiltersSchema>,
) {
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        like(listings.title, pattern),
        like(listings.address, pattern),
        like(listings.city, pattern),
        like(listings.province, pattern),
        like(listings.slug, pattern),
      )!,
    );
  }

  if (filters.status !== 'all') {
    if (filters.status === 'ready_to_submit') {
      conditions.push(inArray(listings.status, ['draft', 'rejected'] as any));
      conditions.push(sql`${listings.readinessScore} >= 75`);
    } else if (filters.status === 'private_pending_edits') {
      conditions.push(eq(listings.status, 'pending_review' as any));
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM properties p
          WHERE p.sourceListingId = ${listings.id}
            AND p.status IN ('available', 'published')
        )`,
      );
    } else {
      conditions.push(eq(listings.status, filters.status as any));
    }
  }

  if (filters.assignment === 'unassigned') {
    conditions.push(isNull(listings.agentId));
  }

  if (filters.assignment === 'inactive') {
    conditions.push(isNotNull(listings.agentId));
    conditions.push(sql`(${agents.status} IS NULL OR ${agents.status} <> 'approved')`);
  }

  if (filters.assignedAgentId) {
    conditions.push(eq(listings.agentId, filters.assignedAgentId));
  }

  if (filters.ownerUserId) {
    conditions.push(or(eq(listings.ownerId, filters.ownerUserId), eq(agents.userId, filters.ownerUserId))!);
  }

  if (filters.transactionType !== 'all') {
    conditions.push(eq(listings.action, filters.transactionType as any));
  }

  switch (filters.attention) {
    case 'ready_to_submit':
      conditions.push(inArray(listings.status, ['draft', 'rejected'] as any));
      conditions.push(sql`${listings.readinessScore} >= 75`);
      break;
    case 'needs_attention':
      conditions.push(sql`(${listings.readinessScore} < 75 OR ${listings.status} = 'rejected')`);
      break;
    case 'missing_media':
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1
          FROM listing_media lm
          WHERE lm.listingId = ${listings.id}
        )`,
      );
      break;
    case 'rejected':
      conditions.push(eq(listings.status, 'rejected' as any));
      break;
    case 'stale':
      conditions.push(sql`TIMESTAMPDIFF(DAY, ${listings.updatedAt}, NOW()) >= 21`);
      break;
    case 'no_enquiries':
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM properties p
          WHERE p.sourceListingId = ${listings.id}
            AND p.status IN ('available', 'published')
            AND COALESCE(p.enquiries, 0) = 0
        )`,
      );
      break;
    case 'inactive_agent':
      conditions.push(isNotNull(listings.agentId));
      conditions.push(sql`(${agents.status} IS NULL OR ${agents.status} <> 'approved')`);
      break;
    case 'publication_mismatch':
      conditions.push(eq(listings.status, 'published' as any));
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1
          FROM properties p
          WHERE p.sourceListingId = ${listings.id}
            AND p.status IN ('available', 'published')
        )`,
      );
      break;
    case 'all':
    default:
      break;
  }
}

async function requireAgencyListing(
  db: AgencyDb,
  agencyId: number,
  listingId: number,
) {
  const [row] = await db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
      ownerId: listings.ownerId,
      agentId: listings.agentId,
      agencyId: listings.agencyId,
      readinessScore: listings.readinessScore,
    })
    .from(listings)
    .leftJoin(agents, eq(listings.agentId, agents.id))
    .leftJoin(users, eq(listings.ownerId, users.id))
    .where(and(eq(listings.id, listingId), agencyListingScopeCondition(agencyId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Listing not found',
    });
  }

  return row;
}

async function getAgencyListingSummary(db: AgencyDb, agencyId: number) {
  const scopedRows = await db
    .select({
      authoringStatus: listings.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(listings)
    .leftJoin(agents, eq(listings.agentId, agents.id))
    .leftJoin(users, eq(listings.ownerId, users.id))
    .where(agencyListingScopeCondition(agencyId))
    .groupBy(listings.status);

  const [
    unassigned,
    inactiveAgent,
    readyToSubmit,
    missingMedia,
    published,
    privatePendingEdits,
    publicationMismatch,
  ] = await Promise.all([
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(and(agencyListingScopeCondition(agencyId), isNull(listings.agentId))),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            isNotNull(listings.agentId),
            sql`(${agents.status} IS NULL OR ${agents.status} <> 'approved')`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            inArray(listings.status, ['draft', 'rejected'] as any),
            sql`${listings.readinessScore} >= 75`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            sql`NOT EXISTS (
              SELECT 1
              FROM listing_media lm
              WHERE lm.listingId = ${listings.id}
            )`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            sql`EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = ${listings.id}
                AND p.status IN ('available', 'published')
            )`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            eq(listings.status, 'pending_review' as any),
            sql`EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = ${listings.id}
                AND p.status IN ('available', 'published')
            )`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            eq(listings.status, 'published' as any),
            sql`NOT EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = ${listings.id}
                AND p.status IN ('available', 'published')
            )`,
          ),
        ),
    ),
  ]);

  const byAuthoringStatus: Record<string, number> = {};
  for (const row of scopedRows) {
    byAuthoringStatus[String(row.authoringStatus || 'unknown')] = Number(row.count || 0);
  }

  return {
    byAuthoringStatus,
    unassigned,
    inactiveAgent,
    readyToSubmit,
    missingMedia,
    published,
    privatePendingEdits,
    publicationMismatch,
    needsAttention:
      unassigned + inactiveAgent + readyToSubmit + missingMedia + privatePendingEdits + publicationMismatch,
  };
}

async function countRows(query: PromiseLike<Array<{ count: unknown }>>) {
  const [row] = await query;
  return Number(row?.count || 0);
}

async function getAgencyMemberWorkload(input: {
  db: AgencyDb;
  agencyId: number;
  userId: number;
  agentId?: number | null;
}) {
  const { db, agencyId, userId, agentId } = input;
  const leadOwner = leadOwnerCondition(userId, agentId);
  const listingOwner = propertyOwnerCondition(userId, agentId);
  const canonicalListingOwner = canonicalListingOwnerCondition(userId, agentId);

  const [
    assignedActiveLeads,
    overdueFollowUps,
    activeLegacyProperties,
    pendingLegacyProperties,
    activeCanonicalListings,
    pendingCanonicalListings,
    upcomingViewings,
  ] = await Promise.all([
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.agencyId, agencyId),
            leadOwner,
            inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.agencyId, agencyId),
            leadOwner,
            inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
            sql`${leads.nextFollowUp} IS NOT NULL AND ${leads.nextFollowUp} < NOW()`,
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(properties)
        .where(
          and(
            listingOwner,
            isNull(properties.sourceListingId),
            inArray(properties.status, ACTIVE_WORK_LISTING_STATUSES as any),
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(properties)
        .where(
          and(
            listingOwner,
            isNull(properties.sourceListingId),
            inArray(properties.status, PENDING_WORK_LISTING_STATUSES as any),
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            canonicalListingOwner,
            inArray(listings.status, ACTIVE_CANONICAL_LISTING_STATUSES as any),
          ),
        ),
    ),
    countRows(
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(
          and(
            agencyListingScopeCondition(agencyId),
            canonicalListingOwner,
            inArray(listings.status, PENDING_CANONICAL_LISTING_STATUSES as any),
          ),
        ),
    ),
    agentId
      ? countRows(
          db
            .select({ count: sql<number>`COUNT(*)` })
            .from(showings)
            .where(
              and(
                eq(showings.agentId, agentId),
                inArray(showings.status, ['requested', 'confirmed'] as any),
                sql`${showings.scheduledAt} >= NOW()`,
              ),
            ),
        )
      : Promise.resolve(0),
  ]);

  const activeListings = activeLegacyProperties + activeCanonicalListings;
  const pendingListingWork = pendingLegacyProperties + pendingCanonicalListings;

  return {
    assignedActiveLeads,
    overdueFollowUps,
    activeListings,
    pendingListingWork,
    upcomingViewings,
    hasActiveWork:
      assignedActiveLeads + overdueFollowUps + activeListings + pendingListingWork + upcomingViewings >
      0,
  };
}

async function countAgencyAdmins(db: AgencyDb, agencyId: number) {
  return countRows(
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.agencyId, agencyId), eq(users.role, 'agency_admin'))),
  );
}

function membershipStatusForRow(input: {
  userRole: string | null;
  agentStatus?: string | null;
}) {
  if (input.userRole === 'visitor' || input.agentStatus === 'suspended') return 'suspended';
  if (ACTIVE_MEMBER_ROLES.has(String(input.userRole || ''))) return 'active';
  return 'inactive';
}

async function getAgencyTeamMembers(db: AgencyDb, agencyId: number) {
  const rows = await db
    .select({
      user: users,
      agent: agents,
    })
    .from(users)
    .leftJoin(agents, eq(users.id, agents.userId))
    .where(eq(users.agencyId, agencyId))
    .orderBy(desc(users.createdAt));

  return Promise.all(
    rows.map(async ({ user, agent }) => {
      const workload = await getAgencyMemberWorkload({
        db,
        agencyId,
        userId: user.id,
        agentId: agent?.id || null,
      });
      const membershipStatus = membershipStatusForRow({
        userRole: user.role,
        agentStatus: agent?.status,
      });

      return {
        id: user.id,
        userId: user.id,
        name: getUserDisplayName(user),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isSubaccount: user.isSubaccount,
        membership: {
          status: membershipStatus,
          role: user.role,
          agencyId,
          source: 'users.agencyId/role',
          team: null,
          branch: null,
        },
        permissions: {
          canReceiveLeadAssignments: membershipStatus === 'active' && Boolean(agent?.id),
          canManageAgency: user.role === 'agency_admin' && membershipStatus === 'active',
          canAccessWorkspace: membershipStatus === 'active',
        },
        workload,
        agentProfile: agent
          ? {
              ...agent,
              name: getAgentDisplayName(agent),
            }
          : null,
      };
    }),
  );
}

async function requireAgencyMemberUser(
  db: AgencyDb,
  agencyId: number,
  userId: number,
) {
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.agencyId, agencyId)))
    .limit(1);

  if (!targetUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found in your agency',
    });
  }

  return targetUser;
}

async function getApprovedAgentProfileForUser(db: AgencyDb, agencyId: number, userId: number) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.agencyId, agencyId), eq(agents.status, 'approved')))
    .limit(1);

  return agent || null;
}

async function getAgencyAccessStateForUser(
  db: AgencyDb,
  input: {
    user: ReturnType<typeof requireUser>;
    agency: typeof agencies.$inferSelect;
    profileConfigured: boolean;
    brandingConfigured: boolean;
  },
) {
  const agencyId = Number(input.user.agencyId || input.agency.id);
  const base = {
    onboardingComplete: Boolean(input.profileConfigured && input.brandingConfigured),
    billingStatus: 'not_started' as AgencyBillingStatus,
    planKey: null as string | null,
    planAccessSource: 'none',
    degraded: false,
    fallbackReason: null as string | null,
    actionableReason: 'Subscription has not been started.',
    workspaceAccess: {
      listings: false,
      publishing: false,
      teamManagement: input.profileConfigured,
      reporting: false,
    },
  };

  try {
    const [canonical] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
      .limit(1);

    if (canonical?.subscription) {
      base.billingStatus = normalizeBillingStatus(canonical.subscription.status);
      base.planKey = canonical.plan?.name || null;
      base.planAccessSource = 'subscriptions';
      base.actionableReason =
        base.billingStatus === 'active'
          ? 'Access is active from the canonical subscription record.'
          : `Subscription status is ${base.billingStatus}.`;
    } else {
      const [stripeStyle] = await db
        .select({
          subscription: agencySubscriptions,
          plan: plans,
        })
        .from(agencySubscriptions)
        .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
        .where(eq(agencySubscriptions.agencyId, agencyId))
        .limit(1);

      if (stripeStyle?.subscription) {
        base.billingStatus = normalizeBillingStatus(stripeStyle.subscription.status);
        base.planKey = stripeStyle.plan?.name || null;
        base.planAccessSource = 'agency_subscriptions';
        base.actionableReason =
          base.billingStatus === 'active'
            ? 'Access is active from the agency subscription record.'
            : `Agency subscription status is ${base.billingStatus}.`;
      } else {
        base.billingStatus = 'not_started';
        base.planKey = null;
        base.planAccessSource = 'none';
        base.degraded = false;
        base.fallbackReason = 'No canonical subscription row found; legacy agency billing fields ignored.';
        base.actionableReason = 'No canonical subscription exists for this agency.';
      }
    }
  } catch (error) {
    if (!isPricingGovernanceSchemaError(error)) {
      throw error;
    }

    base.billingStatus = 'unavailable';
    base.planAccessSource = 'schema_unavailable';
    base.degraded = true;
    base.fallbackReason = 'Pricing governance schema is missing or outdated.';
    base.actionableReason = 'Run local pricing-governance migrations before trusting billing gates.';

    if (!isProductionRuntime()) {
      console.warn('[AgencyAccess] Pricing governance unavailable; returning blocked dev fallback.', {
        agencyId,
        code: (error as any)?.code,
        message: (error as any)?.message,
      });
    }
  }

  const billingActive = isPaidSubscriptionEntitled(base.billingStatus as any);
  base.workspaceAccess = {
    listings: input.profileConfigured,
    publishing: billingActive && input.profileConfigured && input.brandingConfigured,
    teamManagement: input.profileConfigured,
    reporting: billingActive && input.profileConfigured,
  };

  if (!input.profileConfigured) {
    base.actionableReason = 'Agency profile must be completed first.';
  } else if (!input.brandingConfigured) {
    base.actionableReason = 'Agency branding must be configured before publishing.';
  } else if (!billingActive && base.billingStatus !== 'unavailable') {
    base.actionableReason = `Billing status is ${base.billingStatus}; activate a subscription to unlock publishing.`;
  }

  return base;
}

export const agencyRouter = router({
  getOnboardingStatus: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const user = requireUser(ctx);
    const emptyState = {
      hasAgency: false,
      profileConfigured: false,
      brandingConfigured: false,
      billingActivated: false,
      teamReady: false,
      onboardingStep: 0,
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: '/agency/setup',
      teamMembersCount: 0,
      invitationsCount: 0,
      agency: null as null | {
        id: number;
        name: string;
        slug: string;
        subscriptionStatus: string;
        subscriptionPlan: string;
        city: string | null;
        province: string | null;
      },
    };

    if (!user.agencyId) {
      return emptyState;
    }

    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, user.agencyId))
      .limit(1);

    if (!agency) {
      return emptyState;
    }

    const [branding] = await db
      .select({
        companyName: agencyBranding.companyName,
        primaryColor: agencyBranding.primaryColor,
        secondaryColor: agencyBranding.secondaryColor,
      })
      .from(agencyBranding)
      .where(eq(agencyBranding.agencyId, user.agencyId))
      .limit(1);

    const teamMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.agencyId, user.agencyId), eq(users.isSubaccount, 1)));

    const pendingInvitations = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.agencyId, user.agencyId), eq(invitations.status, 'pending')));

    const profileConfigured = Boolean(
      agency.name && agency.email && agency.city && agency.province,
    );
    const brandingConfigured = Boolean(
      branding?.companyName && branding?.primaryColor && branding?.secondaryColor,
    );
    const teamReady = teamMembers.length > 0 || pendingInvitations.length > 0;
    const accessState = await getAgencyAccessStateForUser(db, {
      user,
      agency,
      profileConfigured,
      brandingConfigured,
    });
    const accessBillingActivated = isPaidSubscriptionEntitled(accessState.billingStatus as any);

    let onboardingStep = 0;
    if (profileConfigured) onboardingStep = 1;
    if (brandingConfigured) onboardingStep = 2;
    if (accessBillingActivated) onboardingStep = 3;
    if (teamReady) onboardingStep = 4;

    const dashboardUnlocked = profileConfigured;
    const fullFeaturesUnlocked = profileConfigured && brandingConfigured && accessBillingActivated;
    const recommendedNextStep = !profileConfigured
      ? '/agency/setup'
      : !brandingConfigured
        ? '/agency/setup'
        : !accessBillingActivated
          ? '/agency/billing/subscription'
          : !teamReady
            ? '/agency/team/invitations'
            : '/agency/overview';

    if (
      Number(user.onboardingStep || 0) !== onboardingStep ||
      Number(user.onboardingComplete || 0) !== (fullFeaturesUnlocked ? 1 : 0)
    ) {
      await db
        .update(users)
        .set({
          onboardingStep,
          onboardingComplete: fullFeaturesUnlocked ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return {
      hasAgency: true,
      profileConfigured,
      brandingConfigured,
      billingActivated: accessBillingActivated,
      teamReady,
      onboardingStep,
      dashboardUnlocked,
      fullFeaturesUnlocked,
      recommendedNextStep,
      teamMembersCount: teamMembers.length,
      invitationsCount: pendingInvitations.length,
      accessState,
      agency: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        subscriptionStatus: agency.subscriptionStatus,
        subscriptionPlan: agency.subscriptionPlan,
        city: agency.city,
        province: agency.province,
      },
    };
  }),

  getAccessState: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    const user = requireUser(ctx);
    if (!user.agencyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be part of an agency',
      });
    }

    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, user.agencyId))
      .limit(1);

    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
    }

    const [branding] = await db
      .select({
        companyName: agencyBranding.companyName,
        primaryColor: agencyBranding.primaryColor,
        secondaryColor: agencyBranding.secondaryColor,
      })
      .from(agencyBranding)
      .where(eq(agencyBranding.agencyId, user.agencyId))
      .limit(1);

    const profileConfigured = Boolean(
      agency.name && agency.email && agency.city && agency.province,
    );
    const brandingConfigured = Boolean(
      branding?.companyName && branding?.primaryColor && branding?.secondaryColor,
    );

    return getAgencyAccessStateForUser(db, {
      user,
      agency,
      profileConfigured,
      brandingConfigured,
    });
  }),

  getBillingState: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    const user = requireUser(ctx);
    if (!user.agencyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be part of an agency',
      });
    }

    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, user.agencyId))
      .limit(1);

    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
    }

    const [branding] = await db
      .select({
        companyName: agencyBranding.companyName,
        primaryColor: agencyBranding.primaryColor,
        secondaryColor: agencyBranding.secondaryColor,
      })
      .from(agencyBranding)
      .where(eq(agencyBranding.agencyId, user.agencyId))
      .limit(1);

    const profileConfigured = Boolean(
      agency.name && agency.email && agency.city && agency.province,
    );
    const brandingConfigured = Boolean(
      branding?.companyName && branding?.primaryColor && branding?.secondaryColor,
    );
    const accessState = await getAgencyAccessStateForUser(db, {
      user,
      agency,
      profileConfigured,
      brandingConfigured,
    });

    const [canonicalSubscription] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, user.agencyId)))
      .limit(1);

    const [stripeSubscription] = await db
      .select({
        subscription: agencySubscriptions,
        plan: plans,
      })
      .from(agencySubscriptions)
      .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
      .where(eq(agencySubscriptions.agencyId, user.agencyId))
      .limit(1);

    const availablePlans = await db
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, 1), or(eq(plans.segment, 'agency'), eq(plans.segment, 'enterprise'))!))
      .orderBy(plans.sortOrder);

    return {
      agency: {
        id: agency.id,
        name: agency.name,
      },
      accessState,
      canonicalSubscription: canonicalSubscription || null,
      stripeSubscription: stripeSubscription || null,
      plans: availablePlans,
    };
  }),

  /**
   * Create agency during onboarding (authenticated users only)
   */
  createOnboarding: protectedProcedure
    .input(
      z.object({
        basicInfo: z.object({
          name: z.string().min(2, 'Agency name must be at least 2 characters'),
          description: z.string().min(10, 'Description must be at least 10 characters'),
          email: z.string().email('Invalid email address'),
          phone: z.string().optional(),
          website: z.string().url().optional().or(z.literal('')),
          address: z.string().min(5, 'Address must be at least 5 characters'),
          city: z.string().min(2, 'City is required'),
          province: z.string().min(2, 'Province is required'),
        }),
        branding: z.object({
          logoUrl: z.string().optional(),
          primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
          secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
          tagline: z.string().max(100, 'Tagline must be less than 100 characters').optional(),
          companyName: z.string().min(2, 'Company name is required'),
        }),
        teamEmails: z.array(z.string().email()).optional().default([]),
        planId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      const user = requireUser(ctx);

      // 1. Validate plan exists and is active
      const [plan] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);

      if (!plan || !plan.isActive) {
        throw new Error('Selected plan is not available');
      }

      // 2. Check if agency name or email already exists
      const existing = await db
        .select()
        .from(agencies)
        .where(
          or(eq(agencies.name, input.basicInfo.name), eq(agencies.email, input.basicInfo.email)),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Agency name or email already registered');
      }

      // 3. Generate slug from name
      const slug = input.basicInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check slug uniqueness
      const [slugExists] = await db.select().from(agencies).where(eq(agencies.slug, slug)).limit(1);
      const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

      // 4. Create agency with pending_payment status
      const [agencyResult] = await db.insert(agencies).values({
        name: input.basicInfo.name,
        slug: finalSlug,
        description: input.basicInfo.description,
        email: input.basicInfo.email,
        phone: input.basicInfo.phone || null,
        website: input.basicInfo.website || null,
        address: input.basicInfo.address,
        city: input.basicInfo.city,
        province: input.basicInfo.province,
        logo: input.branding.logoUrl || null,
        subscriptionPlan: 'free',
        subscriptionStatus: 'pending_payment', // Will be updated to 'active' after payment
        isVerified: 0,
      });

      const agencyId = Number(agencyResult.insertId);

      // 5. Create agency branding record
      await db.insert(agencyBranding).values({
        agencyId,
        primaryColor: input.branding.primaryColor,
        secondaryColor: input.branding.secondaryColor,
        companyName: input.branding.companyName,
        tagline: input.branding.tagline || null,
        logoUrl: input.branding.logoUrl || null,
        isEnabled: 1,
      });

      // 6. Update user to be agency_admin of this agency
      await db
        .update(users)
        .set({
          agencyId,
          role: 'agency_admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // 7. Persist canonical agency plan access. Trial state is not treated as billing-active.
      await setSubscriptionPlanForOwner({
        ownerType: 'agency',
        ownerId: agencyId,
        planId: input.planId,
        status: 'trial',
        metadata: {
          source: 'agency_onboarding',
          legacy_agency_subscription_status: 'pending_payment',
        },
        actorUserId: user.id,
      });

      // 8. Store team invitations (will be sent after payment)
      if (input.teamEmails && input.teamEmails.length > 0) {
        const invitationValues = input.teamEmails.map(email => ({
          agencyId,
          email,
          invitedBy: user.id,
          role: 'agent',
          token: `invite-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'pending' as const,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }));

        await db.insert(invitations).values(invitationValues);
      }

      // 9. Audit log
      await logAudit({
        userId: user.id,
        action: 'agency.create_onboarding',
        targetType: 'agency',
        targetId: agencyId,
        metadata: { planId: input.planId },
        req: ctx.req,
      });

      return { agencyId, slug: finalSlug };
    }),

  /**
  /**
   * Create a new agency (Super Admin only)
   */
  create: superAdminProcedure.input(createAgencySchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const user = requireUser(ctx);

    // Check if slug already exists
    const existing = await db.select().from(agencies).where(eq(agencies.slug, input.slug)).limit(1);
    if (existing.length > 0) {
      throw new Error('An agency with this slug already exists');
    }

    // Create agency
    const [result] = await db.insert(agencies).values({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      logo: input.logo || null,
      website: input.website || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      subscriptionPlan: 'free',
      subscriptionStatus: 'trial',
      isVerified: 0,
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'agency.create',
      targetType: 'agency',
      targetId: Number(result.insertId),
      req: ctx.req,
    });

    // Fetch and return the created agency
    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, Number(result.insertId)));
    return agency;
  }),

  /**
   * Get all agencies with filters (Super Admin only)
   */
  list: superAdminProcedure.input(agencyFiltersSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let query = db.select().from(agencies);

    // Apply filters
    const conditions: SQL[] = [];

    const search = input.search?.trim();
    if (search) {
      conditions.push(
        or(
          like(agencies.name, `%${search}%`),
          like(agencies.email, `%${search}%`),
          like(agencies.city, `%${search}%`),
        )!,
      );
    }

    if (input.province) {
      conditions.push(eq(agencies.province, input.province));
    }

    if (input.subscriptionPlan) {
      conditions.push(eq(agencies.subscriptionPlan, input.subscriptionPlan));
    }

    if (input.isVerified !== undefined) {
      conditions.push(eq(agencies.isVerified, input.isVerified ? 1 : 0));
    }

    if (conditions.length > 0) {
      query = query.where(or(...conditions)!);
    }

    const results = await query
      .orderBy(desc(agencies.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get total count
    const [{ count }] = await db.select({ count: agencies.id }).from(agencies);

    return {
      agencies: results,
      total: Number(count) || 0,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  /**
   * Get agency by ID (Public - for display)
   */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.id)).limit(1);

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;
  }),

  /**
   * Get agency by slug (Public - for display)
   */
  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [agency] = await db.select().from(agencies).where(eq(agencies.slug, input.slug)).limit(1);

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;
  }),

  /**
   * Update agency (Super Admin or Agency Admin for their own agency)
   */
  update: agencyAdminProcedure.input(updateAgencySchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const user = requireUser(ctx);

    const { id, ...updateData } = input;

    // Get the agency
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
    if (!agency) {
      throw new Error('Agency not found');
    }

    // Authorization check: super_admin can update any, agency_admin only their own
    if (user.role !== 'super_admin') {
      if (!user.agencyId || user.agencyId !== id) {
        throw new Error('You can only update your own agency');
      }
    }

    // Update agency
    await db
      .update(agencies)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, id));

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'agency.update',
      targetType: 'agency',
      targetId: id,
      req: ctx.req,
    });

    // Return updated agency
    const [updated] = await db.select().from(agencies).where(eq(agencies.id, id));
    return updated;
  }),

  /**
   * Delete agency (Super Admin only)
   */
  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      const user = requireUser(ctx);

      // Check if agency exists
      const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.id)).limit(1);
      if (!agency) {
        throw new Error('Agency not found');
      }

      // Delete agency (cascade will handle related records)
      await db.delete(agencies).where(eq(agencies.id, input.id));

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'agency.delete',
        targetType: 'agency',
        targetId: input.id,
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Verify agency (Super Admin only)
   */
  verify: superAdminProcedure
    .input(z.object({ id: z.number(), isVerified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      const user = requireUser(ctx);

      await db
        .update(agencies)
        .set({
          isVerified: input.isVerified ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, input.id));

      // Audit log
      await logAudit({
        userId: user.id,
        action: input.isVerified ? 'agency.verify' : 'agency.unverify',
        targetType: 'agency',
        targetId: input.id,
        req: ctx.req,
      });

      const [updated] = await db.select().from(agencies).where(eq(agencies.id, input.id));
      return updated;
    }),

  /**
   * Get agency dashboard statistics
   */
  getDashboardStats: agencyAdminProcedure.query(async ({ ctx }) => {
    if (!ctx.user.agencyId) {
      return {
        totalListings: 0,
        totalSales: 0,
        totalLeads: 0,
        totalAgents: 0,
        activeListings: 0,
        pendingListings: 0,
        recentLeads: 0,
        recentSales: 0,
      };
    }
    try {
      return await getAgencyDashboardStats(ctx.user.agencyId);
    } catch (error) {
      console.warn('[agency.getDashboardStats] Returning safe defaults due to error:', error);
      return {
        totalListings: 0,
        totalSales: 0,
        totalLeads: 0,
        totalAgents: 0,
        activeListings: 0,
        pendingListings: 0,
        recentLeads: 0,
        recentSales: 0,
      };
    }
  }),

  /**
   * Get agency performance data for charts
   */
  getPerformanceData: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        return [];
      }
      try {
        return await getAgencyPerformanceData(ctx.user.agencyId, input?.months || 6);
      } catch (error) {
        console.warn('[agency.getPerformanceData] Returning safe defaults due to error:', error);
        return [];
      }
    }),

  /**
   * Get recent leads for agency dashboard
   */
  getRecentLeads: agencyAdminProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyRecentLeads(user.agencyId, input?.limit || 5);
    }),

  /**
   * Get agency-owned leads for operational follow-up.
   */
  getLeads: agencyAdminProcedure
    .input(
      z
        .object({
          status: z.union([leadStatusSchema, z.literal('all')]).default('all'),
          agentId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be part of an agency',
        });
      }

      const filters = input || { status: 'all' as const, limit: 50 };
      const conditions: SQL[] = [eq(leads.agencyId, user.agencyId)];

      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(leads.status, filters.status));
      }

      if (filters.agentId) {
        conditions.push(eq(leads.agentId, filters.agentId));
      }

      const rows = await db
        .select({
          lead: leads,
          property: properties,
          agent: agents,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .leftJoin(agents, eq(leads.agentId, agents.id))
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(filters.limit);

      return rows.map(({ lead, property, agent }) => ({
        ...decorateLeadForWorkspace(lead),
        agent: agent
          ? {
              id: agent.id,
              userId: agent.userId,
              name:
                agent.displayName ||
                [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim() ||
                'Assigned agent',
              email: agent.email,
              phone: agent.phone,
            }
          : null,
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.city,
              province: property.province,
              price: Number(property.price || 0),
              status: property.status,
            }
          : null,
      }));
    }),

  /**
   * Update agency-owned lead status.
   */
  updateLeadStatus: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        status: leadStatusSchema,
        notes: z.string().trim().max(1000).optional(),
        lostReason: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be part of an agency',
        });
      }

      const lead = await requireAgencyLead(db, user, input.leadId);
      assertLeadTransitionAllowed(lead, input.status, { lostReason: input.lostReason });
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          status: input.status,
          updatedAt: now,
          lastContactedAt:
            input.status === 'contacted' || input.status === 'qualified'
              ? now
              : lead.lastContactedAt,
          convertedAt:
            input.status === 'converted' || input.status === 'closed' ? now : lead.convertedAt,
          lostReason:
            input.status === 'lost' ? input.lostReason || lead.lostReason : lead.lostReason,
          funnelStage: mapStatusToFunnelStage(input.status, lead.funnelStage) as any,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, user.agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'status_change',
        description:
          input.notes ||
          (input.status === 'lost'
            ? `Agency status changed to lost: ${input.lostReason}`
            : `Agency status changed to ${input.status}`),
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_status_update',
        targetType: 'lead',
        targetId: input.leadId,
        metadata: {
          agencyId: user.agencyId,
          previousStatus: lead.status,
          nextStatus: input.status,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  getLeadDetail: agencyAdminProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const lead = await requireAgencyLead(db, user, input.leadId);

      const [property] = lead.propertyId
        ? await db.select().from(properties).where(eq(properties.id, lead.propertyId)).limit(1)
        : [];
      const [agent] = lead.agentId
        ? await db
            .select()
            .from(agents)
            .where(and(eq(agents.id, lead.agentId), eq(agents.agencyId, agencyId)))
            .limit(1)
        : [];

      const activities = await db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, input.leadId))
        .orderBy(desc(leadActivities.createdAt))
        .limit(50);

      const viewingRows = await db
        .select({
          showing: showings,
          agent: agents,
        })
        .from(showings)
        .leftJoin(agents, and(eq(showings.agentId, agents.id), eq(agents.agencyId, agencyId)))
        .where(eq(showings.leadId, input.leadId))
        .orderBy(desc(showings.scheduledAt))
        .limit(20);

      return {
        ...decorateLeadForWorkspace(lead),
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.city,
              province: property.province,
              price: Number(property.price || 0),
              status: property.status,
            }
          : null,
        agent: agent
          ? {
              id: agent.id,
              userId: agent.userId,
              name:
                agent.displayName ||
                [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim() ||
                'Assigned agent',
              email: agent.email,
              phone: agent.phone,
            }
          : null,
        activities,
        viewings: viewingRows.map(row => ({
          ...row.showing,
          agent: row.agent
            ? {
                id: row.agent.id,
                name:
                  row.agent.displayName ||
                  [row.agent.firstName, row.agent.lastName].filter(Boolean).join(' ').trim() ||
                  'Assigned agent',
                email: row.agent.email,
              }
            : null,
        })),
      };
    }),

  assignLead: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        agentId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be part of an agency',
        });
      }

      const lead = await requireAgencyLead(db, user, input.leadId);
      const assignedAgent = input.agentId
        ? await requireAgencyAgent(db, user.agencyId, input.agentId)
        : null;
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          agentId: assignedAgent?.id || null,
          assignedTo: assignedAgent?.userId || null,
          assignedAt: assignedAgent ? now : null,
          updatedAt: now,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, user.agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'note',
        description: assignedAgent
          ? `Assigned to ${
              assignedAgent.displayName ||
              [assignedAgent.firstName, assignedAgent.lastName].filter(Boolean).join(' ').trim() ||
              assignedAgent.email ||
              `agent #${assignedAgent.id}`
            }.`
          : 'Lead assignment cleared.',
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_assignment_update',
        targetType: 'lead',
        targetId: input.leadId,
        metadata: {
          agencyId: user.agencyId,
          previousAgentId: lead.agentId,
          nextAgentId: assignedAgent?.id || null,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  addLeadNote: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        note: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const lead = await requireAgencyLead(db, user, input.leadId);
      const now = nowAsDbTimestamp();
      const author = user.email || `user #${user.id}`;
      const noteEntry = `[${now}] ${author}: ${input.note}`;

      await db
        .update(leads)
        .set({
          notes: lead.notes ? `${lead.notes}\n${noteEntry}` : noteEntry,
          updatedAt: now,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'note',
        description: input.note,
      });

      return { success: true };
    }),

  setLeadFollowUp: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        nextFollowUp: z.string().min(1),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const lead = await requireAgencyLead(db, user, input.leadId);
      const parsedDate = new Date(input.nextFollowUp);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Follow-up date is invalid.',
        });
      }

      const followUp = toDbTimestampRequired(parsedDate);
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          nextFollowUp: followUp,
          updatedAt: now,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'note',
        description: input.note || `Follow-up scheduled for ${followUp}.`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_follow_up_set',
        targetType: 'lead',
        targetId: input.leadId,
        metadata: {
          agencyId,
          previousFollowUp: lead.nextFollowUp,
          nextFollowUp: followUp,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  completeLeadFollowUp: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyLead(db, user, input.leadId);
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          nextFollowUp: null,
          lastContactedAt: now,
          updatedAt: now,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'note',
        description: input.note || 'Follow-up completed.',
      });

      return { success: true };
    }),

  scheduleLeadViewing: agencyAdminProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        agentId: z.number().int().positive().optional(),
        scheduledAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240).default(45),
        status: z.enum(['requested', 'confirmed']).default('confirmed'),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be part of an agency',
        });
      }

      const lead = await requireAgencyLead(db, user, input.leadId);
      const showingDate = new Date(input.scheduledAt);
      if (Number.isNaN(showingDate.getTime())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Viewing date is invalid.',
        });
      }

      const showingAgentId = input.agentId || lead.agentId;
      if (!showingAgentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Assign an agency agent before scheduling a viewing.',
        });
      }

      const showingAgent = await requireAgencyAgent(db, user.agencyId, showingAgentId);
      const scheduledAt = toDbTimestampRequired(showingDate);
      const now = nowAsDbTimestamp();

      assertLeadTransitionAllowed(lead, 'viewing_scheduled');
      const [result] = await db.insert(showings).values({
        propertyId: lead.propertyId,
        leadId: lead.id,
        agentId: showingAgent.id,
        scheduledAt,
        status: input.status,
        visitorName: lead.name,
        durationMinutes: input.durationMinutes,
        notes: input.notes || null,
      });

      await db
        .update(leads)
        .set({
          agentId: showingAgent.id,
          assignedTo: showingAgent.userId || lead.assignedTo,
          assignedAt: lead.assignedAt || now,
          status: 'viewing_scheduled',
          funnelStage: 'viewing',
          updatedAt: now,
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, user.agencyId)));

      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: user.id,
        type: 'meeting',
        description: `Viewing ${input.status} for ${scheduledAt}.`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_viewing_scheduled',
        targetType: 'lead',
        targetId: input.leadId,
        metadata: {
          agencyId: user.agencyId,
          showingId: Number(result.insertId || 0),
          scheduledAt,
          agentId: showingAgent.id,
        },
        req: ctx.req,
      });

      return { success: true, showingId: Number(result.insertId || 0) };
    }),

  /**
   * Get recent listings for agency dashboard
   */
  getRecentListings: agencyAdminProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyRecentListings(user.agencyId, input?.limit || 5);
    }),

  getListingInventory: agencyAdminProcedure
    .input(listingInventoryFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const filters = listingInventoryFiltersSchema.parse(input || {});
      const conditions: SQL[] = [agencyListingScopeCondition(agencyId)];
      applyAgencyListingFilterConditions(conditions, filters);

      const [rows, total, summary] = await Promise.all([
        db
          .select(agencyListingSelectFields())
          .from(listings)
          .leftJoin(agents, eq(listings.agentId, agents.id))
          .leftJoin(users, eq(listings.ownerId, users.id))
          .where(and(...conditions))
          .orderBy(desc(listings.updatedAt), desc(listings.createdAt))
          .limit(filters.limit)
          .offset(filters.offset),
        countRows(
          db
            .select({ count: sql<number>`COUNT(DISTINCT ${listings.id})` })
            .from(listings)
            .leftJoin(agents, eq(listings.agentId, agents.id))
            .leftJoin(users, eq(listings.ownerId, users.id))
            .where(and(...conditions)),
        ),
        getAgencyListingSummary(db, agencyId),
      ]);

      return {
        listings: rows.map(row => mapAgencyListingRow(row, agencyId)),
        total,
        limit: filters.limit,
        offset: filters.offset,
        summary,
        contract: {
          sourceOfTruth: 'listings',
          publicationMirror: 'properties.sourceListingId',
          performanceSource: 'properties_mirror_then_listing_analytics_then_listing_leads',
        },
      };
    }),

  getListingDetail: agencyAdminProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyListing(db, agencyId, input.listingId);

      const [row] = await db
        .select(agencyListingSelectFields())
        .from(listings)
        .leftJoin(agents, eq(listings.agentId, agents.id))
        .leftJoin(users, eq(listings.ownerId, users.id))
        .where(and(eq(listings.id, input.listingId), agencyListingScopeCondition(agencyId)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      const [media, reviewHistory] = await Promise.all([
        db
          .select({
            id: listingMedia.id,
            mediaType: listingMedia.mediaType,
            originalUrl: listingMedia.originalUrl,
            processedUrl: listingMedia.processedUrl,
            thumbnailUrl: listingMedia.thumbnailUrl,
            displayOrder: listingMedia.displayOrder,
            isPrimary: listingMedia.isPrimary,
            processingStatus: listingMedia.processingStatus,
            uploadedAt: listingMedia.uploadedAt,
          })
          .from(listingMedia)
          .where(eq(listingMedia.listingId, input.listingId))
          .orderBy(listingMedia.displayOrder, listingMedia.id),
        db
          .select({
            id: listingApprovalQueue.id,
            status: listingApprovalQueue.status,
            priority: listingApprovalQueue.priority,
            submittedBy: listingApprovalQueue.submittedBy,
            submittedAt: listingApprovalQueue.submittedAt,
            reviewedBy: listingApprovalQueue.reviewedBy,
            reviewedAt: listingApprovalQueue.reviewedAt,
            reviewNotes: listingApprovalQueue.reviewNotes,
            rejectionReason: listingApprovalQueue.rejectionReason,
          })
          .from(listingApprovalQueue)
          .where(eq(listingApprovalQueue.listingId, input.listingId))
          .orderBy(desc(listingApprovalQueue.submittedAt))
          .limit(20),
      ]);

      return {
        ...mapAgencyListingRow(row, agencyId),
        mediaItems: media.map(item => ({
          ...item,
          isPrimary: Boolean(item.isPrimary),
        })),
        reviewHistory,
      };
    }),

  assignListing: agencyAdminProcedure
    .input(
      z.object({
        listingId: z.number().int().positive(),
        agentId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const listing = await requireAgencyListing(db, agencyId, input.listingId);
      const assignedAgent = input.agentId
        ? await requireAgencyAgent(db, agencyId, input.agentId)
        : null;
      const now = nowAsDbTimestamp();

      await db
        .update(listings)
        .set({
          agentId: assignedAgent?.id || null,
          updatedAt: now,
        })
        .where(eq(listings.id, input.listingId));

      await db
        .update(properties)
        .set({
          agentId: assignedAgent?.id || null,
          updatedAt: now,
        })
        .where(and(eq(properties.sourceListingId, input.listingId), isNotNull(properties.sourceListingId)));

      await logAudit({
        userId: user.id,
        action: 'agency.listing_assignment_update',
        targetType: 'listing',
        targetId: input.listingId,
        metadata: {
          agencyId,
          previousAgentId: listing.agentId,
          nextAgentId: assignedAgent?.id || null,
          preservedOwnerId: listing.ownerId,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  submitListingForReview: agencyAdminProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const listing = await requireAgencyListing(db, agencyId, input.listingId);
      const status = String(listing.status || 'draft');

      const [agency] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.id, agencyId))
        .limit(1);

      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const [branding] = await db
        .select({
          companyName: agencyBranding.companyName,
          primaryColor: agencyBranding.primaryColor,
          secondaryColor: agencyBranding.secondaryColor,
        })
        .from(agencyBranding)
        .where(eq(agencyBranding.agencyId, agencyId))
        .limit(1);

      const accessState = await getAgencyAccessStateForUser(db, {
        user,
        agency,
        profileConfigured: Boolean(agency.name && agency.email && agency.city && agency.province),
        brandingConfigured: Boolean(
          branding?.companyName && branding?.primaryColor && branding?.secondaryColor,
        ),
      });

      if (!accessState.workspaceAccess.publishing) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: accessState.actionableReason || 'Publishing is not available for this agency.',
        });
      }

      if (!['draft', 'rejected'].includes(status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Listing cannot be submitted from status "${status}"`,
        });
      }

      if (Number(listing.readinessScore || 0) < 75) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Listing is not ready for submission (${Number(listing.readinessScore || 0)}%).`,
        });
      }

      try {
        await submitListingForReviewById(input.listingId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit listing for review',
        });
      }

      await logAudit({
        userId: user.id,
        action: 'agency.listing_submitted_for_review',
        targetType: 'listing',
        targetId: input.listingId,
        metadata: {
          agencyId,
          previousStatus: status,
          readinessScore: listing.readinessScore,
        },
        req: ctx.req,
      });

      return { success: true, status: 'pending_review' };
    }),

  archiveListing: agencyAdminProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const listing = await requireAgencyListing(db, agencyId, input.listingId);

      if (String(listing.status || '') === 'archived') {
        return { success: true, status: 'archived' };
      }

      await archiveListingById(input.listingId);

      await logAudit({
        userId: user.id,
        action: 'agency.listing_archived',
        targetType: 'listing',
        targetId: input.listingId,
        metadata: {
          agencyId,
          previousStatus: listing.status,
          preservedOwnerId: listing.ownerId,
        },
        req: ctx.req,
      });

      return { success: true, status: 'archived' };
    }),

  /**
   * Get all agents in the agency (for management)
   */
  listAgents: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    const user = requireUser(ctx);
    if (!user.agencyId) {
      throw new Error('You must be part of an agency');
    }
    return await getAgencyTeamMembers(db, user.agencyId);
  }),

  listAssignableAgents: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }

    const user = requireUser(ctx);
    if (!user.agencyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be part of an agency',
      });
    }

    const rows = await db
      .select({
        id: agents.id,
        userId: agents.userId,
        firstName: agents.firstName,
        lastName: agents.lastName,
        displayName: agents.displayName,
        email: agents.email,
        phone: agents.phone,
        status: agents.status,
      })
      .from(agents)
      .where(and(eq(agents.agencyId, user.agencyId), eq(agents.status, 'approved')))
      .orderBy(agents.displayName);

    return rows.map(agent => ({
      id: agent.id,
      userId: agent.userId,
      name:
        agent.displayName ||
        [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim() ||
        agent.email ||
        `Agent #${agent.id}`,
      email: agent.email,
      phone: agent.phone,
      status: agent.status,
    }));
  }),

  /**
   * Update agent role within agency
   */
  updateAgentRole: agencyAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['agent', 'agency_admin']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      const authUser = requireUser(ctx);
      const agencyId = requireAgencyId(authUser);

      // Verify the user is in the same agency
      const targetUser = await requireAgencyMemberUser(db, agencyId, input.userId);
      if (targetUser.role === 'visitor') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reactivate this member before changing their role',
        });
      }

      // Prevent removing the final agency admin, regardless of who is being demoted.
      if (targetUser.role === 'agency_admin' && input.role !== 'agency_admin') {
        const agencyAdmins = await countAgencyAdmins(db, agencyId);
        if (agencyAdmins <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot demote the final agency admin',
          });
        }
      }

      await db
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await logAudit({
        userId: authUser.id,
        action: 'agency.agent_role_update',
        targetType: 'user',
        targetId: input.userId,
        metadata: { oldRole: targetUser.role, newRole: input.role, agencyId },
        req: ctx.req,
      });

      return { success: true };
    }),

  setAgentMembershipStatus: agencyAdminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(['active', 'suspended']),
        role: z.enum(['agent', 'agency_admin']).optional(),
        reassignToUserId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const authUser = requireUser(ctx);
      const agencyId = requireAgencyId(authUser);
      const targetUser = await requireAgencyMemberUser(db, agencyId, input.userId);

      if (input.status === 'suspended') {
        if (targetUser.id === authUser.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot deactivate your own agency membership',
          });
        }

        if (targetUser.role === 'agency_admin') {
          const agencyAdmins = await countAgencyAdmins(db, agencyId);
          if (agencyAdmins <= 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot deactivate the final agency admin',
            });
          }
        }

        const targetAgent = await getApprovedAgentProfileForUser(db, agencyId, targetUser.id);
        const workload = await getAgencyMemberWorkload({
          db,
          agencyId,
          userId: targetUser.id,
          agentId: targetAgent?.id || null,
        });

        let reassignTo:
          | {
              user: typeof users.$inferSelect;
              agent: typeof agents.$inferSelect;
            }
          | null = null;

        if (input.reassignToUserId) {
          if (input.reassignToUserId === targetUser.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Choose a different team member for reassignment',
            });
          }

          const reassignmentUser = await requireAgencyMemberUser(
            db,
            agencyId,
            input.reassignToUserId,
          );
          if (!ACTIVE_MEMBER_ROLES.has(String(reassignmentUser.role || ''))) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Work can only be reassigned to an active agency member',
            });
          }

          const reassignmentAgent = await getApprovedAgentProfileForUser(
            db,
            agencyId,
            reassignmentUser.id,
          );
          if (!reassignmentAgent) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'The reassignment target needs an approved agent profile',
            });
          }

          reassignTo = { user: reassignmentUser, agent: reassignmentAgent };
        }

        if (workload.hasActiveWork && !reassignTo) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'This member still owns active leads, listings, or viewings. Reassign their work before deactivation.',
          });
        }

        const now = nowAsDbTimestamp();
        if (reassignTo) {
          await db
            .update(leads)
            .set({
              agentId: reassignTo.agent.id,
              assignedTo: reassignTo.user.id,
              assignedAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(leads.agencyId, agencyId),
                leadOwnerCondition(targetUser.id, targetAgent?.id || null),
                inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
              ),
            );

          await db
            .update(listings)
            .set({
              agentId: reassignTo.agent.id,
              updatedAt: now,
            })
            .where(
              and(
                canonicalListingOwnerCondition(targetUser.id, targetAgent?.id || null),
                inArray(listings.status, [
                  ...ACTIVE_CANONICAL_LISTING_STATUSES,
                  ...PENDING_CANONICAL_LISTING_STATUSES,
                ] as any),
              ),
            );

          await db
            .update(properties)
            .set({
              agentId: reassignTo.agent.id,
              updatedAt: now,
            })
            .where(
              and(
                propertyOwnerCondition(targetUser.id, targetAgent?.id || null),
                inArray(properties.status, [
                  ...ACTIVE_WORK_LISTING_STATUSES,
                  ...PENDING_WORK_LISTING_STATUSES,
                ] as any),
              ),
            );
        }

        await db
          .update(users)
          .set({
            role: 'visitor',
            isSubaccount: 1,
            updatedAt: new Date(),
          })
          .where(eq(users.id, targetUser.id));

        if (targetAgent) {
          await db
            .update(agents)
            .set({
              status: 'suspended',
              updatedAt: new Date(),
            })
            .where(eq(agents.id, targetAgent.id));
        }

        await logAudit({
          userId: authUser.id,
          action: 'agency.agent_deactivated',
          targetType: 'user',
          targetId: targetUser.id,
          metadata: {
            agencyId,
            workload,
            reassignToUserId: reassignTo?.user.id || null,
            reassignToAgentId: reassignTo?.agent.id || null,
          },
          req: ctx.req,
        });

        return { success: true };
      }

      const nextRole = input.role || (targetUser.role === 'agency_admin' ? 'agency_admin' : 'agent');
      const agentId = await ensureAgentProfileForAgencyMember(db, targetUser, agencyId, authUser.id);

      await db
        .update(users)
        .set({
          role: nextRole,
          agencyId,
          isSubaccount: 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUser.id));

      await logAudit({
        userId: authUser.id,
        action: 'agency.agent_activated',
        targetType: 'user',
        targetId: targetUser.id,
        metadata: { agencyId, role: nextRole, agentId },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Remove agent from agency
   */
  removeAgent: agencyAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      const authUser = requireUser(ctx);
      const agencyId = requireAgencyId(authUser);

      // Verify the user is in the same agency
      const targetUser = await requireAgencyMemberUser(db, agencyId, input.userId);

      // Prevent removing yourself
      if (targetUser.id === authUser.id) {
        throw new Error('Cannot remove yourself from the agency');
      }

      if (targetUser.role === 'agency_admin') {
        const agencyAdmins = await countAgencyAdmins(db, agencyId);
        if (agencyAdmins <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot deactivate the final agency admin',
          });
        }
      }

      const targetAgent = await getApprovedAgentProfileForUser(db, agencyId, targetUser.id);
      const workload = await getAgencyMemberWorkload({
        db,
        agencyId,
        userId: targetUser.id,
        agentId: targetAgent?.id || null,
      });

      if (workload.hasActiveWork) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'This member still owns active work. Reassign leads and listings before deactivation.',
        });
      }

      // Preserve the agency relationship for audit/history, but remove workspace access.
      await db
        .update(users)
        .set({
          isSubaccount: 1,
          role: 'visitor',
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      if (targetAgent) {
        await db
          .update(agents)
          .set({
            status: 'suspended',
            updatedAt: new Date(),
          })
          .where(eq(agents.id, targetAgent.id));
      }

      await logAudit({
        userId: authUser.id,
        action: 'agency.agent_deactivated',
        targetType: 'user',
        targetId: input.userId,
        metadata: { agencyId, workload },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Get lead conversion statistics
   */
  getLeadConversionStats: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getLeadConversionStats(user.agencyId, input?.months || 6);
    }),

  /**
   * Get commission and earnings statistics
   */
  getCommissionStats: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyCommissionStats(user.agencyId, input?.months || 6);
    }),

  /**
   * Get agent performance leaderboard
   */
  getAgentLeaderboard: agencyAdminProcedure
    .input(z.object({ months: z.number().default(3) }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgentPerformanceLeaderboard(user.agencyId, input?.months || 3);
    }),

  /**
   * Get agency branding (public endpoint for theme customization)
   */
  getBranding: publicProcedure
    .input(z.object({ agencyId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        // Return default branding if database is not available
        return {
          companyName: 'Real Estate Portal',
          primaryColor: '#1e40af',
          secondaryColor: '#3b82f6',
          logoUrl: null,
          tagline: 'Find Your Dream Home',
          isEnabled: true,
        };
      }

      try {
        // Try to get branding from user's agency or provided agencyId
        const targetAgencyId = input?.agencyId || ctx.user?.agencyId;

        if (!targetAgencyId) {
          // Return default branding if no agency
          return {
            companyName: 'Real Estate Portal',
            primaryColor: '#1e40af',
            secondaryColor: '#3b82f6',
            logoUrl: null,
            tagline: 'Find Your Dream Home',
            isEnabled: true,
          };
        }

        const [branding] = await db
          .select()
          .from(agencyBranding)
          .where(eq(agencyBranding.agencyId, targetAgencyId))
          .limit(1);

        if (!branding || !branding.isEnabled) {
          // Return default if no branding found or disabled
          return {
            companyName: 'Real Estate Portal',
            primaryColor: '#1e40af',
            secondaryColor: '#3b82f6',
            logoUrl: null,
            tagline: 'Find Your Dream Home',
            isEnabled: true,
          };
        }

        return {
          companyName: branding.companyName,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          logoUrl: branding.logoUrl,
          tagline: branding.tagline,
          isEnabled: Boolean(branding.isEnabled),
        };
      } catch (error) {
        console.error('[agency.getBranding] Error:', error);
        // Return default on error
        return {
          companyName: 'Real Estate Portal',
          primaryColor: '#1e40af',
          secondaryColor: '#3b82f6',
          logoUrl: null,
          tagline: 'Find Your Dream Home',
          isEnabled: true,
        };
      }
    }),
});

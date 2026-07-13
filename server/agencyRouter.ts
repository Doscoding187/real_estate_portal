import { z } from 'zod';
import { randomBytes } from 'crypto';
import {
  router,
  superAdminProcedure,
  agencyAdminProcedure,
  agentProcedure,
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
  notifications,
  agencyBranding,
  invitations,
  listings,
  listingApprovalQueue,
  listingMedia,
  agencyDeals,
  agencyDealOfferVersions,
  agencyTransactions,
  agencyTransactionMilestones,
  agencyTransactionConditions,
  agencyTransactionParties,
  agencyTransactionDocuments,
  agencyTransactionActivity,
  sellerProspects,
  sellerMandateOperations,
  SELLER_PROSPECT_TERMINAL_STAGE_VALUES,
} from '../drizzle/schema';
import { eq, like, or, desc, asc, and, inArray, notInArray, sql, isNull, isNotNull, ne, aliasedTable } from 'drizzle-orm';
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
const leadContactChannelSchema = z.enum(['call', 'whatsapp', 'email', 'sms', 'other']);
const leadContactOutcomeSchema = z.enum([
  'reached',
  'replied',
  'no_answer',
  'voicemail',
  'viewing_booked',
  'follow_up_required',
  'not_interested',
  'invalid_contact',
  'other',
]);

const viewingStatusSchema = z.enum([
  'requested',
  'awaiting_confirmation',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

const viewingFilterStatusSchema = z.enum([
  'all',
  'upcoming',
  'awaiting_confirmation',
  'unconfirmed',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'feedback_required',
  'rescheduled',
]);

const viewingFeedbackInputSchema = z.object({
  attended: z.boolean().optional(),
  interestLevel: z.enum(['high', 'medium', 'low', 'none']).optional(),
  priceReaction: z.string().trim().max(1000).optional(),
  propertyFit: z.string().trim().max(1000).optional(),
  objections: z.string().trim().max(2000).optional(),
  financingNotes: z.string().trim().max(2000).optional(),
  sellerFeedback: z.string().trim().max(2000).optional(),
  recommendedNextAction: z
    .enum(['offer', 'nurture', 'follow_up', 'reschedule', 'close_lost', 'none'])
    .optional(),
  followUpDate: z.string().trim().optional(),
  notes: z.string().trim().max(3000).optional(),
});

const dealTransactionTypeSchema = z.enum(['sale', 'rental']);
const dealInterestStatusSchema = z.enum([
  'interested',
  'maybe_nurture',
  'not_interested',
  'wants_offer',
  'wants_another_viewing',
  'needs_finance',
  'needs_to_sell',
]);
const offerActorSchema = z.enum(['buyer', 'seller', 'landlord', 'tenant', 'agency']);
const offerEventTypeSchema = z.enum([
  'initial_offer',
  'seller_counter',
  'buyer_counter',
  'landlord_counter',
  'tenant_counter',
  'acceptance_note',
]);
const offerStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'countered',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
  'superseded',
]);
const transactionWorkItemStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'waived',
  'cancelled',
  'blocked',
]);
const transactionResponsiblePartySchema = z.enum([
  'agency',
  'buyer',
  'seller',
  'tenant',
  'landlord',
  'conveyancer',
  'bond_originator',
  'attorney',
  'service_provider',
  'other',
]);
const transactionPartyRoleSchema = z.enum([
  'buyer',
  'tenant',
  'seller',
  'landlord',
  'listing_agent',
  'buyer_agent',
  'agency_manager',
  'bond_originator',
  'conveyancer',
  'bond_attorney',
  'cancellation_attorney',
  'inspector',
  'managing_agent',
  'service_provider',
  'other',
]);
const transactionDocumentTypeSchema = z.enum([
  'signed_offer',
  'id_document',
  'proof_of_address',
  'proof_of_funds',
  'prequalification',
  'bond_approval',
  'fica',
  'mandate',
  'compliance_certificate',
  'lease',
  'inspection',
  'other',
]);
const transferDutyVatTreatmentSchema = z.enum([
  'unknown',
  'transfer_duty',
  'vat',
  'exempt',
  'not_applicable',
]);
const commissionBasisSchema = z.enum(['percentage', 'fixed']);
const commissionVatTreatmentSchema = z.enum(['inclusive', 'exclusive', 'not_applicable']);
const commissionStatusSchema = z.enum(['estimated', 'payable', 'paid', 'cancelled']);

const moneyInputSchema = z.coerce.number().nonnegative().max(999_999_999_999);
const nullableMoneyInputSchema = moneyInputSchema.optional().nullable();
const dateInputSchema = z.string().trim().max(80).optional().nullable();

const offerTermsInputSchema = z.object({
  amount: moneyInputSchema,
  depositAmount: nullableMoneyInputSchema,
  financeRequired: z.boolean().optional(),
  bondAmount: nullableMoneyInputSchema,
  cashPortion: nullableMoneyInputSchema,
  occupationDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  occupationalRent: nullableMoneyInputSchema,
  monthlyRental: nullableMoneyInputSchema,
  leaseDurationMonths: z.number().int().min(1).max(120).optional().nullable(),
  rentalDeposit: nullableMoneyInputSchema,
  offerExpiry: dateInputSchema,
  conditionsSummary: z.string().trim().max(4000).optional().nullable(),
  fixturesSummary: z.string().trim().max(4000).optional().nullable(),
  specialConditions: z.string().trim().max(4000).optional().nullable(),
});

const createDealInputSchema = z.object({
  leadId: z.number().int().positive(),
  sourceViewingId: z.number().int().positive().optional().nullable(),
  listingId: z.number().int().positive().optional().nullable(),
  propertyId: z.number().int().positive().optional().nullable(),
  responsibleAgentId: z.number().int().positive().optional().nullable(),
  transactionType: dealTransactionTypeSchema.default('sale'),
  interestStatus: dealInterestStatusSchema.default('wants_offer'),
  notes: z.string().trim().max(2000).optional(),
  terms: offerTermsInputSchema.optional(),
});

const createOfferVersionInputSchema = z.object({
  dealId: z.number().int().positive(),
  actor: offerActorSchema.default('buyer'),
  eventType: offerEventTypeSchema.default('buyer_counter'),
  status: offerStatusSchema.default('draft'),
  parentOfferVersionId: z.number().int().positive().optional().nullable(),
  terms: offerTermsInputSchema,
  note: z.string().trim().max(2000).optional(),
});

const submitOfferInputSchema = z.object({
  offerVersionId: z.number().int().positive(),
  note: z.string().trim().max(2000).optional(),
});

const acceptOfferInputSchema = z.object({
  offerVersionId: z.number().int().positive(),
  commissionBasis: commissionBasisSchema.default('percentage'),
  commissionPercentage: z.coerce.number().min(0).max(100).default(5),
  commissionFixedAmount: nullableMoneyInputSchema,
  commissionVatTreatment: commissionVatTreatmentSchema.default('exclusive'),
  agencySharePercentage: z.coerce.number().min(0).max(100).default(50),
  referralSplit: moneyInputSchema.default(0),
  otherDeductions: moneyInputSchema.default(0),
  expectedPaymentDate: dateInputSchema,
  targetCompletionDate: dateInputSchema,
  transferDutyVatTreatment: transferDutyVatTreatmentSchema.default('unknown'),
  note: z.string().trim().max(2000).optional(),
});

const addTransactionConditionInputSchema = z.object({
  transactionId: z.number().int().positive(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
  responsibleParty: transactionResponsiblePartySchema.default('agency'),
  dueAt: dateInputSchema,
  notes: z.string().trim().max(2000).optional(),
});

const updateTransactionWorkItemInputSchema = z.object({
  transactionId: z.number().int().positive(),
  itemType: z.enum(['milestone', 'condition']),
  itemId: z.number().int().positive(),
  status: transactionWorkItemStatusSchema,
  notes: z.string().trim().max(2000).optional(),
  waivedOrCancelledReason: z.string().trim().max(2000).optional(),
});

const addTransactionPartyInputSchema = z.object({
  transactionId: z.number().int().positive(),
  role: transactionPartyRoleSchema,
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  organization: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional(),
});

const addTransactionDocumentInputSchema = z.object({
  transactionId: z.number().int().positive(),
  conditionId: z.number().int().positive().optional().nullable(),
  documentType: transactionDocumentTypeSchema,
  fileName: z.string().trim().min(2).max(255),
  storageKey: z.string().trim().min(6).max(500),
  contentType: z.string().trim().max(120).optional().nullable(),
  fileSize: z.number().int().positive().max(200_000_000).optional().nullable(),
  notes: z.string().trim().max(2000).optional(),
});

const updateTransactionInputSchema = z.object({
  transactionId: z.number().int().positive(),
  stage: z.string().trim().min(2).max(80).optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  riskStatus: z.enum(['on_track', 'watch', 'at_risk', 'blocked', 'complete', 'cancelled']).optional(),
  nextAction: z.string().trim().max(255).optional().nullable(),
  nextDeadline: dateInputSchema,
  expectedPaymentDate: dateInputSchema,
  commissionStatus: commissionStatusSchema.optional(),
  note: z.string().trim().max(2000).optional(),
});

type LeadStatus = z.infer<typeof leadStatusSchema>;
type ViewingStatus = z.infer<typeof viewingStatusSchema>;
type DealTransactionType = z.infer<typeof dealTransactionTypeSchema>;
type OfferStatus = z.infer<typeof offerStatusSchema>;
type TransactionWorkItemStatus = z.infer<typeof transactionWorkItemStatusSchema>;
type AgencyDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type ViewingRescheduleEntry = {
  previousScheduledAt: string | null;
  nextScheduledAt: string;
  previousStatus: ViewingStatus;
  nextStatus: ViewingStatus;
  rescheduledAt: string;
  rescheduledByUserId: number;
  note: string | null;
};
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

const VIEWING_TRANSITIONS: Record<ViewingStatus, ViewingStatus[]> = {
  requested: ['awaiting_confirmation', 'confirmed', 'cancelled', 'rescheduled'],
  awaiting_confirmation: ['confirmed', 'cancelled', 'rescheduled'],
  confirmed: ['completed', 'cancelled', 'no_show', 'rescheduled'],
  completed: [],
  cancelled: [],
  no_show: ['rescheduled'],
  rescheduled: ['awaiting_confirmation', 'confirmed', 'cancelled'],
};

const ACTIVE_VIEWING_STATUSES = [
  'requested',
  'awaiting_confirmation',
  'confirmed',
  'rescheduled',
] as const;

const AGENCY_WORKSPACE_TIME_ZONE = 'Africa/Johannesburg';
const AGENCY_WORKSPACE_UTC_OFFSET = '+02:00';
const AGENCY_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENCY_WORKSPACE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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
const FIRST_RESPONSE_SLA_MINUTES = 15;
const ACTIVE_WORK_LISTING_STATUSES = ['available', 'published'] as const;
const PENDING_WORK_LISTING_STATUSES = ['pending', 'draft'] as const;
const ACTIVE_CANONICAL_LISTING_STATUSES = ['approved', 'published'] as const;
const PENDING_CANONICAL_LISTING_STATUSES = ['draft', 'pending_review', 'rejected'] as const;

function firstResponseOverdueSql() {
  return sql<number>`CASE
    WHEN ${leads.status} IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent')
      AND ${leads.firstRespondedAt} IS NULL
      AND ${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL ${FIRST_RESPONSE_SLA_MINUTES} MINUTE)
    THEN 1
    ELSE 0
  END`;
}

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
  if (String(lead.nextAction || '').trim()) return String(lead.nextAction).trim();
  if (!lead.agentId && !lead.assignedTo) return 'Assign owner';
  if (lead.nextFollowUp) {
    const followUpTime = new Date(lead.nextFollowUp).getTime();
    if (Number.isFinite(followUpTime) && followUpTime < Date.now()) return 'Follow-up overdue';
    return 'Follow-up scheduled';
  }
  if (lead.status === 'new') return 'Make first buyer contact';
  if (lead.status === 'contacted') return 'Qualify buyer';
  if (lead.status === 'qualified') return 'Schedule viewing';
  if (lead.status === 'viewing_scheduled') return 'Capture viewing outcome';
  if (lead.status === 'offer_sent') return 'Track offer';
  return 'Review activity';
}

function getLeadFirstResponseState(lead: typeof leads.$inferSelect) {
  const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
  const firstRespondedAt = lead.firstRespondedAt || lead.lastContactedAt;
  const respondedAt = firstRespondedAt ? new Date(firstRespondedAt) : null;
  const createdTime = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getTime() : null;
  const respondedTime = respondedAt && !Number.isNaN(respondedAt.getTime()) ? respondedAt.getTime() : null;
  const active = ACTIVE_WORK_LEAD_STATUSES.includes(lead.status as any);
  const ageMinutes = createdTime == null ? null : Math.max(0, Math.floor((Date.now() - createdTime) / 60_000));

  return {
    slaMinutes: FIRST_RESPONSE_SLA_MINUTES,
    firstRespondedAt: respondedTime == null ? null : respondedAt!.toISOString(),
    firstResponseMinutes:
      createdTime == null || respondedTime == null ? null : Math.max(0, Math.round((respondedTime - createdTime) / 60_000)),
    firstResponseOverdue: Boolean(
      active && respondedTime == null && ageMinutes != null && ageMinutes >= FIRST_RESPONSE_SLA_MINUTES,
    ),
    firstResponseDueAt:
      createdTime == null ? null : new Date(createdTime + FIRST_RESPONSE_SLA_MINUTES * 60_000).toISOString(),
  };
}

function parseLeadActivityMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function decorateLeadActivity(activity: typeof leadActivities.$inferSelect) {
  return {
    ...activity,
    metadata: parseLeadActivityMetadata(activity.metadata),
  };
}

function isLeadOverdue(lead: typeof leads.$inferSelect) {
  if (!lead.nextFollowUp) return false;
  const followUpTime = new Date(lead.nextFollowUp).getTime();
  return Number.isFinite(followUpTime) && followUpTime < Date.now();
}

function decorateLeadForWorkspace(
  lead: typeof leads.$inferSelect,
  firstResponseState?: Partial<ReturnType<typeof getLeadFirstResponseState>>,
) {
  return {
    ...lead,
    temperature: toLeadTemperature(lead.qualificationScore),
    readiness: deriveLeadReadiness(lead),
    nextAction: getNextLeadAction(lead),
    overdueFollowUp: isLeadOverdue(lead),
    ...getLeadFirstResponseState(lead),
    ...firstResponseState,
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

  if (user.role === 'agent') {
    const [assignedAgent] = lead.agentId
      ? await db
          .select({ id: agents.id })
          .from(agents)
          .where(
            and(
              eq(agents.id, lead.agentId),
              eq(agents.agencyId, agencyId),
              eq(agents.userId, user.id),
            ),
          )
          .limit(1)
      : [];
    if (!assignedAgent) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only work leads assigned to you.',
      });
    }
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

function requireAgencyManager(user: ReturnType<typeof requireUser>) {
  if (user.role !== 'agency_admin' && user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Agency manager privileges required',
    });
  }
}

function safeParseJsonObject(value?: string | null): Record<string, any> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeViewingRescheduleHistory(value: unknown): ViewingRescheduleEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Partial<ViewingRescheduleEntry>;
      const previousStatus = normalizeViewingStatus(candidate.previousStatus);
      const nextStatus = normalizeViewingStatus(candidate.nextStatus);
      const nextScheduledAt = String(candidate.nextScheduledAt || '').trim();
      const rescheduledAt = String(candidate.rescheduledAt || '').trim();
      const rescheduledByUserId = Number(candidate.rescheduledByUserId || 0);
      if (!nextScheduledAt || !rescheduledAt || !rescheduledByUserId) return null;

      return {
        previousScheduledAt: candidate.previousScheduledAt
          ? String(candidate.previousScheduledAt)
          : null,
        nextScheduledAt,
        previousStatus,
        nextStatus,
        rescheduledAt,
        rescheduledByUserId,
        note: candidate.note ? String(candidate.note) : null,
      };
    })
    .filter((entry): entry is ViewingRescheduleEntry => Boolean(entry));
}

function parseViewingNotes(value?: string | null) {
  const parsed = safeParseJsonObject(value);
  if (parsed) {
    return {
      summary: String(parsed.summary || parsed.notes || '').trim() || null,
      location: String(parsed.location || '').trim() || null,
      instructions: String(parsed.instructions || '').trim() || null,
      nextAction: String(parsed.nextAction || '').trim() || null,
      rescheduleHistory: normalizeViewingRescheduleHistory(parsed.rescheduleHistory),
      legacy: false,
    };
  }

  const summary = String(value || '').trim();
  return {
    summary: summary || null,
    location: null,
    instructions: null,
    nextAction: null,
    rescheduleHistory: [],
    legacy: Boolean(summary),
  };
}

function serializeViewingNotes(input: {
  notes?: string | null;
  location?: string | null;
  instructions?: string | null;
  nextAction?: string | null;
  rescheduleHistory?: ViewingRescheduleEntry[];
}) {
  const payload = {
    summary: String(input.notes || '').trim() || null,
    location: String(input.location || '').trim() || null,
    instructions: String(input.instructions || '').trim() || null,
    nextAction: String(input.nextAction || '').trim() || null,
    rescheduleHistory: input.rescheduleHistory?.length ? input.rescheduleHistory : undefined,
  };

  if (
    !payload.summary &&
    !payload.location &&
    !payload.instructions &&
    !payload.nextAction &&
    !payload.rescheduleHistory
  ) {
    return null;
  }

  return JSON.stringify(payload);
}

function appendViewingRescheduleHistory(
  currentNotes: string | null | undefined,
  entry: ViewingRescheduleEntry,
) {
  const notes = parseViewingNotes(currentNotes);
  return serializeViewingNotes({
    notes: notes.summary,
    location: notes.location,
    instructions: notes.instructions,
    nextAction: notes.nextAction,
    rescheduleHistory: [...notes.rescheduleHistory, entry],
  });
}

function parseViewingFeedback(value?: string | null) {
  const parsed = safeParseJsonObject(value);
  if (parsed) return parsed;

  const summary = String(value || '').trim();
  return summary ? { notes: summary, legacy: true } : null;
}

function hasViewingFeedback(value?: string | null) {
  return Boolean(String(value || '').trim());
}

function serializeViewingFeedback(
  input: z.infer<typeof viewingFeedbackInputSchema>,
  actorUserId: number,
) {
  return JSON.stringify({
    attended: input.attended,
    interestLevel: input.interestLevel || null,
    priceReaction: input.priceReaction || null,
    propertyFit: input.propertyFit || null,
    objections: input.objections || null,
    financingNotes: input.financingNotes || null,
    sellerFeedback: input.sellerFeedback || null,
    recommendedNextAction: input.recommendedNextAction || null,
    followUpDate: input.followUpDate || null,
    notes: input.notes || null,
    capturedByUserId: actorUserId,
    capturedAt: nowAsDbTimestamp(),
  });
}

function normalizeViewingStatus(status: unknown): ViewingStatus {
  if (status === 'scheduled') return 'confirmed';
  if (viewingStatusSchema.safeParse(status).success) return status as ViewingStatus;
  return 'requested';
}

function assertViewingTransitionAllowed(
  currentStatus: unknown,
  targetStatus: ViewingStatus,
) {
  const current = normalizeViewingStatus(currentStatus);
  if (current === targetStatus) return;

  const allowed = VIEWING_TRANSITIONS[current] || [];
  if (!allowed.includes(targetStatus)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot move viewing from ${current} to ${targetStatus}.`,
    });
  }
}

function assertViewingDateAllowed(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Viewing date is invalid.',
    });
  }

  if (parsedDate.getTime() < Date.now() - 5 * 60_000) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Viewing date must be in the future.',
    });
  }

  return parsedDate;
}

function formatAgencyDateKey(date: Date) {
  const parts = AGENCY_DAY_FORMATTER.formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to format agency date.' });
  }
  return `${year}-${month}-${day}`;
}

function parseAgencyDateKey(dateInput?: string | null) {
  if (!dateInput) return formatAgencyDateKey(new Date());

  const dateKey = String(dateInput).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Date filter is invalid.' });
  }

  const localMidnight = new Date(`${dateKey}T00:00:00${AGENCY_WORKSPACE_UTC_OFFSET}`);
  if (Number.isNaN(localMidnight.getTime()) || formatAgencyDateKey(localMidnight) !== dateKey) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Date filter is invalid.' });
  }

  return dateKey;
}

function addAgencyDays(dateKey: string, days: number) {
  const localMidnight = new Date(`${dateKey}T00:00:00${AGENCY_WORKSPACE_UTC_OFFSET}`);
  localMidnight.setUTCDate(localMidnight.getUTCDate() + days);
  return formatAgencyDateKey(localMidnight);
}

function getDayBounds(dateInput?: string | null) {
  const dateKey = parseAgencyDateKey(dateInput);
  const nextDateKey = addAgencyDays(dateKey, 1);
  const start = new Date(`${dateKey}T00:00:00${AGENCY_WORKSPACE_UTC_OFFSET}`);
  const end = new Date(`${nextDateKey}T00:00:00${AGENCY_WORKSPACE_UTC_OFFSET}`);

  return {
    dateKey,
    timeZone: AGENCY_WORKSPACE_TIME_ZONE,
    start,
    end,
    startDb: toDbTimestampRequired(start),
    endDb: toDbTimestampRequired(end),
  };
}

async function requireAgencyProperty(db: AgencyDb, agencyId: number, propertyId: number) {
  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!property) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
  }

  if (property.sourceListingId) {
    try {
      await requireAgencyListing(db, agencyId, property.sourceListingId);
      return property;
    } catch (error) {
      if (!(error instanceof TRPCError) || error.code !== 'NOT_FOUND') throw error;
    }
  }

  if (property.agentId) {
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, property.agentId), eq(agents.agencyId, agencyId)))
      .limit(1);
    if (agent) return property;
  }

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, property.ownerId), eq(users.agencyId, agencyId)))
    .limit(1);
  if (owner) return property;

  throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
}

async function resolveViewingInventory(input: {
  db: AgencyDb;
  agencyId: number;
  lead: typeof leads.$inferSelect;
  listingId?: number | null;
  propertyId?: number | null;
}) {
  const { db, agencyId, lead } = input;
  let listingId = input.listingId || null;
  let propertyId = input.propertyId || lead.propertyId || null;

  if (listingId) {
    await requireAgencyListing(db, agencyId, listingId);
    const [publicProperty] = await db
      .select({
        id: properties.id,
        sourceListingId: properties.sourceListingId,
      })
      .from(properties)
      .where(eq(properties.sourceListingId, listingId))
      .orderBy(desc(properties.updatedAt))
      .limit(1);

    if (lead.propertyId && publicProperty?.id && Number(lead.propertyId) !== Number(publicProperty.id)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Selected listing does not match the lead property.',
      });
    }

    if (lead.propertyId && !publicProperty) {
      const leadProperty = await requireAgencyProperty(db, agencyId, lead.propertyId);
      if (leadProperty.sourceListingId && Number(leadProperty.sourceListingId) !== Number(listingId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected listing does not match the lead property.',
        });
      }
    }

    propertyId = publicProperty?.id || propertyId;
  }

  if (propertyId) {
    const property = await requireAgencyProperty(db, agencyId, propertyId);
    if (!listingId && property.sourceListingId) {
      const sourceListingId = Number(property.sourceListingId);
      listingId = sourceListingId;
      await requireAgencyListing(db, agencyId, sourceListingId);
    }
  }

  return { listingId, propertyId };
}

async function requireAgencyViewing(db: AgencyDb, agencyId: number, viewingId: number) {
  const viewingCreator = aliasedTable(users, 'viewing_creator_guard');
  const [row] = await db
    .select({
      showing: showings,
      agent: agents,
      creatorAgencyId: viewingCreator.agencyId,
    })
    .from(showings)
    .leftJoin(agents, eq(showings.agentId, agents.id))
    .leftJoin(viewingCreator, eq(showings.createdByUserId, viewingCreator.id))
    .where(eq(showings.id, viewingId))
    .limit(1);

  if (!row?.showing || !row.agent || Number(row.agent.agencyId || 0) !== agencyId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Viewing not found' });
  }

  if (row.showing.createdByUserId && Number(row.creatorAgencyId || 0) !== agencyId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Viewing not found' });
  }

  if (row.showing.leadId) {
    const [lead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, row.showing.leadId), eq(leads.agencyId, agencyId)))
      .limit(1);
    if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Viewing not found' });
  }

  if (row.showing.listingId) {
    await requireAgencyListing(db, agencyId, row.showing.listingId);
  }

  if (row.showing.propertyId) {
    await requireAgencyProperty(db, agencyId, row.showing.propertyId);
  }

  return row.showing;
}

function getViewingQueueStatus(showing: typeof showings.$inferSelect) {
  const status = normalizeViewingStatus(showing.status);
  if (status === 'completed' && !hasViewingFeedback(showing.feedback)) return 'feedback_required';
  if (status === 'requested') return 'awaiting_confirmation';
  return status;
}

function mapViewingRow(row: any) {
  const showing = row.showing;
  const notes = parseViewingNotes(showing.notes);
  const feedback = parseViewingFeedback(showing.feedback);
  const status = normalizeViewingStatus(showing.status);
  const scheduledAt = showing.scheduledAt;
  const now = Date.now();
  const scheduledTime = scheduledAt ? new Date(scheduledAt).getTime() : NaN;
  const isUpcoming = Number.isFinite(scheduledTime) && scheduledTime >= now;

  return {
    id: Number(showing.id),
    listingId: showing.listingId == null ? null : Number(showing.listingId),
    propertyId: showing.propertyId == null ? null : Number(showing.propertyId),
    leadId: showing.leadId == null ? null : Number(showing.leadId),
    agentId: showing.agentId == null ? null : Number(showing.agentId),
    createdByUserId: showing.createdByUserId == null ? null : Number(showing.createdByUserId),
    scheduledAt,
    durationMinutes: Number(showing.durationMinutes || 30),
    status,
    queueStatus: getViewingQueueStatus(showing),
    isUpcoming,
    isFeedbackRequired: status === 'completed' && !hasViewingFeedback(showing.feedback),
    attendee: showing.visitorName || row.leadName || null,
    notes: notes.summary,
    location: notes.location,
    instructions: notes.instructions,
    nextAction: notes.nextAction,
    rescheduleHistory: notes.rescheduleHistory,
    feedback: showing.feedback,
    feedbackStructured: feedback,
    createdAt: showing.createdAt,
    updatedAt: showing.updatedAt,
    creator: row.creatorId
      ? {
          id: Number(row.creatorId),
          name:
            row.creatorName ||
            [row.creatorFirstName, row.creatorLastName].filter(Boolean).join(' ').trim() ||
            row.creatorEmail ||
            'Creator',
          email: row.creatorEmail,
        }
      : null,
    agent: row.agentId
      ? {
          id: Number(row.agentId),
          userId: row.agentUserId == null ? null : Number(row.agentUserId),
          name:
            row.agentDisplayName ||
            [row.agentFirstName, row.agentLastName].filter(Boolean).join(' ').trim() ||
            row.agentEmail ||
            'Assigned agent',
          email: row.agentEmail,
          phone: row.agentPhone,
        }
      : null,
    lead: row.leadId
      ? {
          id: Number(row.leadId),
          name: row.leadName,
          email: row.leadEmail,
          phone: row.leadPhone,
          status: row.leadStatus,
          nextFollowUp: row.leadNextFollowUp,
          qualificationScore: row.leadQualificationScore == null ? null : Number(row.leadQualificationScore),
        }
      : null,
    listing: row.listingId
      ? {
          id: Number(row.listingId),
          title: row.listingTitle,
          address: row.listingAddress,
          city: row.listingCity,
          province: row.listingProvince,
          status: row.listingStatus,
        }
      : null,
    property: row.propertyId
      ? {
          id: Number(row.propertyId),
          title: row.propertyTitle,
          address: row.propertyAddress,
          city: row.propertyCity,
          province: row.propertyProvince,
          price: row.propertyPrice == null ? null : Number(row.propertyPrice),
          status: row.propertyStatus,
        }
      : null,
  };
}

async function createViewingNotification(input: {
  db: AgencyDb;
  userId?: number | null;
  event: string;
  title: string;
  content: string;
  showingId: number;
  agencyId: number;
  dedupeKey?: string;
}) {
  if (!input.userId) return;
  try {
    if (input.dedupeKey) {
      const [existing] = await input.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, input.userId),
            eq(notifications.type, 'showing_scheduled'),
            like(notifications.data, `%"dedupeKey":"${input.dedupeKey}"%`),
          ),
        )
        .limit(1);

      if (existing) return;
    }

    await input.db.insert(notifications).values({
      userId: input.userId,
      type: 'showing_scheduled',
      title: input.title,
      content: input.content,
      data: JSON.stringify({
        event: input.event,
        showingId: input.showingId,
        agencyId: input.agencyId,
        dedupeKey: input.dedupeKey || null,
      }),
      isRead: 0,
    });
  } catch (error) {
    console.warn('[agency.viewings] Notification insert skipped', error);
  }
}

async function listAgencyViewings(input: {
  db: AgencyDb;
  agencyId: number;
  status?: z.infer<typeof viewingFilterStatusSchema>;
  agentId?: number | null;
  listingId?: number | null;
  propertyId?: number | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  viewingId?: number | null;
  limit?: number;
  offset?: number;
}) {
  const viewingAgent = aliasedTable(agents, 'viewing_agent');
  const listingAgent = aliasedTable(agents, 'viewing_listing_agent');
  const listingOwner = aliasedTable(users, 'viewing_listing_owner');
  const propertyAgent = aliasedTable(agents, 'viewing_property_agent');
  const propertyOwner = aliasedTable(users, 'viewing_property_owner');
  const sourceListing = aliasedTable(listings, 'viewing_source_listing');
  const sourceListingAgent = aliasedTable(agents, 'viewing_source_listing_agent');
  const sourceListingOwner = aliasedTable(users, 'viewing_source_listing_owner');
  const creatorUser = aliasedTable(users, 'viewing_creator');

  const conditions: SQL[] = [
    eq(viewingAgent.agencyId, input.agencyId),
    or(isNull(showings.createdByUserId), eq(creatorUser.agencyId, input.agencyId))!,
    or(isNull(showings.leadId), eq(leads.agencyId, input.agencyId))!,
    or(
      isNull(showings.listingId),
      eq(listings.agencyId, input.agencyId),
      eq(listingAgent.agencyId, input.agencyId),
      eq(listingOwner.agencyId, input.agencyId),
    )!,
    or(
      isNull(showings.propertyId),
      eq(sourceListing.agencyId, input.agencyId),
      eq(sourceListingAgent.agencyId, input.agencyId),
      eq(sourceListingOwner.agencyId, input.agencyId),
      eq(propertyAgent.agencyId, input.agencyId),
      eq(propertyOwner.agencyId, input.agencyId),
      eq(leads.agencyId, input.agencyId),
    )!,
  ];

  if (input.agentId) conditions.push(eq(showings.agentId, input.agentId));
  if (input.viewingId) conditions.push(eq(showings.id, input.viewingId));
  if (input.listingId) conditions.push(eq(showings.listingId, input.listingId));
  if (input.propertyId) conditions.push(eq(showings.propertyId, input.propertyId));

  if (input.dateFrom) {
    const from = getDayBounds(input.dateFrom).startDb;
    conditions.push(sql`${showings.scheduledAt} >= ${from}`);
  }

  if (input.dateTo) {
    const to = getDayBounds(input.dateTo).endDb;
    conditions.push(sql`${showings.scheduledAt} < ${to}`);
  }

  const status = input.status || 'all';
  switch (status) {
    case 'upcoming':
      conditions.push(inArray(showings.status, ACTIVE_VIEWING_STATUSES as any));
      conditions.push(sql`${showings.scheduledAt} >= ${nowAsDbTimestamp()}`);
      break;
    case 'awaiting_confirmation':
    case 'unconfirmed':
      conditions.push(inArray(showings.status, ['requested', 'awaiting_confirmation'] as any));
      break;
    case 'feedback_required':
      conditions.push(eq(showings.status, 'completed' as any));
      conditions.push(sql`(${showings.feedback} IS NULL OR ${showings.feedback} = '')`);
      break;
    case 'confirmed':
    case 'completed':
    case 'cancelled':
    case 'no_show':
    case 'rescheduled':
      conditions.push(eq(showings.status, status as any));
      break;
    case 'all':
    default:
      break;
  }

  const search = String(input.search || '').trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(showings.visitorName, pattern),
        like(leads.name, pattern),
        like(leads.email, pattern),
        like(leads.phone, pattern),
        like(listings.title, pattern),
        like(properties.title, pattern),
      )!,
    );
  }

  const rows = await input.db
    .select({
      showing: showings,
      agentId: viewingAgent.id,
      agentUserId: viewingAgent.userId,
      agentFirstName: viewingAgent.firstName,
      agentLastName: viewingAgent.lastName,
      agentDisplayName: viewingAgent.displayName,
      agentEmail: viewingAgent.email,
      agentPhone: viewingAgent.phone,
      creatorId: creatorUser.id,
      creatorEmail: creatorUser.email,
      creatorName: creatorUser.name,
      creatorFirstName: creatorUser.firstName,
      creatorLastName: creatorUser.lastName,
      leadId: leads.id,
      leadName: leads.name,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      leadStatus: leads.status,
      leadNextFollowUp: leads.nextFollowUp,
      leadQualificationScore: leads.qualificationScore,
      listingId: listings.id,
      listingTitle: listings.title,
      listingAddress: listings.address,
      listingCity: listings.city,
      listingProvince: listings.province,
      listingStatus: listings.status,
      propertyId: properties.id,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      propertyCity: properties.city,
      propertyProvince: properties.province,
      propertyPrice: properties.price,
      propertyStatus: properties.status,
    })
    .from(showings)
    .leftJoin(viewingAgent, eq(showings.agentId, viewingAgent.id))
    .leftJoin(creatorUser, eq(showings.createdByUserId, creatorUser.id))
    .leftJoin(leads, eq(showings.leadId, leads.id))
    .leftJoin(listings, eq(showings.listingId, listings.id))
    .leftJoin(listingAgent, eq(listings.agentId, listingAgent.id))
    .leftJoin(listingOwner, eq(listings.ownerId, listingOwner.id))
    .leftJoin(properties, eq(showings.propertyId, properties.id))
    .leftJoin(propertyAgent, eq(properties.agentId, propertyAgent.id))
    .leftJoin(propertyOwner, eq(properties.ownerId, propertyOwner.id))
    .leftJoin(sourceListing, eq(properties.sourceListingId, sourceListing.id))
    .leftJoin(sourceListingAgent, eq(sourceListing.agentId, sourceListingAgent.id))
    .leftJoin(sourceListingOwner, eq(sourceListing.ownerId, sourceListingOwner.id))
    .where(and(...conditions))
    .orderBy(showings.scheduledAt)
    .limit(input.limit || 50)
    .offset(input.offset || 0);

  return rows.map(mapViewingRow);
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

export const __agencyViewingWorkflowTestHooks = {
  assertViewingTransitionAllowed,
  getViewingQueueStatus,
  mapViewingRow,
  normalizeViewingStatus,
  parseViewingFeedback,
  parseViewingNotes,
  serializeViewingNotes,
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

function insertResultId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function toDecimalString(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(value).toFixed(2);
}

function toRequiredDecimalString(value: number) {
  return Number(value || 0).toFixed(2);
}

function decimalToNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function parseOptionalDbTimestamp(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T09:00:00${AGENCY_WORKSPACE_UTC_OFFSET}`)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Date value is invalid.' });
  }

  return toDbTimestampRequired(date);
}

function futureDbTimestamp(daysFromNow: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return toDbTimestampRequired(date);
}

function normalizeOfferTerms(input: z.infer<typeof offerTermsInputSchema>) {
  return {
    amount: Number(input.amount || 0),
    depositAmount: input.depositAmount == null ? null : Number(input.depositAmount),
    financeRequired: Boolean(input.financeRequired),
    bondAmount: input.bondAmount == null ? null : Number(input.bondAmount),
    cashPortion: input.cashPortion == null ? null : Number(input.cashPortion),
    occupationDate: input.occupationDate || null,
    occupationalRent: input.occupationalRent == null ? null : Number(input.occupationalRent),
    monthlyRental: input.monthlyRental == null ? null : Number(input.monthlyRental),
    leaseDurationMonths: input.leaseDurationMonths || null,
    rentalDeposit: input.rentalDeposit == null ? null : Number(input.rentalDeposit),
    offerExpiry: input.offerExpiry || null,
    conditionsSummary: input.conditionsSummary || null,
    fixturesSummary: input.fixturesSummary || null,
    specialConditions: input.specialConditions || null,
  };
}

function offerVersionInsertValues(input: {
  agencyId: number;
  dealId: number;
  versionNumber: number;
  parentOfferVersionId?: number | null;
  actor: z.infer<typeof offerActorSchema>;
  eventType: z.infer<typeof offerEventTypeSchema>;
  status: OfferStatus;
  terms: z.infer<typeof offerTermsInputSchema>;
  userId: number;
}) {
  const terms = normalizeOfferTerms(input.terms);
  const submittedAt =
    input.status === 'submitted' || input.status === 'under_review'
      ? nowAsDbTimestamp()
      : null;

  return {
    agencyId: input.agencyId,
    dealId: input.dealId,
    parentOfferVersionId: input.parentOfferVersionId || null,
    versionNumber: input.versionNumber,
    actor: input.actor,
    eventType: input.eventType,
    status: input.status,
    amount: toRequiredDecimalString(terms.amount),
    depositAmount: toDecimalString(terms.depositAmount),
    financeRequired: terms.financeRequired ? 1 : 0,
    bondAmount: toDecimalString(terms.bondAmount),
    cashPortion: toDecimalString(terms.cashPortion),
    occupationDate: terms.occupationDate,
    occupationalRent: toDecimalString(terms.occupationalRent),
    monthlyRental: toDecimalString(terms.monthlyRental),
    leaseDurationMonths: terms.leaseDurationMonths,
    rentalDeposit: toDecimalString(terms.rentalDeposit),
    offerExpiry: parseOptionalDbTimestamp(terms.offerExpiry),
    conditionsSummary: terms.conditionsSummary,
    fixturesSummary: terms.fixturesSummary,
    specialConditions: terms.specialConditions,
    termsSnapshot: terms,
    submittedAt,
    createdByUserId: input.userId,
  } as const;
}

function calculateCommission(input: {
  acceptedAmount: number;
  basis: z.infer<typeof commissionBasisSchema>;
  percentage: number;
  fixedAmount?: number | null;
  agencySharePercentage: number;
  referralSplit: number;
  otherDeductions: number;
}) {
  const gross =
    input.basis === 'fixed'
      ? Number(input.fixedAmount || 0)
      : (input.acceptedAmount * Number(input.percentage || 0)) / 100;
  const referralSplit = Number(input.referralSplit || 0);
  const otherDeductions = Number(input.otherDeductions || 0);
  const expected = Math.max(gross - referralSplit - otherDeductions, 0);
  const agencyShare = expected * (Number(input.agencySharePercentage || 0) / 100);
  const agentShare = Math.max(expected - agencyShare, 0);

  return {
    grossCommission: Number(gross.toFixed(2)),
    agencyShare: Number(agencyShare.toFixed(2)),
    agentShare: Number(agentShare.toFixed(2)),
    referralSplit: Number(referralSplit.toFixed(2)),
    otherDeductions: Number(otherDeductions.toFixed(2)),
    expectedCommission: Number(expected.toFixed(2)),
  };
}

function workflowTemplates(transactionType: DealTransactionType) {
  if (transactionType === 'rental') {
    return {
      stage: 'application_submitted',
      nextAction: 'Complete tenant screening',
      milestones: [
        ['application_submitted', 'Application submitted', 'agency', 0, 'completed'],
        ['screening', 'Screening', 'agency', 2, 'pending'],
        ['approved', 'Approval decision', 'landlord', 3, 'pending'],
        ['deposit_due', 'Deposit and first payment due', 'tenant', 5, 'pending'],
        ['lease_prepared', 'Lease prepared', 'agency', 6, 'pending'],
        ['lease_signed', 'Lease signed', 'tenant', 7, 'pending'],
        ['incoming_inspection', 'Incoming inspection', 'agency', 9, 'pending'],
        ['occupation', 'Keys and occupation', 'tenant', 10, 'pending'],
        ['complete', 'Complete', 'agency', 11, 'pending'],
      ] as const,
      conditions: [
        ['Tenant screening', 'Screening must be completed before approval.', 'agency', 2],
        ['Deposit and first payment', 'Deposit and first payment must be confirmed.', 'tenant', 5],
        ['Lease signed', 'Signed lease must be stored privately on the transaction.', 'tenant', 7],
        ['Incoming inspection', 'Inspection record must be completed before occupation.', 'agency', 9],
      ] as const,
    };
  }

  return {
    stage: 'offer_accepted',
    nextAction: 'Collect signed offer and deposit confirmation',
    milestones: [
      ['offer_accepted', 'Offer accepted', 'agency', 0, 'completed'],
      ['deposit_due', 'Deposit due', 'buyer', 3, 'pending'],
      ['bond_application', 'Bond application', 'buyer', 5, 'pending'],
      ['bond_approval', 'Bond approval', 'bond_originator', 21, 'pending'],
      ['suspensive_conditions', 'Suspensive conditions fulfilled', 'agency', 30, 'pending'],
      ['conveyancer_instructed', 'Conveyancer instructed', 'seller', 5, 'pending'],
      ['compliance_documents', 'Compliance and documents', 'seller', 35, 'pending'],
      ['transfer_documents_signed', 'Transfer documents signed', 'conveyancer', 45, 'pending'],
      ['lodgement', 'Lodgement', 'conveyancer', 75, 'pending'],
      ['registration', 'Registration', 'conveyancer', 90, 'pending'],
      ['commission_payable', 'Commission payable', 'agency', 91, 'pending'],
    ] as const,
    conditions: [
      ['Signed offer document', 'Signed offer must be uploaded to the private transaction.', 'agency', 1],
      ['Deposit payment', 'Deposit payment must be confirmed by the due date.', 'buyer', 3],
      ['Bond approval', 'Bond approval must be recorded if finance is required.', 'buyer', 21],
      ['FICA documents', 'Required FICA documents must be collected privately.', 'buyer', 7],
    ] as const,
  };
}

function mapDealLead(lead?: typeof leads.$inferSelect | null) {
  return lead
    ? {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
      }
    : null;
}

function mapDealListing(listing?: Partial<typeof listings.$inferSelect> | null) {
  return listing
    ? {
        id: listing.id,
        title: listing.title,
        action: listing.action,
        city: listing.city,
        province: listing.province,
        askingPrice: decimalToNumber(listing.askingPrice),
        monthlyRent: decimalToNumber(listing.monthlyRent),
        status: listing.status,
      }
    : null;
}

function mapDealProperty(property?: Partial<typeof properties.$inferSelect> | null) {
  return property
    ? {
        id: property.id,
        title: property.title,
        city: property.city,
        province: property.province,
        price: decimalToNumber(property.price),
        status: property.status,
      }
    : null;
}

function mapDealAgent(agent?: Partial<typeof agents.$inferSelect> | null) {
  return agent
    ? {
        id: agent.id,
        userId: agent.userId,
        name: getAgentDisplayName(agent) || 'Assigned agent',
        email: agent.email,
        phone: agent.phone,
      }
    : null;
}

function mapOfferVersion(offer: typeof agencyDealOfferVersions.$inferSelect) {
  return {
    ...offer,
    amount: decimalToNumber(offer.amount),
    depositAmount: offer.depositAmount == null ? null : decimalToNumber(offer.depositAmount),
    bondAmount: offer.bondAmount == null ? null : decimalToNumber(offer.bondAmount),
    cashPortion: offer.cashPortion == null ? null : decimalToNumber(offer.cashPortion),
    occupationalRent:
      offer.occupationalRent == null ? null : decimalToNumber(offer.occupationalRent),
    monthlyRental: offer.monthlyRental == null ? null : decimalToNumber(offer.monthlyRental),
    rentalDeposit: offer.rentalDeposit == null ? null : decimalToNumber(offer.rentalDeposit),
    financeRequired: Boolean(offer.financeRequired),
  };
}

function mapTransaction(transaction: typeof agencyTransactions.$inferSelect) {
  return {
    ...transaction,
    acceptedAmount: decimalToNumber(transaction.acceptedAmount),
    commissionPercentage: decimalToNumber(transaction.commissionPercentage),
    commissionFixedAmount:
      transaction.commissionFixedAmount == null
        ? null
        : decimalToNumber(transaction.commissionFixedAmount),
    grossCommission: decimalToNumber(transaction.grossCommission),
    agencyShare: decimalToNumber(transaction.agencyShare),
    agentShare: decimalToNumber(transaction.agentShare),
    referralSplit: decimalToNumber(transaction.referralSplit),
    otherDeductions: decimalToNumber(transaction.otherDeductions),
    expectedCommission: decimalToNumber(transaction.expectedCommission),
  };
}

function mapWorkItem<T extends { dueAt?: string | null; status?: string | null }>(item: T) {
  return {
    ...item,
    overdue:
      item.dueAt && !['completed', 'waived', 'cancelled'].includes(String(item.status || ''))
        ? new Date(item.dueAt).getTime() < Date.now()
        : false,
  };
}

async function requireAgencyDeal(db: AgencyDb, agencyId: number, dealId: number) {
  const [deal] = await db
    .select()
    .from(agencyDeals)
    .where(and(eq(agencyDeals.id, dealId), eq(agencyDeals.agencyId, agencyId)))
    .limit(1);

  if (!deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Deal not found' });
  }

  return deal;
}

async function requireAgencyOfferVersion(
  db: AgencyDb,
  agencyId: number,
  offerVersionId: number,
) {
  const [row] = await db
    .select({ offer: agencyDealOfferVersions, deal: agencyDeals })
    .from(agencyDealOfferVersions)
    .innerJoin(agencyDeals, eq(agencyDealOfferVersions.dealId, agencyDeals.id))
    .where(
      and(
        eq(agencyDealOfferVersions.id, offerVersionId),
        eq(agencyDealOfferVersions.agencyId, agencyId),
        eq(agencyDeals.agencyId, agencyId),
      ),
    )
    .limit(1);

  if (!row?.offer || !row.deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer version not found' });
  }

  return row;
}

async function requireAgencyTransaction(
  db: AgencyDb,
  agencyId: number,
  transactionId: number,
) {
  const [transaction] = await db
    .select()
    .from(agencyTransactions)
    .where(and(eq(agencyTransactions.id, transactionId), eq(agencyTransactions.agencyId, agencyId)))
    .limit(1);

  if (!transaction) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
  }

  return transaction;
}

async function getExistingTransactionForDeal(db: AgencyDb, agencyId: number, dealId: number) {
  const [transaction] = await db
    .select()
    .from(agencyTransactions)
    .where(and(eq(agencyTransactions.dealId, dealId), eq(agencyTransactions.agencyId, agencyId)))
    .limit(1);

  return transaction || null;
}

async function getNextOfferVersionNumber(db: AgencyDb, agencyId: number, dealId: number) {
  const [row] = await db
    .select({ maxVersion: sql<number>`MAX(${agencyDealOfferVersions.versionNumber})` })
    .from(agencyDealOfferVersions)
    .where(
      and(eq(agencyDealOfferVersions.dealId, dealId), eq(agencyDealOfferVersions.agencyId, agencyId)),
    );

  return Number(row?.maxVersion || 0) + 1;
}

async function resolveDealContext(input: {
  db: AgencyDb;
  agencyId: number;
  user: ReturnType<typeof requireUser>;
  leadId: number;
  sourceViewingId?: number | null;
  listingId?: number | null;
  propertyId?: number | null;
  responsibleAgentId?: number | null;
}) {
  const { db, agencyId, user } = input;
  const lead = await requireAgencyLead(db, user, input.leadId);
  let listingId = input.listingId || null;
  let propertyId = input.propertyId || lead.propertyId || null;
  let responsibleAgentId = input.responsibleAgentId || lead.agentId || null;
  let sourceViewing: typeof showings.$inferSelect | null = null;

  if (input.sourceViewingId) {
    const viewing = await requireAgencyViewing(db, agencyId, input.sourceViewingId);
    sourceViewing = viewing;
    if (normalizeViewingStatus(viewing.status) !== 'completed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'A source viewing must be completed before it can start an offer.',
      });
    }
    if (viewing.leadId && Number(viewing.leadId) !== input.leadId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Source viewing belongs to a different lead.',
      });
    }
    listingId = listingId || viewing.listingId || null;
    propertyId = propertyId || viewing.propertyId || null;
    responsibleAgentId = responsibleAgentId || viewing.agentId || null;
  }

  if (listingId) await requireAgencyListing(db, agencyId, listingId);
  if (propertyId) await requireAgencyProperty(db, agencyId, propertyId);
  const responsibleAgent = responsibleAgentId
    ? await requireAgencyAgent(db, agencyId, responsibleAgentId)
    : lead.agentId
      ? await requireAgencyAgent(db, agencyId, lead.agentId)
      : null;

  if (!responsibleAgent) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Assign a responsible agency agent before opening offer work.',
    });
  }

  return {
    lead,
    sourceViewing,
    listingId,
    propertyId,
    responsibleAgent,
  };
}

async function createTransactionActivity(input: {
  db: AgencyDb;
  agencyId: number;
  transactionId: number;
  userId: number;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await input.db.insert(agencyTransactionActivity).values({
    agencyId: input.agencyId,
    transactionId: input.transactionId,
    actorUserId: input.userId,
    eventType: input.eventType,
    description: input.description,
    metadata: input.metadata || null,
  });
}

async function recomputeTransactionNextStep(db: AgencyDb, agencyId: number, transactionId: number) {
  const [condition] = await db
    .select()
    .from(agencyTransactionConditions)
    .where(
      and(
        eq(agencyTransactionConditions.agencyId, agencyId),
        eq(agencyTransactionConditions.transactionId, transactionId),
        inArray(agencyTransactionConditions.status, ['pending', 'in_progress', 'blocked'] as any),
      ),
    )
    .orderBy(agencyTransactionConditions.dueAt)
    .limit(1);

  const [milestone] = await db
    .select()
    .from(agencyTransactionMilestones)
    .where(
      and(
        eq(agencyTransactionMilestones.agencyId, agencyId),
        eq(agencyTransactionMilestones.transactionId, transactionId),
        inArray(agencyTransactionMilestones.status, ['pending', 'in_progress', 'blocked'] as any),
      ),
    )
    .orderBy(agencyTransactionMilestones.dueAt)
    .limit(1);

  const candidates = [
    condition
      ? {
          title: condition.title,
          dueAt: condition.dueAt,
          risk: condition.status === 'blocked' ? 'blocked' : 'watch',
        }
      : null,
    milestone
      ? {
          title: milestone.title,
          dueAt: milestone.dueAt,
          risk: milestone.status === 'blocked' ? 'blocked' : 'watch',
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; dueAt?: string | null; risk: string }>;

  candidates.sort((a, b) => {
    const left = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const right = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return left - right;
  });

  const next = candidates[0] || null;
  const overdue = next?.dueAt ? new Date(next.dueAt).getTime() < Date.now() : false;
  const riskStatus = next ? (overdue ? 'at_risk' : next.risk) : 'on_track';

  await db
    .update(agencyTransactions)
    .set({
      nextAction: next?.title || 'Review transaction progress',
      nextDeadline: next?.dueAt || null,
      riskStatus: riskStatus as any,
      updatedAt: nowAsDbTimestamp(),
    })
    .where(and(eq(agencyTransactions.id, transactionId), eq(agencyTransactions.agencyId, agencyId)));

  const [updated] = await db
    .select()
    .from(agencyTransactions)
    .where(and(eq(agencyTransactions.id, transactionId), eq(agencyTransactions.agencyId, agencyId)))
    .limit(1);

  return updated;
}

async function getDealWorkspaceRows(input: {
  db: AgencyDb;
  agencyId: number;
  limit: number;
  dealId?: number;
}) {
  const baseConditions = [eq(agencyDeals.agencyId, input.agencyId)];
  if (input.dealId) baseConditions.push(eq(agencyDeals.id, input.dealId));

  const rows = await input.db
    .select({
      deal: agencyDeals,
      lead: leads,
      listing: listings,
      property: properties,
      agent: agents,
    })
    .from(agencyDeals)
    .leftJoin(leads, eq(agencyDeals.leadId, leads.id))
    .leftJoin(listings, eq(agencyDeals.listingId, listings.id))
    .leftJoin(properties, eq(agencyDeals.propertyId, properties.id))
    .leftJoin(agents, eq(agencyDeals.responsibleAgentId, agents.id))
    .where(and(...baseConditions))
    .orderBy(desc(agencyDeals.updatedAt))
    .limit(input.limit);

  const dealIds = rows.map(row => row.deal.id);
  if (!dealIds.length) return [];

  const offerRows = await input.db
    .select()
    .from(agencyDealOfferVersions)
    .where(
      and(
        eq(agencyDealOfferVersions.agencyId, input.agencyId),
        inArray(agencyDealOfferVersions.dealId, dealIds),
      ),
    )
    .orderBy(asc(agencyDealOfferVersions.versionNumber));

  const transactionRows = await input.db
    .select()
    .from(agencyTransactions)
    .where(
      and(eq(agencyTransactions.agencyId, input.agencyId), inArray(agencyTransactions.dealId, dealIds)),
    );
  const transactionIds = transactionRows.map(transaction => transaction.id);

  const [milestoneRows, conditionRows, partyRows, documentRows, activityRows] = transactionIds.length
    ? await Promise.all([
        input.db
          .select()
          .from(agencyTransactionMilestones)
          .where(
            and(
              eq(agencyTransactionMilestones.agencyId, input.agencyId),
              inArray(agencyTransactionMilestones.transactionId, transactionIds),
            ),
          )
          .orderBy(asc(agencyTransactionMilestones.sequence)),
        input.db
          .select()
          .from(agencyTransactionConditions)
          .where(
            and(
              eq(agencyTransactionConditions.agencyId, input.agencyId),
              inArray(agencyTransactionConditions.transactionId, transactionIds),
            ),
          )
          .orderBy(asc(agencyTransactionConditions.dueAt)),
        input.db
          .select()
          .from(agencyTransactionParties)
          .where(
            and(
              eq(agencyTransactionParties.agencyId, input.agencyId),
              inArray(agencyTransactionParties.transactionId, transactionIds),
            ),
          ),
        input.db
          .select()
          .from(agencyTransactionDocuments)
          .where(
            and(
              eq(agencyTransactionDocuments.agencyId, input.agencyId),
              inArray(agencyTransactionDocuments.transactionId, transactionIds),
            ),
          )
          .orderBy(desc(agencyTransactionDocuments.uploadedAt)),
        input.db
          .select()
          .from(agencyTransactionActivity)
          .where(
            and(
              eq(agencyTransactionActivity.agencyId, input.agencyId),
              inArray(agencyTransactionActivity.transactionId, transactionIds),
            ),
          )
          .orderBy(desc(agencyTransactionActivity.createdAt)),
      ])
    : [[], [], [], [], []];

  const offersByDeal = new Map<number, typeof offerRows>();
  offerRows.forEach(offer => {
    offersByDeal.set(offer.dealId, [...(offersByDeal.get(offer.dealId) || []), offer]);
  });

  const transactionByDeal = new Map<number, typeof agencyTransactions.$inferSelect>();
  transactionRows.forEach(transaction => {
    transactionByDeal.set(transaction.dealId, transaction);
  });
  const milestonesByTransaction = new Map<number, typeof milestoneRows>();
  milestoneRows.forEach(milestone => {
    milestonesByTransaction.set(milestone.transactionId, [
      ...(milestonesByTransaction.get(milestone.transactionId) || []),
      milestone,
    ]);
  });
  const conditionsByTransaction = new Map<number, typeof conditionRows>();
  conditionRows.forEach(condition => {
    conditionsByTransaction.set(condition.transactionId, [
      ...(conditionsByTransaction.get(condition.transactionId) || []),
      condition,
    ]);
  });
  const partiesByTransaction = new Map<number, typeof partyRows>();
  partyRows.forEach(party => {
    partiesByTransaction.set(party.transactionId, [
      ...(partiesByTransaction.get(party.transactionId) || []),
      party,
    ]);
  });
  const documentsByTransaction = new Map<number, typeof documentRows>();
  documentRows.forEach(document => {
    documentsByTransaction.set(document.transactionId, [
      ...(documentsByTransaction.get(document.transactionId) || []),
      document,
    ]);
  });
  const activityByTransaction = new Map<number, typeof activityRows>();
  activityRows.forEach(activity => {
    activityByTransaction.set(activity.transactionId, [
      ...(activityByTransaction.get(activity.transactionId) || []),
      activity,
    ]);
  });

  return rows.map(row => {
    const offersForDeal = offersByDeal.get(row.deal.id) || [];
    const latestOffer = offersForDeal[offersForDeal.length - 1] || null;
    const transaction = transactionByDeal.get(row.deal.id) || null;
    const transactionId = transaction?.id || 0;

    return {
      ...row.deal,
      acceptedAmount:
        row.deal.acceptedAmount == null ? null : decimalToNumber(row.deal.acceptedAmount),
      lead: mapDealLead(row.lead),
      listing: mapDealListing(row.listing),
      property: mapDealProperty(row.property),
      agent: mapDealAgent(row.agent),
      offers: offersForDeal.map(mapOfferVersion),
      latestOffer: latestOffer ? mapOfferVersion(latestOffer) : null,
      transaction: transaction
        ? {
            ...mapTransaction(transaction),
            milestones: (milestonesByTransaction.get(transactionId) || []).map(mapWorkItem),
            conditions: (conditionsByTransaction.get(transactionId) || []).map(mapWorkItem),
            parties: partiesByTransaction.get(transactionId) || [],
            documents: documentsByTransaction.get(transactionId) || [],
            activity: activityByTransaction.get(transactionId) || [],
          }
        : null,
    };
  });
}

export const __agencyDealEngineTestHooks = {
  calculateCommission,
  normalizeOfferTerms,
  workflowTemplates,
};

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
                inArray(showings.status, ACTIVE_VIEWING_STATUSES as any),
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
      const principalPhone = input.basicInfo.phone?.trim();
      await db
        .update(users)
        .set({
          agencyId,
          role: 'agency_admin',
          ...(principalPhone ? { phone: principalPhone } : {}),
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
          token: randomBytes(32).toString('hex'),
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
  getLeads: agentProcedure
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

      if (user.role === 'agent') {
        conditions.push(eq(agents.userId, user.id));
      }

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
          firstResponseOverdue: firstResponseOverdueSql(),
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .leftJoin(agents, eq(leads.agentId, agents.id))
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(filters.limit);

      return rows.map(({ lead, property, agent, firstResponseOverdue }) => ({
        ...decorateLeadForWorkspace(lead, { firstResponseOverdue: Boolean(firstResponseOverdue) }),
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
  updateLeadStatus: agentProcedure
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
      const agencyId = requireAgencyId(user);
      const lead = await requireAgencyLead(db, user, input.leadId);
      assertLeadTransitionAllowed(lead, input.status, { lostReason: input.lostReason });
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          status: input.status,
          updatedAt: now,
          nextAction:
            input.status === 'lost' || input.status === 'converted' || input.status === 'closed'
              ? null
              : lead.nextAction || getNextLeadAction({ ...lead, status: input.status, nextAction: null } as any),
          lastContactedAt:
            input.status === 'contacted' || input.status === 'qualified'
              ? now
              : lead.lastContactedAt,
          firstRespondedAt:
            (input.status === 'contacted' || input.status === 'qualified') && !lead.firstRespondedAt
              ? now
              : lead.firstRespondedAt,
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

  getLeadDetail: agentProcedure
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

      const [firstResponseState] = await db
        .select({ firstResponseOverdue: firstResponseOverdueSql() })
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)))
        .limit(1);

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
        ...decorateLeadForWorkspace(lead, {
          firstResponseOverdue: Boolean(firstResponseState?.firstResponseOverdue),
        }),
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
        activities: activities.map(decorateLeadActivity),
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
      const agencyId = requireAgencyId(user);

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

  addLeadNote: agentProcedure
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

  recordLeadContactAttempt: agentProcedure
    .input(
      z
        .object({
          leadId: z.number().int().positive(),
          channel: leadContactChannelSchema,
          outcome: leadContactOutcomeSchema,
          summary: z.string().trim().min(1).max(2000),
          nextAction: z.string().trim().max(255).optional(),
          nextFollowUp: z.string().trim().min(1).optional().nullable(),
        })
        .superRefine((input, context) => {
          const terminalOutcome = ['not_interested', 'invalid_contact'].includes(input.outcome);
          if (!terminalOutcome && !input.nextAction) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nextAction'],
              message: 'Record the next action for every active buyer lead.',
            });
          }
          if (input.outcome === 'follow_up_required' && !input.nextFollowUp) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nextFollowUp'],
              message: 'Schedule the required follow-up.',
            });
          }
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
      const parsedFollowUp = input.nextFollowUp ? new Date(input.nextFollowUp) : null;
      if (parsedFollowUp && Number.isNaN(parsedFollowUp.getTime())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Follow-up date is invalid.' });
      }
      const nextFollowUp = parsedFollowUp ? toDbTimestampRequired(parsedFollowUp) : null;
      const terminalOutcome = ['not_interested', 'invalid_contact'].includes(input.outcome);
      const reached = ['reached', 'replied', 'viewing_booked'].includes(input.outcome);
      const recordedAt = sql`NOW()`;
      const nextStatus: LeadStatus = terminalOutcome
        ? 'lost'
        : input.outcome === 'viewing_booked'
          ? 'viewing_scheduled'
          : reached || input.outcome === 'follow_up_required' || input.outcome === 'no_answer' || input.outcome === 'voicemail'
            ? 'contacted'
            : (lead.status as LeadStatus);
      const nextAction = terminalOutcome ? null : input.nextAction || null;

      await db.transaction(async (tx: any) => {
        await tx
          .update(leads)
          .set({
            status: nextStatus,
            nextFollowUp: terminalOutcome ? null : nextFollowUp,
            nextAction,
            firstRespondedAt: lead.firstRespondedAt || recordedAt,
            lastContactedAt: recordedAt,
            lostReason:
              terminalOutcome
                ? input.outcome === 'not_interested'
                  ? 'Buyer not interested'
                  : 'Invalid buyer contact details'
                : lead.lostReason,
            updatedAt: recordedAt,
            funnelStage: mapStatusToFunnelStage(nextStatus, lead.funnelStage) as any,
          })
          .where(and(eq(leads.id, lead.id), eq(leads.agencyId, agencyId)));
        await tx.insert(leadActivities).values({
          leadId: lead.id,
          userId: user.id,
          type: 'contact_attempt',
          description: input.summary,
          metadata: JSON.stringify({
            channel: input.channel,
            outcome: input.outcome,
            previousStatus: lead.status,
            nextStatus,
            nextAction,
            nextFollowUp: terminalOutcome ? null : nextFollowUp,
          }),
        });
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_contact_attempt_recorded',
        targetType: 'lead',
        targetId: lead.id,
        metadata: {
          agencyId,
          channel: input.channel,
          outcome: input.outcome,
          previousStatus: lead.status,
          nextStatus,
        },
        req: ctx.req,
      });

      return { success: true, status: nextStatus, nextAction };
    }),

  setLeadFollowUp: agentProcedure
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
          nextAction: input.note || 'Complete scheduled buyer follow-up',
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

  completeLeadFollowUp: agentProcedure
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
      const lead = await requireAgencyLead(db, user, input.leadId);
      const now = nowAsDbTimestamp();

      await db
        .update(leads)
        .set({
          nextFollowUp: null,
          nextAction: 'Record buyer outcome and schedule the next action',
          firstRespondedAt: lead.firstRespondedAt || now,
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

  scheduleLeadViewing: agentProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        agentId: z.number().int().positive().optional(),
        listingId: z.number().int().positive().optional(),
        propertyId: z.number().int().positive().optional(),
        scheduledAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240).default(45),
        status: z.enum(['requested', 'awaiting_confirmation', 'confirmed']).default('confirmed'),
        location: z.string().trim().max(500).optional(),
        instructions: z.string().trim().max(1000).optional(),
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
      const agencyId = requireAgencyId(user);

      const lead = await requireAgencyLead(db, user, input.leadId);
      const showingDate = assertViewingDateAllowed(input.scheduledAt);

      const showingAgentId = input.agentId || lead.agentId;
      if (!showingAgentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Assign an agency agent before scheduling a viewing.',
        });
      }

      const showingAgent = await requireAgencyAgent(db, agencyId, showingAgentId);
      const inventory = await resolveViewingInventory({
        db,
        agencyId,
        lead,
        listingId: input.listingId,
        propertyId: input.propertyId,
      });
      const scheduledAt = toDbTimestampRequired(showingDate);
      const now = nowAsDbTimestamp();

      assertLeadTransitionAllowed(lead, 'viewing_scheduled');
      let showingId = 0;
      await db.transaction(async tx => {
        const [result] = await tx.insert(showings).values({
          listingId: inventory.listingId,
          propertyId: inventory.propertyId,
          leadId: lead.id,
          agentId: showingAgent.id,
          scheduledAt,
          status: input.status,
          createdByUserId: user.id,
          visitorName: lead.name,
          durationMinutes: input.durationMinutes,
          notes: serializeViewingNotes({
            notes: input.notes,
            location: input.location,
            instructions: input.instructions,
          }),
        });
        showingId = Number(result.insertId || 0);

        await tx
          .update(leads)
          .set({
            agentId: showingAgent.id,
            assignedTo: showingAgent.userId || lead.assignedTo,
            assignedAt: lead.assignedAt || now,
            status: 'viewing_scheduled',
            funnelStage: 'viewing',
            updatedAt: now,
          })
          .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)));

        await tx.insert(leadActivities).values({
          leadId: input.leadId,
          userId: user.id,
          type: 'meeting',
          description: `Viewing ${input.status} for ${scheduledAt}.`,
        });
      });

      await createViewingNotification({
        db,
        userId: showingAgent.userId,
        event: 'viewing_booked',
        title: input.status === 'confirmed' ? 'Viewing confirmed' : 'Viewing needs confirmation',
        content: `${lead.name} is scheduled for ${scheduledAt}.`,
        showingId,
        agencyId,
        dedupeKey: `viewing:${showingId}:created`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.lead_viewing_scheduled',
        targetType: 'lead',
        targetId: input.leadId,
        metadata: {
          agencyId,
          showingId,
          scheduledAt,
          agentId: showingAgent.id,
        },
        req: ctx.req,
      });

      return { success: true, showingId };
    }),

  getViewings: agentProcedure
    .input(
      z
        .object({
          status: viewingFilterStatusSchema.default('upcoming'),
          agentId: z.number().int().positive().optional(),
          listingId: z.number().int().positive().optional(),
          propertyId: z.number().int().positive().optional(),
          search: z.string().trim().max(120).optional(),
          dateFrom: z.string().trim().optional(),
          dateTo: z.string().trim().optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const filters = input || { status: 'upcoming' as const, limit: 50, offset: 0 };

      if (filters.agentId) {
        await requireAgencyAgent(db, agencyId, filters.agentId);
      }
      if (filters.listingId) {
        await requireAgencyListing(db, agencyId, filters.listingId);
      }
      if (filters.propertyId) {
        await requireAgencyProperty(db, agencyId, filters.propertyId);
      }

      const viewings = await listAgencyViewings({
        db,
        agencyId,
        status: filters.status,
        agentId: filters.agentId,
        listingId: filters.listingId,
        propertyId: filters.propertyId,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: filters.limit,
        offset: filters.offset,
      });

      return {
        viewings,
        limit: filters.limit,
        offset: filters.offset,
      };
    }),

  getViewingDetail: agentProcedure
    .input(z.object({ viewingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const showing = await requireAgencyViewing(db, agencyId, input.viewingId);
      const [viewing] = await listAgencyViewings({
        db,
        agencyId,
        viewingId: input.viewingId,
        status: 'all',
        limit: 1,
      });

      const activities = showing.leadId
        ? await db
            .select()
            .from(leadActivities)
            .where(eq(leadActivities.leadId, showing.leadId))
            .orderBy(desc(leadActivities.createdAt))
            .limit(30)
        : [];

      return {
        ...viewing,
        activities: activities.map(decorateLeadActivity),
        lifecycle: {
          allowedNextStatuses: VIEWING_TRANSITIONS[normalizeViewingStatus(showing.status)] || [],
        },
      };
    }),

  createViewing: agentProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        listingId: z.number().int().positive().optional(),
        propertyId: z.number().int().positive().optional(),
        agentId: z.number().int().positive(),
        scheduledAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240).default(45),
        status: z.enum(['requested', 'awaiting_confirmation', 'confirmed']).default('awaiting_confirmation'),
        location: z.string().trim().max(500).optional(),
        instructions: z.string().trim().max(1000).optional(),
        notes: z.string().trim().max(1000).optional(),
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
      const showingAgent = await requireAgencyAgent(db, agencyId, input.agentId);
      const showingDate = assertViewingDateAllowed(input.scheduledAt);
      const scheduledAt = toDbTimestampRequired(showingDate);
      const inventory = await resolveViewingInventory({
        db,
        agencyId,
        lead,
        listingId: input.listingId,
        propertyId: input.propertyId,
      });
      const now = nowAsDbTimestamp();

      assertLeadTransitionAllowed(lead, 'viewing_scheduled');
      let viewingId = 0;
      await db.transaction(async tx => {
        const [result] = await tx.insert(showings).values({
          listingId: inventory.listingId,
          propertyId: inventory.propertyId,
          leadId: lead.id,
          agentId: showingAgent.id,
          scheduledAt,
          status: input.status,
          createdByUserId: user.id,
          visitorName: lead.name,
          durationMinutes: input.durationMinutes,
          notes: serializeViewingNotes({
            notes: input.notes,
            location: input.location,
            instructions: input.instructions,
          }),
        });
        viewingId = Number(result.insertId || 0);

        await tx
          .update(leads)
          .set({
            agentId: showingAgent.id,
            assignedTo: showingAgent.userId || lead.assignedTo,
            assignedAt: lead.assignedAt || now,
            status: 'viewing_scheduled',
            funnelStage: 'viewing',
            updatedAt: now,
          })
          .where(and(eq(leads.id, input.leadId), eq(leads.agencyId, agencyId)));

        await tx.insert(leadActivities).values({
          leadId: input.leadId,
          userId: user.id,
          type: 'meeting',
          description: `Viewing ${input.status} for ${scheduledAt}.`,
        });
      });

      await createViewingNotification({
        db,
        userId: showingAgent.userId,
        event: 'viewing_booked',
        title: input.status === 'confirmed' ? 'Viewing confirmed' : 'Viewing needs confirmation',
        content: `${lead.name} is scheduled for ${scheduledAt}.`,
        showingId: viewingId,
        agencyId,
        dedupeKey: `viewing:${viewingId}:created`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.viewing_created',
        targetType: 'showing',
        targetId: viewingId,
        metadata: {
          agencyId,
          leadId: lead.id,
          listingId: inventory.listingId,
          propertyId: inventory.propertyId,
          agentId: showingAgent.id,
          scheduledAt,
          status: input.status,
        },
        req: ctx.req,
      });

      return { success: true, viewingId };
    }),

  updateViewingStatus: agentProcedure
    .input(
      z.object({
        viewingId: z.number().int().positive(),
        status: viewingStatusSchema,
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
      const viewing = await requireAgencyViewing(db, agencyId, input.viewingId);
      const currentStatus = normalizeViewingStatus(viewing.status);
      if (currentStatus === input.status) {
        return { success: true, idempotent: true };
      }

      assertViewingTransitionAllowed(viewing.status, input.status);
      const now = nowAsDbTimestamp();

      await db.transaction(async tx => {
        await tx
          .update(showings)
          .set({
            status: input.status,
            updatedAt: now,
          })
          .where(eq(showings.id, input.viewingId));

        if (viewing.leadId) {
          await tx.insert(leadActivities).values({
            leadId: viewing.leadId,
            userId: user.id,
            type: input.status === 'completed' ? 'meeting' : 'status_change',
            description: input.note || `Viewing moved to ${input.status}.`,
          });
        }
      });

      await createViewingNotification({
        db,
        userId: viewing.agentId ? (await requireAgencyAgent(db, agencyId, viewing.agentId)).userId : null,
        event: `viewing_${input.status}`,
        title: `Viewing ${input.status.replace(/_/g, ' ')}`,
        content: input.note || `Viewing #${input.viewingId} moved to ${input.status}.`,
        showingId: input.viewingId,
        agencyId,
        dedupeKey: `viewing:${input.viewingId}:status:${input.status}`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.viewing_status_update',
        targetType: 'showing',
        targetId: input.viewingId,
        metadata: {
          agencyId,
          previousStatus: currentStatus,
          nextStatus: input.status,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  rescheduleViewing: agentProcedure
    .input(
      z.object({
        viewingId: z.number().int().positive(),
        scheduledAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240).optional(),
        status: z.enum(['rescheduled', 'awaiting_confirmation', 'confirmed']).default('rescheduled'),
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
      const viewing = await requireAgencyViewing(db, agencyId, input.viewingId);
      const currentStatus = normalizeViewingStatus(viewing.status);
      const nextStatus = input.status;
      assertViewingTransitionAllowed(viewing.status, 'rescheduled');
      if (nextStatus !== 'rescheduled') {
        assertViewingTransitionAllowed('rescheduled', nextStatus);
      }
      const scheduledAt = toDbTimestampRequired(assertViewingDateAllowed(input.scheduledAt));
      const durationMinutes = input.durationMinutes || viewing.durationMinutes;
      const now = nowAsDbTimestamp();
      if (
        viewing.scheduledAt === scheduledAt &&
        Number(viewing.durationMinutes || 30) === Number(durationMinutes || 30) &&
        currentStatus === nextStatus
      ) {
        return { success: true, idempotent: true };
      }

      const notes = appendViewingRescheduleHistory(viewing.notes, {
        previousScheduledAt: viewing.scheduledAt || null,
        nextScheduledAt: scheduledAt,
        previousStatus: currentStatus,
        nextStatus,
        rescheduledAt: now,
        rescheduledByUserId: user.id,
        note: input.note || null,
      });

      await db.transaction(async tx => {
        await tx
          .update(showings)
          .set({
            scheduledAt,
            durationMinutes,
            status: nextStatus,
            notes,
            updatedAt: now,
          })
          .where(eq(showings.id, input.viewingId));

        if (viewing.leadId) {
          await tx.insert(leadActivities).values({
            leadId: viewing.leadId,
            userId: user.id,
            type: 'meeting',
            description:
              input.note ||
              `Viewing rescheduled from ${viewing.scheduledAt || 'unscheduled'} to ${scheduledAt}.`,
          });
        }
      });

      await createViewingNotification({
        db,
        userId: viewing.agentId ? (await requireAgencyAgent(db, agencyId, viewing.agentId)).userId : null,
        event: 'viewing_rescheduled',
        title: nextStatus === 'confirmed' ? 'Viewing rescheduled and confirmed' : 'Viewing rescheduled',
        content: input.note || `Viewing moved to ${scheduledAt}.`,
        showingId: input.viewingId,
        agencyId,
        dedupeKey: `viewing:${input.viewingId}:rescheduled:${scheduledAt}:${nextStatus}`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.viewing_rescheduled',
        targetType: 'showing',
        targetId: input.viewingId,
        metadata: {
          agencyId,
          previousScheduledAt: viewing.scheduledAt,
          nextScheduledAt: scheduledAt,
          previousStatus: currentStatus,
          nextStatus,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  reassignViewing: agentProcedure
    .input(
      z.object({
        viewingId: z.number().int().positive(),
        agentId: z.number().int().positive(),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      requireAgencyManager(user);
      const agencyId = requireAgencyId(user);
      const viewing = await requireAgencyViewing(db, agencyId, input.viewingId);
      const assignedAgent = await requireAgencyAgent(db, agencyId, input.agentId);
      const now = nowAsDbTimestamp();

      if (['completed', 'cancelled'].includes(normalizeViewingStatus(viewing.status))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Completed or cancelled viewings cannot be reassigned.',
        });
      }

      if (Number(viewing.agentId) === Number(assignedAgent.id)) {
        return { success: true, idempotent: true };
      }

      await db.transaction(async tx => {
        await tx
          .update(showings)
          .set({
            agentId: assignedAgent.id,
            updatedAt: now,
          })
          .where(eq(showings.id, input.viewingId));

        if (viewing.leadId) {
          await tx
            .update(leads)
            .set({
              agentId: assignedAgent.id,
              assignedTo: assignedAgent.userId || null,
              assignedAt: now,
              updatedAt: now,
            })
            .where(and(eq(leads.id, viewing.leadId), eq(leads.agencyId, agencyId)));

          await tx.insert(leadActivities).values({
            leadId: viewing.leadId,
            userId: user.id,
            type: 'note',
            description: input.note || `Viewing reassigned to ${getAgentDisplayName(assignedAgent)}.`,
          });
        }
      });

      await createViewingNotification({
        db,
        userId: assignedAgent.userId,
        event: 'viewing_reassigned',
        title: 'Viewing reassigned',
        content: input.note || `Viewing #${input.viewingId} has been assigned to you.`,
        showingId: input.viewingId,
        agencyId,
        dedupeKey: `viewing:${input.viewingId}:reassigned:${assignedAgent.id}`,
      });

      await logAudit({
        userId: user.id,
        action: 'agency.viewing_reassigned',
        targetType: 'showing',
        targetId: input.viewingId,
        metadata: {
          agencyId,
          previousAgentId: viewing.agentId,
          nextAgentId: assignedAgent.id,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  submitViewingFeedback: agentProcedure
    .input(
      z.object({
        viewingId: z.number().int().positive(),
        feedback: viewingFeedbackInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const viewing = await requireAgencyViewing(db, agencyId, input.viewingId);
      if (normalizeViewingStatus(viewing.status) !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Feedback can only be captured after a completed viewing.',
        });
      }

      let followUp: string | null = null;
      if (input.feedback.followUpDate) {
        const followUpDate = new Date(input.feedback.followUpDate);
        if (Number.isNaN(followUpDate.getTime())) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Follow-up date is invalid.' });
        }
        followUp = toDbTimestampRequired(followUpDate);
      }

      const feedback = serializeViewingFeedback(input.feedback, user.id);
      const now = nowAsDbTimestamp();

      await db.transaction(async tx => {
        await tx
          .update(showings)
          .set({
            feedback,
            updatedAt: now,
          })
          .where(eq(showings.id, input.viewingId));

        if (viewing.leadId) {
          await tx.insert(leadActivities).values({
            leadId: viewing.leadId,
            userId: user.id,
            type: 'note',
            description: `Viewing feedback captured: ${
              input.feedback.recommendedNextAction || 'review next action'
            }.`,
          });

          if (followUp) {
            await tx
              .update(leads)
              .set({
                nextFollowUp: followUp,
                updatedAt: now,
              })
              .where(and(eq(leads.id, viewing.leadId), eq(leads.agencyId, agencyId)));
          }
        }
      });

      await logAudit({
        userId: user.id,
        action: 'agency.viewing_feedback_saved',
        targetType: 'showing',
        targetId: input.viewingId,
        metadata: {
          agencyId,
          recommendedNextAction: input.feedback.recommendedNextAction || null,
          followUpDate: input.feedback.followUpDate || null,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  getDealWorkspace: agentProcedure
    .input(
      z
        .object({
          dealId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      return await getDealWorkspaceRows({
        db,
        agencyId,
        limit: input?.limit || 50,
        dealId: input?.dealId,
      });
    }),

  createDeal: agentProcedure
    .input(createDealInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const context = await resolveDealContext({
        db,
        agencyId,
        user,
        leadId: input.leadId,
        sourceViewingId: input.sourceViewingId,
        listingId: input.listingId,
        propertyId: input.propertyId,
        responsibleAgentId: input.responsibleAgentId,
      });

      if (['lost', 'closed'].includes(String(context.lead.status || ''))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Closed or lost leads cannot start new offer work.',
        });
      }

      const now = nowAsDbTimestamp();
      let dealId = 0;
      let offerVersionId: number | null = null;
      const stage = input.terms ? 'draft_offer' : 'interest';
      const nextAction = input.terms ? 'Submit offer to seller decision' : 'Draft offer terms';
      const nextDeadline = input.terms?.offerExpiry
        ? parseOptionalDbTimestamp(input.terms.offerExpiry)
        : null;

      await db.transaction(async tx => {
        const [dealInsert] = await tx.insert(agencyDeals).values({
          agencyId,
          leadId: context.lead.id,
          listingId: context.listingId,
          propertyId: context.propertyId,
          sourceViewingId: context.sourceViewing?.id || null,
          responsibleAgentId: context.responsibleAgent.id,
          transactionType: input.transactionType,
          stage,
          interestStatus: input.interestStatus,
          riskStatus: input.interestStatus === 'not_interested' ? 'cancelled' : 'on_track',
          nextAction,
          nextDeadline,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        } as any);
        dealId = insertResultId(dealInsert);

        if (input.terms) {
          const [offerInsert] = await tx.insert(agencyDealOfferVersions).values(
            offerVersionInsertValues({
              agencyId,
              dealId,
              versionNumber: 1,
              actor: input.transactionType === 'rental' ? 'tenant' : 'buyer',
              eventType: 'initial_offer',
              status: 'draft',
              terms: input.terms,
              userId: user.id,
            }) as any,
          );
          offerVersionId = insertResultId(offerInsert);
        }

        await tx
          .update(leads)
          .set({
            status: 'offer_sent',
            funnelStage: 'offer',
            updatedAt: now,
            lastContactedAt: context.lead.lastContactedAt || now,
          } as any)
          .where(and(eq(leads.id, context.lead.id), eq(leads.agencyId, agencyId)));

        await tx.insert(leadActivities).values({
          leadId: context.lead.id,
          userId: user.id,
          type: 'status_change',
          description:
            input.notes ||
            `Deal opened from ${context.sourceViewing ? 'completed viewing' : 'agency lead'} with ${input.interestStatus.replace(/_/g, ' ')} interest.`,
        });
      });

      await logAudit({
        userId: user.id,
        action: 'agency.deal_created',
        targetType: 'agency_deal',
        targetId: dealId,
        metadata: {
          agencyId,
          leadId: context.lead.id,
          sourceViewingId: context.sourceViewing?.id || null,
          offerVersionId,
        },
        req: ctx.req,
      });

      return { success: true, dealId, offerVersionId };
    }),

  createOfferVersion: agentProcedure
    .input(createOfferVersionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const deal = await requireAgencyDeal(db, agencyId, input.dealId);
      const existingTransaction = await getExistingTransactionForDeal(db, agencyId, deal.id);
      if (existingTransaction) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This deal already has an accepted transaction. Add transaction updates instead.',
        });
      }

      const versionNumber = await getNextOfferVersionNumber(db, agencyId, deal.id);
      const nextDeadline = input.terms.offerExpiry
        ? parseOptionalDbTimestamp(input.terms.offerExpiry)
        : deal.nextDeadline;
      let offerVersionId = 0;

      await db.transaction(async tx => {
        if (versionNumber > 1 && input.eventType.includes('counter')) {
          await tx
            .update(agencyDealOfferVersions)
            .set({ status: 'countered', updatedAt: nowAsDbTimestamp() } as any)
            .where(
              and(
                eq(agencyDealOfferVersions.agencyId, agencyId),
                eq(agencyDealOfferVersions.dealId, deal.id),
                inArray(agencyDealOfferVersions.status, ['submitted', 'under_review'] as any),
              ),
            );
        }

        const [offerInsert] = await tx.insert(agencyDealOfferVersions).values(
          offerVersionInsertValues({
            agencyId,
            dealId: deal.id,
            versionNumber,
            parentOfferVersionId: input.parentOfferVersionId,
            actor: input.actor,
            eventType: input.eventType,
            status: input.status,
            terms: input.terms,
            userId: user.id,
          }) as any,
        );
        offerVersionId = insertResultId(offerInsert);

        await tx
          .update(agencyDeals)
          .set({
            stage: input.status === 'draft' ? 'draft_offer' : 'negotiation',
            nextAction: input.status === 'draft' ? 'Submit offer version' : 'Review negotiation response',
            nextDeadline,
            updatedByUserId: user.id,
            updatedAt: nowAsDbTimestamp(),
          } as any)
          .where(and(eq(agencyDeals.id, deal.id), eq(agencyDeals.agencyId, agencyId)));

        if (deal.leadId) {
          await tx.insert(leadActivities).values({
            leadId: deal.leadId,
            userId: user.id,
            type: 'note',
            description:
              input.note ||
              `Offer V${versionNumber} recorded: ${input.eventType.replace(/_/g, ' ')}.`,
          });
        }
      });

      await logAudit({
        userId: user.id,
        action: 'agency.offer_version_created',
        targetType: 'agency_deal_offer_version',
        targetId: offerVersionId,
        metadata: { agencyId, dealId: deal.id, versionNumber, eventType: input.eventType },
        req: ctx.req,
      });

      return { success: true, offerVersionId, versionNumber };
    }),

  submitOfferVersion: agentProcedure
    .input(submitOfferInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const { offer, deal } = await requireAgencyOfferVersion(db, agencyId, input.offerVersionId);
      if (!['draft', 'countered'].includes(String(offer.status || ''))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft or countered offer versions can be submitted.',
        });
      }

      const now = nowAsDbTimestamp();
      await db.transaction(async tx => {
        await tx
          .update(agencyDealOfferVersions)
          .set({ status: 'submitted', submittedAt: now, updatedAt: now } as any)
          .where(
            and(
              eq(agencyDealOfferVersions.id, offer.id),
              eq(agencyDealOfferVersions.agencyId, agencyId),
            ),
          );
        await tx
          .update(agencyDeals)
          .set({
            stage: 'submitted',
            nextAction: 'Record seller decision or counter-offer',
            nextDeadline: offer.offerExpiry,
            updatedByUserId: user.id,
            updatedAt: now,
          } as any)
          .where(and(eq(agencyDeals.id, deal.id), eq(agencyDeals.agencyId, agencyId)));
        if (deal.leadId) {
          await tx.insert(leadActivities).values({
            leadId: deal.leadId,
            userId: user.id,
            type: 'status_change',
            description: input.note || `Offer V${offer.versionNumber} submitted for decision.`,
          });
        }
      });

      await logAudit({
        userId: user.id,
        action: 'agency.offer_submitted',
        targetType: 'agency_deal_offer_version',
        targetId: offer.id,
        metadata: { agencyId, dealId: deal.id, offerExpiry: offer.offerExpiry || null },
        req: ctx.req,
      });

      return { success: true };
    }),

  acceptOfferVersion: agentProcedure
    .input(acceptOfferInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const { offer, deal } = await requireAgencyOfferVersion(db, agencyId, input.offerVersionId);
      const existingTransaction = await getExistingTransactionForDeal(db, agencyId, deal.id);
      if (existingTransaction) {
        return {
          success: true,
          idempotent: true,
          transactionId: existingTransaction.id,
          dealId: deal.id,
        };
      }

      if (['rejected', 'withdrawn', 'expired'].includes(String(offer.status || ''))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Rejected, withdrawn, or expired offer versions cannot be accepted.',
        });
      }

      const acceptedAmount = decimalToNumber(offer.amount);
      const commission = calculateCommission({
        acceptedAmount,
        basis: input.commissionBasis,
        percentage: input.commissionPercentage,
        fixedAmount: input.commissionFixedAmount,
        agencySharePercentage: input.agencySharePercentage,
        referralSplit: input.referralSplit,
        otherDeductions: input.otherDeductions,
      });
      const template = workflowTemplates(deal.transactionType as DealTransactionType);
      const now = nowAsDbTimestamp();
      let transactionId = 0;

      await db.transaction(async tx => {
        await tx
          .update(agencyDealOfferVersions)
          .set({ status: 'superseded', updatedAt: now } as any)
          .where(
            and(
              eq(agencyDealOfferVersions.agencyId, agencyId),
              eq(agencyDealOfferVersions.dealId, deal.id),
              ne(agencyDealOfferVersions.id, offer.id),
              inArray(
                agencyDealOfferVersions.status,
                ['draft', 'submitted', 'under_review', 'countered'] as any,
              ),
            ),
          );
        await tx
          .update(agencyDealOfferVersions)
          .set({ status: 'accepted', decidedAt: now, updatedAt: now } as any)
          .where(
            and(
              eq(agencyDealOfferVersions.id, offer.id),
              eq(agencyDealOfferVersions.agencyId, agencyId),
            ),
          );

        const firstDeadline = template.milestones.find(milestone => milestone[4] !== 'completed');
        const [transactionInsert] = await tx.insert(agencyTransactions).values({
          agencyId,
          dealId: deal.id,
          leadId: deal.leadId,
          listingId: deal.listingId,
          propertyId: deal.propertyId,
          responsibleAgentId: deal.responsibleAgentId,
          acceptedOfferVersionId: offer.id,
          transactionType: deal.transactionType,
          status: 'open',
          stage: template.stage,
          riskStatus: 'watch',
          acceptedAmount: toRequiredDecimalString(acceptedAmount),
          acceptedTermsSnapshot: offer.termsSnapshot || {
            amount: acceptedAmount,
            conditionsSummary: offer.conditionsSummary,
            specialConditions: offer.specialConditions,
          },
          targetCompletionDate: parseOptionalDbTimestamp(input.targetCompletionDate),
          nextAction: template.nextAction,
          nextDeadline: firstDeadline ? futureDbTimestamp(firstDeadline[3]) : null,
          transferDutyVatTreatment: input.transferDutyVatTreatment,
          commissionBasis: input.commissionBasis,
          commissionPercentage: toRequiredDecimalString(input.commissionPercentage),
          commissionFixedAmount: toDecimalString(input.commissionFixedAmount),
          commissionVatTreatment: input.commissionVatTreatment,
          grossCommission: toRequiredDecimalString(commission.grossCommission),
          agencyShare: toRequiredDecimalString(commission.agencyShare),
          agentShare: toRequiredDecimalString(commission.agentShare),
          referralSplit: toRequiredDecimalString(commission.referralSplit),
          otherDeductions: toRequiredDecimalString(commission.otherDeductions),
          expectedCommission: toRequiredDecimalString(commission.expectedCommission),
          commissionStatus: 'estimated',
          expectedPaymentDate: parseOptionalDbTimestamp(input.expectedPaymentDate),
          createdByUserId: user.id,
          updatedByUserId: user.id,
        } as any);
        transactionId = insertResultId(transactionInsert);

        await tx.insert(agencyTransactionMilestones).values(
          template.milestones.map((milestone, index) => ({
            agencyId,
            transactionId,
            sequence: index + 1,
            milestoneKey: milestone[0],
            title: milestone[1],
            responsibleParty: milestone[2],
            dueAt: futureDbTimestamp(milestone[3]),
            status: milestone[4],
            completedAt: milestone[4] === 'completed' ? now : null,
          })) as any,
        );

        await tx.insert(agencyTransactionConditions).values(
          template.conditions.map(condition => ({
            agencyId,
            transactionId,
            title: condition[0],
            description: condition[1],
            responsibleParty: condition[2],
            dueAt: futureDbTimestamp(condition[3]),
            status: 'pending',
            createdByUserId: user.id,
          })) as any,
        );

        if (deal.leadId) {
          const [lead] = await tx.select().from(leads).where(eq(leads.id, deal.leadId)).limit(1);
          if (lead) {
            await tx.insert(agencyTransactionParties).values({
              agencyId,
              transactionId,
              role: deal.transactionType === 'rental' ? 'tenant' : 'buyer',
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
            } as any);

            await tx
              .update(leads)
              .set({
                status: 'converted',
                funnelStage: 'sale',
                convertedAt: now,
                updatedAt: now,
              } as any)
              .where(and(eq(leads.id, deal.leadId), eq(leads.agencyId, agencyId)));

            await tx.insert(leadActivities).values({
              leadId: deal.leadId,
              userId: user.id,
              type: 'status_change',
              description:
                input.note ||
                `Offer V${offer.versionNumber} accepted and transaction #${transactionId} opened.`,
            });
          }
        }

        if (deal.responsibleAgentId) {
          const [agent] = await tx
            .select()
            .from(agents)
            .where(eq(agents.id, deal.responsibleAgentId))
            .limit(1);
          if (agent) {
            await tx.insert(agencyTransactionParties).values({
              agencyId,
              transactionId,
              role: 'listing_agent',
              name: getAgentDisplayName(agent) || `Agent #${agent.id}`,
              email: agent.email,
              phone: agent.phone,
              agentId: agent.id,
              userId: agent.userId,
            } as any);
          }
        }

        await tx
          .update(agencyDeals)
          .set({
            stage: 'transaction_open',
            riskStatus: 'watch',
            acceptedOfferVersionId: offer.id,
            acceptedAmount: toRequiredDecimalString(acceptedAmount),
            acceptedAt: now,
            nextAction: template.nextAction,
            nextDeadline: firstDeadline ? futureDbTimestamp(firstDeadline[3]) : null,
            updatedByUserId: user.id,
            updatedAt: now,
          } as any)
          .where(and(eq(agencyDeals.id, deal.id), eq(agencyDeals.agencyId, agencyId)));

        await tx.insert(agencyTransactionActivity).values([
          {
            agencyId,
            transactionId,
            actorUserId: user.id,
            eventType: 'offer_accepted',
            description: `Offer V${offer.versionNumber} accepted at R${acceptedAmount.toFixed(2)}.`,
            metadata: { offerVersionId: offer.id, dealId: deal.id },
          },
          {
            agencyId,
            transactionId,
            actorUserId: user.id,
            eventType: 'transaction_opened',
            description: `Accepted offer opened a ${deal.transactionType} transaction with expected commission R${commission.expectedCommission.toFixed(2)}.`,
            metadata: { offerVersionId: offer.id, dealId: deal.id },
          },
        ] as any);
      });

      const refreshed = await recomputeTransactionNextStep(db, agencyId, transactionId);

      await logAudit({
        userId: user.id,
        action: 'agency.offer_accepted_transaction_opened',
        targetType: 'agency_transaction',
        targetId: transactionId,
        metadata: {
          agencyId,
          dealId: deal.id,
          offerVersionId: offer.id,
          expectedCommission: commission.expectedCommission,
          nextDeadline: refreshed?.nextDeadline || null,
        },
        req: ctx.req,
      });

      return { success: true, idempotent: false, transactionId, dealId: deal.id };
    }),

  addTransactionCondition: agentProcedure
    .input(addTransactionConditionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyTransaction(db, agencyId, input.transactionId);

      const [conditionInsert] = await db.insert(agencyTransactionConditions).values({
        agencyId,
        transactionId: input.transactionId,
        title: input.title,
        description: input.description || null,
        responsibleParty: input.responsibleParty,
        dueAt: parseOptionalDbTimestamp(input.dueAt),
        status: 'pending',
        notes: input.notes || null,
        createdByUserId: user.id,
      } as any);
      const conditionId = insertResultId(conditionInsert);
      await createTransactionActivity({
        db,
        agencyId,
        transactionId: input.transactionId,
        userId: user.id,
        eventType: 'condition_added',
        description: `Condition added: ${input.title}.`,
      });
      await recomputeTransactionNextStep(db, agencyId, input.transactionId);

      return { success: true, conditionId };
    }),

  updateTransactionWorkItem: agentProcedure
    .input(updateTransactionWorkItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyTransaction(db, agencyId, input.transactionId);
      const now = nowAsDbTimestamp();
      const terminal = ['completed', 'waived', 'cancelled'].includes(input.status);
      let workItemTitle = '';

      if (input.itemType === 'milestone') {
        const [milestone] = await db
          .select()
          .from(agencyTransactionMilestones)
          .where(
            and(
              eq(agencyTransactionMilestones.id, input.itemId),
              eq(agencyTransactionMilestones.transactionId, input.transactionId),
              eq(agencyTransactionMilestones.agencyId, agencyId),
            ),
          )
          .limit(1);
        if (!milestone) throw new TRPCError({ code: 'NOT_FOUND', message: 'Milestone not found' });
        workItemTitle = milestone.title;
        await db
          .update(agencyTransactionMilestones)
          .set({
            status: input.status,
            completedAt: terminal ? now : null,
            notes: input.notes || milestone.notes,
            updatedAt: now,
          } as any)
          .where(eq(agencyTransactionMilestones.id, input.itemId));
      } else {
        const [condition] = await db
          .select()
          .from(agencyTransactionConditions)
          .where(
            and(
              eq(agencyTransactionConditions.id, input.itemId),
              eq(agencyTransactionConditions.transactionId, input.transactionId),
              eq(agencyTransactionConditions.agencyId, agencyId),
            ),
          )
          .limit(1);
        if (!condition) throw new TRPCError({ code: 'NOT_FOUND', message: 'Condition not found' });
        workItemTitle = condition.title;
        await db
          .update(agencyTransactionConditions)
          .set({
            status: input.status,
            completedAt: terminal ? now : null,
            waivedOrCancelledReason:
              input.status === 'waived' || input.status === 'cancelled'
                ? input.waivedOrCancelledReason || condition.waivedOrCancelledReason
                : condition.waivedOrCancelledReason,
            notes: input.notes || condition.notes,
            updatedAt: now,
          } as any)
          .where(eq(agencyTransactionConditions.id, input.itemId));
      }

      await createTransactionActivity({
        db,
        agencyId,
        transactionId: input.transactionId,
        userId: user.id,
        eventType: `${input.itemType}_${input.status}`,
        description: `${input.itemType === 'milestone' ? 'Milestone' : 'Condition'} "${workItemTitle}" marked ${input.status}.`,
      });
      await recomputeTransactionNextStep(db, agencyId, input.transactionId);

      return { success: true };
    }),

  addTransactionParty: agentProcedure
    .input(addTransactionPartyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyTransaction(db, agencyId, input.transactionId);

      const [partyInsert] = await db.insert(agencyTransactionParties).values({
        agencyId,
        transactionId: input.transactionId,
        role: input.role,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        organization: input.organization || null,
        notes: input.notes || null,
      } as any);
      const partyId = insertResultId(partyInsert);
      await createTransactionActivity({
        db,
        agencyId,
        transactionId: input.transactionId,
        userId: user.id,
        eventType: 'party_added',
        description: `${input.role.replace(/_/g, ' ')} added: ${input.name}.`,
      });

      return { success: true, partyId };
    }),

  addTransactionDocument: agentProcedure
    .input(addTransactionDocumentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      await requireAgencyTransaction(db, agencyId, input.transactionId);
      const storageKey = input.storageKey.trim();
      const expectedPrivatePrefix = `private/agency-${agencyId}/transactions/${input.transactionId}/`;
      if (/^https?:\/\//i.test(storageKey) || !storageKey.startsWith(expectedPrivatePrefix)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document metadata must use an agency-private transaction storage reference.',
        });
      }

      if (input.conditionId) {
        const [condition] = await db
          .select()
          .from(agencyTransactionConditions)
          .where(
            and(
              eq(agencyTransactionConditions.id, input.conditionId),
              eq(agencyTransactionConditions.transactionId, input.transactionId),
              eq(agencyTransactionConditions.agencyId, agencyId),
            ),
          )
          .limit(1);
        if (!condition) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Condition not found' });
        }
      }

      const [documentInsert] = await db.insert(agencyTransactionDocuments).values({
        agencyId,
        transactionId: input.transactionId,
        conditionId: input.conditionId || null,
        documentType: input.documentType,
        fileName: input.fileName,
        storageKey,
        contentType: input.contentType || null,
        fileSize: input.fileSize || null,
        visibilityScope: 'agency_private',
        uploadedByUserId: user.id,
        notes: input.notes || null,
      } as any);
      const documentId = insertResultId(documentInsert);

      if (input.conditionId) {
        await db
          .update(agencyTransactionConditions)
          .set({ evidenceDocumentId: documentId, updatedAt: nowAsDbTimestamp() } as any)
          .where(eq(agencyTransactionConditions.id, input.conditionId));
      }

      await createTransactionActivity({
        db,
        agencyId,
        transactionId: input.transactionId,
        userId: user.id,
        eventType: 'document_added',
        description: `${input.documentType.replace(/_/g, ' ')} uploaded privately: ${input.fileName}.`,
        metadata: { documentId, conditionId: input.conditionId || null },
      });

      return { success: true, documentId };
    }),

  updateTransaction: agentProcedure
    .input(updateTransactionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const transaction = await requireAgencyTransaction(db, agencyId, input.transactionId);
      const now = nowAsDbTimestamp();
      const nextStatus = input.status || transaction.status;
      const commissionStatus =
        input.commissionStatus ||
        (nextStatus === 'completed' && transaction.commissionStatus === 'estimated'
          ? 'payable'
          : transaction.commissionStatus);
      const riskStatus =
        input.riskStatus ||
        (nextStatus === 'completed'
          ? 'complete'
          : nextStatus === 'cancelled'
            ? 'cancelled'
            : transaction.riskStatus);

      await db.transaction(async tx => {
        await tx
          .update(agencyTransactions)
          .set({
            stage: input.stage || transaction.stage,
            status: nextStatus,
            riskStatus,
            nextAction: input.nextAction === undefined ? transaction.nextAction : input.nextAction,
            nextDeadline:
              input.nextDeadline === undefined
                ? transaction.nextDeadline
                : parseOptionalDbTimestamp(input.nextDeadline),
            expectedPaymentDate:
              input.expectedPaymentDate === undefined
                ? transaction.expectedPaymentDate
                : parseOptionalDbTimestamp(input.expectedPaymentDate),
            commissionStatus,
            completedAt: nextStatus === 'completed' ? transaction.completedAt || now : transaction.completedAt,
            cancelledAt: nextStatus === 'cancelled' ? transaction.cancelledAt || now : transaction.cancelledAt,
            updatedByUserId: user.id,
            updatedAt: now,
          } as any)
          .where(
            and(
              eq(agencyTransactions.id, transaction.id),
              eq(agencyTransactions.agencyId, agencyId),
            ),
          );

        await tx
          .update(agencyDeals)
          .set({
            stage:
              nextStatus === 'completed'
                ? 'completed'
                : nextStatus === 'cancelled'
                  ? 'cancelled'
                  : 'transaction_progression',
            riskStatus,
            nextAction:
              input.nextAction === undefined ? transaction.nextAction : input.nextAction,
            nextDeadline:
              input.nextDeadline === undefined
                ? transaction.nextDeadline
                : parseOptionalDbTimestamp(input.nextDeadline),
            updatedByUserId: user.id,
            updatedAt: now,
          } as any)
          .where(and(eq(agencyDeals.id, transaction.dealId), eq(agencyDeals.agencyId, agencyId)));

        await tx.insert(agencyTransactionActivity).values({
          agencyId,
          transactionId: transaction.id,
          actorUserId: user.id,
          eventType: 'transaction_updated',
          description:
            input.note ||
            `Transaction updated${input.status ? ` to ${input.status}` : ''}.`,
          metadata: {
            previousStatus: transaction.status,
            nextStatus,
            commissionStatus,
          },
        });
      });

      return { success: true };
    }),

  getMyDay: agentProcedure
    .input(
      z
        .object({
          date: z.string().trim().optional(),
          limit: z.number().int().min(1).max(50).default(12),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const user = requireUser(ctx);
      const agencyId = requireAgencyId(user);
      const bounds = getDayBounds(input?.date);
      const dayKey = bounds.dateKey;
      const nextDayKey = addAgencyDays(dayKey, 1);
      const limit = input?.limit || 12;

      const [
        overdueFollowUps,
        dueTodayFollowUps,
        todayViewings,
        unconfirmedViewings,
        feedbackRequiredViewings,
        urgentLeads,
        firstResponseOverdueLeads,
        upcomingViewings,
        listingRows,
        offerDeadlineRows,
        conditionDeadlineRows,
        milestoneDeadlineRows,
        overdueSellerFollowUps,
        dueTodaySellerFollowUps,
      ] = await Promise.all([
        db
          .select({ lead: leads, property: properties, agent: agents })
          .from(leads)
          .leftJoin(properties, eq(leads.propertyId, properties.id))
          .leftJoin(agents, eq(leads.agentId, agents.id))
          .where(
            and(
              eq(leads.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
              sql`${leads.nextFollowUp} IS NOT NULL AND ${leads.nextFollowUp} < ${bounds.startDb}`,
            ),
          )
          .orderBy(leads.nextFollowUp)
          .limit(limit),
        db
          .select({ lead: leads, property: properties, agent: agents })
          .from(leads)
          .leftJoin(properties, eq(leads.propertyId, properties.id))
          .leftJoin(agents, eq(leads.agentId, agents.id))
          .where(
            and(
              eq(leads.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
              sql`${leads.nextFollowUp} >= ${bounds.startDb} AND ${leads.nextFollowUp} < ${bounds.endDb}`,
            ),
          )
          .orderBy(leads.nextFollowUp)
          .limit(limit),
        listAgencyViewings({
          db,
          agencyId,
          status: 'all',
          dateFrom: dayKey,
          dateTo: dayKey,
          limit,
        }),
        listAgencyViewings({
          db,
          agencyId,
          status: 'unconfirmed',
          limit,
        }),
        listAgencyViewings({
          db,
          agencyId,
          status: 'feedback_required',
          limit,
        }),
        db
          .select({ lead: leads, property: properties, agent: agents })
          .from(leads)
          .leftJoin(properties, eq(leads.propertyId, properties.id))
          .leftJoin(agents, eq(leads.agentId, agents.id))
          .where(
            and(
              eq(leads.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              or(eq(leads.status, 'new'), isNull(leads.agentId))!,
            ),
          )
          .orderBy(desc(leads.createdAt))
          .limit(limit),
        db
          .select({ lead: leads, property: properties, agent: agents })
          .from(leads)
          .leftJoin(properties, eq(leads.propertyId, properties.id))
          .leftJoin(agents, eq(leads.agentId, agents.id))
          .where(
            and(
              eq(leads.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              inArray(leads.status, ACTIVE_WORK_LEAD_STATUSES as any),
              isNull(leads.firstRespondedAt),
              sql`${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL ${FIRST_RESPONSE_SLA_MINUTES} MINUTE)`,
            ),
          )
          .orderBy(leads.createdAt)
          .limit(limit),
        listAgencyViewings({
          db,
          agencyId,
          status: 'upcoming',
          dateFrom: nextDayKey,
          limit,
        }),
        db
          .select(agencyListingSelectFields())
          .from(listings)
          .leftJoin(agents, eq(listings.agentId, agents.id))
          .leftJoin(users, eq(listings.ownerId, users.id))
          .where(
            and(
              agencyListingScopeCondition(agencyId),
              or(
                isNull(listings.agentId),
                inArray(listings.status, ['draft', 'pending_review', 'rejected'] as any),
                sql`${listings.readinessScore} < 75`,
              )!,
            ),
          )
          .orderBy(desc(listings.updatedAt))
          .limit(limit),
        db
          .select({
            offer: agencyDealOfferVersions,
            deal: agencyDeals,
            lead: leads,
            listing: listings,
            property: properties,
          })
          .from(agencyDealOfferVersions)
          .innerJoin(agencyDeals, eq(agencyDealOfferVersions.dealId, agencyDeals.id))
          .leftJoin(leads, eq(agencyDeals.leadId, leads.id))
          .leftJoin(listings, eq(agencyDeals.listingId, listings.id))
          .leftJoin(properties, eq(agencyDeals.propertyId, properties.id))
          .where(
            and(
              eq(agencyDealOfferVersions.agencyId, agencyId),
              eq(agencyDeals.agencyId, agencyId),
              inArray(
                agencyDealOfferVersions.status,
                ['draft', 'submitted', 'under_review', 'countered'] as any,
              ),
              sql`${agencyDealOfferVersions.offerExpiry} IS NOT NULL AND ${agencyDealOfferVersions.offerExpiry} < ${bounds.endDb}`,
            ),
          )
          .orderBy(agencyDealOfferVersions.offerExpiry)
          .limit(limit),
        db
          .select({
            condition: agencyTransactionConditions,
            transaction: agencyTransactions,
            deal: agencyDeals,
            lead: leads,
            listing: listings,
            property: properties,
          })
          .from(agencyTransactionConditions)
          .innerJoin(
            agencyTransactions,
            eq(agencyTransactionConditions.transactionId, agencyTransactions.id),
          )
          .innerJoin(agencyDeals, eq(agencyTransactions.dealId, agencyDeals.id))
          .leftJoin(leads, eq(agencyTransactions.leadId, leads.id))
          .leftJoin(listings, eq(agencyTransactions.listingId, listings.id))
          .leftJoin(properties, eq(agencyTransactions.propertyId, properties.id))
          .where(
            and(
              eq(agencyTransactionConditions.agencyId, agencyId),
              eq(agencyTransactions.agencyId, agencyId),
              inArray(
                agencyTransactionConditions.status,
                ['pending', 'in_progress', 'blocked'] as any,
              ),
              sql`${agencyTransactionConditions.dueAt} IS NOT NULL AND ${agencyTransactionConditions.dueAt} < ${bounds.endDb}`,
            ),
          )
          .orderBy(agencyTransactionConditions.dueAt)
          .limit(limit),
        db
          .select({
            milestone: agencyTransactionMilestones,
            transaction: agencyTransactions,
            deal: agencyDeals,
            lead: leads,
            listing: listings,
            property: properties,
          })
          .from(agencyTransactionMilestones)
          .innerJoin(
            agencyTransactions,
            eq(agencyTransactionMilestones.transactionId, agencyTransactions.id),
          )
          .innerJoin(agencyDeals, eq(agencyTransactions.dealId, agencyDeals.id))
          .leftJoin(leads, eq(agencyTransactions.leadId, leads.id))
          .leftJoin(listings, eq(agencyTransactions.listingId, listings.id))
          .leftJoin(properties, eq(agencyTransactions.propertyId, properties.id))
          .where(
            and(
              eq(agencyTransactionMilestones.agencyId, agencyId),
              eq(agencyTransactions.agencyId, agencyId),
              inArray(
                agencyTransactionMilestones.status,
                ['pending', 'in_progress', 'blocked'] as any,
              ),
              sql`${agencyTransactionMilestones.dueAt} IS NOT NULL AND ${agencyTransactionMilestones.dueAt} < ${bounds.endDb}`,
            ),
          )
          .orderBy(agencyTransactionMilestones.dueAt)
          .limit(limit),
        db
          .select({ prospect: sellerProspects, agent: agents })
          .from(sellerProspects)
          .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
          .where(
            and(
              eq(sellerProspects.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              notInArray(sellerProspects.stage, SELLER_PROSPECT_TERMINAL_STAGE_VALUES as any),
              sql`${sellerProspects.nextFollowUp} IS NOT NULL AND ${sellerProspects.nextFollowUp} < ${bounds.startDb}`,
            ),
          )
          .orderBy(sellerProspects.nextFollowUp)
          .limit(limit),
        db
          .select({ prospect: sellerProspects, agent: agents })
          .from(sellerProspects)
          .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
          .where(
            and(
              eq(sellerProspects.agencyId, agencyId),
              user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
              notInArray(sellerProspects.stage, SELLER_PROSPECT_TERMINAL_STAGE_VALUES as any),
              sql`${sellerProspects.nextFollowUp} >= ${bounds.startDb} AND ${sellerProspects.nextFollowUp} < ${bounds.endDb}`,
            ),
          )
          .orderBy(sellerProspects.nextFollowUp)
          .limit(limit),
      ]);

      const mapLead = (
        row: { lead: typeof leads.$inferSelect; property: any; agent: any },
        firstResponseState?: Partial<ReturnType<typeof getLeadFirstResponseState>>,
      ) => ({
        ...decorateLeadForWorkspace(row.lead, firstResponseState),
        property: row.property
          ? {
              id: row.property.id,
              title: row.property.title,
              city: row.property.city,
              province: row.property.province,
              price: Number(row.property.price || 0),
              status: row.property.status,
            }
          : null,
        agent: row.agent
          ? {
              id: row.agent.id,
              userId: row.agent.userId,
              name:
                row.agent.displayName ||
                [row.agent.firstName, row.agent.lastName].filter(Boolean).join(' ').trim() ||
                'Assigned agent',
              email: row.agent.email,
              phone: row.agent.phone,
            }
          : null,
      });

      const mapDealDeadline = (row: any) => {
        const offer = row.offer;
        const condition = row.condition;
        const milestone = row.milestone;
        const transaction = row.transaction;
        const deal = row.deal;
        const dueAt = offer?.offerExpiry || condition?.dueAt || milestone?.dueAt || null;
        const title = offer
          ? `Offer V${offer.versionNumber} expires`
          : condition
            ? condition.title
            : milestone?.title || 'Transaction deadline';
        const type = offer ? 'offer_expiry' : condition ? 'condition' : 'milestone';
        const amount = offer?.amount || transaction?.acceptedAmount || deal?.acceptedAmount || null;

        return {
          id: `${type}:${offer?.id || condition?.id || milestone?.id}`,
          type,
          title,
          detail:
            row.lead?.name ||
            row.listing?.title ||
            row.property?.title ||
            `Deal #${deal?.id || transaction?.dealId}`,
          dueAt,
          overdue: dueAt ? new Date(dueAt).getTime() < bounds.start.getTime() : false,
          dealId: deal?.id || transaction?.dealId || null,
          transactionId: transaction?.id || null,
          amount: amount == null ? null : decimalToNumber(amount),
          status: offer?.status || condition?.status || milestone?.status || null,
          listing: mapDealListing(row.listing),
          property: mapDealProperty(row.property),
          lead: mapDealLead(row.lead),
        };
      };

      const transactionDeadlineCandidates = [
        ...offerDeadlineRows.map(mapDealDeadline),
        ...conditionDeadlineRows.map(mapDealDeadline),
        ...milestoneDeadlineRows.map(mapDealDeadline),
      ].sort((left, right) => {
        const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
      const transactionDeadlines = Array.from(
        new Map(transactionDeadlineCandidates.map(deadline => [deadline.id, deadline])).values(),
      );

      const mapSellerProspect = (row: any) => ({
        ...row.prospect,
        assignedAgent: row.agent
          ? {
              id: row.agent.id,
              name:
                row.agent.displayName ||
                [row.agent.firstName, row.agent.lastName].filter(Boolean).join(' ').trim() ||
                'Assigned agent',
              phone: row.agent.phone,
            }
          : null,
      });

      // One mandate work item per prospect: the next blocking action, not every checklist row.
      const mandateWorkRows = await db
        .select({ operation: sellerMandateOperations, prospect: sellerProspects, agent: agents })
        .from(sellerMandateOperations)
        .innerJoin(sellerProspects, eq(sellerMandateOperations.sellerProspectId, sellerProspects.id))
        .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
        .where(and(
          eq(sellerMandateOperations.agencyId, agencyId),
          user.role === 'agent' ? eq(agents.userId, user.id) : undefined,
          ne(sellerMandateOperations.status, 'withdrawn'),
          notInArray(sellerProspects.stage, SELLER_PROSPECT_TERMINAL_STAGE_VALUES as any),
        ))
        .orderBy(asc(sellerProspects.mandateExpiresAt), desc(sellerMandateOperations.updatedAt))
        .limit(limit);
      const mandateWork = mandateWorkRows.map((row: any) => {
        const expiry = row.prospect.mandateExpiresAt ? new Date(row.prospect.mandateExpiresAt) : null;
        const expired = Boolean(expiry && expiry.getTime() < bounds.start.getTime());
        const expiringSoon = Boolean(expiry && expiry.getTime() < bounds.start.getTime() + 14 * 86_400_000);
        const requirements = (row.operation.requirements || {}) as Record<string, unknown>;
        const incomplete = Object.values(requirements).some(value => value !== true);
        const type = expired ? 'mandate_expired' : expiringSoon ? 'mandate_expiring_soon' : row.operation.documentStatus === 'pending' ? 'mandate_document_outstanding' : incomplete ? 'mandate_requirements_incomplete' : row.operation.status === 'awaiting_seller' ? 'mandate_awaiting_seller' : row.operation.status === 'onboarding' ? 'seller_onboarding_incomplete' : row.operation.status === 'listing_ready' ? 'listing_ready_not_started' : 'mandate_next_action';
        return { id: `mandate:${row.operation.id}`, type, sellerProspectId: row.prospect.id, ownerName: row.prospect.ownerName, propertyAddress: row.prospect.propertyAddress, dueAt: expired || expiringSoon ? row.prospect.mandateExpiresAt : row.operation.priceReviewAt, nextAction: row.operation.nextAction || 'Complete mandate requirements', status: row.operation.status, expired, assignedAgent: mapSellerProspect(row).assignedAgent };
      });

      return {
        date: dayKey,
        overdueFollowUps: overdueFollowUps.map(mapLead),
        dueTodayFollowUps: dueTodayFollowUps.map(mapLead),
        todayViewings,
        unconfirmedViewings,
        feedbackRequiredViewings,
        urgentLeads: urgentLeads.map(mapLead),
        firstResponseOverdueLeads: firstResponseOverdueLeads.map(row =>
          mapLead(row, { firstResponseOverdue: true }),
        ),
        listingTasks: listingRows.map(row => mapAgencyListingRow(row, agencyId)),
        transactionDeadlines,
        overdueSellerFollowUps: overdueSellerFollowUps.map(mapSellerProspect),
        dueTodaySellerFollowUps: dueTodaySellerFollowUps.map(mapSellerProspect),
        mandateWork,
        upcomingWork: upcomingViewings,
        counts: {
          overdueFollowUps: overdueFollowUps.length,
          dueTodayFollowUps: dueTodayFollowUps.length,
          todayViewings: todayViewings.length,
          unconfirmedViewings: unconfirmedViewings.length,
          feedbackRequiredViewings: feedbackRequiredViewings.length,
          urgentLeads: urgentLeads.length,
          firstResponseOverdueLeads: firstResponseOverdueLeads.length,
          listingTasks: listingRows.length,
          transactionDeadlines: transactionDeadlines.length,
          overdueSellerFollowUps: overdueSellerFollowUps.length,
          mandateWork: mandateWork.length,
          dueTodaySellerFollowUps: dueTodaySellerFollowUps.length,
          upcomingWork: upcomingViewings.length,
        },
      };
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

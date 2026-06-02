import { z } from 'zod';

export const LEAD_SOURCE_TYPES = [
  'meta_ads',
  'google_ads',
  'organic',
  'whatsapp',
  'linkedin_ads',
  'direct',
  'internal_explore',
  'manual',
] as const;

export const LeadSourceTypeSchema = z.enum(LEAD_SOURCE_TYPES);
export type LeadSourceType = z.infer<typeof LeadSourceTypeSchema>;

export const LEAD_FUNNEL_SESSION_STATUSES = [
  'active',
  'converted',
  'abandoned',
  'duplicate',
] as const;

export const LeadFunnelSessionStatusSchema = z.enum(LEAD_FUNNEL_SESSION_STATUSES);
export type LeadFunnelSessionStatus = z.infer<typeof LeadFunnelSessionStatusSchema>;

export const BUYER_LEAD_STATUSES = [
  'new',
  'qualified_light',
  'needs_review',
  'contacted',
  'viewing_booked',
  'application_started',
  'application_submitted',
  'deal_created',
  'lost',
  'duplicate',
] as const;

export const BuyerLeadStatusSchema = z.enum(BUYER_LEAD_STATUSES);
export type BuyerLeadStatus = z.infer<typeof BuyerLeadStatusSchema>;

export const BUYING_MODES = ['solo', 'joint', 'unsure'] as const;
export const BuyingModeSchema = z.enum(BUYING_MODES);
export type BuyingMode = z.infer<typeof BuyingModeSchema>;

export const EMPLOYMENT_TYPES = [
  'permanently_employed',
  'self_employed',
  'business_owner',
  'contract_worker',
  'government_employee',
  'not_currently_employed',
  'other',
] as const;

export const EmploymentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const CREDIT_REPORT_STATUSES = [
  'checked_good',
  'checked_unsure',
  'not_checked_recently',
  'needs_help',
  'prefer_not_to_say',
] as const;

export const CreditReportStatusSchema = z.enum(CREDIT_REPORT_STATUSES);
export type CreditReportStatus = z.infer<typeof CreditReportStatusSchema>;

export const CONTACT_METHODS = ['phone', 'whatsapp', 'email', 'any'] as const;
export const ContactMethodSchema = z.enum(CONTACT_METHODS);
export type ContactMethod = z.infer<typeof ContactMethodSchema>;

export const DEVELOPMENT_MATCH_LABELS = [
  'good_match',
  'possible_match',
  'needs_review',
  'not_suitable',
] as const;

export const DevelopmentMatchLabelSchema = z.enum(DEVELOPMENT_MATCH_LABELS);
export type DevelopmentMatchLabel = z.infer<typeof DevelopmentMatchLabelSchema>;

export const LEAD_ROUTING_OUTCOMES = [
  'route_to_distribution_program',
  'route_to_internal_sales',
  'route_to_developer_contact',
  'route_to_general_review',
  'route_to_whatsapp_followup',
  'route_to_credit_readiness',
] as const;

export const LeadRoutingOutcomeSchema = z.enum(LEAD_ROUTING_OUTCOMES);
export type LeadRoutingOutcome = z.infer<typeof LeadRoutingOutcomeSchema>;

export const LEAD_ROUTING_OWNER_TYPES = [
  'distribution_program',
  'internal_sales',
  'developer_contact',
  'whatsapp',
  'credit_readiness',
  'general_review',
  'unassigned',
] as const;

export const LeadRoutingOwnerTypeSchema = z.enum(LEAD_ROUTING_OWNER_TYPES);
export type LeadRoutingOwnerType = z.infer<typeof LeadRoutingOwnerTypeSchema>;

export const LEAD_ROUTING_EVENT_TYPES = [
  'session_created',
  'qualification_started',
  'qualification_completed',
  'lead_captured',
  'duplicate_detected',
  'matches_generated',
  'development_selected',
  'routing_decided',
  'distribution_handoff_created',
  'whatsapp_clicked',
  'status_changed',
] as const;

export const LeadRoutingEventTypeSchema = z.enum(LEAD_ROUTING_EVENT_TYPES);
export type LeadRoutingEventType = z.infer<typeof LeadRoutingEventTypeSchema>;

export const AttributionSchema = z.object({
  sourceType: LeadSourceTypeSchema,
  utmSource: z.string().trim().max(100).nullable().optional(),
  utmMedium: z.string().trim().max(100).nullable().optional(),
  utmCampaign: z.string().trim().max(150).nullable().optional(),
  utmContent: z.string().trim().max(150).nullable().optional(),
  utmTerm: z.string().trim().max(150).nullable().optional(),
  fbclid: z.string().trim().max(255).nullable().optional(),
  gclid: z.string().trim().max(255).nullable().optional(),
  referrerUrl: z.string().trim().max(2048).nullable().optional(),
  landingPageUrl: z.string().trim().max(2048).nullable().optional(),
});

export type Attribution = z.infer<typeof AttributionSchema>;

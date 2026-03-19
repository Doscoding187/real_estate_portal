import { z } from 'zod';

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'viewing_completed',
  'offer_made',
  'deal_in_progress',
  'closed_won',
  'closed_lost',
  'spam',
  'duplicate',
  'archived',
] as const;

export const LeadStageSchema = z.enum(LEAD_STAGES);
export type LeadStage = z.infer<typeof LeadStageSchema>;

export const LEAD_OWNER_TYPES = [
  'developer_sales',
  'agency',
  'distribution_partner',
  'unassigned',
] as const;

export const LeadOwnerTypeSchema = z.enum(LEAD_OWNER_TYPES);
export type LeadOwnerType = z.infer<typeof LeadOwnerTypeSchema>;

export const ASSIGNMENT_MODES = ['manual', 'round_robin', 'rule_based'] as const;
export const AssignmentModeSchema = z.enum(ASSIGNMENT_MODES);
export type AssignmentMode = z.infer<typeof AssignmentModeSchema>;

export const SLA_STATUSES = ['ok', 'warning', 'breach'] as const;
export const SlaStatusSchema = z.enum(SLA_STATUSES);
export type SlaStatus = z.infer<typeof SlaStatusSchema>;

export const DEFAULT_LEAD_SLA_POLICY = {
  firstContactWarningHours: 4,
  firstContactBreachHours: 24,
  inactivityWarningHours: 24,
  inactivityBreachHours: 48,
  staleQualifiedDays: 7,
} as const;

export const LeadSlaPolicySchema = z.object({
  firstContactWarningHours: z.number().positive(),
  firstContactBreachHours: z.number().positive(),
  inactivityWarningHours: z.number().positive(),
  inactivityBreachHours: z.number().positive(),
  staleQualifiedDays: z.number().positive(),
});

export type LeadSlaPolicy = z.infer<typeof LeadSlaPolicySchema>;

export const LEAD_ALLOWED_TRANSITIONS: Record<LeadStage, readonly LeadStage[]> = {
  new: ['contacted', 'spam', 'duplicate', 'archived'],
  contacted: ['qualified', 'closed_lost', 'archived'],
  qualified: ['viewing_scheduled', 'closed_lost', 'archived'],
  viewing_scheduled: ['viewing_completed', 'closed_lost', 'archived'],
  viewing_completed: ['offer_made', 'closed_lost', 'archived'],
  offer_made: ['deal_in_progress', 'closed_lost', 'archived'],
  deal_in_progress: ['closed_won', 'closed_lost', 'archived'],
  closed_won: ['archived'],
  closed_lost: ['archived'],
  spam: ['archived'],
  duplicate: ['archived'],
  archived: [],
};

export function isLeadTransitionAllowed(from: LeadStage, to: LeadStage): boolean {
  if (from === to) return true;
  return LEAD_ALLOWED_TRANSITIONS[from].includes(to);
}


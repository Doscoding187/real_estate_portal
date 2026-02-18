import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
  decimal,
} from 'drizzle-orm/mysql-core';
import { users } from './core';
import { developments } from './developments';

export const DISTRIBUTION_DEAL_STAGE_VALUES = [
  'viewing_scheduled',
  'viewing_completed',
  'application_submitted',
  'contract_signed',
  'bond_approved',
  'commission_pending',
  'commission_paid',
  'cancelled',
] as const;

export const DISTRIBUTION_TIER_VALUES = ['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const;

export const DISTRIBUTION_VIEWING_STATUS_VALUES = [
  'scheduled',
  'completed',
  'no_show',
  'cancelled',
] as const;

export const DISTRIBUTION_IDENTITY_TYPE_VALUES = ['referrer', 'manager'] as const;

const DISTRIBUTION_COMMISSION_MODEL_VALUES = [
  'flat_percentage',
  'tiered_percentage',
  'fixed_amount',
  'hybrid',
] as const;

const DISTRIBUTION_TIER_ACCESS_POLICY_VALUES = ['open', 'restricted', 'invite_only'] as const;
const DISTRIBUTION_AGENT_ACCESS_STATUS_VALUES = ['active', 'paused', 'revoked'] as const;
const DISTRIBUTION_COMMISSION_STATUS_VALUES = [
  'not_ready',
  'pending',
  'approved',
  'paid',
  'cancelled',
] as const;
const DISTRIBUTION_COMMISSION_TRIGGER_STAGE_VALUES = ['contract_signed', 'bond_approved'] as const;
const DISTRIBUTION_COMMISSION_ENTRY_STATUS_VALUES = ['pending', 'approved', 'paid', 'cancelled'] as const;
const DISTRIBUTION_DEAL_EVENT_TYPE_VALUES = [
  'stage_transition',
  'override',
  'validation',
  'note',
  'system',
] as const;
const DISTRIBUTION_VALIDATION_STATUS_VALUES = [
  'pending',
  'completed_proceeding',
  'completed_not_proceeding',
  'no_show',
  'cancelled',
] as const;
const DISTRIBUTION_REFERRER_APPLICATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const PLATFORM_TEAM_REGISTRATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const PLATFORM_TEAM_REGISTRATION_AREA_VALUES = [
  'distribution_manager',
  'agent',
  'agency_operations',
  'developer_operations',
  'other',
] as const;

export const distributionPrograms = mysqlTable(
  'distribution_programs',
  {
    id: int().autoincrement().primaryKey(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    isReferralEnabled: tinyint('is_referral_enabled').default(0).notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    commissionModel: mysqlEnum(
      'commission_model',
      DISTRIBUTION_COMMISSION_MODEL_VALUES as unknown as [string, ...string[]],
    )
      .default('flat_percentage')
      .notNull(),
    defaultCommissionPercent: decimal('default_commission_percent', { precision: 5, scale: 2 }),
    defaultCommissionAmount: int('default_commission_amount'),
    tierAccessPolicy: mysqlEnum(
      'tier_access_policy',
      DISTRIBUTION_TIER_ACCESS_POLICY_VALUES as unknown as [string, ...string[]],
    )
      .default('restricted')
      .notNull(),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: int('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_program_development').on(table.developmentId),
    index('idx_distribution_programs_is_active').on(table.isActive),
    index('idx_distribution_programs_referral_enabled').on(table.isReferralEnabled),
    index('idx_distribution_programs_updated_at').on(table.updatedAt),
  ],
);

export const distributionAgentAccess = mysqlTable(
  'distribution_agent_access',
  {
    id: int().autoincrement().primaryKey(),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    minTierRequired: mysqlEnum(
      'min_tier_required',
      DISTRIBUTION_TIER_VALUES as unknown as [string, ...string[]],
    )
      .default('tier_1')
      .notNull(),
    accessStatus: mysqlEnum(
      'access_status',
      DISTRIBUTION_AGENT_ACCESS_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('active')
      .notNull(),
    grantedBy: int('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'string' }),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_agent_access_program_agent').on(table.programId, table.agentId),
    index('idx_distribution_agent_access_agent').on(table.agentId),
    index('idx_distribution_agent_access_development').on(table.developmentId),
    index('idx_distribution_agent_access_status').on(table.accessStatus),
    index('idx_distribution_agent_access_updated_at').on(table.updatedAt),
  ],
);

export const distributionAgentTiers = mysqlTable(
  'distribution_agent_tiers',
  {
    id: int().autoincrement().primaryKey(),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: mysqlEnum('tier', DISTRIBUTION_TIER_VALUES as unknown as [string, ...string[]]).notNull(),
    score: int().default(0).notNull(),
    windowDays: int('window_days').default(90).notNull(),
    reason: text(),
    effectiveFrom: timestamp('effective_from', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .notNull(),
    effectiveTo: timestamp('effective_to', { mode: 'string' }),
    assignedBy: int('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_distribution_agent_tiers_agent').on(table.agentId),
    index('idx_distribution_agent_tiers_effective_to').on(table.effectiveTo),
    index('idx_distribution_agent_tiers_tier').on(table.tier),
  ],
);

export const distributionDeals = mysqlTable(
  'distribution_deals',
  {
    id: int().autoincrement().primaryKey(),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    managerUserId: int('manager_user_id').references(() => users.id, { onDelete: 'set null' }),
    externalRef: varchar('external_ref', { length: 100 }),
    buyerName: varchar('buyer_name', { length: 200 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 320 }),
    buyerPhone: varchar('buyer_phone', { length: 50 }),
    currentStage: mysqlEnum(
      'current_stage',
      DISTRIBUTION_DEAL_STAGE_VALUES as unknown as [string, ...string[]],
    )
      .default('viewing_scheduled')
      .notNull(),
    commissionTriggerStage: mysqlEnum(
      'commission_trigger_stage',
      DISTRIBUTION_COMMISSION_TRIGGER_STAGE_VALUES as unknown as [string, ...string[]],
    )
      .default('contract_signed')
      .notNull(),
    commissionStatus: mysqlEnum(
      'commission_status',
      DISTRIBUTION_COMMISSION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('not_ready')
      .notNull(),
    attributionLockedAt: timestamp('attribution_locked_at', { mode: 'string' }),
    attributionLockedBy: int('attribution_locked_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    closedAt: timestamp('closed_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_deal_external_ref').on(table.externalRef),
    index('idx_distribution_deals_program').on(table.programId),
    index('idx_distribution_deals_development').on(table.developmentId),
    index('idx_distribution_deals_agent').on(table.agentId),
    index('idx_distribution_deals_manager').on(table.managerUserId),
    index('idx_distribution_deals_current_stage').on(table.currentStage),
    index('idx_distribution_deals_commission_status').on(table.commissionStatus),
    index('idx_distribution_deals_submitted_at').on(table.submittedAt),
  ],
);

export const distributionDealEvents = mysqlTable(
  'distribution_deal_events',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    eventType: mysqlEnum(
      'event_type',
      DISTRIBUTION_DEAL_EVENT_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('note')
      .notNull(),
    fromStage: mysqlEnum(
      'from_stage',
      DISTRIBUTION_DEAL_STAGE_VALUES as unknown as [string, ...string[]],
    ),
    toStage: mysqlEnum('to_stage', DISTRIBUTION_DEAL_STAGE_VALUES as unknown as [string, ...string[]]),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    metadata: json(),
    notes: text(),
    eventAt: timestamp('event_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_distribution_deal_events_deal').on(table.dealId),
    index('idx_distribution_deal_events_event_at').on(table.eventAt),
    index('idx_distribution_deal_events_event_type').on(table.eventType),
  ],
);

export const distributionViewings = mysqlTable(
  'distribution_viewings',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    managerUserId: int('manager_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scheduledStartAt: timestamp('scheduled_start_at', { mode: 'string' }).notNull(),
    scheduledEndAt: timestamp('scheduled_end_at', { mode: 'string' }),
    timezone: varchar({ length: 64 }).default('Africa/Johannesburg').notNull(),
    locationName: varchar('location_name', { length: 255 }),
    status: mysqlEnum(
      'status',
      DISTRIBUTION_VIEWING_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('scheduled')
      .notNull(),
    rescheduleCount: int('reschedule_count').default(0).notNull(),
    scheduledByUserId: int('scheduled_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastRescheduledBy: int('last_rescheduled_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_viewings_deal').on(table.dealId),
    index('idx_distribution_viewings_program').on(table.programId),
    index('idx_distribution_viewings_development').on(table.developmentId),
    index('idx_distribution_viewings_agent').on(table.agentId),
    index('idx_distribution_viewings_manager').on(table.managerUserId),
    index('idx_distribution_viewings_start').on(table.scheduledStartAt),
    index('idx_distribution_viewings_status').on(table.status),
  ],
);

export const distributionViewingValidations = mysqlTable(
  'distribution_viewing_validations',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    managerUserId: int('manager_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    validationStatus: mysqlEnum(
      'validation_status',
      DISTRIBUTION_VALIDATION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    attributionLockApplied: tinyint('attribution_lock_applied').default(0).notNull(),
    attributionLockAt: timestamp('attribution_lock_at', { mode: 'string' }),
    validatedAt: timestamp('validated_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_distribution_viewing_validations_deal').on(table.dealId),
    index('idx_distribution_viewing_validations_status').on(table.validationStatus),
    index('idx_distribution_viewing_validations_validated_at').on(table.validatedAt),
  ],
);

export const distributionCommissionEntries = mysqlTable(
  'distribution_commission_entries',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calculationBaseAmount: int('calculation_base_amount').default(0).notNull(),
    commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }),
    commissionAmount: int('commission_amount').default(0).notNull(),
    currency: varchar({ length: 10 }).default('ZAR').notNull(),
    triggerStage: mysqlEnum(
      'trigger_stage',
      DISTRIBUTION_COMMISSION_TRIGGER_STAGE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    entryStatus: mysqlEnum(
      'entry_status',
      DISTRIBUTION_COMMISSION_ENTRY_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    approvedAt: timestamp('approved_at', { mode: 'string' }),
    approvedBy: int('approved_by').references(() => users.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { mode: 'string' }),
    paidBy: int('paid_by').references(() => users.id, { onDelete: 'set null' }),
    paymentReference: varchar('payment_reference', { length: 100 }),
    notes: text(),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: int('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_commission_entry_deal_trigger').on(table.dealId, table.triggerStage),
    index('idx_distribution_commission_entries_program').on(table.programId),
    index('idx_distribution_commission_entries_development').on(table.developmentId),
    index('idx_distribution_commission_entries_agent').on(table.agentId),
    index('idx_distribution_commission_entries_status').on(table.entryStatus),
    index('idx_distribution_commission_entries_updated_at').on(table.updatedAt),
  ],
);

export const distributionManagerAssignments = mysqlTable(
  'distribution_manager_assignments',
  {
    id: int().autoincrement().primaryKey(),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    managerUserId: int('manager_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPrimary: tinyint('is_primary').default(0).notNull(),
    workloadCapacity: int('workload_capacity').default(0).notNull(),
    timezone: varchar({ length: 64 }),
    isActive: tinyint('is_active').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_manager_assignment_program_manager').on(table.programId, table.managerUserId),
    index('idx_distribution_manager_assignments_manager').on(table.managerUserId),
    index('idx_distribution_manager_assignments_development').on(table.developmentId),
    index('idx_distribution_manager_assignments_active').on(table.isActive),
  ],
);

export const distributionIdentities = mysqlTable(
  'distribution_identities',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    identityType: mysqlEnum(
      'identity_type',
      DISTRIBUTION_IDENTITY_TYPE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    active: tinyint().default(1).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_identity_user_type').on(table.userId, table.identityType),
    index('idx_distribution_identities_type_active').on(table.identityType, table.active),
  ],
);

export const distributionReferrerApplications = mysqlTable(
  'distribution_referrer_applications',
  {
    id: int().autoincrement().primaryKey(),
    requestedIdentity: mysqlEnum(
      'requested_identity',
      DISTRIBUTION_IDENTITY_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('referrer')
      .notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar({ length: 320 }).notNull(),
    phone: varchar({ length: 50 }),
    notes: text(),
    status: mysqlEnum(
      'status',
      DISTRIBUTION_REFERRER_APPLICATION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedBy: int('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_distribution_referrer_applications_email').on(table.email),
    index('idx_distribution_referrer_applications_status').on(table.status),
    index('idx_distribution_referrer_applications_created').on(table.createdAt),
  ],
);

export const platformTeamRegistrations = mysqlTable(
  'platform_team_registrations',
  {
    id: int().autoincrement().primaryKey(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar({ length: 320 }).notNull(),
    phone: varchar({ length: 50 }),
    company: varchar({ length: 200 }),
    currentRole: varchar('current_role', { length: 150 }),
    requestedArea: mysqlEnum(
      'requested_area',
      PLATFORM_TEAM_REGISTRATION_AREA_VALUES as unknown as [string, ...string[]],
    )
      .default('distribution_manager')
      .notNull(),
    notes: text(),
    status: mysqlEnum(
      'status',
      PLATFORM_TEAM_REGISTRATION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedBy: int('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_platform_team_registrations_email').on(table.email),
    index('idx_platform_team_registrations_status').on(table.status),
    index('idx_platform_team_registrations_area').on(table.requestedArea),
    index('idx_platform_team_registrations_user').on(table.userId),
    index('idx_platform_team_registrations_created').on(table.createdAt),
  ],
);

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
const DISTRIBUTION_COMMISSION_TYPE_VALUES = ['flat', 'percentage'] as const;
const DISTRIBUTION_COMMISSION_BASIS_VALUES = ['sale_price', 'base_price'] as const;

const DISTRIBUTION_TIER_ACCESS_POLICY_VALUES = ['open', 'restricted', 'invite_only'] as const;
const DISTRIBUTION_AGENT_ACCESS_STATUS_VALUES = ['active', 'paused', 'revoked'] as const;
const DISTRIBUTION_PROGRAM_BANK_STRATEGY_VALUES = [
  'single',
  'multi_simultaneous',
  'sequential',
] as const;
const DISTRIBUTION_PROGRAM_STEP_TYPE_VALUES = [
  'internal',
  'document',
  'bank',
  'decision',
  'closure',
] as const;
const DISTRIBUTION_BANK_OUTCOME_STATUS_VALUES = ['pending', 'approved', 'declined', 'withdrawn'] as const;
const DISTRIBUTION_COMMISSION_STATUS_VALUES = [
  'not_ready',
  'pending',
  'approved',
  'paid',
  'cancelled',
] as const;
const DISTRIBUTION_COMMISSION_TRIGGER_STAGE_VALUES = ['contract_signed', 'bond_approved'] as const;
const DISTRIBUTION_COMMISSION_ENTRY_STATUS_VALUES = ['pending', 'approved', 'paid', 'cancelled'] as const;
const DISTRIBUTION_COMMISSION_SNAPSHOT_SOURCE_VALUES = [
  'submission_gate',
  'backfill',
  'override',
] as const;
const DISTRIBUTION_PAYOUT_MILESTONE_VALUES = [
  'attorney_instruction',
  'attorney_signing',
  'bond_approval',
  'transfer_registration',
  'occupation',
  'custom',
] as const;
const DEVELOPMENT_REQUIRED_DOCUMENT_CODE_VALUES = [
  'id_document',
  'proof_of_address',
  'proof_of_income',
  'bank_statement',
  'pre_approval',
  'signed_offer_to_purchase',
  'sale_agreement',
  'attorney_instruction_letter',
  'transfer_documents',
  'custom',
] as const;
const DISTRIBUTION_DEAL_DOCUMENT_STATUS_VALUES = [
  'pending',
  'received',
  'verified',
  'rejected',
] as const;
export const DISTRIBUTION_COMMISSION_LEDGER_ROLE_VALUES = [
  'referrer',
  'manager',
  'platform',
  'override',
] as const;
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
    referrerCommissionType: mysqlEnum(
      'referrer_commission_type',
      DISTRIBUTION_COMMISSION_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    referrerCommissionValue: decimal('referrer_commission_value', { precision: 12, scale: 2 }),
    referrerCommissionBasis: mysqlEnum(
      'referrer_commission_basis',
      DISTRIBUTION_COMMISSION_BASIS_VALUES as unknown as [string, ...string[]],
    ),
    platformCommissionType: mysqlEnum(
      'platform_commission_type',
      DISTRIBUTION_COMMISSION_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    platformCommissionValue: decimal('platform_commission_value', { precision: 12, scale: 2 }),
    platformCommissionBasis: mysqlEnum(
      'platform_commission_basis',
      DISTRIBUTION_COMMISSION_BASIS_VALUES as unknown as [string, ...string[]],
    ),
    tierAccessPolicy: mysqlEnum(
      'tier_access_policy',
      DISTRIBUTION_TIER_ACCESS_POLICY_VALUES as unknown as [string, ...string[]],
    )
      .default('restricted')
      .notNull(),
    payoutMilestone: mysqlEnum(
      'payout_milestone',
      DISTRIBUTION_PAYOUT_MILESTONE_VALUES as unknown as [string, ...string[]],
    )
      .default('attorney_signing')
      .notNull(),
    payoutMilestoneNotes: text('payout_milestone_notes'),
    currencyCode: varchar('currency_code', { length: 3 }).default('ZAR').notNull(),
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

export const distributionProgramWorkflows = mysqlTable(
  'distribution_program_workflows',
  {
    id: int().autoincrement().primaryKey(),
    programId: int('program_id')
      .notNull()
      .references(() => distributionPrograms.id, { onDelete: 'cascade' }),
    workflowKey: varchar('workflow_key', { length: 120 }).notNull(),
    workflowName: varchar('workflow_name', { length: 180 }).notNull(),
    bankStrategy: mysqlEnum(
      'bank_strategy',
      DISTRIBUTION_PROGRAM_BANK_STRATEGY_VALUES as unknown as [string, ...string[]],
    )
      .default('single')
      .notNull(),
    turnaroundHours: int('turnaround_hours').default(48).notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    configJson: json('config_json'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_program_workflows_program').on(table.programId),
    index('idx_distribution_program_workflows_strategy').on(table.bankStrategy),
    index('idx_distribution_program_workflows_active').on(table.isActive),
    index('idx_distribution_program_workflows_updated_at').on(table.updatedAt),
  ],
);

export const distributionProgramWorkflowSteps = mysqlTable(
  'distribution_program_workflow_steps',
  {
    id: int().autoincrement().primaryKey(),
    workflowId: int('workflow_id')
      .notNull()
      .references(() => distributionProgramWorkflows.id, { onDelete: 'cascade' }),
    stepKey: varchar('step_key', { length: 80 }).notNull(),
    stepLabel: varchar('step_label', { length: 160 }).notNull(),
    stepType: mysqlEnum(
      'step_type',
      DISTRIBUTION_PROGRAM_STEP_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('internal')
      .notNull(),
    stepOrder: int('step_order').notNull(),
    isBlocking: tinyint('is_blocking').default(0).notNull(),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_program_workflow_steps_key').on(table.workflowId, table.stepKey),
    unique('ux_distribution_program_workflow_steps_order').on(table.workflowId, table.stepOrder),
    index('idx_distribution_program_workflow_steps_workflow').on(table.workflowId),
    index('idx_distribution_program_workflow_steps_type').on(table.stepType),
  ],
);

export const developmentRequiredDocuments = mysqlTable(
  'development_required_documents',
  {
    id: int().autoincrement().primaryKey(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    documentCode: mysqlEnum(
      'document_code',
      DEVELOPMENT_REQUIRED_DOCUMENT_CODE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    documentLabel: varchar('document_label', { length: 160 }).notNull(),
    isRequired: tinyint('is_required').default(1).notNull(),
    sortOrder: int('sort_order').default(0).notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_development_required_documents_code').on(table.developmentId, table.documentCode),
    index('idx_development_required_documents_development').on(table.developmentId),
    index('idx_development_required_documents_required').on(table.isRequired),
    index('idx_development_required_documents_active').on(table.isActive),
    index('idx_development_required_documents_order').on(table.developmentId, table.sortOrder),
  ],
);

export const distributionProgramRequiredDocuments = developmentRequiredDocuments;

export const affordabilityAssessments = mysqlTable(
  'affordability_assessments',
  {
    id: varchar({ length: 36 }).primaryKey(),
    actorUserId: int('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectName: varchar('subject_name', { length: 200 }),
    subjectPhone: varchar('subject_phone', { length: 50 }),
    grossIncomeMonthly: int('gross_income_monthly').notNull(),
    deductionsMonthly: int('deductions_monthly').default(0).notNull(),
    depositAmount: int('deposit_amount').default(0).notNull(),
    assumptionsJson: json('assumptions_json').notNull(),
    outputsJson: json('outputs_json').notNull(),
    locationFilterJson: json('location_filter_json'),
    creditCheckConsentGiven: tinyint('credit_check_consent_given').default(0).notNull(),
    creditCheckRequestedAt: timestamp('credit_check_requested_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_affordability_assessments_actor').on(table.actorUserId),
    index('idx_affordability_assessments_created_at').on(table.createdAt),
    index('idx_affordability_assessments_credit_check').on(table.creditCheckConsentGiven),
  ],
);

export const affordabilityMatchSnapshots = mysqlTable(
  'affordability_match_snapshots',
  {
    id: varchar({ length: 36 }).primaryKey(),
    assessmentId: varchar('assessment_id', { length: 36 })
      .notNull()
      .references(() => affordabilityAssessments.id, { onDelete: 'cascade' }),
    matchesJson: json('matches_json').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_affordability_match_snapshots_assessment').on(table.assessmentId),
    index('idx_affordability_match_snapshots_created_at').on(table.createdAt),
  ],
);

export const qualificationPackExports = mysqlTable(
  'qualification_pack_exports',
  {
    id: varchar({ length: 36 }).primaryKey(),
    assessmentId: varchar('assessment_id', { length: 36 })
      .notNull()
      .references(() => affordabilityAssessments.id, { onDelete: 'cascade' }),
    matchSnapshotId: varchar('match_snapshot_id', { length: 36 })
      .notNull()
      .references(() => affordabilityMatchSnapshots.id, { onDelete: 'cascade' }),
    pdfStorageKey: varchar('pdf_storage_key', { length: 500 }),
    pdfBytes: text('pdf_bytes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_qualification_pack_exports_assessment').on(table.assessmentId),
    index('idx_qualification_pack_exports_snapshot').on(table.matchSnapshotId),
    index('idx_qualification_pack_exports_created_at').on(table.createdAt),
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
    ownerType: mysqlEnum('owner_type', ['agent', 'agency']).default('agent').notNull(),
    ownerId: int('owner_id'),
    assignedAgentId: int('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    visibilityScope: mysqlEnum('visibility_scope', ['private', 'team', 'agency'])
      .default('private')
      .notNull(),
    managerUserId: int('manager_user_id').references(() => users.id, { onDelete: 'set null' }),
    affordabilityAssessmentId: varchar('affordability_assessment_id', { length: 36 }).references(
      () => affordabilityAssessments.id,
      { onDelete: 'set null' },
    ),
    externalRef: varchar('external_ref', { length: 100 }),
    buyerName: varchar('buyer_name', { length: 200 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 320 }),
    buyerPhone: varchar('buyer_phone', { length: 50 }),
    dealAmount: int('deal_amount').default(0).notNull(),
    platformAmount: int('platform_amount').default(0).notNull(),
    commissionBaseAmount: int('commission_base_amount'),
    referrerCommissionType: mysqlEnum(
      'referrer_commission_type',
      DISTRIBUTION_COMMISSION_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    referrerCommissionValue: decimal('referrer_commission_value', { precision: 12, scale: 2 }),
    referrerCommissionBasis: mysqlEnum(
      'referrer_commission_basis',
      DISTRIBUTION_COMMISSION_BASIS_VALUES as unknown as [string, ...string[]],
    ),
    referrerCommissionAmount: int('referrer_commission_amount'),
    platformCommissionType: mysqlEnum(
      'platform_commission_type',
      DISTRIBUTION_COMMISSION_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    platformCommissionValue: decimal('platform_commission_value', { precision: 12, scale: 2 }),
    platformCommissionBasis: mysqlEnum(
      'platform_commission_basis',
      DISTRIBUTION_COMMISSION_BASIS_VALUES as unknown as [string, ...string[]],
    ),
    platformCommissionAmount: int('platform_commission_amount'),
    snapshotVersion: int('snapshot_version'),
    snapshotSource: mysqlEnum(
      'snapshot_source',
      DISTRIBUTION_COMMISSION_SNAPSHOT_SOURCE_VALUES as unknown as [string, ...string[]],
    ),
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
    index('idx_distribution_deals_owner').on(table.ownerType, table.ownerId),
    index('idx_distribution_deals_assigned_agent').on(table.assignedAgentId),
    index('idx_distribution_deals_affordability_assessment').on(table.affordabilityAssessmentId),
    index('idx_distribution_deals_deal_amount').on(table.dealAmount),
    index('idx_distribution_deals_platform_amount').on(table.platformAmount),
  ],
);

export const distributionDealDocuments = mysqlTable(
  'distribution_deal_documents',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    developmentRequiredDocumentId: int('development_required_document_id')
      .notNull()
      .references(() => developmentRequiredDocuments.id, { onDelete: 'cascade' }),
    status: mysqlEnum(
      'status',
      DISTRIBUTION_DEAL_DOCUMENT_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    receivedAt: timestamp('received_at', { mode: 'string' }),
    verifiedAt: timestamp('verified_at', { mode: 'string' }),
    receivedBy: int('received_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedBy: int('verified_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_deal_documents_required_document').on(
      table.dealId,
      table.developmentRequiredDocumentId,
    ),
    index('idx_distribution_deal_documents_deal').on(table.dealId),
    index('idx_distribution_deal_documents_required_document').on(table.developmentRequiredDocumentId),
    index('idx_distribution_deal_documents_status').on(table.status),
    index('idx_distribution_deal_documents_updated_at').on(table.updatedAt),
  ],
);

export const distributionDealDocumentStatuses = distributionDealDocuments;

export const distributionDealBankOutcomes = mysqlTable(
  'distribution_deal_bank_outcomes',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    bankCode: varchar('bank_code', { length: 32 }).notNull(),
    bankName: varchar('bank_name', { length: 120 }).notNull(),
    status: mysqlEnum(
      'status',
      DISTRIBUTION_BANK_OUTCOME_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    outcomeAt: timestamp('outcome_at', { mode: 'string' }),
    selectedForClient: tinyint('selected_for_client').default(0).notNull(),
    selectionRank: int('selection_rank'),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_distribution_deal_bank_outcomes_bank').on(table.dealId, table.bankCode),
    index('idx_distribution_deal_bank_outcomes_deal').on(table.dealId),
    index('idx_distribution_deal_bank_outcomes_status').on(table.status),
    index('idx_distribution_deal_bank_outcomes_selected').on(table.selectedForClient),
    index('idx_distribution_deal_bank_outcomes_updated_at').on(table.updatedAt),
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
    ownerType: mysqlEnum('owner_type', ['agent', 'agency']).default('agent').notNull(),
    ownerId: int('owner_id'),
    assignedAgentId: int('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    visibilityScope: mysqlEnum('visibility_scope', ['private', 'team', 'agency'])
      .default('private')
      .notNull(),
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

export const distributionCommissionLedger = mysqlTable(
  'distribution_commission_ledger',
  {
    id: int().autoincrement().primaryKey(),
    distributionDealId: int('distribution_deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    recipientId: int('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: mysqlEnum(
      'role',
      DISTRIBUTION_COMMISSION_LEDGER_ROLE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    percentage: decimal('percentage', { precision: 7, scale: 4 }),
    calculatedAmount: int('calculated_amount').notNull(),
    currency: varchar({ length: 10 }).default('ZAR').notNull(),
    calculationHash: varchar('calculation_hash', { length: 64 }).notNull(),
    calculationInput: json('calculation_input').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_distribution_commission_ledger_deal').on(table.distributionDealId),
    index('idx_distribution_commission_ledger_recipient').on(table.recipientId),
    index('idx_distribution_commission_ledger_role').on(table.role),
    index('idx_distribution_commission_ledger_created_at').on(table.createdAt),
    unique('ux_distribution_commission_ledger_hash').on(table.calculationHash),
  ],
);

export const distributionCommissionOverrides = mysqlTable(
  'distribution_commission_overrides',
  {
    id: int().autoincrement().primaryKey(),
    dealId: int('deal_id')
      .notNull()
      .references(() => distributionDeals.id, { onDelete: 'cascade' }),
    actorUserId: int('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text().notNull(),
    previousSnapshot: json('previous_snapshot').notNull(),
    nextSnapshot: json('next_snapshot').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_distribution_commission_overrides_deal').on(table.dealId),
    index('idx_distribution_commission_overrides_actor').on(table.actorUserId),
    index('idx_distribution_commission_overrides_created_at').on(table.createdAt),
  ],
);

export const developmentManagerAssignments = mysqlTable(
  'development_manager_assignments',
  {
    id: int().autoincrement().primaryKey(),
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
    assignedAt: timestamp('assigned_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_development_manager_assignment_development_manager').on(
      table.developmentId,
      table.managerUserId,
    ),
    index('idx_development_manager_assignments_manager').on(table.managerUserId),
    index('idx_development_manager_assignments_development').on(table.developmentId),
    index('idx_development_manager_assignments_active').on(table.isActive),
  ],
);

export const distributionManagerAssignments = developmentManagerAssignments;

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

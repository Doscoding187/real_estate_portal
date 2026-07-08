import {
  date,
  decimal,
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
} from 'drizzle-orm/mysql-core';
import { agencies, agents } from './agencies';
import { users } from './core';
import { leads, showings } from './leads';
import { listings, properties } from './listings';

export const AGENCY_DEAL_TRANSACTION_TYPE_VALUES = ['sale', 'rental'] as const;
export const AGENCY_DEAL_STAGE_VALUES = [
  'interest',
  'draft_offer',
  'submitted',
  'under_review',
  'negotiation',
  'accepted',
  'transaction_open',
  'transaction_progression',
  'completed',
  'cancelled',
] as const;
export const AGENCY_DEAL_INTEREST_STATUS_VALUES = [
  'interested',
  'maybe_nurture',
  'not_interested',
  'wants_offer',
  'wants_another_viewing',
  'needs_finance',
  'needs_to_sell',
] as const;
export const AGENCY_DEAL_RISK_STATUS_VALUES = [
  'on_track',
  'watch',
  'at_risk',
  'blocked',
  'complete',
  'cancelled',
] as const;
export const AGENCY_OFFER_ACTOR_VALUES = ['buyer', 'seller', 'landlord', 'tenant', 'agency'] as const;
export const AGENCY_OFFER_EVENT_VALUES = [
  'initial_offer',
  'seller_counter',
  'buyer_counter',
  'landlord_counter',
  'tenant_counter',
  'acceptance_note',
] as const;
export const AGENCY_OFFER_STATUS_VALUES = [
  'draft',
  'submitted',
  'under_review',
  'countered',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
  'superseded',
] as const;
export const AGENCY_TRANSACTION_STATUS_VALUES = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export const AGENCY_TRANSACTION_WORK_ITEM_STATUS_VALUES = [
  'pending',
  'in_progress',
  'completed',
  'waived',
  'cancelled',
  'blocked',
] as const;
export const AGENCY_TRANSACTION_RESPONSIBLE_PARTY_VALUES = [
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
] as const;
export const AGENCY_TRANSACTION_PARTY_ROLE_VALUES = [
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
] as const;
export const AGENCY_TRANSACTION_DOCUMENT_TYPE_VALUES = [
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
] as const;
export const AGENCY_TRANSACTION_DOCUMENT_STATUS_VALUES = [
  'requested',
  'uploaded',
  'verified',
  'rejected',
  'waived',
] as const;
export const AGENCY_COMMISSION_BASIS_VALUES = ['percentage', 'fixed'] as const;
export const AGENCY_COMMISSION_VAT_TREATMENT_VALUES = [
  'inclusive',
  'exclusive',
  'not_applicable',
] as const;
export const AGENCY_COMMISSION_STATUS_VALUES = ['estimated', 'payable', 'paid', 'cancelled'] as const;

export const agencyDeals = mysqlTable(
  'agency_deals',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    listingId: int('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    propertyId: int('property_id').references(() => properties.id, { onDelete: 'set null' }),
    sourceViewingId: int('source_viewing_id').references(() => showings.id, {
      onDelete: 'set null',
    }),
    responsibleAgentId: int('responsible_agent_id').references(() => agents.id, {
      onDelete: 'set null',
    }),
    transactionType: mysqlEnum(
      'transaction_type',
      AGENCY_DEAL_TRANSACTION_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('sale')
      .notNull(),
    stage: mysqlEnum('stage', AGENCY_DEAL_STAGE_VALUES as unknown as [string, ...string[]])
      .default('interest')
      .notNull(),
    interestStatus: mysqlEnum(
      'interest_status',
      AGENCY_DEAL_INTEREST_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('interested')
      .notNull(),
    riskStatus: mysqlEnum(
      'risk_status',
      AGENCY_DEAL_RISK_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('on_track')
      .notNull(),
    acceptedOfferVersionId: int('accepted_offer_version_id'),
    acceptedAmount: decimal('accepted_amount', { precision: 15, scale: 2 }),
    acceptedAt: timestamp('accepted_at', { mode: 'string' }),
    nextAction: varchar('next_action', { length: 255 }),
    nextDeadline: timestamp('next_deadline', { mode: 'string' }),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: int('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_agency_deals_agency_stage').on(table.agencyId, table.stage),
    index('idx_agency_deals_lead').on(table.leadId),
    index('idx_agency_deals_listing').on(table.listingId),
    index('idx_agency_deals_viewing').on(table.sourceViewingId),
    index('idx_agency_deals_deadline').on(table.agencyId, table.nextDeadline),
  ],
);

export const agencyDealOfferVersions = mysqlTable(
  'agency_deal_offer_versions',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    dealId: int('deal_id')
      .notNull()
      .references(() => agencyDeals.id, { onDelete: 'cascade' }),
    parentOfferVersionId: int('parent_offer_version_id'),
    versionNumber: int('version_number').notNull(),
    actor: mysqlEnum('actor', AGENCY_OFFER_ACTOR_VALUES as unknown as [string, ...string[]])
      .default('buyer')
      .notNull(),
    eventType: mysqlEnum(
      'event_type',
      AGENCY_OFFER_EVENT_VALUES as unknown as [string, ...string[]],
    )
      .default('initial_offer')
      .notNull(),
    status: mysqlEnum('status', AGENCY_OFFER_STATUS_VALUES as unknown as [string, ...string[]])
      .default('draft')
      .notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    depositAmount: decimal('deposit_amount', { precision: 15, scale: 2 }),
    financeRequired: tinyint('finance_required').default(0).notNull(),
    bondAmount: decimal('bond_amount', { precision: 15, scale: 2 }),
    cashPortion: decimal('cash_portion', { precision: 15, scale: 2 }),
    occupationDate: date('occupation_date', { mode: 'string' }),
    occupationalRent: decimal('occupational_rent', { precision: 15, scale: 2 }),
    monthlyRental: decimal('monthly_rental', { precision: 15, scale: 2 }),
    leaseDurationMonths: int('lease_duration_months'),
    rentalDeposit: decimal('rental_deposit', { precision: 15, scale: 2 }),
    offerExpiry: timestamp('offer_expiry', { mode: 'string' }),
    conditionsSummary: text('conditions_summary'),
    fixturesSummary: text('fixtures_summary'),
    specialConditions: text('special_conditions'),
    termsSnapshot: json('terms_snapshot'),
    submittedAt: timestamp('submitted_at', { mode: 'string' }),
    decidedAt: timestamp('decided_at', { mode: 'string' }),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_agency_deal_offer_version').on(table.dealId, table.versionNumber),
    index('idx_agency_offer_agency_status').on(table.agencyId, table.status),
    index('idx_agency_offer_deal').on(table.dealId),
    index('idx_agency_offer_expiry').on(table.agencyId, table.offerExpiry),
  ],
);

export const agencyTransactions = mysqlTable(
  'agency_transactions',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    dealId: int('deal_id')
      .notNull()
      .references(() => agencyDeals.id, { onDelete: 'cascade' }),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    listingId: int('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    propertyId: int('property_id').references(() => properties.id, { onDelete: 'set null' }),
    responsibleAgentId: int('responsible_agent_id').references(() => agents.id, {
      onDelete: 'set null',
    }),
    acceptedOfferVersionId: int('accepted_offer_version_id')
      .notNull()
      .references(() => agencyDealOfferVersions.id, { onDelete: 'restrict' }),
    transactionType: mysqlEnum(
      'transaction_type',
      AGENCY_DEAL_TRANSACTION_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('sale')
      .notNull(),
    status: mysqlEnum(
      'status',
      AGENCY_TRANSACTION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('open')
      .notNull(),
    stage: varchar('stage', { length: 80 }).notNull(),
    riskStatus: mysqlEnum(
      'risk_status',
      AGENCY_DEAL_RISK_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('watch')
      .notNull(),
    acceptedAmount: decimal('accepted_amount', { precision: 15, scale: 2 }).notNull(),
    acceptedTermsSnapshot: json('accepted_terms_snapshot'),
    openedAt: timestamp('opened_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    targetCompletionDate: timestamp('target_completion_date', { mode: 'string' }),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    cancelledAt: timestamp('cancelled_at', { mode: 'string' }),
    nextAction: varchar('next_action', { length: 255 }),
    nextDeadline: timestamp('next_deadline', { mode: 'string' }),
    transferDutyVatTreatment: mysqlEnum('transfer_duty_vat_treatment', [
      'unknown',
      'transfer_duty',
      'vat',
      'exempt',
      'not_applicable',
    ])
      .default('unknown')
      .notNull(),
    commissionBasis: mysqlEnum(
      'commission_basis',
      AGENCY_COMMISSION_BASIS_VALUES as unknown as [string, ...string[]],
    )
      .default('percentage')
      .notNull(),
    commissionPercentage: decimal('commission_percentage', { precision: 5, scale: 2 })
      .default('5.00')
      .notNull(),
    commissionFixedAmount: decimal('commission_fixed_amount', { precision: 15, scale: 2 }),
    commissionVatTreatment: mysqlEnum(
      'commission_vat_treatment',
      AGENCY_COMMISSION_VAT_TREATMENT_VALUES as unknown as [string, ...string[]],
    )
      .default('exclusive')
      .notNull(),
    grossCommission: decimal('gross_commission', { precision: 15, scale: 2 }).notNull(),
    agencyShare: decimal('agency_share', { precision: 15, scale: 2 }).notNull(),
    agentShare: decimal('agent_share', { precision: 15, scale: 2 }).notNull(),
    referralSplit: decimal('referral_split', { precision: 15, scale: 2 }).default('0.00').notNull(),
    otherDeductions: decimal('other_deductions', { precision: 15, scale: 2 }).default('0.00').notNull(),
    expectedCommission: decimal('expected_commission', { precision: 15, scale: 2 }).notNull(),
    commissionStatus: mysqlEnum(
      'commission_status',
      AGENCY_COMMISSION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('estimated')
      .notNull(),
    expectedPaymentDate: timestamp('expected_payment_date', { mode: 'string' }),
    paidDate: timestamp('paid_date', { mode: 'string' }),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: int('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_agency_transactions_deal').on(table.dealId),
    index('idx_agency_transactions_agency_status').on(table.agencyId, table.status),
    index('idx_agency_transactions_deadline').on(table.agencyId, table.nextDeadline),
    index('idx_agency_transactions_commission').on(table.agencyId, table.commissionStatus),
  ],
);

export const agencyTransactionMilestones = mysqlTable(
  'agency_transaction_milestones',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    transactionId: int('transaction_id')
      .notNull()
      .references(() => agencyTransactions.id, { onDelete: 'cascade' }),
    sequence: int('sequence').notNull(),
    milestoneKey: varchar('milestone_key', { length: 80 }).notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    responsibleParty: mysqlEnum(
      'responsible_party',
      AGENCY_TRANSACTION_RESPONSIBLE_PARTY_VALUES as unknown as [string, ...string[]],
    )
      .default('agency')
      .notNull(),
    dueAt: timestamp('due_at', { mode: 'string' }),
    status: mysqlEnum(
      'status',
      AGENCY_TRANSACTION_WORK_ITEM_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_agency_tx_milestone_key').on(table.transactionId, table.milestoneKey),
    index('idx_agency_tx_milestone_due').on(table.agencyId, table.dueAt),
    index('idx_agency_tx_milestone_status').on(table.agencyId, table.status),
  ],
);

export const agencyTransactionConditions = mysqlTable(
  'agency_transaction_conditions',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    transactionId: int('transaction_id')
      .notNull()
      .references(() => agencyTransactions.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 180 }).notNull(),
    description: text('description'),
    responsibleParty: mysqlEnum(
      'responsible_party',
      AGENCY_TRANSACTION_RESPONSIBLE_PARTY_VALUES as unknown as [string, ...string[]],
    )
      .default('agency')
      .notNull(),
    dueAt: timestamp('due_at', { mode: 'string' }),
    status: mysqlEnum(
      'status',
      AGENCY_TRANSACTION_WORK_ITEM_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    evidenceDocumentId: int('evidence_document_id'),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    waivedOrCancelledReason: text('waived_or_cancelled_reason'),
    notes: text('notes'),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_agency_tx_conditions_due').on(table.agencyId, table.dueAt),
    index('idx_agency_tx_conditions_status').on(table.agencyId, table.status),
    index('idx_agency_tx_conditions_tx').on(table.transactionId),
  ],
);

export const agencyTransactionParties = mysqlTable(
  'agency_transaction_parties',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    transactionId: int('transaction_id')
      .notNull()
      .references(() => agencyTransactions.id, { onDelete: 'cascade' }),
    role: mysqlEnum(
      'role',
      AGENCY_TRANSACTION_PARTY_ROLE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 50 }),
    organization: varchar('organization', { length: 200 }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    agentId: int('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_agency_tx_parties_tx').on(table.transactionId),
    index('idx_agency_tx_parties_role').on(table.agencyId, table.role),
  ],
);

export const agencyTransactionDocuments = mysqlTable(
  'agency_transaction_documents',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    transactionId: int('transaction_id')
      .notNull()
      .references(() => agencyTransactions.id, { onDelete: 'cascade' }),
    conditionId: int('condition_id').references(() => agencyTransactionConditions.id, {
      onDelete: 'set null',
    }),
    documentType: mysqlEnum(
      'document_type',
      AGENCY_TRANSACTION_DOCUMENT_TYPE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    status: mysqlEnum(
      'status',
      AGENCY_TRANSACTION_DOCUMENT_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('uploaded')
      .notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    contentType: varchar('content_type', { length: 120 }),
    fileSize: int('file_size'),
    visibilityScope: mysqlEnum('visibility_scope', ['agency_private']).default('agency_private').notNull(),
    uploadedByUserId: int('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    uploadedAt: timestamp('uploaded_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_agency_tx_doc_storage').on(table.storageKey),
    index('idx_agency_tx_docs_tx').on(table.transactionId),
    index('idx_agency_tx_docs_type').on(table.agencyId, table.documentType),
  ],
);

export const agencyTransactionActivity = mysqlTable(
  'agency_transaction_activity',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    transactionId: int('transaction_id')
      .notNull()
      .references(() => agencyTransactions.id, { onDelete: 'cascade' }),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    description: text('description').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_agency_tx_activity_tx').on(table.transactionId),
    index('idx_agency_tx_activity_created').on(table.agencyId, table.createdAt),
  ],
);

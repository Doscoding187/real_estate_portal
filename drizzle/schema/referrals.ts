import {
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
import { users } from './core';
import { developments } from './developments';
import { distributionDeals, distributionPrograms } from './distribution';

export const REFERRAL_STATUS_VALUES = [
  'quick',
  'awaiting_documents',
  'under_review',
  'verified',
  'submitted',
  'viewing_booked',
] as const;

export const REFERRAL_QUAL_MODE_VALUES = ['quick_qual', 'verified_qual'] as const;

export const REFERRAL_READINESS_STATUS_VALUES = [
  'quick_estimate',
  'awaiting_documents',
  'under_review',
  'verified_estimate',
  'matched_to_development',
  'submitted_to_partner',
] as const;

export const REFERRAL_CONFIDENCE_LEVEL_VALUES = ['low', 'medium', 'high', 'verified'] as const;

export const REFERRAL_MATCH_BUCKET_VALUES = [
  'preferred_area',
  'nearby_area',
  'other_area',
  'fallback_area',
] as const;

export const REFERRAL_DOCUMENT_TYPE_VALUES = [
  'payslip',
  'bank_statement',
  'credit_report',
  'id_document',
  'proof_of_address',
  'other',
] as const;

export const REFERRAL_DOCUMENT_STATUS_VALUES = ['requested', 'received', 'verified', 'rejected'] as const;

export const REFERRAL_DOCUMENT_UPLOADER_VALUES = ['agent', 'client', 'system'] as const;

export const AFFORDABILITY_CONFIG_VALUE_TYPE_VALUES = ['number', 'integer', 'json'] as const;

export const referrals = mysqlTable(
  'referrals',
  {
    id: int().autoincrement().primaryKey(),
    referenceCode: varchar('reference_code', { length: 64 }).notNull(),
    agentId: int('agent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientName: varchar('client_name', { length: 200 }).notNull(),
    clientEmail: varchar('client_email', { length: 320 }),
    clientPhone: varchar('client_phone', { length: 50 }),
    preferredAreas: json('preferred_areas'),
    status: mysqlEnum(
      'status',
      REFERRAL_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('quick')
      .notNull(),
    latestAssessmentId: int('latest_assessment_id'),
    latestAssessmentVersion: int('latest_assessment_version').default(0).notNull(),
    latestMode: mysqlEnum(
      'latest_mode',
      REFERRAL_QUAL_MODE_VALUES as unknown as [string, ...string[]],
    )
      .default('quick_qual')
      .notNull(),
    latestConfidenceScore: int('latest_confidence_score').default(0).notNull(),
    latestAffordabilityMin: int('latest_affordability_min'),
    latestAffordabilityMax: int('latest_affordability_max'),
    latestMonthlyPaymentEstimate: int('latest_monthly_payment_estimate'),
    lastSubmittedProgramId: int('last_submitted_program_id').references(() => distributionPrograms.id, {
      onDelete: 'set null',
    }),
    lastSubmittedDealId: int('last_submitted_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at', { mode: 'string' }),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    updatedByUserId: int('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_referrals_reference_code').on(table.referenceCode),
    index('idx_referrals_agent').on(table.agentId),
    index('idx_referrals_status').on(table.status),
    index('idx_referrals_updated_at').on(table.updatedAt),
    index('idx_referrals_last_submitted_deal').on(table.lastSubmittedDealId),
  ],
);

export const referralAssessments = mysqlTable(
  'referral_assessments',
  {
    id: int().autoincrement().primaryKey(),
    referralId: int('referral_id')
      .notNull()
      .references(() => referrals.id, { onDelete: 'cascade' }),
    version: int().notNull(),
    mode: mysqlEnum('mode', REFERRAL_QUAL_MODE_VALUES as unknown as [string, ...string[]])
      .default('quick_qual')
      .notNull(),
    inputSnapshot: json('input_snapshot').notNull(),
    affordabilityMin: int('affordability_min').notNull(),
    affordabilityMax: int('affordability_max').notNull(),
    monthlyPaymentEstimate: int('monthly_payment_estimate').notNull(),
    confidenceScore: int('confidence_score').default(0).notNull(),
    confidenceLevel: mysqlEnum(
      'confidence_level',
      REFERRAL_CONFIDENCE_LEVEL_VALUES as unknown as [string, ...string[]],
    )
      .default('low')
      .notNull(),
    confidenceFactors: json('confidence_factors'),
    readinessStatus: mysqlEnum(
      'readiness_status',
      REFERRAL_READINESS_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('quick_estimate')
      .notNull(),
    flags: json('flags'),
    assumptions: json('assumptions'),
    improveAccuracy: json('improve_accuracy'),
    disclaimer: text('disclaimer'),
    pdfHtml: text('pdf_html'),
    uploadLinkToken: varchar('upload_link_token', { length: 96 }),
    uploadLinkExpiresAt: timestamp('upload_link_expires_at', { mode: 'string' }),
    documentCount: int('document_count').default(0).notNull(),
    matchedDevelopmentCount: int('matched_development_count').default(0).notNull(),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('ux_referral_assessments_referral_version').on(table.referralId, table.version),
    index('idx_referral_assessments_referral').on(table.referralId),
    index('idx_referral_assessments_readiness').on(table.readinessStatus),
    index('idx_referral_assessments_mode').on(table.mode),
    index('idx_referral_assessments_created_at').on(table.createdAt),
    index('idx_referral_assessments_upload_token').on(table.uploadLinkToken),
  ],
);

export const referralMatches = mysqlTable(
  'referral_matches',
  {
    id: int().autoincrement().primaryKey(),
    referralId: int('referral_id')
      .notNull()
      .references(() => referrals.id, { onDelete: 'cascade' }),
    assessmentId: int('assessment_id')
      .notNull()
      .references(() => referralAssessments.id, { onDelete: 'cascade' }),
    developmentId: int('development_id').references(() => developments.id, { onDelete: 'set null' }),
    developmentName: varchar('development_name', { length: 255 }).notNull(),
    areaLabel: varchar('area_label', { length: 150 }),
    rankScore: int('rank_score').default(0).notNull(),
    rankPosition: int('rank_position').notNull(),
    matchBucket: mysqlEnum(
      'match_bucket',
      REFERRAL_MATCH_BUCKET_VALUES as unknown as [string, ...string[]],
    )
      .default('other_area')
      .notNull(),
    matchReasons: json('match_reasons'),
    qualifyingUnitTypes: json('qualifying_unit_types'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_referral_matches_referral').on(table.referralId),
    index('idx_referral_matches_assessment').on(table.assessmentId),
    index('idx_referral_matches_development').on(table.developmentId),
    index('idx_referral_matches_bucket_score').on(table.matchBucket, table.rankScore),
  ],
);

export const referralDocuments = mysqlTable(
  'referral_documents',
  {
    id: int().autoincrement().primaryKey(),
    referralId: int('referral_id')
      .notNull()
      .references(() => referrals.id, { onDelete: 'cascade' }),
    assessmentId: int('assessment_id').references(() => referralAssessments.id, {
      onDelete: 'set null',
    }),
    documentType: mysqlEnum(
      'document_type',
      REFERRAL_DOCUMENT_TYPE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    documentStatus: mysqlEnum(
      'document_status',
      REFERRAL_DOCUMENT_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('requested')
      .notNull(),
    uploadedBy: mysqlEnum(
      'uploaded_by',
      REFERRAL_DOCUMENT_UPLOADER_VALUES as unknown as [string, ...string[]],
    )
      .default('system')
      .notNull(),
    fileName: varchar('file_name', { length: 255 }),
    fileUrl: text('file_url'),
    secureToken: varchar('secure_token', { length: 96 }),
    consentConfirmed: tinyint('consent_confirmed').default(0).notNull(),
    consentText: varchar('consent_text', { length: 255 }),
    consentTemplateId: varchar('consent_template_id', { length: 80 }),
    consentTemplateVersion: varchar('consent_template_version', { length: 32 }),
    consentCapturedAt: timestamp('consent_captured_at', { mode: 'string' }),
    metadata: json('metadata'),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    uploadedAt: timestamp('uploaded_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_referral_documents_referral').on(table.referralId),
    index('idx_referral_documents_assessment').on(table.assessmentId),
    index('idx_referral_documents_status').on(table.documentStatus),
    index('idx_referral_documents_type').on(table.documentType),
    index('idx_referral_documents_token').on(table.secureToken),
  ],
);

export const affordabilityConfig = mysqlTable(
  'affordability_config',
  {
    id: int().autoincrement().primaryKey(),
    configKey: varchar('config_key', { length: 80 }).notNull(),
    valueType: mysqlEnum(
      'value_type',
      AFFORDABILITY_CONFIG_VALUE_TYPE_VALUES as unknown as [string, ...string[]],
    )
      .default('number')
      .notNull(),
    valueNumber: decimal('value_number', { precision: 14, scale: 6 }),
    valueJson: json('value_json'),
    label: varchar('label', { length: 120 }).notNull(),
    description: text('description'),
    isActive: tinyint('is_active').default(1).notNull(),
    updatedByUserId: int('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_affordability_config_key').on(table.configKey),
    index('idx_affordability_config_active').on(table.isActive),
  ],
);

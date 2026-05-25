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
import { distributionDeals } from './distribution';
import { leads } from './leads';
import {
  BUYER_LEAD_STATUSES,
  BUYING_MODES,
  CONTACT_METHODS,
  CREDIT_REPORT_STATUSES,
  DEVELOPMENT_MATCH_LABELS,
  EMPLOYMENT_TYPES,
  LEAD_FUNNEL_SESSION_STATUSES,
  LEAD_ROUTING_EVENT_TYPES,
  LEAD_ROUTING_OUTCOMES,
  LEAD_ROUTING_OWNER_TYPES,
  LEAD_SOURCE_TYPES,
} from '../../shared/leadRouting';

const enumValues = <T extends readonly string[]>(values: T) =>
  values as unknown as [string, ...string[]];

export const leadCampaigns = mysqlTable(
  'lead_campaigns',
  {
    id: int().autoincrement().primaryKey(),
    slug: varchar({ length: 160 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    status: mysqlEnum('status', ['draft', 'active', 'paused', 'archived'])
      .default('draft')
      .notNull(),
    acceptedSourceTypes: json('accepted_source_types'),
    targetAreas: json('target_areas'),
    promotedDevelopmentIds: json('promoted_development_ids'),
    campaignPriority: int('campaign_priority').default(0).notNull(),
    configJson: json('config_json'),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_lead_campaigns_slug').on(table.slug),
    index('idx_lead_campaigns_status').on(table.status),
    index('idx_lead_campaigns_priority').on(table.campaignPriority),
  ],
);

export const leadFunnelSessions = mysqlTable(
  'lead_funnel_sessions',
  {
    id: int().autoincrement().primaryKey(),
    campaignId: int('campaign_id').references(() => leadCampaigns.id, { onDelete: 'set null' }),
    sessionToken: varchar('session_token', { length: 96 }).notNull(),
    sourceType: mysqlEnum('source_type', enumValues(LEAD_SOURCE_TYPES)).default('direct').notNull(),
    status: mysqlEnum('status', enumValues(LEAD_FUNNEL_SESSION_STATUSES))
      .default('active')
      .notNull(),
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),
    utmCampaign: varchar('utm_campaign', { length: 150 }),
    utmContent: varchar('utm_content', { length: 150 }),
    utmTerm: varchar('utm_term', { length: 150 }),
    fbclid: varchar({ length: 255 }),
    gclid: varchar({ length: 255 }),
    referrerUrl: varchar('referrer_url', { length: 2048 }),
    landingPageUrl: varchar('landing_page_url', { length: 2048 }),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    convertedAt: timestamp('converted_at', { mode: 'string' }),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
  },
  table => [
    unique('ux_lead_funnel_sessions_token').on(table.sessionToken),
    index('idx_lead_funnel_sessions_campaign').on(table.campaignId),
    index('idx_lead_funnel_sessions_source').on(table.sourceType),
    index('idx_lead_funnel_sessions_status').on(table.status),
    index('idx_lead_funnel_sessions_created').on(table.createdAt),
  ],
);

export const buyerLeads = mysqlTable(
  'buyer_leads',
  {
    id: int().autoincrement().primaryKey(),
    sessionId: int('session_id').references(() => leadFunnelSessions.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => leadCampaigns.id, { onDelete: 'set null' }),
    platformLeadId: int('platform_lead_id').references(() => leads.id, { onDelete: 'set null' }),
    sourceType: mysqlEnum('source_type', enumValues(LEAD_SOURCE_TYPES)).default('direct').notNull(),
    status: mysqlEnum('status', enumValues(BUYER_LEAD_STATUSES)).default('new').notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    phone: varchar({ length: 50 }),
    normalizedPhone: varchar('normalized_phone', { length: 50 }),
    email: varchar({ length: 320 }),
    normalizedEmail: varchar('normalized_email', { length: 320 }),
    preferredContactMethod: mysqlEnum('preferred_contact_method', enumValues(CONTACT_METHODS))
      .default('any')
      .notNull(),
    contactPermission: tinyint('contact_permission').default(0).notNull(),
    marketingConsent: tinyint('marketing_consent').default(0).notNull(),
    consentTimestamp: timestamp('consent_timestamp', { mode: 'string' }),
    privacyPolicyVersion: varchar('privacy_policy_version', { length: 40 }),
    duplicateOfLeadId: int('duplicate_of_lead_id'),
    duplicateReason: text('duplicate_reason'),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_buyer_leads_session').on(table.sessionId),
    index('idx_buyer_leads_campaign').on(table.campaignId),
    index('idx_buyer_leads_platform_lead').on(table.platformLeadId),
    index('idx_buyer_leads_source').on(table.sourceType),
    index('idx_buyer_leads_status').on(table.status),
    index('idx_buyer_leads_phone').on(table.normalizedPhone),
    index('idx_buyer_leads_email').on(table.normalizedEmail),
    index('idx_buyer_leads_duplicate').on(table.duplicateOfLeadId),
    index('idx_buyer_leads_created').on(table.createdAt),
  ],
);

export const buyerQualificationProfiles = mysqlTable(
  'buyer_qualification_profiles',
  {
    id: int().autoincrement().primaryKey(),
    sessionId: int('session_id').references(() => leadFunnelSessions.id, { onDelete: 'set null' }),
    buyerLeadId: int('buyer_lead_id').references(() => buyerLeads.id, { onDelete: 'cascade' }),
    grossMonthlyIncome: int('gross_monthly_income'),
    grossMonthlyIncomeRange: varchar('gross_monthly_income_range', { length: 80 }),
    coApplicantIncome: int('co_applicant_income'),
    employmentType: mysqlEnum('employment_type', enumValues(EMPLOYMENT_TYPES)),
    buyingMode: mysqlEnum('buying_mode', enumValues(BUYING_MODES)).default('unsure').notNull(),
    preferredProvince: varchar('preferred_province', { length: 100 }),
    preferredCity: varchar('preferred_city', { length: 100 }),
    preferredSuburb: varchar('preferred_suburb', { length: 100 }),
    targetPriceMin: int('target_price_min'),
    targetPriceMax: int('target_price_max'),
    creditReportStatus: mysqlEnum('credit_report_status', enumValues(CREDIT_REPORT_STATUSES)),
    buyingTimeline: varchar('buying_timeline', { length: 120 }),
    estimatedBondAmount: int('estimated_bond_amount'),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_buyer_qualification_session').on(table.sessionId),
    index('idx_buyer_qualification_lead').on(table.buyerLeadId),
    index('idx_buyer_qualification_location').on(
      table.preferredProvince,
      table.preferredCity,
      table.preferredSuburb,
    ),
    index('idx_buyer_qualification_income').on(table.grossMonthlyIncome),
  ],
);

export const leadDevelopmentMatches = mysqlTable(
  'lead_development_matches',
  {
    id: int().autoincrement().primaryKey(),
    buyerLeadId: int('buyer_lead_id').references(() => buyerLeads.id, { onDelete: 'cascade' }),
    sessionId: int('session_id').references(() => leadFunnelSessions.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => leadCampaigns.id, { onDelete: 'set null' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    matchScore: decimal('match_score', { precision: 10, scale: 4 }).default('0.0000').notNull(),
    matchLabel: mysqlEnum('match_label', enumValues(DEVELOPMENT_MATCH_LABELS))
      .default('needs_review')
      .notNull(),
    matchReasons: json('match_reasons'),
    incomeEligible: tinyint('income_eligible').default(0).notNull(),
    locationMatch: tinyint('location_match').default(0).notNull(),
    campaignEligible: tinyint('campaign_eligible').default(0).notNull(),
    distributionReady: tinyint('distribution_ready').default(0).notNull(),
    submissionAllowed: tinyint('submission_allowed').default(0).notNull(),
    selectedByBuyer: tinyint('selected_by_buyer').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_lead_development_matches_lead').on(table.buyerLeadId),
    index('idx_lead_development_matches_session').on(table.sessionId),
    index('idx_lead_development_matches_campaign').on(table.campaignId),
    index('idx_lead_development_matches_development').on(table.developmentId),
    index('idx_lead_development_matches_score').on(table.matchScore),
    index('idx_lead_development_matches_selected').on(table.selectedByBuyer),
  ],
);

export const leadRoutingDecisions = mysqlTable(
  'lead_routing_decisions',
  {
    id: int().autoincrement().primaryKey(),
    buyerLeadId: int('buyer_lead_id')
      .notNull()
      .references(() => buyerLeads.id, { onDelete: 'cascade' }),
    sessionId: int('session_id').references(() => leadFunnelSessions.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => leadCampaigns.id, { onDelete: 'set null' }),
    selectedMatchId: int('selected_match_id').references(() => leadDevelopmentMatches.id, {
      onDelete: 'set null',
    }),
    developmentId: int('development_id').references(() => developments.id, {
      onDelete: 'set null',
    }),
    sourceType: mysqlEnum('source_type', enumValues(LEAD_SOURCE_TYPES)).default('direct').notNull(),
    outcome: mysqlEnum('outcome', enumValues(LEAD_ROUTING_OUTCOMES)).notNull(),
    ownerType: mysqlEnum('owner_type', enumValues(LEAD_ROUTING_OWNER_TYPES))
      .default('unassigned')
      .notNull(),
    ownerId: int('owner_id'),
    assignedUserId: int('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    distributionDealId: int('distribution_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    reason: text(),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_lead_routing_decisions_lead').on(table.buyerLeadId),
    index('idx_lead_routing_decisions_session').on(table.sessionId),
    index('idx_lead_routing_decisions_campaign').on(table.campaignId),
    index('idx_lead_routing_decisions_development').on(table.developmentId),
    index('idx_lead_routing_decisions_outcome').on(table.outcome),
    index('idx_lead_routing_decisions_owner').on(table.ownerType, table.ownerId),
    index('idx_lead_routing_decisions_deal').on(table.distributionDealId),
  ],
);

export const leadEvents = mysqlTable(
  'lead_events',
  {
    id: int().autoincrement().primaryKey(),
    buyerLeadId: int('buyer_lead_id').references(() => buyerLeads.id, { onDelete: 'set null' }),
    sessionId: int('session_id').references(() => leadFunnelSessions.id, { onDelete: 'set null' }),
    campaignId: int('campaign_id').references(() => leadCampaigns.id, { onDelete: 'set null' }),
    sourceType: mysqlEnum('source_type', enumValues(LEAD_SOURCE_TYPES)).default('direct').notNull(),
    eventType: mysqlEnum('event_type', enumValues(LEAD_ROUTING_EVENT_TYPES)).notNull(),
    payload: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_lead_events_lead').on(table.buyerLeadId),
    index('idx_lead_events_session').on(table.sessionId),
    index('idx_lead_events_campaign').on(table.campaignId),
    index('idx_lead_events_source').on(table.sourceType),
    index('idx_lead_events_type').on(table.eventType),
    index('idx_lead_events_created').on(table.createdAt),
  ],
);

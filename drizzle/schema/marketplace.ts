import {
  mysqlTable,
  mysqlSchema,
  AnyMySqlColumn,
  index,
  unique,
  foreignKey,
  int,
  varchar,
  text,
  json,
  mysqlEnum,
  timestamp,
  decimal,
  date,
  datetime,
  mysqlView,
  tinyint,
  bigint,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';
import { plans } from './billing';
import { agencies } from './agencies';
import { listings } from './listings';
import { developments } from './developments';
import { videos } from './media';
import { exploreContent } from './explore';

export const explorePartners = mysqlTable('explore_partners', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 255 }).notNull(),
  logo: text(),
  website: varchar({ length: 255 }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const partnerTiers = mysqlTable('partner_tiers', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  priceZar: int().notNull(),
  maxListings: int().default(0),
  features: json(),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partners = mysqlTable(
  'partners',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    serviceType: mysqlEnum('service_type', [
      'mortgage_originator',
      'conveyancer',
      'moving_company',
      'interior_designer',
      'photographer',
      'cleaning_service',
      'solar_installer',
      'security_systems',
    ]).notNull(),
    verificationStatus: mysqlEnum('verification_status', [
      'pending',
      'verified',
      'rejected',
    ]).default('pending'),
    rating: decimal({ precision: 3, scale: 2 }).default('0.00'),
    reviewCount: int('review_count').default(0),
    logoUrl: varchar('logo_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    serviceAreas: json('service_areas'),
    isActive: tinyint('is_active').default(1),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [
    index('idx_partners_service_type').on(table.serviceType),
    index('idx_partners_verification').on(table.verificationStatus),
    index('idx_partners_location').on(table.serviceAreas), // Note: querying JSON this way is limited in MySQL
  ],
);

export const partnerLeads = mysqlTable(
  'partner_leads',
  {
    id: int().autoincrement().notNull(),
    partnerId: int('partner_id')
      .notNull()
      .references(() => partners.id),
    userId: int('user_id').references(() => users.id),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerEmail: varchar('customer_email', { length: 320 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }),
    serviceRequested: varchar('service_requested', { length: 100 }),
    message: text(),
    status: mysqlEnum(['new', 'contacted', 'quoted', 'converted', 'closed']).default('new'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [
    index('idx_partner_leads_partner').on(table.partnerId),
    index('idx_partner_leads_status').on(table.status),
  ],
);

export const partnerSubscriptions = mysqlTable(
  'partner_subscriptions',
  {
    id: int().autoincrement().notNull(),
    partnerId: int('partner_id')
      .notNull()
      .references(() => partners.id),
    planId: int('plan_id').references(() => plans.id),
    status: mysqlEnum(['active', 'cancelled', 'past_due', 'trial']).default('active'),
    billingInterval: mysqlEnum('billing_interval', ['monthly', 'yearly']).default('monthly'),
    currentPeriodStart: timestamp('current_period_start', { mode: 'string' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_partner_subscriptions_status').on(table.status)],
);

export const marketplaceBundles = mysqlTable('marketplace_bundles', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  priceZar: int().notNull(),
  durationDays: int().notNull(),
  features: json(),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const bundlePartners = mysqlTable('bundle_partners', {
  id: int().autoincrement().notNull(),
  bundleId: int()
    .notNull()
    .references(() => marketplaceBundles.id, { onDelete: 'cascade' }),
  partnerId: int()
    .notNull()
    .references(() => partners.id, { onDelete: 'cascade' }),
  category: varchar({ length: 50 }).notNull(),
  displayOrder: int().default(0).notNull(),
  inclusionFeeZar: int(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const boostCampaigns = mysqlTable('boost_campaigns', {
  id: int().autoincrement().notNull(),
  partnerId: int()
    .notNull()
    .references(() => partners.id, { onDelete: 'cascade' }),
  contentId: int(), // Can link to various content types
  contentType: mysqlEnum(['listing', 'development', 'profile', 'article']).notNull(),
  budgetZar: int().notNull(),
  creditsUsed: int().default(0).notNull(),
  impressions: int().default(0).notNull(),
  clicks: int().default(0).notNull(),
  startDate: timestamp({ mode: 'string' }).notNull(),
  endDate: timestamp({ mode: 'string' }).notNull(),
  status: mysqlEnum(['scheduled', 'active', 'paused', 'completed', 'cancelled'])
    .default('scheduled')
    .notNull(),
  targeting: json(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const contentApprovalQueue = mysqlTable(
  'content_approval_queue',
  {
    id: int().autoincrement().notNull(),
    contentId: int('content_id')
      .notNull()
      .references(() => exploreContent.id, { onDelete: 'cascade' }),
    submittedBy: int('submitted_by')
      .notNull()
      .references(() => users.id),
    status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected', 'changes_requested'])
      .default('pending')
      .notNull(),
    priority: mysqlEnum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assignedTo: int('assigned_to').references(() => users.id),
    reviewNotes: text('review_notes'),
    rejectionReason: text('rejection_reason'),
    autoCheckResults: json('auto_check_results'),
    submittedAt: timestamp('submitted_at', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
  },
  table => [
    index('idx_approval_queue_status').on(table.status),
    index('idx_approval_queue_priority').on(table.priority),
    index('idx_approval_queue_assignee').on(table.assignedTo),
  ],
);

export const contentQualityScores = mysqlTable(
  'content_quality_scores',
  {
    id: int().autoincrement().notNull(),
    contentId: int('content_id')
      .notNull()
      .references(() => exploreContent.id, { onDelete: 'cascade' }),
    overallScore: int('overall_score').notNull(),
    metadataScore: int('metadata_score'),
    engagementScore: int('engagement_score'),
    productionScore: int('production_score'),
    relevanceScore: int('relevance_score'),
    policyScore: int('policy_score'),
    details: json(),
    lastCalculatedAt: timestamp('last_calculated_at', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .notNull(),
  },
  table => [
    index('idx_quality_scores_content').on(table.contentId),
    index('idx_quality_scores_overall').on(table.overallScore),
  ],
);

export const launchContentQuotas = mysqlTable(
  'launch_content_quotas',
  {
    id: int().autoincrement().notNull(),
    phaseId: varchar('phase_id', { length: 50 }).notNull(),
    category: varchar({ length: 50 }).notNull(),
    targetCount: int('target_count').notNull(),
    currentCount: int('current_count').default(0),
    minQualityScore: int('min_quality_score').default(70),
    deadline: timestamp({ mode: 'string' }),
    assignedEditorId: int('assigned_editor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: mysqlEnum(['not_started', 'in_progress', 'met', 'at_risk']).default('not_started'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_launch_quotas_phase').on(table.phaseId, table.category)],
);

export const launchMetrics = mysqlTable('launch_metrics', {
  id: int('id').autoincrement().notNull(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }).notNull(),
  metricType: mysqlEnum('metric_type', ['counter', 'gauge', 'percentage', 'currency']).notNull(),
  dimension: varchar('dimension', { length: 100 }), // e.g., 'region:gauteng' or 'platform:mobile'
  recordedAt: timestamp('recorded_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const launchPhases = mysqlTable('launch_phases', {
  id: int('id').autoincrement().notNull(),
  phaseName: varchar('phase_name', { length: 100 }).notNull(),
  codeName: varchar('code_name', { length: 50 }).notNull().unique(), // e.g., 'alpha', 'beta', 'market_entry'
  description: text('description'),
  startDate: timestamp('start_date', { mode: 'string' }).notNull(),
  targetEndDate: timestamp('target_end_date', { mode: 'string' }),
  status: mysqlEnum('status', ['planned', 'active', 'completed', 'paused']).default('planned'),
  completionCriteria: json('completion_criteria'),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const foundingPartners = mysqlTable(
  'founding_partners',
  {
    id: int().autoincrement().notNull(),
    partnerId: int('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    tier: mysqlEnum(['gold', 'platinum', 'diamond']).default('gold').notNull(),
    joinDate: timestamp('join_date', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    benefits: json(),
    contributionValue: int('contribution_value'),
    isPublic: tinyint('is_public').default(1),
  },
  table => [
    index('idx_founding_partners_tier').on(table.tier),
    index('unique_founding_partner').on(table.partnerId),
  ],
);

export const heroCampaigns = mysqlTable(
  'hero_campaigns',
  {
    id: int().autoincrement().notNull(),
    title: varchar({ length: 255 }).notNull(),
    subtitle: varchar({ length: 255 }),
    backgroundImageUrl: varchar('background_image_url', { length: 500 }).notNull(),
    ctaText: varchar('cta_text', { length: 50 }).notNull(),
    ctaLink: varchar('cta_link', { length: 500 }).notNull(),
    campaignType: mysqlEnum('campaign_type', [
      'new_development',
      'featured_agency',
      'market_report',
      'brand_promo',
    ]).notNull(),
    linkedEntityId: int('linked_entity_id'), // Can be development, agency, etc.
    startDate: timestamp('start_date', { mode: 'string' }).notNull(),
    endDate: timestamp('end_date', { mode: 'string' }).notNull(),
    isActive: tinyint('is_active').default(1),
    priority: int().default(0),
    impressions: int().default(0),
    clicks: int().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
  },
  table => [
    index('idx_hero_campaigns_active').on(table.startDate, table.endDate, table.isActive),
    index('idx_hero_campaigns_priority').on(table.priority),
  ],
);

export const services = mysqlTable('services', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  categoryId: int().notNull(),
  averageCost: int(),
  durationMinutes: int(),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const reviews = mysqlTable('reviews', {
  id: int().autoincrement().notNull(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  targetType: mysqlEnum(['agent', 'agency', 'property', 'developer', 'service']).notNull(),
  targetId: int().notNull(),
  rating: int().notNull(),
  title: varchar({ length: 200 }),
  content: text(),
  isVerified: int().default(0).notNull(),
  isPublished: int().default(1).notNull(),
  moderationStatus: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

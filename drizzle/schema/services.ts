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
import { exploreContent } from './explore';
import { listings, properties } from './listings';
import { cities, provinces, suburbs } from './locations';

/**
 * Canonical Services domain authority.
 *
 * See docs/architecture/services-target-architecture.md.
 *
 * Core separation: `serviceRequests` represent the customer's need (one row per
 * expressed need); `serviceIntroductions` represent which provider received or
 * was invited into that need (many rows per request). Organic matching must
 * never read commercial participation state; snapshots on introductions are
 * descriptive only.
 */

export const SERVICE_TAXONOMY_NODE_LEVEL_VALUES = [
  'family',
  'category',
  'service',
  'capability',
] as const;

export const SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES = [
  'draft',
  'pending_review',
  'live',
  'paused',
  'suspended',
] as const;

export const SERVICE_COVERAGE_TYPE_VALUES = [
  'locality',
  'radius',
  'province_wide',
  'national',
  'remote',
] as const;

export const SERVICE_REQUEST_STATUS_VALUES = [
  'open',
  'routing',
  'introduced',
  'connected',
  'closed_matched',
  'closed_no_match',
  'cancelled',
] as const;

export const SERVICE_REQUEST_TIMELINE_BAND_VALUES = [
  'asap',
  'within_weeks',
  'within_month',
  'this_quarter',
  'flexible',
] as const;

export const SERVICE_REQUEST_BUDGET_BAND_VALUES = [
  'under_5k',
  'band_5k_15k',
  'band_15k_50k',
  'band_50k_plus',
  'not_sure',
] as const;

export const SERVICE_JOURNEY_STAGE_VALUES = [
  'browsing',
  'buying',
  'selling_prep',
  'selling_active',
  'owning',
  'renting',
  'renting_out',
  'developing',
  'managing_property',
  'improving',
] as const;

export const SERVICE_SOURCE_SURFACE_VALUES = [
  'services_direct',
  'listing',
  'property',
  'development',
  'location_page',
  'explore',
  'agent_workspace',
  'developer_workspace',
  'property_management',
] as const;

export const SERVICE_INTRODUCTION_STATUS_VALUES = [
  'suggested',
  'introduced',
  'viewed',
  'accepted',
  'declined',
  'contacted',
  'quote_requested',
  'quote_submitted',
  'shortlisted',
  'hired',
  'completed',
  'lost',
  'no_response',
  'expired',
] as const;

export const SERVICE_INTRODUCTION_SOURCE_VALUES = [
  'auto_shortlist',
  'admin_manual',
  'consumer_selected',
  'provider_direct',
] as const;

export const SERVICE_EVENT_ACTOR_TYPE_VALUES = ['consumer', 'provider', 'admin', 'system'] as const;

export const SERVICE_REQUEST_EVENT_TYPE_VALUES = [
  'request_created',
  'request_updated',
  'request_cancelled',
  'request_closed_no_match',
  'request_closed_matched',
  'shortlist_computed',
  'introduction_created',
  'introduction_viewed',
  'introduction_accepted',
  'introduction_declined',
  'introduction_contacted',
  'quote_requested',
  'quote_submitted',
  'introduction_shortlisted',
  'provider_hired',
  'work_completed',
  'introduction_lost',
  'introduction_no_response',
  'introduction_expired',
  'recommendations_shown',
  'provider_card_clicked',
  'results_empty_shown',
  'note_added',
] as const;

export const PROVIDER_VERIFICATION_DIMENSION_VALUES = [
  'identity',
  'business_registration',
  'professional_registration',
  'regulatory_status',
  'licence_certification',
  'insurance',
  'contact',
  'platform_history',
] as const;

export const PROVIDER_VERIFICATION_STATUS_VALUES = [
  'unverified',
  'submitted',
  'verified',
  'failed',
  'expired',
] as const;

export const PROVIDER_REVIEW_MODERATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;

function enumPair(values: readonly string[]) {
  return values as unknown as [string, ...string[]];
}

export const serviceTaxonomyNodes = mysqlTable(
  'service_taxonomy_nodes',
  {
    id: int('id').autoincrement().primaryKey(),
    parentId: int('parent_id'),
    slug: varchar('slug', { length: 120 }).notNull(),
    level: mysqlEnum('level', enumPair(SERVICE_TAXONOMY_NODE_LEVEL_VALUES)).notNull(),
    name: varchar('name', { length: 140 }).notNull(),
    description: text('description'),
    iconKey: varchar('icon_key', { length: 60 }),
    isActive: tinyint('is_active').default(1).notNull(),
    sortOrder: int('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_service_taxonomy_nodes_slug').on(table.slug),
    index('idx_service_taxonomy_nodes_parent').on(table.parentId),
    index('idx_service_taxonomy_nodes_level').on(table.level),
  ],
);

export const serviceProviders = mysqlTable(
  'service_providers',
  {
    id: int('id').autoincrement().primaryKey(),
    ownerUserId: int('owner_user_id')
      .notNull()
      .references(() => users.id),
    slug: varchar('slug', { length: 180 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    logoUrl: varchar('logo_url', { length: 500 }),
    about: text('about'),
    websiteUrl: varchar('website_url', { length: 500 }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    participationStatus: mysqlEnum(
      'participation_status',
      enumPair(SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES),
    )
      .default('draft')
      .notNull(),
    primaryTaxonomyNodeId: int('primary_taxonomy_node_id').references(() => serviceTaxonomyNodes.id, {
      onDelete: 'set null',
    }),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_service_providers_owner').on(table.ownerUserId),
    unique('uq_service_providers_slug').on(table.slug),
    index('idx_service_providers_status').on(table.participationStatus),
    index('idx_service_providers_primary_node').on(table.primaryTaxonomyNodeId),
  ],
);

export const serviceOfferings = mysqlTable(
  'service_offerings',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id, { onDelete: 'cascade' }),
    taxonomyNodeId: int('taxonomy_node_id')
      .notNull()
      .references(() => serviceTaxonomyNodes.id),
    displayNameOverride: varchar('display_name_override', { length: 140 }),
    description: text('description'),
    priceMin: int('price_min'),
    priceMax: int('price_max'),
    currency: varchar('currency', { length: 8 }).default('ZAR').notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_service_offerings_provider_node').on(table.providerId, table.taxonomyNodeId),
    index('idx_service_offerings_node').on(table.taxonomyNodeId),
  ],
);

export const providerServiceAreas = mysqlTable(
  'provider_service_areas',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id, { onDelete: 'cascade' }),
    countryCode: varchar('country_code', { length: 2 }).default('ZA').notNull(),
    coverageType: mysqlEnum('coverage_type', enumPair(SERVICE_COVERAGE_TYPE_VALUES))
      .default('radius')
      .notNull(),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    radiusKm: int('radius_km'),
    isPrimary: tinyint('is_primary').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_provider_service_areas_provider').on(table.providerId),
    index('idx_provider_service_areas_province').on(table.provinceId),
    index('idx_provider_service_areas_city').on(table.cityId),
    index('idx_provider_service_areas_suburb').on(table.suburbId),
  ],
);

export const providerVerifications = mysqlTable(
  'provider_verifications',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id, { onDelete: 'cascade' }),
    dimension: mysqlEnum('dimension', enumPair(PROVIDER_VERIFICATION_DIMENSION_VALUES)).notNull(),
    status: mysqlEnum('status', enumPair(PROVIDER_VERIFICATION_STATUS_VALUES))
      .default('unverified')
      .notNull(),
    evidenceRefs: json('evidence_refs'),
    verifiedByUserId: int('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { mode: 'string' }),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_provider_verifications_provider').on(table.providerId),
    index('idx_provider_verifications_dimension').on(table.providerId, table.dimension),
  ],
);

export const serviceRequests = mysqlTable(
  'service_requests',
  {
    id: int('id').autoincrement().primaryKey(),
    publicReference: varchar('public_reference', { length: 24 }).notNull(),
    requesterUserId: int('requester_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    requesterContactSnapshot: json('requester_contact_snapshot'),
    taxonomyNodeId: int('taxonomy_node_id')
      .notNull()
      .references(() => serviceTaxonomyNodes.id),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    timelineBand: mysqlEnum('timeline_band', enumPair(SERVICE_REQUEST_TIMELINE_BAND_VALUES)),
    budgetBand: mysqlEnum('budget_band', enumPair(SERVICE_REQUEST_BUDGET_BAND_VALUES)),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    locationText: varchar('location_text', { length: 320 }),
    propertyId: int('property_id').references(() => properties.id, { onDelete: 'set null' }),
    listingId: int('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    developmentId: int('development_id').references(() => developments.id, {
      onDelete: 'set null',
    }),
    journeyStage: mysqlEnum('journey_stage', enumPair(SERVICE_JOURNEY_STAGE_VALUES)),
    sourceSurface: mysqlEnum('source_surface', enumPair(SERVICE_SOURCE_SURFACE_VALUES))
      .default('services_direct')
      .notNull(),
    originType: varchar('origin_type', { length: 60 }),
    originId: int('origin_id'),
    reasonCode: varchar('reason_code', { length: 80 }),
    status: mysqlEnum('status', enumPair(SERVICE_REQUEST_STATUS_VALUES)).default('open').notNull(),
    contextJson: json('context_json'),
    closedAt: timestamp('closed_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_service_requests_public_reference').on(table.publicReference),
    index('idx_service_requests_requester').on(table.requesterUserId),
    index('idx_service_requests_status').on(table.status),
    index('idx_service_requests_node').on(table.taxonomyNodeId),
    index('idx_service_requests_geo').on(table.provinceId, table.cityId, table.suburbId),
    index('idx_service_requests_created').on(table.createdAt),
  ],
);

export const serviceIntroductions = mysqlTable(
  'service_introductions',
  {
    id: int('id').autoincrement().primaryKey(),
    requestId: int('request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id),
    status: mysqlEnum('status', enumPair(SERVICE_INTRODUCTION_STATUS_VALUES))
      .default('suggested')
      .notNull(),
    source: mysqlEnum('source', enumPair(SERVICE_INTRODUCTION_SOURCE_VALUES))
      .default('auto_shortlist')
      .notNull(),
    matchScoreSnapshot: decimal('match_score_snapshot', { precision: 5, scale: 2 }),
    commercialSnapshot: json('commercial_snapshot'),
    note: text('note'),
    respondedAt: timestamp('responded_at', { mode: 'string' }),
    connectedAt: timestamp('connected_at', { mode: 'string' }),
    closedAt: timestamp('closed_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_service_introductions_request_provider').on(table.requestId, table.providerId),
    index('idx_service_introductions_provider_status').on(table.providerId, table.status),
    index('idx_service_introductions_request').on(table.requestId),
  ],
);

export const serviceRequestEvents = mysqlTable(
  'service_request_events',
  {
    id: int('id').autoincrement().primaryKey(),
    requestId: int('request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    introductionId: int('introduction_id').references(() => serviceIntroductions.id, {
      onDelete: 'set null',
    }),
    eventType: mysqlEnum('event_type', enumPair(SERVICE_REQUEST_EVENT_TYPE_VALUES)).notNull(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorType: mysqlEnum('actor_type', enumPair(SERVICE_EVENT_ACTOR_TYPE_VALUES))
      .default('system')
      .notNull(),
    payload: json('payload'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_service_request_events_request').on(table.requestId),
    index('idx_service_request_events_introduction').on(table.introductionId),
    index('idx_service_request_events_type').on(table.eventType),
    index('idx_service_request_events_created').on(table.createdAt),
  ],
);

export const providerReviews = mysqlTable(
  'provider_reviews',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id, { onDelete: 'cascade' }),
    introductionId: int('introduction_id').references(() => serviceIntroductions.id, {
      onDelete: 'set null',
    }),
    reviewerUserId: int('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    rating: int('rating').notNull(),
    title: varchar('title', { length: 200 }),
    content: text('content'),
    moderationStatus: mysqlEnum(
      'moderation_status',
      enumPair(PROVIDER_REVIEW_MODERATION_STATUS_VALUES),
    )
      .default('approved')
      .notNull(),
    isPublished: tinyint('is_published').default(1).notNull(),
    publishedAt: timestamp('published_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_provider_reviews_provider').on(table.providerId),
    index('idx_provider_reviews_introduction').on(table.introductionId),
    index('idx_provider_reviews_created').on(table.createdAt),
  ],
);

export const providerPortfolioItems = mysqlTable(
  'provider_portfolio_items',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: int('provider_id')
      .notNull()
      .references(() => serviceProviders.id, { onDelete: 'cascade' }),
    mediaUrl: varchar('media_url', { length: 500 }).notNull(),
    caption: varchar('caption', { length: 300 }),
    contentType: varchar('content_type', { length: 40 }).default('image').notNull(),
    linkedExploreContentId: int('linked_explore_content_id').references(() => exploreContent.id, {
      onDelete: 'set null',
    }),
    sortOrder: int('sort_order').default(0).notNull(),
    isPublished: tinyint('is_published').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_provider_portfolio_provider').on(table.providerId)],
);

export type ServiceTaxonomyNode = typeof serviceTaxonomyNodes.$inferSelect;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type ServiceOffering = typeof serviceOfferings.$inferSelect;
export type ProviderServiceArea = typeof providerServiceAreas.$inferSelect;
export type ProviderVerification = typeof providerVerifications.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceIntroduction = typeof serviceIntroductions.$inferSelect;
export type ServiceRequestEvent = typeof serviceRequestEvents.$inferSelect;
export type ProviderReview = typeof providerReviews.$inferSelect;

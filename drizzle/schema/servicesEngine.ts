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
import { exploreContent, explorePartners } from './explore';
import { listings, properties } from './listings';

export const SERVICE_PROVIDER_MODERATION_TIER_VALUES = ['basic', 'verified', 'pro'] as const;
export const SERVICE_PROVIDER_SUBSCRIPTION_TIER_VALUES = [
  'directory',
  'directory_explore',
  'ecosystem_pro',
] as const;
export const SERVICE_PROVIDER_SUBSCRIPTION_STATUS_VALUES = [
  'trial',
  'active',
  'past_due',
  'cancelled',
] as const;
export const SERVICE_CATEGORY_VALUES = [
  'home_improvement',
  'finance_legal',
  'moving',
  'inspection_compliance',
  'insurance',
  'media_marketing',
] as const;
export const SERVICE_SOURCE_SURFACE_VALUES = [
  'directory',
  'explore',
  'journey_injection',
  'agent_dashboard',
] as const;
export const SERVICE_INTENT_STAGE_VALUES = [
  'seller_valuation',
  'seller_listing_prep',
  'buyer_saved_property',
  'buyer_offer_intent',
  'buyer_move_ready',
  'developer_listing_wizard',
  'agent_dashboard',
  'general',
] as const;
export const SERVICE_LEAD_STATUS_VALUES = ['new', 'accepted', 'quoted', 'won', 'lost', 'expired'] as const;
export const SERVICE_LEAD_EVENT_TYPE_VALUES = [
  'created',
  'assigned',
  'accepted',
  'quoted',
  'won',
  'lost',
  'status_changed',
  'billing_marked',
  'note',
  'recommendations_shown',
  'provider_card_clicked',
  'quote_requested',
  'results_empty_shown',
  'nearby_market_clicked',
] as const;
export const SERVICE_EXPLORE_VERTICAL_VALUES = [
  'walkthroughs',
  'home_improvement',
  'finance_legal',
  'moving_lifestyle',
  'developer_story',
] as const;
export const SERVICE_EXPLORE_MODERATION_STATUS_VALUES = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'changes_requested',
] as const;

export const serviceProviderProfiles = mysqlTable(
  'service_provider_profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    headline: varchar('headline', { length: 180 }),
    bio: text('bio'),
    websiteUrl: varchar('website_url', { length: 500 }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    moderationTier: mysqlEnum(
      'moderation_tier',
      SERVICE_PROVIDER_MODERATION_TIER_VALUES as unknown as [string, ...string[]],
    )
      .default('basic')
      .notNull(),
    directoryActive: tinyint('directory_active').default(1).notNull(),
    exploreCreatorActive: tinyint('explore_creator_active').default(1).notNull(),
    dashboardActive: tinyint('dashboard_active').default(1).notNull(),
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00').notNull(),
    reviewCount: int('review_count').default(0).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_service_provider_profiles_provider').on(table.providerId),
    index('idx_service_provider_profiles_tier').on(table.moderationTier),
  ],
);

export const serviceProviderLocations = mysqlTable(
  'service_provider_locations',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    countryCode: varchar('country_code', { length: 2 }).default('ZA').notNull(),
    province: varchar('province', { length: 120 }),
    city: varchar('city', { length: 120 }),
    suburb: varchar('suburb', { length: 120 }),
    postalCode: varchar('postal_code', { length: 20 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    radiusKm: int('radius_km').default(25).notNull(),
    isPrimary: tinyint('is_primary').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_service_provider_locations_provider').on(table.providerId),
    index('idx_service_provider_locations_geo').on(table.province, table.city, table.suburb),
  ],
);

export const serviceProviderServices = mysqlTable(
  'service_provider_services',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    serviceCategory: mysqlEnum(
      'service_category',
      SERVICE_CATEGORY_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    serviceCode: varchar('service_code', { length: 80 }).notNull(),
    displayName: varchar('display_name', { length: 140 }).notNull(),
    description: text('description'),
    minPrice: int('min_price'),
    maxPrice: int('max_price'),
    currency: varchar('currency', { length: 8 }).default('ZAR').notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_service_provider_services_unique').on(table.providerId, table.serviceCode),
    index('idx_service_provider_services_provider').on(table.providerId),
    index('idx_service_provider_services_category').on(table.serviceCategory),
  ],
);

export const serviceProviderSubscriptions = mysqlTable(
  'service_provider_subscriptions',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    tier: mysqlEnum(
      'tier',
      SERVICE_PROVIDER_SUBSCRIPTION_TIER_VALUES as unknown as [string, ...string[]],
    )
      .default('directory')
      .notNull(),
    status: mysqlEnum(
      'status',
      SERVICE_PROVIDER_SUBSCRIPTION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('trial')
      .notNull(),
    startsAt: timestamp('starts_at', { mode: 'string' }),
    endsAt: timestamp('ends_at', { mode: 'string' }),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('ux_service_provider_subscriptions_provider').on(table.providerId),
    index('idx_service_provider_subscriptions_tier').on(table.tier),
    index('idx_service_provider_subscriptions_status').on(table.status),
  ],
);

export const serviceExploreVideos = mysqlTable(
  'service_explore_videos',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    exploreContentId: int('explore_content_id').references(() => exploreContent.id, {
      onDelete: 'set null',
    }),
    vertical: mysqlEnum(
      'vertical',
      SERVICE_EXPLORE_VERTICAL_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    moderationStatus: mysqlEnum(
      'moderation_status',
      SERVICE_EXPLORE_MODERATION_STATUS_VALUES as unknown as [string, ...string[]],
    )
      .default('pending')
      .notNull(),
    submittedByUserId: int('submitted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    moderationNotes: text('moderation_notes'),
    submittedAt: timestamp('submitted_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    publishedAt: timestamp('published_at', { mode: 'string' }),
  },
  table => [
    index('idx_service_explore_videos_provider').on(table.providerId),
    index('idx_service_explore_videos_status').on(table.moderationStatus),
    index('idx_service_explore_videos_vertical').on(table.vertical),
  ],
);

export const serviceLeads = mysqlTable(
  'service_leads',
  {
    id: int('id').autoincrement().primaryKey(),
    requesterUserId: int('requester_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    providerId: varchar('provider_id', { length: 36 }).references(() => explorePartners.id, {
      onDelete: 'set null',
    }),
    serviceCategory: mysqlEnum(
      'service_category',
      SERVICE_CATEGORY_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    sourceSurface: mysqlEnum(
      'source_surface',
      SERVICE_SOURCE_SURFACE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    intentStage: mysqlEnum(
      'intent_stage',
      SERVICE_INTENT_STAGE_VALUES as unknown as [string, ...string[]],
    )
      .default('general')
      .notNull(),
    propertyId: int('property_id').references(() => properties.id, {
      onDelete: 'set null',
    }),
    listingId: int('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    developmentId: int('development_id').references(() => developments.id, {
      onDelete: 'set null',
    }),
    geoProvince: varchar('geo_province', { length: 120 }),
    geoCity: varchar('geo_city', { length: 120 }),
    geoSuburb: varchar('geo_suburb', { length: 120 }),
    notes: text('notes'),
    contextJson: json('context_json'),
    status: mysqlEnum('status', SERVICE_LEAD_STATUS_VALUES as unknown as [string, ...string[]])
      .default('new')
      .notNull(),
    billingEligible: tinyint('billing_eligible').default(0).notNull(),
    billingTierSnapshot: mysqlEnum(
      'billing_tier_snapshot',
      SERVICE_PROVIDER_SUBSCRIPTION_TIER_VALUES as unknown as [string, ...string[]],
    ),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_service_leads_provider').on(table.providerId),
    index('idx_service_leads_status').on(table.status),
    index('idx_service_leads_source').on(table.sourceSurface),
    index('idx_service_leads_stage').on(table.intentStage),
    index('idx_service_leads_created').on(table.createdAt),
  ],
);

export const serviceLeadEvents = mysqlTable(
  'service_lead_events',
  {
    id: int('id').autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .references(() => serviceLeads.id, { onDelete: 'cascade' }),
    eventType: mysqlEnum(
      'event_type',
      SERVICE_LEAD_EVENT_TYPE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    payload: json('payload'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_service_lead_events_lead').on(table.leadId),
    index('idx_service_lead_events_type').on(table.eventType),
    index('idx_service_lead_events_created').on(table.createdAt),
  ],
);

export const serviceProviderReviews = mysqlTable(
  'service_provider_reviews',
  {
    id: int('id').autoincrement().primaryKey(),
    providerId: varchar('provider_id', { length: 36 })
      .notNull()
      .references(() => explorePartners.id, { onDelete: 'cascade' }),
    reviewerUserId: int('reviewer_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    rating: int('rating').notNull(),
    title: varchar('title', { length: 200 }),
    content: text('content'),
    isVerified: tinyint('is_verified').default(0).notNull(),
    isPublished: tinyint('is_published').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_service_provider_reviews_provider').on(table.providerId),
    index('idx_service_provider_reviews_rating').on(table.rating),
    index('idx_service_provider_reviews_created').on(table.createdAt),
  ],
);

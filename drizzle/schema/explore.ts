import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  decimal,
  json,
  mysqlEnum,
  tinyint,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { users } from './core';
import { economicActors } from './economicActors';

/**
 * Explore schema (PHASE 1)
 * DB-first contract.
 * These definitions MUST match MySQL exactly.
 */

/**
 * explore_content
 */
export const exploreContent = mysqlTable('explore_content', {
  id: int('id').autoincrement().primaryKey(),

  contentType: varchar('content_type', { length: 50 }).notNull(),
  referenceId: int('reference_id').notNull(),
  actorId: int('actor_id').references(() => economicActors.id, { onDelete: 'set null' }),

  creatorId: int('creator_id'), // nullable
  creatorType: mysqlEnum('creator_type', ['user', 'agent', 'developer', 'agency'])
    .default('user')
    .notNull(),

  agencyId: int('agency_id'),
  partnerId: varchar('partner_id', { length: 36 }),

  title: varchar('title', { length: 255 }),
  description: text('description'),

  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),

  metadata: json('metadata'),
  tags: json('tags'),
  lifestyleCategories: json('lifestyle_categories'),
  category: mysqlEnum('category', ['property', 'renovation', 'finance', 'investment', 'services'])
    .default('property')
    .notNull(),
  durationSec: int('duration_sec'),
  width: int('width'),
  height: int('height'),
  orientation: mysqlEnum('orientation', ['vertical', 'horizontal', 'square']).default('vertical'),

  locationLat: decimal('location_lat', { precision: 10, scale: 8 }),
  locationLng: decimal('location_lng', { precision: 11, scale: 8 }),

  priceMin: int('price_min'),
  priceMax: int('price_max'),

  viewCount: int('view_count').default(0),
  engagementScore: decimal('engagement_score', {
    precision: 5,
    scale: 2,
  }).default('0.00'),

  isActive: tinyint('is_active').default(1),
  isFeatured: tinyint('is_featured').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

/**
 * explore_engagements
 */
export const exploreEngagements = mysqlTable('explore_engagements', {
  id: int('id').autoincrement().primaryKey(),

  contentId: int('content_id')
    .notNull()
    .references(() => exploreContent.id),

  userId: int('user_id'), // nullable
  sessionId: varchar('session_id', { length: 128 }), // nullable

  interactionType: mysqlEnum('interaction_type', [
    'impression',
    'view',
    'skip',
    'save',
    'share',
    'like',
    'comment',
    'complete',
    'contact',
    'whatsapp',
    'book_viewing',
    'click_cta',
  ]).notNull(),

  metadata: json('metadata'),

  createdAt: timestamp('created_at').defaultNow(), // nullable in DB
});

/**
 * topics
 */
export const topics = mysqlTable(
  'topics',
  {
    id: varchar('id', { length: 36 }).notNull().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    isActive: int('is_active').default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow(),
  },
  t => ({
    slugUq: uniqueIndex('uq_topics_slug').on(t.slug),
  }),
);

export const contentTopics = mysqlTable(
  'content_topics',
  {
    id: int().autoincrement().primaryKey(),
    contentId: int('content_id').notNull(),
    topicId: varchar('topic_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  t => ({
    contentIdx: index('idx_ct_content').on(t.contentId),
    topicIdx: index('idx_ct_topic').on(t.topicId),
  }),
);

export const explorePartners = mysqlTable(
  'explore_partners',
  {
    id: varchar('id', { length: 36 }).notNull().primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    tierId: int('tier_id').notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    verificationStatus: mysqlEnum('verification_status', ['pending', 'verified', 'rejected']).default(
      'pending',
    ),
    trustScore: decimal('trust_score', { precision: 5, scale: 2 }).default('50.00'),
    serviceLocations: json('service_locations'),
    approvedContentCount: int('approved_content_count').default(0),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow(),
  },
  t => ({
    userIdx: index('idx_explore_partners_user_id').on(t.userId),
    tierIdx: index('idx_explore_partners_tier_id').on(t.tierId),
  }),
);

export const exploreDiscoveryVideos = mysqlTable(
  'explore_discovery_videos',
  {
    id: varchar('id', { length: 36 }).notNull().primaryKey(),
    exploreContentId: int('explore_content_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  t => ({
    pk: index('idx_edv_content').on(t.exploreContentId),
  }),
);

export const exploreFeedSessions = mysqlTable(
  'explore_feed_sessions',
  {
    id: varchar('id', { length: 36 }).notNull().primaryKey(),
    userId: int('user_id'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  t => ({
    idxUser: index('idx_efs_user').on(t.userId),
  }),
);

export const exploreUserIntents = mysqlTable(
  'explore_user_intents',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    intent: mysqlEnum('intent', ['buy', 'sell', 'improve', 'invest', 'learn']).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    userIntentUq: uniqueIndex('uq_explore_user_intents_user_id').on(t.userId),
    intentIdx: index('idx_explore_user_intents_intent').on(t.intent),
  }),
);

export const exploreShorts = mysqlTable(
  'explore_shorts',
  {
    id: int('id').autoincrement().primaryKey(),
    exploreContentId: int('explore_content_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  t => ({
    idxContent: index('idx_es_content').on(t.exploreContentId),
  }),
);

export const interactionEvents = mysqlTable(
  'interaction_events',
  {
    id: int('id').autoincrement().primaryKey(),
    contentId: int('content_id')
      .notNull()
      .references(() => exploreContent.id, { onDelete: 'cascade' }),
    actorId: int('actor_id').references(() => economicActors.id, { onDelete: 'set null' }),
    viewerUserId: int('viewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: mysqlEnum('event_type', [
      'impression',
      'viewProgress',
      'viewComplete',
      'like',
      'save',
      'share',
      'profileClick',
      'listingOpen',
      'contactClick',
      'notInterested',
      'report',
    ]).notNull(),
    watchMs: int('watch_ms'),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  t => ({
    contentIdx: index('idx_interaction_events_content_id').on(t.contentId),
    actorIdx: index('idx_interaction_events_actor_id').on(t.actorId),
    eventTypeIdx: index('idx_interaction_events_event_type').on(t.eventType),
    sessionIdx: index('idx_interaction_events_session_id').on(t.sessionId),
    createdIdx: index('idx_interaction_events_created_at').on(t.createdAt),
  }),
);

export const outcomeEvents = mysqlTable(
  'outcome_events',
  {
    id: int('id').autoincrement().primaryKey(),
    contentId: int('content_id')
      .notNull()
      .references(() => exploreContent.id, { onDelete: 'cascade' }),
    actorId: int('actor_id').references(() => economicActors.id, { onDelete: 'set null' }),
    viewerUserId: int('viewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    outcomeType: mysqlEnum('outcome_type', [
      'contactClick',
      'leadSubmitted',
      'viewingRequest',
      'quoteRequest',
    ]).notNull(),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  t => ({
    contentIdx: index('idx_outcome_events_content_id').on(t.contentId),
    actorIdx: index('idx_outcome_events_actor_id').on(t.actorId),
    outcomeTypeIdx: index('idx_outcome_events_outcome_type').on(t.outcomeType),
    viewerIdx: index('idx_outcome_events_viewer_user_id').on(t.viewerUserId),
    sessionIdx: index('idx_outcome_events_session_id').on(t.sessionId),
    createdIdx: index('idx_outcome_events_created_at').on(t.createdAt),
  }),
);

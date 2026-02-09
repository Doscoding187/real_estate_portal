import {
  mysqlTable,
  int,
  text,
  timestamp,
  decimal,
  varchar,
  json,
  mysqlEnum,
  tinyint,
} from 'drizzle-orm/mysql-core';

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

  creatorId: int('creator_id'), // nullable
  creatorType: mysqlEnum('creator_type', ['user', 'agent', 'developer', 'agency'])
    .default('user')
    .notNull(),

  agencyId: int('agency_id'),

  title: varchar('title', { length: 255 }),
  description: text('description'),

  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),

  metadata: json('metadata'),
  tags: json('tags'),
  lifestyleCategories: json('lifestyle_categories'),

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

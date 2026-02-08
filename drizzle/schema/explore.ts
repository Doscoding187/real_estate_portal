import {
  mysqlTable,
  int,
  text,
  timestamp,
  boolean,
  decimal,
  varchar,
  json,
  mysqlEnum,
  tinyint,
} from 'drizzle-orm/mysql-core';

/**
 * Core explore content (unified canonical table)
 * Matches 30001_baseline.sql explore_content definition
 */
export const exploreContent = mysqlTable('explore_content', {
  id: int('id').autoincrement().primaryKey(),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  referenceId: int('reference_id').notNull(),
  creatorId: int('creator_id'),
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
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }).default('0'),
  isActive: tinyint('is_active').default(1),
  isFeatured: tinyint('is_featured').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

/**
 * Discovery videos linked to explore content
 */
export const exploreDiscoveryVideos = mysqlTable('explore_discovery_videos', {
  id: int('id').autoincrement().primaryKey(),
  exploreContentId: int('explore_content_id')
    .notNull()
    .references(() => exploreContent.id),
  totalViews: int('total_views').default(0).notNull(),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Engagement events (views, saves, clicks, etc.)
 * Fixed: sessionId is VARCHAR, userId is nullable, interactionType instead of engagementType
 */
export const exploreEngagements = mysqlTable('explore_engagements', {
  id: int('id').autoincrement().primaryKey(),
  contentId: int('content_id')
    .notNull()
    .references(() => exploreContent.id),
  userId: int('user_id'), // nullable for anonymous users
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  interactionType: varchar('interaction_type', { length: 50 }),
  metadata: json('metadata'),
  watchTime: int('watch_time').default(0),
  completed: tinyint('completed').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Feed viewing sessions
 */
export const exploreFeedSessions = mysqlTable('explore_feed_sessions', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  sessionStart: timestamp('session_start').notNull(),
  sessionEnd: timestamp('session_end').notNull(),
});

/**
 * Saved properties via explore
 */
export const exploreSavedProperties = mysqlTable('explore_saved_properties', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  contentId: int('content_id')
    .notNull()
    .references(() => exploreContent.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Highlight tags for explore content
 */
export const exploreHighlightTags = mysqlTable('explore_highlight_tags', {
  id: int('id').autoincrement().primaryKey(),
  tagKey: varchar('tag_key', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  category: varchar('category', { length: 50 }),
  displayOrder: int('display_order').default(0).notNull(),
  isActive: tinyint('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

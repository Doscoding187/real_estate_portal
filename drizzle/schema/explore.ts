import {
  mysqlTable,
  int,
  text,
  timestamp,
  boolean,
  decimal,
} from 'drizzle-orm/mysql-core';

/**
 * Core explore content (creators, titles, ranking)
 */
export const exploreContent = mysqlTable('explore_content', {
  id: int('id').autoincrement().primaryKey(),
  creatorId: int('creator_id').notNull(),
  title: text('title').notNull(),
  viewCount: int('view_count').default(0).notNull(),
  engagementScore: decimal('engagement_score', { precision: 10, scale: 2 }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Engagement events (views, saves, clicks, etc.)
 */
export const exploreEngagements = mysqlTable('explore_engagements', {
  id: int('id').autoincrement().primaryKey(),
  contentId: int('content_id').notNull().references(() => exploreContent.id),
  userId: int('user_id').notNull(),
  sessionId: int('session_id').notNull(),
  engagementType: text('engagement_type').notNull(), // view | save | share | click | skip
  watchTime: int('watch_time').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
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
  contentId: int('content_id').notNull().references(() => exploreContent.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


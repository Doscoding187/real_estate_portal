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

/**
 * Explore schema authority.
 *
 * explore_content is the primary launch feed authority.
 * content_topics and explore_shorts remain compatibility authorities.
 * Explore redesign and compatibility retirement are separate workstreams.
 *
 * These definitions must match the active launch database contract.
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
  partnerId: varchar('partner_id', { length: 36 }),

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
    contentId: varchar('content_id', { length: 36 }).notNull(),
    topicId: varchar('topic_id', { length: 36 })
      .notNull()
      .references(() => topics.id),
    relevanceScore: decimal('relevance_score', {
      precision: 5,
      scale: 2,
    }).default('1.00'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  t => ({
    topicIdx: index('idx_content_topic').on(t.topicId),
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

export const exploreShorts = mysqlTable('explore_shorts', {
  id: int('id').autoincrement().primaryKey(),

  listingId: int('listing_id'),
  developmentId: int('development_id'),
  agentId: int('agent_id'),
  developerId: int('developer_id'),
  agencyId: int('agency_id'),

  contentType: varchar('content_type', { length: 50 }).default('property'),
  topicId: int('topic_id'),
  categoryId: int('category_id'),

  title: varchar('title', { length: 255 }).notNull(),
  caption: text('caption'),

  primaryMediaId: int('primary_media_id').notNull(),
  mediaIds: json('media_ids').notNull(),
  highlights: json('highlights'),

  performanceScore: decimal('performance_score', {
    precision: 5,
    scale: 2,
  })
    .default('0')
    .notNull(),

  boostPriority: int('boost_priority').default(0).notNull(),
  viewCount: int('view_count').default(0).notNull(),
  uniqueViewCount: int('unique_view_count').default(0).notNull(),
  saveCount: int('save_count').default(0).notNull(),
  shareCount: int('share_count').default(0).notNull(),
  skipCount: int('skip_count').default(0).notNull(),
  averageWatchTime: int('average_watch_time').default(0).notNull(),

  viewThroughRate: decimal('view_through_rate', {
    precision: 5,
    scale: 2,
  })
    .default('0')
    .notNull(),

  saveRate: decimal('save_rate', {
    precision: 5,
    scale: 2,
  })
    .default('0')
    .notNull(),

  shareRate: decimal('share_rate', {
    precision: 5,
    scale: 2,
  })
    .default('0')
    .notNull(),

  skipRate: decimal('skip_rate', {
    precision: 5,
    scale: 2,
  })
    .default('0')
    .notNull(),

  isPublished: tinyint('is_published').default(1).notNull(),
  isFeatured: tinyint('is_featured').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .onUpdateNow()
    .notNull(),
  publishedAt: timestamp('published_at'),
});

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
import { listings } from './listings';
import { developments } from './developments';
import { agencies } from './agencies';

export const videos = mysqlTable(
  'videos',
  {
    id: int().autoincrement().notNull(),
    userId: int().references(() => users.id, { onDelete: 'cascade' }),
    listingId: int().references(() => listings.id, { onDelete: 'set null' }),
    developmentId: int().references(() => developments.id, { onDelete: 'set null' }),
    agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    url: text().notNull(),
    thumbnailUrl: text(),
    duration: int(),
    views: int().default(0).notNull(),
    likes: int().default(0).notNull(),
    shares: int().default(0).notNull(),
    status: mysqlEnum(['processing', 'ready', 'failed']).default('processing').notNull(),
    muxPlaybackId: varchar({ length: 100 }),
    muxAssetId: varchar({ length: 100 }),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    category: mysqlEnum('category', [
      'property_tour',
      'neighborhood_guide',
      'market_update',
      'agent_intro',
      'lifestyle',
      'development_showcase',
    ]),
    tags: json(),
    isFeatured: tinyint('is_featured').default(0),
    transcription: text(),
    aiSummary: text('ai_summary'),
    locationLabel: varchar('location_label', { length: 255 }),
    qualityScore: int('quality_score'),
  },
  table => [
    index('idx_videos_user').on(table.userId),
    index('idx_videos_listing').on(table.listingId),
    index('idx_videos_development').on(table.developmentId),
    index('idx_videos_category').on(table.category),
    index('idx_videos_featured').on(table.isFeatured),
  ],
);

export const videoLikes = mysqlTable(
  'video_likes',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    videoId: int('video_id')
      .notNull()
      .references(() => videos.id),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
  },
  table => [index('unique_user_video_like').on(table.userId, table.videoId)],
);

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
import { properties, listings } from './listings';
import { developments, developerBrandProfiles } from './developments';
import { agencies, agents } from './agencies';

export const leads = mysqlTable('leads', {
  id: int().autoincrement().notNull(),
  propertyId: int('propertyId').references(() => properties.id, { onDelete: 'set null' }),
  developmentId: int('developmentId').references(() => developments.id, { onDelete: 'set null' }),
  agencyId: int('agencyId').references(() => agencies.id, { onDelete: 'set null' }),
  agentId: int('agentId').references(() => agents.id, { onDelete: 'set null' }),
  name: varchar({ length: 200 }).notNull(),
  email: varchar({ length: 320 }).notNull(),
  phone: varchar({ length: 50 }),
  message: text(),
  leadType: mysqlEnum('leadType', ['inquiry', 'viewing_request', 'offer', 'callback'])
    .default('inquiry')
    .notNull(),
  status: mysqlEnum([
    'new',
    'contacted',
    'qualified',
    'converted',
    'closed',
    'viewing_scheduled',
    'offer_sent',
    'lost',
  ])
    .default('new')
    .notNull(),
  source: varchar({ length: 100 }),
  createdAt: timestamp('createdAt', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  nextFollowUp: timestamp('nextFollowUp', { mode: 'string' }),
  lastContactedAt: timestamp('lastContactedAt', { mode: 'string' }),
  notes: text(),
  affordabilityData: json('affordability_data'),
  qualificationStatus: mysqlEnum('qualification_status', [
    'qualified',
    'partially_qualified',
    'unqualified',
    'pending',
  ]).default('pending'),
  qualificationScore: int('qualification_score').default(0),
  leadSource: varchar('lead_source', { length: 100 }),
  referrerUrl: text('referrer_url'),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  funnelStage: mysqlEnum('funnel_stage', [
    'interest',
    'affordability',
    'qualification',
    'viewing',
    'offer',
    'bond',
    'sale',
  ]).default('interest'),
  assignedTo: int('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { mode: 'string' }),
  convertedAt: timestamp('converted_at', { mode: 'string' }),
  lostReason: text('lost_reason'),
  developerBrandProfileId: int('developer_brand_profile_id').references(
    () => developerBrandProfiles.id,
    { onDelete: 'set null' },
  ),
  brandLeadStatus: mysqlEnum('brand_lead_status', [
    'captured',
    'delivered_unsubscribed',
    'delivered_subscriber',
    'claimed',
  ]).default('captured'),
  leadDeliveryMethod: mysqlEnum('lead_delivery_method', [
    'email',
    'crm_export',
    'manual',
    'none',
  ]).default('email'),
});

export const leadActivities = mysqlTable('lead_activities', {
  id: int().autoincrement().notNull(),
  leadId: int()
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  userId: int().references(() => users.id, { onDelete: 'set null' }),
  type: mysqlEnum(['note', 'call', 'email', 'meeting', 'status_change']).notNull(),
  description: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const prospects = mysqlTable('prospects', {
  id: int().autoincrement().notNull(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: mysqlEnum(['active', 'inactive', 'banned']).default('active').notNull(),
  preferences: json(),
  lastActiveAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const prospectFavorites = mysqlTable('prospect_favorites', {
  id: int().autoincrement().notNull(),
  prospectId: int()
    .notNull()
    .references(() => prospects.id, { onDelete: 'cascade' }),
  listingId: int().references(() => listings.id, { onDelete: 'cascade' }),
  developmentId: int().references(() => developments.id, { onDelete: 'cascade' }),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const recentlyViewed = mysqlTable('recently_viewed', {
  id: int().autoincrement().notNull(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  listingId: int().references(() => listings.id, { onDelete: 'cascade' }),
  viewedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const offers = mysqlTable('offers', {
  id: int().autoincrement().notNull(),
  listingId: int()
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  buyerId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: int().notNull(),
  status: mysqlEnum(['pending', 'accepted', 'rejected', 'countered', 'withdrawn'])
    .default('pending')
    .notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  conditions: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const showings = mysqlTable('showings', {
  id: int().autoincrement().notNull(),
  listingId: int()
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  agentId: int()
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  visitorId: int().references(() => users.id, { onDelete: 'set null' }),
  visitorName: varchar({ length: 150 }),
  scheduledTime: timestamp({ mode: 'string' }).notNull(),
  durationMinutes: int().default(30).notNull(),
  status: mysqlEnum(['scheduled', 'completed', 'cancelled', 'no_show'])
    .default('scheduled')
    .notNull(),
  feedback: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const scheduledViewings = mysqlTable(
  'scheduled_viewings',
  {
    id: int().autoincrement().notNull(),
    propertyId: int('property_id')
      .notNull()
      .references(() => properties.id),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    scheduledDate: datetime('scheduled_date', { mode: 'string' }).notNull(),
    status: mysqlEnum(['pending', 'confirmed', 'cancelled', 'completed', 'declined'])
      .default('pending')
      .notNull(),
    notes: text(),
    agentNotes: text('agent_notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_viewings_property').on(table.propertyId),
    index('idx_viewings_user').on(table.userId),
    index('idx_viewings_date').on(table.scheduledDate),
  ],
);

export const favorites = mysqlTable(
  'favorites',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    propertyId: int('property_id')
      .notNull()
      .references(() => properties.id),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_favorites_user').on(table.userId),
    index('idx_favorites_property').on(table.propertyId),
  ],
);

export const savedSearches = mysqlTable(
  'saved_searches',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar({ length: 255 }).notNull(),
    criteria: json().notNull(),
    notificationFrequency: mysqlEnum('notification_frequency', [
      'instant',
      'daily',
      'weekly',
      'never',
    ])
      .default('daily')
      .notNull(),
    lastNotifiedAt: timestamp('last_notified_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_saved_searches_user').on(table.userId),
    index('idx_saved_searches_frequency').on(table.notificationFrequency),
  ],
);

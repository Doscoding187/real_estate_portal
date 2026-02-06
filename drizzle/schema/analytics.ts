// drizzle/schema/analytics.ts
import { mysqlTable, index, unique, int, varchar, text, json, mysqlEnum, timestamp, decimal, date } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

import { users } from './core';
import { locations, cities, suburbs } from './locations';
import { listings, properties } from './listings';
import { developments } from './developments';

// --------------------
// Analytics Aggregations
// --------------------
export const analyticsAggregations = mysqlTable('analytics_aggregations', {
  id: int().autoincrement().primaryKey(),
  type: mysqlEnum('aggregation_type', ['listing_views', 'agency_views', 'search_terms', 'user_activity']).notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  locationId: int('location_id'),
  data: json('data').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --------------------
// Analytics Events
// --------------------
export const analyticsEvents = mysqlTable('analytics_events', {
  id: int().autoincrement().primaryKey(),
  userId: int('user_id'),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  eventData: json('event_data'),
  url: text('url'),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_analytics_events_user').on(table.userId),
  index('idx_analytics_events_type').on(table.eventType),
  index('idx_analytics_events_created').on(table.createdAt),
]);

// --------------------
// Price Analytics
// --------------------
export const priceAnalytics = mysqlTable('price_analytics', {
  id: int().autoincrement().primaryKey(),
  locationId: int('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  averagePrice: decimal('average_price', { precision: 12, scale: 2 }).notNull(),
  medianPrice: decimal('median_price', { precision: 12, scale: 2 }),
  pricePerSqm: decimal('price_per_sqm', { precision: 10, scale: 2 }),
  propertyType: varchar('property_type', { length: 50 }),
  periodStart: date('period_start', { mode: 'string' }).notNull(),
  periodEnd: date('period_end', { mode: 'string' }).notNull(),
  sampleSize: int('sample_size').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_price_analytics_location').on(table.locationId),
]);

export const priceHistory = mysqlTable('price_history', {
  id: int().autoincrement().primaryKey(),
  propertyId: int('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  price: int('price').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  source: varchar('source', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_price_history_property').on(table.propertyId),
  index('idx_price_history_date').on(table.date),
]);

export const pricePredictions = mysqlTable('price_predictions', {
  id: int().autoincrement().primaryKey(),
  locationId: int('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  propertyType: varchar('property_type', { length: 50 }).notNull(),
  predictedGrowth: decimal('predicted_growth', { precision: 5, scale: 2 }),
  confidenceScore: int('confidence_score'),
  predictionDate: date('prediction_date', { mode: 'string' }).notNull(),
  horizonMonths: int('horizon_months').notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_price_predictions_location').on(table.locationId),
  index('idx_price_predictions_date').on(table.predictionDate),
]);

export const cityPriceAnalytics = mysqlTable('city_price_analytics', {
  id: int().autoincrement().primaryKey(),
  cityId: int('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  averagePrice: int('average_price').notNull(),
  growthPercentage: decimal('growth_percentage', { precision: 5, scale: 2 }),
  marketTrend: mysqlEnum('market_trend', ['up', 'down', 'stable']).default('stable').notNull(),
  propertyCount: int('property_count').default(0).notNull(),
  propertyType: varchar('property_type', { length: 50 }).default('all').notNull(),
  period: varchar('period', { length: 20 }).default('monthly').notNull(),
  recordingDate: date('recording_date', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_city_price_city').on(table.cityId),
  index('idx_city_price_recording_date').on(table.recordingDate),
]);

export const suburbPriceAnalytics = mysqlTable('suburb_price_analytics', {
  id: int().autoincrement().primaryKey(),
  suburbId: int('suburb_id').notNull().references(() => suburbs.id, { onDelete: 'cascade' }),
  averagePrice: int('average_price').notNull(),
  growthPercentage: decimal('growth_percentage', { precision: 5, scale: 2 }),
  marketTrend: mysqlEnum('market_trend_suburb', ['up', 'down', 'stable']).default('stable').notNull(),
  propertyCount: int('property_count').default(0).notNull(),
  propertyType: varchar('property_type', { length: 50 }).default('all').notNull(),
  period: varchar('period', { length: 20 }).default('monthly').notNull(),
  recordingDate: date('recording_date', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_suburb_price_suburb').on(table.suburbId),
  index('idx_suburb_price_recording_date').on(table.recordingDate),
]);

export const marketInsightsCache = mysqlTable('market_insights_cache', {
  id: int().autoincrement().primaryKey(),
  locationType: mysqlEnum('location_type', ['province', 'city', 'suburb']).notNull(),
  locationId: int('location_id').notNull(),
  insightKey: varchar('insight_key', { length: 100 }).notNull(),
  data: json('data').notNull(),
  validUntil: timestamp('valid_until', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_market_insights_key').on(table.locationType, table.locationId, table.insightKey),
  index('idx_market_insights_valid_until').on(table.validUntil),
]);

// --------------------
// Activities (Generic activity log)
// --------------------
export const activities = mysqlTable('activities', {
  id: int().autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: int('entity_id').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('idx_activities_user').on(table.userId),
  index('idx_activities_type').on(table.type),
  index('idx_activities_created').on(table.createdAt),
]);

// --------------------
// Location Analytics Events
// --------------------
export const locationAnalyticsEvents = mysqlTable(
  'location_analytics_events',
  {
    id: int().autoincrement().primaryKey(),
    eventType: varchar('event_type', { length: 50 }).notNull(),

    locationId: int('location_id').references(() => locations.id, { onDelete: 'set null' }),
    developmentId: int('development_id').references(() => developments.id, { onDelete: 'set null' }),
    listingId: int('listing_id').references(() => listings.id, { onDelete: 'set null' }),

    targetId: int('target_id'),
    metadata: json('metadata'),

    sessionId: varchar('session_id', { length: 100 }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index('idx_loc_analytics_event').on(table.eventType),
    index('idx_loc_analytics_created').on(table.createdAt),
    index('idx_loc_analytics_location').on(table.locationId),
    index('idx_loc_analytics_development').on(table.developmentId),
    index('idx_loc_analytics_user').on(table.userId),
  ],
);

// --------------------
// Location Searches + Recent Searches
// --------------------
export const locationSearches = mysqlTable(
  'location_searches',
  {
    id: int().autoincrement().primaryKey(),
    locationId: int('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    searchedAt: timestamp('searched_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index('idx_location_searched').on(table.locationId, table.searchedAt),
    index('idx_location_searches_user').on(table.userId),
  ],
);

export const recentSearches = mysqlTable(
  'recent_searches',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    locationId: int('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    searchedAt: timestamp('searched_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index('idx_user_recent').on(table.userId, table.searchedAt),
    unique('unique_user_location').on(table.userId, table.locationId),
  ],
);

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
import { locations, cities, suburbs, provinces } from './locations';
import { listings, properties } from './listings';
import { developments } from './developments';

export const analyticsAggregations = mysqlTable('analytics_aggregations', {
  id: int().autoincrement().notNull(),
  type: mysqlEnum(['listing_views', 'agency_views', 'search_terms', 'user_activity']).notNull(),
  date: date({ mode: 'string' }).notNull(),
  locationId: int(),
  data: json().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const analyticsEvents = mysqlTable('analytics_events', {
  id: int().autoincrement().notNull(),
  userId: int(),
  sessionId: varchar({ length: 100 }).notNull(),
  eventType: varchar({ length: 50 }).notNull(),
  eventData: json(),
  url: text(),
  referrer: text(),
  userAgent: text(),
  ipAddress: varchar({ length: 45 }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const priceAnalytics = mysqlTable('price_analytics', {
  id: int().autoincrement().notNull(),
  locationId: int()
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  averagePrice: decimal({ precision: 12, scale: 2 }).notNull(),
  medianPrice: decimal({ precision: 12, scale: 2 }),
  pricePerSqm: decimal({ precision: 10, scale: 2 }),
  propertyType: varchar({ length: 50 }),
  periodStart: date({ mode: 'string' }).notNull(),
  periodEnd: date({ mode: 'string' }).notNull(),
  sampleSize: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const priceHistory = mysqlTable('price_history', {
  id: int().autoincrement().notNull(),
  propertyId: int()
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  price: int().notNull(),
  date: date({ mode: 'string' }).notNull(),
  source: varchar({ length: 50 }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const pricePredictions = mysqlTable('price_predictions', {
  id: int().autoincrement().notNull(),
  locationId: int()
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  propertyType: varchar({ length: 50 }).notNull(),
  predictedGrowth: decimal({ precision: 5, scale: 2 }),
  confidenceScore: int(),
  predictionDate: date({ mode: 'string' }).notNull(),
  horizonMonths: int().notNull(),
  modelVersion: varchar({ length: 50 }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const cityPriceAnalytics = mysqlTable('city_price_analytics', {
  id: int().autoincrement().notNull(),
  cityId: int()
    .notNull()
    .references(() => cities.id, { onDelete: 'cascade' }),
  averagePrice: int().notNull(),
  growthPercentage: decimal({ precision: 5, scale: 2 }),
  marketTrend: mysqlEnum(['up', 'down', 'stable']).default('stable').notNull(),
  propertyCount: int().default(0).notNull(),
  propertyType: varchar({ length: 50 }).default('all').notNull(),
  period: varchar({ length: 20 }).default('monthly').notNull(),
  recordingDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const suburbPriceAnalytics = mysqlTable('suburb_price_analytics', {
  id: int().autoincrement().notNull(),
  suburbId: int()
    .notNull()
    .references(() => suburbs.id, { onDelete: 'cascade' }),
  averagePrice: int().notNull(),
  growthPercentage: decimal({ precision: 5, scale: 2 }),
  marketTrend: mysqlEnum(['up', 'down', 'stable']).default('stable').notNull(),
  propertyCount: int().default(0).notNull(),
  propertyType: varchar({ length: 50 }).default('all').notNull(),
  period: varchar({ length: 20 }).default('monthly').notNull(),
  recordingDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const marketInsightsCache = mysqlTable('market_insights_cache', {
  id: int().autoincrement().notNull(),
  locationType: mysqlEnum(['province', 'city', 'suburb']).notNull(),
  locationId: int().notNull(),
  insightKey: varchar({ length: 100 }).notNull(),
  data: json().notNull(),
  validUntil: timestamp({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const activities = mysqlTable('activities', {
  id: int().autoincrement().notNull(),
  userId: int().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar({ length: 50 }).notNull(),
  entityType: varchar({ length: 50 }).notNull(),
  entityId: int().notNull(),
  metadata: json(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

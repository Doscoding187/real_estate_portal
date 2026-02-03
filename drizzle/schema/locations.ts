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

export const provinces = mysqlTable(
  'provinces',
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 100 }).notNull(),
    code: varchar({ length: 10 }).notNull(),
    latitude: varchar({ length: 20 }),
    longitude: varchar({ length: 21 }),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    slug: varchar({ length: 100 }),
    placeId: varchar('place_id', { length: 255 }),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
  },
  table => [index('idx_province_slug').on(table.slug)],
);

export const cities = mysqlTable(
  'cities',
  {
    id: int().autoincrement().notNull(),
    provinceId: int()
      .notNull()
      .references(() => provinces.id, { onDelete: 'cascade' }),
    name: varchar({ length: 150 }).notNull(),
    latitude: varchar({ length: 20 }),
    longitude: varchar({ length: 21 }),
    isMetro: int().notNull(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    slug: varchar({ length: 100 }),
    placeId: varchar('place_id', { length: 255 }),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
  },
  table => [index('idx_city_slug').on(table.slug)],
);

export const suburbs = mysqlTable(
  'suburbs',
  {
    id: int().autoincrement().notNull(),
    cityId: int()
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    name: varchar({ length: 200 }).notNull(),
    latitude: varchar({ length: 20 }),
    longitude: varchar({ length: 21 }),
    postalCode: varchar({ length: 10 }),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    slug: varchar({ length: 100 }),
  },
  table => [index('idx_suburb_slug').on(table.slug)],
);

export const locations = mysqlTable(
  'locations',
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 200 }).notNull(),
    slug: varchar({ length: 200 }).notNull(),
    type: mysqlEnum(['province', 'city', 'suburb', 'neighborhood']).notNull(),
    parentId: int(),
    description: text(),
    latitude: varchar({ length: 50 }),
    longitude: varchar({ length: 50 }),
    propertyCount: int(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    placeId: varchar('place_id', { length: 255 }),
    viewportNeLat: decimal('viewport_ne_lat', { precision: 10, scale: 8 }),
    viewportNeLng: decimal('viewport_ne_lng', { precision: 11, scale: 8 }),
    viewportSwLat: decimal('viewport_sw_lat', { precision: 10, scale: 8 }),
    viewportSwLng: decimal('viewport_sw_lng', { precision: 11, scale: 8 }),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    heroImage: varchar('hero_image', { length: 500 }),
  },
  table => [index('idx_locations_place_id').on(table.placeId)],
);

export const amenities = mysqlTable(
  'amenities',
  {
    id: int().autoincrement().notNull(),
    locationId: int('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 100 }).notNull(),
    rating: decimal({ precision: 3, scale: 1 }),
    latitude: varchar({ length: 50 }),
    longitude: varchar({ length: 50 }),
    distance: decimal({ precision: 10, scale: 2 }),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_amenities_location_id').on(table.locationId),
    index('idx_amenities_type').on(table.type),
  ],
);

export const locationSearchCache = mysqlTable('location_search_cache', {
  id: int().autoincrement().notNull(),
  searchQuery: varchar({ length: 255 }).notNull(),
  searchType: mysqlEnum(['province', 'city', 'suburb', 'address', 'all']).notNull(),
  resultsJSON: text().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
});

import { mysqlTable, index, int, varchar, text, json, timestamp, date } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

import { users } from './core';
import { properties } from './listings';

export const analyticsEvents = mysqlTable(
  'analytics_events',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id'),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: json('event_data'),
    url: text('url'),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_analytics_events_user').on(table.userId),
    index('idx_analytics_events_type').on(table.eventType),
    index('idx_analytics_events_created').on(table.createdAt),
  ],
);

export const priceHistory = mysqlTable(
  'price_history',
  {
    id: int().autoincrement().primaryKey(),
    propertyId: int('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    price: int('price').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    source: varchar('source', { length: 50 }),
    createdAt: timestamp('created_at', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_price_history_property').on(table.propertyId), index('idx_price_history_date').on(table.date)],
);

export const activities = mysqlTable(
  'activities',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: int('entity_id').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_activities_user').on(table.userId),
    index('idx_activities_type').on(table.type),
    index('idx_activities_created').on(table.createdAt),
  ],
);

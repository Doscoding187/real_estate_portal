import { sql } from 'drizzle-orm';
import {
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';

export const googlePlacesApiLogs = mysqlTable(
  'google_places_api_logs',
  {
    id: int('id').autoincrement().primaryKey(),
    timestamp: timestamp('timestamp', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    requestType: mysqlEnum('request_type', [
      'autocomplete',
      'place_details',
      'geocode',
      'reverse_geocode',
    ]).notNull(),
    sessionToken: varchar('session_token', { length: 255 }),
    success: tinyint('success').default(1).notNull(),
    responseTimeMs: int('response_time_ms').notNull(),
    errorMessage: text('error_message'),
    userId: int('user_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
  },
  table => [
    index('idx_gpal_timestamp').on(table.timestamp),
    index('idx_gpal_request_type').on(table.requestType),
    index('idx_gpal_success').on(table.success),
    index('idx_gpal_session_token').on(table.sessionToken),
    index('idx_gpal_user_id').on(table.userId),
  ],
);

export const googlePlacesApiDailySummary = mysqlTable(
  'google_places_api_daily_summary',
  {
    id: int('id').autoincrement().primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    totalRequests: int('total_requests').default(0).notNull(),
    successfulRequests: int('successful_requests').default(0).notNull(),
    failedRequests: int('failed_requests').default(0).notNull(),
    autocompleteRequests: int('autocomplete_requests').default(0).notNull(),
    placeDetailsRequests: int('place_details_requests').default(0).notNull(),
    geocodeRequests: int('geocode_requests').default(0).notNull(),
    reverseGeocodeRequests: int('reverse_geocode_requests').default(0).notNull(),
    averageResponseTimeMs: decimal('average_response_time_ms', {
      precision: 10,
      scale: 2,
    }),
    totalCostUsd: decimal('total_cost_usd', {
      precision: 10,
      scale: 4,
    }),
  },
  table => [
    unique('google_places_api_daily_summary_date_uq').on(table.date),
    index('idx_gpads_date').on(table.date),
  ],
);

export const googlePlacesApiAlerts = mysqlTable(
  'google_places_api_alerts',
  {
    id: int('id').autoincrement().primaryKey(),
    alertType: mysqlEnum('alert_type', [
      'usage_threshold',
      'error_rate',
      'cost_threshold',
      'response_time',
    ]).notNull(),
    thresholdValue: decimal('threshold_value', {
      precision: 10,
      scale: 2,
    }).notNull(),
    currentValue: decimal('current_value', {
      precision: 10,
      scale: 2,
    }).notNull(),
    triggeredAt: timestamp('triggered_at', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    resolvedAt: timestamp('resolved_at', { mode: 'string' }),
    severity: mysqlEnum('severity', ['info', 'warning', 'critical'])
      .default('warning')
      .notNull(),
    message: text('message').notNull(),
    notified: tinyint('notified').default(0).notNull(),
  },
  table => [
    index('idx_gpaa_triggered').on(table.triggeredAt),
    index('idx_gpaa_type').on(table.alertType),
    index('idx_gpaa_severity').on(table.severity),
    index('idx_gpaa_resolved').on(table.resolvedAt),
  ],
);

export const googlePlacesApiConfig = mysqlTable(
  'google_places_api_config',
  {
    id: int('id').autoincrement().primaryKey(),
    configKey: varchar('config_key', { length: 100 }).notNull(),
    configValue: text('config_value').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('google_places_api_config_key_uq').on(table.configKey),
    index('idx_gpac_key').on(table.configKey),
  ],
);

export type GooglePlacesApiLog = typeof googlePlacesApiLogs.$inferSelect;
export type InsertGooglePlacesApiLog = typeof googlePlacesApiLogs.$inferInsert;

export type GooglePlacesApiDailySummary =
  typeof googlePlacesApiDailySummary.$inferSelect;
export type InsertGooglePlacesApiDailySummary =
  typeof googlePlacesApiDailySummary.$inferInsert;

export type GooglePlacesApiAlert = typeof googlePlacesApiAlerts.$inferSelect;
export type InsertGooglePlacesApiAlert = typeof googlePlacesApiAlerts.$inferInsert;

export type GooglePlacesApiConfig = typeof googlePlacesApiConfig.$inferSelect;
export type InsertGooglePlacesApiConfig = typeof googlePlacesApiConfig.$inferInsert;

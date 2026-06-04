import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

import { users } from './core';
import { distributionDeals } from './distribution';
import { developments, unitTypes } from './developments';
import { leads } from './leads';

export const DEVELOPMENT_OPERATING_TRANSACTION_TYPES = [
  'for_sale',
  'for_rent',
  'auction',
] as const;

export const DEVELOPMENT_OPERATING_EVENT_TYPES = [
  'inventory_status_changed',
  'inventory_quantity_adjusted',
  'price_changed',
  'rent_changed',
  'auction_window_changed',
  'auction_outcome_recorded',
  'lead_stage_changed',
  'showing_scheduled',
  'application_status_changed',
  'registration_status_changed',
  'distribution_enabled',
  'distribution_disabled',
  'distribution_handoff_created',
  'publish_status_changed',
  'operating_note_added',
] as const;

export const DEVELOPMENT_OPERATING_SOURCE_SURFACES = [
  'developer_dashboard',
  'developer_units_manager',
  'developer_leads_manager',
  'distribution_manager',
  'admin_review',
  'system',
] as const;

export const developmentOperatingEvents = mysqlTable(
  'development_operating_events',
  {
    id: int().autoincrement().primaryKey(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    unitTypeId: varchar('unit_type_id', { length: 36 }).references(() => unitTypes.id, {
      onDelete: 'set null',
    }),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    distributionDealId: int('distribution_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    transactionType: mysqlEnum(
      'transaction_type',
      DEVELOPMENT_OPERATING_TRANSACTION_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    eventType: mysqlEnum(
      'event_type',
      DEVELOPMENT_OPERATING_EVENT_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    fromStatus: varchar('from_status', { length: 80 }),
    toStatus: varchar('to_status', { length: 80 }),
    quantityDelta: int('quantity_delta'),
    beforeData: json('before_data'),
    afterData: json('after_data'),
    metadata: json(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    sourceSurface: mysqlEnum(
      'source_surface',
      DEVELOPMENT_OPERATING_SOURCE_SURFACES as unknown as [string, ...string[]],
    )
      .default('developer_dashboard')
      .notNull(),
    eventAt: timestamp('event_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_development_operating_events_development').on(table.developmentId),
    index('idx_development_operating_events_development_time').on(
      table.developmentId,
      table.eventAt,
    ),
    index('idx_development_operating_events_event_type').on(table.eventType),
    index('idx_development_operating_events_actor').on(table.actorUserId),
    index('idx_development_operating_events_unit').on(table.unitTypeId),
    index('idx_development_operating_events_lead').on(table.leadId),
    index('idx_development_operating_events_deal').on(table.distributionDealId),
  ],
);

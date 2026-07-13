import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { agencies, agents } from './agencies';
import { users } from './core';
import { listings } from './listings';

export const SELLER_PROSPECT_STAGE_VALUES = [
  'new',
  'contact_attempted',
  'contacted',
  'follow_up_required',
  'appointment_scheduled',
  'qualified',
  'mandate_won',
  'converted_to_listing',
  'not_interested',
  'lost',
  'archived',
] as const;

export const SELLER_PROSPECT_TERMINAL_STAGE_VALUES = [
  'converted_to_listing',
  'not_interested',
  'lost',
  'archived',
] as const;

export const SELLER_PROSPECT_PRIORITY_VALUES = ['low', 'normal', 'high', 'urgent'] as const;

export const SELLER_PROSPECT_METHOD_VALUES = [
  'door_knocking',
  'phone',
  'referral',
  'sphere',
  'signboard',
  'open_house',
  'digital',
  'walk_in',
  'other',
] as const;

export const SELLER_PROSPECT_PROPERTY_TYPE_VALUES = [
  'apartment',
  'house',
  'farm',
  'land',
  'commercial',
  'shared_living',
] as const;

export const SELLER_PROSPECT_ACTIVITY_TYPE_VALUES = [
  'created',
  'note',
  'call',
  'email',
  'meeting',
  'status_change',
  'assignment',
  'follow_up_scheduled',
  'follow_up_completed',
  'conversion',
  'contact_attempt',
  'mandate_updated',
] as const;

export const SELLER_PROSPECT_CONTACT_CHANNEL_VALUES = [
  'call',
  'whatsapp',
  'email',
  'door_knock',
  'meeting',
  'other',
] as const;

export const SELLER_PROSPECT_CONTACT_OUTCOME_VALUES = [
  'reached',
  'replied',
  'no_answer',
  'voicemail',
  'appointment_booked',
  'follow_up_required',
  'not_interested',
  'invalid_contact',
  'other',
] as const;

export const SELLER_PROSPECT_MANDATE_TYPE_VALUES = [
  'sole',
  'open',
  'dual',
  'auction',
  'other',
] as const;

export const sellerProspects = mysqlTable(
  'seller_prospects',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    assignedAgentId: int('assigned_agent_id').references(() => agents.id, { onDelete: 'set null' }),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    ownerName: varchar('owner_name', { length: 200 }),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 50 }),
    propertyAddress: varchar('property_address', { length: 500 }),
    suburb: varchar('suburb', { length: 120 }),
    city: varchar('city', { length: 120 }),
    province: varchar('province', { length: 120 }),
    propertyType: mysqlEnum(
      'property_type',
      SELLER_PROSPECT_PROPERTY_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    source: varchar('source', { length: 100 }),
    canvassingMethod: mysqlEnum(
      'canvassing_method',
      SELLER_PROSPECT_METHOD_VALUES as unknown as [string, ...string[]],
    )
      .default('other')
      .notNull(),
    stage: mysqlEnum(
      'stage',
      SELLER_PROSPECT_STAGE_VALUES as unknown as [string, ...string[]],
    )
      .default('new')
      .notNull(),
    priority: mysqlEnum(
      'priority',
      SELLER_PROSPECT_PRIORITY_VALUES as unknown as [string, ...string[]],
    )
      .default('normal')
      .notNull(),
    nextFollowUp: timestamp('next_follow_up', { mode: 'string' }),
    nextAction: varchar('next_action', { length: 255 }),
    firstContactedAt: timestamp('first_contacted_at', { mode: 'string' }),
    lastContactedAt: timestamp('last_contacted_at', { mode: 'string' }),
    outcome: text('outcome'),
    mandateType: mysqlEnum(
      'mandate_type',
      SELLER_PROSPECT_MANDATE_TYPE_VALUES as unknown as [string, ...string[]],
    ),
    mandateSignedAt: timestamp('mandate_signed_at', { mode: 'string' }),
    mandateExpiresAt: timestamp('mandate_expires_at', { mode: 'string' }),
    agreedAskingPrice: decimal('agreed_asking_price', { precision: 15, scale: 2 }),
    mandateChecklist: json('mandate_checklist'),
    convertedListingId: int('converted_listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    convertedAt: timestamp('converted_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_seller_prospects_agency_stage').on(table.agencyId, table.stage),
    index('idx_seller_prospects_agency_follow_up').on(table.agencyId, table.nextFollowUp),
    index('idx_seller_prospects_agent_follow_up').on(table.assignedAgentId, table.nextFollowUp),
    index('idx_seller_prospects_agency_area').on(table.agencyId, table.city, table.suburb),
    index('idx_seller_prospects_converted_listing').on(table.convertedListingId),
  ],
);

export const sellerProspectActivities = mysqlTable(
  'seller_prospect_activities',
  {
    id: int().autoincrement().primaryKey(),
    agencyId: int('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    sellerProspectId: int('seller_prospect_id')
      .notNull()
      .references(() => sellerProspects.id, { onDelete: 'cascade' }),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    activityType: mysqlEnum(
      'activity_type',
      SELLER_PROSPECT_ACTIVITY_TYPE_VALUES as unknown as [string, ...string[]],
    ).notNull(),
    description: text('description').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_seller_prospect_activities_prospect').on(table.sellerProspectId, table.createdAt),
    index('idx_seller_prospect_activities_agency_created').on(table.agencyId, table.createdAt),
  ],
);

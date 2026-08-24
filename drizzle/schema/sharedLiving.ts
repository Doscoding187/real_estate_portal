import {
  date,
  json,
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
import { cities, provinces, suburbs } from './locations';
import { leads } from './leads';
import { users } from './core';

/**
 * Shared Living domain: one place per address with many independently
 * available rentable spaces beneath it (one-place-many-spaces invariant).
 * Authority/attribution lives in platform identity records and the
 * verification ledger — never in lister self-description.
 *
 * Structural precedent: drizzle/schema/commercial.ts.
 */

export const slPlaces = mysqlTable(
  'sl_places',
  {
    id: int().autoincrement().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    ownerUserId: int('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    addressLinePrivate: varchar('address_line_private', { length: 255 }).notNull(),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    geoPrecision: mysqlEnum('geo_precision', ['suburb', 'city', 'province'])
      .notNull()
      .default('suburb'),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    placeKind: mysqlEnum('place_kind', [
      'house',
      'apartment',
      'townhouse',
      'student_residence',
      'other',
    ])
      .notNull()
      .default('other'),
    description: text(),
    status: mysqlEnum('status', [
      'draft',
      'pending_review',
      'published',
      'paused',
      'archived',
    ]).notNull().default('draft'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_sl_places_slug').on(table.slug),
    index('idx_sl_places_suburb').on(table.suburbId),
    index('idx_sl_places_city').on(table.cityId),
    index('idx_sl_places_province').on(table.provinceId),
    index('idx_sl_places_status').on(table.status),
  ],
);

export const slSpaces = mysqlTable(
  'sl_spaces',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 180 }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    accommodationType: mysqlEnum('accommodation_type', [
      'private_room',
      'shared_room',
      'en_suite_room',
      'garden_cottage',
      'granny_flat',
      'bachelor_studio',
      'backyard_room',
      'backyard_unit',
      'room_shared_house',
      'room_shared_apartment',
    ]).notNull(),
    marketTag: mysqlEnum('market_tag', ['room_share', 'independent_micro', 'student'])
      .notNull()
      .default('room_share'),
    rentableAreaM2: decimal('rentable_area_m2', { precision: 8, scale: 2 }),
    furnishedState: mysqlEnum('furnished_state', [
      'furnished',
      'unfurnished',
      'partial',
      'unknown',
    ])
      .notNull()
      .default('unknown'),
    bathroomAccess: mysqlEnum('bathroom_access', ['own', 'shared', 'unknown'])
      .notNull()
      .default('unknown'),
    parkingBays: int('parking_bays'),
    status: mysqlEnum('status', ['available', 'occupied', 'paused', 'hidden'])
      .notNull()
      .default('hidden'),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_sl_spaces_slug').on(table.slug),
    index('idx_sl_spaces_place_status').on(table.placeId, table.status),
    index('idx_sl_spaces_type_status').on(table.accommodationType, table.status),
  ],
);

export const slSpaceAvailability = mysqlTable('sl_space_availability', {
  id: int().autoincrement().primaryKey(),
  spaceId: int('space_id')
    .notNull()
    .unique('uq_sl_space_availability_space')
    .references(() => slSpaces.id, { onDelete: 'cascade' }),
  availableFrom: date('available_from', { mode: 'string' }),
  minimumStayMonths: int('minimum_stay_months'),
  rentAmountMinor: int('rent_amount_minor').notNull().default(0),
  rentUnknown: tinyint('rent_unknown').notNull().default(0),
  depositMinor: int('deposit_minor'),
  billsIncludedJson: json('bills_included_json'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .onUpdateNow()
    .notNull(),
});

export const slSpaceSpecifications = mysqlTable(
  'sl_space_specifications',
  {
    id: int().autoincrement().primaryKey(),
    spaceId: int('space_id')
      .notNull()
      .references(() => slSpaces.id, { onDelete: 'cascade' }),
    specificationCode: varchar('specification_code', { length: 64 }).notNull(),
    valueState: mysqlEnum('value_state', ['known', 'unknown']).notNull().default('known'),
    textValue: varchar('text_value', { length: 255 }),
    booleanValue: tinyint('boolean_value'),
    numericValue: decimal('numeric_value', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [unique('uq_sl_space_specifications_code').on(table.spaceId, table.specificationCode)],
);

export const slPlaceHousehold = mysqlTable(
  'sl_place_household',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    occupantsCount: int('occupants_count'),
    occupantsType: mysqlEnum('occupants_type', [
      'professionals',
      'students',
      'family',
      'mixed',
      'unknown',
    ])
      .notNull()
      .default('unknown'),
    smoking: mysqlEnum('smoking', [
      'non_smoking',
      'outdoors_only',
      'smoking_allowed',
      'unknown',
    ])
      .notNull()
      .default('unknown'),
    pets: mysqlEnum('pets', ['none', 'present', 'considered', 'unknown'])
      .notNull()
      .default('unknown'),
    visitors: mysqlEnum('visitors', ['allowed', 'restricted', 'no_visitors'])
      .notNull()
      .default('allowed'),
    cleaning: mysqlEnum('cleaning', ['rota', 'cleaner', 'none', 'unknown'])
      .notNull()
      .default('unknown'),
    genderComposition: varchar('gender_composition', { length: 60 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [unique('uq_sl_place_household_place').on(table.placeId)],
);

export const slVerifications = mysqlTable(
  'sl_verifications',
  {
    id: int().autoincrement().primaryKey(),
    subjectType: mysqlEnum('subject_type', ['user', 'listing']).notNull(),
    subjectId: int('subject_id').notNull(),
    rung: mysqlEnum('rung', [
      'phone',
      'email',
      'relationship',
      'property',
      'student_accreditation',
    ]).notNull(),
    status: mysqlEnum('status', ['verified', 'failed', 'revoked', 'pending_evidence']).notNull(),
    evidenceRef: varchar('evidence_ref', { length: 255 }),
    reviewedBy: int('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    index('idx_sl_verifications_subject').on(
      table.subjectType,
      table.subjectId,
      table.rung,
      table.status,
    ),
  ],
);

export const slLeadContexts = mysqlTable(
  'sl_lead_contexts',
  {
    id: int().autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .unique('uq_sl_lead_contexts_lead')
      .references(() => leads.id, { onDelete: 'cascade' }),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'restrict' }),
    spaceId: int('space_id').references(() => slSpaces.id, { onDelete: 'set null' }),
    spaceLabelSnapshot: varchar('space_label_snapshot', { length: 120 }),
    spaceTypeSnapshot: varchar('space_type_snapshot', { length: 64 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_sl_lead_contexts_place').on(table.placeId)],
);

export const slMessages = mysqlTable(
  'sl_messages',
  {
    id: int().autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    authorKind: mysqlEnum('author_kind', ['consumer', 'lister', 'moderator'])
      .notNull()
      .default('consumer'),
    senderUserId: int('sender_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    body: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_sl_messages_lead_created').on(table.leadId, table.createdAt)],
);

export const slModerationQueue = mysqlTable(
  'sl_moderation_queue',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    action: mysqlEnum('action', [
      'submit',
      'approve',
      'reject',
      'pause',
      'resume',
      'archive',
    ]).notNull(),
    reviewerUserId: int('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    reason: varchar('reason', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_sl_moderation_queue_place').on(table.placeId),
    index('idx_sl_moderation_queue_action').on(table.action),
  ],
);

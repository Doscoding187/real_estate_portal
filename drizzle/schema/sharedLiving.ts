import {
  check,
  date,
  datetime,
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
import { sql } from 'drizzle-orm';
import { leads } from './leads';
import { users } from './core';
import { place } from './placeAuthority';

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
    residenceName: varchar('residence_name', { length: 160 }).notNull().default(''),
    // The physical column retains its legacy name. Its historical meaning is
    // the account that created the residence, not proof of ownership or mandate.
    createdByUserId: int('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    addressLinePrivate: varchar('address_line_private', { length: 255 }).notNull(),
    canonicalPlaceId: varchar('canonical_place_id', { length: 40 }).references(
      () => place.placeId,
      { onDelete: 'restrict', onUpdate: 'restrict' },
    ),
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
    legacyStatus: mysqlEnum('status', [
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
    publicationStatus: mysqlEnum('publication_status', [
      'draft',
      'pending_review',
      'approved',
      'published',
      'rejected',
      'held',
      'paused',
      'archived',
    ]).notNull().default('draft'),
  },
  table => [
    unique('uq_sl_places_slug').on(table.slug),
    index('idx_sl_places_canonical_place').on(table.canonicalPlaceId),
    index('idx_sl_places_status').on(table.legacyStatus),
    index('idx_sl_places_publication').on(table.publicationStatus, table.canonicalPlaceId),
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
    // Kept only for historical compatibility during the additive lifecycle
    // cutover. Runtime publication and availability use the fields below.
    legacyStatus: mysqlEnum('status', ['available', 'occupied', 'paused', 'hidden'])
      .notNull()
      .default('hidden'),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
    // These lifecycle/content columns were appended during the approved
    // additive migration sequence. Keep declaration order aligned with MySQL.
    description: text(),
    availabilityStatus: mysqlEnum('availability_status', ['available', 'occupied', 'unavailable'])
      .notNull()
      .default('unavailable'),
    publicationStatus: mysqlEnum('publication_status', [
      'draft',
      'pending_review',
      'approved',
      'published',
      'rejected',
      'held',
      'paused',
      'archived',
    ]).notNull().default('draft'),
    occupancyCount: int('occupancy_count'),
  },
  table => [
    unique('uq_sl_spaces_slug').on(table.slug),
    index('idx_sl_spaces_place_status').on(table.placeId, table.legacyStatus),
    index('idx_sl_spaces_type_status').on(table.accommodationType, table.legacyStatus),
    index('idx_sl_spaces_publication').on(
      table.publicationStatus,
      table.availabilityStatus,
      table.placeId,
    ),
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
  rentBasis: mysqlEnum('rent_basis', ['per_space', 'per_person']).notNull().default('per_space'),
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

/** Residence-wide facilities and shared facts, distinct from a rentable space. */
export const slPlaceSpecifications = mysqlTable(
  'sl_place_specifications',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
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
  table => [unique('uq_sl_place_specifications_code').on(table.placeId, table.specificationCode)],
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
    spaceId: int('space_id').references(() => slSpaces.id, { onDelete: 'cascade' }),
    subjectType: mysqlEnum('subject_type', ['residence', 'space']).notNull().default('residence'),
  },
  table => [
    index('idx_sl_moderation_queue_place').on(table.placeId),
    index('idx_sl_moderation_queue_action').on(table.action),
    index('idx_sl_moderation_queue_subject').on(table.subjectType, table.spaceId, table.action),
  ],
);

/** The named owner/landlord/operator is separate from the agent account. */
export const slResponsibleParties = mysqlTable(
  'sl_responsible_parties',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    partyRole: mysqlEnum('party_role', ['owner', 'landlord', 'operator']).notNull(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 32 }),
    createdByUserId: int('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    isCurrent: tinyint('is_current').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    index('idx_sl_responsible_parties_place').on(table.placeId, table.isCurrent),
    index('idx_sl_responsible_parties_user').on(table.userId),
  ],
);

/** Residence-specific agent mandate with bounded term and auditable decisions. */
export const slListingAuthorities = mysqlTable(
  'sl_listing_authorities',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    agentUserId: int('agent_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    responsiblePartyId: int('responsible_party_id')
      .notNull()
      .references(() => slResponsibleParties.id, { onDelete: 'restrict' }),
    status: mysqlEnum('status', [
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'revoked',
      'expired',
      'superseded',
    ]).notNull().default('draft'),
    effectiveAt: datetime('effective_at', { mode: 'string' }).notNull(),
    expiresAt: datetime('expires_at', { mode: 'string' }).notNull(),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: datetime('reviewed_at', { mode: 'string' }),
    reviewReason: varchar('review_reason', { length: 500 }),
    revokedByUserId: int('revoked_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    revokedAt: datetime('revoked_at', { mode: 'string' }),
    revocationReason: varchar('revocation_reason', { length: 500 }),
    createdByUserId: int('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    index('idx_sl_listing_authorities_place_status').on(
      table.placeId,
      table.status,
      table.effectiveAt,
      table.expiresAt,
    ),
    index('idx_sl_listing_authorities_agent_status').on(table.agentUserId, table.status),
    check(
      'chk_sl_listing_authorities_dates',
      sql.raw('`expires_at` > `effective_at`'),
    ),
  ],
);

/** Private mandate documents. Storage keys are never returned in public DTOs. */
export const slListingAuthorityEvidence = mysqlTable(
  'sl_listing_authority_evidence',
  {
    id: int().autoincrement().primaryKey(),
    authorityId: int('authority_id')
      .notNull()
      .references(() => slListingAuthorities.id, { onDelete: 'cascade' }),
    storageAdapter: mysqlEnum('storage_adapter', ['local', 's3']).notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 80 }).notNull(),
    byteSize: int('byte_size').notNull(),
    uploadedByUserId: int('uploaded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_sl_authority_evidence_storage_key').on(table.storageKey),
    index('idx_sl_authority_evidence_authority').on(table.authorityId, table.createdAt),
  ],
);

export const slListingAuthorityEvents = mysqlTable(
  'sl_listing_authority_events',
  {
    id: int().autoincrement().primaryKey(),
    authorityId: int('authority_id')
      .notNull()
      .references(() => slListingAuthorities.id, { onDelete: 'cascade' }),
    eventType: mysqlEnum('event_type', [
      'submitted',
      'approved',
      'rejected',
      'revoked',
      'expired',
      'superseded',
    ]).notNull(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    previousStatus: varchar('previous_status', { length: 32 }),
    nextStatus: varchar('next_status', { length: 32 }).notNull(),
    reason: varchar('reason', { length: 500 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_sl_listing_authority_events_authority').on(table.authorityId, table.createdAt)],
);

/** Residence photographs use the existing media storage adapter and review. */
export const slPlaceMedia = mysqlTable(
  'sl_place_media',
  {
    id: int().autoincrement().primaryKey(),
    placeId: int('place_id')
      .notNull()
      .references(() => slPlaces.id, { onDelete: 'cascade' }),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    uploadedByUserId: int('uploaded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    contentType: varchar('content_type', { length: 80 }).notNull(),
    byteSize: int('byte_size').notNull(),
    caption: varchar('caption', { length: 255 }),
    displayOrder: int('display_order').notNull().default(0),
    isCover: tinyint('is_cover').notNull().default(0),
    reviewStatus: mysqlEnum('review_status', ['pending_review', 'approved', 'rejected'])
      .notNull()
      .default('pending_review'),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: datetime('reviewed_at', { mode: 'string' }),
    reviewReason: varchar('review_reason', { length: 500 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_sl_place_media_storage_key').on(table.storageKey),
    index('idx_sl_place_media_place_review').on(table.placeId, table.reviewStatus, table.displayOrder),
  ],
);

/** Space photographs are typed independently from parent-residence media. */
export const slSpaceMedia = mysqlTable(
  'sl_space_media',
  {
    id: int().autoincrement().primaryKey(),
    spaceId: int('space_id')
      .notNull()
      .references(() => slSpaces.id, { onDelete: 'cascade' }),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    uploadedByUserId: int('uploaded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    contentType: varchar('content_type', { length: 80 }).notNull(),
    byteSize: int('byte_size').notNull(),
    caption: varchar('caption', { length: 255 }),
    displayOrder: int('display_order').notNull().default(0),
    isCover: tinyint('is_cover').notNull().default(0),
    reviewStatus: mysqlEnum('review_status', ['pending_review', 'approved', 'rejected'])
      .notNull()
      .default('pending_review'),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: datetime('reviewed_at', { mode: 'string' }),
    reviewReason: varchar('review_reason', { length: 500 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_sl_space_media_storage_key').on(table.storageKey),
    index('idx_sl_space_media_space_review').on(table.spaceId, table.reviewStatus, table.displayOrder),
  ],
);

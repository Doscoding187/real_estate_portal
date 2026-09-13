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
  mysqlView,
  tinyint,
  bigint,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';
import { properties, listings } from './listings';
import { developments, developerBrandProfiles } from './developments';
import { cataloguePublishers, developerOrganisations } from './developerIdentity';
import { agencies, agents } from './agencies';
import { commercialAssets, commercialAvailabilities, commercialSpaces } from './commercial';

/** Platform-owned identity for the private prospect journey. */
export const prospectIdentities = mysqlTable(
  'prospect_identities',
  {
    id: varchar({ length: 36 }).primaryKey(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    contactPreferences: json('contact_preferences'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [unique('uq_prospect_identities_user').on(table.userId)],
);

export const leads = mysqlTable(
  'leads',
  {
    id: int().autoincrement().primaryKey(),
  propertyId: int('propertyId').references(() => properties.id, { onDelete: 'set null' }),
  developmentId: int('developmentId').references(() => developments.id, { onDelete: 'set null' }),
  agencyId: int('agencyId').references(() => agencies.id, { onDelete: 'set null' }),
  agentId: int('agentId').references(() => agents.id, { onDelete: 'set null' }),
  name: varchar({ length: 200 }).notNull(),
  email: varchar({ length: 320 }).notNull(),
  phone: varchar({ length: 50 }),
  message: text(),
  unitId: varchar('unit_id', { length: 36 }),
  unitName: varchar('unit_name', { length: 255 }),
  unitPriceFrom: decimal('unit_price_from', { precision: 15, scale: 2 }),
  unitBedrooms: int('unit_bedrooms'),
  unitBathrooms: decimal('unit_bathrooms', { precision: 3, scale: 1 }),
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
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  nextFollowUp: timestamp('nextFollowUp', { mode: 'string' }),
  nextAction: varchar('nextAction', { length: 255 }),
  firstRespondedAt: timestamp('firstRespondedAt', { mode: 'string' }),
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
    prospectIdentityId: varchar('prospect_identity_id', { length: 36 }).references(
      () => prospectIdentities.id,
      { onDelete: 'set null' },
    ),
    captureRequestId: varchar('capture_request_id', { length: 128 }),
    consentCapturedAt: timestamp('consent_captured_at', { mode: 'string' }),
    consentVersion: varchar('consent_version', { length: 64 }),
    consentSource: varchar('consent_source', { length: 100 }),
    deliveryStatus: mysqlEnum('delivery_status', [
      'pending',
      'delivered',
      'failed',
      'attention_required',
    ])
      .default('pending')
      .notNull(),
    deliveryLastAttemptAt: timestamp('delivery_last_attempt_at', { mode: 'string' }),
    deliveryNextAttemptAt: timestamp('delivery_next_attempt_at', { mode: 'string' }),
    deliveryLastError: text('delivery_last_error'),
    deliveryProviderReference: varchar('delivery_provider_reference', { length: 255 }),
    cataloguePublisherId: int('catalogue_publisher_id').references(
      () => cataloguePublishers.id,
      { onDelete: 'set null' },
    ),
    // Appended by migration 0034; Listing is the canonical marketing source for new Land leads.
    listingId: int('listing_id').references(() => listings.id, { onDelete: 'restrict' }),
  },
  table => [unique('uq_leads_capture_request').on(table.captureRequestId), index('idx_leads_listing_id').on(table.listingId)],
);

export const LEAD_DELIVERY_PURPOSES = [
  'primary_custody',
  'notification',
  'platform_action',
] as const;
export const LEAD_DELIVERY_CHANNELS = ['crm_export', 'email', 'manual', 'none'] as const;
export const LEAD_DELIVERY_RECIPIENT_TYPES = ['agent', 'agency', 'developer', 'manual'] as const;
export const LEAD_DELIVERY_STATES = [
  'queued',
  'claimed',
  'accepted',
  'completed',
  'retryable_failed',
  'exhausted',
  'unknown',
  'cancelled',
  'superseded',
] as const;
export const LEAD_DELIVERY_ATTEMPT_STATES = [
  'queued',
  'claimed',
  'accepted',
  'completed',
  'retryable_failed',
  'exhausted',
  'unknown',
  'expired',
] as const;

/**
 * One durable obligation to hand a captured lead to one explicit destination.
 * Operational history belongs in leadDeliveryAttempts; this row is the
 * current routing revision and scheduling authority.
 */
export const leadDeliveries = mysqlTable(
  'lead_deliveries',
  {
    id: int('id').autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    purpose: mysqlEnum('purpose', LEAD_DELIVERY_PURPOSES as unknown as [string, ...string[]]).notNull(),
    routingRevision: int('routing_revision').default(1).notNull(),
    channel: mysqlEnum('channel', LEAD_DELIVERY_CHANNELS as unknown as [string, ...string[]]).notNull(),
    recipientType: mysqlEnum(
      'recipient_type',
      LEAD_DELIVERY_RECIPIENT_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    recipientUserId: int('recipient_user_id').references(() => users.id, { onDelete: 'set null' }),
    recipientAgentId: int('recipient_agent_id').references(() => agents.id, { onDelete: 'set null' }),
    recipientAgencyId: int('recipient_agency_id').references(() => agencies.id, { onDelete: 'set null' }),
    recipientDeveloperOrganisationId: int('recipient_developer_organisation_id').references(
      () => developerOrganisations.id,
      { onDelete: 'set null' },
    ),
    recipientPublisherId: int('recipient_publisher_id').references(() => cataloguePublishers.id, {
      onDelete: 'set null',
    }),
    destinationName: varchar('destination_name', { length: 255 }),
    destinationAddress: varchar('destination_address', { length: 320 }),
    destinationSnapshot: json('destination_snapshot'),
    supplyOrigin: mysqlEnum('supply_origin', [
      'customer_managed',
      'platform_curated',
      'shared_living',
    ]).notNull(),
    leadCustody: mysqlEnum('lead_custody', [
      'verified_customer_recipient',
      'platform_managed',
      'attention_required',
    ]).notNull(),
    state: mysqlEnum('state', LEAD_DELIVERY_STATES as unknown as [string, ...string[]])
      .default('queued')
      .notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    dueAt: timestamp('due_at', { mode: 'string', fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
    maxAttempts: int('max_attempts').default(3).notNull(),
    completedAt: timestamp('completed_at', { mode: 'string', fsp: 6 }),
    supersededAt: timestamp('superseded_at', { mode: 'string', fsp: 6 }),
    createdAt: timestamp('created_at', { mode: 'string', fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string', fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_lead_deliveries_idempotency').on(table.idempotencyKey),
    unique('uq_lead_deliveries_lead_purpose_revision').on(
      table.leadId,
      table.purpose,
      table.routingRevision,
    ),
    index('idx_lead_deliveries_due').on(table.state, table.dueAt),
    index('idx_lead_deliveries_lead_current').on(
      table.leadId,
      table.purpose,
      table.routingRevision,
      table.state,
    ),
    index('idx_lead_deliveries_recipient_agent').on(table.recipientAgentId, table.state),
    index('idx_lead_deliveries_recipient_agency').on(table.recipientAgencyId, table.state),
    index('idx_lead_deliveries_recipient_developer').on(
      table.recipientDeveloperOrganisationId,
      table.state,
    ),
    index('idx_lead_deliveries_recipient_user').on(table.recipientUserId, table.state),
  ],
);

/** Append-only claim/provider history for a delivery obligation. */
export const leadDeliveryAttempts = mysqlTable(
  'lead_delivery_attempts',
  {
    id: int('id').autoincrement().primaryKey(),
    deliveryId: int('delivery_id')
      .notNull()
      .references(() => leadDeliveries.id, { onDelete: 'cascade' }),
    attemptNumber: int('attempt_number').notNull(),
    state: mysqlEnum(
      'state',
      LEAD_DELIVERY_ATTEMPT_STATES as unknown as [string, ...string[]],
    )
      .default('queued')
      .notNull(),
    leaseToken: varchar('lease_token', { length: 128 }),
    leaseGeneration: int('lease_generation').default(0).notNull(),
    claimedAt: timestamp('claimed_at', { mode: 'string', fsp: 6 }),
    leaseExpiresAt: timestamp('lease_expires_at', { mode: 'string', fsp: 6 }),
    acceptedAt: timestamp('accepted_at', { mode: 'string', fsp: 6 }),
    completedAt: timestamp('completed_at', { mode: 'string', fsp: 6 }),
    providerReference: varchar('provider_reference', { length: 255 }),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: varchar('error_message', { length: 1000 }),
    createdAt: timestamp('created_at', { mode: 'string', fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string', fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .onUpdateNow()
      .notNull(),
  },
  table => [
    unique('uq_lead_delivery_attempt_number').on(table.deliveryId, table.attemptNumber),
    unique('uq_lead_delivery_attempt_lease').on(table.leaseToken),
    index('idx_lead_delivery_attempts_delivery').on(table.deliveryId, table.attemptNumber),
    index('idx_lead_delivery_attempts_claim_expiry').on(table.state, table.leaseExpiresAt),
    index('idx_lead_delivery_attempts_provider_reference').on(table.providerReference),
  ],
);

export const leadActivities = mysqlTable('lead_activities', {
  id: int().autoincrement().primaryKey(),
  leadId: int()
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  userId: int().references(() => users.id, { onDelete: 'set null' }),
  type: mysqlEnum(['note', 'call', 'email', 'meeting', 'status_change', 'contact_attempt']).notNull(),
  description: text(),
  metadata: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

/** Immutable Commercial inventory context captured with a public enquiry. */
export const commercialLeadContexts = mysqlTable(
  'commercial_lead_contexts',
  {
    id: int().autoincrement().primaryKey(),
    leadId: int('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    commercialAssetId: int('commercial_asset_id')
      .notNull()
      .references(() => commercialAssets.id, { onDelete: 'restrict' }),
    commercialSpaceId: int('commercial_space_id')
      .notNull()
      .references(() => commercialSpaces.id, { onDelete: 'restrict' }),
    commercialAvailabilityId: int('commercial_availability_id')
      .notNull()
      .references(() => commercialAvailabilities.id, { onDelete: 'restrict' }),
    listingId: int('listing_id').notNull().references(() => listings.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_commercial_lead_contexts_lead').on(table.leadId),
    index('idx_commercial_lead_contexts_availability').on(table.commercialAvailabilityId),
  ],
);

export const recentlyViewed = mysqlTable('recently_viewed', {
  id: int().autoincrement().primaryKey(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  listingId: int()
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  // This fact is updated when a user revisits a listing. Microsecond precision
  // is therefore part of the ordering contract, rather than display detail.
  viewedAt: timestamp({ mode: 'string', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).notNull(),
}, table => [
  unique('uq_recently_viewed_user_listing').on(table.userId, table.listingId),
  index('idx_recently_viewed_user_viewed_at').on(table.userId, table.viewedAt),
]);

export const offers = mysqlTable('offers', {
  id: int().autoincrement().primaryKey(),
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
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const showings = mysqlTable(
  'showings',
  {
    id: int().autoincrement().primaryKey(),
    listingId: int('listingId').references(() => listings.id, { onDelete: 'set null' }),
    propertyId: int('propertyId').references(() => properties.id, { onDelete: 'set null' }),
    leadId: int('leadId').references(() => leads.id, { onDelete: 'set null' }),
    agentId: int().references(
      () => agents.id,
      { onDelete: 'set null' },
    ),
    scheduledAt: timestamp({ mode: 'string' }).notNull(),
    status: mysqlEnum([
      'requested',
      'awaiting_confirmation',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ])
      .default('requested')
      .notNull(),
    visitorId: int().references(() => users.id, { onDelete: 'set null' }),
    prospectIdentityId: varchar('prospect_identity_id', { length: 36 }).references(
      () => prospectIdentities.id,
      { onDelete: 'set null' },
    ),
    createdByUserId: int('createdByUserId').references(() => users.id, { onDelete: 'set null' }),
    visitorName: varchar({ length: 150 }),
    durationMinutes: int().default(30).notNull(),
    notes: text(),
    feedback: text(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_showings_agent_scheduled_at').on(table.agentId, table.scheduledAt),
    index('idx_showings_listing').on(table.listingId),
    index('idx_showings_property').on(table.propertyId),
    index('idx_showings_creator').on(table.createdByUserId),
  ],
);

/** Immutable action attribution; it describes the action, never a new person. */
export const prospectActionAttributions = mysqlTable(
  'prospect_action_attributions',
  {
    id: int().autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    sourceType: varchar('source_type', { length: 80 }).notNull(),
    sourceEntityId: varchar('source_entity_id', { length: 120 }),
    campaignContext: json('campaign_context'),
    utmContext: json('utm_context'),
    referrerContext: text('referrer_context'),
    firstTouch: json('first_touch'),
    lastTouch: json('last_touch'),
    actionTouch: json('action_touch').notNull(),
    capturedAt: timestamp('captured_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [unique('uq_prospect_action_attribution_lead').on(table.leadId)],
);

/** One-time proof links exactly one historical lead to the authenticated owner. */
export const prospectActionClaimTokens = mysqlTable(
  'prospect_action_claim_tokens',
  {
    id: int().autoincrement().primaryKey(),
    leadId: int('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'string' }),
    claimedByUserId: int('claimed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_prospect_action_claim_token_hash').on(table.tokenHash),
    index('idx_prospect_action_claim_lead').on(table.leadId),
  ],
);

export const favorites = mysqlTable(
  'favorites',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    propertyId: int('property_id')
      .notNull()
      .references(() => properties.id),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_favorites_user_property').on(table.userId, table.propertyId),
    index('idx_favorites_property').on(table.propertyId),
  ],
);

export const savedSearches = mysqlTable(
  'saved_searches',
  {
    id: int().autoincrement().primaryKey(),
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
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_saved_searches_user').on(table.userId),
    index('idx_saved_searches_frequency').on(table.notificationFrequency),
  ],
);

export const savedSearchDeliveryHistory = mysqlTable(
  'saved_search_delivery_history',
  {
    id: int().autoincrement().primaryKey(),
    savedSearchId: int('saved_search_id').references(() => savedSearches.id, {
      onDelete: 'set null',
    }),
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    searchName: varchar('search_name', { length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    listingSource: mysqlEnum('saved_search_listing_source', ['manual', 'development', 'all'])
      .notNull()
      .default('all'),
    notificationFrequency: mysqlEnum('saved_search_delivery_frequency', [
      'instant',
      'daily',
      'weekly',
      'never',
    ])
      .notNull()
      .default('daily'),
    totalMatches: int('total_matches').notNull().default(0),
    newMatchCount: int('new_match_count').notNull().default(0),
    inAppRequested: tinyint('in_app_requested').notNull().default(0),
    emailRequested: tinyint('email_requested').notNull().default(0),
    inAppDelivered: tinyint('in_app_delivered').notNull().default(0),
    emailDelivered: tinyint('email_delivered').notNull().default(0),
    status: mysqlEnum('saved_search_delivery_status', [
      'delivered',
      'partial',
      'skipped',
      'failed',
    ])
      .notNull()
      .default('delivered'),
    retryState: mysqlEnum('saved_search_delivery_retry_state', [
      'not_needed',
      'pending',
      'retrying',
      'succeeded',
      'abandoned',
    ])
      .notNull()
      .default('not_needed'),
    retryCount: int('retry_count').notNull().default(0),
    maxRetryCount: int('max_retry_count').notNull().default(3),
    nextRetryAt: timestamp('next_retry_at', { mode: 'string' }),
    lastRetryAt: timestamp('last_retry_at', { mode: 'string' }),
    actionUrl: varchar('action_url', { length: 500 }),
    previewMatches: json('preview_matches'),
    error: text(),
    processedAt: timestamp('processed_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_saved_search_delivery_history_saved_search').on(table.savedSearchId),
    index('idx_saved_search_delivery_history_user').on(table.userId),
    index('idx_saved_search_delivery_history_status').on(table.status),
    index('idx_saved_search_delivery_history_retry_state').on(table.retryState),
    index('idx_saved_search_delivery_history_next_retry').on(table.nextRetryAt),
    index('idx_saved_search_delivery_history_processed').on(table.processedAt),
  ],
);

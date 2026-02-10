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
import { plans } from './billing';
import { locations } from './locations';

export const developers = mysqlTable(
  'developers',
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    logo: text(),
    website: varchar({ length: 255 }),
    email: varchar({ length: 320 }),
    phone: varchar({ length: 50 }),
    address: text(),
    city: varchar({ length: 100 }),
    province: varchar({ length: 100 }),
    category: mysqlEnum(['residential', 'commercial', 'mixed_use', 'industrial'])
      .default('residential')
      .notNull(),
    establishedYear: int(),
    trackRecord: text(),
    pastProjects: int().default(0),
    totalProjects: int(),
    rating: decimal({ precision: 3, scale: 2 }).default('0.00'),
    reviewCount: int().default(0),
    isVerified: int().notNull(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    userId: int()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
    rejectionReason: text(),
    approvedBy: int().references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp({ mode: 'string' }),
    rejectedBy: int().references(() => users.id, { onDelete: 'set null' }),
    rejectedAt: timestamp({ mode: 'string' }),
    completedProjects: int().default(0),
    currentProjects: int().default(0),
    upcomingProjects: int().default(0),
    specializations: json(),
    kpiCache: json(),
    lastKpiCalculation: timestamp({ mode: 'string' }),
    slug: varchar({ length: 255 }),
    isTrusted: tinyint('is_trusted').default(0).notNull(),
  },
  table => [
    index('idx_developers_userId').on(table.userId),
    index('idx_developers_status').on(table.status),
    index('idx_developers_last_kpi_calculation').on(table.lastKpiCalculation),
  ],
);

export const developerBrandProfiles = mysqlTable(
  'developer_brand_profiles',
  {
    id: int().autoincrement().notNull(),
    brandName: varchar('brand_name', { length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    logoUrl: text('logo_url'),
    about: text(),
    foundedYear: int('founded_year'),
    headOfficeLocation: varchar('head_office_location', { length: 255 }),
    operatingProvinces: json('operating_provinces'),
    propertyFocus: json('property_focus'),
    websiteUrl: varchar('website_url', { length: 500 }),
    publicContactEmail: varchar('public_contact_email', { length: 320 }),
    brandTier: mysqlEnum('brand_tier', ['national', 'regional', 'boutique']).default('regional'),
    sourceAttribution: varchar('source_attribution', { length: 255 }),
    profileType: mysqlEnum('profile_type', ['industry_reference', 'verified_partner']).default(
      'industry_reference',
    ),
    isSubscriber: tinyint('is_subscriber').default(0).notNull(),
    isClaimable: tinyint('is_claimable').default(1).notNull(),
    isVisible: tinyint('is_visible').default(1).notNull(),
    isContactVerified: tinyint('is_contact_verified').default(0).notNull(),
    linkedDeveloperAccountId: int('linked_developer_account_id').references(() => developers.id, {
      onDelete: 'set null',
    }),
    ownerType: mysqlEnum('owner_type', ['platform', 'developer']).default('platform').notNull(),
    claimRequestedAt: timestamp('claim_requested_at', { mode: 'string' }),
    totalLeadsReceived: int('total_leads_received').default(0).notNull(),
    lastLeadDate: timestamp('last_lead_date', { mode: 'string' }),
    unclaimedLeadCount: int('unclaimed_lead_count').default(0).notNull(),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    identityType: mysqlEnum('identity_type', ['developer', 'marketing_agency', 'hybrid'])
      .default('developer')
      .notNull(),
    seedBatchId: varchar('seed_batch_id', { length: 36 }),
  },
  table => [
    index('idx_brand_profiles_slug').on(table.slug),
    index('idx_brand_profiles_tier').on(table.brandTier),
    index('idx_brand_profiles_visible').on(table.isVisible),
    index('idx_brand_profiles_subscriber').on(table.isSubscriber),
    index('idx_brand_profiles_owner').on(table.ownerType),
  ],
);

export const developerNotifications = mysqlTable(
  'developer_notifications',
  {
    id: int().autoincrement().notNull(),
    developerId: int('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'cascade' }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    title: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    type: varchar({ length: 50 }).notNull(),
    severity: mysqlEnum(['info', 'warning', 'error', 'success']).default('info').notNull(),
    read: tinyint().default(0).notNull(),
    actionUrl: varchar('action_url', { length: 500 }),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_developer_notifications_developer_id').on(table.developerId),
    index('idx_developer_notifications_user_id').on(table.userId),
    index('idx_developer_notifications_read').on(table.read),
    index('idx_developer_notifications_created_at').on(table.createdAt),
    index('idx_developer_notifications_type').on(table.type),
    index('idx_developer_notifications_feed').on(table.developerId, table.read, table.createdAt),
  ],
);

export const developerSubscriptions = mysqlTable(
  'developer_subscriptions',
  {
    id: int().autoincrement().notNull(),
    developerId: int('developer_id')
      .notNull()
      .references(() => developers.id),
    planId: int('plan_id').references(() => plans.id, { onDelete: 'cascade' }),
    tier: mysqlEnum(['free_trial', 'basic', 'premium']).default('free_trial').notNull(),
    status: mysqlEnum(['active', 'cancelled', 'expired']).default('active').notNull(),
    trialEndsAt: timestamp('trial_ends_at', { mode: 'string' }),
    currentPeriodStart: timestamp('current_period_start', { mode: 'string' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'string' }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_developer_subscriptions_developer_id').on(table.developerId),
    index('idx_developer_subscriptions_status').on(table.status),
    index('idx_developer_subscriptions_tier').on(table.tier),
  ],
);

export const developerSubscriptionLimits = mysqlTable(
  'developer_subscription_limits',
  {
    id: int().autoincrement().notNull(),
    subscriptionId: int('subscription_id')
      .notNull()
      .references(() => developerSubscriptions.id),
    maxDevelopments: int('max_developments').default(1).notNull(),
    maxLeadsPerMonth: int('max_leads_per_month').default(50).notNull(),
    maxTeamMembers: int('max_team_members').default(1).notNull(),
    analyticsRetentionDays: int('analytics_retention_days').default(30).notNull(),
    crmIntegrationEnabled: tinyint('crm_integration_enabled').default(0).notNull(),
    advancedAnalyticsEnabled: tinyint('advanced_analytics_enabled').default(0).notNull(),
    bondIntegrationEnabled: tinyint('bond_integration_enabled').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [index('idx_developer_subscription_limits_subscription_id').on(table.subscriptionId)],
);

export const developerSubscriptionUsage = mysqlTable(
  'developer_subscription_usage',
  {
    id: int().autoincrement().notNull(),
    subscriptionId: int('subscription_id')
      .notNull()
      .references(() => developerSubscriptions.id),
    developmentsCount: int('developments_count').default(0).notNull(),
    leadsThisMonth: int('leads_this_month').default(0).notNull(),
    teamMembersCount: int('team_members_count').default(0).notNull(),
    lastResetAt: timestamp('last_reset_at', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [index('idx_developer_subscription_usage_subscription_id').on(table.subscriptionId)],
);

export const developments = mysqlTable(
  'developments',
  {
    id: int().autoincrement().notNull(),
    developerId: int('developer_id').references(() => developers.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    developmentType: mysqlEnum(['residential', 'commercial', 'mixed_use', 'land']).notNull(),
    address: text(),
    city: varchar({ length: 100 }).notNull(),
    province: varchar({ length: 100 }).notNull(),
    latitude: varchar({ length: 50 }),
    longitude: varchar({ length: 50 }),
    totalUnits: int(),
    availableUnits: int(),
    priceFrom: int(),
    priceTo: int(),
    amenities: text(),
    images: text(),
    videos: text(),
    completionDate: timestamp({ mode: 'string' }),
    isFeatured: int().default(0).notNull(),
    views: int().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    slug: varchar({ length: 255 }),
    isPublished: tinyint().default(0).notNull(),
    publishedAt: timestamp({ mode: 'string' }),
    showHouseAddress: tinyint().default(1).notNull(),
    floorPlans: text(),
    brochures: text(),
    rating: decimal({ precision: 3, scale: 2 }),
    suburb: varchar({ length: 100 }),
    locationId: int('location_id'),
    postalCode: varchar('postal_code', { length: 20 }),
    gpsAccuracy: mysqlEnum('gps_accuracy', ['accurate', 'approximate']).default('approximate'),
    highlights: json(),
    features: json(),
    inquiriesCount: int('inquiries_count').default(0),
    demandScore: int('demand_score').default(0),
    isHotSelling: int('is_hot_selling').default(0),
    isHighDemand: int('is_high_demand').default(0),
    approvalStatus: mysqlEnum('approval_status', [
      'draft',
      'pending',
      'approved',
      'rejected',
    ]).default('draft'),

    readinessScore: int('readiness_score').default(0).notNull(),
    rejectionReasons: json('rejection_reasons'),
    rejectionNote: text('rejection_note'),
    developerBrandProfileId: int('developer_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'set null' },
    ),
    devOwnerType: mysqlEnum('dev_owner_type', ['platform', 'developer']).default('developer'),
    isShowcase: tinyint('is_showcase').default(0),
    marketingBrandProfileId: int('marketing_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'set null' },
    ),
    marketingRole: mysqlEnum('marketing_role', ['exclusive', 'joint', 'open']),
    tagline: varchar({ length: 255 }),
    marketingName: varchar('marketing_name', { length: 255 }),
    monthlyLevyTo: decimal('monthly_levy_to', { precision: 10, scale: 2 }),
    ratesTo: decimal('rates_to', { precision: 10, scale: 2 }),
    monthlyLevyFrom: decimal('monthly_levy_from', { precision: 10, scale: 2 }),
    ratesFrom: decimal('rates_from', { precision: 10, scale: 2 }),
    transferCostsIncluded: tinyint('transfer_costs_included').default(0),
    estateSpecs: json(),
    customClassification: varchar('custom_classification', { length: 255 }),
    nature: mysqlEnum(['new', 'phase', 'extension', 'redevelopment']).default('new').notNull(),
    totalDevelopmentArea: int('total_development_area'),
    propertyTypes: json('property_types'),
    status: mysqlEnum(['launching-soon', 'selling', 'sold-out'])
      .default('launching-soon')
      .notNull(),
    legacyStatus: mysqlEnum('legacy_status', [
      'planning',
      'under_construction',
      'completed',
      'coming_soon',
      'now-selling',
      'launching-soon',
      'ready-to-move',
      'sold-out',
      'phase-completed',
      'new-phase-launching',
      'pre_launch',
      'ready',
    ]),
    constructionPhase: mysqlEnum('construction_phase', [
      'planning',
      'under_construction',
      'completed',
      'phase_completed',
    ]),
    subtitle: varchar({ length: 255 }),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    ownershipType: varchar('ownership_type', { length: 255 }),
    structuralType: varchar('structural_type', { length: 255 }),
    floors: int(),
    transactionType: mysqlEnum('transaction_type', ['for_sale', 'for_rent', 'auction'])
      .default('for_sale')
      .notNull(),
    monthlyRentFrom: decimal('monthly_rent_from', { precision: 15, scale: 2 }),
    monthlyRentTo: decimal('monthly_rent_to', { precision: 15, scale: 2 }),
    auctionStartDate: datetime('auction_start_date', { mode: 'string' }),
    auctionEndDate: datetime('auction_end_date', { mode: 'string' }),
    startingBidFrom: decimal('starting_bid_from', { precision: 15, scale: 2 }),
    reservePriceFrom: decimal('reserve_price_from', { precision: 15, scale: 2 }),
  },
  table => [
    index('idx_developments_slug').on(table.slug),
    index('idx_developments_location').on(table.latitude, table.longitude),
    index('idx_developments_auction_dates').on(table.auctionStartDate, table.auctionEndDate),
  ],
);

export const developmentPhases = mysqlTable(
  'development_phases',
  {
    id: int().autoincrement().notNull(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id),
    name: varchar({ length: 255 }).notNull(),
    phaseNumber: int('phase_number').notNull(),
    description: text(),
    status: mysqlEnum(['planning', 'pre_launch', 'selling', 'sold_out', 'completed'])
      .default('planning')
      .notNull(),
    totalUnits: int('total_units').default(0).notNull(),
    availableUnits: int('available_units').default(0).notNull(),
    priceFrom: int('price_from'),
    priceTo: int('price_to'),
    launchDate: timestamp('launch_date', { mode: 'string' }),
    completionDate: timestamp('completion_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    specType: mysqlEnum('spec_type', ['affordable', 'gap', 'luxury', 'custom']).default(
      'affordable',
    ),
    customSpecType: varchar('custom_spec_type', { length: 100 }),
    finishingDifferences: json('finishing_differences'),
    phaseHighlights: json('phase_highlights'),
    latitude: decimal({ precision: 10, scale: 7 }),
    longitude: decimal({ precision: 10, scale: 7 }),
  },
  table => [
    index('idx_development_phases_development_id').on(table.developmentId),
    index('idx_development_phases_status').on(table.status),
    index('idx_development_phases_spec_type').on(table.specType),
  ],
);

export const developmentUnits = mysqlTable(
  'development_units',
  {
    id: int().autoincrement().notNull(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id),
    phaseId: int('phase_id').references(() => developmentPhases.id, { onDelete: 'cascade' }),
    unitNumber: varchar('unit_number', { length: 100 }).notNull(),
    unitType: mysqlEnum('unit_type', [
      'studio',
      '1bed',
      '2bed',
      '3bed',
      '4bed+',
      'penthouse',
      'townhouse',
      'house',
    ]).notNull(),
    bedrooms: int(),
    bathrooms: decimal({ precision: 3, scale: 1 }),
    size: decimal({ precision: 10, scale: 2 }),
    price: decimal({ precision: 12, scale: 2 }).notNull(),
    floorPlan: text('floor_plan'),
    floor: int(),
    facing: varchar({ length: 50 }),
    features: text(),
    status: mysqlEnum(['available', 'reserved', 'sold']).default('available').notNull(),
    reservedAt: timestamp('reserved_at', { mode: 'string' }),
    reservedBy: int('reserved_by'),
    soldAt: timestamp('sold_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('unique_unit_per_development').on(table.developmentId, table.unitNumber),
    index('idx_units_development_id').on(table.developmentId),
    index('idx_units_phase_id').on(table.phaseId),
    index('idx_units_status').on(table.status),
    index('idx_units_unit_type').on(table.unitType),
    index('idx_units_price').on(table.price),
  ],
);

export const developmentDrafts = mysqlTable(
  'development_drafts',
  {
    id: int().autoincrement().notNull(),
    developerId: int().references(() => developers.id, { onDelete: 'cascade' }),
    draftName: varchar({ length: 255 }),
    draftData: json().notNull(),
    progress: int().default(0).notNull(),
    currentStep: int().default(0).notNull(),
    lastModified: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    developerBrandProfileId: int('developer_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'cascade' },
    ),
  },
  table => [
    index('idx_dev_drafts_developer_id').on(table.developerId),
    index('idx_dev_drafts_last_modified').on(table.lastModified),
  ],
);

export const developmentApprovalQueue = mysqlTable(
  'development_approval_queue',
  {
    id: int().autoincrement().notNull(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id),
    submittedBy: int('submitted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected'])
      .default('pending')
      .notNull(),
    submissionType: mysqlEnum('submission_type', ['initial', 'update'])
      .default('initial')
      .notNull(),
    reviewNotes: text('review_notes'),
    rejectionReason: text('rejection_reason'),
    complianceChecks: json('compliance_checks'),
    submittedAt: timestamp('submitted_at', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    reviewedBy: int('reviewed_by').references(() => users.id, { onDelete: 'cascade' }),
  },
  table => [
    index('idx_dev_approval_status').on(table.status),
    index('idx_dev_approval_dev_id').on(table.developmentId),
  ],
);

export const developmentLeadRoutes = mysqlTable(
  'development_lead_routes',
  {
    id: int().autoincrement().notNull(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id),
    sourceType: mysqlEnum('source_type', [
      'developer_profile',
      'agency_profile',
      'development_page',
      'campaign',
    ]).notNull(),
    sourceBrandProfileId: int('source_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'cascade' },
    ),
    receiverBrandProfileId: int('receiver_brand_profile_id')
      .notNull()
      .references(() => developerBrandProfiles.id, { onDelete: 'cascade' }),
    fallbackBrandProfileId: int('fallback_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'set null' },
    ),
    priority: int().default(0).notNull(),
    isActive: tinyint('is_active').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_lead_routes_development_id').on(table.developmentId),
    index('idx_lead_routes_source_type').on(table.sourceType),
    index('idx_lead_routes_lookup').on(
      table.developmentId,
      table.sourceType,
      table.sourceBrandProfileId,
    ),
  ],
);

export const unitTypes = mysqlTable(
  'unit_types',
  {
    id: varchar({ length: 36 }).notNull(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    bedrooms: int().notNull(),
    bathrooms: decimal({ precision: 3, scale: 1 }).notNull(),
    unitSize: int('unit_size'),
    yardSize: int('yard_size'),
    basePriceFrom: decimal('base_price_from', { precision: 15, scale: 2 }).notNull(),
    basePriceTo: decimal('base_price_to', { precision: 15, scale: 2 }),
    baseFeatures: json('base_features'),
    baseFinishes: json('base_finishes'),
    baseMedia: json('base_media'),
    displayOrder: int('display_order').default(0),
    isActive: tinyint('is_active').default(1),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    totalUnits: int('total_units').default(0).notNull(),
    availableUnits: int('available_units').default(0).notNull(),
    reservedUnits: int('reserved_units').default(0),
    transferCostsIncluded: tinyint('transfer_costs_included').default(0),
    monthlyLevy: int('monthly_levy'),
    monthlyLevyTo: int('monthly_levy_to'),
    ratesAndTaxesTo: int('rates_and_taxes_to'),
    monthlyLevyFrom: int('monthly_levy_from'),
    ratesAndTaxesFrom: int('rates_and_taxes_from'),
    extras: json(),
    label: varchar({ length: 255 }),
    ownershipType: mysqlEnum('ownership_type', [
      'full-title',
      'sectional-title',
      'leasehold',
      'life-rights',
    ]).default('sectional-title'),
    structuralType: mysqlEnum('structural_type', [
      'apartment',
      'freestanding-house',
      'simplex',
      'duplex',
      'penthouse',
      'plot-and-plan',
      'townhouse',
      'studio',
    ]).default('apartment'),
    floors: mysqlEnum(['single-storey', 'double-storey', 'triplex']),
    priceFrom: decimal('price_from', { precision: 15, scale: 2 }),
    priceTo: decimal('price_to', { precision: 15, scale: 2 }),
    depositRequired: decimal('deposit_required', { precision: 15, scale: 2 }),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    completionDate: date('completion_date', { mode: 'string' }),
    configDescription: text('config_description'),
    description: text(),
    virtualTourLink: varchar('virtual_tour_link', { length: 500 }),
    specOverrides: json('spec_overrides'),
    specifications: json(),
    amenities: json(),
    features: json(),
    parkingType: varchar('parking_type', { length: 50 }),
    parkingBays: int('parking_bays').default(0),
    internalNotes: text('internal_notes'),
    monthlyRentFrom: decimal('monthly_rent_from', { precision: 15, scale: 2 }),
    monthlyRentTo: decimal('monthly_rent_to', { precision: 15, scale: 2 }),
    leaseTerm: varchar('lease_term', { length: 100 }),
    isFurnished: tinyint('is_furnished').default(0),
    startingBid: decimal('starting_bid', { precision: 15, scale: 2 }),
    reservePrice: decimal('reserve_price', { precision: 15, scale: 2 }),
    auctionStartDate: datetime('auction_start_date', { mode: 'string' }),
    auctionEndDate: datetime('auction_end_date', { mode: 'string' }),
    auctionStatus: mysqlEnum('auction_status', [
      'scheduled',
      'active',
      'sold',
      'passed_in',
      'withdrawn',
    ]).default('scheduled'),
  },
  table => [
    index('idx_unit_types_development_id').on(table.developmentId),
    index('idx_unit_types_price_range').on(table.basePriceFrom, table.basePriceTo),
    index('idx_unit_types_bedrooms_bathrooms').on(table.bedrooms, table.bathrooms),
    index('idx_unit_types_display_order').on(table.displayOrder),
    index('idx_unit_types_auction_status').on(table.auctionStatus),
  ],
);

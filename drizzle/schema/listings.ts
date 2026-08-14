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
import { agents, agencies } from './agencies';
import { locations, cities, provinces, suburbs } from './locations';
import { developments, developerBrandProfiles } from './developments';
import { cataloguePublishers } from './developerIdentity';

export const listings = mysqlTable(
  'listings',
  {
    id: int().autoincrement().primaryKey(),
    ownerId: int().notNull(),
    agentId: int(),
    agencyId: int(),
    action: mysqlEnum(['sell', 'rent', 'auction']).notNull(),
    propertyType: mysqlEnum([
      'apartment',
      'house',
      'townhouse',
      'cluster_home',
      'farm',
      'plot',
      'land',
      'commercial',
      'shared_living',
    ]).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    askingPrice: decimal({ precision: 12, scale: 2 }),
    negotiable: int().default(0),
    transferCostEstimate: decimal({ precision: 12, scale: 2 }),
    monthlyRent: decimal({ precision: 12, scale: 2 }),
    deposit: decimal({ precision: 12, scale: 2 }),
    leaseTerms: varchar({ length: 100 }),
    availableFrom: timestamp({ mode: 'string' }),
    utilitiesIncluded: int().default(0),
    startingBid: decimal({ precision: 12, scale: 2 }),
    reservePrice: decimal({ precision: 12, scale: 2 }),
    auctionDateTime: timestamp({ mode: 'string' }),
    auctionTermsDocumentUrl: text(),
    propertyDetails: json(),
    address: text(),
    latitude: decimal({ precision: 10, scale: 7 }),
    longitude: decimal({ precision: 10, scale: 7 }),
    city: varchar({ length: 100 }).notNull(),
    suburb: varchar({ length: 100 }),
    province: varchar({ length: 100 }).notNull(),
    postalCode: varchar({ length: 20 }),
    placeId: varchar({ length: 255 }),
    mainMediaId: int(),
    mainMediaType: mysqlEnum(['image', 'video']),
    status: mysqlEnum([
      'draft',
      'pending_review',
      'approved',
      'published',
      'rejected',
      'archived',
      'sold',
      'rented',
    ])
      .default('draft')
      .notNull(),
    approvalStatus: mysqlEnum(['pending', 'approved', 'rejected']).default('pending'),
    reviewedBy: int(),
    reviewedAt: timestamp({ mode: 'string' }),
    rejectionReason: text(),
    autoPublished: int().default(0),
    slug: varchar({ length: 255 }).notNull(),
    readinessScore: int('readiness_score').default(0).notNull(),
    qualityScore: int('quality_score').default(0).notNull(),
    qualityBreakdown: json('quality_breakdown'),
    rejectionReasons: json('rejection_reasons'),
    rejectionNote: text('rejection_note'),
    metaTitle: varchar({ length: 255 }),
    metaDescription: text(),
    canonicalUrl: text(),
    searchTags: text(),
    featured: int().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    publishedAt: timestamp({ mode: 'string' }),
    archivedAt: timestamp({ mode: 'string' }),
    locationId: int('location_id'),
    /** A private canonical draft which revises a published listing. */
    revisionOfListingId: int('revision_of_listing_id'),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    privateAddress: json('private_address'),
    coordinateSource: mysqlEnum('coordinate_source', [
      'autocomplete',
      'map',
      'manual_confirmed',
    ]),
    locationConfirmationState: mysqlEnum('location_confirmation_state', [
      'confirmed',
      'needs_confirmation',
    ])
      .default('needs_confirmation')
      .notNull(),
    publicLocationPrecision: mysqlEnum('public_location_precision', ['approximate', 'exact'])
      .default('approximate')
      .notNull(),
  },
  table => [
    index('idx_listings_place_id').on(table.placeId),
    index('idx_listings_location_id').on(table.locationId),
    index('idx_listings_revision_of').on(table.revisionOfListingId),
    index('idx_listings_province_id').on(table.provinceId),
    index('idx_listings_city_id').on(table.cityId),
    index('idx_listings_suburb_id').on(table.suburbId),
  ],
);

export const listingAnalytics = mysqlTable('listing_analytics', {
  id: int().autoincrement().primaryKey(),
  listingId: int()
    .notNull()
    .references(() => listings.id),
  totalViews: int().default(0).notNull(),
  uniqueVisitors: int().default(0).notNull(),
  viewsByDay: json(),
  totalLeads: int().default(0).notNull(),
  contactFormLeads: int().default(0).notNull(),
  whatsappClicks: int().default(0).notNull(),
  phoneReveals: int().default(0).notNull(),
  bookingViewingRequests: int().default(0).notNull(),
  totalFavorites: int().default(0).notNull(),
  totalShares: int().default(0).notNull(),
  averageTimeOnPage: int(),
  trafficSources: json(),
  conversionRate: decimal({ precision: 5, scale: 2 }),
  leadConversionRate: decimal({ precision: 5, scale: 2 }),
  lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const listingApprovalQueue = mysqlTable('listing_approval_queue', {
  id: int().autoincrement().primaryKey(),
  listingId: int()
    .notNull()
    .references(() => listings.id),
  submittedBy: int().notNull(),
  submittedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected']).default('pending').notNull(),
  priority: mysqlEnum(['low', 'normal', 'high', 'urgent']).default('normal').notNull(),
  reviewedBy: int(),
  reviewedAt: timestamp({ mode: 'string' }),
  reviewNotes: text(),
  rejectionReason: text(),
  complianceChecks: json(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingLeads = mysqlTable('listing_leads', {
  id: int().autoincrement().primaryKey(),
  listingId: int()
    .notNull()
    .references(() => listings.id),
  name: varchar({ length: 200 }).notNull(),
  email: varchar({ length: 320 }),
  phone: varchar({ length: 50 }),
  message: text(),
  leadType: mysqlEnum([
    'contact_form',
    'whatsapp_click',
    'phone_reveal',
    'book_viewing',
    'make_offer',
    'request_info',
  ]).notNull(),
  source: varchar({ length: 100 }),
  referrer: text(),
  utmSource: varchar({ length: 100 }),
  utmMedium: varchar({ length: 100 }),
  utmCampaign: varchar({ length: 100 }),
  assignedTo: int(),
  assignedAt: timestamp({ mode: 'string' }),
  status: mysqlEnum([
    'new',
    'contacted',
    'qualified',
    'viewing_scheduled',
    'offer_made',
    'converted',
    'lost',
  ])
    .default('new')
    .notNull(),
  crmSynced: int().default(0),
  crmSyncedAt: timestamp({ mode: 'string' }),
  crmId: varchar({ length: 255 }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingMedia = mysqlTable('listing_media', {
  id: int().autoincrement().primaryKey(),
  listingId: int()
    .notNull()
    .references(() => listings.id),
  mediaType: mysqlEnum(['image', 'video', 'floorplan', 'pdf']).notNull(),
  originalUrl: text().notNull(),
  originalFileName: varchar({ length: 255 }),
  originalFileSize: int(),
  processedUrl: text(),
  thumbnailUrl: text(),
  previewUrl: text(),
  width: int(),
  height: int(),
  duration: int(),
  mimeType: varchar({ length: 100 }),
  orientation: mysqlEnum(['vertical', 'horizontal', 'square']),
  isVertical: int().default(0),
  displayOrder: int().default(0).notNull(),
  isPrimary: int().default(0).notNull(),
  processingStatus: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  processingError: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  processedAt: timestamp({ mode: 'string' }),
});

export const listingSettings = mysqlTable('listing_settings', {
  id: int().autoincrement().primaryKey(),
  autoPublishForVerifiedAccounts: int().default(0).notNull(),
  maxImagesPerListing: int().default(30).notNull(),
  maxVideosPerListing: int().default(5).notNull(),
  maxFloorplansPerListing: int().default(5).notNull(),
  maxPdfsPerListing: int().default(3).notNull(),
  maxImageSizeMB: int().default(5).notNull(),
  maxVideoSizeMB: int().default(50).notNull(),
  maxVideoDurationSeconds: int().default(180).notNull(),
  videoCompressionEnabled: int().default(1).notNull(),
  videoThumbnailEnabled: int().default(1).notNull(),
  videoPreviewClipSeconds: int().default(3).notNull(),
  crmWebhookUrl: text(),
  crmEnabled: int().default(0).notNull(),
  newListingNotificationsEnabled: int().default(1).notNull(),
  leadNotificationsEnabled: int().default(1).notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  updatedBy: int(),
});

export const listingViewings = mysqlTable('listing_viewings', {
  id: int().autoincrement().primaryKey(),
  listingId: int()
    .notNull()
    .references(() => listings.id),
  leadId: int(),
  scheduledDate: timestamp({ mode: 'string' }).notNull(),
  duration: int().default(30),
  visitorName: varchar({ length: 200 }).notNull(),
  visitorEmail: varchar({ length: 320 }),
  visitorPhone: varchar({ length: 50 }),
  status: mysqlEnum(['requested', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .default('requested')
    .notNull(),
  agentId: int(),
  agentNotes: text(),
  visitorFeedback: text(),
  visitorRating: int(),
  reminderSent: int().default(0),
  confirmationSent: int().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const properties = mysqlTable(
  'properties',
  {
    id: int().autoincrement().primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    propertyType: mysqlEnum([
      'apartment',
      'house',
      'villa',
      'plot',
      'commercial',
      'townhouse',
      'cluster_home',
      'farm',
      'shared_living',
    ]).notNull(),
    listingType: mysqlEnum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']).notNull(),
    transactionType: mysqlEnum(['sale', 'rent', 'rent_to_buy', 'auction'])
      .default('sale')
      .notNull(),
    price: int().notNull(),
    bedrooms: int(),
    bathrooms: int(),
    area: int().notNull(),
    address: text().notNull(),
    city: varchar({ length: 100 }).notNull(),
    province: varchar({ length: 100 }).notNull(),
    zipCode: varchar({ length: 20 }),
    latitude: varchar({ length: 50 }),
    longitude: varchar({ length: 50 }),
    provinceId: int().references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int().references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int().references(() => suburbs.id, { onDelete: 'set null' }),
    locationText: text(),
    placeId: varchar({ length: 255 }),
    amenities: text(),
    yearBuilt: int(),
    status: mysqlEnum(['available', 'sold', 'rented', 'pending', 'draft', 'published', 'archived'])
      .default('available')
      .notNull(),
    featured: int().notNull(),
    views: int().notNull(),
    enquiries: int().notNull(),
    agentId: int().references(() => agents.id, { onDelete: 'set null' }),
    developmentId: int().references(() => developments.id, { onDelete: 'set null' }),
    ownerId: int()
      .notNull()
      .references(() => users.id),
    sourceListingId: int('sourceListingId').references(() => listings.id, { onDelete: 'set null' }),
    propertySettings: text(),
    videoUrl: text(),
    virtualTourUrl: text(),
    levies: int(),
    ratesAndTaxes: int(),
    mainImage: varchar({ length: 1024 }),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    locationId: int('location_id').references(() => locations.id, { onDelete: 'set null' }),
    developerBrandProfileId: int('developer_brand_profile_id').references(
      () => developerBrandProfiles.id,
      { onDelete: 'set null' },
    ),
    /** Canonical normalized internal/floor area for manual and public reads. */
    internalAreaM2: decimal('internal_area_m2', { precision: 14, scale: 2 }),
    /** Canonical normalized erf/stand area; never the dwelling area. */
    erfSizeM2: decimal('erf_size_m2', { precision: 14, scale: 2 }),
    /** Canonical normalized farm/smallholding land extent. */
    landAreaM2: decimal('land_area_m2', { precision: 14, scale: 2 }),
    publicAddress: text('public_address'),
    publicLatitude: decimal('public_latitude', { precision: 10, scale: 7 }),
    publicLongitude: decimal('public_longitude', { precision: 10, scale: 7 }),
    publicLocationPrecision: mysqlEnum('public_location_precision', ['approximate', 'exact'])
      .default('approximate')
      .notNull(),
    cataloguePublisherId: int('catalogue_publisher_id').references(
      () => cataloguePublishers.id,
      { onDelete: 'set null' },
    ),
  },
  table => [
    index('price_idx').on(table.price),
    index('status_idx').on(table.status),
    index('city_idx').on(table.city),
    index('province_idx').on(table.province),
    index('property_type_idx').on(table.propertyType),
    index('listing_type_idx').on(table.listingType),
    index('bedrooms_idx').on(table.bedrooms),
    index('bathrooms_idx').on(table.bathrooms),
    index('idx_properties_cityId').on(table.cityId),
    index('idx_properties_suburbId').on(table.suburbId),
    index('idx_properties_cityId_status').on(table.cityId, table.status),
    index('idx_properties_cityId_area').on(table.cityId, table.area),
    index('idx_properties_internal_area_m2').on(table.internalAreaM2),
    index('idx_properties_erf_size_m2').on(table.erfSizeM2),
    index('idx_properties_land_area_m2').on(table.landAreaM2),
    index('idx_properties_location_id').on(table.locationId),
    index('idx_properties_sourceListingId').on(table.sourceListingId),
  ],
);

export const propertyImages = mysqlTable('propertyImages', {
  id: int().autoincrement().primaryKey(),
  propertyId: int()
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  imageUrl: text().notNull(),
  isPrimary: int().notNull(),
  displayOrder: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const propertySimilarityIndex = mysqlTable('property_similarity_index', {
  id: int().autoincrement().primaryKey(),
  propertyId1: int()
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  propertyId2: int()
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  locationSimilarity: int(),
  priceSimilarity: int(),
  typeSimilarity: int(),
  featureSimilarity: int(),
  overallSimilarity: int(),
  similarityReason: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

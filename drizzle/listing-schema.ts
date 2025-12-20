/**
 * Smart Listing Creation Wizard - Database Schema Extension
 *
 * This schema adds comprehensive listing management with:
 * - Smart wizard flow (action, property type, dynamic fields)
 * - Media-first upload system (vertical video, images, documents)
 * - Approval workflow (auto/manual publish)
 * - Lead capture & analytics
 * - CRM integration hooks
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  decimal,
  json,
  boolean,
} from 'drizzle-orm/mysql-core';

/**
 * Main listings table - captures all listing types with dynamic fields
 */
export const listings = mysqlTable('listings', {
  id: int().autoincrement().notNull().primaryKey(),

  // User & Ownership
  ownerId: int().notNull(), // references users.id
  agentId: int(), // references agents.id (optional)
  agencyId: int(), // references agencies.id (optional)

  // Step 1: Action Type
  action: mysqlEnum(['sell', 'rent', 'auction']).notNull(),

  // Step 2: Property Type
  propertyType: mysqlEnum([
    'apartment',
    'house',
    'farm',
    'land',
    'commercial',
    'shared_living',
  ]).notNull(),

  // Basic Info
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),

  // Step 3: Pricing Fields (dynamic based on action)
  // For SELL
  askingPrice: decimal({ precision: 12, scale: 2 }),
  negotiable: int().default(0),
  transferCostEstimate: decimal({ precision: 12, scale: 2 }),

  // For RENT
  monthlyRent: decimal({ precision: 12, scale: 2 }),
  deposit: decimal({ precision: 12, scale: 2 }),
  leaseTerms: varchar({ length: 100 }),
  availableFrom: timestamp({ mode: 'string' }),
  utilitiesIncluded: int().default(0),

  // For AUCTION
  startingBid: decimal({ precision: 12, scale: 2 }),
  reservePrice: decimal({ precision: 12, scale: 2 }),
  auctionDateTime: timestamp({ mode: 'string' }),
  auctionTermsDocumentUrl: text(),

  // Property-Specific Fields (JSON for flexibility)
  propertyDetails: json().$type<{
    // APARTMENT
    propertySettings?: 'sectional_title' | 'freehold';
    bedrooms?: number;
    bathrooms?: number;
    unitSizeM2?: number;
    floorNumber?: number;
    levies?: number;
    ratesTaxes?: number;
    parkingType?: string;
    balcony?: boolean;
    petFriendly?: boolean;
    amenities?: string[]; // pool, gym, lift, security

    // HOUSE
    erfSizeM2?: number;
    houseAreaM2?: number;
    garages?: number;
    parkingCount?: number;
    garden?: boolean;
    pool?: boolean;
    boundaryWalls?: boolean;
    security?: string;

    // FARM
    landSizeHa?: number;
    zoningAgricultural?: string;
    waterSources?: string[];
    irrigation?: string;
    infrastructure?: string[];
    staffQuarters?: boolean;
    farmSuitability?: string[];
    residenceIncluded?: boolean;

    // LAND/PLOT
    landSizeM2OrHa?: number;
    zoning?: string;
    servicesAvailable?: string[]; // water, electricity, sewer
    topography?: string;
    developmentRights?: string;
    boundaryFences?: boolean;

    // COMMERCIAL
    subtype?: 'office' | 'retail' | 'industrial' | 'warehouse' | 'mixed';
    floorAreaM2?: number;
    parkingBays?: number;
    loadingBays?: number;
    powerSupply?: string;
    zoningBusinessUse?: string;
    amenitiesCommercial?: string[];
    pricePerM2?: number;

    // SHARED LIVING
    roomsAvailable?: number;
    bathroomTypePerRoom?: 'shared' | 'private';
    kitchenType?: string;
    occupancyType?: string;
    furnished?: boolean;
    internetIncluded?: boolean;
    depositRequired?: number;
  }>(),

  // Step 4: Location
  address: text().notNull(),
  latitude: decimal({ precision: 10, scale: 7 }).notNull(),
  longitude: decimal({ precision: 10, scale: 7 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  suburb: varchar({ length: 100 }),
  province: varchar({ length: 100 }).notNull(),
  postalCode: varchar({ length: 20 }),
  placeId: varchar({ length: 255 }), // Google Maps Place ID

  // Step 5: Media
  mainMediaId: int(), // references listing_media.id
  mainMediaType: mysqlEnum(['image', 'video']),

  // Step 7: Status & Approval
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
  reviewedBy: int(), // references users.id (super admin)
  reviewedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),

  // Auto-publish settings
  autoPublished: int().default(0),

  // Readiness & Quality
  readinessScore: int("readiness_score").default(0).notNull(),
  qualityScore: int("quality_score").default(0).notNull(),
  qualityBreakdown: json("quality_breakdown"),

  // SEO & Metadata
  slug: varchar({ length: 255 }).notNull(),
  metaTitle: varchar({ length: 255 }),
  metaDescription: text(),
  canonicalUrl: text(),

  // Search & Discovery
  searchTags: text(), // comma-separated for full-text search
  featured: int().default(0).notNull(),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp({ mode: 'string' }),
  archivedAt: timestamp({ mode: 'string' }),
});

/**
 * Listing media - images, videos, floorplans, PDFs
 */
export const listingMedia = mysqlTable('listing_media', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  mediaType: mysqlEnum(['image', 'video', 'floorplan', 'pdf']).notNull(),

  // Original Upload
  originalUrl: text().notNull(),
  originalFileName: varchar({ length: 255 }),
  originalFileSize: int(), // bytes

  // Processed URLs
  processedUrl: text(), // compressed/optimized version
  thumbnailUrl: text(),
  previewUrl: text(), // 3s preview for videos

  // Media Metadata
  width: int(),
  height: int(),
  duration: int(), // seconds (for videos)
  mimeType: varchar({ length: 100 }),

  // Video-specific
  orientation: mysqlEnum(['vertical', 'horizontal', 'square']),
  isVertical: int().default(0), // 1 = vertical (9:16)

  // Order & Display
  displayOrder: int().default(0).notNull(),
  isPrimary: int().default(0).notNull(),

  // Processing Status
  processingStatus: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  processingError: text(),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  processedAt: timestamp({ mode: 'string' }),
});

/**
 * Listing analytics - track views, leads, conversions
 */
export const listingAnalytics = mysqlTable('listing_analytics', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  // View Metrics
  totalViews: int().default(0).notNull(),
  uniqueVisitors: int().default(0).notNull(),
  viewsByDay: json().$type<{ [date: string]: number }>(), // {"2025-11-17": 45}

  // Lead Metrics
  totalLeads: int().default(0).notNull(),
  contactFormLeads: int().default(0).notNull(),
  whatsappClicks: int().default(0).notNull(),
  phoneReveals: int().default(0).notNull(),
  bookingViewingRequests: int().default(0).notNull(),

  // Engagement Metrics
  totalFavorites: int().default(0).notNull(),
  totalShares: int().default(0).notNull(),
  averageTimeOnPage: int(), // seconds

  // Traffic Sources
  trafficSources: json().$type<{
    direct?: number;
    organic?: number;
    social?: number;
    referral?: number;
    email?: number;
    paid?: number;
  }>(),

  // Conversion Metrics
  conversionRate: decimal({ precision: 5, scale: 2 }), // percentage
  leadConversionRate: decimal({ precision: 5, scale: 2 }),

  // Last Updated
  lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

/**
 * Listing approval workflow - manual review queue
 */
export const listingApprovalQueue = mysqlTable('listing_approval_queue', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  submittedBy: int().notNull(), // references users.id
  submittedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),

  status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected']).default('pending').notNull(),
  priority: mysqlEnum(['low', 'normal', 'high', 'urgent']).default('normal').notNull(),

  reviewedBy: int(), // references users.id (super admin)
  reviewedAt: timestamp({ mode: 'string' }),

  // Review Notes
  reviewNotes: text(),
  rejectionReason: text(),

  // Compliance Flags (for future use)
  complianceChecks: json().$type<{
    priceReasonable?: boolean;
    mediaQuality?: boolean;
    descriptionComplete?: boolean;
    locationValid?: boolean;
    flagged?: boolean;
  }>(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

/**
 * Listing leads - captured from various sources
 */
export const listingLeads = mysqlTable('listing_leads', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  // Lead Info
  name: varchar({ length: 200 }).notNull(),
  email: varchar({ length: 320 }),
  phone: varchar({ length: 50 }),
  message: text(),

  // Lead Type
  leadType: mysqlEnum([
    'contact_form',
    'whatsapp_click',
    'phone_reveal',
    'book_viewing',
    'make_offer',
    'request_info',
  ]).notNull(),

  // Source Tracking
  source: varchar({ length: 100 }), // organic, social, referral, etc.
  referrer: text(),
  utmSource: varchar({ length: 100 }),
  utmMedium: varchar({ length: 100 }),
  utmCampaign: varchar({ length: 100 }),

  // Assignment
  assignedTo: int(), // references agents.id
  assignedAt: timestamp({ mode: 'string' }),

  // Status
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

  // CRM Sync
  crmSynced: int().default(0),
  crmSyncedAt: timestamp({ mode: 'string' }),
  crmId: varchar({ length: 255 }), // External CRM ID (EspoCRM, etc.)

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

/**
 * Listing viewing schedule
 */
export const listingViewings = mysqlTable('listing_viewings', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id
  leadId: int(), // references listing_leads.id

  // Viewing Details
  scheduledDate: timestamp({ mode: 'string' }).notNull(),
  duration: int().default(30), // minutes

  // Contact Info
  visitorName: varchar({ length: 200 }).notNull(),
  visitorEmail: varchar({ length: 320 }),
  visitorPhone: varchar({ length: 50 }),

  // Status
  status: mysqlEnum(['requested', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .default('requested')
    .notNull(),

  // Agent Assignment
  agentId: int(), // references agents.id
  agentNotes: text(),

  // Feedback
  visitorFeedback: text(),
  visitorRating: int(), // 1-5

  // Notifications
  reminderSent: int().default(0),
  confirmationSent: int().default(0),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

/**
 * Platform settings for listing features
 */
export const listingSettings = mysqlTable('listing_settings', {
  id: int().autoincrement().notNull().primaryKey(),

  // Auto-publish settings
  autoPublishForVerifiedAccounts: int().default(0).notNull(),

  // Media limits
  maxImagesPerListing: int().default(30).notNull(),
  maxVideosPerListing: int().default(5).notNull(),
  maxFloorplansPerListing: int().default(5).notNull(),
  maxPdfsPerListing: int().default(3).notNull(),

  maxImageSizeMB: int().default(5).notNull(),
  maxVideoSizeMB: int().default(50).notNull(),
  maxVideoDurationSeconds: int().default(180).notNull(), // 3 minutes

  // Video processing
  videoCompressionEnabled: int().default(1).notNull(),
  videoThumbnailEnabled: int().default(1).notNull(),
  videoPreviewClipSeconds: int().default(3).notNull(),

  // CRM Integration
  crmWebhookUrl: text(),
  crmEnabled: int().default(0).notNull(),

  // Notifications
  newListingNotificationsEnabled: int().default(1).notNull(),
  leadNotificationsEnabled: int().default(1).notNull(),

  // Last updated
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  updatedBy: int(), // references users.id
});

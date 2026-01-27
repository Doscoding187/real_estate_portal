import { OWNERSHIP_TYPES, STRUCTURAL_TYPES, FLOOR_TYPES } from './db-enums';

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export type PaymentMethodType = 'card' | 'bank_account';

export type DiscountType = 'amount' | 'percent';

export interface Plan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string | null;
  features: string[] | null;
  limits: Record<string, any> | null;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencySubscription {
  id: number;
  agencyId: number;
  planId: number | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  plan?: Plan;
}

export interface Invoice {
  id: number;
  agencyId: number;
  subscriptionId: number | null;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  invoiceNumber: string | null;
  description: string | null;
  billingReason:
    | 'subscription_cycle'
    | 'subscription_create'
    | 'subscription_update'
    | 'subscription_finalize'
    | 'manual';
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
  dueDate: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: number;
  agencyId: number;
  stripePaymentMethodId: string;
  type: PaymentMethodType;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  bankName: string | null;
  bankLast4: string | null;
  isDefault: boolean;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: number;
  code: string;
  stripeCouponId: string | null;
  name: string | null;
  description: string | null;
  discountType: DiscountType;
  discountAmount: number;
  maxRedemptions: number | null;
  redemptionsUsed: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  appliesToPlans: number[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyBranding {
  id: number;
  agencyId: number;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
  subdomain: string | null;
  companyName: string | null;
  tagline: string | null;
  customCss: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  socialLinks: Record<string, string> | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Billing-related constants
export const SUBSCRIPTION_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
] as const;

export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;

export const PAYMENT_METHOD_TYPES = ['card', 'bank_account'] as const;

export const DISCOUNT_TYPES = ['amount', 'percent'] as const;

// Plan limits interface
export interface PlanLimits {
  properties: number;
  agents: number;
  storage_gb: number;
  [key: string]: any;
}

// Developer Subscription Types
export type SubscriptionTier = 'free_trial' | 'basic' | 'premium';
export type DeveloperSubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface DeveloperSubscription {
  id: number;
  developerId: number;
  planId: number | null;
  tier: SubscriptionTier;
  status: DeveloperSubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeveloperSubscriptionLimits {
  id: number;
  subscriptionId: number;
  maxDevelopments: number;
  maxLeadsPerMonth: number;
  maxTeamMembers: number;
  analyticsRetentionDays: number;
  crmIntegrationEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  bondIntegrationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeveloperSubscriptionUsage {
  id: number;
  subscriptionId: number;
  developmentsCount: number;
  leadsThisMonth: number;
  teamMembersCount: number;
  lastResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeveloperSubscriptionWithDetails extends DeveloperSubscription {
  limits: DeveloperSubscriptionLimits;
  usage: DeveloperSubscriptionUsage;
}

// Notification types for the mission control dashboard
export type NotificationType =
  | 'lead_new'
  | 'lead_qualified'
  | 'lead_unqualified'
  | 'viewing_scheduled'
  | 'viewing_completed'
  | 'unit_sold'
  | 'unit_reserved'
  | 'price_alert'
  | 'subscription_expiring'
  | 'subscription_limit_reached'
  | 'team_member_joined'
  | 'campaign_performance'
  | 'system_update';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface DeveloperNotification {
  id: number;
  developerId: number;
  userId?: number;
  title: string;
  body: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface DeveloperNotificationWithUser extends DeveloperNotification {
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// KPI types for mission control dashboard
export interface DeveloperKPIs {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  unitsSold: number;
  unitsAvailable: number;
  affordabilityMatchPercent: number;
  marketingPerformanceScore: number;
  // Trend data (comparison to previous period)
  trends: {
    totalLeads: number; // percentage change
    qualifiedLeads: number;
    conversionRate: number;
    unitsSold: number;
    affordabilityMatchPercent: number;
    marketingPerformanceScore: number;
  };
}

export interface DeveloperKPICache {
  kpis: DeveloperKPIs;
  timeRange: '7d' | '30d' | '90d';
  calculatedAt: Date;
  expiresAt: Date;
}

// Tier configuration constants
export const SUBSCRIPTION_TIER_LIMITS: Record<
  SubscriptionTier,
  Omit<DeveloperSubscriptionLimits, 'id' | 'subscriptionId' | 'createdAt' | 'updatedAt'>
> = {
  free_trial: {
    maxDevelopments: 1,
    maxLeadsPerMonth: 50,
    maxTeamMembers: 1,
    analyticsRetentionDays: 30,
    crmIntegrationEnabled: false,
    advancedAnalyticsEnabled: false,
    bondIntegrationEnabled: false,
  },
  basic: {
    maxDevelopments: 5,
    maxLeadsPerMonth: 200,
    maxTeamMembers: 5,
    analyticsRetentionDays: 90,
    crmIntegrationEnabled: false,
    advancedAnalyticsEnabled: true,
    bondIntegrationEnabled: true,
  },
  premium: {
    maxDevelopments: 999999, // Effectively unlimited
    maxLeadsPerMonth: 999999, // Effectively unlimited
    maxTeamMembers: 50,
    analyticsRetentionDays: 365,
    crmIntegrationEnabled: true,
    advancedAnalyticsEnabled: true,
    bondIntegrationEnabled: true,
  },
};

// Development Types
export type DevelopmentType = 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex';
export type DevelopmentStatus = 'planning' | 'under_construction' | 'completed' | 'coming_soon';
export type PhaseStatus = 'planning' | 'pre_launch' | 'selling' | 'sold_out' | 'completed';

export interface Development {
  id: number;
  developerId: number;
  name: string;
  slug: string;
  description: string | null;
  developmentType: DevelopmentType;
  status: DevelopmentStatus;
  address: string | null;
  city: string;
  province: string;
  latitude: string | null;
  longitude: string | null;
  totalUnits: number | null;
  availableUnits: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  amenities: string[] | null;
  images: string[] | null;
  videos: string[] | null;
  floorPlans: string[] | null;
  brochures: string[] | null;
  completionDate: Date | null;
  isFeatured: boolean;
  isPublished: boolean;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  views: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  showHouseAddress: boolean;
}

export interface DevelopmentPhase {
  id: number;
  developmentId: number;
  name: string;
  phaseNumber: number;
  description: string | null;
  status: PhaseStatus;
  totalUnits: number;
  availableUnits: number;
  priceFrom: number | null;
  priceTo: number | null;
  launchDate: Date | null;
  completionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevelopmentWithPhases extends Development {
  phases: DevelopmentPhase[];
  unitTypes?: any[]; // Aggregated unit types for wizard hydration
}

export interface CreateDevelopmentInput {
  name: string;
  developmentType: DevelopmentType;
  description?: string;
  address?: string;
  city: string;
  suburb?: string;
  province: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  placeId?: string; // Google Places ID
  locationId?: number; // Link to locations table
  priceFrom?: number;
  priceTo?: number;
  amenities?: string[];
  features?: string[];
  images?: string[];
  completionDate?: string;
  showHouseAddress?: boolean;
}

export interface UpdateDevelopmentInput {
  name?: string;
  slug?: string;
  description?: string;
  developmentType?: DevelopmentType;
  status?: DevelopmentStatus;
  address?: string;
  city?: string;
  province?: string;
  latitude?: string;
  longitude?: string;
  totalUnits?: number;
  availableUnits?: number;
  priceFrom?: number;
  priceTo?: number;
  amenities?: string[];
  features?: string[];
  highlights?: string[];
  images?: string[];
  videos?: string[];
  floorPlans?: string[];
  brochures?: string[];
  completionDate?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  showHouseAddress?: boolean;
}

// Unit Types
export type UnitType =
  | 'studio'
  | '1bed'
  | '2bed'
  | '3bed'
  | '4bed+'
  | 'penthouse'
  | 'townhouse'
  | 'house';
export type UnitStatus = 'available' | 'reserved' | 'sold';

export interface DevelopmentUnit {
  id: number;
  developmentId: number;
  phaseId: number | null;
  unitNumber: string;
  unitType: UnitType;
  bedrooms: number | null;
  bathrooms: number | null;
  size: number | null; // square meters
  price: number;
  floorPlan: string | null; // S3 URL
  floor: number | null;
  facing: string | null;
  features: string[] | null;
  status: UnitStatus;
  reservedAt: Date | null;
  reservedBy: number | null; // leadId
  soldAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitInput {
  developmentId: number;
  phaseId?: number;
  unitNumber: string;
  unitType: UnitType;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  price: number;
  floorPlan?: string;
  floor?: number;
  facing?: string;
  features?: string[];
}

export interface UpdateUnitInput {
  unitNumber?: string;
  unitType?: UnitType;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  price?: number;
  floorPlan?: string;
  floor?: number;
  facing?: string;
  features?: string[];
  status?: UnitStatus;
}

export interface BulkCreateUnitsInput {
  developmentId: number;
  phaseId?: number;
  units: Omit<CreateUnitInput, 'developmentId' | 'phaseId'>[];
}

// Explore Shorts Types
export type InteractionType =
  | 'impression'
  | 'view'
  | 'skip'
  | 'save'
  | 'share'
  | 'contact'
  | 'whatsapp'
  | 'book_viewing';

export type FeedType = 'recommended' | 'area' | 'category' | 'agent' | 'developer' | 'agency';

export type CreatorType = 'user' | 'agent' | 'developer' | 'agency';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ExploreShort {
  id: number;
  listingId?: number;
  developmentId?: number;
  agentId?: number;
  developerId?: number;
  agencyId?: number;
  title: string;
  caption?: string;
  primaryMediaId: number;
  mediaIds: number[];
  highlights?: string[];
  performanceScore: number;
  boostPriority: number;
  viewCount: number;
  uniqueViewCount: number;
  saveCount: number;
  shareCount: number;
  skipCount: number;
  averageWatchTime: number;
  viewThroughRate: number;
  saveRate: number;
  shareRate: number;
  skipRate: number;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ExploreContent {
  id: number;
  contentType: string;
  referenceId: number;
  creatorId?: number;
  creatorType: CreatorType;
  agencyId?: number;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  lifestyleCategories?: string[];
  locationLat?: number;
  locationLng?: number;
  priceMin?: number;
  priceMax?: number;
  viewCount: number;
  engagementScore: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyFeedMetadata {
  agencyId: number;
  agencyName: string;
  agencyLogo?: string;
  isVerified: boolean;
  totalContent: number;
  includeAgentContent: boolean;
}

export interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: any[];
  agentBreakdown: {
    agentId: number;
    agentName: string;
    contentCount: number;
    totalViews: number;
  }[];
}

export interface ExploreInteraction {
  id: number;
  shortId: number;
  userId?: number;
  sessionId: string;
  interactionType: InteractionType;
  duration?: number;
  timestamp: Date;
  feedType: FeedType;
  feedContext?: Record<string, any>;
  deviceType: DeviceType;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface ExploreHighlightTag {
  id: number;
  tagKey: string;
  label: string;
  icon?: string;
  color?: string;
  category?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ExploreUserPreference {
  id: number;
  userId: number;
  preferredLocations?: number[];
  budgetMin?: number;
  budgetMax?: number;
  propertyTypes?: string[];
  interactionHistory?: InteractionSummary[];
  savedProperties?: number[];
  inferredPreferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionSummary {
  shortId: number;
  type: InteractionType;
  timestamp: Date;
  duration?: number;
}

// Extended types for frontend use
export interface PropertyShort extends ExploreShort {
  property?: {
    price: number;
    location: {
      city: string;
      suburb?: string;
      province: string;
    };
    specs: {
      bedrooms?: number;
      bathrooms?: number;
      parking?: number;
    };
  };
  media: MediaItem[];
  highlightTags: ExploreHighlightTag[];
  agent?: {
    id: number;
    name: string;
    logo?: string;
    phone?: string;
    whatsapp?: string;
  };
}

export interface MediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  orientation: 'vertical' | 'horizontal' | 'square';
  duration?: number;
  width: number;
  height: number;
}

// API Request/Response types
export interface CreateExploreShortInput {
  listingId?: number;
  developmentId?: number;
  title: string;
  caption?: string;
  mediaIds: number[];
  highlights?: string[];
}

export interface UpdateExploreShortInput {
  title?: string;
  caption?: string;
  highlights?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface RecordInteractionInput {
  shortId: number;
  interactionType: InteractionType;
  duration?: number;
  feedType: FeedType;
  feedContext?: Record<string, any>;
  deviceType: DeviceType;
}

export interface FeedQuery {
  feedType: FeedType;
  limit?: number;
  offset?: number;
  location?: string;
  category?: string;
  agentId?: number;
  developerId?: number;
  agencyId?: number;
}

// ============================================================================
// Property Results Page Optimization Types
// ============================================================================

// Property data structure with SA-specific fields
export interface Property {
  id: string;
  title: string;
  price: number;
  suburb: string;
  city: string;
  province: string;
  propertyType: 'house' | 'apartment' | 'townhouse' | 'plot' | 'commercial';
  listingType: 'sale' | 'rent';
  bedrooms?: number;
  bathrooms?: number;
  erfSize?: number; // in m²
  floorSize?: number; // in m²

  // SA-specific fields
  titleType: 'freehold' | 'sectional';
  levy?: number; // monthly levy for sectional title
  rates?: number; // monthly rates estimate
  securityEstate: boolean;
  petFriendly: boolean;
  fibreReady: boolean;

  // Load-shedding solutions
  loadSheddingSolutions: Array<'solar' | 'generator' | 'inverter' | 'none'>;

  // Media
  images: ImageUrls[];
  videoCount: number;

  // Status
  status: 'available' | 'under_offer' | 'sold' | 'let';
  listedDate: Date;

  // Agent info
  agent: {
    id: string;
    name: string;
    agency: string;
    phone: string;
    whatsapp: string;
    email: string;
    image?: string;
  };

  // Location
  latitude: number;
  longitude: number;

  // Highlights
  highlights: string[];
}

export interface ImageUrls {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
}

// Filter state
export interface PropertyFilters {
  // Location
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];

  // Basic filters
  propertyType?: Property['propertyType'][];
  listingType?: Property['listingType'];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;

  // Size filters
  minErfSize?: number;
  maxErfSize?: number;
  minFloorSize?: number;
  maxFloorSize?: number;

  // SA-specific filters
  titleType?: Property['titleType'][];
  ownershipType?: (typeof OWNERSHIP_TYPES)[number][];
  structuralType?: (typeof STRUCTURAL_TYPES)[number][];
  floors?: (typeof FLOOR_TYPES)[number][];
  maxLevy?: number;
  securityEstate?: boolean;
  petFriendly?: boolean;
  fibreReady?: boolean;
  loadSheddingSolutions?: Property['loadSheddingSolutions'];

  // Status
  status?: Property['status'][];

  // Map bounds
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Sort options
export type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'date_desc'
  | 'date_asc'
  | 'suburb_asc'
  | 'suburb_desc';

// View mode
export type ViewMode = 'list' | 'grid' | 'map';

// Search results
export interface SearchResults {
  properties: Property[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  locationContext?: {
    type: 'province' | 'city' | 'suburb';
    name: string;
    slug: string;
    confidence: 'exact' | 'expanded' | 'approximate';
    fallbackLevel: 'none' | 'suburb_to_city' | 'city_to_province' | 'suburb_to_province';
    originalIntent: string;
    hierarchy: {
      province: string;
      city?: string;
      suburb?: string;
    };
    ids?: {
      provinceId?: number;
      cityId?: number;
      suburbId?: number;
    };
  };
}

// Saved search
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: PropertyFilters;
  notificationMethod: 'email' | 'whatsapp' | 'both' | 'none';
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  createdAt: Date;
  lastNotified?: Date;
}

// Quick filter presets for SA market
export interface QuickFilterPreset {
  id: string;
  label: string;
  filters: Partial<PropertyFilters>;
  icon?: string;
}

// Property comparison
export interface PropertyComparison {
  properties: Property[];
  selectedIds: string[];
  maxSelections: number;
}

// Analytics tracking
export interface SearchAnalytics {
  id: string;
  userId?: string;
  sessionId: string;
  filters: PropertyFilters;
  resultCount: number;
  sortOrder: SortOption;
  viewMode: ViewMode;
  timestamp: Date;
}

export interface PropertyClickAnalytics {
  id: string;
  propertyId: string;
  userId?: string;
  sessionId: string;
  position: number; // position in search results
  searchFilters: PropertyFilters;
  timestamp: Date;
}

// Filter counts for preview
export interface FilterCounts {
  propertyType: Record<Property['propertyType'], number>;
  titleType: Record<Property['titleType'], number>;
  priceRanges: {
    range: string;
    count: number;
  }[];
  bedrooms: Record<number, number>;
  securityEstate: number;
  petFriendly: number;
  fibreReady: number;
}

// SEO metadata
export interface PropertySEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  openGraph: {
    title: string;
    description: string;
    image: string;
    url: string;
  };
  structuredData: Record<string, any>;
}

// Similar properties
export interface SimilarPropertiesQuery {
  propertyId: string;
  maxResults?: number;
  priceVariance?: number; // percentage (default 20%)
}

export interface SimilarPropertiesResult {
  properties: Property[];
  matchingAttributes: {
    propertyId: string;
    matches: string[]; // e.g., ['propertyType', 'bedrooms', 'location']
  }[];
}

// Contact agent
export interface ContactAgentRequest {
  propertyId: string;
  agentId: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  preferredContactMethod: 'email' | 'phone' | 'whatsapp';
}

// Map marker
export interface PropertyMapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  price: number;
  propertyType: Property['propertyType'];
  status: Property['status'];
}

// Pagination
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Error states
export interface PropertySearchError {
  code: string;
  message: string;
  retryable: boolean;
  suggestions?: string[];
}

// Loading states
export type PropertyLoadingState =
  | 'idle'
  | 'loading'
  | 'filtering'
  | 'paginating'
  | 'error'
  | 'success';

// Cache keys
export interface PropertyCacheKey {
  filters: string; // serialized filters
  page: number;
  sortOrder: SortOption;
}

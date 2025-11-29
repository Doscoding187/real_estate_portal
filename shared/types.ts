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
export const SUBSCRIPTION_TIER_LIMITS: Record<SubscriptionTier, Omit<DeveloperSubscriptionLimits, 'id' | 'subscriptionId' | 'createdAt' | 'updatedAt'>> = {
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
  views: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
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
}

export interface CreateDevelopmentInput {
  name: string;
  developmentType: DevelopmentType;
  description?: string;
  address?: string;
  city: string;
  province: string;
  latitude?: string;
  longitude?: string;
  priceFrom?: number;
  priceTo?: number;
  amenities?: string[];
  completionDate?: string;
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
  images?: string[];
  videos?: string[];
  floorPlans?: string[];
  brochures?: string[];
  completionDate?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
}


// Unit Types
export type UnitType = 'studio' | '1bed' | '2bed' | '3bed' | '4bed+' | 'penthouse' | 'townhouse' | 'house';
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

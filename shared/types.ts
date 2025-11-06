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

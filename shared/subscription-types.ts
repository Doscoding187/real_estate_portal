/**
 * Subscription Plans & Billing Types
 * South African Real Estate Platform
 */

// =====================================================
// ENUMS
// =====================================================

export type PlanCategory = 'agent' | 'agency' | 'developer';

export type SubscriptionStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'active_paid'
  | 'past_due'
  | 'cancelled'
  | 'downgraded'
  | 'grace_period';

export type TransactionType =
  | 'subscription_create'
  | 'subscription_renew'
  | 'upgrade'
  | 'downgrade'
  | 'addon_purchase'
  | 'refund'
  | 'failed_payment'
  | 'trial_conversion';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type PaymentGateway = 'stripe' | 'paystack' | 'manual';

export type BillingInterval = 'monthly' | 'yearly';

export type EventType =
  | 'trial_started'
  | 'trial_expiring_soon'
  | 'trial_expired'
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'feature_locked'
  | 'limit_reached';

// =====================================================
// PLAN STRUCTURES
// =====================================================

export interface PlanLimits {
  listings?: number; // -1 = unlimited
  projects?: number;
  agents?: number;
  boosts?: number;
  crm_contacts?: number;
  listings_per_project?: number;
  api_calls?: number;
  analytics_level?: 'basic' | 'standard' | 'advanced' | 'enterprise';
  storage_mb?: number;
}

export interface PlanPermissions {
  can_create_listings?: boolean;
  crm_access_level?: 'none' | 'read_only' | 'full';
  analytics_level?: 'basic' | 'standard' | 'advanced' | 'enterprise';
  boost_credits?: number;
  priority_explore?: boolean;
  automation_access?: boolean;
  branding_tools?: boolean;
  premium_badge?: boolean;
  agent_seat_limit?: number;
  project_limit?: number;
  lead_routing?: boolean;
  brand_page?: boolean;
  bulk_boost_discount?: boolean;
  priority_support?: boolean;
  api_access?: boolean;
  migration_support?: boolean;
  dedicated_manager?: boolean;
  sla_support?: boolean;
  white_label?: boolean;
  inventory_tracker?: boolean;
  project_website?: boolean;
  lead_funnel?: boolean;
  explore_promotions?: boolean;
  launch_toolkit?: boolean;
  priority_placement?: boolean;
  dedicated_onboarding?: boolean;
  quarterly_reports?: boolean;
  white_label_sites?: boolean;
  bulk_upload?: boolean;
}

export interface SubscriptionPlan {
  id: number;
  plan_id: string;
  category: PlanCategory;
  name: string;
  display_name: string;
  description?: string;
  price_zar: number; // in cents
  billing_interval: BillingInterval;
  trial_days: number;
  is_trial_plan: boolean;
  is_free_plan: boolean;
  priority_level: number;
  sort_order: number;
  is_active: boolean;
  features: string[];
  limits: PlanLimits;
  permissions: PlanPermissions;
  upgrade_to_plan_id?: string;
  downgrade_to_plan_id?: string;
  stripe_price_id?: string;
  paystack_plan_code?: string;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// SUBSCRIPTION STRUCTURES
// =====================================================

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: string;
  status: SubscriptionStatus;
  trial_started_at?: Date;
  trial_ends_at?: Date;
  trial_used: boolean;
  current_period_start?: Date;
  current_period_end?: Date;
  cancelled_at?: Date;
  ends_at?: Date;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  paystack_subscription_code?: string;
  paystack_customer_code?: string;
  amount_zar?: number;
  billing_interval?: BillingInterval;
  next_billing_date?: Date;
  payment_method_last4?: string;
  payment_method_type?: string;
  previous_plan_id?: string;
  downgrade_scheduled: boolean;
  downgrade_to_plan_id?: string;
  downgrade_effective_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionUsage {
  id: number;
  user_id: number;
  subscription_id: number;
  period_start: Date;
  period_end: Date;
  listings_created: number;
  projects_created: number;
  agents_added: number;
  boosts_used: number;
  api_calls: number;
  storage_mb: number;
  crm_contacts: number;
  emails_sent: number;
  created_at: Date;
  updated_at: Date;
}

export interface BillingTransaction {
  id: number;
  user_id: number;
  subscription_id?: number;
  transaction_type: TransactionType;
  amount_zar: number;
  currency: string;
  status: TransactionStatus;
  payment_gateway: PaymentGateway;
  gateway_transaction_id?: string;
  gateway_invoice_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionEvent {
  id: number;
  user_id: number;
  subscription_id?: number;
  event_type: EventType;
  event_data?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface BoostCredits {
  id: number;
  user_id: number;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  reset_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateSubscriptionRequest {
  plan_id: string;
  billing_interval: BillingInterval;
  payment_method_id?: string; // Stripe payment method
  payment_gateway: PaymentGateway;
}

export interface CreateSubscriptionResponse {
  subscription: UserSubscription;
  plan: SubscriptionPlan;
  client_secret?: string; // For Stripe setup intent
  authorization_url?: string; // For Paystack
}

export interface UpgradeSubscriptionRequest {
  new_plan_id: string;
  immediate?: boolean; // Upgrade immediately or at period end
}

export interface DowngradeSubscriptionRequest {
  new_plan_id: string;
  immediate?: boolean;
  reason?: string;
}

export interface StartTrialRequest {
  category: PlanCategory;
}

export interface StartTrialResponse {
  subscription: UserSubscription;
  plan: SubscriptionPlan;
  trial_ends_at: Date;
}

export interface SubscriptionWithPlan extends UserSubscription {
  plan: SubscriptionPlan;
}

export interface UsageStatus {
  current_usage: SubscriptionUsage;
  limits: PlanLimits;
  is_over_limit: boolean;
  warnings: string[];
}

// =====================================================
// ANALYTICS & REPORTING
// =====================================================

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  churned_this_month: number;
  new_this_month: number;
  trial_conversion_rate: number; // percentage
  category_breakdown: {
    category: PlanCategory;
    count: number;
    revenue: number;
  }[];
  plan_breakdown: {
    plan_id: string;
    plan_name: string;
    count: number;
    revenue: number;
  }[];
}

export interface SubscriptionAnalytics {
  total_users: number;
  active_subscriptions: number;
  trial_users: number;
  paid_users: number;
  free_users: number;
  churn_rate: number;
  growth_rate: number;
  average_revenue_per_user: number;
  lifetime_value: number;
}

// =====================================================
// PERMISSION CHECKING
// =====================================================

export interface FeatureAccess {
  has_access: boolean;
  reason?: string;
  upgrade_required?: boolean;
  recommended_plan?: string;
}

export interface LimitCheck {
  is_allowed: boolean;
  current_count: number;
  limit: number;
  remaining: number;
  is_unlimited: boolean;
}

// =====================================================
// UPGRADE PROMPTS
// =====================================================

export interface UpgradePrompt {
  title: string;
  message: string;
  feature_blocked: string;
  current_plan: string;
  recommended_plan: string;
  price_difference: number;
  benefits: string[];
  cta: string;
}

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
import { agencies, agencySubscriptions } from './agencies';

export const plans = mysqlTable('plans', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 100 }).notNull(),
  displayName: varchar({ length: 100 }).notNull(),
  description: text(),
  price: int().notNull(),
  currency: varchar({ length: 3 }).default('ZAR').notNull(),
  interval: mysqlEnum(['month', 'year']).default('month').notNull(),
  stripePriceId: varchar({ length: 100 }),
  features: text(),
  limits: text(),
  isActive: int().default(1).notNull(),
  isPopular: int().notNull(),
  sortOrder: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const coupons = mysqlTable('coupons', {
  id: int().autoincrement().notNull(),
  code: varchar({ length: 50 }).notNull(),
  stripeCouponId: varchar({ length: 100 }),
  name: varchar({ length: 100 }),
  description: text(),
  discountType: mysqlEnum(['amount', 'percent']).default('percent').notNull(),
  discountAmount: int(),
  maxRedemptions: int(),
  redemptionsUsed: int().notNull(),
  validFrom: timestamp({ mode: 'string' }),
  validUntil: timestamp({ mode: 'string' }),
  isActive: int().default(1).notNull(),
  appliesToPlans: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const subscriptionPlans = mysqlTable(
  'subscription_plans',
  {
    id: int().autoincrement().notNull(),
    planId: varchar('plan_id', { length: 100 }).notNull(),
    category: mysqlEnum(['agent', 'agency', 'developer']).notNull(),
    name: varchar({ length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 150 }).notNull(),
    description: text(),
    priceZar: int('price_zar').notNull(),
    billingInterval: mysqlEnum('billing_interval', ['monthly', 'yearly'])
      .default('monthly')
      .notNull(),
    trialDays: int('trial_days').default(14),
    isTrialPlan: tinyint('is_trial_plan').default(0),
    isFreePlan: tinyint('is_free_plan').default(0),
    priorityLevel: int('priority_level').default(0),
    sortOrder: int('sort_order').default(0),
    isActive: tinyint('is_active').default(1),
    features: json(),
    limits: json(),
    permissions: json(),
    upgradeToPlanId: varchar('upgrade_to_plan_id', { length: 100 }),
    downgradeToPlanId: varchar('downgrade_to_plan_id', { length: 100 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    paystackPlanCode: varchar('paystack_plan_code', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [
    index('idx_category').on(table.category),
    index('idx_active').on(table.isActive),
    index('plan_id').on(table.planId),
  ],
);

export const subscriptionEvents = mysqlTable(
  'subscription_events',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    subscriptionId: int('subscription_id'),
    eventType: mysqlEnum('event_type', [
      'trial_started',
      'trial_expiring_soon',
      'trial_expired',
      'subscription_created',
      'subscription_renewed',
      'subscription_upgraded',
      'subscription_downgraded',
      'subscription_cancelled',
      'payment_succeeded',
      'payment_failed',
      'feature_locked',
      'limit_reached',
    ]).notNull(),
    eventData: json('event_data'),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
  },
  table => [index('idx_user').on(table.userId), index('idx_event_type').on(table.eventType)],
);

export const billingTransactions = mysqlTable(
  'billing_transactions',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    subscriptionId: int('subscription_id'),
    transactionType: mysqlEnum('transaction_type', [
      'subscription_create',
      'subscription_renew',
      'upgrade',
      'downgrade',
      'addon_purchase',
      'refund',
      'failed_payment',
      'trial_conversion',
    ]).notNull(),
    amountZar: int('amount_zar').notNull(),
    currency: varchar({ length: 3 }).default('ZAR'),
    status: mysqlEnum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
    paymentGateway: mysqlEnum('payment_gateway', ['stripe', 'paystack', 'manual']).notNull(),
    gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
    gatewayInvoiceId: varchar('gateway_invoice_id', { length: 255 }),
    description: text(),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_user').on(table.userId), index('idx_status').on(table.status)],
);

export const boostCredits = mysqlTable(
  'boost_credits',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    totalCredits: int('total_credits').default(0),
    usedCredits: int('used_credits').default(0),
    resetAt: timestamp('reset_at', { mode: 'string' }),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_user').on(table.userId), index('unique_user_credits').on(table.userId)],
);

export const invoices = mysqlTable('invoices', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  subscriptionId: int().references(() => agencySubscriptions.id, { onDelete: 'set null' }),
  stripeInvoiceId: varchar({ length: 100 }),
  stripeCustomerId: varchar({ length: 100 }),
  amount: int().notNull(),
  currency: varchar({ length: 3 }).default('ZAR').notNull(),
  status: mysqlEnum(['draft', 'open', 'paid', 'void', 'uncollectible']).default('draft').notNull(),
  invoicePdf: text(),
  hostedInvoiceUrl: text(),
  invoiceNumber: varchar({ length: 50 }),
  description: text(),
  billingReason: mysqlEnum([
    'subscription_cycle',
    'subscription_create',
    'subscription_update',
    'subscription_finalize',
    'manual',
  ])
    .default('subscription_cycle')
    .notNull(),
  periodStart: timestamp({ mode: 'string' }),
  periodEnd: timestamp({ mode: 'string' }),
  paidAt: timestamp({ mode: 'string' }),
  dueDate: timestamp({ mode: 'string' }),
  metadata: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const paymentMethods = mysqlTable('payment_methods', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  stripePaymentMethodId: varchar({ length: 100 }),
  type: mysqlEnum(['card', 'bank_account']).default('card').notNull(),
  cardBrand: varchar({ length: 20 }),
  cardLast4: varchar({ length: 4 }),
  cardExpMonth: int(),
  cardExpYear: int(),
  bankName: varchar({ length: 100 }),
  bankLast4: varchar({ length: 4 }),
  isDefault: int().notNull(),
  isActive: int().default(1).notNull(),
  metadata: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userSubscriptions = mysqlTable(
  'user_subscriptions',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    planId: varchar('plan_id', { length: 100 }).notNull(),
    status: mysqlEnum([
      'trial_active',
      'trial_expired',
      'active_paid',
      'past_due',
      'cancelled',
      'downgraded',
      'grace_period',
    ])
      .default('trial_active')
      .notNull(),
    trialStartedAt: timestamp('trial_started_at', { mode: 'string' }),
    trialEndsAt: timestamp('trial_ends_at', { mode: 'string' }),
    trialUsed: tinyint('trial_used').default(0),
    currentPeriodStart: timestamp('current_period_start', { mode: 'string' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'string' }),
    cancelledAt: timestamp('cancelled_at', { mode: 'string' }),
    endsAt: timestamp('ends_at', { mode: 'string' }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    paystackSubscriptionCode: varchar('paystack_subscription_code', { length: 255 }),
    paystackCustomerCode: varchar('paystack_customer_code', { length: 255 }),
    amountZar: int('amount_zar'),
    billingInterval: mysqlEnum('billing_interval', ['monthly', 'yearly']),
    nextBillingDate: timestamp('next_billing_date', { mode: 'string' }),
    paymentMethodLast4: varchar('payment_method_last4', { length: 4 }),
    paymentMethodType: varchar('payment_method_type', { length: 50 }),
    previousPlanId: varchar('previous_plan_id', { length: 100 }),
    downgradeScheduled: tinyint('downgrade_scheduled').default(0),
    downgradeToPlanId: varchar('downgrade_to_plan_id', { length: 100 }),
    downgradeEffectiveDate: timestamp('downgrade_effective_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [
    index('idx_user').on(table.userId),
    index('idx_status').on(table.status),
    index('unique_user_subscription').on(table.userId),
  ],
);

export const subscriptionUsage = mysqlTable(
  'subscription_usage',
  {
    id: int().autoincrement().notNull(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    subscriptionId: int('subscription_id').notNull(),
    periodStart: timestamp('period_start', { mode: 'string' }).notNull(),
    periodEnd: timestamp('period_end', { mode: 'string' }).notNull(),
    listingsCreated: int('listings_created').default(0),
    projectsCreated: int('projects_created').default(0),
    agentsAdded: int('agents_added').default(0),
    boostsUsed: int('boosts_used').default(0),
    apiCalls: int('api_calls').default(0),
    storageMb: int('storage_mb').default(0),
    crmContacts: int('crm_contacts').default(0),
    emailsSent: int('emails_sent').default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_user_period').on(table.userId, table.periodStart, table.periodEnd)],
);

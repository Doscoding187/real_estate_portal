import {
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { plans } from './billing';
import { users } from './core';

export const partnerTiers = mysqlTable('partner_tiers', {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  priceZar: int().notNull(),
  maxListings: int().default(0),
  features: json(),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partners = mysqlTable(
  'partners',
  {
    id: int().autoincrement().primaryKey(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    description: text('description'),
    verificationStatus: mysqlEnum('verification_status', [
      'pending',
      'verified',
      'rejected',
    ]).default('pending'),
    trustScore: decimal('trust_score', {
      precision: 5,
      scale: 2,
    }).default('50.00'),
    approvedContentCount: int('approved_content_count').default(0),
    rating: decimal({ precision: 3, scale: 2 }).default('0.00'),
    reviewCount: int('review_count').default(0),
    logoUrl: varchar('logo_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    isActive: tinyint('is_active').default(1),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [
    unique('ux_partners_user').on(table.userId),
    index('idx_partners_verification').on(table.verificationStatus),
    index('idx_partners_trust_score').on(table.trustScore),
  ],
);

export const partnerSubscriptions = mysqlTable(
  'partner_subscriptions',
  {
    id: int().autoincrement().primaryKey(),
    partnerId: int('partner_id')
      .notNull()
      .references(() => partners.id),
    planId: int('plan_id').references(() => plans.id),
    status: mysqlEnum(['active', 'cancelled', 'past_due', 'trial']).default('active'),
    billingInterval: mysqlEnum('billing_interval', ['monthly', 'yearly']).default('monthly'),
    currentPeriodStart: timestamp('current_period_start', { mode: 'string' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
  },
  table => [index('idx_partner_subscriptions_status').on(table.status)],
);

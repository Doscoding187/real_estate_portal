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
import { agencies } from './agencies';

export const users = mysqlTable(
  'users',
  {
    id: int().autoincrement().notNull(),
    openId: varchar({ length: 64 }),
    email: varchar({ length: 320 }),
    passwordHash: varchar({ length: 255 }),
    name: text(),
    firstName: varchar({ length: 100 }),
    lastName: varchar({ length: 100 }),
    phone: varchar({ length: 30 }),
    loginMethod: varchar({ length: 64 }),
    emailVerified: int().default(0).notNull(),
    role: mysqlEnum(['visitor', 'agent', 'agency_admin', 'property_developer', 'super_admin'])
      .default('visitor')
      .notNull(),
    agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
    isSubaccount: int().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    passwordResetToken: varchar({ length: 255 }),
    passwordResetTokenExpiresAt: timestamp({ mode: 'string' }),
    emailVerificationToken: varchar({ length: 255 }),
  },
  table => [index('email_idx').on(table.email), index('role_idx').on(table.role)],
);

export const auditLogs = mysqlTable('audit_logs', {
  id: int().autoincrement().notNull(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: varchar({ length: 100 }).notNull(),
  targetType: varchar({ length: 50 }),
  targetId: int(),
  metadata: text(),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const platformSettings = mysqlTable('platform_settings', {
  id: int().autoincrement().notNull(),
  key: varchar({ length: 100 }).notNull(),
  value: text().notNull(),
  description: text(),
  category: mysqlEnum(['pricing', 'features', 'notifications', 'limits', 'other'])
    .default('other')
    .notNull(),
  isPublic: int().notNull(),
  updatedBy: int().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable('notifications', {
  id: int().autoincrement().notNull(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: mysqlEnum([
    'lead_assigned',
    'offer_received',
    'showing_scheduled',
    'system_alert',
  ]).notNull(),
  title: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  data: text(),
  isRead: int().notNull(),
  readAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const emailTemplates = mysqlTable('email_templates', {
  id: int().autoincrement().notNull(),
  templateKey: varchar({ length: 100 }).notNull(),
  subject: varchar({ length: 255 }).notNull(),
  htmlContent: text().notNull(),
  textContent: text(),
  agencyId: int().references(() => agencies.id, { onDelete: 'cascade' }),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userOnboardingState = mysqlTable('user_onboarding_state', {
  userId: int('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isFirstSession: tinyint('is_first_session').default(1),
  welcomeOverlayShown: tinyint('welcome_overlay_shown').default(0),
  welcomeOverlayDismissed: tinyint('welcome_overlay_dismissed').default(0),
  suggestedTopics: json('suggested_topics'),
  tooltipsShown: json('tooltips_shown'),
  contentViewCount: int('content_view_count').default(0),
  saveCount: int('save_count').default(0),
  partnerEngagementCount: int('partner_engagement_count').default(0),
  featuresUnlocked: json('features_unlocked'),
  createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP'),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
});

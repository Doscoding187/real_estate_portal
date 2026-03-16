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
    id: int().autoincrement().primaryKey(),
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
    plan: mysqlEnum(['trial', 'paid']).default('trial').notNull(),
    trialStatus: mysqlEnum(['active', 'expired']).default('active').notNull(),
    trialStartedAt: timestamp({ mode: 'string' }),
    trialEndsAt: timestamp({ mode: 'string' }),
    agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
    isSubaccount: int().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
    passwordResetToken: varchar({ length: 255 }),
    passwordResetTokenExpiresAt: timestamp({ mode: 'string' }),
    emailVerificationToken: varchar({ length: 255 }),
  },
  table => [index('email_idx').on(table.email), index('role_idx').on(table.role)],
);

export const auditLogs = mysqlTable('audit_logs', {
  id: int().autoincrement().primaryKey(),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: varchar({ length: 100 }).notNull(),
  targetType: varchar({ length: 50 }),
  targetId: int(),
  metadata: text(),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const managerialAuditLogs = mysqlTable(
  'managerial_audit_logs',
  {
    id: int().autoincrement().primaryKey(),
    actorUserId: int('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: varchar({ length: 120 }).notNull(),
    targetType: varchar('target_type', { length: 80 }).notNull(),
    targetId: int('target_id').notNull(),
    beforeData: json('before_data'),
    afterData: json('after_data'),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_managerial_audit_actor').on(table.actorUserId),
    index('idx_managerial_audit_target').on(table.targetType, table.targetId),
    index('idx_managerial_audit_created').on(table.createdAt),
  ],
);

export const platformSettings = mysqlTable('platform_settings', {
  id: int().autoincrement().primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).notNull(),
  settingValue: text('setting_value').notNull(),
  description: text(),
  category: mysqlEnum(['pricing', 'features', 'notifications', 'limits', 'other'])
    .default('other')
    .notNull(),
  isPublic: int().notNull(),
  updatedBy: int().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable('notifications', {
  id: int().autoincrement().primaryKey(),
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
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const emailTemplates = mysqlTable('email_templates', {
  id: int().autoincrement().primaryKey(),
  templateKey: varchar({ length: 100 }).notNull(),
  subject: varchar({ length: 255 }).notNull(),
  htmlContent: text().notNull(),
  textContent: text(),
  agencyId: int().references(() => agencies.id, { onDelete: 'cascade' }),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
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
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
});

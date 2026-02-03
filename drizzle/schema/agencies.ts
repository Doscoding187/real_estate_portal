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
import { plans } from './billing';
import { properties } from './listings';
import { leads } from './leads';

export const agencies = mysqlTable('agencies', {
  id: int().autoincrement().notNull(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  description: text(),
  logo: text(),
  website: varchar({ length: 255 }),
  email: varchar({ length: 320 }),
  phone: varchar({ length: 50 }),
  address: text(),
  city: varchar({ length: 100 }),
  province: varchar({ length: 100 }),
  subscriptionPlan: varchar({ length: 50 }).default('free').notNull(),
  subscriptionStatus: varchar({ length: 30 }).default('trial').notNull(),
  subscriptionExpiry: timestamp({ mode: 'string' }),
  isVerified: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agencyBranding = mysqlTable('agency_branding', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  primaryColor: varchar({ length: 7 }),
  secondaryColor: varchar({ length: 7 }),
  accentColor: varchar({ length: 7 }),
  logoUrl: text(),
  faviconUrl: text(),
  customDomain: varchar({ length: 255 }),
  subdomain: varchar({ length: 63 }),
  companyName: varchar({ length: 255 }),
  tagline: varchar({ length: 255 }),
  customCss: text(),
  metaTitle: varchar({ length: 255 }),
  metaDescription: text(),
  supportEmail: varchar({ length: 320 }),
  supportPhone: varchar({ length: 50 }),
  socialLinks: text(),
  isEnabled: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agencyJoinRequests = mysqlTable('agency_join_requests', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  userId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
  message: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  reviewedBy: int().references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp({ mode: 'string' }),
});

export const agencySubscriptions = mysqlTable('agency_subscriptions', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  planId: int().references(() => plans.id, { onDelete: 'set null' }),
  stripeSubscriptionId: varchar({ length: 100 }),
  stripeCustomerId: varchar({ length: 100 }).notNull(),
  stripePriceId: varchar({ length: 100 }),
  status: mysqlEnum([
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
  ])
    .default('incomplete')
    .notNull(),
  currentPeriodStart: timestamp({ mode: 'string' }),
  currentPeriodEnd: timestamp({ mode: 'string' }),
  trialEnd: timestamp({ mode: 'string' }),
  cancelAtPeriodEnd: int().notNull(),
  canceledAt: timestamp({ mode: 'string' }),
  endedAt: timestamp({ mode: 'string' }),
  metadata: text(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agents = mysqlTable('agents', {
  id: int().autoincrement().notNull(),
  userId: int().references(() => users.id, { onDelete: 'cascade' }),
  agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
  firstName: varchar({ length: 100 }).notNull(),
  lastName: varchar({ length: 100 }).notNull(),
  displayName: varchar({ length: 200 }),
  bio: text(),
  profileImage: text(),
  phone: varchar({ length: 50 }),
  email: varchar({ length: 320 }),
  whatsapp: varchar({ length: 50 }),
  specialization: text(),
  role: mysqlEnum(['agent', 'principal_agent', 'broker']).default('agent').notNull(),
  licenseNumber: varchar({ length: 100 }),
  yearsExperience: int(),
  areasServed: text(),
  languages: text(),
  rating: int(),
  reviewCount: int(),
  totalSales: int(),
  isVerified: int().notNull(),
  isFeatured: int().notNull(),
  status: mysqlEnum(['pending', 'approved', 'rejected', 'suspended']).default('pending').notNull(),
  rejectionReason: text(),
  approvedBy: int().references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agentCoverageAreas = mysqlTable('agent_coverage_areas', {
  id: int().autoincrement().notNull(),
  agentId: int()
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  areaName: varchar({ length: 255 }).notNull(),
  areaType: mysqlEnum(['province', 'city', 'suburb', 'custom_polygon']).notNull(),
  areaData: text().notNull(),
  isActive: int().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agentKnowledge = mysqlTable(
  'agent_knowledge',
  {
    id: int().autoincrement().notNull(),
    topic: varchar({ length: 200 }).notNull(),
    content: text().notNull(),
    category: varchar({ length: 100 }),
    tags: json(),
    metadata: json(),
    isActive: int('is_active').default(1).notNull(),
    createdBy: int('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_agent_knowledge_topic').on(table.topic),
    index('idx_agent_knowledge_category').on(table.category),
    index('idx_agent_knowledge_active').on(table.isActive),
    index('idx_agent_knowledge_created').on(table.createdAt),
  ],
);

export const agentMemory = mysqlTable(
  'agent_memory',
  {
    id: int().autoincrement().notNull(),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    conversationId: varchar('conversation_id', { length: 100 }),
    userId: int('user_id').references(() => users.id),
    userInput: text('user_input').notNull(),
    agentResponse: text('agent_response').notNull(),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_agent_memory_session').on(table.sessionId),
    index('idx_agent_memory_conversation').on(table.conversationId),
    index('idx_agent_memory_user').on(table.userId),
    index('idx_agent_memory_created').on(table.createdAt),
  ],
);

export const agentTasks = mysqlTable(
  'agent_tasks',
  {
    id: int().autoincrement().notNull(),
    taskId: varchar('task_id', { length: 100 }).notNull(),
    sessionId: varchar('session_id', { length: 100 }),
    userId: int('user_id').references(() => users.id),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    status: mysqlEnum(['pending', 'running', 'completed', 'failed']).default('pending').notNull(),
    priority: int().default(0).notNull(),
    inputData: json('input_data'),
    outputData: json('output_data'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { mode: 'string' }),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_agent_tasks_status').on(table.status),
    index('idx_agent_tasks_type').on(table.taskType),
    index('idx_agent_tasks_user').on(table.userId),
    index('idx_agent_tasks_session').on(table.sessionId),
    index('idx_agent_tasks_created').on(table.createdAt),
    index('task_id').on(table.taskId),
  ],
);

export const invitations = mysqlTable('invitations', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  invitedBy: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: varchar({ length: 320 }).notNull(),
  role: varchar({ length: 50 }).default('agent').notNull(),
  token: varchar({ length: 255 }).notNull(),
  status: mysqlEnum(['pending', 'accepted', 'expired', 'cancelled']).default('pending').notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  acceptedAt: timestamp({ mode: 'string' }),
  acceptedBy: int().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const invites = mysqlTable('invites', {
  id: int().autoincrement().notNull(),
  agencyId: int()
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  email: varchar({ length: 255 }).notNull(),
  token: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 30 }).default('agent'),
  expiresAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  used: int().notNull(),
  usedAt: timestamp({ mode: 'string' }),
  usedBy: int().references(() => users.id, { onDelete: 'set null' }),
});

export const commissions = mysqlTable('commissions', {
  id: int().autoincrement().notNull(),
  agentId: int()
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  propertyId: int().references(() => properties.id, { onDelete: 'set null' }),
  leadId: int().references(() => leads.id, { onDelete: 'set null' }),
  amount: int().notNull(),
  percentage: int(),
  status: mysqlEnum(['pending', 'approved', 'paid', 'cancelled']).default('pending').notNull(),
  transactionType: mysqlEnum(['sale', 'rent', 'referral', 'other']).default('sale').notNull(),
  description: text(),
  payoutDate: timestamp({ mode: 'string' }),
  paymentReference: varchar({ length: 100 }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

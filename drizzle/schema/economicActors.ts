import { int, mysqlEnum, mysqlTable, timestamp, decimal, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { users } from './core';

export const economicActors = mysqlTable(
  'economic_actors',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorType: mysqlEnum('actor_type', ['agent', 'developer', 'contractor', 'finance_partner'])
      .notNull(),
    verificationStatus: mysqlEnum('verification_status', [
      'unverified',
      'pending',
      'verified',
      'rejected',
    ])
      .default('unverified')
      .notNull(),
    subscriptionTier: mysqlEnum('subscription_tier', ['free', 'starter', 'pro', 'enterprise'])
      .default('free')
      .notNull(),
    trustScore: decimal('trust_score', { precision: 5, scale: 2 }).default('50.00').notNull(),
    momentumScore: decimal('momentum_score', { precision: 7, scale: 2 }).default('0.00').notNull(),
    abuseScore: decimal('abuse_score', { precision: 5, scale: 2 }).default('50.00').notNull(),
    profileCompleteness: int('profile_completeness').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    userTypeUq: uniqueIndex('uq_economic_actors_user_type').on(t.userId, t.actorType),
    actorTypeIdx: index('idx_economic_actors_actor_type').on(t.actorType),
    trustIdx: index('idx_economic_actors_trust_score').on(t.trustScore),
    abuseIdx: index('idx_economic_actors_abuse_score').on(t.abuseScore),
  }),
);

export const agentProfiles = mysqlTable(
  'agent_profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    actorId: int('actor_id')
      .notNull()
      .references(() => economicActors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    actorUq: uniqueIndex('uq_agent_profiles_actor_id').on(t.actorId),
  }),
);

export const developerProfiles = mysqlTable(
  'developer_profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    actorId: int('actor_id')
      .notNull()
      .references(() => economicActors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    actorUq: uniqueIndex('uq_developer_profiles_actor_id').on(t.actorId),
  }),
);

export const contractorProfiles = mysqlTable(
  'contractor_profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    actorId: int('actor_id')
      .notNull()
      .references(() => economicActors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    actorUq: uniqueIndex('uq_contractor_profiles_actor_id').on(t.actorId),
  }),
);

export const financeProfiles = mysqlTable(
  'finance_profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    actorId: int('actor_id')
      .notNull()
      .references(() => economicActors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  t => ({
    actorUq: uniqueIndex('uq_finance_profiles_actor_id').on(t.actorId),
  }),
);

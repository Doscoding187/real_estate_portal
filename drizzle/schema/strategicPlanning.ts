import {
  mysqlTable,
  int,
  varchar,
  text,
  mysqlEnum,
  timestamp,
  date,
  index,
  check,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './core';

/**
 * Supported metric keys — single authority for schema enum, Zod validation,
 * and registry coverage. Derived from existing canonical resolvers in db.ts.
 */
export const SUPPORTED_METRIC_KEYS = [
  'active_agents',
  'active_agencies',
  'active_developers',
  'active_listings',
] as const;

export type SupportedMetricKey = (typeof SUPPORTED_METRIC_KEYS)[number];

export const SUPPORTED_METRIC_KEY_VALUES = SUPPORTED_METRIC_KEYS as unknown as [
  string,
  ...string[],
];

export const strategicPlanningPeriods = mysqlTable(
  'strategic_planning_periods',
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 100 }).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_spp_start_end').on(table.startDate, table.endDate),
    check('spp_date_order', sql`start_date < end_date`),
  ],
);

export const strategicPlanningObjectives = mysqlTable(
  'strategic_planning_objectives',
  {
    id: int().autoincrement().primaryKey(),
    title: varchar({ length: 200 }).notNull(),
    description: text(),
    status: mysqlEnum('status', ['draft', 'active', 'completed', 'cancelled']).notNull().default('draft'),
    ownerUserId: int('owner_user_id').references(() => users.id, { onDelete: 'restrict' }),
    planningPeriodId: int('planning_period_id').notNull().references(() => strategicPlanningPeriods.id, { onDelete: 'restrict' }),
    createdByUserId: int('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    updatedByUserId: int('updated_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_spp_obj_period_status').on(table.planningPeriodId, table.status),
    index('idx_spp_obj_owner_status').on(table.ownerUserId, table.status),
    check(
      'spp_obj_owner_required',
      sql`(status IN ('active', 'completed') AND owner_user_id IS NOT NULL) OR status IN ('draft', 'cancelled')`,
    ),
  ],
);

export const strategicPlanningTargets = mysqlTable(
  'strategic_planning_targets',
  {
    id: int().autoincrement().primaryKey(),
    objectiveId: int('objective_id').notNull().references(() => strategicPlanningObjectives.id, { onDelete: 'restrict' }),
    metricKey: mysqlEnum('metric_key', [...SUPPORTED_METRIC_KEYS]).notNull(),
    label: varchar({ length: 200 }).notNull(),
    targetValue: int('target_value').notNull(),
    comparisonDirection: mysqlEnum('comparison_direction', ['at_least', 'at_most']).notNull().default('at_least'),
    evaluationDate: date('evaluation_date', { mode: 'string' }).notNull(),
    createdByUserId: int('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    updatedByUserId: int('updated_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_spp_tgt_objective_eval').on(table.objectiveId, table.evaluationDate),
    check('spp_target_value_non_negative', sql`target_value >= 0`),
  ],
);

import { date, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { users } from './core';
import { strategicPlanningObjectives } from './strategicPlanning';

export const strategicPlanningCommitments = mysqlTable(
  'strategic_planning_commitments',
  {
    id: int().autoincrement().primaryKey(),
    objectiveId: int('objective_id').notNull().references(() => strategicPlanningObjectives.id, { onDelete: 'restrict' }),
    title: varchar({ length: 200 }).notNull(),
    description: text(),
    ownerUserId: int('owner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    status: mysqlEnum('status', ['open', 'in_progress', 'completed', 'dropped']).notNull().default('open'),
    dueDate: date('due_date', { mode: 'string' }),
    dropReason: text('drop_reason'),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    droppedAt: timestamp('dropped_at', { mode: 'string' }),
    createdByUserId: int('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    updatedByUserId: int('updated_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_spc_objective_status').on(table.objectiveId, table.status),
    index('idx_spc_objective_due_date').on(table.objectiveId, table.dueDate),
    index('idx_spc_owner_status').on(table.ownerUserId, table.status),
    index('idx_spc_status_due_date').on(table.status, table.dueDate),
  ],
);

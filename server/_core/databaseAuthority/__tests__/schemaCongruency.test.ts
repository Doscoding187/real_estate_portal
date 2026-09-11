import { describe, expect, it } from 'vitest';
import { date, index, int, check, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  compareNormalizedSchemas,
  normalizeSqlExpression,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  type NormalizedSchema,
} from '../schemaCongruency';

const parents = mysqlTable('fixture_parents', {
  id: int('id').autoincrement().notNull().primaryKey(),
  code: varchar('code', { length: 32 }).notNull(),
});

const children = mysqlTable(
  'fixture_children',
  {
    id: int('id').autoincrement().notNull().primaryKey(),
    parentId: int('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 80 }).notNull().default('pending'),
  },
  table => ({
    parentIndex: index('fixture_children_parent_idx').on(table.parentId),
    labelUnique: uniqueIndex('fixture_children_label_unique').on(table.label),
  }),
);

const strategicPlanningPeriods = mysqlTable(
  'fixture_strategic_planning_periods',
  {
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
  },
  () => [check('fixture_period_order', sql`start_date < end_date`)],
);

const strategicPlanningObjectives = mysqlTable(
  'fixture_strategic_planning_objectives',
  {
    status: varchar('status', { length: 16 }).notNull(),
    ownerUserId: int('owner_user_id'),
  },
  () => [
    check(
      'fixture_owner_required',
      sql`(status IN ('active', 'completed') AND owner_user_id IS NOT NULL) OR status IN ('draft', 'cancelled')`,
    ),
  ],
);

const strategicPlanningTargets = mysqlTable(
  'fixture_strategic_planning_targets',
  {
    targetValue: int('target_value').notNull(),
  },
  () => [check('fixture_target_non_negative', sql`target_value >= 0`)],
);

const strategicPlanningColumnNames = new Set([
  'start_date',
  'end_date',
  'status',
  'owner_user_id',
  'target_value',
  'label',
]);

function clone(schema: NormalizedSchema): NormalizedSchema {
  return JSON.parse(JSON.stringify(schema)) as NormalizedSchema;
}

describe('normalized schema congruency', () => {
  it('equates quoted and unquoted local-column CHECK identifiers', () => {
    const canonical = normalizeSqlExpression('start_date < end_date', {
      localColumns: strategicPlanningColumnNames,
      localTableName: 'fixture_strategic_planning_periods',
    });
    const physical = normalizeSqlExpression('`start_date` < `end_date`', {
      localColumns: strategicPlanningColumnNames,
      localTableName: 'fixture_strategic_planning_periods',
    });
    expect(physical).toBe(canonical);
    expect(
      normalizeSqlExpression(
        '`fixture_strategic_planning_periods`.`start_date` < `fixture_strategic_planning_periods`.`end_date`',
        {
          localColumns: strategicPlanningColumnNames,
          localTableName: 'fixture_strategic_planning_periods',
        },
      ),
    ).toBe(canonical);
  });

  it('equates the Objective owner invariant despite MySQL comma rendering', () => {
    const canonical = normalizeSqlExpression(
      "(status IN ('active', 'completed') AND owner_user_id IS NOT NULL) OR status IN ('draft', 'cancelled')",
      {
        localColumns: strategicPlanningColumnNames,
        localTableName: 'fixture_strategic_planning_objectives',
      },
    );
    const physical = normalizeSqlExpression(
      "((`status` IN ('active','completed') AND `owner_user_id` IS NOT NULL) OR `status` IN ('draft','cancelled'))",
      {
        localColumns: strategicPlanningColumnNames,
        localTableName: 'fixture_strategic_planning_objectives',
      },
    );
    expect(physical).toBe(canonical);
  });

  it('equates quoted and unquoted non-negative target checks', () => {
    expect(
      normalizeSqlExpression('`target_value` >= 0', {
        localColumns: strategicPlanningColumnNames,
        localTableName: 'fixture_strategic_planning_targets',
      }),
    ).toBe(
      normalizeSqlExpression('target_value >= 0', {
        localColumns: strategicPlanningColumnNames,
        localTableName: 'fixture_strategic_planning_targets',
      }),
    );
  });

  it('retains semantic operator and literal differences', () => {
    const options = {
      localColumns: strategicPlanningColumnNames,
      localTableName: 'fixture_strategic_planning_targets',
    };
    expect(normalizeSqlExpression('start_date < end_date', options)).not.toBe(
      normalizeSqlExpression('start_date <= end_date', options),
    );
    expect(normalizeSqlExpression('target_value >= 0', options)).not.toBe(
      normalizeSqlExpression('target_value > 0', options),
    );
    expect(normalizeSqlExpression("`label` = 'alpha'", options)).not.toBe(
      normalizeSqlExpression("`label` = 'beta'", options),
    );
  });

  it('does not rewrite quoted text, special identifiers, or SQL function syntax', () => {
    const options = {
      localColumns: strategicPlanningColumnNames,
      localTableName: 'fixture_strategic_planning_targets',
    };
    const literal = normalizeSqlExpression("(`label` = 'literal `start_date`, value')", options);
    expect(literal).toContain("'literal `start_date`, value'");
    expect(normalizeSqlExpression("(`label` = 'O\\'Brien')", options)).toContain("'O\\'Brien'");
    expect(normalizeSqlExpression("(`label` = _utf8mb4\\'O\\'Brien\\')", options)).toContain(
      "'O\\'Brien'",
    );
    expect(normalizeSqlExpression('`select` > 0', { localColumns: new Set(['select']) })).toContain(
      '`select`',
    );
    expect(normalizeSqlExpression('`a``b` > 0', { localColumns: new Set(['a`b']) })).toContain(
      '`a``b`',
    );
    expect(normalizeSqlExpression('`other_table`.`other_column` > 0', options)).toContain(
      '`other_table`',
    );
    expect(normalizeSqlExpression('`other_table`.`target_value` > 0', options)).toContain(
      '`other_table`.`target_value`',
    );
    expect(normalizeSqlExpression('`label` = "A,  B"', options)).toContain('"A,  B"');
    expect(
      normalizeSqlExpression(
        "JSON_EXTRACT(`label`, '$.details.`start_date`, value') IS NOT NULL",
        options,
      ),
    ).toContain("'$.details.`start_date`, value'");
    expect(normalizeSqlExpression('CHAR_LENGTH(TRIM(`label`)) > 0', options)).toBe(
      'char_length(trim(label)) > 0',
    );
  });

  it('converges the three Strategic Planning CHECK forms from physical metadata', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [
            [
              { table_name: 'fixture_strategic_planning_objectives' },
              { table_name: 'fixture_strategic_planning_periods' },
              { table_name: 'fixture_strategic_planning_targets' },
            ],
          ];
        }
        if (statement.includes('information_schema.columns')) {
          return [
            [
              {
                table_name: 'fixture_strategic_planning_periods',
                column_name: 'start_date',
                ordinal_position: 1,
                column_type: 'date',
                is_nullable: 'NO',
                column_default: null,
                extra: '',
              },
              {
                table_name: 'fixture_strategic_planning_periods',
                column_name: 'end_date',
                ordinal_position: 2,
                column_type: 'date',
                is_nullable: 'NO',
                column_default: null,
                extra: '',
              },
              {
                table_name: 'fixture_strategic_planning_objectives',
                column_name: 'status',
                ordinal_position: 1,
                column_type: 'varchar(16)',
                is_nullable: 'NO',
                column_default: null,
                extra: '',
              },
              {
                table_name: 'fixture_strategic_planning_objectives',
                column_name: 'owner_user_id',
                ordinal_position: 2,
                column_type: 'int',
                is_nullable: 'YES',
                column_default: null,
                extra: '',
              },
              {
                table_name: 'fixture_strategic_planning_targets',
                column_name: 'target_value',
                ordinal_position: 1,
                column_type: 'int',
                is_nullable: 'NO',
                column_default: null,
                extra: '',
              },
            ],
          ];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_strategic_planning_periods',
                constraint_name: 'fixture_period_order',
                check_clause: '(`start_date` < `end_date`)',
              },
              {
                table_name: 'fixture_strategic_planning_objectives',
                constraint_name: 'fixture_owner_required',
                check_clause:
                  "((`status` IN ('active','completed') AND `owner_user_id` IS NOT NULL) OR `status` IN ('draft','cancelled'))",
              },
              {
                table_name: 'fixture_strategic_planning_targets',
                constraint_name: 'fixture_target_non_negative',
                check_clause: '(`target_value` >= 0)',
              },
            ],
          ];
        }
        return [[]];
      },
      async query(statement: string) {
        return connection.execute(statement);
      },
      async end() {},
    };

    const desired = normalizedDesiredSchema({
      strategicPlanningPeriods,
      strategicPlanningObjectives,
      strategicPlanningTargets,
    });
    const actual = await normalizedPhysicalSchema(connection);
    const report = compareNormalizedSchemas(desired, actual);
    expect(report.congruent).toBe(true);
    expect(report.differences).toEqual([]);
  });

  it('derives deterministic desired evidence directly from canonical Drizzle metadata', () => {
    const first = normalizedDesiredSchema({ parents, children });
    const second = normalizedDesiredSchema({ children, parents });
    expect(first).toEqual(second);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tables.map(table => table.name)).toEqual(['fixture_children', 'fixture_parents']);
    expect(compareNormalizedSchemas(first, clone(first)).congruent).toBe(true);
  });

  it.each([
    ['type', (schema: NormalizedSchema) => (schema.tables[0].columns[0].type = 'bigint')],
    ['nullability', (schema: NormalizedSchema) => (schema.tables[0].columns[1].nullable = true)],
    ['default', (schema: NormalizedSchema) => (schema.tables[0].columns[2].default = 'changed')],
    [
      'index',
      (schema: NormalizedSchema) =>
        (schema.tables[0].indexes.find(item => item.name.includes('label_unique'))!.unique = false),
    ],
    [
      'foreign-key',
      (schema: NormalizedSchema) =>
        (schema.tables[0].foreignKeys[0].referencedTable = 'wrong_parent'),
    ],
  ] as const)('reports deliberate %s drift', (category, mutate) => {
    const desired = normalizedDesiredSchema({ parents, children });
    const actual = clone(desired);
    mutate(actual);
    const report = compareNormalizedSchemas(desired, actual);
    expect(report.congruent).toBe(false);
    expect(report.differences.some(difference => difference.category === category)).toBe(true);
  });

  it('distinguishes unique/index order drift and column order drift', () => {
    const desired = normalizedDesiredSchema({ parents, children });
    const actual = clone(desired);
    const child = actual.tables.find(table => table.name === 'fixture_children')!;
    child.indexes.find(index => index.name === 'fixture_children_label_unique')!.columns = [
      'parent_id',
      'label',
    ];
    child.columns[0].ordinal = 3;
    const report = compareNormalizedSchemas(desired, actual);
    expect(report.differences.map(item => item.category)).toEqual(
      expect.arrayContaining(['index', 'column']),
    );
  });

  it('intentionally excludes runner control tables from physical application schema', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [
            [
              { table_name: 'fixture_parents' },
              { table_name: 'sql_migration_history' },
              { table_name: 'sql_migration_attempts' },
            ],
          ];
        }
        if (statement.includes('information_schema.columns')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                column_name: 'id',
                ordinal_position: 1,
                column_type: 'int',
                is_nullable: 'NO',
                column_default: null,
                extra: 'auto_increment',
              },
              {
                table_name: 'sql_migration_history',
                column_name: 'filename',
                ordinal_position: 1,
                column_type: 'varchar(255)',
                is_nullable: 'NO',
                column_default: null,
                extra: '',
              },
            ],
          ];
        }
        if (statement.includes('information_schema.statistics')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                index_name: 'PRIMARY',
                non_unique: 0,
                sequence_in_index: 1,
                column_name: 'id',
              },
            ],
          ];
        }
        return [[]];
      },
      async query(statement: string) {
        return connection.execute(statement);
      },
      async end() {},
    };
    const physical = await normalizedPhysicalSchema(connection);
    expect(physical.tables.map(table => table.name)).toEqual(['fixture_parents']);
    expect(physical.excludedControlTables).toEqual([
      'sql_migration_history',
      'sql_migration_attempts',
    ]);
  });
});

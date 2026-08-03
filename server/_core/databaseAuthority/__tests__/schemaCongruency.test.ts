import { describe, expect, it } from 'vitest';
import {
  index,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  compareNormalizedSchemas,
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

function clone(schema: NormalizedSchema): NormalizedSchema {
  return JSON.parse(JSON.stringify(schema)) as NormalizedSchema;
}

describe('normalized schema congruency', () => {
  it('derives deterministic desired evidence directly from canonical Drizzle metadata', () => {
    const first = normalizedDesiredSchema({ parents, children });
    const second = normalizedDesiredSchema({ children, parents });
    expect(first).toEqual(second);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tables.map(table => table.name)).toEqual([
      'fixture_children',
      'fixture_parents',
    ]);
    expect(compareNormalizedSchemas(first, clone(first)).congruent).toBe(true);
  });

  it.each([
    ['type', (schema: NormalizedSchema) => (schema.tables[0].columns[0].type = 'bigint')],
    ['nullability', (schema: NormalizedSchema) => (schema.tables[0].columns[1].nullable = true)],
    ['default', (schema: NormalizedSchema) => (schema.tables[0].columns[2].default = 'changed')],
    ['index', (schema: NormalizedSchema) => (schema.tables[0].indexes.find(item => item.name.includes('label_unique'))!.unique = false)],
    ['foreign-key', (schema: NormalizedSchema) => (schema.tables[0].foreignKeys[0].referencedTable = 'wrong_parent')],
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
          return [[
            { table_name: 'fixture_parents' },
            { table_name: 'sql_migration_history' },
            { table_name: 'sql_migration_attempts' },
          ]];
        }
        if (statement.includes('information_schema.columns')) {
          return [[
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
          ]];
        }
        if (statement.includes('information_schema.statistics')) {
          return [[
            {
              table_name: 'fixture_parents',
              index_name: 'PRIMARY',
              non_unique: 0,
              sequence_in_index: 1,
              column_name: 'id',
            },
          ]];
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

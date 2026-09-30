import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  check,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  compareNormalizedSchemas,
  normalizeSqlExpression,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  type NormalizedSchema,
} from '../schemaCongruency';

const parents = mysqlTable(
  'fixture_parents',
  {
    id: int('id').autoincrement().notNull().primaryKey(),
    code: varchar('code', { length: 32 }).notNull(),
  },
  table => [check('fixture_parents_positive_id', sql`${table.id} > 0`)],
);

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

const timestampFacts = mysqlTable('fixture_timestamp_facts', {
  id: int('id').autoincrement().notNull().primaryKey(),
  recordedAt: timestamp('recorded_at', { mode: 'string', fsp: 6 })
    .default(sql`CURRENT_TIMESTAMP(6)`)
    .notNull(),
});

const caseSensitiveParent = mysqlTable('propertyImages', {
  id: int('id').notNull().primaryKey(),
});
const caseSensitiveChild = mysqlTable('fixture_image_links', {
  id: int('id').notNull().primaryKey(),
  imageId: int('image_id').notNull().references(() => caseSensitiveParent.id),
});

function tableCaseConnection(
  setting: number,
  physicalParent = 'propertyimages',
  extraTable?: string,
): AuthoritySqlConnection {
  const tableNames = ['fixture_image_links', physicalParent, ...(extraTable ? [extraTable] : [])];
  const connection: AuthoritySqlConnection = {
    async execute(statement: string) {
      if (statement.includes('@@global.lower_case_table_names')) {
        return [[{ lower_case_table_names: setting }]];
      }
      if (statement.includes('information_schema.tables')) {
        return [tableNames.map(table_name => ({ table_name }))];
      }
      if (statement.includes('information_schema.columns')) {
        return [[
          ...tableNames.map(table_name => ({ table_name, column_name: 'id', ordinal_position: 1,
            column_type: 'int', is_nullable: 'NO', column_default: null, extra: '' })),
          { table_name: 'fixture_image_links', column_name: 'image_id', ordinal_position: 2,
            column_type: 'int', is_nullable: 'NO', column_default: null, extra: '' },
        ]];
      }
      if (statement.includes('information_schema.statistics')) {
        return [tableNames.map(table_name => ({ table_name, index_name: 'PRIMARY', non_unique: 0,
          sequence_in_index: 1, column_name: 'id' }))];
      }
      if (statement.includes('information_schema.KEY_COLUMN_USAGE')) {
        return [[{ table_name: 'fixture_image_links', constraint_name: 'fixture_image_links_image_fk',
          column_name: 'image_id', ordinal_position: 1, referenced_table_name: physicalParent,
          referenced_column_name: 'id', delete_rule: 'NO ACTION', update_rule: 'NO ACTION' }]];
      }
      return [[]];
    },
    async query(statement: string) { return connection.execute(statement); },
    async end() {},
  };
  return connection;
}

function clone(schema: NormalizedSchema): NormalizedSchema {
  return JSON.parse(JSON.stringify(schema)) as NormalizedSchema;
}

describe('normalized schema congruency', () => {
  it('keeps exact table matching when lower_case_table_names is 0', async () => {
    const desired = normalizedDesiredSchema({ caseSensitiveParent, caseSensitiveChild });
    const exact = await normalizedPhysicalSchema(tableCaseConnection(0, 'propertyImages'), 'mysql', desired);
    expect(compareNormalizedSchemas(desired, exact).congruent).toBe(true);
    const wrongCase = await normalizedPhysicalSchema(tableCaseConnection(0), 'mysql', desired);
    expect(compareNormalizedSchemas(desired, wrongCase).congruent).toBe(false);
  });

  it('reconciles only verified table and FK target casing under setting 1', async () => {
    const desired = normalizedDesiredSchema({ caseSensitiveParent, caseSensitiveChild });
    const physical = await normalizedPhysicalSchema(tableCaseConnection(1), 'mysql', desired);
    expect(physical.tables.map(table => table.name)).toContain('propertyImages');
    expect(physical.tables.find(table => table.name === 'fixture_image_links')?.foreignKeys[0].referencedTable)
      .toBe('propertyImages');
    expect(compareNormalizedSchemas(desired, physical).congruent).toBe(true);
    expect(physical.digest).toBe(desired.digest);
  });

  it('fails closed on a physical case-fold collision or unverified setting', async () => {
    const desired = normalizedDesiredSchema({ caseSensitiveParent, caseSensitiveChild });
    await expect(normalizedPhysicalSchema(
      tableCaseConnection(1, 'propertyimages', 'propertyImages'), 'mysql', desired,
    )).rejects.toThrow('Physical table-name case collision');
    await expect(normalizedPhysicalSchema(tableCaseConnection(2), 'mysql', desired))
      .rejects.toThrow('could not be verified as 0 or 1');
  });
  it('preserves SQL collection parentheses while removing redundant predicate grouping', () => {
    expect(
      normalizeSqlExpression("((`state` NOT IN ('available_confirmed', 'available_upcoming')))"),
    ).toBe("`state` not in ('available_confirmed','available_upcoming')");
    expect(normalizeSqlExpression('((`id` > 0))')).toBe('`id` > 0');
    expect(normalizeSqlExpression('NOT (`id` > 0)')).toBe('not (`id` > 0)');
    expect(normalizeSqlExpression('((`left` + `right`) = (`a`,`b`))')).toBe(
      '(`left` + `right`) = (`a`,`b`)',
    );
    expect(normalizeSqlExpression('(`a` * (`b` + `c`) > 0)')).toBe('`a` * (`b` + `c`) > 0');
    expect(normalizeSqlExpression("(`value` IN ('A  B', 'C'))")).toBe("`value` in ('A  B','C')");
    expect(normalizeSqlExpression("(`schema`.`column` = _utf8mb4'Known Value')")).toBe(
      "`column` = 'Known Value'",
    );
    expect(
      normalizeSqlExpression(
        "(((`authority_kind` = _utf8mb4\\'platform_reference\\') AND (`developer_organisation_id` IS NULL)) OR ((`authority_kind` = _utf8mb4\\'developer_first_party\\') AND (`developer_organisation_id` IS NOT NULL)))",
      ),
    ).toBe(
      "(`authority_kind` = 'platform_reference' and `developer_organisation_id` is null) or (`authority_kind` = 'developer_first_party' and `developer_organisation_id` is not null)",
    );
    expect(normalizeSqlExpression("(`label` = 'O\\'Brien')")).toBe("`label` = 'O\\'Brien'");
    expect(normalizeSqlExpression("(`label` = _utf8mb4\\'O\\'Brien\\')")).toBe(
      "`label` = 'O\\'Brien'",
    );
    expect(
      normalizeSqlExpression(
        "(`value_state` = 'known' AND (((`numeric_value` IS NOT NULL) + (`text_value` IS NOT NULL)) + (`boolean_value` IS NOT NULL)) = 1) OR (`value_state` IN ('unknown','unavailable','not_applicable') AND `numeric_value` IS NULL AND `text_value` IS NULL AND `boolean_value` IS NULL)",
      ),
    ).toBe(
      "(`value_state` = 'known' and ((`numeric_value` is not null) + (`text_value` is not null) + (`boolean_value` is not null) = 1)) or (`value_state` in ('unknown','unavailable','not_applicable') and `numeric_value` is null and `text_value` is null and `boolean_value` is null)",
    );
    expect(normalizeSqlExpression("(`label` = 'literal _utf8mb4`source`.`column`')")).toBe(
      "`label` = 'literal _utf8mb4`source`.`column`'",
    );
    expect(normalizeSqlExpression("(`label` = 'literal (value)')")).toBe(
      "`label` = 'literal (value)'",
    );
  });

  it('derives deterministic desired evidence directly from canonical Drizzle metadata', () => {
    const first = normalizedDesiredSchema({ parents, children });
    const second = normalizedDesiredSchema({ children, parents });
    expect(first).toEqual(second);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tables.map(table => table.name)).toEqual(['fixture_children', 'fixture_parents']);
    expect(compareNormalizedSchemas(first, clone(first)).congruent).toBe(true);
  });

  it('normalizes precision-bearing current-time defaults from MySQL metadata', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_timestamp_facts' }]];
        }
        if (statement.includes('information_schema.columns')) {
          return [
            [
              {
                table_name: 'fixture_timestamp_facts',
                column_name: 'id',
                ordinal_position: 1,
                column_type: 'int',
                is_nullable: 'NO',
                column_default: null,
                extra: 'auto_increment',
              },
              {
                table_name: 'fixture_timestamp_facts',
                column_name: 'recorded_at',
                ordinal_position: 2,
                column_type: 'timestamp(6)',
                is_nullable: 'NO',
                column_default: 'CURRENT_TIMESTAMP(6)',
                extra: '',
              },
            ],
          ];
        }
        if (statement.includes('information_schema.statistics')) {
          return [
            [
              {
                table_name: 'fixture_timestamp_facts',
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

    const desired = normalizedDesiredSchema({ timestampFacts });
    const physical = await normalizedPhysicalSchema(connection);
    expect(desired.tables[0].columns[1].default).toBe('current_timestamp(6)');
    expect(physical.tables[0].columns[1].default).toBe('current_timestamp(6)');
    expect(compareNormalizedSchemas(desired, physical).congruent).toBe(true);
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

  it('treats an unchanged CHECK predicate with disabled enforcement as congruency drift', () => {
    const desired = normalizedDesiredSchema({ parents, children });
    const actual = clone(desired);
    const check = actual.tables
      .find(table => table.name === 'fixture_parents')!
      .checks.find(item => item.name === 'fixture_parents_positive_id')!;
    check.enforced = false;

    const report = compareNormalizedSchemas(desired, actual);

    expect(report.congruent).toBe(false);
    expect(report.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'check',
          path: 'fixture_parents.fixture_parents_positive_id',
          expected: expect.objectContaining({
            expression: '`id` > 0',
            enforced: true,
          }),
          actual: expect.objectContaining({
            expression: '`id` > 0',
            enforced: false,
          }),
        }),
      ]),
    );
  });

  it('reads a disabled MySQL CHECK from physical metadata as congruency drift', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
                enforced: 'NO',
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

    const physical = await normalizedPhysicalSchema(connection, 'mysql');
    const desired = normalizedDesiredSchema({ parents });
    const report = compareNormalizedSchemas(desired, physical);

    expect(physical.tables[0].checks).toEqual([
      { name: 'fixture_parents_positive_id', expression: '`id` > 0', enforced: false },
    ]);
    expect(report.congruent).toBe(false);
    expect(report.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'check',
          path: 'fixture_parents.fixture_parents_positive_id',
        }),
      ]),
    );
  });

  it('fails closed when MySQL does not expose per-CHECK enforcement metadata', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
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

    await expect(normalizedPhysicalSchema(connection, 'mysql')).rejects.toThrow(
      'MySQL CHECK enforcement metadata is unavailable for fixture_parents.fixture_parents_positive_id',
    );
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

  it('uses TiDB CHECK_CONSTRAINTS inventory when the portable view is empty', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
              },
            ],
          ];
        }
        return [[]];
      },
      async query(statement: string) {
        if (statement.startsWith('SHOW GLOBAL VARIABLES')) {
          return [[{ Variable_name: 'tidb_enable_check_constraint', Value: 'ON' }]];
        }
        return connection.execute(statement);
      },
      async end() {},
    };

    const physical = await normalizedPhysicalSchema(connection, 'tidb');
    expect(physical.tables[0].checks).toEqual([
      { name: 'fixture_parents_positive_id', expression: '`id` > 0', enforced: true },
    ]);
  });

  it('falls back to TiDB CHECK_CONSTRAINTS when the portable view is unsupported', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          throw new Error('portable CHECK inventory unsupported');
        }
        if (statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
              },
            ],
          ];
        }
        return [[]];
      },
      async query(statement: string) {
        if (statement.startsWith('SHOW GLOBAL VARIABLES')) {
          return [[{ Variable_name: 'tidb_enable_check_constraint', Value: 'ON' }]];
        }
        return connection.execute(statement);
      },
      async end() {},
    };

    const physical = await normalizedPhysicalSchema(connection, 'tidb');
    expect(physical.tables[0].checks).toEqual([
      { name: 'fixture_parents_positive_id', expression: '`id` > 0', enforced: true },
    ]);
  });

  it('fails closed when neither CHECK metadata inventory is readable', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (
          statement.includes('information_schema.TABLE_CONSTRAINTS') ||
          statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')
        ) {
          throw new Error('CHECK metadata inventory unavailable');
        }
        return [[]];
      },
      async query(statement: string) {
        if (statement.startsWith('SHOW GLOBAL VARIABLES')) {
          return [[{ Variable_name: 'tidb_enable_check_constraint', Value: 'ON' }]];
        }
        return connection.execute(statement);
      },
      async end() {},
    };

    await expect(normalizedPhysicalSchema(connection)).rejects.toThrow(
      'Physical CHECK metadata could not be read from either the portable or TiDB inventory',
    );
  });

  it('merges the TiDB CHECK inventory when the portable inventory is partial', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
              },
            ],
          ];
        }
        if (statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_nonempty_code',
                check_clause: '(CHAR_LENGTH(TRIM(`code`)) > 0)',
              },
            ],
          ];
        }
        return [[]];
      },
      async query(statement: string) {
        if (statement.startsWith('SHOW GLOBAL VARIABLES')) {
          return [[{ Variable_name: 'tidb_enable_check_constraint', Value: 'ON' }]];
        }
        return connection.execute(statement);
      },
      async end() {},
    };

    const physical = await normalizedPhysicalSchema(connection, 'tidb');
    expect(physical.tables[0].checks).toEqual([
      {
        name: 'fixture_parents_nonempty_code',
        expression: 'char_length(trim(`code`)) > 0',
        enforced: true,
      },
      { name: 'fixture_parents_positive_id', expression: '`id` > 0', enforced: true },
    ]);
  });

  it('fails closed when the portable and TiDB CHECK inventories disagree', async () => {
    const connection: AuthoritySqlConnection = {
      async execute(statement: string) {
        if (statement.includes('information_schema.tables')) {
          return [[{ table_name: 'fixture_parents' }]];
        }
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 0)',
              },
            ],
          ];
        }
        if (statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')) {
          return [
            [
              {
                table_name: 'fixture_parents',
                constraint_name: 'fixture_parents_positive_id',
                check_clause: '(`id` > 1)',
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

    await expect(normalizedPhysicalSchema(connection)).rejects.toThrow(
      'CHECK inventory disagrees about fixture_parents.fixture_parents_positive_id',
    );
  });
});

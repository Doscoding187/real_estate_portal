import { createHash } from 'node:crypto';
import { is, SQL } from 'drizzle-orm';
import { getTableConfig, MySqlDialect, MySqlTable } from 'drizzle-orm/mysql-core';
import type { AuthoritySqlConnection } from './connectionAuthority';

export const RUNNER_CONTROL_TABLES = Object.freeze([
  'sql_migration_history',
  'sql_migration_attempts',
] as const);

export type NormalizedColumn = {
  name: string;
  ordinal: number;
  type: string;
  nullable: boolean;
  default: string | null;
  autoIncrement: boolean;
  onUpdateCurrentTimestamp: boolean;
};

export type NormalizedIndex = {
  name: string;
  unique: boolean;
  columns: string[];
};

export type NormalizedForeignKey = {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
};

export type NormalizedCheck = {
  name: string;
  expression: string;
};

export type NormalizedTable = {
  name: string;
  columns: NormalizedColumn[];
  indexes: NormalizedIndex[];
  foreignKeys: NormalizedForeignKey[];
  checks: NormalizedCheck[];
};

export type NormalizedSchema = {
  formatVersion: 1;
  dialect: 'mysql';
  excludedControlTables: readonly string[];
  tables: NormalizedTable[];
  digest: string;
};

export type SchemaDifference = {
  category:
    | 'table'
    | 'column'
    | 'type'
    | 'nullability'
    | 'default'
    | 'column-behaviour'
    | 'index'
    | 'foreign-key'
    | 'check';
  path: string;
  expected: unknown;
  actual: unknown;
};

export type SchemaCongruencyReport = {
  congruent: boolean;
  desiredDigest: string;
  actualDigest: string;
  differences: SchemaDifference[];
};

const dialect = new MySqlDialect();

function normalizedType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/^integer\b/, 'int')
    .replace(/^bool(?:ean)?$/, 'tinyint(1)');
}

function normalizedAction(value: unknown): string {
  return String(value ?? 'no action')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizedExpression(value: string): string {
  let normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  // MySQL/MariaDB expose CHECK clauses with table qualifiers removed,
  // character-set introducers added to string literals, and redundant
  // grouping parentheses around simple predicates. Canonicalize those
  // provider renderings so the Drizzle model and physical schema compare on
  // the actual constraint meaning.
  normalized = normalized
    .replace(/`[^`]+`\.`([^`]+)`/g, '`$1`')
    .replace(/_utf8mb4\\?'/g, "'")
    .replace(/\\'/g, "'")
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
  const hasTopLevelBooleanOperator = (expression: string): boolean => {
    let depth = 0;
    for (let index = 0; index < expression.length; index += 1) {
      const character = expression[index];
      if (character === '(') depth += 1;
      if (character === ')') depth -= 1;
      if (depth === 0 && /[a-z]/i.test(character)) {
        const remainder = expression.slice(index);
        if (/^(?:and|or)\b/.test(remainder)) return true;
      }
    }
    return false;
  };

  // Remove only grouping parentheses around a single predicate. Parentheses
  // belonging to SQL functions (for example TRIM(...)) and boolean groups
  // remain semantically significant.
  let changed = true;
  while (changed) {
    changed = false;
    const stack: number[] = [];
    for (let index = 0; index < normalized.length; index += 1) {
      const character = normalized[index];
      if (character === '(') {
        stack.push(index);
        continue;
      }
      if (character !== ')' || stack.length === 0) continue;

      const opening = stack.pop()!;
      const previousCharacter = normalized[opening - 1] ?? '';
      if (/[a-z0-9_]/i.test(previousCharacter)) continue;

      const inner = normalized.slice(opening + 1, index);
      if (hasTopLevelBooleanOperator(inner)) continue;

      normalized = `${normalized.slice(0, opening)}${inner}${normalized.slice(index + 1)}`;
      changed = true;
      break;
    }
  }
  while (normalized.startsWith('(') && normalized.endsWith(')')) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (normalized === 'now()' || normalized === 'current_timestamp()') {
    return 'current_timestamp';
  }
  return normalized;
}

function normalizeDefaultForType(value: string, type: string): string {
  if (
    /^(?:tinyint|smallint|mediumint|int|bigint|decimal|numeric|float|double|real|bit)\b/.test(
      type,
    ) &&
    /^[-+]?\d+(?:\.\d+)?$/.test(value.trim())
  ) {
    return String(Number(value));
  }
  return value;
}

function desiredDefault(column: any, type: string): string | null {
  if (column.default === undefined || column.default === null) return null;
  if (is(column.default, SQL)) {
    const rendered = dialect.sqlToQuery(column.default);
    if (rendered.params.length === 1 && rendered.sql.trim() === '?') {
      return normalizeDefaultForType(String(rendered.params[0]), type);
    }
    return normalizedExpression(rendered.sql);
  }
  return normalizeDefaultForType(String(column.default), type);
}

function actualDefault(value: unknown, type: string): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value);
  if (/^(?:current_timestamp(?:\(\))?|now\(\))$/i.test(text.trim())) {
    return 'current_timestamp';
  }
  return normalizeDefaultForType(text, type);
}

function indexColumnName(value: any): string {
  if (typeof value?.name === 'string') return value.name;
  if (typeof value?.config?.name === 'string') return value.config.name;
  if (is(value, SQL)) return normalizedExpression(dialect.sqlToQuery(value).sql);
  throw new Error('Canonical Drizzle index contains an unsupported column expression.');
}

function tableName(table: any): string {
  return getTableConfig(table).name;
}

function canonicalForeignKeyName(
  columns: readonly string[],
  referencedTable: string,
  referencedColumns: readonly string[],
): string {
  return `${columns.join('+')}->${referencedTable}.${referencedColumns.join('+')}`;
}

function withoutDigest(schema: Omit<NormalizedSchema, 'digest'>): Omit<NormalizedSchema, 'digest'> {
  return schema;
}

function schemaDigest(schema: Omit<NormalizedSchema, 'digest'>): string {
  return createHash('sha256')
    .update(JSON.stringify(withoutDigest(schema)))
    .digest('hex');
}

function finishSchema(tables: NormalizedTable[]): NormalizedSchema {
  const providerNormalizedTables = tables.map(table => {
    const foreignKeyColumns = new Set(table.foreignKeys.map(key => key.columns.join('\0')));
    return {
      ...table,
      indexes: table.indexes.filter(
        index => index.unique || !foreignKeyColumns.has(index.columns.join('\0')),
      ),
    };
  });
  const canonical = {
    formatVersion: 1 as const,
    dialect: 'mysql' as const,
    excludedControlTables: RUNNER_CONTROL_TABLES,
    tables: providerNormalizedTables.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    ),
  };
  return Object.freeze({ ...canonical, digest: schemaDigest(canonical) });
}

export function normalizedDesiredSchema(schemaExports: Record<string, unknown>): NormalizedSchema {
  const byName = new Map<string, MySqlTable>();
  for (const value of Object.values(schemaExports)) {
    if (!is(value, MySqlTable)) continue;
    const config = getTableConfig(value);
    if (RUNNER_CONTROL_TABLES.includes(config.name as any)) {
      throw new Error(
        `Application Drizzle model may not define runner control table ${config.name}.`,
      );
    }
    byName.set(config.name, value);
  }

  const tables = [...byName.values()].map(table => {
    const config = getTableConfig(table);
    const columns: NormalizedColumn[] = config.columns.map((column: any, ordinal) => {
      const type = normalizedType(column.getSQLType());
      return {
        name: column.name,
        ordinal: ordinal + 1,
        type,
        nullable: !column.notNull,
        default: desiredDefault(column, type),
        autoIncrement: Boolean(column.autoIncrement),
        onUpdateCurrentTimestamp: Boolean(column.hasOnUpdateNow || column.onUpdateFn),
      };
    });

    const indexes: NormalizedIndex[] = config.indexes.map((index: any) => ({
      name: index.config.name,
      unique: Boolean(index.config.unique),
      columns: index.config.columns.map(indexColumnName),
    }));
    const primaryColumns = [
      ...config.columns.filter((column: any) => column.primary).map((column: any) => column.name),
      ...config.primaryKeys.flatMap((key: any) => key.columns.map((column: any) => column.name)),
    ];
    if (primaryColumns.length > 0) {
      indexes.push({ name: 'PRIMARY', unique: true, columns: [...new Set(primaryColumns)] });
    }
    for (const constraint of config.uniqueConstraints as any[]) {
      indexes.push({
        name: constraint.name,
        unique: true,
        columns: constraint.columns.map((column: any) => column.name),
      });
    }
    for (const column of config.columns as any[]) {
      if (column.isUnique) {
        indexes.push({
          name: column.uniqueName,
          unique: true,
          columns: [column.name],
        });
      }
    }

    const foreignKeys: NormalizedForeignKey[] = (config.foreignKeys as any[]).map(key => {
      const reference = key.reference();
      const columns = reference.columns.map((column: any) => column.name);
      const referencedTable = tableName(reference.foreignTable);
      const referencedColumns = reference.foreignColumns.map((column: any) => column.name);
      return {
        name: canonicalForeignKeyName(columns, referencedTable, referencedColumns),
        columns,
        referencedTable,
        referencedColumns,
        onDelete: normalizedAction(key.onDelete),
        onUpdate: normalizedAction(key.onUpdate),
      };
    });
    const checks: NormalizedCheck[] = (config.checks as any[]).map(check => ({
      name: check.name,
      expression: normalizedExpression(dialect.sqlToQuery(check.value).sql),
    }));

    return {
      name: config.name,
      columns,
      indexes: indexes.sort((left, right) => left.name.localeCompare(right.name)),
      foreignKeys: foreignKeys.sort((left, right) => left.name.localeCompare(right.name)),
      checks: checks.sort((left, right) => left.name.localeCompare(right.name)),
    };
  });
  return finishSchema(tables);
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

async function queryRows(
  connection: AuthoritySqlConnection,
  statement: string,
): Promise<Array<Record<string, unknown>>> {
  return rowsFromResult(await connection.execute(statement));
}

export async function normalizedPhysicalSchema(
  connection: AuthoritySqlConnection,
): Promise<NormalizedSchema> {
  const excluded = new Set<string>(RUNNER_CONTROL_TABLES);
  const tableRows = await queryRows(
    connection,
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  );
  const names = tableRows
    .map(row => String(rowValue(row, 'table_name') ?? ''))
    .filter(name => name && !excluded.has(name));
  const tables = new Map<string, NormalizedTable>(
    names.map(name => [name, { name, columns: [], indexes: [], foreignKeys: [], checks: [] }]),
  );

  const columnRows = await queryRows(
    connection,
    'SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, ORDINAL_POSITION AS ordinal_position, COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default, EXTRA AS extra FROM information_schema.columns WHERE table_schema = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION',
  );
  for (const row of columnRows) {
    const table = tables.get(String(rowValue(row, 'table_name') ?? ''));
    if (!table) continue;
    const extra = String(rowValue(row, 'extra') ?? '').toLowerCase();
    const type = normalizedType(String(rowValue(row, 'column_type') ?? ''));
    table.columns.push({
      name: String(rowValue(row, 'column_name') ?? ''),
      ordinal: Number(rowValue(row, 'ordinal_position') ?? 0),
      type,
      nullable: String(rowValue(row, 'is_nullable') ?? '').toUpperCase() === 'YES',
      default: actualDefault(rowValue(row, 'column_default'), type),
      autoIncrement: extra.includes('auto_increment'),
      onUpdateCurrentTimestamp: extra.includes('on update current_timestamp'),
    });
  }

  const indexRows = await queryRows(
    connection,
    'SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, NON_UNIQUE AS non_unique, SEQ_IN_INDEX AS sequence_in_index, COLUMN_NAME AS column_name FROM information_schema.statistics WHERE table_schema = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX',
  );
  const indexGroups = new Map<string, NormalizedIndex & { tableName: string }>();
  for (const row of indexRows) {
    const tableNameValue = String(rowValue(row, 'table_name') ?? '');
    if (!tables.has(tableNameValue)) continue;
    const indexName = String(rowValue(row, 'index_name') ?? '');
    const key = `${tableNameValue}\0${indexName}`;
    const group = indexGroups.get(key) ?? {
      tableName: tableNameValue,
      name: indexName,
      unique: Number(rowValue(row, 'non_unique') ?? 1) === 0,
      columns: [],
    };
    group.columns.push(String(rowValue(row, 'column_name') ?? ''));
    indexGroups.set(key, group);
  }
  for (const index of indexGroups.values()) {
    const { tableName: tableNameValue, ...normalized } = index;
    tables.get(tableNameValue)!.indexes.push(normalized);
  }

  const foreignKeyRows = await queryRows(
    connection,
    'SELECT kcu.TABLE_NAME AS table_name, kcu.CONSTRAINT_NAME AS constraint_name, kcu.COLUMN_NAME AS column_name, kcu.ORDINAL_POSITION AS ordinal_position, kcu.REFERENCED_TABLE_NAME AS referenced_table_name, kcu.REFERENCED_COLUMN_NAME AS referenced_column_name, rc.DELETE_RULE AS delete_rule, rc.UPDATE_RULE AS update_rule FROM information_schema.KEY_COLUMN_USAGE kcu INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA AND rc.TABLE_NAME = kcu.TABLE_NAME AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME WHERE kcu.CONSTRAINT_SCHEMA = DATABASE() AND kcu.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION',
  );
  const foreignKeyGroups = new Map<string, NormalizedForeignKey & { tableName: string }>();
  for (const row of foreignKeyRows) {
    const tableNameValue = String(rowValue(row, 'table_name') ?? '');
    if (!tables.has(tableNameValue)) continue;
    const name = String(rowValue(row, 'constraint_name') ?? '');
    const key = `${tableNameValue}\0${name}`;
    const group = foreignKeyGroups.get(key) ?? {
      tableName: tableNameValue,
      name,
      columns: [],
      referencedTable: String(rowValue(row, 'referenced_table_name') ?? ''),
      referencedColumns: [],
      onDelete: normalizedAction(rowValue(row, 'delete_rule')),
      onUpdate: normalizedAction(rowValue(row, 'update_rule')),
    };
    group.columns.push(String(rowValue(row, 'column_name') ?? ''));
    group.referencedColumns.push(String(rowValue(row, 'referenced_column_name') ?? ''));
    foreignKeyGroups.set(key, group);
  }
  for (const foreignKey of foreignKeyGroups.values()) {
    const { tableName: tableNameValue, ...normalized } = foreignKey;
    normalized.name = canonicalForeignKeyName(
      normalized.columns,
      normalized.referencedTable,
      normalized.referencedColumns,
    );
    tables.get(tableNameValue)!.foreignKeys.push(normalized);
  }

  try {
    const checkRows = await queryRows(
      connection,
      "SELECT tc.TABLE_NAME AS table_name, tc.CONSTRAINT_NAME AS constraint_name, cc.CHECK_CLAUSE AS check_clause FROM information_schema.TABLE_CONSTRAINTS tc INNER JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA = DATABASE() AND tc.CONSTRAINT_TYPE = 'CHECK' ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME",
    );
    for (const row of checkRows) {
      const table = tables.get(String(rowValue(row, 'table_name') ?? ''));
      if (!table) continue;
      table.checks.push({
        name: String(rowValue(row, 'constraint_name') ?? ''),
        expression: normalizedExpression(String(rowValue(row, 'check_clause') ?? '')),
      });
    }
  } catch {
    // MySQL/TiDB variants without CHECK_CONSTRAINTS are supported when the desired model has no checks.
  }

  for (const table of tables.values()) {
    table.indexes.sort((left, right) => left.name.localeCompare(right.name));
    table.foreignKeys.sort((left, right) => left.name.localeCompare(right.name));
    table.checks.sort((left, right) => left.name.localeCompare(right.name));
  }
  return finishSchema([...tables.values()]);
}

function compareNamed<T extends { name: string }>(input: {
  category: SchemaDifference['category'];
  table: string;
  expected: T[];
  actual: T[];
  differences: SchemaDifference[];
  ignoreActualExtra?: (value: T) => boolean;
}): void {
  const expected = new Map(input.expected.map(value => [value.name, value]));
  const actual = new Map(input.actual.map(value => [value.name, value]));
  for (const [name, expectedValue] of expected) {
    const actualValue = actual.get(name);
    if (!actualValue || JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
      input.differences.push({
        category: input.category,
        path: `${input.table}.${name}`,
        expected: expectedValue,
        actual: actualValue ?? null,
      });
    }
  }
  for (const [name, actualValue] of actual) {
    if (!expected.has(name) && !input.ignoreActualExtra?.(actualValue)) {
      input.differences.push({
        category: input.category,
        path: `${input.table}.${name}`,
        expected: null,
        actual: actualValue,
      });
    }
  }
}

function foreignKeySemanticIdentity(value: NormalizedForeignKey): string {
  return JSON.stringify({
    columns: value.columns,
    referencedTable: value.referencedTable,
    referencedColumns: value.referencedColumns,
    onDelete: value.onDelete,
    onUpdate: value.onUpdate,
  });
}

function compareForeignKeys(input: {
  table: string;
  expected: NormalizedForeignKey[];
  actual: NormalizedForeignKey[];
  differences: SchemaDifference[];
}): void {
  const remaining = [...input.actual];
  for (const expected of input.expected) {
    const exactIndex = remaining.findIndex(
      actual => foreignKeySemanticIdentity(actual) === foreignKeySemanticIdentity(expected),
    );
    if (exactIndex >= 0) {
      remaining.splice(exactIndex, 1);
      continue;
    }
    const sameColumnsIndex = remaining.findIndex(
      actual => JSON.stringify(actual.columns) === JSON.stringify(expected.columns),
    );
    const actual = sameColumnsIndex >= 0 ? remaining.splice(sameColumnsIndex, 1)[0] : null;
    input.differences.push({
      category: 'foreign-key',
      path: `${input.table}.${expected.columns.join('+')}`,
      expected,
      actual,
    });
  }
  for (const actual of remaining) {
    input.differences.push({
      category: 'foreign-key',
      path: `${input.table}.${actual.columns.join('+')}`,
      expected: null,
      actual,
    });
  }
}

export function compareNormalizedSchemas(
  desired: NormalizedSchema,
  actual: NormalizedSchema,
): SchemaCongruencyReport {
  const differences: SchemaDifference[] = [];
  const desiredTables = new Map(desired.tables.map(table => [table.name, table]));
  const actualTables = new Map(actual.tables.map(table => [table.name, table]));
  for (const [name, desiredTable] of desiredTables) {
    const actualTable = actualTables.get(name);
    if (!actualTable) {
      differences.push({ category: 'table', path: name, expected: desiredTable, actual: null });
      continue;
    }
    const desiredColumns = new Map(desiredTable.columns.map(column => [column.name, column]));
    const actualColumns = new Map(actualTable.columns.map(column => [column.name, column]));
    for (const [columnName, desiredColumn] of desiredColumns) {
      const actualColumn = actualColumns.get(columnName);
      if (!actualColumn) {
        differences.push({
          category: 'column',
          path: `${name}.${columnName}`,
          expected: desiredColumn,
          actual: null,
        });
        continue;
      }
      const fields: Array<[keyof NormalizedColumn, SchemaDifference['category']]> = [
        ['ordinal', 'column'],
        ['type', 'type'],
        ['nullable', 'nullability'],
        ['default', 'default'],
        ['autoIncrement', 'column-behaviour'],
        ['onUpdateCurrentTimestamp', 'column-behaviour'],
      ];
      for (const [field, category] of fields) {
        if (desiredColumn[field] !== actualColumn[field]) {
          differences.push({
            category,
            path: `${name}.${columnName}.${field}`,
            expected: desiredColumn[field],
            actual: actualColumn[field],
          });
        }
      }
    }
    for (const [columnName, actualColumn] of actualColumns) {
      if (!desiredColumns.has(columnName)) {
        differences.push({
          category: 'column',
          path: `${name}.${columnName}`,
          expected: null,
          actual: actualColumn,
        });
      }
    }

    const foreignKeySupportingColumns = actualTable.foreignKeys.map(key => key.columns.join('\0'));
    compareNamed({
      category: 'index',
      table: name,
      expected: desiredTable.indexes,
      actual: actualTable.indexes,
      differences,
      ignoreActualExtra: index =>
        !index.unique && foreignKeySupportingColumns.includes(index.columns.join('\0')),
    });
    compareForeignKeys({
      table: name,
      expected: desiredTable.foreignKeys,
      actual: actualTable.foreignKeys,
      differences,
    });
    compareNamed({
      category: 'check',
      table: name,
      expected: desiredTable.checks,
      actual: actualTable.checks,
      differences,
    });
  }
  for (const [name, actualTable] of actualTables) {
    if (!desiredTables.has(name)) {
      differences.push({ category: 'table', path: name, expected: null, actual: actualTable });
    }
  }
  differences.sort((left, right) =>
    `${left.path}:${left.category}`.localeCompare(`${right.path}:${right.category}`),
  );
  return {
    congruent: differences.length === 0,
    desiredDigest: desired.digest,
    actualDigest: actual.digest,
    differences,
  };
}

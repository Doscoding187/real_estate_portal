#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

function sameValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const errors = [];
  const root = process.cwd();
  const schemaDir = join(root, 'drizzle', 'schema');
  const migrationsDir = join(root, 'server', 'migrations');
  const inventoryPath = join(
    schemaDir,
    'canonical-model-inventory.json',
  );
  const baselineName = '0000_canonical_launch_baseline.sql';
  const baselinePath = join(migrationsDir, baselineName);

  const inventory = JSON.parse(
    await readFile(inventoryPath, 'utf8'),
  );

  const schemaFiles = (await readdir(schemaDir))
    .filter(name => name.endsWith('.ts'))
    .sort();

  const schemaSources = await Promise.all(
    schemaFiles.map(async file => ({
      file,
      source: await readFile(join(schemaDir, file), 'utf8'),
    })),
  );

  const combinedSchema = schemaSources
    .map(entry => entry.source)
    .join('\n');

  const modelTables = Array.from(
    combinedSchema.matchAll(
      /mysqlTable\(\s*['"]([^'"]+)['"]/g,
    ),
    match => String(match[1]),
  ).sort();

  const inventoryTables = Array.isArray(inventory.tables)
    ? [...inventory.tables]
    : [];

  if (
    inventory.authority !==
    'DBA-S2A canonical launch model inventory'
  ) {
    errors.push('Unexpected canonical inventory authority.');
  }

  if (inventory.tableCount !== inventoryTables.length) {
    errors.push(
      `Inventory tableCount ${inventory.tableCount} does not match ` +
      `${inventoryTables.length} table name(s).`,
    );
  }

  if (new Set(inventoryTables).size !== inventoryTables.length) {
    errors.push('Canonical inventory contains duplicate table names.');
  }

  if (
    !sameValues(
      [...inventoryTables].sort(),
      inventoryTables,
    )
  ) {
    errors.push('Canonical inventory table names are not sorted.');
  }

  if (!sameValues(modelTables, inventoryTables)) {
    errors.push(
      'Modular Drizzle schema tables do not match the canonical inventory.',
    );
  }

  for (const { file, source } of schemaSources) {
    const missingAutoPk =
      source.match(
        /id:\s*int\([^\)]*\)\.autoincrement\(\)\.notNull\(\)/g,
      ) ?? [];

    const missingVarcharPk =
      source.match(
        /id:\s*varchar\([^\)]*\)\.notNull\(\)(?!\.primaryKey\()/g,
      ) ?? [];

    const count =
      missingAutoPk.length + missingVarcharPk.length;

    if (count > 0) {
      errors.push(
        `${file}: ${count} id column(s) missing primaryKey()`,
      );
    }
  }

  const activeSqlFiles = (await readdir(migrationsDir))
    .filter(name => name.endsWith('.sql'))
    .sort();

  if (
    activeSqlFiles.length === 0 ||
    activeSqlFiles[0] !== baselineName
  ) {
    errors.push(
      `${baselineName} must be the first active SQL migration.`,
    );
  }

  const baselineSql = await readFile(baselinePath, 'utf8');

  const mysqlIdentifierLimit = 64;
  const mysqlNamedIdentifierPatterns = [
    [
      'constraint',
      /\bCONSTRAINT\s+`([^`]+)`/gi,
    ],
    [
      'primary key',
      /\bPRIMARY\s+KEY\s+`([^`]+)`/gi,
    ],
    [
      'unique key',
      /\bUNIQUE(?:\s+KEY|\s+INDEX)?\s+`([^`]+)`/gi,
    ],
    [
      'index',
      /(?<!UNIQUE\s)\b(?:KEY|INDEX)\s+`([^`]+)`/gi,
    ],
  ];

  for (const [kind, pattern] of mysqlNamedIdentifierPatterns) {
    for (const match of baselineSql.matchAll(pattern)) {
      const identifier = String(match[1]);

      if (identifier.length > mysqlIdentifierLimit) {
        errors.push(
          `Canonical baseline ${kind} identifier exceeds ` +
          `MySQL's ${mysqlIdentifierLimit}-character limit: ` +
          `${identifier} (${identifier.length}).`,
        );
      }
    }
  }

  const mysqlTableColumnDefinitions = new Map();

  for (
    const tableMatch of baselineSql.matchAll(
      /CREATE\s+TABLE\s+`([^`]+)`\s*\((.*?)\n\);/gis,
    )
  ) {
    const tableName = String(tableMatch[1]);
    const tableBody = String(tableMatch[2]);

    for (const rawLine of tableBody.split('\n')) {
      const columnMatch = rawLine.match(
        /^\s*`([^`]+)`\s+(.+?)(?:,\s*)?$/,
      );

      if (!columnMatch) {
        continue;
      }

      const columnName = String(columnMatch[1]);
      const definition = String(columnMatch[2]).trim();

      mysqlTableColumnDefinitions.set(
        `${tableName}.${columnName}`,
        definition,
      );
    }
  }

  const mysqlSetNullForeignKeyPattern =
    /ALTER\s+TABLE\s+`([^`]+)`\s+ADD\s+CONSTRAINT\s+`([^`]+)`\s+FOREIGN\s+KEY\s+\(`([^`]+)`\)\s+REFERENCES\s+`([^`]+)`\(`([^`]+)`\)\s+ON\s+DELETE\s+([a-z ]+?)\s+ON\s+UPDATE\s+([a-z ]+?)\s*;/gi;

  for (
    const foreignKeyMatch of baselineSql.matchAll(
      mysqlSetNullForeignKeyPattern,
    )
  ) {
    const tableName = String(foreignKeyMatch[1]);
    const constraintName = String(foreignKeyMatch[2]);
    const columnName = String(foreignKeyMatch[3]);
    const onDelete = String(foreignKeyMatch[6])
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    const onUpdate = String(foreignKeyMatch[7])
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();

    if (onDelete !== 'SET NULL' && onUpdate !== 'SET NULL') {
      continue;
    }

    const columnKey = `${tableName}.${columnName}`;
    const columnDefinition =
      mysqlTableColumnDefinitions.get(columnKey);

    if (!columnDefinition) {
      errors.push(
        `Canonical baseline foreign key ${constraintName} ` +
        `references unresolved local column ${columnKey}.`,
      );
      continue;
    }

    if (/\bNOT\s+NULL\b/i.test(columnDefinition)) {
      errors.push(
        `Canonical baseline foreign key ${constraintName} uses ` +
        `SET NULL but ${columnKey} is declared NOT NULL.`,
      );
    }
  }

  {
    const baselineColumnReferenceGuard = true;
    const referenceGuardTables = new Map();

    const createTablePattern =
      /CREATE\s+TABLE\s+`([^`]+)`\s*\((.*?)\n\);/gis;

    for (
      const tableMatch of baselineSql.matchAll(createTablePattern)
    ) {
      const tableName = String(tableMatch[1]);
      const tableBody = String(tableMatch[2]);
      const columns = new Set();

      for (const rawLine of tableBody.split('\n')) {
        const columnMatch = rawLine.match(
          /^\s*`([^`]+)`\s+(.+?)(?:,\s*)?$/,
        );

        if (!columnMatch) {
          continue;
        }

        columns.add(String(columnMatch[1]));
      }

      referenceGuardTables.set(tableName, {
        body: tableBody,
        columns,
      });
    }

    const extractQuotedIdentifiers = value =>
      Array.from(
        String(value).matchAll(/`([^`]+)`/g),
        match => String(match[1]),
      );

    const reportMissingColumn = ({
      authorityType,
      authorityName,
      tableName,
      columnName,
    }) => {
      errors.push(
        `Canonical baseline ${authorityType} ` +
        `${authorityName} references absent column ` +
        `${tableName}.${columnName}.`,
      );
    };

    const createIndexPattern =
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+`([^`]+)`\s+ON\s+`([^`]+)`\s*\((.*?)\)\s*;/gis;

    for (
      const indexMatch of baselineSql.matchAll(
        createIndexPattern,
      )
    ) {
      const indexName = String(indexMatch[1]);
      const tableName = String(indexMatch[2]);
      const indexedColumns = extractQuotedIdentifiers(
        indexMatch[3],
      );
      const tableAuthority =
        referenceGuardTables.get(tableName);

      if (!tableAuthority) {
        errors.push(
          `Canonical baseline index ${indexName} ` +
          `references absent table ${tableName}.`,
        );
        continue;
      }

      for (const columnName of indexedColumns) {
        if (!tableAuthority.columns.has(columnName)) {
          reportMissingColumn({
            authorityType: 'index',
            authorityName: indexName,
            tableName,
            columnName,
          });
        }
      }
    }

    const inlineKeyPattern =
      /CONSTRAINT\s+`([^`]+)`\s+(PRIMARY\s+KEY|UNIQUE)\s*\((.*?)\)/gis;

    for (
      const [tableName, tableAuthority] of
        referenceGuardTables.entries()
    ) {
      for (
        const keyMatch of tableAuthority.body.matchAll(
          inlineKeyPattern,
        )
      ) {
        const keyName = String(keyMatch[1]);
        const keyType = String(keyMatch[2])
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();

        for (
          const columnName of extractQuotedIdentifiers(
            keyMatch[3],
          )
        ) {
          if (!tableAuthority.columns.has(columnName)) {
            reportMissingColumn({
              authorityType: keyType,
              authorityName: keyName,
              tableName,
              columnName,
            });
          }
        }
      }
    }

    const foreignKeyPattern =
      /ALTER\s+TABLE\s+`([^`]+)`\s+ADD\s+CONSTRAINT\s+`([^`]+)`\s+FOREIGN\s+KEY\s+\((.*?)\)\s+REFERENCES\s+`([^`]+)`\s*\((.*?)\)/gis;

    for (
      const foreignKeyMatch of baselineSql.matchAll(
        foreignKeyPattern,
      )
    ) {
      const localTableName = String(foreignKeyMatch[1]);
      const constraintName = String(foreignKeyMatch[2]);
      const localColumns = extractQuotedIdentifiers(
        foreignKeyMatch[3],
      );
      const referencedTableName = String(
        foreignKeyMatch[4],
      );
      const referencedColumns = extractQuotedIdentifiers(
        foreignKeyMatch[5],
      );

      const localTableAuthority =
        referenceGuardTables.get(localTableName);
      const referencedTableAuthority =
        referenceGuardTables.get(referencedTableName);

      if (!localTableAuthority) {
        errors.push(
          `Canonical baseline foreign key ` +
          `${constraintName} references absent local table ` +
          `${localTableName}.`,
        );
      }

      if (!referencedTableAuthority) {
        errors.push(
          `Canonical baseline foreign key ` +
          `${constraintName} references absent target table ` +
          `${referencedTableName}.`,
        );
      }

      if (localColumns.length !== referencedColumns.length) {
        errors.push(
          `Canonical baseline foreign key ` +
          `${constraintName} has mismatched local and ` +
          `referenced column counts.`,
        );
      }

      if (localTableAuthority) {
        for (const columnName of localColumns) {
          if (!localTableAuthority.columns.has(columnName)) {
            reportMissingColumn({
              authorityType: 'foreign key',
              authorityName: constraintName,
              tableName: localTableName,
              columnName,
            });
          }
        }
      }

      if (referencedTableAuthority) {
        for (const columnName of referencedColumns) {
          if (
            !referencedTableAuthority.columns.has(columnName)
          ) {
            reportMissingColumn({
              authorityType: 'foreign key target',
              authorityName: constraintName,
              tableName: referencedTableName,
              columnName,
            });
          }
        }
      }
    }

    void baselineColumnReferenceGuard;
  }

  const baselineTables = Array.from(
    baselineSql.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`/gi,
    ),
    match => String(match[1]),
  ).sort();

  if (new Set(baselineTables).size !== baselineTables.length) {
    errors.push(
      'Canonical baseline contains duplicate CREATE TABLE names.',
    );
  }

  if (!sameValues(baselineTables, inventoryTables)) {
    errors.push(
      'Canonical baseline tables do not match the canonical inventory.',
    );
  }

  if (/\bCREATE\s+VIEW\b/i.test(baselineSql)) {
    errors.push('Canonical baseline must not create views.');
  }

  if (errors.length > 0) {
    console.error('Schema sanity check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Schema sanity check passed: ` +
    `${inventoryTables.length} canonical tables; ` +
    `${activeSqlFiles.length} active SQL migration file(s).`,
  );
}

main().catch(error => {
  console.error(
    `Schema sanity check failed with exception: ${error.message}`,
  );
  process.exit(1);
});

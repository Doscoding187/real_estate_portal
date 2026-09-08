import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

export type MigrationKind = 'establishment' | 'ddl' | 'transactional-data' | 'exceptional';

export type MigrationManifestEntry = {
  sequence: number;
  filename: string;
  checksum: string;
  parent: string | null;
  parentChecksum: string | null;
  kind: MigrationKind;
  statementPolicy: 'immutable-baseline' | 'single-ddl' | 'transactional-dml' | 'approved-exception';
  requiredReferenceDataVersion: string | null;
  approvalReference?: string;
};

export type MigrationManifestDocument = {
  manifestVersion: number;
  dialect: 'mysql';
  historyTable: string;
  attemptTable: string;
  lockName: string;
  expectedHead: string;
  migrations: MigrationManifestEntry[];
};

export type ValidatedMigrationManifest = {
  document: MigrationManifestDocument;
  manifestPath: string;
  migrationsDirectory: string;
  manifestDigest: string;
  orderedMigrations: ReadonlyArray<
    MigrationManifestEntry & { absolutePath: string; statementCount: number }
  >;
  expectedHead: MigrationManifestEntry;
};

export class MigrationManifestError extends Error {
  readonly issues: readonly string[];

  constructor(issues: string[]) {
    super(`Migration manifest validation failed:\n- ${issues.join('\n- ')}`);
    this.name = 'MigrationManifestError';
    this.issues = Object.freeze([...issues]);
  }
}

const MIGRATION_FILENAME = /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;
const SHA256 = /^[a-f0-9]{64}$/;
const KINDS = new Set<MigrationKind>(['establishment', 'ddl', 'transactional-data', 'exceptional']);
const STATEMENT_POLICIES = new Set([
  'immutable-baseline',
  'single-ddl',
  'transactional-dml',
  'approved-exception',
]);

export function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

function pushFragment(fragments: string[], value: string): void {
  const trimmed = value.trim();
  if (trimmed) fragments.push(trimmed);
}

/** Split MySQL statements without treating quoted semicolons or comments as boundaries. */
export function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: "'" | '"' | '`' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        current += '\n';
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (!quote && character === '#') {
      lineComment = true;
      continue;
    }
    if (!quote && character === '-' && next === '-' && /\s/.test(sql[index + 2] ?? ' ')) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      current += character;
      if (character === '\\') {
        if (next) {
          current += next;
          index += 1;
        }
        continue;
      }
      if (character === quote) {
        if (next === quote && quote !== '`') {
          current += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      current += character;
      continue;
    }
    if (character === ';') {
      pushFragment(statements, current);
      current = '';
      continue;
    }
    current += character;
  }

  if (quote || blockComment) {
    throw new Error('SQL migration contains an unterminated quote or block comment.');
  }
  pushFragment(statements, current.replace(/^\uFEFF/, ''));
  return statements;
}

function sqlCodeOnly(sql: string): string {
  let output = '';
  let quote: "'" | '"' | '`' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        output += '\n';
      } else {
        output += ' ';
      }
      continue;
    }
    if (blockComment) {
      output += character === '\n' ? '\n' : ' ';
      if (character === '*' && next === '/') {
        output += ' ';
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && character === '/' && next === '*') {
      output += '  ';
      blockComment = true;
      index += 1;
      continue;
    }
    if (!quote && character === '#') {
      output += ' ';
      lineComment = true;
      continue;
    }
    if (!quote && character === '-' && next === '-' && /\s/.test(sql[index + 2] ?? ' ')) {
      output += '  ';
      lineComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      output += character === '\n' ? '\n' : ' ';
      if (character === '\\' && next) {
        output += next === '\n' ? '\n' : ' ';
        index += 1;
      } else if (character === quote) {
        if (next === quote && quote !== '`') {
          output += ' ';
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += ' ';
      continue;
    }
    output += character;
  }
  return output;
}

/**
 * Property Listify deploys the canonical schema to TiDB. Reject MySQL stored
 * program primitives that TiDB cannot execute before they can enter the
 * runnable migration lineage.
 */
export function assertTidbCompatibleMigrationSql(sql: string): void {
  const controlSurface = sqlCodeOnly(sql);
  if (/^\s*delimiter\b/im.test(controlSurface)) {
    throw new Error('TiDB compatibility guard: DELIMITER directives are unsupported.');
  }
  const storedProgram = controlSurface.match(
    /\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+(?:definer\s*=\s*[^\s]+\s+)?(trigger|procedure|function|event)\b/i,
  );
  if (storedProgram) {
    throw new Error(
      `TiDB compatibility guard: ${storedProgram[1].toLowerCase()} definitions are unsupported.`,
    );
  }

  for (const statement of parseSqlStatements(sql)) {
    const statementSurface = withoutStringLiterals(statement);
    const altersTable = /^\s*alter\s+table\b/i.test(statementSurface);
    const addsColumn = /\badd\s+column\b/i.test(statementSurface);
    const addsDependentObject =
      /\badd\s+(?:(?:unique|primary)\s+)?(?:key|index)\b|\badd\s+constraint\b/i.test(
        statementSurface,
      );
    if (altersTable && addsColumn && addsDependentObject) {
      throw new Error(
        'TiDB compatibility guard: an ALTER TABLE statement may not introduce columns and add dependent indexes, keys, or constraints in the same DDL job; sequence them as separate statements.',
      );
    }
  }
}

function withoutStringLiterals(statement: string): string {
  let output = '';
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < statement.length; index += 1) {
    const character = statement[index];
    const next = statement[index + 1];
    if (quote) {
      output += ' ';
      if (character === '\\' && next) {
        output += ' ';
        index += 1;
      } else if (character === quote) {
        if (next === quote) {
          output += ' ';
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      output += ' ';
      continue;
    }
    output += character;
  }
  return output;
}

function validateStatementStyle(
  entry: MigrationManifestEntry,
  sql: string,
  issues: string[],
): number {
  try {
    assertTidbCompatibleMigrationSql(sql);
  } catch (error) {
    issues.push(
      `${entry.filename}: ${error instanceof Error ? error.message : 'TiDB-incompatible SQL'}`,
    );
    return 0;
  }
  let statements: string[];
  try {
    statements = parseSqlStatements(sql);
  } catch (error) {
    issues.push(`${entry.filename}: ${error instanceof Error ? error.message : 'invalid SQL'}`);
    return 0;
  }
  if (statements.length === 0) {
    issues.push(`${entry.filename}: migrations may not be empty.`);
    return 0;
  }
  const executable =
    /^(alter|create|drop|update|insert|delete|replace|truncate|rename|set|prepare|execute|deallocate)\b/i;
  const databaseLifecycle = /^(?:create|alter|drop)\s+(?:database|schema)\b|^use\b/i;
  const identifier = '(?:`[a-zA-Z0-9_$]+`|[a-zA-Z_][a-zA-Z0-9_$]*)';
  const crossSchemaObject = new RegExp(
    `\\b(?:alter\\s+table|create\\s+table|drop\\s+table|rename\\s+table|references|insert\\s+into|update|delete\\s+from|join|from|on)\\s+${identifier}\\s*\\.\\s*${identifier}`,
    'i',
  );
  for (const statement of statements) {
    const controlSurface = withoutStringLiterals(statement);
    if (!executable.test(statement)) {
      issues.push(`${entry.filename}: unsupported executable SQL statement.`);
    }
    if (databaseLifecycle.test(controlSurface)) {
      issues.push(`${entry.filename}: migration SQL may not administer databases or schemas.`);
    }
    if (crossSchemaObject.test(controlSurface)) {
      issues.push(`${entry.filename}: migration SQL may not reference a cross-schema object.`);
    }
  }

  if (entry.kind === 'establishment') {
    if (
      entry.sequence !== 0 ||
      entry.filename !== '0000_canonical_launch_baseline.sql' ||
      entry.statementPolicy !== 'immutable-baseline'
    ) {
      issues.push(
        `${entry.filename}: establishment authority is reserved for the immutable baseline.`,
      );
    }
  } else if (entry.kind === 'ddl') {
    if (entry.statementPolicy !== 'single-ddl' || statements.length !== 1) {
      issues.push(`${entry.filename}: incremental DDL must contain exactly one statement.`);
    }
    const statement = statements[0] ?? '';
    if (!/^(?:alter\s+table|create\s+table|create\s+(?:unique\s+)?index)\b/i.test(statement)) {
      issues.push(`${entry.filename}: ordinary DDL must be a bounded table or index expansion.`);
    }
    if (/\b(?:drop|truncate|rename|modify|change)\b/i.test(withoutStringLiterals(statement))) {
      issues.push(
        `${entry.filename}: destructive or shape-changing DDL requires an approved exceptional migration.`,
      );
    }
  } else if (entry.kind === 'transactional-data') {
    if (entry.statementPolicy !== 'transactional-dml') {
      issues.push(
        `${entry.filename}: transactional data migration has the wrong statement policy.`,
      );
    }
    if (statements.some(statement => !/^(update|insert|delete|replace)\b/i.test(statement))) {
      issues.push(`${entry.filename}: transactional data migration may contain only DML.`);
    }
  } else if (
    entry.kind === 'exceptional' &&
    (entry.statementPolicy !== 'approved-exception' || !entry.approvalReference?.trim())
  ) {
    issues.push(`${entry.filename}: exceptional migration requires a recorded approval reference.`);
  }
  return statements.length;
}

function insideDirectory(path: string, directory: string): boolean {
  const relative = path.slice(directory.length);
  return (
    path === directory || (path.startsWith(directory + sep) && !relative.startsWith(`${sep}..`))
  );
}

export function loadAndValidateMigrationManifest(
  input: {
    migrationsDirectory?: string;
    manifestPath?: string;
  } = {},
): ValidatedMigrationManifest {
  const migrationsDirectory = realpathSync(
    resolve(input.migrationsDirectory ?? dirname(new URL(import.meta.url).pathname)),
  );
  const manifestPath = resolve(input.manifestPath ?? join(migrationsDirectory, 'manifest.json'));
  const manifestSource = readFileSync(manifestPath, 'utf8');
  const document = JSON.parse(manifestSource) as MigrationManifestDocument;
  const issues: string[] = [];

  if (
    document.manifestVersion !== 1 ||
    document.dialect !== 'mysql' ||
    document.historyTable !== 'sql_migration_history' ||
    document.attemptTable !== 'sql_migration_attempts' ||
    !/^[a-z0-9_]+$/.test(document.lockName ?? '') ||
    !Array.isArray(document.migrations)
  ) {
    issues.push('manifest header or control-table authority is malformed.');
  }

  const diskFiles = readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();
  const entries = Array.isArray(document.migrations) ? document.migrations : [];
  const names = entries.map(entry => entry.filename);
  const nameSet = new Set(names);
  const diskSet = new Set(diskFiles);

  for (const file of diskFiles.filter(file => !nameSet.has(file))) {
    issues.push(`active SQL file is absent from manifest: ${file}`);
  }
  for (const file of names.filter(file => !diskSet.has(file))) {
    issues.push(`manifest entry is absent from active SQL directory: ${file}`);
  }
  if (!unique(names)) issues.push('manifest contains duplicate filenames.');

  const sequences = new Map<number, string[]>();
  const byName = new Map<string, MigrationManifestEntry>();
  const statementCounts = new Map<string, number>();
  for (const entry of entries) {
    if (
      typeof entry.filename !== 'string' ||
      basename(entry.filename) !== entry.filename ||
      isAbsolute(entry.filename) ||
      entry.filename.includes('_archived') ||
      !MIGRATION_FILENAME.test(entry.filename)
    ) {
      issues.push(`malformed or archived migration identity: ${String(entry.filename)}`);
      continue;
    }
    const numericPrefix = Number(entry.filename.match(MIGRATION_FILENAME)?.[1]);
    if (!Number.isInteger(entry.sequence) || numericPrefix !== entry.sequence) {
      issues.push(`${entry.filename}: sequence does not match its four-digit identity.`);
    }
    if (!SHA256.test(entry.checksum ?? '')) {
      issues.push(`${entry.filename}: checksum is not a lowercase SHA-256 digest.`);
    }
    if (!KINDS.has(entry.kind) || !STATEMENT_POLICIES.has(entry.statementPolicy)) {
      issues.push(`${entry.filename}: migration kind or statement policy is invalid.`);
    }
    const group = sequences.get(entry.sequence) ?? [];
    group.push(entry.filename);
    sequences.set(entry.sequence, group);
    byName.set(entry.filename, entry);

    const absolutePath = resolve(migrationsDirectory, entry.filename);
    if (!insideDirectory(absolutePath, migrationsDirectory)) {
      issues.push(`${entry.filename}: migration path escapes the active directory.`);
      continue;
    }
    if (diskSet.has(entry.filename)) {
      const sql = readFileSync(absolutePath, 'utf8');
      const actualChecksum = migrationChecksum(sql);
      if (actualChecksum !== entry.checksum) {
        issues.push(
          `${entry.filename}: checksum drift (expected ${entry.checksum}, actual ${actualChecksum}).`,
        );
      }
      statementCounts.set(entry.filename, validateStatementStyle(entry, sql, issues));
    }
  }
  for (const [sequence, files] of sequences) {
    if (files.length > 1) {
      issues.push(
        `duplicate numeric migration identity ${String(sequence).padStart(4, '0')}: ${files.join(', ')}`,
      );
    }
  }

  const roots = entries.filter(entry => entry.parent === null);
  if (roots.length !== 1 || roots[0]?.sequence !== 0) {
    issues.push('manifest must contain exactly one sequence-0000 root.');
  }
  const referencedParents = new Set<string>();
  for (const entry of entries) {
    if (entry.parent === null) {
      if (entry.parentChecksum !== null) {
        issues.push(`${entry.filename}: root parent checksum must be null.`);
      }
      continue;
    }
    referencedParents.add(entry.parent);
    const parent = byName.get(entry.parent);
    if (!parent) {
      issues.push(`${entry.filename}: missing parent ${entry.parent}.`);
      continue;
    }
    if (entry.parentChecksum !== parent.checksum) {
      issues.push(`${entry.filename}: parent checksum does not match ${entry.parent}.`);
    }
    if (entry.sequence !== parent.sequence + 1) {
      issues.push(`${entry.filename}: sequence is not contiguous with its parent.`);
    }
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visit = (entry: MigrationManifestEntry): void => {
    const state = visitState.get(entry.filename);
    if (state === 'visiting') {
      issues.push(`migration ancestry cycle includes ${entry.filename}.`);
      return;
    }
    if (state === 'visited') return;
    visitState.set(entry.filename, 'visiting');
    const parent = entry.parent ? byName.get(entry.parent) : undefined;
    if (parent) visit(parent);
    visitState.set(entry.filename, 'visited');
  };
  entries.forEach(visit);

  const heads = entries.filter(entry => !referencedParents.has(entry.filename));
  if (heads.length !== 1) {
    issues.push(`manifest must have exactly one head; found ${heads.length}.`);
  } else if (document.expectedHead !== heads[0].filename) {
    issues.push(
      `expected head ${document.expectedHead} does not match ancestry head ${heads[0].filename}.`,
    );
  }

  const expectedSequences = entries.map((_, index) => index);
  const actualSequences = [...sequences.keys()].sort((left, right) => left - right);
  if (JSON.stringify(expectedSequences) !== JSON.stringify(actualSequences)) {
    issues.push('migration sequences must be unique and contiguous from 0000.');
  }

  if (issues.length > 0) throw new MigrationManifestError(issues);

  const ordered: MigrationManifestEntry[] = [];
  let cursor = heads[0];
  while (cursor) {
    ordered.unshift(cursor);
    cursor = cursor.parent ? byName.get(cursor.parent)! : undefined!;
  }
  const orderedMigrations = ordered.map(entry =>
    Object.freeze({
      ...entry,
      absolutePath: join(migrationsDirectory, entry.filename),
      statementCount: statementCounts.get(entry.filename) ?? 0,
    }),
  );
  const expectedHead = byName.get(document.expectedHead)!;

  return Object.freeze({
    document: Object.freeze(document),
    manifestPath,
    migrationsDirectory,
    manifestDigest: migrationChecksum(manifestSource),
    orderedMigrations: Object.freeze(orderedMigrations),
    expectedHead: Object.freeze(expectedHead),
  });
}

function unique<T>(values: T[]): boolean {
  return new Set(values).size === values.length;
}

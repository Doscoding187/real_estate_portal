import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadAndValidateMigrationManifest,
  type MigrationManifestDocument,
  type MigrationManifestEntry,
} from '../migrationManifest';

const roots: string[] = [];
const checksum = (value: string) => createHash('sha256').update(value).digest('hex');

function entry(
  sequence: number,
  name: string,
  sql: string,
  parent: MigrationManifestEntry | null,
): MigrationManifestEntry {
  return {
    sequence,
    filename: name,
    checksum: checksum(sql),
    parent: parent?.filename ?? null,
    parentChecksum: parent?.checksum ?? null,
    kind: sequence === 0 ? 'establishment' : 'ddl',
    statementPolicy: sequence === 0 ? 'immutable-baseline' : 'single-ddl',
    requiredReferenceDataVersion: null,
  };
}

function fixture(count = 3) {
  const root = mkdtempSync(join(tmpdir(), 'listify-manifest-'));
  roots.push(root);
  mkdirSync(join(root, '_archived'));
  const sql = [
    'CREATE TABLE widget (id int);',
    'ALTER TABLE widget ADD name varchar(20);',
    'ALTER TABLE widget ADD enabled int;',
  ];
  const names = [
    '0000_canonical_launch_baseline.sql',
    '0001_add_name.sql',
    '0002_add_enabled.sql',
  ];
  const entries: MigrationManifestEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    writeFileSync(join(root, names[index]), sql[index]);
    entries.push(entry(index, names[index], sql[index], entries[index - 1] ?? null));
  }
  const document: MigrationManifestDocument = {
    manifestVersion: 1,
    dialect: 'mysql',
    historyTable: 'sql_migration_history',
    attemptTable: 'sql_migration_attempts',
    lockName: 'fixture_migrations',
    expectedHead: entries.at(-1)!.filename,
    migrations: entries,
  };
  const manifestPath = join(root, 'manifest.json');
  const save = () => writeFileSync(manifestPath, `${JSON.stringify(document, null, 2)}\n`);
  save();
  return { root, manifestPath, document, entries, sql, names, save };
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('canonical migration manifest', () => {
  it('accepts the repository baseline-only manifest', () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: resolve('server/migrations'),
    });
    expect(manifest.orderedMigrations.map(item => item.filename)).toEqual([
      '0000_canonical_launch_baseline.sql',
    ]);
    expect(manifest.expectedHead.filename).toBe('0000_canonical_launch_baseline.sql');
  });

  it('accepts an isolated 0000 -> 0001 -> 0002 progression in ancestry order', () => {
    const value = fixture();
    expect(
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }).orderedMigrations.map(item => item.filename),
    ).toEqual(value.names);
  });

  it('rejects duplicate numbers and malformed identities without lexical tie-breaking', () => {
    const value = fixture(2);
    const duplicateSql = 'ALTER TABLE widget ADD other int;';
    writeFileSync(join(value.root, '0001_other.sql'), duplicateSql);
    value.document.migrations.push(
      entry(1, '0001_other.sql', duplicateSql, value.entries[0]),
    );
    value.document.expectedHead = '0001_other.sql';
    value.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }),
    ).toThrow('duplicate numeric migration identity');

    value.document.migrations[2].filename = '0001-Bad.sql';
    value.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: value.root,
        manifestPath: value.manifestPath,
      }),
    ).toThrow('malformed');
  });

  it('rejects missing files, extra active files, and checksum drift', () => {
    const missing = fixture(2);
    missing.document.migrations.push(
      entry(2, '0002_missing.sql', 'ALTER TABLE widget ADD missing int;', missing.entries[1]),
    );
    missing.document.expectedHead = '0002_missing.sql';
    missing.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: missing.root,
        manifestPath: missing.manifestPath,
      }),
    ).toThrow('absent from active SQL directory');

    const extra = fixture(1);
    writeFileSync(join(extra.root, '0001_extra.sql'), 'ALTER TABLE widget ADD extra int;');
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: extra.root,
        manifestPath: extra.manifestPath,
      }),
    ).toThrow('active SQL file is absent from manifest');

    const drift = fixture(1);
    writeFileSync(join(drift.root, drift.names[0]), 'CREATE TABLE changed (id int);');
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: drift.root,
        manifestPath: drift.manifestPath,
      }),
    ).toThrow('checksum drift');
  });

  it('rejects missing parents, cycles, and multiple heads', () => {
    const missingParent = fixture();
    missingParent.document.migrations[2].parent = '0001_absent.sql';
    missingParent.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: missingParent.root,
        manifestPath: missingParent.manifestPath,
      }),
    ).toThrow('missing parent');

    const cycle = fixture();
    cycle.document.migrations[0].parent = cycle.entries[2].filename;
    cycle.document.migrations[0].parentChecksum = cycle.entries[2].checksum;
    cycle.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: cycle.root,
        manifestPath: cycle.manifestPath,
      }),
    ).toThrow('cycle');

    const heads = fixture();
    heads.document.migrations[2].parent = heads.entries[0].filename;
    heads.document.migrations[2].parentChecksum = heads.entries[0].checksum;
    heads.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: heads.root,
        manifestPath: heads.manifestPath,
      }),
    ).toThrow('exactly one head');
  });

  it('rejects archived execution and unsafe multi-DDL incrementals', () => {
    const archived = fixture(1);
    const archivedSql = 'ALTER TABLE widget ADD retired int;';
    writeFileSync(join(archived.root, '_archived', '0001_retired.sql'), archivedSql);
    archived.document.migrations.push({
      ...entry(1, '_archived/0001_retired.sql', archivedSql, archived.entries[0]),
      filename: '_archived/0001_retired.sql',
    });
    archived.document.expectedHead = '_archived/0001_retired.sql';
    archived.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: archived.root,
        manifestPath: archived.manifestPath,
      }),
    ).toThrow('archived');

    const multi = fixture(2);
    const multiSql = 'ALTER TABLE widget ADD first int; ALTER TABLE widget ADD second int;';
    writeFileSync(join(multi.root, multi.names[1]), multiSql);
    multi.document.migrations[1].checksum = checksum(multiSql);
    multi.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: multi.root,
        manifestPath: multi.manifestPath,
      }),
    ).toThrow('exactly one statement');
  });

  it('rejects database lifecycle, cross-schema, and ordinary destructive DDL', () => {
    const lifecycle = fixture(2);
    const lifecycleSql = 'DROP DATABASE another_worktree;';
    writeFileSync(join(lifecycle.root, lifecycle.names[1]), lifecycleSql);
    lifecycle.document.migrations[1].checksum = checksum(lifecycleSql);
    lifecycle.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: lifecycle.root,
        manifestPath: lifecycle.manifestPath,
      }),
    ).toThrow('may not administer databases');

    const crossSchema = fixture(2);
    const crossSchemaSql = 'ALTER TABLE other_worktree.widget ADD escaped int;';
    writeFileSync(join(crossSchema.root, crossSchema.names[1]), crossSchemaSql);
    crossSchema.document.migrations[1].checksum = checksum(crossSchemaSql);
    crossSchema.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: crossSchema.root,
        manifestPath: crossSchema.manifestPath,
      }),
    ).toThrow('cross-schema');

    const destructive = fixture(2);
    const destructiveSql = 'ALTER TABLE widget DROP COLUMN id;';
    writeFileSync(join(destructive.root, destructive.names[1]), destructiveSql);
    destructive.document.migrations[1].checksum = checksum(destructiveSql);
    destructive.save();
    expect(() =>
      loadAndValidateMigrationManifest({
        migrationsDirectory: destructive.root,
        manifestPath: destructive.manifestPath,
      }),
    ).toThrow('approved exceptional migration');
  });
});

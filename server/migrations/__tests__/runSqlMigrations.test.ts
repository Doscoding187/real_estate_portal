import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  buildMysqlMigrationConnectionConfig,
  canonicalBaselineCutoverError,
  migrationChecksum,
  runSqlMigrations,
  sortMigrationFiles,
} from '../runSqlMigrations';

describe('buildMysqlMigrationConnectionConfig', () => {
  it('normalizes legacy boolean ssl query parameters for mysql2', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?ssl=true&rejectUnauthorized=true',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
  });

  it('preserves object-based ssl config from newer DATABASE_URL values', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?ssl=%7B%22minVersion%22%3A%22TLSv1.2%22%7D',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    });
  });

  it('treats sslaccept=strict as strict certificate validation', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://user:pass@host:4000/db?sslaccept=strict',
    );

    expect(config.uri).toBe('mysql://user:pass@host:4000/db');
    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
  });

  it('rejects insecure TLS settings for production migrations', () => {
    expect(() =>
      buildMysqlMigrationConnectionConfig(
        'mysql://user:pass@host:4000/listify_property_sa?rejectUnauthorized=false',
        'production',
      ),
    ).toThrow(/Certificate verification cannot be disabled/);
  });

  it('allows local development migrations without TLS', () => {
    const config = buildMysqlMigrationConnectionConfig(
      'mysql://listify_app@127.0.0.1:3307/listify_local',
      'development',
    );

    expect(config.ssl).toBeUndefined();
  });


});

class MigrationConnection {
  calls: string[] = [];
  history = new Map<string, string>();
  failStatement?: RegExp;
  applicationTableCount = 0;

  async execute(statement: string) {
    this.calls.push(statement);
    if (statement.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('information_schema.columns') && statement.includes("table_name = \"sql_migration_history\"")) return [[{ count_value: 1 }]];
    if (
      statement.includes(
        "table_name <> 'sql_migration_history'",
      )
    ) {
      return [[{
        count_value: this.applicationTableCount,
      }]];
    }
    if (statement.startsWith('SELECT filename, checksum')) return [[...this.history.entries()].map(([filename, checksum]) => ({ filename, checksum }))];
    if (statement.startsWith('INSERT INTO `sql_migration_history`')) {
      const quoted = statement.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
      if (quoted.length < 3) throw new Error(`Unable to parse history insert: ${statement}`);
      this.history.set(JSON.parse(quoted[1]), JSON.parse(quoted[2]));
    }
    if (this.failStatement?.test(statement)) throw Object.assign(new Error('intentional failure'), { code: 'ER_PARSE_ERROR' });
    return {};
  }
}
function tempMigrations(files: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), 'sql-migrations-'));
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(directory, name), contents);
  return directory;
}

describe('canonical SQL migration history', () => {
  const baselineFile =
    '0000_canonical_launch_baseline.sql';

  const baselineSql =
    'CREATE TABLE canonical_widget (id int);';

  it('requires the canonical baseline as the first active file', () => {
    expect(
      canonicalBaselineCutoverError(
        ['0001_increment.sql'],
        [],
        0,
      ),
    ).toContain(
      'requires 0000_canonical_launch_baseline.sql',
    );
  });

  it('refuses a retired pre-canonical ledger', () => {
    expect(
      canonicalBaselineCutoverError(
        [baselineFile],
        ['0075_create_agency_agent_memberships.sql'],
        0,
      ),
    ).toContain('retired pre-canonical SQL chain');
  });

  it('refuses an existing schema without the baseline ledger', () => {
    expect(
      canonicalBaselineCutoverError(
        [baselineFile],
        [],
        12,
      ),
    ).toContain(
      'already contains 12 application table(s)',
    );
  });

  it('runs the canonical baseline once and then is a no-op', async () => {
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
    });

    const connection = new MigrationConnection();

    try {
      await runSqlMigrations({
        migrationsDir: directory,
        connection,
      });

      expect(
        connection.history.get(baselineFile),
      ).toBe(migrationChecksum(baselineSql));

      expect(
        connection.calls.filter(
          call =>
            call.startsWith(
              'CREATE TABLE canonical_widget',
            ),
        ),
      ).toHaveLength(1);

      await runSqlMigrations({
        migrationsDir: directory,
        connection,
      });

      expect(
        connection.calls.filter(
          call =>
            call.startsWith(
              'CREATE TABLE canonical_widget',
            ),
        ),
      ).toHaveLength(1);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('refuses a legacy ledger before executing baseline SQL', async () => {
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
    });

    const connection = new MigrationConnection();

    connection.history.set(
      '0075_create_agency_agent_memberships.sql',
      'legacy-checksum',
    );

    try {
      await expect(
        runSqlMigrations({
          migrationsDir: directory,
          connection,
        }),
      ).rejects.toThrow(
        'retired pre-canonical SQL chain',
      );

      expect(
        connection.calls.some(
          call =>
            call.startsWith(
              'CREATE TABLE canonical_widget',
            ),
        ),
      ).toBe(false);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('refuses an existing application schema before baseline execution', async () => {
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
    });

    const connection = new MigrationConnection();
    connection.applicationTableCount = 3;

    try {
      await expect(
        runSqlMigrations({
          migrationsDir: directory,
          connection,
        }),
      ).rejects.toThrow(
        'already contains 3 application table(s)',
      );

      expect(
        connection.calls.some(
          call =>
            call.startsWith(
              'CREATE TABLE canonical_widget',
            ),
        ),
      ).toBe(false);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('supports future increments after the baseline', async () => {
    const incrementFile =
      '0001_add_widget_name.sql';

    const incrementSql =
      'ALTER TABLE canonical_widget ADD COLUMN name varchar(100);';

    const directory = tempMigrations({
      [baselineFile]: baselineSql,
      [incrementFile]: incrementSql,
    });

    const connection = new MigrationConnection();

    connection.history.set(
      baselineFile,
      migrationChecksum(baselineSql),
    );

    try {
      await runSqlMigrations({
        migrationsDir: directory,
        connection,
      });

      expect(
        connection.history.get(incrementFile),
      ).toBe(migrationChecksum(incrementSql));

      expect(
        connection.calls.some(
          call =>
            call.startsWith(
              'ALTER TABLE canonical_widget',
            ),
        ),
      ).toBe(true);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('rejects unsupported future SQL without executing or recording it', async () => {
    const incrementFile =
      '0001_unsupported_procedure.sql';
    const incrementSql =
      'CALL unsupported_migration_procedure();';
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
      [incrementFile]: incrementSql,
    });
    const connection = new MigrationConnection();
    const baselineChecksum = migrationChecksum(baselineSql);

    connection.history.set(baselineFile, baselineChecksum);

    try {
      await expect(
        runSqlMigrations({
          migrationsDir: directory,
          connection,
        }),
      ).rejects.toThrow('Unsupported SQL migration statement: CALL unsupported_migration_procedure()');

      expect(
        connection.calls.some(
          call => call.startsWith('CALL unsupported_migration_procedure'),
        ),
      ).toBe(false);
      expect(connection.history.has(incrementFile)).toBe(false);
      expect(connection.history.get(baselineFile)).toBe(baselineChecksum);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('fails before execution when an applied checksum changes', async () => {
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
    });

    const connection = new MigrationConnection();

    connection.history.set(
      baselineFile,
      migrationChecksum(
        'CREATE TABLE changed_widget (id int);',
      ),
    );

    try {
      await expect(
        runSqlMigrations({
          migrationsDir: directory,
          connection,
        }),
      ).rejects.toThrow('Checksum mismatch');

      expect(
        connection.calls.some(
          call =>
            call.startsWith(
              'CREATE TABLE canonical_widget',
            ),
        ),
      ).toBe(false);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('does not record a baseline that fails', async () => {
    const directory = tempMigrations({
      [baselineFile]: baselineSql,
    });

    const connection = new MigrationConnection();

    connection.failStatement =
      /CREATE TABLE canonical_widget/;

    try {
      await expect(
        runSqlMigrations({
          migrationsDir: directory,
          connection,
        }),
      ).rejects.toThrow('intentional failure');

      expect(connection.history.size).toBe(0);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('orders canonical baseline and future increments numerically', () => {
    expect(
      sortMigrationFiles([
        '0002_second.sql',
        baselineFile,
        '0001_first.sql',
      ]),
    ).toEqual([
      baselineFile,
      '0001_first.sql',
      '0002_second.sql',
    ]);
  });
});

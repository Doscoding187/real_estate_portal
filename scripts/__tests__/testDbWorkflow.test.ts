import { describe, expect, it } from 'vitest';
import {
  assertApprovedNativeTestDataRoot,
  assertTestDatabaseTarget,
  assertTestRebuildAcknowledgement,
  testRebuildCommandSequence,
} from '../testDbWorkflow';

const baseEnv = {
  NODE_ENV: 'test',
  APP_ENV: 'test',
  DATABASE_URL: 'mysql://listify_test@127.0.0.1:3307/listify_test',
};

describe('canonical local test database rebuild guards', () => {
  it('accepts only the pinned disposable local test target', () => {
    expect(assertTestDatabaseTarget(baseEnv)).toMatchObject({
      host: '127.0.0.1',
      port: '3307',
      database: 'listify_test',
    });
  });

  it('rejects remote and non-loopback hosts', () => {
    for (const host of ['localhost', 'mysql.example.test', 'gateway01.tidbcloud.com']) {
      expect(() =>
        assertTestDatabaseTarget({
          ...baseEnv,
          DATABASE_URL: `mysql://listify_test@${host}:3307/listify_test`,
        }),
      ).toThrow('loopback');
    }
  });

  it('rejects incorrect ports, runtime values, and non-test databases', () => {
    expect(() =>
      assertTestDatabaseTarget({
        ...baseEnv,
        DATABASE_URL: 'mysql://listify_test@127.0.0.1:3306/listify_test',
      }),
    ).toThrow('port');

    expect(() => assertTestDatabaseTarget({ ...baseEnv, NODE_ENV: 'production' })).toThrow(
      'NODE_ENV',
    );
    expect(() => assertTestDatabaseTarget({ ...baseEnv, APP_ENV: 'development' })).toThrow(
      'APP_ENV',
    );
    expect(() =>
      assertTestDatabaseTarget({
        ...baseEnv,
        DATABASE_URL: 'mysql://listify_test@127.0.0.1:3307/listify_local',
      }),
    ).toThrow('database');
  });

  it('requires the exact destructive acknowledgement and native data root', () => {
    expect(() => assertTestRebuildAcknowledgement(baseEnv)).toThrow(
      'LISTIFY_TEST_DB_REBUILD_CONFIRM',
    );
    expect(() =>
      assertTestRebuildAcknowledgement({
        ...baseEnv,
        LISTIFY_TEST_DB_REBUILD_CONFIRM: 'true',
      }),
    ).toThrow('LISTIFY_TEST_DB_REBUILD_CONFIRM');
    expect(() => assertApprovedNativeTestDataRoot('/tmp/not-listify')).toThrow('native data root');
  });

  it('uses an explicit selective rebuild before canonical migration', () => {
    expect(testRebuildCommandSequence()).toEqual([
      ['pnpm', ['db:local:start']],
      ['pnpm', ['db:local:wait']],
      ['bash', ['scripts/local-db.sh', 'test:rebuild']],
      ['pnpm', ['db:migrate:test']],
    ]);
  });
});

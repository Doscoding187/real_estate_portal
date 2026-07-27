import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertApprovedNativeTestDataRoot,
  assertTestDatabaseTarget,
  assertTestRebuildAcknowledgement,
  executeTestRebuildCommandSequence,
  isDirectModuleExecution,
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
      ['pnpm', ['db:verify:distribution']],
    ]);
  });

  it('recognizes direct execution using normalized native Linux and macOS paths', () => {
    expect(
      isDirectModuleExecution(
        '/workspace/scripts/testDbWorkflow.ts',
        'file:///workspace/scripts/testDbWorkflow.ts',
        'linux',
      ),
    ).toBe(true);
    expect(
      isDirectModuleExecution(
        '/Users/listify/project/scripts/testDbWorkflow.ts',
        'file:///Users/listify/project/scripts/testDbWorkflow.ts',
        'darwin',
      ),
    ).toBe(true);
  });

  it('normalizes the Windows file URL before comparing a direct entrypoint', () => {
    const moduleUrl = 'file:///C:/workspace/scripts/testDbWorkflow.ts';
    const nativePath = 'C:\\workspace\\scripts\\testDbWorkflow.ts';

    expect(new URL(moduleUrl).pathname).toBe('/C:/workspace/scripts/testDbWorkflow.ts');
    expect(isDirectModuleExecution(nativePath, moduleUrl, 'win32')).toBe(true);
    expect(
      isDirectModuleExecution('C:\\workspace\\scripts\\anotherModule.ts', moduleUrl, 'win32'),
    ).toBe(false);
  });

  it('keeps the rebuild orchestrator free of hard-coded application tables', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/testDbWorkflow.ts'), 'utf8');

    expect(source).not.toMatch(/['"]properties['"]/);
    expect(source).not.toMatch(/['"]showings['"]/);
    expect(source).toContain('sql_migration_history');
    expect(source).toContain("['pnpm', ['db:verify:distribution']]");
  });

  it('runs the canonical verifier only after migration and ledger verification pass', async () => {
    const invoked: string[] = [];
    const target = assertTestDatabaseTarget(baseEnv);

    await executeTestRebuildCommandSequence(
      target,
      async () => invoked.push('ledger'),
      (_target, command, args) => invoked.push(`${command} ${args.join(' ')}`),
    );

    expect(invoked).toEqual([
      'pnpm db:local:start',
      'pnpm db:local:wait',
      'bash scripts/local-db.sh test:rebuild',
      'pnpm db:migrate:test',
      'ledger',
      'pnpm db:verify:distribution',
    ]);
  });

  it('fails the rebuild when the canonical verifier fails', async () => {
    const target = assertTestDatabaseTarget(baseEnv);

    await expect(
      executeTestRebuildCommandSequence(
        target,
        async () => undefined,
        (_target, command, args) => {
          if (command === 'pnpm' && args[0] === 'db:verify:distribution') {
            throw new Error('canonical verifier failed');
          }
        },
      ),
    ).rejects.toThrow('canonical verifier failed');
  });
});

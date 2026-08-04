import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  assertLocalDatabaseTarget,
  assertReprovisionAcknowledgement,
  executeCommandSequence,
  reprovisionCommandSequence,
  verificationCommandSequence,
} from '../localDbWorkflow';

describe('local database reprovisioning guards', () => {
  it('fails closed for every retired direct workflow export', () => {
    expect(() => assertLocalDatabaseTarget()).toThrow('direct execution is retired');
    expect(() => assertReprovisionAcknowledgement()).toThrow('reprovision is retired');
  });
});

describe('local database lifecycle sequencing', () => {
  it('keeps the bounded service, exact target, migration, and data stages ordered', () => {
    expect(reprovisionCommandSequence()).toEqual([
      ['pnpm', ['db:authority:service:start']],
      ['pnpm', ['db:worktree:create']],
      ['pnpm', ['db:migrate:plan']],
      ['pnpm', ['db:migrate:apply']],
      ['pnpm', ['db:reference:prepare']],
      ['pnpm', ['db:scenario:prepare']],
      ['pnpm', ['db:readiness', '--', '--purpose=location-discovery']],
    ]);
  });

  it('delegates verification to approved diagnostics', () => {
    expect(verificationCommandSequence()).toEqual([
      ['pnpm', ['db:reference:verify']],
      ['pnpm', ['db:scenario:verify']],
      ['pnpm', ['db:readiness', '--', '--purpose=location-discovery']],
    ]);
  });

  it('does not seed after a migration failure', async () => {
    const invoked: string[] = [];

    await expect(
      executeCommandSequence(reprovisionCommandSequence().slice(2), (command, args) => {
        invoked.push(`${command} ${args.join(' ')}`);
        if (invoked.length === 1) throw new Error('migration failed');
      }),
    ).rejects.toThrow('migration failed');

    expect(invoked).toEqual(['pnpm db:migrate:plan']);
  });

  it('stops verification after the first diagnostic failure', async () => {
    const invoked: string[] = [];

    await expect(
      executeCommandSequence(verificationCommandSequence(), (command, args) => {
        invoked.push(`${command} ${args.join(' ')}`);
        throw new Error('verification failed');
      }),
    ).rejects.toThrow('verification failed');

    expect(invoked).toEqual(['pnpm db:reference:verify']);
  });
});

describe('local service stale-state containment', () => {
  it.each(['start', 'status', 'stop'] as const)(
    '%s fails closed and preserves a stale PID fixture without invoking service commands',
    action => {
      const fixtureDirectory = mkdtempSync(join('/var/tmp', 'property-listify-lifecycle-test-'));
      const serviceUidRoot = join(fixtureDirectory, 'uid-root');
      const serviceRoot = join(serviceUidRoot, 'mysql-3307');
      const binDirectory = join(fixtureDirectory, 'bin');
      const scriptPath = join(fixtureDirectory, 'local-db-fixture.sh');
      const callLog = join(fixtureDirectory, 'calls.log');
      const pidPath = join(serviceRoot, 'mysqld.pid');
      const source = readFileSync(join(process.cwd(), 'scripts/local-db.sh'), 'utf8');
      let stalePid = process.pid + 100000;
      while (existsSync(`/proc/${stalePid}`)) stalePid += 1;

      try {
        mkdirSync(serviceRoot, { recursive: true, mode: 0o700 });
        mkdirSync(binDirectory, { recursive: true, mode: 0o700 });
        chmodSync(serviceUidRoot, 0o700);
        chmodSync(serviceRoot, 0o700);
        writeFileSync(pidPath, `${stalePid}\n`, { mode: 0o600 });
        const fixtureSource = source.replace(
          'readonly SERVICE_UID_ROOT="$TMP_PARENT/property-listify-$SERVICE_USER_ID"',
          `readonly SERVICE_UID_ROOT="${serviceUidRoot}"`,
        );
        expect(fixtureSource).not.toBe(source);
        writeFileSync(scriptPath, fixtureSource, { mode: 0o700 });

        for (const command of ['mysqld', 'mysqladmin', 'ss']) {
          const stub = join(binDirectory, command);
          writeFileSync(
            stub,
            '#!/usr/bin/env bash\nprintf \'%s\\n\' "${0##*/}" >> "$DBA_TEST_CALL_LOG"\nexit 99\n',
            { mode: 0o700 },
          );
          chmodSync(stub, 0o700);
        }

        const result = spawnSync('bash', [scriptPath, action], {
          encoding: 'utf8',
          env: {
            ...process.env,
            DBA_TEST_CALL_LOG: callLog,
            PATH: `${binDirectory}:${process.env.PATH ?? ''}`,
          },
        });
        const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

        expect(result.status).not.toBe(0);
        expect(output).toMatch(/stale|preserved evidence|inconsistent/i);
        expect(readFileSync(pidPath, 'utf8')).toBe(`${stalePid}\n`);
        expect(result.signal).toBeNull();
        expect(() => readFileSync(callLog, 'utf8')).toThrow();
      } finally {
        rmSync(fixtureDirectory, { recursive: true, force: true });
      }
    },
  );
});

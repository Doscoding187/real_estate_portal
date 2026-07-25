import { describe, expect, it } from 'vitest';
import {
  assertLocalDatabaseTarget,
  assertReprovisionAcknowledgement,
  executeCommandSequence,
  reprovisionCommandSequence,
  verificationCommandSequence,
} from '../localDbWorkflow';

const baseEnv = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  DATABASE_URL: 'mysql://listify_app@127.0.0.1:3307/listify_local',
};

describe('local database reprovisioning guards', () => {
  it('requires the exact local database name', () => {
    expect(() =>
      assertLocalDatabaseTarget({
        ...baseEnv,
        DATABASE_URL: 'mysql://app@127.0.0.1/listify_local_copy',
      }),
    ).toThrow('exactly');
  });

  it('rejects non-local hosts and staging/production environments', () => {
    expect(() =>
      assertLocalDatabaseTarget({
        ...baseEnv,
        DATABASE_URL: 'mysql://app@db.production.example/listify_local',
      }),
    ).toThrow('local service host');

    expect(() =>
      assertLocalDatabaseTarget({ ...baseEnv, NODE_ENV: 'production' }),
    ).toThrow('NODE_ENV');

    expect(() =>
      assertLocalDatabaseTarget({ ...baseEnv, APP_ENV: 'staging' }),
    ).toThrow('APP_ENV');
  });

  it('rejects retired and generic local service aliases', () => {
    for (const host of ['real-estate-mysql', 'mysql', 'db']) {
      expect(() =>
        assertLocalDatabaseTarget({
          ...baseEnv,
          DATABASE_URL: `mysql://listify_app@${host}:3307/listify_local`,
        }),
      ).toThrow('local service host');
    }
  });

  it('accepts the canonical Docker local service name', () => {
    expect(
      assertLocalDatabaseTarget({
        ...baseEnv,
        DATABASE_URL:
          'mysql://listify_app@listify-mysql-local:3306/listify_local',
      }).host,
    ).toBe('listify-mysql-local');
  });

  it('requires an exact destructive acknowledgement', () => {
    expect(() => assertReprovisionAcknowledgement(baseEnv)).toThrow(
      'LISTIFY_LOCAL_DB_REPROVISION_CONFIRM',
    );

    expect(() =>
      assertReprovisionAcknowledgement({
        ...baseEnv,
        LISTIFY_LOCAL_DB_REPROVISION_CONFIRM: 'true',
      }),
    ).toThrow('LISTIFY_LOCAL_DB_REPROVISION_CONFIRM');
  });
});

describe('local database lifecycle sequencing', () => {
  it('keeps destructive reprovision ordered', () => {
    expect(reprovisionCommandSequence()).toEqual([
      ['pnpm', ['db:local:start']],
      ['pnpm', ['db:migrate:local']],
      ['pnpm', ['db:seed:local']],
      ['pnpm', ['db:verify:local']],
    ]);
  });

  it('delegates verification to approved diagnostics', () => {
    expect(verificationCommandSequence()).toEqual([
      ['pnpm', ['db:verify:distribution']],
      ['pnpm', ['db:verify:local-demo']],
    ]);
  });

  it('does not seed after a migration failure', async () => {
    const invoked: string[] = [];

    await expect(
      executeCommandSequence(
        reprovisionCommandSequence().slice(1),
        (command, args) => {
          invoked.push(`${command} ${args.join(' ')}`);
          if (invoked.length === 1) throw new Error('migration failed');
        },
      ),
    ).rejects.toThrow('migration failed');

    expect(invoked).toEqual(['pnpm db:migrate:local']);
  });

  it('stops verification after the first diagnostic failure', async () => {
    const invoked: string[] = [];

    await expect(
      executeCommandSequence(
        verificationCommandSequence(),
        (command, args) => {
          invoked.push(`${command} ${args.join(' ')}`);
          throw new Error('verification failed');
        },
      ),
    ).rejects.toThrow('verification failed');

    expect(invoked).toEqual(['pnpm db:verify:distribution']);
  });
});

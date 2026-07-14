import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertLocalDatabaseTarget,
  assertReprovisionAcknowledgement,
  executeCommandSequence,
  reprovisionCommandSequence,
  verifyLocalDatabase,
} from '../localDbWorkflow';

const baseEnv = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  DATABASE_URL: 'mysql://listify_app@127.0.0.1:3307/listify_local',
};

function verificationConnection(options: { missingUsers?: boolean; showingStatus?: string; history?: Array<Record<string, unknown>> } = {}) {
  return {
    async execute(statement: string, params?: unknown[]) {
      if (statement.includes('SELECT DATABASE()')) return [[{ database_name: 'listify_local' }]];
      if (statement.includes('information_schema.tables')) return [[{ count_value: options.missingUsers && params?.[0] === 'users' ? 0 : 1 }]];
      if (statement.includes("table_name = 'users'")) return [[{ count_value: 1 }]];
      if (statement.includes("table_name = 'showings'")) return [[{ column_type: options.showingStatus ?? "enum('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show','rescheduled')" }]];
      if (statement.includes("agency_listing_performance_reviews' AND column_name = 'contact_date'")) return [[{ column_type: 'timestamp', is_nullable: 'YES' }]];
      if (statement.includes('IS_USED_LOCK')) return [[{ lock_owner: null }]];
      if (statement.includes("agency@listify.local")) return [[{ count_value: 1 }]];
      return [[{ count_value: 1 }]];
    },
    async query() {
      return [options.history ?? []];
    },
    async end() {},
  } as any;
}

describe('local database reprovisioning guards', () => {
  it('requires the exact local database name', () => {
    expect(() => assertLocalDatabaseTarget({ ...baseEnv, DATABASE_URL: 'mysql://app@127.0.0.1/listify_local_copy' })).toThrow('exactly');
  });

  it('rejects non-local hosts and staging/production environments', () => {
    expect(() => assertLocalDatabaseTarget({ ...baseEnv, DATABASE_URL: 'mysql://app@db.production.example/listify_local' })).toThrow('local service host');
    expect(() => assertLocalDatabaseTarget({ ...baseEnv, NODE_ENV: 'production' })).toThrow('NODE_ENV');
    expect(() => assertLocalDatabaseTarget({ ...baseEnv, APP_ENV: 'staging' })).toThrow('APP_ENV');
  });

  it('requires an exact destructive acknowledgement', () => {
    expect(() => assertReprovisionAcknowledgement(baseEnv)).toThrow('LISTIFY_LOCAL_DB_REPROVISION_CONFIRM');
    expect(() => assertReprovisionAcknowledgement({ ...baseEnv, LISTIFY_LOCAL_DB_REPROVISION_CONFIRM: 'true' })).toThrow('LISTIFY_LOCAL_DB_REPROVISION_CONFIRM');
  });
});

describe('local database reprovisioning sequencing', () => {
  it('keeps the fresh reprovision contract ordered', () => {
    expect(reprovisionCommandSequence()).toEqual([
      ['pnpm', ['db:local:start']],
      ['pnpm', ['db:migrate:fresh:local']],
      ['pnpm', ['db:seed:local']],
      ['pnpm', ['db:verify:local']],
    ]);
  });

  it('does not seed after a migration failure', async () => {
    const invoked: string[] = [];
    await expect(executeCommandSequence(reprovisionCommandSequence().slice(1), (command, args) => {
      invoked.push(`${command} ${args.join(' ')}`);
      if (invoked.length === 1) throw new Error('migration failed');
    })).rejects.toThrow('migration failed');
    expect(invoked).toEqual(['pnpm db:migrate:fresh:local']);
  });
});

describe('local database verification', () => {
  const target = assertLocalDatabaseTarget(baseEnv);

  it('detects a missing users table', async () => {
    await expect(verifyLocalDatabase(target, verificationConnection({ missingUsers: true }))).rejects.toThrow('users');
  });

  it('detects a stale showings lifecycle enum', async () => {
    await expect(verifyLocalDatabase(target, verificationConnection({ showingStatus: "enum('requested','confirmed')" }))).rejects.toThrow('showings.status is stale');
  });

  it('detects missing custom migration-history rows', async () => {
    await expect(verifyLocalDatabase(target, verificationConnection())).rejects.toThrow('history is missing');
  });

  it('detects custom migration checksum mismatch', async () => {
    const first = readdirSync(join(process.cwd(), 'server/migrations')).filter(file => /^\d{4}_[a-zA-Z0-9_]+\.sql$/.test(file)).sort()[0];
    const history = [{ filename: first, checksum: createHash('sha256').update(readFileSync(join(process.cwd(), 'server/migrations', first))).digest('hex').replace(/^./, '0'), application_mode: 'executed' }];
    await expect(verifyLocalDatabase(target, verificationConnection({ history }))).rejects.toThrow('checksum mismatch');
  });
});

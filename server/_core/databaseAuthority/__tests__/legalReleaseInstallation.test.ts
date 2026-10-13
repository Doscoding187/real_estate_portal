import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { readGitWorktreeIdentity } from '../worktreeIdentity';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import { installLegalRelease } from '../legalReleaseInstallation';
import { prepareLegalRelease } from '../../../services/legalReleasePreparation';
import { normalizedDesiredSchema } from '../schemaCongruency';
import * as legalSchema from '../../../../drizzle/schema/legalAcceptance';

const physical = vi.hoisted(() => ({ corrupt: false }));
vi.mock('../schemaCongruency', async importOriginal => {
  const actual = await importOriginal<typeof import('../schemaCongruency')>();
  return {
    ...actual,
    normalizedPhysicalSchema: vi.fn(async (_connection, _provider, desired) =>
      physical.corrupt ? { ...desired, tables: [] } : desired,
    ),
  };
});
vi.mock('../worktreeProfile', async importOriginal => ({
  ...(await importOriginal<typeof import('../worktreeProfile')>()),
  readWorktreeDatabaseProfile: () => null,
}));
const identity = readGitWorktreeIdentity();
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const terms = 'Synthetic installer Terms.\n',
  privacy = 'Synthetic installer Privacy.\n';
const at = '2026-10-13T12:00:00Z';
const clock = () => new Date('2026-10-13T12:01:00Z');
function authority(
  operation: 'legal-release-plan' | 'legal-release-apply' | 'legal-release-verify',
  protectedTarget = false,
) {
  const authority = resolveDatabaseAuthority({
    operation,
    explicitDatabaseUrl: protectedTarget
      ? 'mysql://reader:private@propertylistify-mysql.mysql.database.azure.com/propertylistify_database'
      : `mysql://listify_app:private@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
    credentialClass: protectedTarget
      ? operation === 'legal-release-apply'
        ? 'migration'
        : 'read-only'
      : 'local-owner',
    processEnv: {
      NODE_ENV: protectedTarget ? 'production' : 'development',
      APP_ENV: protectedTarget ? 'production' : 'development',
      DATABASE_MIGRATION_URL:
        'mysql://migrator:separate@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
    },
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: {
      actor: 'Synthetic operator',
      reference: 'SYNTHETIC-INSTALL',
      operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
    acknowledgement: expectedDatabaseAcknowledgement(authority.context),
  });
  // Test identity is a clean reviewed commit; production may not override this.
  return {
    authority: {
      ...authority,
      context: { ...authority.context, worktree: { ...authority.context.worktree, clean: true } },
    },
    decision,
  };
}
function packet() {
  return {
    formatVersion: 1,
    sourceHead: authority('legal-release-plan').authority.context.repository.head,
    manifestDigest: loadAndValidateMigrationManifest().manifestDigest,
    expectedPreviousBundleId: null,
    validUntil: '2026-10-13T12:30:00Z',
    plannedEffectiveAt: at,
    terms,
    privacy,
    candidate: {
      formatVersion: 1,
      bundleId: 'synthetic-install',
      termsVersion: 'synthetic-terms',
      privacyVersion: 'synthetic-privacy',
      effectiveAt: null,
      sourceBusinessApproval: 'synthetic-business',
      finalPrivacyApproval: 'synthetic-final',
      documents: {
        'terms.txt': { file: 'terms.txt', sha256: sha(terms) },
        'privacy.txt': { file: 'privacy.txt', sha256: sha(privacy) },
      },
    },
    approval: {
      reference: 'synthetic-final',
      actor: 'Synthetic founder',
      recordedAt: '2026-10-12T00:00:00Z',
      answer: 'Approve finalized Privacy wording',
      sourceBusinessApproval: 'synthetic-business',
      document: { file: 'privacy.txt', version: 'synthetic-privacy', sha256: sha(privacy) },
      termsAndPayment: { versions: { terms: 'synthetic-terms' }, termsSha256: sha(terms) },
    },
  };
}
function fixture() {
  let pointer: string | null = null,
    row: Record<string, unknown> | null = null;
  let saved: { pointer: string | null; row: Record<string, unknown> | null } | undefined;
  const statements: string[] = [];
  let failPointer = false,
    ambiguousCommit = false,
    wrongLock = false,
    badEngine = false;
  const connection: AuthoritySqlConnection = {
    async execute(sql, values = []) {
      statements.push(sql);
      if (sql.includes('ENGINE AS engine'))
        return [
          normalizedDesiredSchema(legalSchema).tables.map(t => ({
            table_name: t.name,
            engine: badEngine ? 'MyISAM' : 'InnoDB',
          })),
        ];
      if (sql.includes('information_schema.tables'))
        return [
          [{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }],
        ];
      if (sql.includes('sql_migration_history'))
        return [
          loadAndValidateMigrationManifest().orderedMigrations.map(m => ({
            filename: m.filename,
            checksum: m.checksum,
          })),
        ];
      if (sql.includes('sql_migration_attempts')) return [[]];
      if (sql.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
      if (sql.includes('IS_USED_LOCK'))
        return [[{ connection_id: 77, lock_owner_connection_id: wrongLock ? 78 : 77 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.startsWith('SELECT bundle_id FROM legal_active_release'))
        return [pointer === null ? [] : [{ bundle_id: pointer }]];
      if (sql.startsWith('SELECT bundle_id, format_version'))
        return [row === null ? [] : [structuredClone(row)]];
      if (sql.startsWith('INSERT INTO legal_releases')) {
        const cols = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')')).split(', ');
        row = Object.fromEntries(cols.map((c, i) => [c, values[i]]));
        return [{}];
      }
      if (
        sql.startsWith('INSERT INTO legal_active_release') ||
        sql.startsWith('UPDATE legal_active_release')
      ) {
        if (failPointer) throw new Error('injected pointer failure');
        pointer = String(values[sql.startsWith('INSERT') ? 1 : 0]);
        return [{}];
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
    async query(sql) {
      statements.push(sql);
      if (sql === 'START TRANSACTION') saved = structuredClone({ pointer, row });
      else if (sql === 'ROLLBACK') {
        pointer = saved!.pointer;
        row = saved!.row;
      } else if (sql === 'COMMIT') {
        if (ambiguousCommit) throw new Error('lost commit acknowledgement');
      } else throw new Error(`Unexpected control SQL ${sql}`);
      return [[]];
    },
    async end() {},
  };
  return {
    connection,
    statements,
    setPointer(value: string | null) {
      pointer = value;
    },
    setRow(value: Record<string, unknown>) {
      row = value;
    },
    get state() {
      return { pointer, row };
    },
    failPointer() {
      failPointer = true;
    },
    ambiguousCommit() {
      ambiguousCommit = true;
    },
    wrongLock() {
      wrongLock = true;
    },
    badEngine() {
      badEngine = true;
    },
  };
}
const run = (
  operation: Parameters<typeof authority>[0],
  f: ReturnType<typeof fixture>,
  extra = {},
) =>
  installLegalRelease({
    ...authority(operation),
    connection: f.connection,
    packet: packet(),
    now: clock,
    ...extra,
  });
beforeEach(() => {
  physical.corrupt = false;
});

describe('Named legal-release authority protocol', () => {
  it('plans read-only, installs once, verifies and repeats without text/evidence writes', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    expect(f.statements.every(s => s.startsWith('SELECT'))).toBe(true);
    expect(plan.state).toBe('prepared_not_installed');
    const installed = await run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest });
    expect(installed.state).toBe('installed');
    expect(installed).toMatchObject({
      activationChanged: true,
      transactionCommitDispatchedAt: clock().toISOString(),
      transactionCommitAcknowledgedAt: clock().toISOString(),
    });
    expect(installed.acceptanceWrites).toBe(false);
    const inserts = f.statements.filter(s => s.startsWith('INSERT')).length;
    expect((await run('legal-release-verify', f)).state).toBe('verified');
    expect(
      (await run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest })).state,
    ).toBe('already_installed');
    expect(f.statements.filter(s => s.startsWith('INSERT')).length).toBe(inserts);
    expect(
      f.statements.some(s => /UPDATE legal_releases|DELETE |user_legal_acceptances/.test(s)),
    ).toBe(false);
  });
  it('rejects a stale prior pointer before writing', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    f.setPointer('another-release');
    await expect(
      run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest }),
    ).rejects.toThrow('prior pointer changed');
    expect(f.state.row).toBeNull();
    expect(f.statements).toContain('ROLLBACK');
  });
  it('rolls back an insert when pointer write fails', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    f.failPointer();
    await expect(
      run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest }),
    ).rejects.toThrow('pointer failure');
    expect(f.state).toEqual({ pointer: null, row: null });
  });
  it('reports an ambiguous commit as unsafe to replay without asserting rollback', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    f.ambiguousCommit();
    await expect(
      run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest }),
    ).rejects.toMatchObject({ unsafeToReplay: true });
    expect(f.statements).not.toContain('ROLLBACK');
    expect((await run('legal-release-verify', f)).state).toBe('verified');
  });
  it('rejects same-ID different text even if the pointer already matches', async () => {
    const f = fixture();
    const p = packet();
    const prepared = prepareLegalRelease({
      candidate: p.candidate,
      approval: p.approval,
      terms: p.terms,
      privacy: p.privacy,
      plannedEffectiveAt: p.plannedEffectiveAt,
    });
    f.setPointer(prepared.databaseRow.bundleId);
    f.setRow({ bundle_id: prepared.databaseRow.bundleId });
    await expect(run('legal-release-plan', f)).rejects.toThrow('collision');
  });
  it.each(['sourceHead', 'manifestDigest'] as const)('binds the %s', async field => {
    const f = fixture();
    const p = { ...packet(), [field]: 'a'.repeat(field === 'sourceHead' ? 40 : 64) };
    await expect(run('legal-release-plan', f, { packet: p })).rejects.toThrow('mismatch');
    expect(f.statements.some(s => s.startsWith('INSERT'))).toBe(false);
  });
  it('requires the reviewed plan digest before acquiring a write lock', async () => {
    const f = fixture();
    await expect(
      run('legal-release-apply', f, { expectedPlanDigest: 'a'.repeat(64) }),
    ).rejects.toThrow('plan digest');
    expect(f.statements.some(s => s.includes('GET_LOCK'))).toBe(false);
  });
  it.each(['2026-10-13T12:31:00Z', '2026-10-13T11:59:59Z'])(
    'refuses apply outside the activation window: %s',
    async time => {
      const f = fixture();
      await expect(run('legal-release-apply', f, { now: () => new Date(time) })).rejects.toThrow(
        'window',
      );
      expect(f.statements).toEqual([]);
    },
  );
  it('refuses a window longer than 30 minutes', async () => {
    await expect(
      run('legal-release-plan', fixture(), {
        packet: { ...packet(), validUntil: '2026-10-13T12:31:00Z' },
      }),
    ).rejects.toThrow('finite');
  });
  it('does not time out historical read-only verification', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    await run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest });
    expect(
      (await run('legal-release-verify', f, { now: () => new Date('2027-01-01') })).state,
    ).toBe('verified');
  });
  it('refuses physical schema mismatch', async () => {
    physical.corrupt = true;
    await expect(run('legal-release-plan', fixture())).rejects.toThrow('physical schema');
  });
  it('refuses nontransactional legal tables', async () => {
    const f = fixture();
    f.badEngine();
    await expect(run('legal-release-plan', f)).rejects.toThrow('InnoDB');
  });
  it('refuses unowned migration lock', async () => {
    const f = fixture();
    const plan = await run('legal-release-plan', f);
    f.wrongLock();
    await expect(
      run('legal-release-apply', f, { expectedPlanDigest: plan.planDigest }),
    ).rejects.toThrow('ownership');
    expect(f.statements.some(s => s.startsWith('INSERT'))).toBe(false);
  });
  it('rejects dirty protected source', async () => {
    const f = fixture(),
      a = authority('legal-release-plan', true);
    a.authority.context.worktree.clean = false;
    await expect(
      installLegalRelease({ ...a, connection: f.connection, packet: packet(), now: clock }),
    ).rejects.toThrow('clean reviewed source');
  });
  it('refuses a caller-supplied approval/copy that differs from reviewed Git', async () => {
    const a = authority('legal-release-plan', true);
    await expect(
      installLegalRelease({ ...a, connection: fixture().connection, packet: packet(), now: clock }),
    ).rejects.toThrow('reviewed Git copy/approval');
  });
  it('does not authorize a protected apply without exact approval and acknowledgement', () => {
    const a = authority('legal-release-apply', true).authority;
    expect(() => authorizeDatabaseOperation(a)).toThrow();
    expect(() =>
      authorizeDatabaseOperation(a, {
        approval: {
          actor: 'test',
          reference: 'test',
          operation: 'legal-release-apply',
          targetFingerprintHash: a.context.targetFingerprintHash,
        },
      }),
    ).toThrow('acknowledgement');
  });
  it('does not admit forged authorization', async () => {
    const a = authority('legal-release-plan');
    await expect(
      installLegalRelease({
        ...a,
        decision: { ...a.decision },
        packet: packet(),
        connection: fixture().connection,
      }),
    ).rejects.toThrow('authorization');
  });
  it('refuses a protected local-owner declaration before opening any connection', () => {
    const target = resolveDatabaseAuthority({
      operation: 'legal-release-apply',
      explicitDatabaseUrl:
        'mysql://owner:private@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    expect(() =>
      authorizeDatabaseOperation(target, {
        approval: {
          actor: 'test',
          reference: 'test',
          operation: 'legal-release-apply',
          targetFingerprintHash: target.context.targetFingerprintHash,
        },
        acknowledgement: expectedDatabaseAcknowledgement(target.context),
      }),
    ).toThrow('local-owner');
  });
});

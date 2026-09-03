import { describe, expect, it, vi } from 'vitest';
import { databaseAuthorityContextReport } from '../databaseAuthorityCli';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';
import type { GitWorktreeIdentity } from '../../server/_core/databaseAuthority/types';

function identity(branch = 'fix/database-context-report'): GitWorktreeIdentity {
  return {
    repositoryRoot: '/workspace/property-listify',
    gitCommonDirectory: '/workspace/property-listify/.git',
    gitCommonDirectoryFingerprint: 'a'.repeat(64),
    worktreePath: '/workspace/property-listify',
    branch,
    head: 'b'.repeat(40),
    upstream: 'origin/main',
    originMainHead: branch === 'main' ? 'b'.repeat(40) : 'c'.repeat(40),
    registered: true,
    clean: true,
    ownershipKey: 'd'.repeat(24),
    expectedWorktreeDatabase: 'listify_wt_database_context_report_dddddddddddd',
  };
}

describe('database authority context diagnostic', () => {
  it('does not evaluate local-service paths for a hosted target', () => {
    const authority = resolveDatabaseAuthority({
      operation: 'read-only-connect',
      gitIdentity: identity('main'),
      explicitDatabaseUrl:
        'mysql://sensitive-user:sensitive-password@tidb.example.com/listify_property_sa',
      credentialClass: 'read-only',
      processEnv: { APP_ENV: 'production', NODE_ENV: 'production' },
    });
    const localServiceReport = vi.fn(() => {
      throw new Error('hosted diagnostics must not derive a local-service path');
    });

    const report = databaseAuthorityContextReport(authority, localServiceReport);

    expect(localServiceReport).not.toHaveBeenCalled();
    expect(report.localService).toEqual({
      applicability: 'not-applicable',
      reason: 'The resolved database target is not local; no local-service path was evaluated.',
    });
    expect(JSON.stringify(report)).not.toContain('sensitive-user');
    expect(JSON.stringify(report)).not.toContain('sensitive-password');
  });

  it('retains local-service metadata for an authority-owned local target', () => {
    const fixtureIdentity = identity();
    const authority = resolveDatabaseAuthority({
      operation: 'read-only-connect',
      gitIdentity: fixtureIdentity,
      explicitDatabaseUrl: `mysql://local-user:local-password@127.0.0.1:3307/${fixtureIdentity.expectedWorktreeDatabase}`,
      credentialClass: 'local-owner',
      processEnv: { APP_ENV: 'development', NODE_ENV: 'development' },
    });
    const localServiceReport = vi.fn(() => ({
      applicability: 'local' as const,
      host: '127.0.0.1',
      port: 3307,
      directory: '/var/tmp/property-listify-1000/mysql-3307',
      dataDirectory: '/var/tmp/property-listify-1000/mysql-3307/data',
      fingerprint: 'a'.repeat(64),
      legacyHomeDirectory: '/home/example/.config/property-listify/mysql-3307',
      legacyPathPolicy: 'inactive-residue-only; never adopted or deleted automatically',
    }));

    const report = databaseAuthorityContextReport(authority, localServiceReport);

    expect(localServiceReport).toHaveBeenCalledOnce();
    expect(report.localService).toMatchObject({
      applicability: 'local',
      directory: '/var/tmp/property-listify-1000/mysql-3307',
    });
  });
});

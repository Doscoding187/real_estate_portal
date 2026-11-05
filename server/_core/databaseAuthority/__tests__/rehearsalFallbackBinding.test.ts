import './useRehearsal20261105';
import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';

describe('rehearsal registration loaded from the environment selects the release rehearsal target', () => {
  it('classifies the registered rehearsal target without a caller-provided binding', () => {
    const authority = resolveDatabaseAuthority({
      operation: 'release-plan',
      explicitDatabaseUrl:
        'mysql://fixture:fixture@pl-release-restore-20261105.mysql.database.azure.com:3306/propertylistify_database',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(authority.context.targetClass).toBe('disposable-rehearsal');
    expect(authority.context.rehearsal).toEqual({
      resourceId:
        '/subscriptions/384dc69e-9e22-419f-9e3d-83fbac4f58d0/resourceGroups/rg-property-listify/providers/Microsoft.DBforMySQL/flexibleServers/pl-release-restore-20261105',
      purpose: 'RELEASE DRY RUN - RESTORED PRE-0197 BACKUP (0111-to-0197)',
    });
  });

  it('never classifies the production target as rehearsal even with the registration loaded', () => {
    const authority = resolveDatabaseAuthority({
      operation: 'release-plan',
      explicitDatabaseUrl:
        'mysql://fixture:fixture@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(authority.context.targetClass).not.toBe('disposable-rehearsal');
  });

  it('an unrelated host resolves only as shared-remote, never as rehearsal', () => {
    const authority = resolveDatabaseAuthority({
      operation: 'release-plan',
      explicitDatabaseUrl: 'mysql://fixture:fixture@other-host.example.com/propertylistify_database',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(authority.context.targetClass).toBe('shared-remote');
  });
});

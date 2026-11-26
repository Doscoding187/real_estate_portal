import { describe, expect, it } from 'vitest';
import * as canonicalSchema from '../../../../drizzle/schema';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import { assertRehearsalReleaseScope } from '../../../migrations/runSqlMigrations';
import { resolveDatabaseAuthority } from '../context';
import {
  assertRehearsalAuthorization,
  assertRehearsalSourceBinding,
  isRegisteredRehearsal,
  REHEARSAL,
  REHEARSAL_FINGERPRINT,
  REHEARSAL_RESOURCE_ID,
} from '../rehearsalAuthority';
import { normalizedDesiredSchema } from '../schemaCongruency';

// No useRehearsal import: this is the committed default registration.
describe('pending 0197-to-0200 rehearsal registration (default) fails closed', () => {
  it('is the default, revoked, non-live, expired and unfilled', () => {
    expect(REHEARSAL.status).toBe('revoked');
    expect(REHEARSAL.authorizationLive).toBe(false);
    expect(REHEARSAL.acceptedOldHead).toBe('0197_drop_seller_prospects_province.sql');
    expect(REHEARSAL.expectedHead).toBe('0200_services_provider_credentials.sql');
    expect(Date.parse(REHEARSAL.expiresAt)).toBeLessThanOrEqual(Date.now());
    expect(REHEARSAL.hostname.endsWith('.invalid')).toBe(true);
    expect(REHEARSAL.serverCreatedAt).toBe('1970-01-01T00:00:00Z');
    expect(REHEARSAL.sourceBinding.sha256).toBe('0'.repeat(64));
  });

  it('binds the current manifest and canonical model digests', () => {
    const manifest = loadAndValidateMigrationManifest();
    expect(REHEARSAL.manifestDigest).toBe(manifest.manifestDigest);
    expect(REHEARSAL.expectedHead).toBe(manifest.document.expectedHead);
    expect(REHEARSAL.modelDigest).toBe(normalizedDesiredSchema(canonicalSchema).digest);
  });

  it('refuses the source binding and authorization until a live window is filled in', () => {
    expect(() => assertRehearsalSourceBinding()).toThrow('guarded source digest');
    const context = {
      operation: 'release-plan',
      credentialClass: 'read-only',
      targetClass: 'disposable-rehearsal',
    } as never;
    expect(() => assertRehearsalAuthorization(context)).toThrow(
      'Rehearsal source binding refused',
    );
    expect(isRegisteredRehearsal(REHEARSAL_FINGERPRINT, {
      resourceId: REHEARSAL_RESOURCE_ID,
      purpose: REHEARSAL.purpose,
    })).toBe(true);
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'release-plan',
        explicitDatabaseUrl: `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`,
        credentialClass: 'read-only',
        processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
      }),
    ).toThrow('Rehearsal source binding refused');
  });

  it('scopes releases to the registered window and names it from the registration', () => {
    const exact = {
      targetClass: 'disposable-rehearsal',
      operation: 'release-plan',
      acceptedOldHead: REHEARSAL.acceptedOldHead,
      expectedNewHead: REHEARSAL.expectedHead,
      manifestDigest: REHEARSAL.manifestDigest,
    };
    expect(() => assertRehearsalReleaseScope(exact)).not.toThrow();
    expect(() =>
      assertRehearsalReleaseScope({ ...exact, acceptedOldHead: '0111_properties_canonical_place_reference_fk.sql' }),
    ).toThrow('registered 0197-to-0200 migration scope');
  });
});

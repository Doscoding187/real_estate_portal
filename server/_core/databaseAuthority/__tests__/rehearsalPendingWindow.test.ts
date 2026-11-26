import { join } from 'node:path';
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
  calculateSourceDigest,
  resolveFrozenSourceRoot,
} from '../rehearsalAuthority';
import { normalizedDesiredSchema } from '../schemaCongruency';

const FROZEN_DIGEST_20261105 = '82cf494573d07bd2679b0ad1c34543a9fa0d426d8d9f2551bd3b9735f261aa24';
const FROZEN_DIR = join(
  process.cwd(),
  'docs/database-authority/evidence/rehearsal-source-20261105',
);

describe('frozen source root selection is test-only and fails closed', () => {
  const base = { PROPERTYLISTIFY_REHEARSAL_SOURCE_ROOT: FROZEN_DIR };
  it('is absent by default and honoured only under NODE_ENV=test with VITEST set', () => {
    expect(resolveFrozenSourceRoot({}, process.cwd())).toBeUndefined();
    expect(
      resolveFrozenSourceRoot({ ...base, NODE_ENV: 'test', VITEST: 'true' }, process.cwd()),
    ).toBe(FROZEN_DIR);
  });
  it('throws (never ignores) when set outside a test run', () => {
    for (const env of [
      { ...base },
      { ...base, NODE_ENV: 'production', VITEST: 'true' },
      { ...base, NODE_ENV: 'development', VITEST: 'true' },
      { ...base, NODE_ENV: 'test' },
      { ...base, NODE_ENV: 'production' },
    ]) {
      expect(() => resolveFrozenSourceRoot(env, process.cwd())).toThrow('only permitted inside a test run');
    }
  });
  it('refuses a directory that is not a frozen evidence copy', () => {
    expect(() =>
      resolveFrozenSourceRoot(
        { PROPERTYLISTIFY_REHEARSAL_SOURCE_ROOT: process.cwd(), NODE_ENV: 'test', VITEST: 'true' },
        process.cwd(),
      ),
    ).toThrow('not a frozen evidence directory');
  });
});

describe('live tree is not bound by the 2026-11-26 placeholder or the frozen digest', () => {
  it('refuses the live source binding; the live digest differs from placeholder and frozen digests', () => {
    const live = calculateSourceDigest(process.cwd());
    expect(live).toMatch(/^[a-f0-9]{64}$/);
    expect(live).not.toBe(REHEARSAL.sourceBinding.sha256);
    expect(live).not.toBe(FROZEN_DIGEST_20261105);
    expect(() => assertRehearsalSourceBinding()).toThrow('guarded source digest');
    // A positive live binding only becomes possible once the live window is
    // registered (registration-only commit that records the recomputed digest).
  });
});

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

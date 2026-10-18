import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertDistributionReferrerIdentity,
  assertDistributionReferrerPreviewPassword,
  assertDistributionReferrerPreviewTarget,
  assertDistributionReferrerPreviewUser,
  classifyDistributionReferrerPreviewUser,
  DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
  DISTRIBUTION_REFERRER_PREVIEW_PASSWORD_VARIABLE,
  DISTRIBUTION_REFERRER_PREVIEW_VERSION,
} from '../dataAdapters/distributionReferrerPreviewFixture';

const EXPECTED_DATABASE = 'listify_wt_distribution_preview_0123456789ab';
const authority = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {
      targetClass: 'disposable-worktree',
      host: '127.0.0.1',
      port: '3307',
      databaseName: EXPECTED_DATABASE,
      worktree: {
        expectedDatabase: EXPECTED_DATABASE,
        ownershipMatches: true,
      },
      ...overrides,
    },
  }) as any;

const expectedUser = {
  id: 501,
  openId: DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
  email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  name: 'Individual Referrer Preview',
  firstName: 'Individual',
  lastName: 'Referrer',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'visitor',
  agencyId: null,
  isSubaccount: 0,
  onboarding_complete: 1,
  onboarding_step: 0,
  passwordHash: '$2a$10$fixture-hash-not-used-by-pure-contract-tests',
};

describe('Distribution individual referrer preview adapter', () => {
  it('declares a versioned individual account fixture and requires schema-congruency verification', () => {
    expect(DISTRIBUTION_REFERRER_PREVIEW_VERSION).toBe(
      'distribution-individual-referrer-preview-v1',
    );
    const source = readFileSync(
      join(
        process.cwd(),
        'server/_core/databaseAuthority/dataAdapters/distributionReferrerPreviewFixture.ts',
      ),
      'utf8',
    );
    expect(source).toContain('assessAuthorizedDatabaseReadiness');
    expect(source).toContain('layers.schemaCongruent.state !== \'ready\'');
    expect(source).not.toMatch(/\b(developments|development_phases|unit_types)\b/);
  });

  it.each([
    ['wrong host', { host: 'localhost' }],
    ['wrong port', { port: '3306' }],
    ['wrong database', { databaseName: 'listify_local' }],
    ['wrong classification', { targetClass: 'production' }],
    [
      'wrong ownership',
      {
        worktree: {
          expectedDatabase: EXPECTED_DATABASE,
          ownershipMatches: false,
        },
      },
    ],
  ])('rejects %s before provisioning', (_label, overrides) => {
    expect(() => assertDistributionReferrerPreviewTarget(authority(overrides))).toThrow();
  });

  it('accepts only an exact-owned disposable worktree target', () => {
    expect(() => assertDistributionReferrerPreviewTarget(authority())).not.toThrow();
  });

  it('requires the configured local demo secret without exposing it', () => {
    expect(() => assertDistributionReferrerPreviewPassword('short')).toThrow(
      DISTRIBUTION_REFERRER_PREVIEW_PASSWORD_VARIABLE,
    );
    expect(() => assertDistributionReferrerPreviewPassword('replace-with-a-password')).toThrow();
    expect(() => assertDistributionReferrerPreviewPassword('machine-local-secret-123')).not.toThrow();
  });

  it('creates a visitor account and reuses only the exact same account', () => {
    expect(classifyDistributionReferrerPreviewUser(null)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerPreviewUser(expectedUser)).toEqual({ state: 'reused' });
    expect(() => assertDistributionReferrerPreviewUser({ ...expectedUser, role: 'agent' })).toThrow(
      'user base role',
    );
    expect(() =>
      assertDistributionReferrerPreviewUser({ ...expectedUser, agencyId: 42 }),
    ).toThrow('user agency association');
    expect(() =>
      assertDistributionReferrerPreviewUser({ ...expectedUser, email: 'referrer@listify.local' }),
    ).toThrow('user email');
  });

  it('requires the one active referrer identity and rejects agent or manager identities', () => {
    const expectedIdentity = {
      id: 71,
      user_id: expectedUser.id,
      identity_type: 'referrer',
      active: 1,
      display_name: 'Individual Referrer Preview',
    };
    expect(() => assertDistributionReferrerIdentity(expectedIdentity)).not.toThrow();
    expect(() =>
      assertDistributionReferrerIdentity({ ...expectedIdentity, identity_type: 'manager' }),
    ).toThrow('identity type');
    expect(() => assertDistributionReferrerIdentity({ ...expectedIdentity, active: 0 })).toThrow(
      'identity active state',
    );
  });

  it('uses a distinct referrer-only email and identity from the agent preview account', () => {
    expect(DISTRIBUTION_REFERRER_PREVIEW_EMAIL).toBe('individual-referrer@listify.local');
    expect(DISTRIBUTION_REFERRER_PREVIEW_EMAIL).not.toBe('agent@listify.local');
    expect(DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID).toBe(
      'distribution-individual-referrer-preview-v1',
    );
  });
});

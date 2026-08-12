import { describe, expect, it } from 'vitest';
import {
  assertPleReviewerPassword,
  assertPleReviewerTarget,
  assertPleReviewerUserRow,
  classifyPleReviewerUser,
  PLE_REVIEWER_EMAIL,
  PLE_REVIEWER_OPEN_ID,
  PLE_REVIEWER_TARGET,
  PLE_REVIEWER_USER_ID,
} from '../dataAdapters/pleReviewerFixture';

const EXPECTED_DATABASE = 'listify_wt_ple_acceptance_0123456789ab';

const authority = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {
      targetClass: 'disposable-worktree',
      host: PLE_REVIEWER_TARGET.host,
      port: PLE_REVIEWER_TARGET.port,
      databaseName: EXPECTED_DATABASE,
      worktree: {
        expectedDatabase: EXPECTED_DATABASE,
        ownershipMatches: true,
      },
      ...overrides,
    },
  }) as any;

const exactReviewer = {
  id: PLE_REVIEWER_USER_ID,
  openId: PLE_REVIEWER_OPEN_ID,
  email: PLE_REVIEWER_EMAIL,
  name: 'PLE Local Review Fixture',
  firstName: 'PLE',
  lastName: 'Review Fixture',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'super_admin',
  agencyId: null,
  isSubaccount: 0,
  onboarding_complete: 1,
  onboarding_step: 0,
  passwordHash: '$2a$10$fixture-hash-not-used-by-pure-contract-tests',
};

describe('PLE reviewer Database Authority adapter', () => {
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
  ])('rejects %s before fixture work', (_label, overrides) => {
    expect(() => assertPleReviewerTarget(authority(overrides))).toThrow();
  });

  it('accepts any exact-owned localhost disposable PLE worktree target', () => {
    expect(() => assertPleReviewerTarget(authority())).not.toThrow();
  });

  it('requires a strong machine-local reviewer secret without exposing it', () => {
    expect(() => assertPleReviewerPassword('short')).toThrow('LOCAL_PLE_REVIEWER_PASSWORD');
    expect(() => assertPleReviewerPassword('replace-with-reviewer-password')).toThrow();
    expect(() => assertPleReviewerPassword('a'.repeat(32))).not.toThrow();
  });

  it('classifies an absent reviewer for creation and an exact reviewer for replay', () => {
    expect(classifyPleReviewerUser(null)).toEqual({ state: 'created' });
    expect(classifyPleReviewerUser(exactReviewer)).toEqual({ state: 'reused' });
  });

  it('fails closed instead of promoting a conflicting ordinary user', () => {
    expect(() => assertPleReviewerUserRow({ ...exactReviewer, role: 'agency_admin' })).toThrow(
      'reviewer role',
    );
    expect(() => assertPleReviewerUserRow({ ...exactReviewer, id: 990004 })).toThrow(
      'reviewer user ID',
    );
    expect(() => assertPleReviewerUserRow({ ...exactReviewer, agencyId: 990002 })).toThrow(
      'reviewer agency association',
    );
    expect(() =>
      assertPleReviewerUserRow({ ...exactReviewer, email: 'other@listify.local' }),
    ).toThrow('reviewer email');
  });

  it('uses the reserved next fixture ID and isolated identity', () => {
    expect({ PLE_REVIEWER_USER_ID, PLE_REVIEWER_EMAIL, PLE_REVIEWER_OPEN_ID }).toEqual({
      PLE_REVIEWER_USER_ID: 990005,
      PLE_REVIEWER_EMAIL: 'ple-reviewer@listify.local',
      PLE_REVIEWER_OPEN_ID: 'ple-reviewer-v1',
    });
  });
});

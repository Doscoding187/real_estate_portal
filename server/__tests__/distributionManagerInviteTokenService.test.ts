import { describe, expect, it } from 'vitest';
import {
  createDistributionManagerInviteToken,
  verifyDistributionManagerInviteToken,
} from '../services/distributionManagerInviteTokenService';

describe('distributionManagerInviteTokenService', () => {
  it('creates and verifies a signed invite token', () => {
    const token = createDistributionManagerInviteToken(
      {
        registrationId: 42,
        email: 'Manager@example.com',
      },
      {
        secret: 'test-secret',
        now: Date.UTC(2026, 2, 11, 12, 0, 0),
        ttlSeconds: 60 * 60 * 24 * 7,
      },
    );

    expect(
      verifyDistributionManagerInviteToken(token, {
        secret: 'test-secret',
        now: Date.UTC(2026, 2, 11, 12, 5, 0),
      }),
    ).toEqual({
      registrationId: 42,
      email: 'manager@example.com',
      issuedAt: 1773230400,
      expiresAt: 1773835200,
    });
  });

  it('accepts invite tokens after the old expiry window', () => {
    const token = createDistributionManagerInviteToken(
      {
        registrationId: 42,
        email: 'manager@example.com',
      },
      {
        secret: 'test-secret',
        now: Date.UTC(2026, 2, 11, 12, 0, 0),
        ttlSeconds: 60,
      },
    );

    expect(
      verifyDistributionManagerInviteToken(token, {
        secret: 'test-secret',
        now: Date.UTC(2026, 2, 11, 12, 2, 0),
      }),
    ).toEqual({
      registrationId: 42,
      email: 'manager@example.com',
      issuedAt: 1773230400,
      expiresAt: 1773230460,
    });
  });
});

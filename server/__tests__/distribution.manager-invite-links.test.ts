import { describe, expect, it } from 'vitest';
import {
  buildDistributionManagerInviteUrl,
  normalizePublicAppOrigin,
} from '../../shared/distributionManagerInvite';

describe('distribution manager invite link helpers', () => {
  it('normalizes a path-bearing public app URL down to its origin', () => {
    expect(
      normalizePublicAppOrigin(
        'https://real-estate-portal-xi.vercel.app/distribution/manager/onboarding?registrationId=1&email=stale%40example.com',
      ),
    ).toBe('https://real-estate-portal-xi.vercel.app');
  });

  it('builds the manager invite URL from the normalized app origin', () => {
    expect(
      buildDistributionManagerInviteUrl(
        'https://real-estate-portal-xi.vercel.app/distribution/manager/onboarding?registrationId=1&email=stale%40example.com',
        {
          registrationId: 42,
          email: 'Manager@example.com',
        },
      ),
    ).toBe(
      'https://real-estate-portal-xi.vercel.app/distribution/manager/onboarding?registrationId=42&email=manager%40example.com',
    );
  });
});

import { describe, expect, it } from 'vitest';

import {
  getAgencyInvitationAcceptancePath,
  getAgencyInvitationAuthHref,
} from './agencyInvitationNavigation';

describe('agency invitation account-entry navigation', () => {
  it('preserves a tokenized acceptance route through the canonical next parameter', () => {
    expect(getAgencyInvitationAcceptancePath('abc123')).toBe('/accept-invitation?token=abc123');
    expect(getAgencyInvitationAuthHref('abc123')).toBe(
      '/login?mode=signin&next=%2Faccept-invitation%3Ftoken%3Dabc123',
    );
  });

  it('encodes the invitation token before embedding it in the internal next route', () => {
    expect(getAgencyInvitationAuthHref('token with & delimiters')).toBe(
      '/login?mode=signin&next=%2Faccept-invitation%3Ftoken%3Dtoken%2Bwith%2B%2526%2Bdelimiters',
    );
  });
});

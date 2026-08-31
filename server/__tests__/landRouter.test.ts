import { describe, expect, it } from 'vitest';

import { landMarketingAuthorityInput } from '../landRouter';

describe('Land authoring router boundaries', () => {
  const agentAuthority = {
    listingId: 7,
    actorType: 'agent' as const,
    authorityType: 'sole_mandate' as const,
    supportingEvidenceId: 11,
  };

  it('requires private mandate evidence for a non-owner marketing authority', () => {
    expect(landMarketingAuthorityInput.safeParse(agentAuthority).success).toBe(true);
    expect(
      landMarketingAuthorityInput.safeParse({
        ...agentAuthority,
        supportingEvidenceId: undefined,
      }).success,
    ).toBe(false);
  });

  it('keeps owner-direct actor and authority types coherent', () => {
    expect(
      landMarketingAuthorityInput.safeParse({
        listingId: 7,
        actorType: 'owner_direct',
        authorityType: 'owner_direct',
      }).success,
    ).toBe(true);
    expect(
      landMarketingAuthorityInput.safeParse({
        listingId: 7,
        actorType: 'owner_direct',
        authorityType: 'sole_mandate',
      }).success,
    ).toBe(false);
  });
});

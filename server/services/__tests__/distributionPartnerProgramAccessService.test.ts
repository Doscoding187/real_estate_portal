import { describe, expect, it } from 'vitest';
import { partnerHasSpecificProgramEntitlement } from '../distributionPartnerProgramAccessService';

const activeTierOneGrant = {
  programId: 21,
  developmentId: 42,
  minTierRequired: 'tier_1',
  accessStatus: 'active',
};

describe('Distribution partner program entitlement', () => {
  it('does not treat an open program or partner identity as an actor-specific grant', () => {
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: undefined,
        currentTier: 'tier_1',
      }),
    ).toBe(false);
  });

  it('allows a partner only with an active grant for the same development and enough tier', () => {
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: activeTierOneGrant,
        currentTier: 'tier_1',
      }),
    ).toBe(true);
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: { ...activeTierOneGrant, developmentId: 43 },
        currentTier: 'tier_1',
      }),
    ).toBe(false);
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: activeTierOneGrant,
        currentTier: null,
      }),
    ).toBe(false);
  });

  it.each(['paused', 'revoked'])('rejects a %s specific program grant', accessStatus => {
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: { ...activeTierOneGrant, accessStatus },
        currentTier: 'tier_4',
      }),
    ).toBe(false);
  });

  it('rejects a grant whose minimum tier exceeds the partner tier', () => {
    expect(
      partnerHasSpecificProgramEntitlement({
        developmentId: 42,
        grant: { ...activeTierOneGrant, minTierRequired: 'tier_3' },
        currentTier: 'tier_2',
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { landMarketingAuthorityInput, landRouter } from '../landRouter';

const callerContext = (user: { id: number; role: string }) =>
  ({ user, req: { headers: {} }, res: {}, requestId: 'land-launch-guard-test' }) as any;

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

  it('blocks Land draft creation and review reads while the first cohort flag is off', async () => {
    const author = landRouter.createCaller(callerContext({ id: 7, role: 'agent' }));
    await expect(
      author.createDraft({
        classification: 'residential_stand',
        title: 'Canonical locality stand',
        description: 'A sufficiently detailed Land description for this test.',
        askingPrice: 900000,
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        parcel: { kind: 'erf', identifier: 'fixture-erf', extentM2: 500 },
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Land is deferred from the first launch cohort'),
    });

    const reviewer = landRouter.createCaller(callerContext({ id: 1, role: 'super_admin' }));
    await expect(reviewer.reviewerQueue()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Land is deferred from the first launch cohort'),
    });
  });
});

import { describe, expect, it } from 'vitest';

import {
  getPrivateListingActionIds,
  getPublicAgentListingActionIds,
} from './agentListingActionIds';

describe('Agent listing action identities', () => {
  it('keeps source listing and public property actions distinct', () => {
    expect(
      getPublicAgentListingActionIds({
        propertyId: 913,
        sourceListingId: 217,
      }),
    ).toEqual({
      editListingId: 217,
      deletePropertyId: 913,
      publicPropertyId: 913,
    });
  });

  it('does not guess an edit identity when a public projection has no source listing', () => {
    expect(
      getPublicAgentListingActionIds({
        propertyId: 913,
        sourceListingId: null,
      }),
    ).toEqual({
      editListingId: null,
      deletePropertyId: 913,
      publicPropertyId: 913,
    });
  });

  it('uses the private listing identity for a draft row', () => {
    expect(getPrivateListingActionIds(217)).toEqual({
      editListingId: 217,
      deleteListingId: 217,
      publicPropertyId: null,
    });
  });
});

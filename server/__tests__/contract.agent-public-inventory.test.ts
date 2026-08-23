import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResolveEligibilities } = vi.hoisted(() => ({
  mockResolveEligibilities: vi.fn(),
}));

vi.mock('../services/publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mockResolveEligibilities,
}));

import { listPublicInventoryForAgent } from '../services/agentPublicProfileService';

/**
 * Chainable query stub for the two candidate-attribution reads. The awaited
 * terminal is always limit() in this service.
 */
function candidateDb(batches: unknown[][]) {
  let cursor = 0;
  const node: any = function chainNode() {};
  for (const method of ['select', 'from', 'where', 'innerJoin', 'orderBy']) {
    node[method] = () => node;
  }
  node.limit = async () => {
    const batch = batches[Math.min(cursor, batches.length - 1)];
    cursor += 1;
    return batch;
  };
  return node;
}

function eligibleResolution(propertyId: number) {
  return {
    property: {
      id: propertyId,
      title: `Public Property ${propertyId}`,
      listingType: 'sale',
      price: '1000000',
      suburb: 'Bryanston',
      city: 'Sandton',
      bedrooms: 3,
      bathrooms: 2,
      mainImage: null,
    },
    images: [],
    media: [],
    authority: 'approved_listing',
    sourceListingId: propertyId + 1000,
    publicAuthority: 'public_property_eligibility',
    publicIdentity: { role: 'agent', provenance: 'agent', name: 'Jane Agent' },
    custody: {
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      agentId: 42,
      agencyId: null,
      reason: 'test-custody',
    },
  } as never;
}

describe('agent public inventory boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes only inventory the canonical public eligibility authority approves', async () => {
    mockResolveEligibilities.mockImplementation(async (ids: readonly number[]) => {
      const resolutions = new Map<number, unknown>();
      for (const id of ids) {
        if (Number(id) === 7) resolutions.set(Number(id), eligibleResolution(Number(id)));
      }
      return resolutions;
    });

    const db = candidateDb([
      [{ id: 5 }, { id: 7 }],
      [{ id: 8 }, { id: 9 }],
    ]);

    const cards = await listPublicInventoryForAgent(db, 42);

    expect(mockResolveEligibilities).toHaveBeenCalledWith([5, 7, 8, 9]);
    expect(cards.map(card => Number(card.id))).toEqual([7]);
    expect(cards[0].title).toBe('Public Property 7');

    const cardRecord = cards[0] as Record<string, unknown>;
    for (const forbidden of ['ownerId', 'sourceListingId', 'custody']) {
      expect(Object.keys(cardRecord)).not.toContain(forbidden);
    }
  });

  it('returns no inventory when the eligibility authority approves nothing', async () => {
    mockResolveEligibilities.mockResolvedValue(new Map());

    const db = candidateDb([[{ id: 5 }], []]);

    await expect(listPublicInventoryForAgent(db, 42)).resolves.toEqual([]);
  });

  it('appears once when attribution discovers a property through both paths', async () => {
    mockResolveEligibilities.mockImplementation(async (ids: readonly number[]) => {
      const resolutions = new Map<number, unknown>();
      for (const id of ids) {
        resolutions.set(Number(id), eligibleResolution(Number(id)));
      }
      return resolutions;
    });

    // Same property (id 7) attributed directly AND via its source listing.
    const db = candidateDb([[{ id: 7 }], [{ id: 7 }, { id: 9 }]]);

    const cards = await listPublicInventoryForAgent(db, 42);

    expect(mockResolveEligibilities).toHaveBeenCalledWith([7, 9]);
    expect(cards.map(card => Number(card.id))).toEqual([7, 9]);
    const seen = new Set(cards.map(card => Number(card.id)));
    expect(seen.size).toBe(cards.length);
  });

  it('queries both direct agent attribution and source-listing attribution', async () => {
    mockResolveEligibilities.mockResolvedValue(new Map());

    const selectCalls: unknown[] = [];
    const node: any = function chainNode() {};
    node.select = (...args: unknown[]) => {
      selectCalls.push(args[0]);
      return node;
    };
    node.from = () => node;
    node.where = () => node;
    node.innerJoin = () => node;
    node.orderBy = () => node;
    node.limit = async () => [];

    await listPublicInventoryForAgent(node, 42);

    expect(selectCalls).toHaveLength(2);
  });
});

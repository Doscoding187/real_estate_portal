import { describe, expect, it } from 'vitest';
import { resolvePropertyForListing } from '../inventoryLinkResolver';

function fakeDb(rows: Array<{ id: number }>) {
  const query: any = {
    select: () => query,
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => rows,
  };
  return query;
}

const listing = { id: 42, ownerId: 7, agentId: null, title: 'Source', address: 'Address' };

describe('inventory source projection authority', () => {
  it('resolves exactly one source projection', async () => {
    await expect(resolvePropertyForListing(fakeDb([{ id: 900 }]) as any, listing)).resolves.toEqual({
      listingId: 42, propertyId: 900, isResolved: true, matchReason: 'source_listing_id',
    });
  });

  it('fails closed when the source projection is missing', async () => {
    await expect(resolvePropertyForListing(fakeDb([]) as any, listing)).resolves.toMatchObject({
      listingId: 42, propertyId: null, isResolved: false, matchReason: 'missing_source_listing_id',
    });
  });

  it('fails closed when duplicate projections exist', async () => {
    await expect(resolvePropertyForListing(fakeDb([{ id: 900 }, { id: 901 }]) as any, listing)).resolves.toMatchObject({
      listingId: 42, propertyId: null, isResolved: false, matchReason: 'duplicate_source_listing_id',
    });
  });
});

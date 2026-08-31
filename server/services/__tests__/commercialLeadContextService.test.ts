import { describe, expect, it, vi } from 'vitest';
import {
  commercialLeadContextCandidateIds,
  loadCommercialLeadContexts,
} from '../commercialLeadContextService';

function databaseFor(rows: unknown[]) {
  const where = vi.fn(async () => rows);
  const innerJoin = vi.fn(() => ({ innerJoin, where }));
  const from = vi.fn(() => ({ innerJoin, where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as any, select, where };
}

describe('Commercial lead operational context', () => {
  it('only considers lead records with a listing but no generic property projection', () => {
    expect(
      commercialLeadContextCandidateIds([
        { id: 101, listingId: 501, propertyId: null },
        { id: 102, listingId: 502, propertyId: 91 },
        { id: 103, listingId: null, propertyId: null },
        { id: 104, listingId: 504, propertyId: undefined },
        { id: 104, listingId: 504, propertyId: undefined },
      ]),
    ).toEqual([101, 104]);
  });

  it('projects only coherent canonical lease context and preserves the captured IDs', async () => {
    const { db } = databaseFor([
      {
        leadId: 101,
        listingId: 501,
        listingSlug: 'cape-town-office-suite',
        listingTitle: 'Cape Town office suite',
        listingPropertyType: 'commercial',
        listingCity: 'Cape Town',
        listingProvince: 'Western Cape',
        commercialAssetId: 601,
        assetName: 'Harbour Exchange',
        commercialSpaceId: 701,
        spaceIdentifier: 'Suite 14A',
        spaceClass: 'office',
        rentableAreaM2: '215.50',
        usableAreaM2: '188.25',
        commercialAvailabilityId: 801,
        availabilityState: 'available_confirmed',
        transactionType: 'lease',
      },
      {
        leadId: 102,
        listingId: 502,
        listingSlug: 'invalid-commercial-context',
        listingTitle: 'Invalid context',
        listingPropertyType: 'house',
        listingCity: 'Cape Town',
        listingProvince: 'Western Cape',
        commercialAssetId: 602,
        assetName: 'Wrong authority',
        commercialSpaceId: 702,
        spaceIdentifier: 'Unit 2',
        spaceClass: 'office',
        rentableAreaM2: '80',
        usableAreaM2: null,
        commercialAvailabilityId: 802,
        availabilityState: 'available_confirmed',
        transactionType: 'lease',
      },
      {
        leadId: 103,
        listingId: 503,
        listingSlug: 'sale-context',
        listingTitle: 'Sale context',
        listingPropertyType: 'commercial',
        listingCity: 'Cape Town',
        listingProvince: 'Western Cape',
        commercialAssetId: 603,
        assetName: 'Future sale asset',
        commercialSpaceId: 703,
        spaceIdentifier: 'Unit 3',
        spaceClass: 'retail',
        rentableAreaM2: '80',
        usableAreaM2: null,
        commercialAvailabilityId: 803,
        availabilityState: 'available_confirmed',
        transactionType: 'sale',
      },
      {
        leadId: 104,
        listingId: 504,
        listingSlug: 'mixed-graph-context',
        listingTitle: 'Mixed graph context',
        listingPropertyType: 'commercial',
        listingCity: 'Cape Town',
        listingProvince: 'Western Cape',
        commercialAssetId: 604,
        assetName: 'Wrong graph asset',
        commercialSpaceId: 704,
        availabilitySpaceId: 999,
        spaceAssetId: 604,
        spaceIdentifier: 'Unit 4',
        spaceClass: 'retail',
        rentableAreaM2: '80',
        usableAreaM2: null,
        commercialAvailabilityId: 804,
        availabilityState: 'available_confirmed',
        transactionType: 'lease',
      },
    ]);

    const result = await loadCommercialLeadContexts(db, [101, 102, 103]);

    expect([...result.keys()]).toEqual([101]);
    expect(result.has(104)).toBe(false);
    expect(result.get(101)).toEqual({
      listingId: 501,
      listingSlug: 'cape-town-office-suite',
      listingTitle: 'Cape Town office suite',
      commercialAssetId: 601,
      assetName: 'Harbour Exchange',
      commercialSpaceId: 701,
      spaceIdentifier: 'Suite 14A',
      commercialAvailabilityId: 801,
      useType: 'office',
      rentableAreaM2: 215.5,
      usableAreaM2: 188.25,
      availabilityState: 'available_confirmed',
      transactionType: 'lease',
      city: 'Cape Town',
      province: 'Western Cape',
    });
  });

  it('does not query the database when no canonical commercial candidates exist', async () => {
    const { db, select } = databaseFor([]);

    await expect(loadCommercialLeadContexts(db, [])).resolves.toEqual(new Map());
    expect(select).not.toHaveBeenCalled();
  });
});

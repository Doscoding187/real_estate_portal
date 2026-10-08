/** Separate semantic/data census; never repeats the timed load windows. */
import { readFileSync, writeFileSync } from 'node:fs';
import { and, eq, like, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, shutdownDb } from '../../server/db-connection';
import { listings, properties } from '../../drizzle/schema';
import { appRouter } from '../../server/routers';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';

const OUTPUT =
  'docs/architecture/launch-readiness-and-product-convergence/evidence/national-place-search-measurement-2026-10-08';
const enabled = process.env.NATIONAL_PLACE_POSTFLIGHT === '1';
(enabled ? describe : describe.skip)('national search postflight', () => {
  it('audits approved projections, physical cardinalities and all province rentals', async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    expect(authority.context.targetClass).toBe('disposable-worktree');
    authorizeDatabaseOperation(authority);
    const database = await getDb();
    const inventory: Array<{
      listingId: number;
      propertyId: number;
      placeId: string;
      listingType: string;
      provinceId: string;
      label: string;
    }> = JSON.parse(readFileSync(`${OUTPUT}/synthetic-inventory.json`, 'utf8'));
    expect(inventory).toHaveLength(120);
    try {
      for (const entry of inventory) {
        const [source] = await database
          .select()
          .from(listings)
          .where(eq(listings.id, entry.listingId));
        const [projection] = await database
          .select()
          .from(properties)
          .where(eq(properties.id, entry.propertyId));
        expect(source).toMatchObject({
          status: 'published',
          approvalStatus: 'approved',
          canonicalPlaceId: entry.placeId,
          provinceId: null,
          cityId: null,
          suburbId: null,
          locationId: null,
        });
        expect(projection).toMatchObject({
          status: 'available',
          sourceListingId: entry.listingId,
          canonicalPlaceId: entry.placeId,
          provinceId: null,
          cityId: null,
          suburbId: null,
          locationId: null,
        });
      }
      const sourceCounts = await database
        .select({ status: listings.status, count: sql<number>`count(*)` })
        .from(listings)
        .where(like(listings.title, 'National diagnostic %'))
        .groupBy(listings.status);
      const projectionCounts = await database
        .select({ status: properties.status, count: sql<number>`count(*)` })
        .from(properties)
        .where(like(properties.title, 'National diagnostic %'))
        .groupBy(properties.status);
      const [allListings] = await database.select({ count: sql<number>`count(*)` }).from(listings);
      const [allProperties] = await database
        .select({ count: sql<number>`count(*)` })
        .from(properties);
      expect(Number(sourceCounts.find(row => row.status === 'published')?.count)).toBe(120);
      expect(Number(projectionCounts.find(row => row.status === 'available')?.count)).toBe(120);
      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: {} as any,
        requestId: 'national-place-postflight',
      });
      const rentProof = [];
      for (const provinceId of new Set(inventory.map(entry => entry.provinceId))) {
        const expected = inventory.filter(
          entry => entry.provinceId === provinceId && entry.listingType === 'rent',
        );
        expect(expected.length).toBeGreaterThan(0);
        const result = await caller.properties.searchPublicInventory({
          canonicalPlaceId: provinceId,
          listingType: 'rent',
          propertyType: 'house',
          listingSource: 'manual',
          pageSize: 20,
        });
        expect(result.total).toBe(expected.length);
        expect(result.canonicalPlaceContext?.canonicalPlaceId).toBe(provinceId);
        for (const card of result.cards) {
          const entry = expected.find(entry => entry.propertyId === card.propertyId);
          expect(entry).toBeTruthy();
          expect(card.canonicalPlaceId).toBe(entry!.placeId);
          expect(card.suburb || card.city).toBe(entry!.label);
          expect(card.href).toBe(`/property/${entry!.propertyId}`);
        }
        rentProof.push({
          provinceId,
          province: result.canonicalPlaceContext?.label,
          total: result.total,
          propertyIds: result.cards.map(card => card.propertyId),
        });
      }
      expect(rentProof).toHaveLength(9);
      writeFileSync(
        `${OUTPUT}/postflight.json`,
        JSON.stringify(
          {
            targetFingerprint: authority.context.targetFingerprintHash,
            approvedProjectionCount: inventory.length,
            allListingCount: Number(allListings.count),
            allPropertyCount: Number(allProperties.count),
            syntheticSourceCounts: sourceCounts,
            syntheticProjectionCounts: projectionCounts,
            allNineProvinceRentProof: rentProof,
            protectedTargetAccessed: false,
          },
          null,
          2,
        ) + '\n',
      );
    } finally {
      await shutdownDb();
    }
  }, 60000);
});

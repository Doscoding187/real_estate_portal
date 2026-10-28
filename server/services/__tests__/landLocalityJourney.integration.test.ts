import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  landAssetParcels,
  landAssets,
  landEvidenceDocuments,
  landListingLinks,
  landMarketingAuthorities,
  landParcels,
  landReviewCases,
  landReviewEvents,
  listingMedia,
  listings,
  place,
  placeName,
  placeRelationship,
  users,
} from '../../../drizzle/schema';
import { landPublicRouter } from '../../landPublicRouter';
import { landRouter } from '../../landRouter';
import { getDb, shutdownDb } from '../../db-connection';
import { executePlace } from '../placeDiscoveryService';

const runDisposableJourney = process.env.LAND_LOCALITY_E2E === '1';

describe.runIf(runDisposableJourney)('Land locality create, publish and search journey', () => {
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  let ownerUserId: number | null = null;
  let reviewerUserId: number | null = null;
  let listingId: number | null = null;
  let landAssetId: number | null = null;
  let parcelId: number | null = null;

  const context = (user: { id: number; role: string } | null) => ({
    user,
    req: { headers: {} },
    res: {},
    requestId: 'land-locality-journey-e2e',
  }) as any;

  beforeAll(async () => {
    // Run with `pnpm test:authority` so DATABASE_URL is injected for the exact
    // registered disposable worktree target; normal unit tests remain DB-free.
    const connection = await getDb();
    if (!connection) throw new Error('The disposable worktree database is unavailable.');
    db = connection;

    const suffix = randomUUID();
    const owner = await db.insert(users).values({
      email: `land-author-${suffix}@example.invalid`,
      name: 'Land locality integration author',
      role: 'agent',
    });
    ownerUserId = Number((owner as any)[0]?.insertId ?? (owner as any).insertId);
    const reviewer = await db.insert(users).values({
      email: `land-reviewer-${suffix}@example.invalid`,
      name: 'Land locality integration reviewer',
      role: 'super_admin',
    });
    reviewerUserId = Number((reviewer as any)[0]?.insertId ?? (reviewer as any).insertId);
  }, 30_000);

  afterAll(async () => {
    if (db && listingId && landAssetId && parcelId) {
      const reviewCases = await db
        .select({ id: landReviewCases.id })
        .from(landReviewCases)
        .where(eq(landReviewCases.listingId, listingId));
      if (reviewCases.length) {
        await db.delete(landReviewEvents).where(
          inArray(landReviewEvents.reviewCaseId, reviewCases.map(item => item.id)),
        );
      }
      await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId));
      await db.delete(landEvidenceDocuments).where(eq(landEvidenceDocuments.landAssetId, landAssetId));
      await db.delete(landMarketingAuthorities).where(eq(landMarketingAuthorities.landAssetId, landAssetId));
      await db.delete(landReviewCases).where(eq(landReviewCases.listingId, listingId));
      await db.delete(landListingLinks).where(eq(landListingLinks.listingId, listingId));
      await db.delete(landAssetParcels).where(eq(landAssetParcels.landAssetId, landAssetId));
      await db.delete(landParcels).where(eq(landParcels.id, parcelId));
      await db.delete(landAssets).where(eq(landAssets.id, landAssetId));
      await db.delete(listings).where(eq(listings.id, listingId));
    }
    if (db && ownerUserId) await db.delete(users).where(eq(users.id, ownerUserId));
    if (db && reviewerUserId) await db.delete(users).where(eq(users.id, reviewerUserId));
    await shutdownDb();
  });

  it('creates a locality-assigned draft, approves it through Land review, and finds it by that Place ID', async () => {
    const [cityParent] = await db
      .select({ placeId: place.placeId })
      .from(place)
      .innerJoin(placeName, eq(placeName.placeId, place.placeId))
      .where(
        and(
          eq(placeName.name, 'Johannesburg'),
          eq(placeName.nameRole, 'preferred_public'),
          eq(placeName.nameState, 'active'),
          eq(placeName.isSearchable, 1),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
          eq(place.searchScope, 'metro_city'),
        ),
      )
      .limit(1);
    if (!cityParent) throw new Error('Johannesburg is unavailable in the prepared canonical Place data.');

    const candidates = await db
      .select({ placeId: place.placeId })
      .from(placeRelationship)
      .innerJoin(place, eq(place.placeId, placeRelationship.fromPlaceId))
      .innerJoin(placeName, eq(placeName.placeId, place.placeId))
      .where(
        and(
          eq(placeRelationship.toPlaceId, cityParent.placeId),
          eq(placeRelationship.relationshipType, 'settlement_within'),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
          eq(place.searchScope, 'locality'),
          eq(placeName.nameRole, 'preferred_public'),
          eq(placeName.nameState, 'active'),
          eq(placeName.isSearchable, 1),
        ),
      )
      .limit(100);
    let localityPlaceId: string | undefined;
    for (const candidate of candidates) {
      const resolution = await executePlace(candidate.placeId, db);
      if (resolution.ok && resolution.execution.scope === 'locality') {
        localityPlaceId = candidate.placeId;
        break;
      }
    }
    if (!localityPlaceId) throw new Error('No executable canonical locality is available in the prepared reference data.');

    const suffix = randomUUID();
    const author = landRouter.createCaller(context({ id: ownerUserId!, role: 'agent' }));
    const draft = await author.createDraft({
      classification: 'residential_stand',
      title: `Locality Land test ${suffix.slice(0, 8)}`,
      description: 'A prepared integration listing for the Land locality journey.',
      askingPrice: 1250000,
      canonicalPlaceId: localityPlaceId,
      parcel: {
        kind: 'erf',
        identifier: `Land journey ${suffix}`,
        extentM2: 550,
        geometryConfidence: 'approximate',
      },
    });
    listingId = draft.listingId;
    landAssetId = draft.landAssetId;
    parcelId = draft.parcelId;

    const [storedParcel] = await db
      .select({ canonicalPlaceId: landParcels.canonicalPlaceId })
      .from(landParcels)
      .where(eq(landParcels.id, parcelId));
    const [storedListing] = await db
      .select({ canonicalPlaceId: listings.canonicalPlaceId, slug: listings.slug })
      .from(listings)
      .where(eq(listings.id, listingId));
    expect(storedParcel?.canonicalPlaceId).toBe(localityPlaceId);
    expect(storedListing?.canonicalPlaceId).toBe(localityPlaceId);

    const [evidence] = await db
      .insert(landEvidenceDocuments)
      .values({
        landAssetId,
        evidenceType: 'mandate',
        privateStorageKey: `private/land-e2e/${suffix}.pdf`,
        originalFileName: 'test-mandate.pdf',
        uploadedByUserId: ownerUserId,
      })
      .$returningId();
    await db.insert(listingMedia).values({
      listingId,
      mediaType: 'image',
      originalUrl: 'https://example.invalid/land-locality-e2e.jpg',
      originalFileName: 'land-locality-e2e.jpg',
      isPrimary: 1,
      displayOrder: 0,
      processingStatus: 'completed',
    });
    await author.declareAuthority({
      listingId,
      actorType: 'agent',
      authorityType: 'sole_mandate',
      supportingEvidenceId: evidence.id,
    });
    await author.submit({ listingId });

    const reviewer = landRouter.createCaller(context({ id: reviewerUserId!, role: 'super_admin' }));
    await reviewer.review({ listingId, action: 'start' });
    await reviewer.review({ listingId, action: 'approve' });

    const publicCaller = landPublicRouter.createCaller(context(null));
    const results = await publicCaller.search({ canonicalPlaceId: localityPlaceId });
    expect(results.map(result => result.listingId)).toContain(listingId);
    const guideAreas = await publicCaller.guideAreas({ canonicalPlaceId: cityParent.placeId });
    const guideArea = guideAreas.find(area => area.placeId === localityPlaceId);
    expect(guideArea?.listingCount).toBeGreaterThanOrEqual(1);
    expect(guideArea?.href).toBe(`/plots-and-land?canonicalPlaceId=${localityPlaceId}`);
    const detail = await publicCaller.detail({ slug: storedListing.slug });
    expect(detail?.listingId).toBe(listingId);
    expect(detail?.locality).toBe(
      (await db
        .select({ name: placeName.name })
        .from(placeName)
        .where(
          and(
            eq(placeName.placeId, localityPlaceId),
            eq(placeName.nameRole, 'preferred_public'),
            eq(placeName.nameState, 'active'),
          ),
        )
        .limit(1))[0]?.name,
    );
  }, 30_000);
});

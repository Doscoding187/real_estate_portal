import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ListingLifecycleError,
  resolveListingLifecycleTransition,
} from '../listingLifecycleTransition';
import { resolveClosedPublicPropertyNotice } from '../closedPublicPropertyNotice';
import {
  resolveApprovedPublicProperties,
  resolveApprovedPublicProperty,
} from '../approvedPublicPropertyService';

const publishedSale = { status: 'published', action: 'sell', publishedAt: '2026-01-01' };
const publishedRent = { status: 'published', action: 'rent', publishedAt: '2026-01-01' };

const reject = (change: any, listing: any) => {
  try {
    resolveListingLifecycleTransition(change, listing);
  } catch (error) {
    expect(error).toBeInstanceOf(ListingLifecycleError);
    return (error as ListingLifecycleError).message;
  }
  throw new Error('expected rejection');
};

describe('listing lifecycle transitions', () => {
  it('marks a published sale sold and a published rental let, using existing enum values', () => {
    expect(resolveListingLifecycleTransition('sold', publishedSale)).toEqual({
      noop: false,
      nextStatus: 'sold',
    });
    expect(resolveListingLifecycleTransition('let', publishedRent)).toEqual({
      noop: false,
      nextStatus: 'rented',
    });
  });

  it('rejects Let on a sale and Sold on a rental with a clear message', () => {
    expect(reject('let', publishedSale)).toMatch(/Only rental listings can be marked as let/);
    expect(reject('sold', publishedRent)).toMatch(/Only sale listings can be marked as sold/);
  });

  it('is idempotent for repeat requests', () => {
    expect(resolveListingLifecycleTransition('sold', { ...publishedSale, status: 'sold' }).noop).toBe(
      true,
    );
    expect(resolveListingLifecycleTransition('let', { ...publishedRent, status: 'rented' }).noop).toBe(
      true,
    );
    expect(
      resolveListingLifecycleTransition('unpublish', { ...publishedSale, status: 'archived' }).noop,
    ).toBe(true);
  });

  it('only closes or unpublishes listings that were published', () => {
    expect(reject('sold', { ...publishedSale, status: 'draft' })).toMatch(/Only a published/);
    expect(reject('let', { ...publishedRent, status: 'pending_review' })).toMatch(/Only a published/);
    expect(reject('unpublish', { ...publishedSale, status: 'rejected' })).toMatch(
      /Only a published, sold or let/,
    );
  });

  it('lets a sold or let listing be unpublished to correct a mistake', () => {
    expect(
      resolveListingLifecycleTransition('unpublish', { ...publishedSale, status: 'sold' }).nextStatus,
    ).toBe('archived');
    expect(
      resolveListingLifecycleTransition('unpublish', { ...publishedRent, status: 'rented' })
        .nextStatus,
    ).toBe('archived');
  });

  it('republish returns an unpublished, previously published listing to a private draft', () => {
    expect(
      resolveListingLifecycleTransition('republish', { ...publishedSale, status: 'archived' }),
    ).toEqual({ noop: false, nextStatus: 'draft' });
    expect(reject('republish', publishedSale)).toMatch(/Only an unpublished listing/);
    expect(reject('republish', { status: 'archived', action: 'sell', publishedAt: null })).toMatch(
      /Only an unpublished listing/,
    );
  });

  it('never acts on a private revision', () => {
    expect(reject('sold', { ...publishedSale, revisionOfListingId: 5 })).toMatch(/revision/);
  });
});

describe('closed (sold / let) public notice', () => {
  const closedListing = (status: string) => ({
    id: 7,
    status,
    approvalStatus: 'approved',
    title: 'Sea-view flat',
    suburb: 'Sea Point',
    city: 'Cape Town',
    propertyType: 'apartment',
    revisionOfListingId: null,
  });
  const source = (propertyStatus: string, listingStatus: string) => ({
    getPropertyById: async () => ({ id: 3, status: propertyStatus, sourceListingId: 7 }),
    getListingById: async () => closedListing(listingStatus),
  });

  it('shows only a minimal Sold / Let notice and exposes no price, agent or enquiry data', async () => {
    const sold = await resolveClosedPublicPropertyNotice(3, source('sold', 'sold'));
    expect(sold).toEqual({
      status: 'sold',
      title: 'Sea-view flat',
      location: 'Sea Point, Cape Town',
      listingIntent: 'sale',
    });
    const let_ = await resolveClosedPublicPropertyNotice(3, source('rented', 'rented'));
    expect(let_?.status).toBe('let');
    expect(let_?.listingIntent).toBe('rent');
  });

  it('returns null for unpublished, live or inconsistent records (ordinary not-available state)', async () => {
    expect(await resolveClosedPublicPropertyNotice(3, source('archived', 'archived'))).toBeNull();
    expect(await resolveClosedPublicPropertyNotice(3, source('available', 'published'))).toBeNull();
    expect(await resolveClosedPublicPropertyNotice(3, source('sold', 'archived'))).toBeNull();
  });
});

describe('sold, let and unpublished homes are excluded from public supply', () => {
  const listing = {
    id: 7,
    status: 'sold',
    approvalStatus: 'approved',
    revisionOfListingId: null,
    propertyType: 'apartment',
  };
  for (const status of ['sold', 'rented', 'archived']) {
    it(`single resolver rejects a ${status} projection (detail, enquiry and eligibility gate)`, async () => {
      const result = await resolveApprovedPublicProperty(3, {
        getPropertyById: async () => ({ id: 3, status, sourceListingId: 7 }),
        getPropertyImages: async () => [],
        getListingById: async () => listing,
        getListingMedia: async () => [],
      });
      expect(result).toBeNull();
    });

    it(`batch resolver (search, rails, counts, place statistics) rejects a ${status} projection`, async () => {
      const result = await resolveApprovedPublicProperties([3], {
        getPropertiesByIds: async () => [{ id: 3, status, sourceListingId: 7 }],
        getPropertyImagesByPropertyIds: async () => [],
        getListingsByIds: async () => [listing],
        getListingMediaByListingIds: async () => [],
      });
      expect(result.size).toBe(0);
    });
  }

  it('keeps search, sitemap and enquiry on the eligibility gate that those statuses fail', () => {
    const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), 'utf8');
    expect(read('server/routes/sitemap.ts')).toContain(
      "const LIVE_PROPERTY_STATUSES = ['available', 'published'] as const;",
    );
    expect(read('server/services/propertySearchService.ts')).toContain(
      "conditions.push(or(eq(properties.status, 'available'), eq(properties.status, 'published'))!);",
    );
    const lead = read('server/services/publicLeadCaptureService.ts');
    expect(lead).toContain('await resolvePublicPropertyEligibility(propertyId)');
    expect(lead).toContain('Property not available for public enquiries.');
    expect(read('server/services/placeGuideService.ts')).toContain(
      'resolvePublicPropertyEligibilities(rows.map(row => Number(row.id)))',
    );
  });
});

describe('setLifecycle router contract', () => {
  const router = readFileSync(path.resolve(process.cwd(), 'server/listingRouter.ts'), 'utf8');

  it('requires owner / agency-admin / super-admin custody and audits every change', () => {
    const block = router.slice(router.indexOf('setLifecycle: protectedProcedure'));
    const body = block.slice(0, block.indexOf('archive: protectedProcedure'));
    expect(body).toContain('assertListingContentCustody');
    expect(body).toContain('Not authorized to change the status of this listing');
    expect(body).toContain("action: `listing.${input.change}`");
    expect(body).toContain('db.republishListing');
    expect(body).toContain('db.setListingLifecycleStatus');
  });
});

import { describe, expect, it } from 'vitest';
import { publicLocationPrecision, publicParcelComposition, toPublicLandDto } from '../landPublicService';

const passport = { trustState: 'listed_with_disclosures' as const, claims: [], assertions: [] };
const row = { listingId: 7, slug: 'north-ridge', title: 'North Ridge', description: null, askingPrice: '500000', city: 'Pretoria', province: 'Gauteng', classification: 'residential_stand', intendedUse: 'Residential', precision: 'approximate' as const, assetId: 99, agentId: 4, agencyId: 6, extentM2: '1200', parcelCount: 1 };

describe('public Land projection', () => {
  it('is an explicit allow-list and excludes private evidence, audit, conflict and parcel fields', () => {
    const dto = toPublicLandDto({ ...row, storageKey: 'private/land/99/title.pdf', signedUrl: 'secret', reviewerComment: 'private', conflictNotes: 'private', parcelIdentifier: 'ERF 1' } as typeof row, passport);
    expect(dto).toMatchObject({ slug: 'north-ridge', href: '/land/north-ridge', parcelCount: 1 });
    for (const forbidden of ['storageKey', 'signedUrl', 'reviewerComment', 'conflictNotes', 'parcelIdentifier', 'assetId']) expect(dto).not.toHaveProperty(forbidden);
  });

  it('communicates parcel composition and location precision without inventing cadastral certainty', () => {
    expect(publicParcelComposition(1)).toBe('This site comprises 1 parcel.');
    expect(publicParcelComposition(3)).toBe('This site comprises 3 parcels.');
    expect(publicLocationPrecision('approximate')).toBe('Approximate site location');
    expect(publicLocationPrecision('exact')).toBe('Known site position');
  });
});

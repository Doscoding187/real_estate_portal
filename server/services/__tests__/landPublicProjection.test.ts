import { describe, expect, it } from 'vitest';
import {
  projectPublicLandMedia,
  publicLocationPrecision,
  publicParcelComposition,
  toPublicLandDto,
} from '../landPublicService';

const passport = { trustState: 'listed_with_disclosures' as const, claims: [], assertions: [] };
const row = {
  listingId: 7,
  slug: 'north-ridge',
  title: 'North Ridge',
  description: null,
  askingPrice: '500000',
  city: 'Pretoria',
  province: 'Gauteng',
  classification: 'residential_stand',
  intendedUse: 'Residential',
  precision: 'approximate' as const,
  assetId: 99,
  assetLifecycleStatus: 'active',
  agentId: 4,
  agencyId: 6,
  authorityExpiresAt: null,
  extentM2: '1200',
  parcelCount: 1,
};

describe('public Land projection', () => {
  it('is an explicit allow-list and excludes private evidence, audit, conflict and parcel fields', () => {
    const dto = toPublicLandDto({ ...row, storageKey: 'private/land/99/title.pdf', signedUrl: 'secret', reviewerComment: 'private', conflictNotes: 'private', parcelIdentifier: 'ERF 1', claimedValue: { private: true } } as typeof row, passport);
    expect(dto).toMatchObject({ slug: 'north-ridge', href: '/land/north-ridge', parcelCount: 1 });
    for (const forbidden of ['storageKey', 'signedUrl', 'reviewerComment', 'conflictNotes', 'parcelIdentifier', 'claimedValue', 'assetId', 'assetLifecycleStatus', 'agentId', 'agencyId', 'authorityExpiresAt']) expect(dto).not.toHaveProperty(forbidden);
  });

  it('projects only completed public images and exposes a resolved cover URL', () => {
    const media = projectPublicLandMedia(
      [
        { id: 1, mediaType: 'image', originalUrl: 'properties/7/cover.jpg', processingStatus: 'completed', isPrimary: 1, displayOrder: 2 },
        { id: 2, mediaType: 'pdf', originalUrl: 'properties/7/plan.pdf', processingStatus: 'completed', displayOrder: 1 },
        { id: 3, mediaType: 'image', originalUrl: 'properties/7/pending.jpg', processingStatus: 'pending', displayOrder: 0 },
      ],
      key => `https://media.example/${key}`,
    );
    const dto = toPublicLandDto(row, passport, media);
    expect(media).toEqual([
      { url: 'https://media.example/properties/7/cover.jpg', isPrimary: true, displayOrder: 2 },
    ]);
    expect(dto).toMatchObject({ coverImageUrl: 'https://media.example/properties/7/cover.jpg' });
  });

  it('communicates parcel composition and location precision without inventing cadastral certainty', () => {
    expect(publicParcelComposition(1)).toBe('This site comprises 1 parcel.');
    expect(publicParcelComposition(3)).toBe('This site comprises 3 parcels.');
    expect(publicLocationPrecision('approximate')).toBe('Approximate site location');
    expect(publicLocationPrecision('exact')).toBe('Known site position');
  });
});

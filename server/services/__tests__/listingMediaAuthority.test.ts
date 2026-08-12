import { describe, expect, it } from 'vitest';
import {
  confirmListingMediaUploadToken,
  createListingMediaUploadToken,
  verifyListingMediaUploadToken,
} from '../listingMediaAuthority';

const secret = 'listing-media-test-secret';

function makeToken(overrides: Record<string, unknown> = {}) {
  return createListingMediaUploadToken(
    {
      key: 'properties/42/interior.jpg',
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileName: 'interior.jpg',
      fileSize: 1024,
      userId: 7,
      listingId: 42,
      ...overrides,
    } as any,
    { secret, now: 1_000, ttlSeconds: 300 },
  );
}

describe('listing media upload authority', () => {
  it('binds a confirmed upload to its user, listing, key and type', () => {
    const token = makeToken({ confirmed: true });
    expect(
      verifyListingMediaUploadToken(token, {
        secret,
        now: 1_100,
        userId: 7,
        listingId: 42,
        key: 'properties/42/interior.jpg',
        mediaType: 'image',
        requireConfirmed: true,
      }),
    ).toMatchObject({ userId: 7, listingId: 42, mediaType: 'image', confirmed: true });
  });

  it('rejects an unconfirmed or cross-user token', () => {
    const token = makeToken();
    expect(() =>
      verifyListingMediaUploadToken(token, { secret, now: 1_100, requireConfirmed: true }),
    ).toThrow('not been confirmed');
    expect(() => verifyListingMediaUploadToken(token, { secret, now: 1_100, userId: 8 })).toThrow(
      'does not belong to this user',
    );
  });

  it('confirms the token without trusting client processing metadata', () => {
    const token = makeToken();
    const confirmed = confirmListingMediaUploadToken(token, 2048, { secret, now: 1_100 });
    expect(
      verifyListingMediaUploadToken(confirmed, {
        secret,
        now: 1_200,
        requireConfirmed: true,
      }),
    ).toMatchObject({ confirmed: true, fileSize: 2048 });
  });

  it('rejects provider/storage keys outside the governed listing scope', () => {
    expect(() =>
      createListingMediaUploadToken(
        {
          key: 'properties/43/foreign.jpg',
          mediaType: 'image',
          contentType: 'image/jpeg',
          fileName: 'foreign.jpg',
          userId: 7,
          listingId: 42,
        },
        { secret },
      ),
    ).toThrow('outside the governed scope');
  });
});

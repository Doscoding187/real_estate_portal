import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockVerifyListingMediaUploadToken } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockVerifyListingMediaUploadToken: vi.fn(),
}));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));
vi.mock('../listingMediaAuthority', () => ({
  verifyListingMediaUploadToken: mockVerifyListingMediaUploadToken,
}));

import { attachLandMarketingMedia } from '../landWorkflowService';

function databaseForMedia(existingMedia: unknown[] = []) {
  const selections = [
    [{ id: 9, ownerId: 77 }],
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [{ id: 14, state: 'draft' }],
    existingMedia,
  ];
  const values = vi.fn().mockResolvedValue([{ insertId: 501 }]);

  return {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = {
        from: vi.fn(() => query),
        where: vi.fn(() => query),
        limit: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
    insert: vi.fn(() => ({ values })),
    values,
  };
}

describe('Land marketing media authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyListingMediaUploadToken.mockReturnValue({
      key: 'properties/9/site.jpg',
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileName: 'site.jpg',
      fileSize: 2048,
    });
  });

  it('records a confirmed public image as Land marketing media', async () => {
    const db = databaseForMedia();
    mockGetDb.mockResolvedValue(db);

    await expect(
      attachLandMarketingMedia({ listingId: 9, userId: 77, uploadToken: 'confirmed-token' }),
    ).resolves.toEqual({ mediaId: 501 });

    expect(mockVerifyListingMediaUploadToken).toHaveBeenCalledWith('confirmed-token', {
      userId: 77,
      listingId: 9,
      requireConfirmed: true,
    });
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 9,
        mediaType: 'image',
        originalUrl: 'properties/9/site.jpg',
        processingStatus: 'completed',
        isPrimary: 1,
      }),
    );
  });

  it('is idempotent when a confirmed upload is retried', async () => {
    const db = databaseForMedia([
      {
        id: 88,
        mediaType: 'image',
        originalUrl: 'properties/9/site.jpg',
        processedUrl: 'properties/9/site.jpg',
        processingStatus: 'completed',
        isPrimary: 1,
        displayOrder: 0,
      },
    ]);
    mockGetDb.mockResolvedValue(db);

    await expect(
      attachLandMarketingMedia({ listingId: 9, userId: 77, uploadToken: 'confirmed-token' }),
    ).resolves.toEqual({ mediaId: 88 });
    expect(db.values).not.toHaveBeenCalled();
  });

  it('does not turn a document upload into public Land marketing', async () => {
    const db = databaseForMedia();
    mockGetDb.mockResolvedValue(db);
    mockVerifyListingMediaUploadToken.mockReturnValue({
      key: 'properties/9/mandate.pdf',
      mediaType: 'pdf',
      contentType: 'application/pdf',
      fileName: 'mandate.pdf',
      fileSize: 2048,
    });

    await expect(
      attachLandMarketingMedia({ listingId: 9, userId: 77, uploadToken: 'confirmed-token' }),
    ).rejects.toThrow('Land marketing media must be a public image; documents belong in private evidence.');
    expect(db.values).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const { mockGeneratePresignedUploadUrl } = vi.hoisted(() => ({
  mockGeneratePresignedUploadUrl: vi.fn(),
}));

vi.mock('./_core/mediaStorage', () => ({
  getMediaStorageAdapter: () => 's3',
  resolveMediaDeliveryUrl: (key: string) => `https://media.example.test/${key}`,
  createMediaStorageKey: vi.fn(),
  buildLocalMediaPublicUrl: vi.fn(),
  buildLocalMediaUploadUrl: vi.fn(),
}));

vi.mock('./_core/imageUpload', () => ({
  generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
}));

import { uploadRouter } from './uploadRouter';

describe('legacy upload.presign S3 scope boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeneratePresignedUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.test/signed-put',
      key: 'properties/draft-42/asset.png',
    });
  });

  it('ignores a client-supplied property namespace and uses the authenticated draft scope', async () => {
    const caller = uploadRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 42, role: 'agent' },
      requestId: 'upload-router-s3-scope-test',
    } as unknown as TrpcContext);

    await expect(
      caller.presign({
        filename: 'asset.png',
        contentType: 'image/png',
        propertyId: '../../other-tenant',
      }),
    ).resolves.toMatchObject({ key: 'properties/draft-42/asset.png' });

    expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith(
      'asset.png',
      'image/png',
      'draft-42',
    );
  });
});

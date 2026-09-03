import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from '../_core/context';

const {
  getDbMock,
  eligibilityMock,
  getTranscodingStatusMock,
  validateVideoFileMock,
} = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  eligibilityMock: vi.fn(),
  getTranscodingStatusMock: vi.fn(),
  validateVideoFileMock: vi.fn(),
}));

vi.mock('../db', () => ({ db: {}, getDb: getDbMock }));
vi.mock('../services/explorePublishingEligibilityService', () => ({
  getExplorePublishingEligibility: eligibilityMock,
  getExplorePublishingAccessMessage: () => 'Explore publisher access is required.',
  assertExploreReferenceOwnership: vi.fn(),
  ExplorePublishingAuthorizationError: class ExplorePublishingAuthorizationError extends Error {},
}));
vi.mock('../services/videoProcessingService', () => ({
  processUploadedVideo: vi.fn(),
  getTranscodingStatus: getTranscodingStatusMock,
  validateVideoFile: validateVideoFileMock,
}));

import { exploreVideoUploadRouter } from '../exploreVideoUploadRouter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function createCaller(user: { id: number; role: string } | null) {
  return exploreVideoUploadRouter.createCaller({
    user,
    req: { headers: {} },
    res: {},
    requestId: 'explore-video-upload-boundary-test',
  } as unknown as TrpcContext);
}

const editorialEligibility = {
  allowed: true as const,
  publisherType: 'editorial' as const,
  publisherId: 9,
  creatorType: 'user' as const,
  creatorId: 9,
  agencyId: null,
  agentId: null,
  developerId: null,
};

describe('Explore video upload boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDbMock.mockResolvedValue({});
  });

  it('rejects non-publishers before they can inspect video processing or object metadata', async () => {
    eligibilityMock.mockResolvedValue({ allowed: false, reason: 'unsupported_role' });
    const caller = createCaller({ id: 44, role: 'agent' });

    await expect(caller.getTranscodingStatus({ exploreVideoId: 12 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      caller.validateVideoFile({
        videoUrl: 'https://cdn.example.com/explore/videos/other-account.mp4',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(getTranscodingStatusMock).not.toHaveBeenCalled();
    expect(validateVideoFileMock).not.toHaveBeenCalled();
  });

  it('keeps processing inspection available to the governed editorial publisher', async () => {
    eligibilityMock.mockResolvedValue(editorialEligibility);
    getTranscodingStatusMock.mockResolvedValue({ status: 'not_started' });
    validateVideoFileMock.mockResolvedValue({ valid: true, errors: [] });
    const caller = createCaller({ id: 9, role: 'super_admin' });

    await expect(caller.getTranscodingStatus({ exploreVideoId: 12 })).resolves.toEqual({
      success: true,
      data: { status: 'not_started' },
    });
    await expect(
      caller.validateVideoFile({ videoUrl: 'https://cdn.example.com/explore/videos/9-tour.mp4' }),
    ).resolves.toEqual({ valid: true, errors: [] });
  });

  it('does not expose browser-controlled analytics or transcoding writes', () => {
    const trpcRouter = readRepoFile('server/exploreVideoUploadRouter.ts');
    const legacyRouter = readRepoFile('server/routes/exploreVideoUpload.ts');
    const videoService = readRepoFile('server/services/exploreVideoService.ts');

    expect(trpcRouter).not.toContain('updateAnalytics:');
    expect(trpcRouter).not.toContain('updateTranscodedUrls:');
    expect(legacyRouter).not.toContain("router.post('/analytics'");
    expect(videoService).not.toContain('export async function updateVideoAnalytics');
  });
});

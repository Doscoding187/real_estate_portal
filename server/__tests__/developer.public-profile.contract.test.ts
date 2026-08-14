import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockGetBrandProfileById,
  mockGetBrandProfileBySlug,
  mockGetPublicBrandProfileById,
  mockGetPublicBrandProfileBySlug,
  mockListPublicDevelopments,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetBrandProfileById: vi.fn(),
  mockGetBrandProfileBySlug: vi.fn(),
  mockGetPublicBrandProfileById: vi.fn(),
  mockGetPublicBrandProfileBySlug: vi.fn(),
  mockListPublicDevelopments: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/cataloguePublisherService', () => ({
  getPublisherById: mockGetBrandProfileById,
  cataloguePublisherService: {
    getPublisherBySlug: mockGetBrandProfileBySlug,
    getPublicPublisherById: mockGetPublicBrandProfileById,
    getPublicPublisherBySlug: mockGetPublicBrandProfileBySlug,
  },
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    listPublicDevelopments: mockListPublicDevelopments,
  },
}));

import { developerRouter } from '../developerRouter';

const publicPlatformBrand = {
  id: 44,
  brandName: 'Acme Homes',
  slug: 'acme-homes',
  logoUrl: 'https://cdn.example.com/acme.png',
  about: 'South African residential developer',
  foundedYear: 2004,
  headOfficeLocation: 'Sandton, Gauteng',
  websiteUrl: 'https://acme.example.com',
  publicContactEmail: 'sales@acme.example.com',
  isContactVerified: 1,
  isVisible: 1,
  authorityKind: 'platform_reference',
  developerOrganisationId: null,
  linkedDeveloperAccountId: null,
};

describe('developer public profile contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBrandProfileBySlug.mockResolvedValue(publicPlatformBrand);
    mockGetBrandProfileById.mockResolvedValue(publicPlatformBrand);
    mockGetPublicBrandProfileBySlug.mockResolvedValue(publicPlatformBrand);
    mockGetPublicBrandProfileById.mockResolvedValue(publicPlatformBrand);
    mockListPublicDevelopments.mockResolvedValue([
      {
        id: 77,
        slug: 'acme-sandton',
        name: 'Acme Sandton',
        isPublished: true,
        approvalStatus: 'approved',
      },
    ]);
  });

  it('resolves a visible brand into the public profile shape used by discovery', async () => {
    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await expect(caller.getPublicDeveloperBySlug({ slug: 'acme-homes' })).resolves.toMatchObject({
      id: 44,
      type: 'publisher',
      name: 'Acme Homes',
      emails: ['sales@acme.example.com'],
      isClaimable: false,
      stats: {
        isVerified: true,
        isTrusted: false,
        establishedYear: 2004,
      },
    });
  });

  it('uses the canonical published-development filter for a public brand', async () => {
    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await expect(
      caller.getPublicDevelopmentsForPublisher({ cataloguePublisherId: 44 }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 77, slug: 'acme-sandton' }),
    ]);

    expect(mockListPublicDevelopments).toHaveBeenCalledWith({ cataloguePublisherId: 44 });
  });

  it('does not expose an invisible brand', async () => {
    mockGetPublicBrandProfileById.mockResolvedValue({ ...publicPlatformBrand, isVisible: 0 });
    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await expect(
      caller.getPublicDevelopmentsForPublisher({ cataloguePublisherId: 44 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

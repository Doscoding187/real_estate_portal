import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchPublicDevelopments } = vi.hoisted(() => ({
  mockSearchPublicDevelopments: vi.fn(),
}));

vi.mock('../db', () => ({
  searchDevelopers: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    searchPublicDevelopments: mockSearchPublicDevelopments,
  },
}));

import { developerRouter } from '../developerRouter';

describe('developer.searchDevelopments canonical discovery contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPublicDevelopments.mockResolvedValue([
      {
        id: 42,
        name: 'Harbour Heights',
        slug: 'harbour-heights',
        canonicalRoute: '/development/harbour-heights',
        city: 'Cape Town',
        province: 'Western Cape',
        developerId: 7,
        developmentType: 'residential',
        status: 'selling',
      },
    ]);
  });

  it('preserves the public procedure contract while delegating to canonical discovery', async () => {
    const caller = developerRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as unknown as Parameters<typeof developerRouter.createCaller>[0]);

    await expect(
      caller.searchDevelopments({ query: 'Harbour', developerId: 7, limit: 10 }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 42,
        slug: 'harbour-heights',
        canonicalRoute: '/development/harbour-heights',
      }),
    ]);

    expect(mockSearchPublicDevelopments).toHaveBeenCalledWith({
      query: 'Harbour',
      developerId: 7,
      limit: 10,
    });
  });
});

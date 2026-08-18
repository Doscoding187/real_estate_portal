import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

import { agentRouter } from '../agentRouter';

function createCaller() {
  return agentRouter.createCaller({
    user: null,
    req: {} as never,
    res: {} as never,
    requestId: 'agent-public-route-contract',
  } as never);
}

function publicProfileDatabase(rows: unknown[]) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    })),
  };
}

describe('canonical public agent profile route resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the approved agent public slug for numeric compatibility URLs', async () => {
    mockGetDb.mockResolvedValue(
      publicProfileDatabase([
        {
          id: 42,
          slug: 'jane-agent',
          displayName: 'Jane Agent',
          firstName: 'Jane',
          lastName: 'Agent',
        },
      ]),
    );

    await expect(createCaller().getPublicProfileRouteById({ agentId: 42 })).resolves.toEqual({
      slug: 'jane-agent',
    });
  });

  it('derives the same stable canonical slug used by the public microsite for an approved legacy row', async () => {
    mockGetDb.mockResolvedValue(
      publicProfileDatabase([
        {
          id: 84,
          slug: null,
          displayName: null,
          firstName: 'Sam',
          lastName: 'Agent',
        },
      ]),
    );

    await expect(createCaller().getPublicProfileRouteById({ agentId: 84 })).resolves.toEqual({
      slug: 'sam-agent-84',
    });
  });

  it('does not manufacture a route for an unavailable agent', async () => {
    mockGetDb.mockResolvedValue(publicProfileDatabase([]));

    await expect(createCaller().getPublicProfileRouteById({ agentId: 404 })).resolves.toBeNull();
  });

  it('rejects invalid numeric identities before querying public profile data', async () => {
    const database = publicProfileDatabase([]);
    mockGetDb.mockResolvedValue(database);

    await expect(createCaller().getPublicProfileRouteById({ agentId: 0 })).rejects.toThrow();
    expect(database.select).not.toHaveBeenCalled();
  });
});

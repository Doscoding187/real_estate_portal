import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  findAgentsServingLocation,
  type AgentAreaRecommendationDto,
} from '../services/agentPublicProfileService';

function makeQueueDb(results: Array<Record<string, unknown>[] | Record<string, unknown>>) {
  const queue = [...results];
  const takeNext = () => queue.shift();
  const chain = () => {
    const api: Record<string, unknown> = {};
    const terminal = () => Promise.resolve(takeNext() ?? []);
    api.from = () => api;
    api.leftJoin = () => api;
    api.innerJoin = () => api;
    api.where = () => api;
    api.orderBy = () => api;
    api.limit = () => terminal();
    api.then = (resolve_: (value: unknown) => void, reject_: (error: unknown) => void) =>
      terminal().then(resolve_, reject_);
    return api;
  };
  return {
    db: {
      select: vi.fn(() => chain()),
    },
  };
}

const SUBURB_ROW = [{ name: 'Bryanston' }];

const baseAgent = {
  id: 33,
  userId: 70,
  slug: 'amina-nkosi-33',
  firstName: 'Amina',
  lastName: 'Nkosi',
  profileImage: 'amina.jpg',
  isVerified: 1,
  areasServed: 'Bryanston, Sandton',
  agencyName: null,
  agencyLogo: null,
  agencyVerified: null,
};

describe('agents serving location authority', () => {
  it('returns an approved entitled solo agent claiming the exact area', async () => {
    const { db } = makeQueueDb([
      SUBURB_ROW,
      [baseAgent],
      [{ ownerId: 70, status: 'active', currentPeriodEnd: '2099-01-01 00:00:00' }],
    ]);
    const result: AgentAreaRecommendationDto[] = await findAgentsServingLocation(
      db as never,
      'suburb',
      501,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 33,
      slug: 'amina-nkosi-33',
      firstName: 'Amina',
      lastName: 'Nkosi',
      profileImage: 'amina.jpg',
      isVerified: true,
      agencyName: null,
    });
  });

  it('excludes an unentitled solo agent affiliated with an unverified agency', async () => {
    const { db } = makeQueueDb([
      SUBURB_ROW,
      [{ ...baseAgent, userId: 71, isVerified: 0, agencyVerified: 0 }],
    ]);
    const result = await findAgentsServingLocation(db as never, 'suburb', 501);
    expect(result).toEqual([]);
  });

  it('includes an unbadged agent whose agency is verified', async () => {
    const { db } = makeQueueDb([
      SUBURB_ROW,
      [
        {
          ...baseAgent,
          userId: 72,
          isVerified: 0,
          agencyName: 'North Star Realty',
          agencyLogo: 'northstar.png',
          agencyVerified: 1,
        },
      ],
    ]);
    const result = await findAgentsServingLocation(db as never, 'suburb', 501);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      isVerified: false,
      agencyName: 'North Star Realty',
      agencyLogoUrl: 'northstar.png',
    });
  });

  it('fails closed on partial or non-exact area claims', async () => {
    const { db } = makeQueueDb([
      SUBURB_ROW,
      [{ ...baseAgent, areasServed: 'Bryanston Ext, Sandton City' }],
    ]);
    const result = await findAgentsServingLocation(db as never, 'suburb', 501);
    expect(result).toEqual([]);
  });

  it('returns nothing for an unknown or retired location', async () => {
    const { db } = makeQueueDb([[]]);
    const result = await findAgentsServingLocation(db as never, 'suburb', 404);
    expect(result).toEqual([]);
  });

  it('keeps the router wired to the canonical resolver instead of the retired stub', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/monetizationRouter.ts'),
      'utf8',
    );
    expect(source).toContain('findAgentsServingLocation');
    expect(source).not.toContain('getRecommendedAgents called but disabled');
  });
});

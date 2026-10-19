import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  distributionAgentAccess,
  distributionAgentTiers,
  distributionIdentities,
  distributionPrograms,
} from '../../../drizzle/schema';
import {
  assertPartnerDevelopmentProgramAccess,
  listPartnerAccessibleDevelopmentIds,
} from '../distributionPartnerProgramAccessService';

function createFakeDb(input: { identityRows?: unknown[]; candidateRows?: unknown[] }) {
  const tablesRead: unknown[] = [];
  const db = {
    tablesRead,
    select: () => ({
      from: (table: unknown) => {
        tablesRead.push(table);
        const identityRows = input.identityRows ?? [];
        const candidateRows = input.candidateRows ?? [];
        const chain: any = {
          where: () => chain,
          innerJoin: () => chain,
          limit: () =>
            Promise.resolve(table === distributionIdentities ? identityRows : candidateRows),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(table === distributionPrograms ? candidateRows : []).then(resolve),
        };
        return chain;
      },
    }),
  };
  return db;
}

function referrerActor() {
  return { userId: 101, role: 'visitor' };
}

describe('Distribution partner opportunity availability', () => {
  it('rejects an actor without an active referrer identity', async () => {
    const db = createFakeDb({ identityRows: [] });
    await expect(
      listPartnerAccessibleDevelopmentIds({ db, actor: referrerActor() }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns every active referral-enabled opportunity without reading access grants', async () => {
    const db = createFakeDb({
      identityRows: [{ id: 1 }],
      candidateRows: [
        { programId: 7, developmentId: 42 },
        { programId: 8, developmentId: 43 },
      ],
    });

    const ids = await listPartnerAccessibleDevelopmentIds({
      db,
      actor: referrerActor(),
    });

    expect(ids).toEqual([42, 43]);
    expect(db.tablesRead).not.toContain(distributionAgentAccess);
    expect(db.tablesRead).not.toContain(distributionAgentTiers);
  });

  it('deduplicates development ids across candidate programs', async () => {
    const db = createFakeDb({
      identityRows: [{ id: 1 }],
      candidateRows: [
        { programId: 7, developmentId: 42 },
        { programId: 9, developmentId: 42 },
      ],
    });

    await expect(
      listPartnerAccessibleDevelopmentIds({ db, actor: referrerActor() }),
    ).resolves.toEqual([42]);
  });

  it('returns no ids when an empty development filter is requested', async () => {
    const db = createFakeDb({
      identityRows: [{ id: 1 }],
      candidateRows: [{ programId: 7, developmentId: 42 }],
    });

    await expect(
      listPartnerAccessibleDevelopmentIds({
        db,
        actor: referrerActor(),
        requestedDevelopmentIds: [],
      }),
    ).resolves.toEqual([]);
  });

  it('lets a super admin inspect availability without a referrer identity', async () => {
    const db = createFakeDb({
      identityRows: [],
      candidateRows: [{ programId: 7, developmentId: 42 }],
    });

    await expect(
      listPartnerAccessibleDevelopmentIds({
        db,
        actor: { userId: 1, role: 'super_admin' },
      }),
    ).resolves.toEqual([42]);
  });

  it('rejects a development outside the active referral network', async () => {
    const db = createFakeDb({
      identityRows: [{ id: 1 }],
      candidateRows: [{ programId: 7, developmentId: 42 }],
    });

    await expect(
      assertPartnerDevelopmentProgramAccess({ db, actor: referrerActor(), developmentId: 99 }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      assertPartnerDevelopmentProgramAccess({ db, actor: referrerActor(), developmentId: 42 }),
    ).resolves.toBeUndefined();
  });
});

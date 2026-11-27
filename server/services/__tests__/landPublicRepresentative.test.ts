import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db-connection', () => ({ getDb: vi.fn() }));

import { publicLandRepresentative } from '../landPublicService';

function fakeDb(...results: unknown[][]) {
  const queue = [...results];
  const query: any = {
    from: () => query,
    where: () => query,
    limit: async () => queue.shift() ?? [],
  };
  return { select: () => query } as any;
}

describe('publicLandRepresentative', () => {
  it('returns only public name, agency and profile link', async () => {
    const db = fakeDb(
      [{ firstName: 'Test', lastName: 'Agent', displayName: null, slug: 'test-agent', agencyId: 5, phone: '082', email: 'x@y.z' }],
      [{ name: 'Test Realty' }],
    );
    expect(await publicLandRepresentative(db, 33, null)).toEqual({ name: 'Test Agent', agency: 'Test Realty', href: '/agents/test-agent' });
  });

  it('returns null without an agent', async () => {
    expect(await publicLandRepresentative(fakeDb(), null, null)).toBeNull();
  });
});

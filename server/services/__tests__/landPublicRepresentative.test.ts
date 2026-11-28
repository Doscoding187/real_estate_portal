import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db-connection', () => ({ getDb: vi.fn() }));
vi.mock('../agencyMembershipService', () => ({ listCurrentActiveAgencyMembershipsByAgentId: vi.fn(async () => new Map()) }));

import { publicDeclaredDetail, publicLandRepresentative, PUBLIC_DECLARED_DETAIL_MAX } from '../landPublicService';

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
      [{ status: 'approved', firstName: 'Test', lastName: 'Agent', displayName: null, slug: 'test-agent', agencyId: 5, phone: '082', email: 'x@y.z' }],
      [{ name: 'Test Realty' }],
    );
    expect(await publicLandRepresentative(db, 33, null)).toEqual({ name: 'Test Agent', agency: 'Test Realty', href: '/agents/test-agent' });
  });

  it('omits an agent who is not approved', async () => {
    const db = fakeDb([{ status: 'suspended', firstName: 'Test', lastName: 'Agent', displayName: null, slug: 's', agencyId: null }]);
    expect(await publicLandRepresentative(db, 33, null)).toBeNull();
  });

  it('returns null without an agent', async () => {
    expect(await publicLandRepresentative(fakeDb(), null, null)).toBeNull();
  });
});

describe('publicDeclaredDetail', () => {
  it('caps length and exposes only plain asserted strings', () => {
    expect(publicDeclaredDetail('asserted', 'x'.repeat(1000))).toHaveLength(PUBLIC_DECLARED_DETAIL_MAX);
    expect(publicDeclaredDetail('asserted', { a: 1 })).toBeNull();
    expect(publicDeclaredDetail('unknown', 'text')).toBeNull();
    expect(publicDeclaredDetail('asserted', '  ')).toBeNull();
  });
});

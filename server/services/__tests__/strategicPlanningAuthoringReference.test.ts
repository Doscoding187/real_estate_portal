import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
}));

import { getAuthoringReferenceData } from '../strategicPlanningService';

function makeDb(rows: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(async () => rows);
  return chain;
}

describe('strategic planning authoring reference data', () => {
  beforeEach(() => {
    mockGetDb.mockReset();
  });

  it('returns the four canonical metric definitions without enumerating owners', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValue(db);

    const result = await getAuthoringReferenceData();

    expect(result.metrics.map(metric => metric.key)).toEqual([
      'active_agents',
      'active_agencies',
      'active_developers',
      'active_listings',
    ]);
    expect(result.metrics.every(metric => metric.unit === 'count')).toBe(true);
    expect(result.owners).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('returns a minimal, bounded owner projection for a search', async () => {
    const db = makeDb([
      {
        id: 7,
        name: null,
        firstName: 'Amina',
        lastName: 'Khan',
        email: 'amina@example.test',
        passwordHash: 'must-never-leak',
      },
    ]);
    mockGetDb.mockResolvedValue(db);

    const result = await getAuthoringReferenceData({ ownerSearch: 'amina' });

    expect(result.owners).toEqual([
      { id: 7, displayName: 'Amina Khan', email: 'amina@example.test' },
    ]);
    expect(result.owners[0]).not.toHaveProperty('passwordHash');
    expect(db.limit).toHaveBeenCalledWith(20);
  });

  it('supports explicit owner IDs without requiring a broad search', async () => {
    const db = makeDb([
      { id: 11, name: 'Founder', firstName: null, lastName: null, email: null },
    ]);
    mockGetDb.mockResolvedValue(db);

    const result = await getAuthoringReferenceData({ ownerIds: [11, 11, -1] });

    expect(result.owners).toEqual([{ id: 11, displayName: 'Founder', email: null }]);
    expect(db.where).toHaveBeenCalled();
    expect(db.limit).toHaveBeenCalledWith(1);
  });
});

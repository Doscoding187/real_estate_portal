import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockSelect, mockFrom, mockLeftJoin, mockWhere, mockLimit } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockLeftJoin: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

import { getPublicDevelopmentBySlug } from '../developmentService';

function collectSqlParts(
  value: unknown,
  parts: { columns: string[]; params: unknown[] } = { columns: [], params: [] },
) {
  if (!value || typeof value !== 'object') return parts;

  const chunk = value as any;
  if (chunk.constructor?.name === 'Param') {
    parts.params.push(chunk.value);
    return parts;
  }

  if (typeof chunk.name === 'string' && typeof chunk.columnType === 'string') {
    parts.columns.push(chunk.name);
    return parts;
  }

  if (Array.isArray(chunk.queryChunks)) {
    chunk.queryChunks.forEach((child: unknown) => collectSqlParts(child, parts));
  }

  return parts;
}

describe('developmentService public development contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ leftJoin: mockLeftJoin });
    mockLeftJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockGetDb.mockResolvedValue({ select: mockSelect });
  });

  it('requires slug lookups to be published and approved before public exposure', async () => {
    const result = await getPublicDevelopmentBySlug('demo-development');

    expect(result).toBeNull();
    const whereClause = mockWhere.mock.calls[0]?.[0];
    const parts = collectSqlParts(whereClause);

    expect(parts.columns).toEqual(
      expect.arrayContaining(['slug', 'isPublished', 'approval_status']),
    );
    expect(parts.params).toEqual(
      expect.arrayContaining(['demo-development', 1, 'approved']),
    );
  });

  it('requires id lookups to be published and approved before public exposure', async () => {
    const result = await getPublicDevelopmentBySlug('42');

    expect(result).toBeNull();
    const whereClause = mockWhere.mock.calls[0]?.[0];
    const parts = collectSqlParts(whereClause);

    expect(parts.columns).toEqual(expect.arrayContaining(['id', 'isPublished', 'approval_status']));
    expect(parts.params).toEqual(expect.arrayContaining([42, 1, 'approved']));
  });
});

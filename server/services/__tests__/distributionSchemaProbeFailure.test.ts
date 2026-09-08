import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('../../db-connection', () => ({ getDb: mocks.getDb }));
import { getDistributionSchemaReadinessSnapshot } from '../runtimeSchemaCapabilities';

afterEach(() => vi.resetAllMocks());

describe('distribution schema probe failures', () => {
  it.each(
    [
      [],
      [{}],
      [{ count_value: null }],
      [{ count_value: '' }],
      [{ count_value: -1 }],
      [{ count_value: true }],
      [{ count_value: 0.5 }],
      [{ count_value: '9007199254740992' }],
      [{ unrelated: 0 }],
    ].map(rows => ({ rows })),
  )('rejects malformed metadata rows $rows', async ({ rows }) => {
    mocks.getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([rows]) });
    await expect(getDistributionSchemaReadinessSnapshot({ forceRefresh: true })).rejects.toThrow(
      'malformed evidence',
    );
  });
  it('accepts a valid zero count as absent schema', async () => {
    mocks.getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([[{ count_value: '0' }]]) });
    const result = await getDistributionSchemaReadinessSnapshot({ forceRefresh: true });
    expect(result.ready).toBe(false);
    expect(result.missingItems).toContain('developments');
  });
  it('propagates connection failure instead of reporting absent tables', async () => {
    const failure = new Error('Database target invalid');
    mocks.getDb.mockRejectedValue(failure);
    await expect(getDistributionSchemaReadinessSnapshot({ forceRefresh: true })).rejects.toBe(
      failure,
    );
  });
  it('propagates metadata permission failure instead of caching a missing schema', async () => {
    const failure = new Error('Metadata permission denied');
    mocks.getDb.mockResolvedValue({ execute: vi.fn().mockRejectedValue(failure) });
    await expect(getDistributionSchemaReadinessSnapshot({ forceRefresh: true })).rejects.toBe(
      failure,
    );
    mocks.getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([[{ count_value: 1 }]]) });
    await expect(
      getDistributionSchemaReadinessSnapshot({ forceRefresh: true }),
    ).resolves.toMatchObject({ ready: true, missingItems: [] });
  });
});

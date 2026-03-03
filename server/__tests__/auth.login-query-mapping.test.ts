import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockSelect, mockFrom, mockWhere, mockLimit } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
}));

vi.mock('../db-connection', () => ({
  getDb: mockGetDb,
  _db: null,
}));

import { AUTH_LOGIN_USER_COLUMNS, getUserByEmail } from '../db';

describe('getUserByEmail query mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockGetDb.mockResolvedValue({ select: mockSelect });
    mockLimit.mockResolvedValue([]);
  });

  it('selects auth-safe columns including passwordHash and excluding password', async () => {
    await getUserByEmail('agent@example.com');

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledWith(AUTH_LOGIN_USER_COLUMNS);
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).toContain('passwordHash');
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).not.toContain('password');
  });
});

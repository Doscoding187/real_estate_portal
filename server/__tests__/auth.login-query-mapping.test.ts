import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockSelect, mockFrom, mockWhere, mockLimit, mockUpdate, mockSet } = vi.hoisted(
  () => ({
    mockGetDb: vi.fn(),
    mockSelect: vi.fn(),
    mockFrom: vi.fn(),
    mockWhere: vi.fn(),
    mockLimit: vi.fn(),
    mockUpdate: vi.fn(),
    mockSet: vi.fn(),
  }),
);

vi.mock('../db-connection', () => ({
  getDb: mockGetDb,
  _db: null,
}));

import {
  AUTH_LOGIN_USER_COLUMNS,
  AUTH_SESSION_USER_COLUMNS,
  getUserByEmail,
  getUserById,
  updateUserPassword,
} from '../db';

describe('getUserByEmail query mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockGetDb.mockResolvedValue({ select: mockSelect, update: mockUpdate });
    mockLimit.mockResolvedValue([]);
  });

  it('selects auth-safe columns including passwordHash and excluding password', async () => {
    await getUserByEmail('agent@example.com');

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledWith(AUTH_LOGIN_USER_COLUMNS);
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).toContain('passwordHash');
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).toContain('sessionVersion');
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).not.toContain('password');
    expect(Object.keys(AUTH_LOGIN_USER_COLUMNS)).not.toContain('emailVerificationToken');
  });

  it('fails closed when canonical session columns cannot be read', async () => {
    const schemaError = Object.assign(new Error('Unknown canonical users column'), {
      code: 'ER_BAD_FIELD_ERROR',
    });

    mockLimit.mockRejectedValueOnce(schemaError);

    await expect(getUserById(42)).rejects.toBe(schemaError);

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledWith(AUTH_SESSION_USER_COLUMNS);
  });

  it('throws when multiple accounts share the same email', async () => {
    mockLimit.mockResolvedValue([
      { id: 1, email: 'agent@example.com', passwordHash: 'hash', role: 'visitor' },
      { id: 2, email: 'agent@example.com', passwordHash: 'hash', role: 'super_admin' },
    ]);

    await expect(getUserByEmail('agent@example.com')).rejects.toThrow(
      'Multiple accounts found for this email. Please contact support.',
    );
  });

  it('increments the canonical session version when a password changes', async () => {
    await updateUserPassword(42, 'replacement-password-hash');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const setPayload = mockSet.mock.calls[0][0];
    expect(setPayload).toMatchObject({
      passwordHash: 'replacement-password-hash',
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    });
    expect(setPayload).toHaveProperty('sessionVersion');
  });
});

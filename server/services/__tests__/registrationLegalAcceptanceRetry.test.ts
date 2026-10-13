import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('../../db-connection', () => ({
  getDb: vi.fn(async () => ({ transaction })),
}));
import { createRegistrationWithLegalAcceptance } from '../registrationLegalAcceptanceService';

const user = {
  email: 'retry@example.invalid',
  passwordHash: 'synthetic-no-login',
  loginMethod: 'email',
  role: 'visitor' as const,
};
const choice = { bundleId: 'synthetic-copy', termsAccepted: true };
const deadlock = Object.assign(new Error('Transaction rolled back'), {
  cause: { errno: 1213 },
});
beforeEach(() => {
  transaction.mockReset();
});

describe('registration transaction recovery boundary', () => {
  it('restarts a confirmed deadlock victim in a fresh repeatable-read transaction', async () => {
    transaction.mockRejectedValueOnce(deadlock).mockResolvedValueOnce({
      userId: 7,
      evidenceId: 'synthetic-evidence',
    });
    await expect(createRegistrationWithLegalAcceptance(user, choice)).resolves.toEqual({
      userId: 7,
      evidenceId: 'synthetic-evidence',
    });
    expect(transaction).toHaveBeenCalledTimes(2);
    for (const [, isolation] of transaction.mock.calls)
      expect(isolation).toEqual({ isolationLevel: 'repeatable read' });
  });

  it('stops after the bounded deadlock budget', async () => {
    transaction.mockRejectedValue(deadlock);
    await expect(createRegistrationWithLegalAcceptance(user, choice)).rejects.toBe(deadlock);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it.each([2013, 1205, 1062, undefined])(
    'does not replay an ambiguous outcome or non-deadlock error: %s',
    async errno => {
      const error = Object.assign(new Error('Unconfirmed transaction outcome'), {
        cause: { errno },
      });
      transaction.mockRejectedValue(error);
      await expect(createRegistrationWithLegalAcceptance(user, choice)).rejects.toBe(error);
      expect(transaction).toHaveBeenCalledOnce();
    },
  );
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  existing: vi.fn(),
  created: vi.fn(),
  send: vi.fn(),
}));
vi.mock('../db', () => ({ getUserByEmail: mocks.existing, getUserById: mocks.created }));
vi.mock('../services/registrationLegalAcceptanceService', () => ({
  createRegistrationWithLegalAcceptance: mocks.create,
}));
vi.mock('../_core/email', () => ({
  sendVerificationEmail: mocks.send,
  sendPasswordResetEmail: vi.fn(),
}));
import { AuthService } from '../_core/auth';

describe('registration commit and email boundary', () => {
  let service: AuthService;
  beforeEach(() => {
    service = new AuthService();
    vi.spyOn(service, 'hashPassword').mockResolvedValue('synthetic-hash');
    mocks.existing.mockResolvedValue(undefined);
    mocks.create.mockResolvedValue({ userId: 42, evidenceId: 'synthetic-evidence' });
    mocks.created.mockResolvedValue({ id: 42, email: 'person@example.invalid', name: 'Person' });
    mocks.send.mockResolvedValue(undefined);
  });
  it.each(['visitor', 'agent', 'agency_admin', 'property_developer', 'service_provider'] as const)(
    'passes %s choice to the canonical transaction before sending mail',
    async role => {
      const choice = { bundleId: 'synthetic-1', termsAccepted: true };
      const result = await service.register(
        'person@example.invalid',
        'Pass123!',
        'Person',
        role,
        role === 'agent' ? { displayName: ' Person ', phoneNumber: '+27000000000' } : undefined,
        choice,
      );
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ role, emailVerified: 0 }),
        choice,
        role === 'agent'
          ? expect.objectContaining({ displayName: 'Person', phone: '+27000000000' })
          : undefined,
      );
      expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.send.mock.invocationCallOrder[0],
      );
      expect(result).toEqual({ userId: 42, verificationEmailSent: true });
    },
  );
  it('sends no email or success when the transaction fails', async () => {
    mocks.create.mockRejectedValue(new Error('evidence transaction failed'));
    await expect(service.register('person@example.invalid', 'Pass123!', 'Person')).rejects.toThrow(
      'evidence transaction failed',
    );
    expect(mocks.created).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('preserves a committed account when verification delivery fails', async () => {
    mocks.send.mockRejectedValue(new Error('synthetic provider failure'));
    await expect(
      service.register('person@example.invalid', 'Pass123!', 'Person', 'visitor', undefined, {
        bundleId: 'synthetic-1',
        termsAccepted: true,
      }),
    ).resolves.toEqual({ userId: 42, verificationEmailSent: false });
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});

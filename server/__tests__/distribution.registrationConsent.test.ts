import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distributionRouter } from '../distributionRouter';

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), registered: vi.fn(), email: vi.fn() }));
vi.mock('../db', () => ({ getDb: mocks.getDb }));
vi.mock('../services/registrationLegalAcceptanceService', () => ({
  findVerifiedRegistrationAccount: mocks.registered,
}));
vi.mock('../_core/emailService', () => ({
  EmailService: { sendReferrerActivationEmail: mocks.email },
}));

function fixture(application: object) {
  const write = vi.fn();
  const db = {
    select: vi.fn(() => ({
      from: () => ({ where: () => ({ limit: async () => [application] }) }),
    })),
    insert: write,
    update: write,
    transaction: write,
  };
  mocks.getDb.mockResolvedValue(db);
  return { db, write };
}
beforeEach(() => {
  vi.stubEnv('FEATURE_DISTRIBUTION_NETWORK', 'true');
  mocks.registered.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
});
const caller = () =>
  distributionRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 1, role: 'super_admin' },
  } as never);

describe('administrative account consent boundary', () => {
  it.each(['review', 'resend'] as const)(
    'rejects %s before account, identity or email writes when self-registration evidence is absent',
    async action => {
      const { db, write } = fixture({
        id: 5,
        email: 'Applicant@example.invalid',
        fullName: 'Synthetic Applicant',
        status: action === 'review' ? 'pending' : 'approved',
        userId: 17,
      });
      const request =
        action === 'review'
          ? caller().admin.reviewReferrerApplication({ applicationId: 5, decision: 'approved' })
          : caller().admin.resendReferrerActivationEmail({ applicationId: 5 });
      await expect(request).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      expect(mocks.registered).toHaveBeenCalledWith(db, 'applicant@example.invalid', 17);
      expect(write).not.toHaveBeenCalled();
      expect(mocks.email).not.toHaveBeenCalled();
    },
  );
  it('requires self-registration before completing an existing manager invitation', async () => {
    const { write } = fixture({
      id: 5,
      email: 'applicant@example.invalid',
      requestedArea: 'distribution_manager',
      status: 'pending',
    });
    await expect(
      caller().completeManagerInviteRegistration({
        registrationId: 5,
        email: 'applicant@example.invalid',
        fullName: 'Synthetic Applicant',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(write).not.toHaveBeenCalled();
    expect(mocks.registered).toHaveBeenCalledWith(
      expect.anything(),
      'applicant@example.invalid',
      1,
    );
  });
  it('requires a signed-in account before accessing the invitation mutation', async () => {
    const anonymous = distributionRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as never);
    await expect(
      anonymous.completeManagerInviteRegistration({
        registrationId: 5,
        email: 'applicant@example.invalid',
        fullName: 'Synthetic Applicant',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});

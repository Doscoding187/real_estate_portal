import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockSelect, mockSendAgencyInvitationEmail } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockSendAgencyInvitationEmail: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));
vi.mock('../../_core/emailService', () => ({
  EmailService: {
    sendAgencyInvitationEmail: mockSendAgencyInvitationEmail,
  },
}));

import { deliverAgencyInvitations } from '../agencyInvitationDeliveryService';

function limitedRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from, where, limit };
}

function rows(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  return { from, where };
}

describe('agency invitation delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue({ select: mockSelect });
  });

  it('delivers active-agency invitations to the canonical acceptance route', async () => {
    mockSelect
      .mockImplementationOnce(() =>
        limitedRows([{ id: 44, name: 'Canonical Realty', subscriptionStatus: 'active' }]),
      )
      .mockImplementationOnce(() =>
        rows([
          {
            id: 99,
            agencyId: 44,
            invitedBy: 7,
            email: 'agent@example.com',
            token: 'secure-token',
            status: 'pending',
          },
        ]),
      )
      .mockImplementationOnce(() =>
        limitedRows([
          {
            name: 'Agency Principal',
            firstName: 'Agency',
            lastName: 'Principal',
            email: 'principal@example.com',
          },
        ]),
      );
    mockSendAgencyInvitationEmail.mockResolvedValue(true);

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: false, attempted: 1, sent: 1, failed: 0 });
    expect(mockSendAgencyInvitationEmail).toHaveBeenCalledWith(
      'agent@example.com',
      'Agency Principal',
      'Canonical Realty',
      expect.stringContaining('/accept-invitation?token=secure-token'),
    );
  });

  it('keeps onboarding invitations queued until the agency is active', async () => {
    mockSelect.mockImplementationOnce(() =>
      limitedRows([{ id: 44, name: 'Canonical Realty', subscriptionStatus: 'pending_payment' }]),
    );

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: true, attempted: 0, sent: 0, failed: 0 });
    expect(mockSendAgencyInvitationEmail).not.toHaveBeenCalled();
  });
});

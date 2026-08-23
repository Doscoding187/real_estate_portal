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

import {
  deliverAgencyInvitations,
  hasEffectiveAgencyPaidAccess,
} from '../agencyInvitationDeliveryService';

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

describe('agency invitation delivery (canonical access gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue({ select: mockSelect });
  });

  function mockCanonicalGate(
    status: string | null,
    dates: { currentPeriodEnd?: string | null; graceEndsAt?: string | null } = {},
  ) {
    mockSelect
      // Agency existence lookup.
      .mockImplementationOnce(() => limitedRows([{ id: 44, name: 'Canonical Realty' }]))
      // Canonical subscriptions row — the single commercial-access authority.
      .mockImplementationOnce(() =>
        limitedRows([
          {
            status,
            currentPeriodEnd: dates.currentPeriodEnd ?? null,
            graceEndsAt: dates.graceEndsAt ?? null,
          },
        ]),
      );
  }

  function futureDate(daysFromNow: number) {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
  }

  function pendingInvitation() {
    return {
      id: 99,
      agencyId: 44,
      invitedBy: 7,
      email: 'agent@example.com',
      token: 'secure-token',
      status: 'pending',
    };
  }

  it('delivers invitations when the canonical subscription grants paid access', async () => {
    mockCanonicalGate('active');
    mockSelect
      .mockImplementationOnce(() => rows([pendingInvitation()]))
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

  it('keeps onboarding invitations queued while canonical access is pending payment', async () => {
    mockCanonicalGate('pending_payment');

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: true, attempted: 0, sent: 0, failed: 0 });
    expect(mockSendAgencyInvitationEmail).not.toHaveBeenCalled();
  });

  it('accepts grace_period as paid access', async () => {
    mockCanonicalGate('grace_period');
    mockSelect
      .mockImplementationOnce(() => rows([{ ...pendingInvitation(), id: 100 }]))
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

    const result = await deliverAgencyInvitations({ agencyId: 44 });

    expect(result).toEqual({ deferred: false, attempted: 1, sent: 1, failed: 0 });
  });

  it('defers when the canonical subscription has expired even if a stale shadow says active', async () => {
    // Regression guard for the launch-access approval desync: only the
    // canonical row may decide delivery.
    mockCanonicalGate('expired');

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: true, attempted: 0, sent: 0, failed: 0 });
    expect(mockSendAgencyInvitationEmail).not.toHaveBeenCalled();
  });

  it('defers when no canonical subscription exists yet', async () => {
    mockCanonicalGate(null);

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: true, attempted: 0, sent: 0, failed: 0 });
    expect(mockSendAgencyInvitationEmail).not.toHaveBeenCalled();
  });

  it('defers an active subscription whose fixed term has already elapsed', async () => {
    // A finance lifecycle override that sets 'active' without refreshing
    // dates must not email invitations for access the canonical gates deny.
    mockCanonicalGate('active', { currentPeriodEnd: futureDate(-3) });

    const result = await deliverAgencyInvitations({ agencyId: 44, invitationIds: [99] });

    expect(result).toEqual({ deferred: true, attempted: 0, sent: 0, failed: 0 });
    expect(mockSendAgencyInvitationEmail).not.toHaveBeenCalled();
  });

  it('delivers within a live grace window and defers an exhausted one', () => {
    expect(
      hasEffectiveAgencyPaidAccess({
        status: 'grace_period',
        currentPeriodEnd: futureDate(-10),
        graceEndsAt: futureDate(4),
      }),
    ).toBe(true);
    expect(
      hasEffectiveAgencyPaidAccess({
        status: 'grace_period',
        currentPeriodEnd: futureDate(-30),
        graceEndsAt: futureDate(-2),
      }),
    ).toBe(false);
  });
});

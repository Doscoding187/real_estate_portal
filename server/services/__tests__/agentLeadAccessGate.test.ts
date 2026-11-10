import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEntitlements, mockGetDb } = vi.hoisted(() => ({
  mockEntitlements: vi.fn(),
  mockGetDb: vi.fn(),
}));

vi.mock('../agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockEntitlements,
}));
vi.mock('../../db', () => ({ getDb: mockGetDb }));

import {
  AGENT_LEADS_LOCKED_MESSAGE,
  AGENT_NOT_ASSIGNABLE_MESSAGE,
  requireAgentCanReceiveAssignedLeads,
  requireAgentLeadAccess,
} from '../agentLeadAccessGate';

const paid = { hasCommercialAccess: true, canAccessExistingLeads: true, canReceiveLeads: true };
const unpaid = { hasCommercialAccess: false, canAccessExistingLeads: true, canReceiveLeads: false };

function dbWithRole(role: string | null) {
  return {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (role ? [{ role }] : []) }) }),
    }),
  };
}

describe('requireAgentLeadAccess (D2)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses an agent without current Launch Access, even with existing custody', async () => {
    mockEntitlements.mockResolvedValue(unpaid);
    await expect(requireAgentLeadAccess({ user: { id: 1, role: 'agent' } })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: AGENT_LEADS_LOCKED_MESSAGE,
    });
    expect(AGENT_LEADS_LOCKED_MESSAGE).toBe('Leads unlock with Launch Access.');
  });

  it('refuses an agent whose entitlements cannot be resolved', async () => {
    mockEntitlements.mockResolvedValue(null);
    await expect(requireAgentLeadAccess({ user: { id: 1, role: 'agent' } })).rejects.toThrow(
      AGENT_LEADS_LOCKED_MESSAGE,
    );
  });

  it('allows a paid agent', async () => {
    mockEntitlements.mockResolvedValue(paid);
    await expect(
      requireAgentLeadAccess({ user: { id: 1, role: 'agent' } }),
    ).resolves.toBeUndefined();
  });

  it('refuses a paid agent without existing-lead custody (unapproved or lost membership)', async () => {
    mockEntitlements.mockResolvedValue({ ...paid, canAccessExistingLeads: false });
    await expect(requireAgentLeadAccess({ user: { id: 1, role: 'agent' } })).rejects.toThrow(
      AGENT_LEADS_LOCKED_MESSAGE,
    );
  });

  it.each(['agency_admin', 'super_admin'])('exempts %s without an entitlement lookup', async role => {
    await expect(requireAgentLeadAccess({ user: { id: 2, role } })).resolves.toBeUndefined();
    expect(mockEntitlements).not.toHaveBeenCalled();
  });
});

describe('requireAgentCanReceiveAssignedLeads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses assignment to an unpaid agent', async () => {
    mockGetDb.mockResolvedValue(dbWithRole('agent'));
    mockEntitlements.mockResolvedValue(unpaid);
    await expect(requireAgentCanReceiveAssignedLeads(5)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: AGENT_NOT_ASSIGNABLE_MESSAGE,
    });
  });

  it('allows assignment to a paid agent', async () => {
    mockGetDb.mockResolvedValue(dbWithRole('agent'));
    mockEntitlements.mockResolvedValue(paid);
    await expect(requireAgentCanReceiveAssignedLeads(5)).resolves.toBeUndefined();
  });

  it('allows an agency-managed member with current access even without a phone number', async () => {
    // canReceiveLeads is false only because the profile has no phone; commercial
    // access (agency-managed through a current membership) is what assignment needs.
    mockGetDb.mockResolvedValue(dbWithRole('agent'));
    mockEntitlements.mockResolvedValue({
      hasCommercialAccess: true,
      canAccessExistingLeads: true,
      canReceiveLeads: false,
    });
    await expect(requireAgentCanReceiveAssignedLeads(5)).resolves.toBeUndefined();
  });

  it('does not govern non-agent assignees', async () => {
    mockGetDb.mockResolvedValue(dbWithRole('property_developer'));
    await expect(requireAgentCanReceiveAssignedLeads(5)).resolves.toBeUndefined();
    expect(mockEntitlements).not.toHaveBeenCalled();
  });
});

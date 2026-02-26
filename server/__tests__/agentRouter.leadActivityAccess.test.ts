import { describe, expect, it } from 'vitest';
import { hasLeadActivityAccess } from '../agentRouter';

describe('hasLeadActivityAccess', () => {
  it('allows agent-owned lead access for owning agent', () => {
    const allowed = hasLeadActivityAccess({
      role: 'agent',
      actorAgentId: 17,
      lead: { id: 1, agentId: 17, agencyId: 9 },
    });

    expect(allowed).toBe(true);
  });

  it('denies agent access to another agent lead', () => {
    const allowed = hasLeadActivityAccess({
      role: 'agent',
      actorAgentId: 17,
      lead: { id: 1, agentId: 18, agencyId: 9 },
    });

    expect(allowed).toBe(false);
  });

  it('allows agency admin access for leads in the same agency', () => {
    const allowed = hasLeadActivityAccess({
      role: 'agency_admin',
      userAgencyId: 42,
      lead: { id: 10, agentId: null, agencyId: 42 },
    });

    expect(allowed).toBe(true);
  });

  it('denies agency admin access for leads in another agency', () => {
    const allowed = hasLeadActivityAccess({
      role: 'agency_admin',
      userAgencyId: 42,
      lead: { id: 10, agentId: null, agencyId: 77 },
    });

    expect(allowed).toBe(false);
  });

  it('allows super admin access regardless of ownership', () => {
    const allowed = hasLeadActivityAccess({
      role: 'super_admin',
      lead: { id: 99, agentId: null, agencyId: null },
    });

    expect(allowed).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  applyOwnershipFallback,
  hasDeterministicOwnerContext,
} from '../publicLeadCaptureService';

describe('publicLeadCaptureService ownership routing', () => {
  it('routes agency-managed property with no agent assignment to agency inbox', () => {
    const resolved = applyOwnershipFallback(
      {
        propertyId: 10,
        ownerUserId: 88,
      },
      {
        ownerUserId: 88,
        ownerRole: 'agency_admin',
        ownerAgencyId: 42,
      },
    );

    expect(resolved.agentId).toBeUndefined();
    expect(resolved.agencyId).toBe(42);
    expect(hasDeterministicOwnerContext(resolved)).toBe(true);
  });

  it('routes agent-private property to owning agent and agency context', () => {
    const resolved = applyOwnershipFallback(
      {
        propertyId: 22,
        ownerUserId: 91,
      },
      {
        ownerUserId: 91,
        ownerRole: 'agent',
        ownerAgentId: 55,
        ownerAgentAgencyId: 11,
        ownerAgencyId: 11,
      },
    );

    expect(resolved.agentId).toBe(55);
    expect(resolved.agencyId).toBe(11);
    expect(hasDeterministicOwnerContext(resolved)).toBe(true);
  });

  it('routes developer-private property to deterministic owner user fallback', () => {
    const resolved = applyOwnershipFallback(
      {
        propertyId: 33,
      },
      {
        ownerUserId: 104,
        ownerRole: 'property_developer',
      },
    );

    expect(resolved.ownerUserId).toBe(104);
    expect(resolved.agentId).toBeUndefined();
    expect(resolved.agencyId).toBeUndefined();
    expect(hasDeterministicOwnerContext(resolved)).toBe(true);
  });

  it('flags unresolved context when no ownership data exists', () => {
    expect(hasDeterministicOwnerContext({})).toBe(false);
  });
});

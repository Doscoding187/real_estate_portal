import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetAgentEntitlementsForUserId, mockLogin } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetAgentEntitlementsForUserId: vi.fn(),
  mockLogin: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getAgencyDashboardStats: vi.fn(),
  getAgencyPerformanceData: vi.fn(),
  getAgencyRecentLeads: vi.fn(),
  getAgencyRecentListings: vi.fn(),
  getAgencyAgents: vi.fn(),
  getLeadConversionStats: vi.fn(),
  getAgencyCommissionStats: vi.fn(),
  getAgentPerformanceLeaderboard: vi.fn(),
}));

vi.mock('../_core/auth', () => ({
  authService: { login: mockLogin },
}));

vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockGetAgentEntitlementsForUserId,
}));

import { registerAuthRoutes } from '../_core/authRoutes';
import { appRouter } from '../routers';

const user = {
  id: 9007,
  openId: null,
  email: 'identity-projection@listify.local',
  name: 'Identity Projection',
  firstName: 'Identity',
  lastName: 'Projection',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'visitor',
  agencyId: null,
  isSubaccount: 0,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  lastSignedIn: null,
};

function identityDb(rows: Array<{ active: number; id: number; identityType: string }>) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function authMeCaller() {
  return appRouter.createCaller({
    user,
    req: { headers: {} } as never,
    res: { clearCookie: vi.fn() } as never,
    requestId: 'auth-distribution-identity-projection',
  } as never);
}

describe('auth.me distribution identity projection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(identityDb([]));
    mockGetAgentEntitlementsForUserId.mockResolvedValue(null);
    mockLogin.mockResolvedValue({ user, sessionToken: 'identity-projection-session' });
  });

  it('projects an active manager identity through auth.me', async () => {
    mockGetDb.mockResolvedValue(identityDb([{ id: 1, active: 1, identityType: 'manager' }]));

    await expect(authMeCaller().auth.me()).resolves.toMatchObject({
      hasManagerIdentity: true,
      hasReferrerIdentity: false,
    });
  });

  it('projects an active referrer identity through auth.me', async () => {
    mockGetDb.mockResolvedValue(identityDb([{ id: 2, active: 1, identityType: 'referrer' }]));

    await expect(authMeCaller().auth.me()).resolves.toMatchObject({
      hasManagerIdentity: false,
      hasReferrerIdentity: true,
    });
  });

  it('does not project inactive or absent distribution identities', async () => {
    mockGetDb.mockResolvedValue(identityDb([{ id: 3, active: 0, identityType: 'manager' }]));

    await expect(authMeCaller().auth.me()).resolves.toMatchObject({
      hasManagerIdentity: false,
      hasReferrerIdentity: false,
    });

    mockGetDb.mockResolvedValue(identityDb([]));
    await expect(authMeCaller().auth.me()).resolves.toMatchObject({
      hasManagerIdentity: false,
      hasReferrerIdentity: false,
    });
  });

  it('uses the same projection in login and the subsequent auth.me session read', async () => {
    mockGetDb.mockResolvedValue(identityDb([{ id: 4, active: 1, identityType: 'manager' }]));
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'not-asserted-in-test' }),
      });

      await expect(response.json()).resolves.toMatchObject({
        user: { hasManagerIdentity: true, hasReferrerIdentity: false },
      });
      await expect(authMeCaller().auth.me()).resolves.toMatchObject({
        hasManagerIdentity: true,
        hasReferrerIdentity: false,
      });
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});

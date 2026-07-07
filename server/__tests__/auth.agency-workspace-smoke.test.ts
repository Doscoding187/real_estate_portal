import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME } from '@shared/const';

const {
  mockLogin,
  mockGetDb,
  mockGetAgencyDashboardStats,
  mockGetAgentEntitlementsForUserId,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockGetDb: vi.fn(),
  mockGetAgencyDashboardStats: vi.fn(),
  mockGetAgentEntitlementsForUserId: vi.fn(),
}));

vi.mock('../_core/auth', () => ({
  authService: {
    login: mockLogin,
  },
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getAgencyDashboardStats: mockGetAgencyDashboardStats,
  getAgencyPerformanceData: vi.fn(),
  getAgencyRecentLeads: vi.fn(),
  getAgencyRecentListings: vi.fn(),
  getAgencyAgents: vi.fn(),
  getLeadConversionStats: vi.fn(),
  getAgencyCommissionStats: vi.fn(),
  getAgentPerformanceLeaderboard: vi.fn(),
}));

vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockGetAgentEntitlementsForUserId,
}));

import { registerAuthRoutes } from '../_core/authRoutes';
import { appRouter } from '../routers';

const agencyUser = {
  id: 9001,
  openId: null,
  email: 'agency@listify.local',
  name: '[LOCAL DEMO] Agency Principal',
  firstName: 'Local',
  lastName: 'Principal',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'agency_admin',
  agencyId: 44,
  isSubaccount: 0,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  lastSignedIn: null,
};

describe('auth to agency workspace smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLogin.mockResolvedValue({
      user: agencyUser,
      sessionToken: 'agency-smoke-session-token',
    });

    mockGetDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    mockGetAgentEntitlementsForUserId.mockResolvedValue(null);
    mockGetAgencyDashboardStats.mockResolvedValue({
      totalListings: 4,
      totalSales: 1,
      totalLeads: 5,
      totalAgents: 1,
      activeListings: 2,
      pendingListings: 1,
      recentLeads: 5,
      recentSales: 1,
    });
  });

  it('logs in, sets a session cookie, reads current user, accesses agency data, and logs out', async () => {
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: agencyUser.email,
          password: 'not-asserted-in-smoke',
          rememberMe: false,
        }),
      });
      const loginPayload = await loginResponse.json();
      const setCookie = loginResponse.headers.get('set-cookie') || '';

      expect(loginResponse.status).toBe(200);
      expect(loginPayload.user).toMatchObject({
        email: agencyUser.email,
        role: 'agency_admin',
      });
      expect(setCookie).toContain(`${COOKIE_NAME}=agency-smoke-session-token`);

      const caller = appRouter.createCaller({
        user: agencyUser,
        req: { headers: { cookie: setCookie.split(';')[0] } } as any,
        res: { clearCookie: vi.fn() } as any,
        requestId: 'auth-agency-workspace-smoke',
      } as any);

      const currentUser = await caller.auth.me();
      expect(currentUser).toMatchObject({
        email: agencyUser.email,
        role: 'agency_admin',
        agencyId: 44,
      });

      const stats = await caller.agency.getDashboardStats();
      expect(stats).toMatchObject({
        totalListings: 4,
        totalLeads: 5,
        activeListings: 2,
      });

      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { cookie: setCookie.split(';')[0] },
      });
      const logoutPayload = await logoutResponse.json();

      expect(logoutResponse.status).toBe(200);
      expect(logoutPayload.success).toBe(true);
      expect(logoutResponse.headers.get('set-cookie') || '').toContain(`${COOKIE_NAME}=`);
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});

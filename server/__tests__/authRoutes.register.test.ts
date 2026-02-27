import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
}));

vi.mock('../_core/auth', () => ({
  authService: {
    register: mockRegister,
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

import { registerAuthRoutes } from '../_core/authRoutes';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockResolvedValue(123);
  });

  it('normalizes agent phoneNumber to phone before passing to authService', async () => {
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'agent+staging@propertylistify.co.za',
          password: 'ValidPass1!',
          role: 'agent',
          agentProfile: {
            displayName: 'Staging Agent',
            phoneNumber: '+27110002000',
          },
        }),
      });

      const body = await response.json();
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      const normalizedAgentProfile = mockRegister.mock.calls[0][4];
      expect(normalizedAgentProfile).toMatchObject({
        displayName: 'Staging Agent',
        phone: '+27110002000',
      });
      expect(normalizedAgentProfile.phoneNumber).toBeUndefined();
    } finally {
      server.close();
      await once(server, 'close');
    }
  });

  it('rejects agent registration when phone is missing after normalization', async () => {
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'agent+staging@propertylistify.co.za',
          password: 'ValidPass1!',
          role: 'agent',
          agentProfile: {
            displayName: 'Staging Agent',
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockRegister).not.toHaveBeenCalled();
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});

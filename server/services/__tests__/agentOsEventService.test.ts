import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock, insertValuesMock } = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const getDbMock = vi.fn();
  return { getDbMock, insertValuesMock };
});

vi.mock('../../db', () => ({
  getDb: getDbMock,
}));

import { recordAgentOsEvent } from '../agentOsEventService';

describe('agentOsEventService analytics metadata minimization', () => {
  beforeEach(() => {
    insertValuesMock.mockReset();
    insertValuesMock.mockResolvedValue(undefined);
    getDbMock.mockReset();
    getDbMock.mockResolvedValue({
      insert: () => ({ values: insertValuesMock }),
    });
  });

  it('records events without user-agent or IP columns', async () => {
    await recordAgentOsEvent({
      userId: 42,
      eventType: 'agent_dashboard_viewed',
      eventData: { surface: 'dashboard' },
      requestId: 'req-1',
      req: {
        headers: {
          'user-agent': 'vitest-agent/1.0',
          'x-forwarded-for': '203.0.113.7, 10.0.0.1',
          referer: 'https://propertylistify.example/dashboard',
        },
        ip: '203.0.113.7',
        socket: { remoteAddress: '203.0.113.7' },
        originalUrl: '/api/trpc/agent.dashboard',
      },
    });

    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    const values = insertValuesMock.mock.calls[0][0];
    expect(values).toMatchObject({
      userId: 42,
      sessionId: 'agent-os-user-42',
      eventType: 'agent_dashboard_viewed',
      eventData: { surface: 'dashboard' },
      url: '/api/trpc/agent.dashboard',
      referrer: 'https://propertylistify.example/dashboard',
    });
    expect(Object.keys(values)).not.toContain('userAgent');
    expect(Object.keys(values)).not.toContain('ipAddress');
    expect(JSON.stringify(values)).not.toContain('vitest-agent');
    expect(JSON.stringify(values)).not.toContain('203.0.113.7');
  });

  it('keeps explicit session ids and skips inserts when the db is unavailable', async () => {
    await recordAgentOsEvent({
      eventType: 'agent_profile_published',
      req: { headers: { 'user-agent': 'vitest-agent/1.0' } },
      sessionId: 'session-abc',
    });

    const values = insertValuesMock.mock.calls[0][0];
    expect(values.sessionId).toBe('session-abc');
    expect(Object.keys(values)).not.toContain('userAgent');
    expect(Object.keys(values)).not.toContain('ipAddress');

    insertValuesMock.mockClear();
    getDbMock.mockResolvedValue(null);
    await recordAgentOsEvent({ eventType: 'agent_profile_published' });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});

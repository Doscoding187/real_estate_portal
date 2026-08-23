import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRecordAgentOsEvent } = vi.hoisted(() => ({
  mockRecordAgentOsEvent: vi.fn(),
}));

vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEvent: mockRecordAgentOsEvent,
}));

import { analyticsRouter } from '../analyticsRouter';
import { PUBLIC_AGENT_PROFILE_EVENTS } from '../../shared/analytics/public-agent-profile-events';

function createCaller() {
  return analyticsRouter.createCaller({
    user: null,
    req: { url: '/trpc/analytics.track' } as never,
    res: {} as never,
    requestId: 'public-agent-analytics-contract',
  } as never);
}

describe('public agent profile analytics contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declares the eight bounded public presence events', () => {
    expect([...PUBLIC_AGENT_PROFILE_EVENTS].sort()).toEqual(
      [
        'agent_profile_view',
        'agent_profile_listing_click',
        'agent_profile_area_guide_click',
        'agent_profile_whatsapp_click',
        'agent_profile_call_click',
        'agent_profile_email_click',
        'agent_profile_share',
        'agent_profile_contact_cta',
      ].sort(),
    );
  });

  it('records supported events with target identity only', async () => {
    await createCaller().track({
      event: 'agent_profile_listing_click',
      properties: { slug: 'jane-agent', agentId: 42, propertyId: 7 },
    });

    expect(mockRecordAgentOsEvent).toHaveBeenCalledTimes(1);
    const call = mockRecordAgentOsEvent.mock.calls[0][0];
    expect(call.eventType).toBe('agent_profile_listing_click');
    expect(call.eventData).toEqual({ slug: 'jane-agent', agentId: 42, propertyId: 7 });
  });

  it('rejects unknown event names before touching analytics storage', async () => {
    await expect(
      createCaller().track({
        event: 'made_up_event' as never,
        properties: { slug: 'jane-agent' },
      }),
    ).rejects.toThrow();

    expect(mockRecordAgentOsEvent).not.toHaveBeenCalled();
  });
});

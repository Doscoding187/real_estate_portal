import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAgentPresenceSummary } from '../services/agentPresenceSummaryService';

const NOW = new Date('2026-08-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY);
}

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('agent presence summary aggregation', () => {
  it('aggregates the public presence event families for the current window', () => {
    const rows = [
      { eventType: 'agent_profile_view', createdAt: daysAgo(1).toISOString() },
      { eventType: 'agent_profile_view', createdAt: daysAgo(2).toISOString() },
      { eventType: 'agent_profile_view', createdAt: daysAgo(3).toISOString() },
      { eventType: 'agent_profile_listing_click', createdAt: daysAgo(1).toISOString() },
      { eventType: 'agent_profile_area_guide_click', createdAt: daysAgo(4).toISOString() },
      { eventType: 'agent_profile_whatsapp_click', createdAt: daysAgo(5).toISOString() },
      { eventType: 'agent_profile_call_click', createdAt: daysAgo(6).toISOString() },
      { eventType: 'agent_profile_email_click', createdAt: daysAgo(7).toISOString() },
      { eventType: 'agent_profile_contact_cta', createdAt: daysAgo(8).toISOString() },
      { eventType: 'agent_profile_share', createdAt: daysAgo(9).toISOString() },
    ];

    expect(buildAgentPresenceSummary(rows, NOW)).toMatchObject({
      profileViews: 3,
      listingTaps: 1,
      areaGuideOpens: 1,
      whatsappClicks: 1,
      contactActions: 3,
      shares: 1,
      totalInteractions: 10,
    });
  });

  it('counts prior-window profile views separately from the surfaced totals', () => {
    const rows = [
      { eventType: 'agent_profile_view', createdAt: daysAgo(40).toISOString() },
      { eventType: 'agent_profile_view', createdAt: daysAgo(45).toISOString() },
      { eventType: 'agent_profile_view', createdAt: daysAgo(10).toISOString() },
    ];

    const summary = buildAgentPresenceSummary(rows, NOW);
    expect(summary.profileViews).toBe(1);
    expect(summary.profileViewsPreviousWindow).toBe(2);
    expect(summary.totalInteractions).toBe(1);
  });

  it('ignores unknown event types and malformed timestamps instead of guessing', () => {
    const rows = [
      { eventType: 'agent_lead_received', createdAt: daysAgo(1).toISOString() },
      { eventType: 'agent_profile_view', createdAt: 'not-a-date' },
      { eventType: 'agent_profile_share', createdAt: daysAgo(2).toISOString() },
    ];

    const summary = buildAgentPresenceSummary(rows, NOW);
    expect(summary.totalInteractions).toBe(1);
    expect(summary.shares).toBe(1);
  });

  it('returns the honest zero shape when nothing has been recorded', () => {
    const summary = buildAgentPresenceSummary([], NOW);
    expect(summary).toEqual({
      windowDays: 30,
      profileViews: 0,
      listingTaps: 0,
      areaGuideOpens: 0,
      whatsappClicks: 0,
      contactActions: 0,
      shares: 0,
      totalInteractions: 0,
      profileViewsPreviousWindow: 0,
    });
  });

  it('wires the summary endpoint into the agent router and the dashboard surface', () => {
    const router = readRepoFile('server/agentRouter.ts');
    expect(router).toContain('getPresenceSummary: agentProcedure.query');
    expect(router).toContain('loadAgentPresenceSummary');

    const dashboard = readRepoFile('client/src/components/agent/AgentDashboardOverview.tsx');
    expect(dashboard).toContain('<AgentPresenceProof />');
    expect(dashboard).toContain("approvalStatus === 'approved'");

    const admin = readRepoFile('server/adminRouter.ts');
    expect(admin).toContain("'Your Property Listify agent profile has been approved.");
  });
});

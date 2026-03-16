import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock, getDbMock } = vi.hoisted(() => {
  return {
    executeMock: vi.fn(),
    getDbMock: vi.fn(),
  };
});

vi.mock('../../db', () => ({
  getDb: getDbMock,
}));

import {
  getEligibleLocationRules,
  getLocationTargetingDeliverySimulation,
} from '../locationMonetizationService';

function queryText(query: unknown): string {
  try {
    return JSON.stringify(query);
  } catch {
    return String(query);
  }
}

describe('locationMonetizationService validation', () => {
  beforeEach(() => {
    executeMock.mockReset();
    getDbMock.mockReset();
    getDbMock.mockResolvedValue({ execute: executeMock });
  });

  it('enforces daily cap guardrail and returns no eligible rules when cap is exhausted', async () => {
    executeMock.mockImplementation(async query => {
      const text = queryText(query);
      if (text.includes('FROM location_targeting_rules') && text.includes('ORDER BY ranking DESC')) {
        return [
          [
            {
              id: 10,
              targetType: 'hero_ad',
              targetId: 501,
              locationType: 'city',
              locationId: 7,
              ranking: 80,
              status: 'active',
              metadata: '{}',
              startDate: null,
              endDate: null,
              dailyImpressionCap: 2,
              totalImpressionCap: 0,
              pacingMinutes: 0,
              lastServedAt: null,
              createdBy: 1,
              createdAt: '2026-01-01 00:00:00',
              updatedAt: '2026-01-01 00:00:00',
            },
          ],
        ];
      }

      if (text.includes('FROM location_targeting_events') && text.includes('GROUP BY rule_id')) {
        return [[{ ruleId: 10, servedToday: 2, servedTotal: 25, lastServedAt: null }]];
      }

      return [[]];
    });

    const rules = await getEligibleLocationRules({
      targetType: 'hero_ad',
      locationType: 'city',
      locationId: 7,
      limit: 1,
      recordServe: true,
      contextType: 'hero',
      requestId: 'req-cap-test',
      userId: 123,
      sessionKey: 'sess-cap-test',
    });

    expect(rules).toEqual([]);
  });

  it('returns eligible sponsored rule when guardrails pass', async () => {
    executeMock.mockImplementation(async query => {
      const text = queryText(query);
      if (text.includes('FROM location_targeting_rules') && text.includes('ORDER BY ranking DESC')) {
        return [
          [
            {
              id: 11,
              targetType: 'hero_ad',
              targetId: 900,
              locationType: 'city',
              locationId: 3,
              ranking: 95,
              status: 'active',
              metadata: '{}',
              startDate: null,
              endDate: null,
              dailyImpressionCap: 20,
              totalImpressionCap: 0,
              pacingMinutes: 0,
              lastServedAt: null,
              createdBy: 1,
              createdAt: '2026-01-01 00:00:00',
              updatedAt: '2026-01-01 00:00:00',
            },
          ],
        ];
      }

      if (text.includes('FROM location_targeting_events') && text.includes('GROUP BY rule_id')) {
        return [[{ ruleId: 11, servedToday: 1, servedTotal: 5, lastServedAt: null }]];
      }

      return [[]];
    });

    const rules = await getEligibleLocationRules({
      targetType: 'hero_ad',
      locationType: 'city',
      locationId: 3,
      limit: 1,
      recordServe: true,
      contextType: 'hero',
      requestId: 'req-ok-test',
      userId: 456,
      sessionKey: 'sess-ok-test',
    });

    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(11);
    expect(rules[0].sponsoredLabel).toBe('Sponsored');
    expect(rules[0].usage.servedToday).toBe(1);
  });

  it('computes expected vs actual delivery metrics from simulation rows', async () => {
    executeMock.mockImplementation(async query => {
      const text = queryText(query);
      if (text.includes('FROM location_targeting_rules r') && text.includes('location_targeting_rule_daily_stats')) {
        return [
          [
            {
              id: 20,
              targetType: 'geo_listing',
              targetId: 777,
              locationType: 'city',
              locationId: 99,
              ranking: 75,
              status: 'active',
              metadata: JSON.stringify({ cpm: 100, cpc: 2, cpl: 30 }),
              dailyImpressionCap: 200,
              totalImpressionCap: 0,
              pacingMinutes: 0,
              opportunities: 1500,
              eligiblePasses: 1200,
              servedFromStats: 1000,
              blockedSchedule: 0,
              blockedDailyCap: 50,
              blockedTotalCap: 20,
              blockedPacing: 30,
              impressions: 1000,
              clicks: 50,
              leads: 10,
            },
          ],
        ];
      }
      return [[]];
    });

    const simulation = await getLocationTargetingDeliverySimulation({
      from: '2026-02-01',
      to: '2026-02-07',
    });

    expect(simulation.rules).toHaveLength(1);
    const row = simulation.rules[0];
    expect(row.expectedImpressions).toBe(1100);
    expect(row.actualImpressions).toBe(1000);
    expect(row.deliveryGap).toBe(100);
    expect(row.revenue).toBe(500);
    expect(row.effectiveCpm).toBe(500);
    expect(row.effectiveCpl).toBe(50);
    expect(simulation.totals.impressions).toBe(1000);
    expect(simulation.totals.clicks).toBe(50);
    expect(simulation.totals.leads).toBe(10);
  });
});

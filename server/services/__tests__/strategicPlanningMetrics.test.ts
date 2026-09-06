import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock dependencies before importing the module under test ──────────────────

const { mockGetDb, mockGetEcosystemStats, mockGetPlatformAnalytics } = vi.hoisted(() => ({
  mockGetDb: vi.fn(async () => ({ /* truthy DB stub */ })),
  mockGetEcosystemStats: vi.fn(async () => ({ agents: { active: 0 }, agencies: { active: 0 }, developers: { active: 0 } })),
  mockGetPlatformAnalytics: vi.fn(async () => ({ activeProperties: 0 })),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
  getEcosystemStats: mockGetEcosystemStats,
  getPlatformAnalytics: mockGetPlatformAnalytics,
}));

vi.mock('../_core/auditLog', () => ({
  logManagerialAudit: vi.fn(async () => {}),
  AuditActions: {
    STRATEGIC_PERIOD_CREATE: 'period_create',
    STRATEGIC_PERIOD_UPDATE: 'period_update',
    STRATEGIC_OBJECTIVE_CREATE: 'objective_create',
    STRATEGIC_OBJECTIVE_UPDATE: 'objective_update',
    STRATEGIC_OBJECTIVE_ACTIVATE: 'objective_activate',
    STRATEGIC_OBJECTIVE_COMPLETE: 'objective_complete',
    STRATEGIC_OBJECTIVE_CANCEL: 'objective_cancel',
    STRATEGIC_TARGET_CREATE: 'target_create',
    STRATEGIC_TARGET_UPDATE: 'target_update',
    STRATEGIC_TARGET_REMOVE: 'target_remove',
  },
}));

import {
  SUPPORTED_METRIC_KEYS,
  SUPPORTED_METRIC_KEY_VALUES,
  type SupportedMetricKey,
} from '../../../drizzle/schema/strategicPlanning';

import {
  isSupportedMetricKey,
  SUPPORTED_METRICS,
  getMetricDefinition,
  resolveMetricValue,
} from '../companyMetricsService';

// ── Metric Authority Tests ────────────────────────────────────────────────────

describe('strategic planning metric authority', () => {
  beforeEach(() => {
    mockGetDb.mockReset();
    mockGetDb.mockResolvedValue({ /* truthy */ } as any);
    mockGetEcosystemStats.mockReset();
    mockGetEcosystemStats.mockResolvedValue({ agents: { active: 0 }, agencies: { active: 0 }, developers: { active: 0 } } as any);
    mockGetPlatformAnalytics.mockReset();
    mockGetPlatformAnalytics.mockResolvedValue({ activeProperties: 0 } as any);
  });

  describe('SUPPORTED_METRIC_KEYS tuple', () => {
    it('contains exactly 4 V1 metric keys', () => {
      expect(SUPPORTED_METRIC_KEYS).toHaveLength(4);
    });

    it('includes all four expected metric keys', () => {
      expect(SUPPORTED_METRIC_KEYS).toContain('active_agents');
      expect(SUPPORTED_METRIC_KEYS).toContain('active_agencies');
      expect(SUPPORTED_METRIC_KEYS).toContain('active_developers');
      expect(SUPPORTED_METRIC_KEYS).toContain('active_listings');
    });

    it('does not include deferred metric keys', () => {
      expect(SUPPORTED_METRIC_KEYS).not.toContain('leads_30d');
      expect(SUPPORTED_METRIC_KEYS).not.toContain('revenue_30d');
    });

    it('exports a usable Zod-compatible enum tuple', () => {
      expect(SUPPORTED_METRIC_KEY_VALUES).toEqual(SUPPORTED_METRIC_KEYS);
    });
  });

  describe('isSupportedMetricKey', () => {
    it('returns true for every key in the SUPPORTED_METRIC_KEYS tuple', () => {
      for (const key of SUPPORTED_METRIC_KEYS) {
        expect(isSupportedMetricKey(key)).toBe(true);
      }
    });

    it('returns false for unknown metric keys', () => {
      expect(isSupportedMetricKey('leads_30d')).toBe(false);
      expect(isSupportedMetricKey('revenue_30d')).toBe(false);
      expect(isSupportedMetricKey('nonexistent')).toBe(false);
      expect(isSupportedMetricKey('')).toBe(false);
    });
  });

  describe('SUPPORTED_METRICS registry', () => {
    it('has an entry for every supported metric key', () => {
      for (const key of SUPPORTED_METRIC_KEYS) {
        expect(SUPPORTED_METRICS[key]).toBeDefined();
        expect(SUPPORTED_METRICS[key].key).toBe(key);
      }
    });

    it('has exactly 4 entries matching the SUPPORTED_METRIC_KEYS tuple', () => {
      const keys = Object.keys(SUPPORTED_METRICS);
      expect(keys).toHaveLength(4);
      expect(keys.sort()).toEqual([...SUPPORTED_METRIC_KEYS].sort());
    });

    it('all metrics use count unit and point_in_time_count semantic kind', () => {
      for (const key of SUPPORTED_METRIC_KEYS) {
        expect(SUPPORTED_METRICS[key].unit).toBe('count');
        expect(SUPPORTED_METRICS[key].semanticKind).toBe('point_in_time_count');
      }
    });

    it('active_agents resolves from getEcosystemStats().agents.active', async () => {
      mockGetEcosystemStats.mockResolvedValueOnce({
        agents: { active: 42 } as any,
        agencies: { active: 0 } as any,
        developers: { active: 0 } as any,
      });
      const result = await SUPPORTED_METRICS.active_agents.resolve();
      expect(result).toEqual({ state: 'resolved', value: 42 });
    });

    it('active_agencies resolves from getEcosystemStats().agencies.active', async () => {
      mockGetEcosystemStats.mockResolvedValueOnce({
        agents: { active: 0 } as any,
        agencies: { active: 15 } as any,
        developers: { active: 0 } as any,
      });
      const result = await SUPPORTED_METRICS.active_agencies.resolve();
      expect(result).toEqual({ state: 'resolved', value: 15 });
    });

    it('active_developers resolves from getEcosystemStats().developers.active', async () => {
      mockGetEcosystemStats.mockResolvedValueOnce({
        agents: { active: 0 } as any,
        agencies: { active: 0 } as any,
        developers: { active: 7 } as any,
      });
      const result = await SUPPORTED_METRICS.active_developers.resolve();
      expect(result).toEqual({ state: 'resolved', value: 7 });
    });

    it('active_listings resolves from getPlatformAnalytics().activeProperties', async () => {
      mockGetPlatformAnalytics.mockResolvedValueOnce({ activeProperties: 210 } as any);
      const result = await SUPPORTED_METRICS.active_listings.resolve();
      expect(result).toEqual({ state: 'resolved', value: 210 });
    });

    it('returns unavailable state when DB is unavailable', async () => {
      mockGetDb.mockResolvedValueOnce(null as any);
      const result = await SUPPORTED_METRICS.active_agents.resolve();
      expect(result).toEqual({ state: 'unavailable', value: null });
    });

    it('wraps zero values as resolved (not unavailable)', async () => {
      mockGetEcosystemStats.mockResolvedValueOnce({
        agents: { active: 0 } as any,
        agencies: { active: 0 } as any,
        developers: { active: 0 } as any,
      });
      const result = await SUPPORTED_METRICS.active_agents.resolve();
      expect(result).toEqual({ state: 'resolved', value: 0 });
    });
  });

  describe('getMetricDefinition', () => {
    it('returns definition for valid metric keys', () => {
      for (const key of SUPPORTED_METRIC_KEYS) {
        const def = getMetricDefinition(key);
        expect(def).not.toBeNull();
        expect(def!.key).toBe(key);
      }
    });

    it('returns null for unsupported metric keys', () => {
      expect(getMetricDefinition('leads_30d')).toBeNull();
      expect(getMetricDefinition('revenue_30d')).toBeNull();
      expect(getMetricDefinition('unknown')).toBeNull();
    });
  });

  describe('resolveMetricValue', () => {
    it('delegates to the metric definition resolver', async () => {
      mockGetEcosystemStats.mockResolvedValueOnce({
        agents: { active: 99 } as any,
        agencies: { active: 0 } as any,
        developers: { active: 0 } as any,
      });
      const result = await resolveMetricValue('active_agents');
      expect(result).toEqual({ state: 'resolved', value: 99 });
    });
  });
});

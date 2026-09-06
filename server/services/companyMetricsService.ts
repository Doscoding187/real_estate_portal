import { getDb, getEcosystemStats, getPlatformAnalytics } from '../db';
import {
  SUPPORTED_METRIC_KEYS,
  type SupportedMetricKey,
} from '../../drizzle/schema/strategicPlanning';

export type MetricResolution =
  | { state: 'resolved'; value: number }
  | { state: 'unavailable'; value: null };

export type MetricDefinition = {
  key: SupportedMetricKey;
  label: string;
  description: string;
  unit: 'count';
  semanticKind: 'point_in_time_count';
  resolve: () => Promise<MetricResolution>;
};

/**
 * Wraps a metric resolver to distinguish between:
 * - known database unavailable → returns { state: 'unavailable', value: null }
 * - genuine resolved value (including 0) → returns { state: 'resolved', value }
 * - unexpected errors (schema, programming) → propagates the error visibly
 */
function wrapResolver(fn: () => Promise<number>): () => Promise<MetricResolution> {
  return async () => {
    const db = await getDb();
    if (!db) {
      return { state: 'unavailable', value: null };
    }
    const value = await fn();
    return { state: 'resolved', value: Number(value) };
  };
}

export const SUPPORTED_METRICS: Record<SupportedMetricKey, MetricDefinition> = {
  active_agents: {
    key: 'active_agents',
    label: 'Active Agents',
    description:
      'Agents with approved status. Includes all agents whose status is approved, regardless of agency verification.',
    unit: 'count',
    semanticKind: 'point_in_time_count',
    resolve: wrapResolver(async () => (await getEcosystemStats()).agents.active),
  },
  active_agencies: {
    key: 'active_agencies',
    label: 'Active Agencies',
    description: 'Verified agencies. Count of agencies where isVerified = 1.',
    unit: 'count',
    semanticKind: 'point_in_time_count',
    resolve: wrapResolver(async () => (await getEcosystemStats()).agencies.active),
  },
  active_developers: {
    key: 'active_developers',
    label: 'Active Developers',
    description:
      'Approved first-party publisher/developer organisations. Count of first-party catalogue publishers joined to approved developer organisations.',
    unit: 'count',
    semanticKind: 'point_in_time_count',
    resolve: wrapResolver(async () => (await getEcosystemStats()).developers.active),
  },
  active_listings: {
    key: 'active_listings',
    label: 'Active Listings',
    description:
      'Listings with status pending_review, approved, or published. This includes listings pending review and approved listings, not only publicly published listings.',
    unit: 'count',
    semanticKind: 'point_in_time_count',
    resolve: wrapResolver(async () => (await getPlatformAnalytics()).activeProperties),
  },
};

export function getMetricDefinition(key: string): MetricDefinition | null {
  return SUPPORTED_METRICS[key as SupportedMetricKey] ?? null;
}

export function isSupportedMetricKey(key: string): key is SupportedMetricKey {
  return (SUPPORTED_METRIC_KEYS as readonly string[]).includes(key);
}

export async function resolveMetricValue(key: SupportedMetricKey): Promise<MetricResolution> {
  return SUPPORTED_METRICS[key].resolve();
}

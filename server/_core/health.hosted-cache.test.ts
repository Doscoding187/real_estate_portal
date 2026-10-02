import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { cacheHealth, databaseSnapshot } = vi.hoisted(() => ({
  cacheHealth: vi.fn(),
  databaseSnapshot: vi.fn(),
}));
vi.mock('./cache/redis', () => ({ getCacheHealth: cacheHealth }));
vi.mock('./hostedDatabaseReadinessMonitor', () => ({
  hostedDatabaseReadinessSnapshot: databaseSnapshot,
}));
vi.mock('./hostedRuntimeConfiguration', () => ({
  hostedRuntimeConfigurationIssues: () => [],
  resolveHostedBuildSha: () => 'a'.repeat(40),
}));
vi.mock('./authRateLimitStore', () => ({
  getAuthRateLimitStoreHealth: async () => ({ ok: true, mode: 'redis' }),
}));
vi.mock('../services/publicLeadRateLimitService', () => ({
  getPublicLeadRateLimitStoreHealth: async () => ({ ok: true, mode: 'redis', required: true }),
}));
vi.mock('../services/commercialTermNoticeScheduler', () => ({
  commercialTermNoticeScheduler: { status: () => ({ timerActive: true }) },
}));
import { buildApiReadinessResponse } from './health';

describe('hosted readiness requires the actual Redis cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    for (const key of [
      'AWS_REGION',
      'S3_BUCKET_NAME',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ])
      vi.stubEnv(key, 'test-configured');
    databaseSnapshot.mockReturnValue({ applicationReady: true });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns unready for the memory cache observed during cutover', async () => {
    cacheHealth.mockResolvedValue({
      status: 'degraded',
      redis: { connected: false },
      metrics: { fallback_mode: true },
    });
    expect(await buildApiReadinessResponse()).toMatchObject({
      ok: false,
      cache: { ok: false, mode: 'memory' },
    });
  });
  it('requires connection proof even when the fallback flag is false', async () => {
    cacheHealth.mockResolvedValue({
      status: 'healthy',
      redis: { connected: false },
      metrics: { fallback_mode: false },
    });
    expect(await buildApiReadinessResponse()).toMatchObject({
      ok: false,
      cache: { ok: false, mode: 'redis' },
    });
  });
  it('admits a connected Redis cache with all other strict checks green', async () => {
    cacheHealth.mockResolvedValue({
      status: 'healthy',
      redis: { connected: true },
      metrics: { fallback_mode: false },
    });
    expect(await buildApiReadinessResponse()).toMatchObject({
      ok: true,
      cache: { ok: true, mode: 'redis' },
    });
  });
});

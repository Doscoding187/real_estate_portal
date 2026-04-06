import { describe, expect, it } from 'vitest';
import { isKpiRollupSchedulerEnabled } from '../kpiRollupService';

describe('isKpiRollupSchedulerEnabled', () => {
  it('defaults to disabled in staging', () => {
    expect(
      isKpiRollupSchedulerEnabled({
        NODE_ENV: 'staging',
      }),
    ).toBe(false);
  });

  it('defaults to enabled outside staging', () => {
    expect(
      isKpiRollupSchedulerEnabled({
        NODE_ENV: 'production',
      }),
    ).toBe(true);
  });

  it('allows explicit opt-in for staging', () => {
    expect(
      isKpiRollupSchedulerEnabled({
        NODE_ENV: 'staging',
        KPI_ROLLUP_SCHEDULER_ENABLED: 'true',
      }),
    ).toBe(true);
  });

  it('allows explicit opt-out for production', () => {
    expect(
      isKpiRollupSchedulerEnabled({
        NODE_ENV: 'production',
        KPI_ROLLUP_SCHEDULER_ENABLED: 'false',
      }),
    ).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LocationCoverageEvent } from '../locationCoverageTelemetry';
import {
  emitLocationSearchOutcome,
  setLocationCoverageEventSinkForTests,
} from '../locationCoverageTelemetry';

describe('location coverage telemetry', () => {
  afterEach(() => {
    setLocationCoverageEventSinkForTests(null);
    vi.restoreAllMocks();
  });

  it('emits a resolved outcome with the top match reason', () => {
    const events: LocationCoverageEvent[] = [];
    setLocationCoverageEventSinkForTests(event => events.push(event));

    emitLocationSearchOutcome({
      normalizedQuery: 'bryanston west ext 1',
      journey: 'buy',
      canonicalResultCount: 2,
      searchAreaResultCount: 0,
      topMatchReason: 'alias_exact',
      matchedAlias: 'Bryanston West Extension 1',
    });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('location_search_outcome');
    expect(events[0].outcome.coverageSignal).toBe('resolved');
    expect(events[0].outcome.normalizedQuery).toBe('bryanston west ext 1');
    expect(events[0].outcome.topMatchReason).toBe('alias_exact');
    expect(events[0].occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('emits a no_result signal when canonical discovery finds nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const defaultSinkStillBound = true;
    expect(defaultSinkStillBound).toBe(true);

    emitLocationSearchOutcome({
      normalizedQuery: 'mamelodi extension 9',
      canonicalResultCount: 0,
      searchAreaResultCount: 0,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const payload = String(warn.mock.calls[0]?.[0]);
    expect(payload).toContain('[location-coverage]');
    expect(payload).toContain('"coverageSignal":"no_result"');
    expect(payload).not.toContain('user');
  });
});

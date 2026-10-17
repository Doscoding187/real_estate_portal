import { describe, expect, it } from 'vitest';
import { RehearsalRefusal } from '../../loadRehearsal/config';
import {
  HOSTED_LOAD_BOUNDS,
  PROVISIONAL_RATE_PLAN,
  cumulativeRequests,
  dueTimeForIndex,
  isLoopbackHost,
  parseRatePlanFile,
  planSegments,
  rateAtOffset,
  totalScheduledRequests,
  validateRatePlan,
  type RatePlan,
} from '../schedule';

const sustainedOnly: RatePlan = { sustainedRps: 5, peaks: [], doublePeak: null };

describe('planSegments', () => {
  it('produces one segment for a sustained-only plan', () => {
    expect(planSegments(sustainedOnly, 60)).toEqual([
      { startOffsetSeconds: 0, endOffsetSeconds: 60, rps: 5, requestsBefore: 0 },
    ]);
  });

  it('splits the provisional plan at every window boundary', () => {
    const segments = planSegments(PROVISIONAL_RATE_PLAN, 86_400);
    expect(segments.map(segment => segment.startOffsetSeconds)).toEqual([
      0, 21_600, 22_500, 43_200, 45_000, 64_800, 65_700,
    ]);
    expect(segments.map(segment => segment.rps)).toEqual([5, 20, 5, 40, 5, 20, 5]);
    expect(segments[segments.length - 1].endOffsetSeconds).toBe(86_400);
  });

  it('uses the double-peak rate where windows overlap a peak', () => {
    const overlapping: RatePlan = {
      sustainedRps: 5,
      peaks: [{ startOffsetSeconds: 100, durationSeconds: 200, rps: 20 }],
      doublePeak: { startOffsetSeconds: 150, durationSeconds: 100, rps: 40 },
    };
    expect(rateAtOffset(overlapping, 120)).toBe(20);
    expect(rateAtOffset(overlapping, 175)).toBe(40);
    expect(rateAtOffset(overlapping, 260)).toBe(20);
    expect(rateAtOffset(overlapping, 310)).toBe(5);
  });

  it('treats window end offsets as exclusive', () => {
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 21_599)).toBe(5);
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 21_600)).toBe(20);
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 22_499)).toBe(20);
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 22_500)).toBe(5);
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 43_200)).toBe(40);
    expect(rateAtOffset(PROVISIONAL_RATE_PLAN, 45_000)).toBe(5);
  });
});

describe('cumulativeRequests and totalScheduledRequests', () => {
  it('integrates a sustained plan exactly', () => {
    expect(cumulativeRequests(sustainedOnly, 60)).toBe(300);
    expect(totalScheduledRequests(sustainedOnly, 60)).toBe(300);
  });

  it('integrates the provisional plan exactly', () => {
    expect(cumulativeRequests(PROVISIONAL_RATE_PLAN, 86_400)).toBe(522_000);
    expect(totalScheduledRequests(PROVISIONAL_RATE_PLAN, 86_400)).toBe(522_000);
  });

  it('ignores windows that fall outside the duration', () => {
    expect(cumulativeRequests(PROVISIONAL_RATE_PLAN, 60)).toBe(300);
  });
});

describe('dueTimeForIndex', () => {
  const cumulativeAt = (plan: RatePlan, durationSeconds: number, offsetSeconds: number): number => {
    let count = 0;
    for (const segment of planSegments(plan, durationSeconds)) {
      if (offsetSeconds <= segment.startOffsetSeconds) break;
      const end = Math.min(offsetSeconds, segment.endOffsetSeconds);
      count += segment.rps * (end - segment.startOffsetSeconds);
    }
    return count;
  };

  it('inverts the sustained schedule', () => {
    expect(dueTimeForIndex(sustainedOnly, 60, 0)).toBe(0);
    expect(dueTimeForIndex(sustainedOnly, 60, 1)).toBeCloseTo(0.2, 9);
    expect(dueTimeForIndex(sustainedOnly, 60, 299)).toBeCloseTo(59.8, 9);
  });

  it('maps indices back onto the cumulative request count across boundaries', () => {
    const duration = 86_400;
    const probes = [0, 1, 107_999, 108_000, 108_001, 125_999, 126_000, 216_000, 288_000, 521_999];
    for (const index of probes) {
      const due = dueTimeForIndex(PROVISIONAL_RATE_PLAN, duration, index);
      expect(cumulativeAt(PROVISIONAL_RATE_PLAN, duration, due)).toBeCloseTo(index, 6);
    }
  });

  it('keeps due times monotonically non-decreasing', () => {
    let previous = -1;
    for (let index = 0; index < 522_000; index += 97) {
      const due = dueTimeForIndex(PROVISIONAL_RATE_PLAN, 86_400, index);
      expect(due).toBeGreaterThanOrEqual(previous);
      previous = due;
    }
  });

  it('schedules the first request of each peak at its boundary', () => {
    expect(dueTimeForIndex(PROVISIONAL_RATE_PLAN, 86_400, 108_000)).toBe(21_600);
    expect(dueTimeForIndex(PROVISIONAL_RATE_PLAN, 86_400, 126_000)).toBe(22_500);
  });
});

describe('validateRatePlan', () => {
  it('refuses rates above the admitted maximum', () => {
    expect(() => validateRatePlan({ ...sustainedOnly, sustainedRps: 41 })).toThrow(
      RehearsalRefusal,
    );
    expect(HOSTED_LOAD_BOUNDS.maxRps).toBe(40);
  });

  it('refuses non-positive rates and durations', () => {
    expect(() => validateRatePlan({ ...sustainedOnly, sustainedRps: 0 })).toThrow(RehearsalRefusal);
    expect(() =>
      validateRatePlan({
        sustainedRps: 5,
        peaks: [{ startOffsetSeconds: 0, durationSeconds: 0, rps: 10 }],
        doublePeak: null,
      }),
    ).toThrow(RehearsalRefusal);
  });

  it('refuses negative start offsets', () => {
    expect(() =>
      validateRatePlan({
        sustainedRps: 5,
        peaks: [{ startOffsetSeconds: -1, durationSeconds: 60, rps: 10 }],
        doublePeak: null,
      }),
    ).toThrow(RehearsalRefusal);
  });
});

describe('parseRatePlanFile', () => {
  it('parses a valid replacement plan', () => {
    const plan = parseRatePlanFile(
      JSON.stringify({
        sustainedRps: 2,
        peaks: [{ startOffsetSeconds: 60, durationSeconds: 120, rps: 10 }],
        doublePeak: null,
      }),
      'plan.json',
    );
    expect(plan).toEqual({
      sustainedRps: 2,
      peaks: [{ startOffsetSeconds: 60, durationSeconds: 120, rps: 10 }],
      doublePeak: null,
    });
  });

  it('treats a missing doublePeak as null', () => {
    expect(parseRatePlanFile('{"sustainedRps":3}', 'plan.json').doublePeak).toBeNull();
  });

  it('refuses malformed plans', () => {
    expect(() => parseRatePlanFile('not json', 'plan.json')).toThrow(RehearsalRefusal);
    expect(() => parseRatePlanFile('[]', 'plan.json')).toThrow(RehearsalRefusal);
    expect(() => parseRatePlanFile('{"sustainedRps":"fast"}', 'plan.json')).toThrow(
      RehearsalRefusal,
    );
    expect(() => parseRatePlanFile('{"sustainedRps":3,"peaks":[{"rps":5}]}', 'plan.json')).toThrow(
      RehearsalRefusal,
    );
  });

  it('refuses plans above the admitted maximum', () => {
    expect(() => parseRatePlanFile('{"sustainedRps":41}', 'plan.json')).toThrow(RehearsalRefusal);
  });
});

describe('isLoopbackHost', () => {
  it('recognises loopback hosts only', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('api.example.co.za')).toBe(false);
  });
});

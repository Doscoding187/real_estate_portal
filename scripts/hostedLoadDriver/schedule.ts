import { RehearsalRefusal } from '../loadRehearsal/config';

export const HOSTED_LOAD_BOUNDS = {
  maxRps: 40,
  minDurationSeconds: 5,
  maxDurationSeconds: 86_400,
  requestTimeoutMs: 15_000,
  minInflightCap: 16,
  maxInflightCap: 4_096,
  defaultInflightCap: 1_024,
} as const;

export interface PeakWindow {
  startOffsetSeconds: number;
  durationSeconds: number;
  rps: number;
}

export interface RatePlan {
  sustainedRps: number;
  peaks: readonly PeakWindow[];
  doublePeak: PeakWindow | null;
}

export const PROVISIONAL_RATE_PLAN: RatePlan = {
  sustainedRps: 5,
  peaks: [
    { startOffsetSeconds: 6 * 3_600, durationSeconds: 15 * 60, rps: 20 },
    { startOffsetSeconds: 18 * 3_600, durationSeconds: 15 * 60, rps: 20 },
  ],
  doublePeak: { startOffsetSeconds: 12 * 3_600, durationSeconds: 30 * 60, rps: 40 },
};

export interface RateSegment {
  startOffsetSeconds: number;
  endOffsetSeconds: number;
  rps: number;
  requestsBefore: number;
}

function assertRate(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > HOSTED_LOAD_BOUNDS.maxRps) {
    throw new RehearsalRefusal(
      `Refused: ${label} rate ${value} is outside 0-${HOSTED_LOAD_BOUNDS.maxRps} rps.`,
    );
  }
}

function assertPeak(window: PeakWindow, label: string): void {
  if (!Number.isFinite(window.startOffsetSeconds) || window.startOffsetSeconds < 0) {
    throw new RehearsalRefusal(
      `Refused: ${label} start offset must be a non-negative number of seconds.`,
    );
  }
  if (!Number.isFinite(window.durationSeconds) || window.durationSeconds <= 0) {
    throw new RehearsalRefusal(`Refused: ${label} duration must be a positive number of seconds.`);
  }
  assertRate(window.rps, label);
}

export function validateRatePlan(plan: RatePlan): void {
  assertRate(plan.sustainedRps, 'sustained');
  plan.peaks.forEach((window, index) => assertPeak(window, `peak ${index + 1}`));
  if (plan.doublePeak) assertPeak(plan.doublePeak, 'double-peak');
}

export function rateAtOffset(plan: RatePlan, offsetSeconds: number): number {
  let rate = plan.sustainedRps;
  for (const window of plan.peaks) {
    if (
      offsetSeconds >= window.startOffsetSeconds &&
      offsetSeconds < window.startOffsetSeconds + window.durationSeconds
    ) {
      rate = Math.max(rate, window.rps);
    }
  }
  const doublePeak = plan.doublePeak;
  if (
    doublePeak &&
    offsetSeconds >= doublePeak.startOffsetSeconds &&
    offsetSeconds < doublePeak.startOffsetSeconds + doublePeak.durationSeconds
  ) {
    rate = Math.max(rate, doublePeak.rps);
  }
  return rate;
}

export function planSegments(plan: RatePlan, durationSeconds: number): RateSegment[] {
  validateRatePlan(plan);
  const windows = [...plan.peaks, ...(plan.doublePeak ? [plan.doublePeak] : [])];
  const boundaries = new Set<number>([0, durationSeconds]);
  for (const window of windows) {
    for (const boundary of [
      window.startOffsetSeconds,
      window.startOffsetSeconds + window.durationSeconds,
    ]) {
      if (boundary > 0 && boundary < durationSeconds) boundaries.add(boundary);
    }
  }
  const sorted = [...boundaries].sort((left, right) => left - right);
  const segments: RateSegment[] = [];
  let requestsBefore = 0;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const startOffsetSeconds = sorted[index];
    const endOffsetSeconds = sorted[index + 1];
    const rate = rateAtOffset(plan, (startOffsetSeconds + endOffsetSeconds) / 2);
    segments.push({ startOffsetSeconds, endOffsetSeconds, rps: rate, requestsBefore });
    requestsBefore += rate * (endOffsetSeconds - startOffsetSeconds);
  }
  return segments;
}

export function cumulativeRequests(plan: RatePlan, durationSeconds: number): number {
  const segments = planSegments(plan, durationSeconds);
  const last = segments[segments.length - 1];
  return last.requestsBefore + last.rps * (last.endOffsetSeconds - last.startOffsetSeconds);
}

export function totalScheduledRequests(plan: RatePlan, durationSeconds: number): number {
  return Math.floor(cumulativeRequests(plan, durationSeconds));
}

export function dueTimeForIndex(plan: RatePlan, durationSeconds: number, index: number): number {
  const segments = planSegments(plan, durationSeconds);
  for (let position = 0; position < segments.length; position += 1) {
    const segment = segments[position];
    const requestsAtEnd =
      segment.requestsBefore +
      segment.rps * (segment.endOffsetSeconds - segment.startOffsetSeconds);
    if (index < requestsAtEnd || position === segments.length - 1) {
      return segment.startOffsetSeconds + (index - segment.requestsBefore) / segment.rps;
    }
  }
  return durationSeconds;
}

export function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export function parseRatePlanFile(contents: string, source: string): RatePlan {
  let raw: unknown;
  try {
    raw = JSON.parse(contents);
  } catch {
    throw new RehearsalRefusal(`Refused: rate plan ${source} is not valid JSON.`);
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new RehearsalRefusal(`Refused: rate plan ${source} must be a JSON object.`);
  }
  const record = raw as Record<string, unknown>;
  const sustainedRps = record.sustainedRps;
  if (typeof sustainedRps !== 'number') {
    throw new RehearsalRefusal(`Refused: rate plan ${source} requires a numeric sustainedRps.`);
  }
  const peaksRaw = record.peaks ?? [];
  if (!Array.isArray(peaksRaw)) {
    throw new RehearsalRefusal(`Refused: rate plan ${source} peaks must be an array.`);
  }
  const readWindow = (value: unknown, label: string): PeakWindow => {
    if (typeof value !== 'object' || value === null) {
      throw new RehearsalRefusal(`Refused: rate plan ${source} ${label} must be an object.`);
    }
    const window = value as Record<string, unknown>;
    if (
      typeof window.startOffsetSeconds !== 'number' ||
      typeof window.durationSeconds !== 'number' ||
      typeof window.rps !== 'number'
    ) {
      throw new RehearsalRefusal(
        `Refused: rate plan ${source} ${label} requires numeric startOffsetSeconds, durationSeconds and rps.`,
      );
    }
    return {
      startOffsetSeconds: window.startOffsetSeconds,
      durationSeconds: window.durationSeconds,
      rps: window.rps,
    };
  };
  const peaks = peaksRaw.map((window, index) => readWindow(window, `peaks[${index}]`));
  const doublePeakRaw = record.doublePeak ?? null;
  const doublePeak = doublePeakRaw === null ? null : readWindow(doublePeakRaw, 'doublePeak');
  const plan: RatePlan = { sustainedRps, peaks, doublePeak };
  validateRatePlan(plan);
  return plan;
}

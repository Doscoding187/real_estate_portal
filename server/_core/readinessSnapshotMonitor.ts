import { randomUUID } from 'node:crypto';

export type ReadinessMonitorVerdict = {
  applicationReady: boolean;
  notReadyLayers: Array<{ layer: string; code: string }>;
};

export type ReadinessMonitorStage = {
  name: string;
  /** Offset from the start of the same assessment. */
  startOffsetMs: number;
  durationMs: number | null;
  outcome: 'ok' | 'threw' | null;
};

export type ReadinessMonitorEvent = {
  event:
    | 'assessment-started'
    | 'assessment-completed'
    | 'assessment-threw'
    | 'context-invalidated'
    | 'snapshot-unavailable';
  assessmentId: string | null;
  assessmentStartedAt: number | null;
  assessmentCompletedAt: number | null;
  durationMs: number | null;
  inFlight: boolean;
  observedAt: number;
  /** Snapshot held when the event was observed; for completions, the evidence being replaced. */
  snapshotAssessmentId: string | null;
  snapshotAgeMs: number | null;
  /** Increments whenever the target context changes; identifies which context an attempt used. */
  contextGeneration: number;
  assessmentGeneration: number | null;
  /** Scheduled versus actual start of this assessment; lag is observed timer/loop lateness only. */
  trigger: 'request' | 'scheduled' | null;
  scheduledStartAt: number | null;
  scheduledDelayMs: number | null;
  startLagMs: number | null;
  /** 'not-reached' means the assessment never resolved its authority. */
  targetIdentity: 'not-reached' | 'resolved' | 'unresolved' | null;
  targetFingerprintHash: string | null;
  stages: ReadinessMonitorStage[];
  /** The stage still running when the event was observed, if any. */
  activeStage: string | null;
  verdict: ReadinessMonitorVerdict | null;
  reason:
    | 'no-snapshot'
    | 'expired'
    | 'clock-reversed'
    | 'context-changed'
    | 'assessment-threw'
    | 'ready'
    | 'not-ready'
    | 'unclassified'
    | 'stopped'
    | null;
};

/** Observation hook passed into each read; calls never affect the assessment outcome. */
export type AssessmentProbe = {
  target(targetFingerprintHash: string | null): void;
  begin(stage: string): void;
  end(stage: string, outcome: 'ok' | 'threw'): void;
  verdict(verdict: ReadinessMonitorVerdict): void;
};

type StageSample = {
  name: string;
  startedAt: number;
  endedAt: number | null;
  outcome: 'ok' | 'threw' | null;
};

type AssessmentRecord = {
  id: string;
  startedAt: number;
  generation: number;
  trigger: 'request' | 'scheduled';
  scheduledStartAt: number | null;
  scheduledDelayMs: number | null;
  startLagMs: number | null;
  target: { state: 'not-reached' | 'resolved' | 'unresolved'; fingerprintHash: string | null };
  stages: StageSample[];
  verdict: ReadinessMonitorVerdict | null;
};

type Snapshot<T> = { value: T; assessmentStartedAt: number; assessmentId: string };
type ScheduledRun = { at: number; delayMs: number };

const MAX_STAGES = 16;

/** One strict verification at a time; request handlers never wait for its sweep. */
export class ReadinessSnapshotMonitor<T> {
  private key: string | null = null;
  private snapshot: Snapshot<T> | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private scheduled: ScheduledRun | null = null;
  private stopped = false;
  private assessment: AssessmentRecord | null = null;
  private generation = 0;
  private unavailableReason: ReadinessMonitorEvent['reason'] = 'no-snapshot';
  private lastUnavailableReason: ReadinessMonitorEvent['reason'] = null;

  constructor(
    private readonly options: {
      read: (probe: AssessmentProbe) => Promise<T>;
      contextKey: () => string;
      maxAgeMs: number;
      refreshDelayMs: number;
      now?: () => number;
      observe?: (event: ReadinessMonitorEvent, value?: T) => void;
      classify?: (value: T) => 'ready' | 'not-ready';
    },
  ) {
    if (
      !Number.isFinite(options.maxAgeMs) ||
      options.maxAgeMs <= 0 ||
      !Number.isFinite(options.refreshDelayMs) ||
      options.refreshDelayMs <= 0 ||
      options.refreshDelayMs >= options.maxAgeMs
    ) {
      throw new Error(
        'Readiness monitor requires a positive bounded age and shorter refresh delay.',
      );
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  /**
   * Clock reads happen inside the guard: a diagnostic failure must not skip the
   * readiness state change that follows it (for example, invalidating a snapshot).
   */
  private emit(
    event: ReadinessMonitorEvent['event'],
    reason: ReadinessMonitorEvent['reason'] = null,
    completed = false,
    value?: T,
    snapshot: Snapshot<T> | null = this.snapshot,
  ): void {
    try {
      const observedAt = this.now();
      const completedAt = completed ? observedAt : null;
      const record = this.assessment;
      this.options.observe?.(
        {
          event,
          reason,
          assessmentId: record?.id ?? null,
          assessmentStartedAt: record?.startedAt ?? null,
          assessmentCompletedAt: completedAt,
          durationMs:
            completedAt !== null && record ? Math.max(0, completedAt - record.startedAt) : null,
          inFlight: this.inFlight !== null,
          observedAt,
          snapshotAssessmentId: snapshot?.assessmentId ?? null,
          snapshotAgeMs: snapshot ? observedAt - snapshot.assessmentStartedAt : null,
          contextGeneration: this.generation,
          assessmentGeneration: record?.generation ?? null,
          trigger: record?.trigger ?? null,
          scheduledStartAt: record?.scheduledStartAt ?? null,
          scheduledDelayMs: record?.scheduledDelayMs ?? null,
          startLagMs: record?.startLagMs ?? null,
          targetIdentity: record?.target.state ?? null,
          targetFingerprintHash:
            record?.target.state === 'resolved' ? record.target.fingerprintHash : null,
          stages: record
            ? record.stages.map(stage => ({
                name: stage.name,
                startOffsetMs: stage.startedAt - record.startedAt,
                durationMs: stage.endedAt === null ? null : stage.endedAt - stage.startedAt,
                outcome: stage.outcome,
              }))
            : [],
          activeStage: activeStageName(record),
          verdict: record?.verdict ?? null,
        },
        value,
      );
    } catch {
      /* Diagnostics must never affect readiness. */
    }
  }

  private probeFor(record: AssessmentRecord): AssessmentProbe {
    // Each call is isolated: a failing observation leaves the assessment untouched.
    const guarded = (action: () => void): void => {
      try {
        action();
      } catch {
        /* Diagnostics must never affect readiness. */
      }
    };
    return {
      target: targetFingerprintHash =>
        guarded(() => {
          record.target = targetFingerprintHash
            ? { state: 'resolved', fingerprintHash: targetFingerprintHash }
            : { state: 'unresolved', fingerprintHash: null };
        }),
      begin: stage =>
        guarded(() => {
          if (record.stages.length < MAX_STAGES) {
            record.stages.push({
              name: stage,
              startedAt: this.now(),
              endedAt: null,
              outcome: null,
            });
          }
        }),
      end: (stage, outcome) =>
        guarded(() => {
          for (let i = record.stages.length - 1; i >= 0; i--) {
            const sample = record.stages[i];
            if (sample.name === stage && sample.endedAt === null) {
              sample.endedAt = this.now();
              sample.outcome = outcome;
              return;
            }
          }
        }),
      verdict: verdict =>
        guarded(() => {
          record.verdict = verdict;
        }),
    };
  }

  private clearSchedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.scheduled = null;
  }

  private synchronizeContext(): void {
    const key = this.options.contextKey();
    if (key === this.key) return;
    if (this.key !== null) {
      this.unavailableReason = 'context-changed';
      this.emit('context-invalidated', 'context-changed');
      this.generation += 1;
    }
    this.key = key;
    this.snapshot = null;
    this.clearSchedule();
  }

  getSnapshot(): T | null {
    if (this.stopped) return null;
    this.synchronizeContext();
    const age = this.snapshot ? this.now() - this.snapshot.assessmentStartedAt : Infinity;
    if (!this.snapshot || age < 0 || age >= this.options.maxAgeMs) {
      const reason = this.snapshot
        ? age < 0
          ? 'clock-reversed'
          : 'expired'
        : this.unavailableReason;
      this.clearSchedule();
      // Start or join the verification first, so the unavailable event names the work in progress.
      this.refresh('request');
      if (reason !== this.lastUnavailableReason) {
        this.lastUnavailableReason = reason;
        this.emit('snapshot-unavailable', reason);
      }
      return null;
    }
    this.lastUnavailableReason = null;
    return this.snapshot.value;
  }

  private refresh(
    trigger: 'request' | 'scheduled' = 'request',
    due: ScheduledRun | null = null,
  ): void {
    if (this.stopped || this.inFlight) return;
    this.synchronizeContext();
    const key = this.key;
    const startedAt = this.now();
    const record: AssessmentRecord = {
      id: randomUUID(),
      startedAt,
      generation: this.generation,
      trigger,
      scheduledStartAt: due?.at ?? null,
      scheduledDelayMs: due?.delayMs ?? null,
      startLagMs: due ? startedAt - due.at : null,
      target: { state: 'not-reached', fingerprintHash: null },
      stages: [],
      verdict: null,
    };
    this.assessment = record;
    const probe = this.probeFor(record);
    this.inFlight = Promise.resolve()
      .then(() => this.options.read(probe))
      .then(value => {
        if (!this.stopped && key === this.options.contextKey()) {
          // Correlate the completion with the evidence it replaces: its age shows
          // whether the previous snapshot had already expired before this sweep finished.
          const replaced = this.snapshot;
          this.snapshot = { value, assessmentStartedAt: startedAt, assessmentId: record.id };
          let outcome: ReadinessMonitorEvent['reason'] = 'unclassified';
          try {
            outcome = this.options.classify?.(value) ?? 'unclassified';
          } catch {
            /* Diagnostic only. */
          }
          this.emit('assessment-completed', outcome, true, value, replaced);
        } else {
          this.emit(
            'assessment-completed',
            this.stopped ? 'stopped' : 'context-changed',
            true,
            value,
          );
        }
      })
      .catch(() => {
        // A failed refresh invalidates the last green result immediately.
        this.emit('assessment-threw', 'assessment-threw', true);
        if (key === this.options.contextKey()) {
          this.snapshot = null;
          this.unavailableReason = 'assessment-threw';
        }
      })
      .finally(() => {
        this.inFlight = null;
        if (this.stopped) return;
        // Reserve time for the next complete sweep within the existing age bound.
        // A slow sweep consumes idle time; snapshot expiry still uses its start.
        const finishedAt = this.now();
        const durationMs = Math.max(0, finishedAt - startedAt);
        const refreshDelayMs = Math.min(
          this.options.refreshDelayMs,
          Math.max(1, this.options.maxAgeMs / 2 - durationMs),
        );
        const delayMs = key === this.options.contextKey() ? refreshDelayMs : 1;
        const run: ScheduledRun = { at: finishedAt + delayMs, delayMs };
        this.scheduled = run;
        this.timer = setTimeout(() => {
          this.timer = null;
          this.scheduled = null;
          this.refresh('scheduled', run);
        }, delayMs);
        this.timer.unref?.();
      });
    this.emit('assessment-started');
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.clearSchedule();
    this.snapshot = null;
    await this.inFlight;
  }
}

function activeStageName(record: AssessmentRecord | null): string | null {
  if (!record) return null;
  for (let i = record.stages.length - 1; i >= 0; i--) {
    if (record.stages[i].endedAt === null) return record.stages[i].name;
  }
  return null;
}

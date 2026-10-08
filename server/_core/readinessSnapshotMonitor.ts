import { randomUUID } from 'node:crypto';

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

type Snapshot<T> = { value: T; assessmentStartedAt: number; assessmentId: string };

/** One strict verification at a time; request handlers never wait for its sweep. */
export class ReadinessSnapshotMonitor<T> {
  private key: string | null = null;
  private snapshot: Snapshot<T> | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private assessment: { id: string; startedAt: number } | null = null;
  private unavailableReason: ReadinessMonitorEvent['reason'] = 'no-snapshot';
  private lastUnavailableReason: ReadinessMonitorEvent['reason'] = null;

  constructor(
    private readonly options: {
      read: () => Promise<T>;
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
      this.options.observe?.(
        {
          event,
          reason,
          assessmentId: this.assessment?.id ?? null,
          assessmentStartedAt: this.assessment?.startedAt ?? null,
          assessmentCompletedAt: completedAt,
          durationMs:
            completedAt !== null && this.assessment
              ? Math.max(0, completedAt - this.assessment.startedAt)
              : null,
          inFlight: this.inFlight !== null,
          observedAt,
          snapshotAssessmentId: snapshot?.assessmentId ?? null,
          snapshotAgeMs: snapshot ? observedAt - snapshot.assessmentStartedAt : null,
        },
        value,
      );
    } catch {
      /* Diagnostics must never affect readiness. */
    }
  }

  private synchronizeContext(): void {
    const key = this.options.contextKey();
    if (key === this.key) return;
    if (this.key !== null) {
      this.unavailableReason = 'context-changed';
      this.emit('context-invalidated', 'context-changed');
    }
    // Context change invalidates the held snapshot; the event above records its age first.
    this.key = key;
    this.snapshot = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
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
      if (reason !== this.lastUnavailableReason) {
        this.lastUnavailableReason = reason;
        this.emit('snapshot-unavailable', reason);
      }
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.refresh();
      return null;
    }
    this.lastUnavailableReason = null;
    return this.snapshot.value;
  }

  private refresh(): void {
    if (this.stopped || this.inFlight) return;
    this.synchronizeContext();
    const key = this.key;
    const assessmentStartedAt = this.now();
    this.assessment = { id: randomUUID(), startedAt: assessmentStartedAt };
    this.inFlight = Promise.resolve()
      .then(this.options.read)
      .then(value => {
        if (!this.stopped && key === this.options.contextKey()) {
          // Correlate the completion with the evidence it replaces: its age shows
          // whether the previous snapshot had already expired before this sweep finished.
          const replaced = this.snapshot;
          this.snapshot = { value, assessmentStartedAt, assessmentId: this.assessment!.id };
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
        const durationMs = Math.max(0, this.now() - assessmentStartedAt);
        const refreshDelayMs = Math.min(
          this.options.refreshDelayMs,
          Math.max(1, this.options.maxAgeMs / 2 - durationMs),
        );
        this.timer = setTimeout(
          () => {
            this.timer = null;
            this.refresh();
          },
          key === this.options.contextKey() ? refreshDelayMs : 1,
        );
        this.timer.unref?.();
      });
    this.emit('assessment-started');
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.snapshot = null;
    await this.inFlight;
  }
}

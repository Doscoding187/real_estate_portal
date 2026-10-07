/** One strict verification at a time; request handlers never wait for its sweep. */
export class ReadinessSnapshotMonitor<T> {
  private key: string | null = null;
  private snapshot: { value: T; assessmentStartedAt: number } | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly options: {
      read: () => Promise<T>;
      contextKey: () => string;
      maxAgeMs: number;
      refreshDelayMs: number;
      now?: () => number;
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

  private synchronizeContext(): void {
    const key = this.options.contextKey();
    if (key === this.key) return;
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
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.refresh();
      return null;
    }
    return this.snapshot.value;
  }

  private refresh(): void {
    if (this.stopped || this.inFlight) return;
    this.synchronizeContext();
    const key = this.key;
    const assessmentStartedAt = this.now();
    this.inFlight = Promise.resolve()
      .then(this.options.read)
      .then(value => {
        if (!this.stopped && key === this.options.contextKey()) {
          this.snapshot = { value, assessmentStartedAt };
        }
      })
      .catch(() => {
        // A failed refresh invalidates the last green result immediately.
        if (key === this.options.contextKey()) this.snapshot = null;
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
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.snapshot = null;
    await this.inFlight;
  }
}

import {
  runDistributionReferralEvidenceRetentionSweep,
  type DistributionReferralEvidenceRetentionSweep,
} from './distributionReferralEvidenceRetentionService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function enabledFromEnv(): boolean {
  return parseBooleanEnv(
    process.env.DISTRIBUTION_EVIDENCE_RETENTION_SCHEDULER_ENABLED,
    false,
  );
}

function intervalFromEnv(): number {
  const value = Number(process.env.DISTRIBUTION_EVIDENCE_RETENTION_SCHEDULER_INTERVAL_MS || '');
  return Number.isFinite(value) && value >= 60_000 ? Math.floor(value) : DEFAULT_INTERVAL_MS;
}

function errorCode(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    typeof (error as { name?: unknown }).name === 'string'
  ) {
    const name = (error as { name: string }).name.trim();
    if (/^[A-Za-z][A-Za-z0-9_]{0,118}$/.test(name)) return name;
  }
  return 'retention_sweep_failed';
}

export type DistributionReferralEvidenceRetentionSchedulerStatus = {
  enabled: boolean;
  running: boolean;
  timerActive: boolean;
  intervalMs: number;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunFailedAt: string | null;
  lastErrorCode: string | null;
  lastResult: DistributionReferralEvidenceRetentionSweep | null;
};

class DistributionReferralEvidenceRetentionScheduler {
  private timer: NodeJS.Timeout | null = null;
  private currentRun: Promise<void> | null = null;
  private lifecycleGeneration = 0;
  private status: DistributionReferralEvidenceRetentionSchedulerStatus = {
    enabled: enabledFromEnv(),
    running: false,
    timerActive: false,
    intervalMs: intervalFromEnv(),
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastRunFailedAt: null,
    lastErrorCode: null,
    lastResult: null,
  };

  async start(): Promise<DistributionReferralEvidenceRetentionSchedulerStatus> {
    this.status.enabled = enabledFromEnv();
    this.status.intervalMs = intervalFromEnv();
    if (!this.status.enabled || this.timer) return this.getStatus();

    const generation = this.lifecycleGeneration;
    this.timer = setInterval(() => {
      void this.runForGeneration(generation);
    }, this.status.intervalMs);
    this.timer.unref?.();
    this.status.timerActive = true;
    void this.runForGeneration(generation);
    return this.getStatus();
  }

  async stop(): Promise<void> {
    this.lifecycleGeneration += 1;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.status.timerActive = false;
    await this.currentRun;
  }

  getStatus(): DistributionReferralEvidenceRetentionSchedulerStatus {
    return {
      ...this.status,
      lastResult: this.status.lastResult
        ? { ...this.status.lastResult, blockedBySchema: [...this.status.lastResult.blockedBySchema] }
        : null,
    };
  }

  async runNow(): Promise<DistributionReferralEvidenceRetentionSchedulerStatus> {
    await this.runForGeneration(this.lifecycleGeneration);
    return this.getStatus();
  }

  private runForGeneration(generation: number): Promise<void> {
    if (this.currentRun) return this.currentRun;
    const running = (async () => {
      this.status.running = true;
      this.status.lastRunStartedAt = new Date().toISOString();
      this.status.lastErrorCode = null;
      try {
        const result = await runDistributionReferralEvidenceRetentionSweep();
        this.status.lastResult = result;
        this.status.lastRunCompletedAt = new Date().toISOString();
        if (!result.ready) {
          console.info('[DistributionEvidenceRetention] Waiting for canonical schema.', {
            missingItems: result.blockedBySchema,
          });
        } else if (result.deletedEvidence || result.failedEvidenceDeletions || result.expiredSessions) {
          console.info('[DistributionEvidenceRetention] Sweep completed.', {
            expiredSessions: result.expiredSessions,
            scannedEvidence: result.scannedEvidence,
            deletedEvidence: result.deletedEvidence,
            failedEvidenceDeletions: result.failedEvidenceDeletions,
          });
        }
      } catch (error) {
        this.status.lastRunFailedAt = new Date().toISOString();
        this.status.lastErrorCode = errorCode(error);
        console.error('[DistributionEvidenceRetention] Sweep failed.', {
          errorCode: this.status.lastErrorCode,
        });
      } finally {
        this.status.running = false;
        this.currentRun = null;
        if (generation !== this.lifecycleGeneration) this.status.timerActive = false;
      }
    })();
    this.currentRun = running;
    return running;
  }
}

export const distributionReferralEvidenceRetentionScheduler =
  new DistributionReferralEvidenceRetentionScheduler();

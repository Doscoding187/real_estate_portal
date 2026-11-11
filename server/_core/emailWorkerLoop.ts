import type { getWorkerDb } from '../db-connection';
import {
  consumeLaunchEmailEvents,
  runTransactionalEmailWorker,
  transactionalEmailBacklog,
} from '../services/transactionalEmailDeliveryService';

export type EmailSupervisorDependencies = {
  batch: () => Promise<unknown>;
  close: () => Promise<void>;
  log: (value: unknown) => void;
  pollMs?: number;
};

export type EmailWorkerBacklogSummary = {
  [state: string]: number | boolean;
  stale: number;
  attention: boolean;
};

/**
 * Machine-readable attention contract for the long-running supervisor. The
 * durable states below require human reconciliation, so the supervisor keeps
 * polling and every batch log carries this marker for platform alerting.
 */
export function summarizeEmailWorkerBacklog(
  backlog: Array<{ state: string; stale: boolean }>,
): EmailWorkerBacklogSummary {
  const counts = backlog.reduce<Record<string, number>>((acc, row) => {
    acc[row.state] = (acc[row.state] || 0) + 1;
    return acc;
  }, {});
  const stale = backlog.filter(row => row.stale).length;
  const attention =
    stale > 0 || (counts.unknown || 0) > 0 || (counts.permanent_failed || 0) > 0;
  return { ...counts, stale, attention };
}

/** One batch at a time. The durable B10 authority owns claims, leases and retries. */
export async function runEmailSupervisor(
  signal: AbortSignal,
  dependencies: EmailSupervisorDependencies,
): Promise<void> {
  const pollMs = dependencies.pollMs ?? 10_000;
  if (!Number.isInteger(pollMs) || pollMs < 1_000 || pollMs > 60_000) {
    throw new Error('Email worker poll interval must be between 1000 and 60000 ms.');
  }
  try {
    while (!signal.aborted) {
      const startedAt = new Date().toISOString();
      const result = await dependencies.batch();
      dependencies.log({ kind: 'email-worker-batch', startedAt, completedAt: new Date().toISOString(), result });
      if (signal.aborted) break;
      await new Promise<void>(resolve => {
        const timer = setTimeout(finish, pollMs);
        function finish() {
          clearTimeout(timer);
          signal.removeEventListener('abort', finish);
          resolve();
        }
        signal.addEventListener('abort', finish, { once: true });
        if (signal.aborted) finish();
      });
    }
  } finally {
    await dependencies.close();
  }
}

/** One billing email batch (event consumption, delivery, backlog summary) on an existing handle. */
export async function runEmailWorkerBatch(
  database: NonNullable<Awaited<ReturnType<typeof getWorkerDb>>>,
) {
  const consumed = await consumeLaunchEmailEvents({ database });
  const delivery = await runTransactionalEmailWorker({ database });
  const backlog = await transactionalEmailBacklog(database);
  return { consumed, delivery, backlog: summarizeEmailWorkerBacklog(backlog) };
}

export function resolveEmailWorkerPollMs(env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.EMAIL_WORKER_POLL_MS || '10000');
}

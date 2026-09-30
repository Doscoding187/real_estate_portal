import { getWorkerDb, shutdownDb } from '../server/db-connection';
import { assertNoDeployedTestConfiguration } from '../server/_core/securityRuntimeConfiguration';
import { assertHostedRuntimeConfiguration } from '../server/_core/hostedRuntimeConfiguration';
import { isTransactionalEmailConfigured } from '../server/_core/transactionalEmailConfig';
import {
  consumeLaunchEmailEvents,
  runTransactionalEmailWorker,
  transactionalEmailBacklog,
} from '../server/services/transactionalEmailDeliveryService';

export type EmailSupervisorDependencies = {
  batch: () => Promise<unknown>;
  close: () => Promise<void>;
  log: (value: unknown) => void;
  pollMs?: number;
};

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

export async function runHostedEmailSupervisor(signal: AbortSignal): Promise<void> {
  assertNoDeployedTestConfiguration();
  assertHostedRuntimeConfiguration();
  if (!isTransactionalEmailConfigured()) {
    throw new Error('Transactional email supervisor requires configured Resend credentials and sender.');
  }
  const database = await getWorkerDb();
  if (!database) throw new Error('Transactional email worker database unavailable.');
  await runEmailSupervisor(signal, {
    async batch() {
      const consumed = await consumeLaunchEmailEvents({ database });
      const delivery = await runTransactionalEmailWorker({ database });
      const backlog = await transactionalEmailBacklog(database);
      const counts = backlog.reduce<Record<string, number>>((acc, row) => {
        acc[row.state] = (acc[row.state] || 0) + 1;
        return acc;
      }, {});
      return { consumed, delivery, backlog: { ...counts, stale: backlog.filter(row => row.stale).length } };
    },
    close: shutdownDb,
    log: value => console.log(JSON.stringify(value)),
    pollMs: Number(process.env.EMAIL_WORKER_POLL_MS || '10000'),
  });
}

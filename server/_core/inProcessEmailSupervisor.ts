import { isTransactionalEmailConfigured } from './transactionalEmailConfig';
import {
  resolveEmailWorkerPollMs,
  runEmailSupervisor,
  runEmailWorkerBatch,
} from './emailWorkerLoop';
import { safeErrorSummary } from './safeError';
import { getDb } from '../db-connection';

type InProcessEmailDependencies = {
  env?: NodeJS.ProcessEnv;
  isConfigured?: () => boolean;
  batch?: () => Promise<unknown>;
  log?: (message: string) => void;
};

export type InProcessEmailSupervisor = { stop: () => Promise<void> };

const ERROR_LOG_INTERVAL_MS = 60_000;

function summarize(error: unknown): string {
  return JSON.stringify(safeErrorSummary(error));
}

/** Only batches that did something, or need attention, are worth a log line. */
function isNotable(value: unknown): boolean {
  const result = (value as { result?: Record<string, any> } | null)?.result;
  if (!result) return false;
  if (result.failed === true) return false;
  return (
    Number(result.consumed?.queued) > 0 ||
    Number(result.consumed?.attention) > 0 ||
    Number(result.delivery?.claimed) > 0 ||
    result.backlog?.attention === true
  );
}

/**
 * Runs the billing email loop inside the API process. Returns null (with a logged
 * reason) when it is not started. Claims/leases in transactionalEmailDeliveryService
 * keep multiple replicas safe; the loop never closes the shared database handle.
 */
export function startInProcessEmailSupervisor(
  deps: InProcessEmailDependencies = {},
): InProcessEmailSupervisor | null {
  const env = deps.env ?? process.env;
  const log = deps.log ?? ((message: string) => console.log(message));
  if (env.NODE_ENV === 'test') {
    log('[EmailSupervisor] in-process disabled: test environment');
    return null;
  }
  if (env.EMAIL_WORKER_IN_PROCESS === 'false') {
    log('[EmailSupervisor] in-process disabled: EMAIL_WORKER_IN_PROCESS=false');
    return null;
  }
  if (env.NODE_ENV !== 'production' && env.EMAIL_WORKER_IN_PROCESS !== 'true') {
    log('[EmailSupervisor] in-process disabled: not production (set EMAIL_WORKER_IN_PROCESS=true to enable)');
    return null;
  }
  if (!(deps.isConfigured ?? (() => isTransactionalEmailConfigured(env)))()) {
    log('[EmailSupervisor] in-process disabled: transactional email not configured');
    return null;
  }
  const pollMs = resolveEmailWorkerPollMs(env);
  if (!Number.isInteger(pollMs) || pollMs < 1_000 || pollMs > 60_000) {
    log('[EmailSupervisor] in-process disabled: EMAIL_WORKER_POLL_MS outside 1000..60000');
    return null;
  }
  const controller = new AbortController();
  const batch =
    deps.batch ??
    (async () => {
      const database = await getDb();
      if (!database) throw new Error('database unavailable');
      return runEmailWorkerBatch(database);
    });
  let lastErrorLogAt = 0;
  log(`[EmailSupervisor] in-process started pollMs=${pollMs}`);
  const loop = runEmailSupervisor(controller.signal, {
    async batch() {
      try {
        return await batch();
      } catch (error) {
        const now = Date.now();
        if (lastErrorLogAt === 0 || now - lastErrorLogAt >= ERROR_LOG_INTERVAL_MS) {
          lastErrorLogAt = now;
          log(`[EmailSupervisor] batch failed ${summarize(error)}`);
        }
        return { failed: true };
      }
    },
    close: async () => {},
    log: value => {
      if (isNotable(value)) log(JSON.stringify(value));
    },
    pollMs,
  }).catch(error => {
    log(`[EmailSupervisor] loop stopped ${summarize(error)}`);
  });
  return {
    async stop() {
      controller.abort();
      await loop;
    },
  };
}

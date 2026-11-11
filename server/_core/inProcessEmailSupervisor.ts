import { isTransactionalEmailConfigured } from './transactionalEmailConfig';
import {
  resolveEmailWorkerPollMs,
  runEmailSupervisor,
  runEmailWorkerBatch,
} from './emailWorkerLoop';
import { getDb } from '../db-connection';

type InProcessEmailDependencies = {
  env?: NodeJS.ProcessEnv;
  isConfigured?: () => boolean;
  batch?: () => Promise<unknown>;
  log?: (message: string) => void;
};

export type InProcessEmailSupervisor = { stop: () => Promise<void> };

function summarize(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
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
  log(`[EmailSupervisor] in-process started pollMs=${pollMs}`);
  const loop = runEmailSupervisor(controller.signal, {
    async batch() {
      try {
        return await batch();
      } catch (error) {
        log(`[EmailSupervisor] batch failed ${summarize(error)}`);
        return { failed: true };
      }
    },
    close: async () => {},
    log: value => log(JSON.stringify(value)),
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

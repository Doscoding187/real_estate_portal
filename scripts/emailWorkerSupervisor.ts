import { getWorkerDb, shutdownDb } from '../server/db-connection';
import { assertNoDeployedTestConfiguration } from '../server/_core/securityRuntimeConfiguration';
import { assertHostedRuntimeConfiguration } from '../server/_core/hostedRuntimeConfiguration';
import { isTransactionalEmailConfigured } from '../server/_core/transactionalEmailConfig';
import {
  resolveEmailWorkerPollMs,
  runEmailSupervisor,
  runEmailWorkerBatch,
} from '../server/_core/emailWorkerLoop';

export {
  resolveEmailWorkerPollMs,
  runEmailSupervisor,
  runEmailWorkerBatch,
  summarizeEmailWorkerBacklog,
} from '../server/_core/emailWorkerLoop';
export type {
  EmailSupervisorDependencies,
  EmailWorkerBacklogSummary,
} from '../server/_core/emailWorkerLoop';

export async function runHostedEmailSupervisor(signal: AbortSignal): Promise<void> {
  assertNoDeployedTestConfiguration();
  assertHostedRuntimeConfiguration();
  if (!isTransactionalEmailConfigured()) {
    throw new Error('Transactional email supervisor requires configured Resend credentials and sender.');
  }
  const database = await getWorkerDb();
  if (!database) throw new Error('Transactional email worker database unavailable.');
  await runEmailSupervisor(signal, {
    batch: () => runEmailWorkerBatch(database),
    close: shutdownDb,
    log: value => console.log(JSON.stringify(value)),
    pollMs: resolveEmailWorkerPollMs(),
  });
}

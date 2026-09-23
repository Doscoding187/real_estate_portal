import { runHostedEmailSupervisor } from './emailWorkerSupervisor';

const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());

try {
  await runHostedEmailSupervisor(controller.signal);
} catch (error) {
  console.error('[EmailSupervisor] Process failed.', {
    message: error instanceof Error ? error.message : 'Unknown worker error.',
  });
  process.exitCode = 1;
}

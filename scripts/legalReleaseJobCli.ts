import { LegalReleaseJobFailure, runLegalReleaseJob } from './legalReleaseJob';

async function main() {
  const lines = await runLegalReleaseJob(process.env);
  for (const line of lines) console.log(JSON.stringify(line));
}

main().catch(error => {
  // Never emit driver text or connection URLs.
  console.error(
    JSON.stringify({
      event: 'legal-release-job-failed',
      stage: error instanceof LegalReleaseJobFailure ? error.stage : 'unknown',
      safeToReplay: false,
    }),
  );
  process.exitCode = 1;
});

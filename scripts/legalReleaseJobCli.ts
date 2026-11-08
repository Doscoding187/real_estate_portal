import { legalReleaseFailureLine, runLegalReleaseJob } from './legalReleaseJob';

async function main() {
  // Each line is printed as soon as it exists, so apply evidence is never lost
  // if the post-apply verify fails.
  await runLegalReleaseJob(process.env, undefined, line => console.log(JSON.stringify(line)));
}

main().catch(error => {
  // Never emit driver text or connection URLs.
  console.error(JSON.stringify(legalReleaseFailureLine(error, process.env)));
  process.exitCode = 1;
});

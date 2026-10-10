import { readFileSync } from 'node:fs';
import { expectedDatabaseAcknowledgement } from '../server/_core/databaseAuthority/authorization';
import {
  applyCanonicalPlaceRuntimeGrants,
  canonicalPlaceRuntimeGrantPlan,
  PlaceRuntimeGrantFailure,
} from '../server/_core/databaseAuthority/canonicalPlaceRuntimeGrants';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['plan', 'apply'].includes(args[0])) {
    throw new Error('Use exactly plan or apply; apply reads ephemeral operator inputs from stdin.');
  }
  if (args[0] === 'plan') {
    const { before: _before, after: _after, ...plan } = canonicalPlaceRuntimeGrantPlan();
    console.log(
      JSON.stringify({ ...plan, requiredAcknowledgement: expectedDatabaseAcknowledgement(plan) }),
    );
    return;
  }
  const input = JSON.parse(readFileSync(0, 'utf8')) as Record<string, unknown>;
  const keys = ['adminDatabaseUrl', 'acknowledgement', 'planDigest'];
  if (
    Object.keys(input).length !== keys.length ||
    keys.some(key => typeof input[key] !== 'string' || !input[key])
  ) {
    throw new Error('Apply input must contain exactly the three required operator fields.');
  }
  const result = await applyCanonicalPlaceRuntimeGrants({
    adminDatabaseUrl: input.adminDatabaseUrl as string,
    acknowledgement: input.acknowledgement as string,
    planDigest: input.planDigest as string,
    observe: progress => {
      console.log(
        JSON.stringify({
          event: 'place-runtime-grant-progress',
          planDigest: input.planDigest,
          ...progress,
        }),
      );
    },
  });
  console.log(JSON.stringify({ event: 'place-runtime-grant-completed', ...result }));
}

main().catch(error => {
  // Driver causes remain available to a private in-process caller; CLI never emits raw errors/URLs.
  console.error(
    JSON.stringify({
      event: 'place-runtime-grant-failed',
      failureStage:
        error instanceof PlaceRuntimeGrantFailure ? error.failureStage : 'validation-or-connect',
      safeToReplay: false,
      progress: error instanceof PlaceRuntimeGrantFailure ? error.progress : null,
      cleanupFailureCount:
        error instanceof PlaceRuntimeGrantFailure ? error.cleanupFailures.length : 0,
    }),
  );
  process.exitCode = 1;
});

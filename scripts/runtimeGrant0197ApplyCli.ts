import {
  applyRuntimeGrant0197,
  runtimeGrant0197Acknowledgement,
  runtimeGrant0197ApplyPlan,
  Runtime0197GrantFailure,
  RUNTIME_0197_ADMIN_URL_ENV,
} from '../server/_core/databaseAuthority/runtimeGrant0197Apply';

import { resolveRuntimeGrant0197CliInputs } from './runtimeGrant0197CliInputs';

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'plan') {
    const plan = runtimeGrant0197ApplyPlan();
    console.log(
      JSON.stringify({
        ...plan,
        requiredApplyAcknowledgement: runtimeGrant0197Acknowledgement('apply', plan.planDigest),
        requiredRollbackAcknowledgement: runtimeGrant0197Acknowledgement(
          'rollback',
          plan.planDigest,
        ),
      }),
    );
    return;
  }
  if (mode !== 'apply' && mode !== 'rollback') {
    throw new Error('Use exactly plan, apply or rollback.');
  }
  const adminDatabaseUrl = process.env[RUNTIME_0197_ADMIN_URL_ENV];
  if (!adminDatabaseUrl) throw new Error('Admin connection input is missing.');
  const { planDigest, acknowledgement } = resolveRuntimeGrant0197CliInputs(rest, process.env);
  const result = await applyRuntimeGrant0197({
    mode,
    adminDatabaseUrl,
    planDigest,
    acknowledgement,
    observe: progress => {
      console.log(
        JSON.stringify({ event: 'runtime-0197-grant-progress', mode, planDigest, ...progress }),
      );
    },
  });
  console.log(JSON.stringify({ event: 'runtime-0197-grant-completed', ...result }));
}

main().catch(error => {
  // Driver causes remain available to a private in-process caller; CLI never emits raw errors/URLs.
  console.error(
    JSON.stringify({
      event: 'runtime-0197-grant-failed',
      failureStage:
        error instanceof Runtime0197GrantFailure ? error.failureStage : 'validation-or-connect',
      safeToReplay: false,
      progress: error instanceof Runtime0197GrantFailure ? error.progress : null,
      cleanupFailureCount:
        error instanceof Runtime0197GrantFailure ? error.cleanupFailures.length : 0,
    }),
  );
  process.exitCode = 1;
});

import {
  applyRuntimeGrant0200,
  runtimeGrant0200Acknowledgement,
  runtimeGrant0200ApplyPlan,
  Runtime0200GrantFailure,
  RUNTIME_0200_ADMIN_URL_ENV,
} from '../server/_core/databaseAuthority/runtimeGrant0200Apply';

import { resolveRuntimeGrant0200CliInputs } from './runtimeGrant0200CliInputs';

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'plan') {
    const plan = runtimeGrant0200ApplyPlan();
    console.log(
      JSON.stringify({
        ...plan,
        requiredApplyAcknowledgement: runtimeGrant0200Acknowledgement('apply', plan.planDigest),
        requiredRollbackAcknowledgement: runtimeGrant0200Acknowledgement(
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
  const adminDatabaseUrl = process.env[RUNTIME_0200_ADMIN_URL_ENV];
  if (!adminDatabaseUrl) throw new Error('Admin connection input is missing.');
  const { planDigest, acknowledgement } = resolveRuntimeGrant0200CliInputs(rest, process.env);
  const result = await applyRuntimeGrant0200({
    mode,
    adminDatabaseUrl,
    planDigest,
    acknowledgement,
    observe: progress => {
      console.log(
        JSON.stringify({ event: 'runtime-0200-grant-progress', mode, planDigest, ...progress }),
      );
    },
  });
  console.log(JSON.stringify({ event: 'runtime-0200-grant-completed', ...result }));
}

main().catch(error => {
  // Driver causes remain available to a private in-process caller; CLI never emits raw errors/URLs.
  console.error(
    JSON.stringify({
      event: 'runtime-0200-grant-failed',
      failureStage:
        error instanceof Runtime0200GrantFailure ? error.failureStage : 'validation-or-connect',
      safeToReplay: false,
      progress: error instanceof Runtime0200GrantFailure ? error.progress : null,
      cleanupFailureCount:
        error instanceof Runtime0200GrantFailure ? error.cleanupFailures.length : 0,
    }),
  );
  process.exitCode = 1;
});

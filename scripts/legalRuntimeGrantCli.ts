import {
  applyLegalRuntimeGrants,
  legalRuntimeGrantAcknowledgement,
  legalRuntimeGrantExecutionPlan,
  LegalRuntimeGrantFailure,
  LEGAL_RUNTIME_GRANT_ADMIN_URL_ENV,
  resolveLegalGrantOperatorInputs,
} from '../server/_core/databaseAuthority/legalRuntimeGrants';

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'plan') {
    const plan = legalRuntimeGrantExecutionPlan();
    console.log(
      JSON.stringify({
        ...plan,
        requiredApplyAcknowledgement: legalRuntimeGrantAcknowledgement('apply', plan.planDigest),
        requiredRollbackAcknowledgement: legalRuntimeGrantAcknowledgement(
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
  // Admin URL comes only from the job environment (secretref); there is no stdin.
  const adminDatabaseUrl = process.env[LEGAL_RUNTIME_GRANT_ADMIN_URL_ENV];
  if (!adminDatabaseUrl) throw new Error('Admin connection input is missing.');
  const { planDigest, acknowledgement } = resolveLegalGrantOperatorInputs(rest, process.env);
  const result = await applyLegalRuntimeGrants({
    mode,
    adminDatabaseUrl,
    planDigest,
    acknowledgement,
    observe: progress => {
      console.log(
        JSON.stringify({ event: 'legal-runtime-grant-progress', mode, planDigest, ...progress }),
      );
    },
  });
  console.log(JSON.stringify({ event: 'legal-runtime-grant-completed', ...result }));
}

main().catch(error => {
  // Driver causes remain available to a private in-process caller; CLI never emits raw errors/URLs.
  console.error(
    JSON.stringify({
      event: 'legal-runtime-grant-failed',
      failureStage:
        error instanceof LegalRuntimeGrantFailure ? error.failureStage : 'validation',
      safeToReplay: false,
      progress: error instanceof LegalRuntimeGrantFailure ? error.progress : null,
      cleanupFailureCount:
        error instanceof LegalRuntimeGrantFailure ? error.cleanupFailures.length : 0,
    }),
  );
  process.exitCode = 1;
});

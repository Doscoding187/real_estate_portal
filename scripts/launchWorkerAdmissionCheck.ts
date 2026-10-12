import {
  authorizeDatabaseOperation,
  B08_WORKER_IDENTITY,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { createAuthorityRuntimePool } from '../server/_core/databaseAuthority/connectionAuthority';
import { buildIsolatedCiGrantPlan } from '../server/_core/databaseAuthority/isolatedCiCredentials';
import { assertIsolatedCiGrants } from '../server/_core/databaseAuthority/isolatedCiGrantVerification';
import {
  assertHostedRuntimeConfiguration,
  resolveHostedBuildSha,
} from '../server/_core/hostedRuntimeConfiguration';
import { assertNoDeployedTestConfiguration } from '../server/_core/securityRuntimeConfiguration';
import { leadDeliveries, transactionalEmailDeliveries } from '../drizzle/schema';

export type WorkerAdmissionExpectation = {
  sha: string;
  fingerprint: string;
  projectId: string;
  environmentId: string;
  serviceId: string;
  expiresAt: string;
};

function requireCondition(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

export function assertWorkerAdmissionWindow(expiresAt: string, nowMs = Date.now()): void {
  const deadline = Date.parse(expiresAt);
  requireCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiresAt) &&
      Number.isFinite(deadline) &&
      new Date(deadline).toISOString() === expiresAt.replace('Z', '.000Z') &&
      deadline > nowMs &&
      deadline - nowMs <= 30 * 60_000,
    'admission-window-invalid',
  );
}

export function assertWorkerAdmissionEnvironment(
  expected: WorkerAdmissionExpectation,
  env: NodeJS.ProcessEnv = process.env,
): void {
  requireCondition(
    /^[a-f0-9]{40}$/.test(expected.sha) && /^[a-f0-9]{64}$/.test(expected.fingerprint),
    'admission-expectation-invalid',
  );
  for (const id of [expected.projectId, expected.environmentId, expected.serviceId]) {
    requireCondition(
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id),
      'admission-expectation-invalid',
    );
  }
  assertWorkerAdmissionWindow(expected.expiresAt);
  requireCondition(
    env.APP_ENV === 'production' &&
      env.NODE_ENV === 'production' &&
      env.DATABASE_CREDENTIAL_CLASS === 'worker',
    'admission-runtime-or-role-mismatch',
  );
  requireCondition(
    resolveHostedBuildSha(env) === expected.sha && env.RAILWAY_GIT_COMMIT_SHA === expected.sha,
    'admission-source-mismatch',
  );
  requireCondition(
    env.RAILWAY_PROJECT_ID === expected.projectId &&
      env.RAILWAY_ENVIRONMENT_ID === expected.environmentId &&
      env.RAILWAY_SERVICE_ID === expected.serviceId,
    'admission-service-mismatch',
  );
  requireCondition(
    env.PAID_MVP_SALES_PAUSED === 'true' &&
      !env.PAID_MVP_ENABLED_PRODUCT_KEYS?.trim() &&
      !env.PAID_MVP_ADMITTED_OWNERS?.trim() &&
      !env.PAID_MVP_SALES_OPEN_UNTIL?.trim(),
    'admission-commercial-hold-mismatch',
  );
  assertNoDeployedTestConfiguration(env);
  assertHostedRuntimeConfiguration(env);
}

type Row = Record<string, unknown>;
function rows(result: unknown): Row[] {
  requireCondition(Array.isArray(result) && Array.isArray(result[0]), 'admission-result-invalid');
  return result[0] as Row[];
}

function queueCounts(result: unknown, states: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows(result)) {
    const state = String(row.state);
    const total = Number(row.total);
    requireCondition(
      states.includes(state) && Number.isSafeInteger(total) && total > 0 && !(state in counts),
      'admission-queue-result-invalid',
    );
    counts[state] = total;
  }
  return counts;
}

/** No provider imports, event consumption, claims, recovery, DML or DDL. */
export async function inspectLaunchWorker(expected: WorkerAdmissionExpectation) {
  assertWorkerAdmissionEnvironment(expected);
  const authority = resolveDatabaseAuthority({
    operation: 'worker-connect',
    credentialClass: 'worker',
  });
  const context = authority.context;
  requireCondition(
    context.targetClass === 'production' &&
      context.runtimeMode === 'production' &&
      context.targetFingerprintHash === expected.fingerprint &&
      context.credentialClass === 'worker' &&
      context.tls.required &&
      context.tls.certificateVerificationRequired,
    'admission-target-mismatch',
  );
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const grants = buildIsolatedCiGrantPlan({
    databaseName: context.databaseName,
    roleUsers: {
      runtime: 'propertylistify_app_runtime',
      worker: B08_WORKER_IDENTITY,
      'read-only': 'propertylistify_b08_inspector',
      migration: 'propertylistify_release_migrator',
    },
  });
  assertWorkerAdmissionWindow(expected.expiresAt);
  const pool = await createAuthorityRuntimePool(authority, decision);
  try {
    const connection = await pool.pool.getConnection();
    try {
      const read = async (statement: string) => {
        assertWorkerAdmissionWindow(expected.expiresAt);
        return connection.query({ sql: statement, timeout: 10_000 });
      };
      const [session] = rows(
        await read(
          'SELECT DATABASE() AS selected_database, CURRENT_USER() AS current_identity, @@session.time_zone AS timezone',
        ),
      );
      requireCondition(
        session?.selected_database === context.databaseName &&
          session.current_identity === `${B08_WORKER_IDENTITY}@%` &&
          session.timezone === '+00:00',
        'admission-session-mismatch',
      );
      const [tls] = rows(await read("SHOW SESSION STATUS LIKE 'Ssl_version'"));
      requireCondition(
        tls?.Value === 'TLSv1.2' || tls?.Value === 'TLSv1.3',
        'admission-tls-mismatch',
      );
      const actualGrants = rows(await read('SHOW GRANTS')).flatMap(row =>
        Object.values(row).map(String),
      );
      const grantDigest = assertIsolatedCiGrants(
        actualGrants,
        grants.statementsByCredential.worker,
        B08_WORKER_IDENTITY,
      );
      for (const table of ['sql_migration_history', 'billing_payment_documents']) {
        let denied = false;
        try {
          await read(`SELECT 1 FROM \`${table}\` LIMIT 0`);
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ER_TABLEACCESS_DENIED_ERROR' &&
            'errno' in error &&
            error.errno === 1142
          )
            denied = true;
          else throw error;
        }
        requireCondition(denied, 'admission-denial-boundary-failed');
      }
      // Aggregate canonical states only: no recipient, token, provider ID or document data.
      const email = queueCounts(
        await read(
          'SELECT state, COUNT(*) AS total FROM transactional_email_deliveries GROUP BY state',
        ),
        transactionalEmailDeliveries.state.enumValues,
      );
      const lead = queueCounts(
        await read('SELECT state, COUNT(*) AS total FROM lead_deliveries GROUP BY state'),
        leadDeliveries.state.enumValues,
      );
      return {
        kind: 'launch-worker-admission',
        checkedAt: new Date().toISOString(),
        ok: true,
        sourceSha: expected.sha,
        projectId: expected.projectId,
        environmentId: expected.environmentId,
        serviceId: expected.serviceId,
        targetFingerprintHash: context.targetFingerprintHash,
        identity: B08_WORKER_IDENTITY,
        tlsVersion: String(tls.Value),
        timezone: '+00:00',
        grantDigest,
        denials: { migrationLedgerRead: true, privatePaymentDocumentRead: true },
        queues: { email, lead },
        deliveryAuthorized: false,
      };
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
}

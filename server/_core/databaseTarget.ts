import type { AppRuntimeEnv } from './runtimeBootstrap';

export function getExpectedDatabaseName(runtimeEnv: AppRuntimeEnv): string | null {
  if (runtimeEnv === 'production') return 'listify_property_sa';
  if (runtimeEnv === 'staging') return 'listify_staging';
  if (runtimeEnv === 'test') return 'listify_test';
  return null;
}

export function getDatabaseFingerprint(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const protocol = parsed.protocol.replace(':', '');
  const host = parsed.hostname || '(none)';
  const port = parsed.port || '(default)';
  const database = parsed.pathname.replace(/^\//, '') || '(none)';

  return {
    protocol,
    host,
    port,
    database,
    fingerprint: `${protocol}://${host}:${port}/${database}`,
  };
}

export function assertDatabaseTargetMatchesRuntime(
  databaseUrl: string,
  runtimeEnv: AppRuntimeEnv,
) {
  const target = getDatabaseFingerprint(databaseUrl);
  const expectedDatabase = getExpectedDatabaseName(runtimeEnv);

  if (expectedDatabase && target.database !== expectedDatabase) {
    throw new Error(
      `CRITICAL: Expected database ${expectedDatabase} for ${runtimeEnv}, got ${target.database}. Fingerprint: ${target.fingerprint}`,
    );
  }

  if (runtimeEnv !== 'production' && target.database === 'listify_property_sa') {
    throw new Error(
      `CRITICAL: Refusing to use production database in ${runtimeEnv}. Fingerprint: ${target.fingerprint}`,
    );
  }

  return target;
}

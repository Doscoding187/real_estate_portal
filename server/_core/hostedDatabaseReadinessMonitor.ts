import { createHash } from 'node:crypto';
import { resolveDatabaseAuthority } from './databaseAuthority/context';
import type { DatabaseCredentialClass } from './databaseAuthority/types';
import {
  assessRuntimeDatabaseReadiness,
  unavailableReadiness,
  type LayeredDatabaseReadiness,
} from './databaseAuthority/readiness';
import { ReadinessSnapshotMonitor } from './readinessSnapshotMonitor';

// Age includes the verification itself. Slow/failed/expired verification fails closed.
const monitor = new ReadinessSnapshotMonitor<LayeredDatabaseReadiness>({
  read: () => assessRuntimeDatabaseReadiness(),
  contextKey: () =>
    createHash('sha256')
      .update(
        JSON.stringify(
          Object.entries(process.env)
            .filter(
              ([key]) =>
                key.startsWith('DATABASE_') ||
                ['APP_ENV', 'NODE_ENV', 'BUILD_SHA', 'RAILWAY_GIT_COMMIT_SHA'].includes(key),
            )
            .sort(([a], [b]) => a.localeCompare(b)),
        ),
      )
      .digest('hex'),
  maxAgeMs: 30_000,
  refreshDelayMs: 5_000,
});

export function hostedDatabaseReadinessSnapshot(): LayeredDatabaseReadiness {
  const snapshot = monitor.getSnapshot();
  if (snapshot) return snapshot;
  let targetFingerprintHash = 'unresolved';
  let targetClass = 'unknown';
  try {
    const authority = resolveDatabaseAuthority({
      operation: 'readiness',
      cwd: process.cwd(),
      credentialClass:
        (process.env.DATABASE_CREDENTIAL_CLASS as DatabaseCredentialClass) ?? undefined,
    });
    targetFingerprintHash = authority.context.targetFingerprintHash;
    targetClass = authority.context.targetClass;
  } catch {
    /* An unresolved target remains unready. */
  }
  return unavailableReadiness({
    checkedAt: new Date(),
    targetFingerprintHash,
    targetClass,
    connectivityCode: 'readiness-verification-pending-or-expired',
    connectivityDetail: 'A fresh complete authorized database verification is required.',
  });
}

export async function stopHostedDatabaseReadinessMonitor(): Promise<void> {
  await monitor.stop();
}

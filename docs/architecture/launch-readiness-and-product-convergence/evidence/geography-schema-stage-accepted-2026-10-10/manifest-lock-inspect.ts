import { resolveDatabaseAuthority } from './server/_core/databaseAuthority/context';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from './server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from './server/_core/databaseAuthority/connectionAuthority';
import { loadAndValidateMigrationManifest } from './server/migrations/migrationManifest';

const SOURCE_SHA = '49a48572c24d1b122fcf17b025a76e5ab77f03a8';
const TARGET_HASH = 'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced';
const MANIFEST_DIGEST = '600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c';
const LOCK_NAME = 'property_listify_manifest_migrations';

type Phase = 'source-validation' | 'target-binding' | 'authorization' |
  'connection' | 'lock-query' | 'result-validation' | 'lock-held' | 'connection-close';

class ManifestLockInspectionFailure extends Error {
  constructor(
    readonly phase: Phase,
    readonly primaryCause: unknown,
    readonly cleanupFailed: boolean,
    readonly connectionClosed: boolean,
  ) {
    super('Manifest lock inspection failed');
    this.name = 'ManifestLockInspectionFailure';
  }
}

async function main(): Promise<void> {
  let phase: Phase = 'source-validation';
  let connection: AuthoritySqlConnection | undefined;
  let failed = false;
  let primaryCause: unknown;
  let cleanupFailed = false;
  let connectionClosed = false;
  let observedAt: string | undefined;
  try {
    const manifest = loadAndValidateMigrationManifest();
    if (manifest.document.lockName !== LOCK_NAME ||
        manifest.manifestDigest !== MANIFEST_DIGEST ||
        manifest.document.expectedHead !== '0111_properties_canonical_place_reference_fk.sql')
      throw new Error('Source binding refused');
    phase = 'target-binding';
    const authority = resolveDatabaseAuthority({ operation: 'diagnostics' });
    if (authority.context.operation !== 'diagnostics' ||
        authority.context.targetClass !== 'production' ||
        authority.context.runtimeMode !== 'production' ||
        authority.context.credentialClass !== 'read-only' ||
        authority.context.targetFingerprintHash !== TARGET_HASH)
      throw new Error('Target binding refused');
    phase = 'authorization';
    const decision = authorizeDatabaseOperation(authority, {
      approval: protectedDatabaseApprovalFromEnvironment(authority),
    });
    phase = 'connection';
    connection = await createAuthoritySqlConnection(authority, decision);
    phase = 'lock-query';
    const result = await connection.query(
      "SELECT IS_USED_LOCK('property_listify_manifest_migrations') AS lock_owner_connection_id",
    );
    observedAt = new Date().toISOString();
    phase = 'result-validation';
    if (!Array.isArray(result) || !Array.isArray(result[0]) || result[0].length !== 1)
      throw new Error('Unexpected row count');
    const row: unknown = result[0][0];
    if (row === null || typeof row !== 'object' || Array.isArray(row) ||
        !Object.prototype.hasOwnProperty.call(row, 'lock_owner_connection_id'))
      throw new Error('Missing owner field');
    if ((row as { lock_owner_connection_id: unknown }).lock_owner_connection_id !== null) {
      phase = 'lock-held';
      throw new Error('Manifest lock is held or its owner is unknown');
    }
  } catch (error) {
    failed = true;
    primaryCause = error;
  } finally {
    if (connection) {
      try {
        await connection.end();
        connectionClosed = true;
      } catch (error) {
        cleanupFailed = true;
        if (!failed) {
          failed = true;
          primaryCause = error;
          phase = 'connection-close';
        }
      }
    }
  }
  if (failed)
    throw new ManifestLockInspectionFailure(phase, primaryCause, cleanupFailed, connectionClosed);
  if (!connectionClosed)
    throw new ManifestLockInspectionFailure('connection-close', undefined, false, false);
  console.log(JSON.stringify({
    reportVersion: 1,
    status: 'verified',
    operation: 'diagnostics',
    credentialClass: 'read-only',
    schemaSourceSha: SOURCE_SHA,
    manifestDigest: MANIFEST_DIGEST,
    targetFingerprintHash: TARGET_HASH,
    lockName: LOCK_NAME,
    lockOwnerConnectionId: null,
    lockReleased: true,
    observedAt,
    connectionClosed: true,
    closedAt: new Date().toISOString(),
  }));
}

void main().catch((error: unknown) => {
  const failure = error instanceof ManifestLockInspectionFailure ? error : undefined;
  console.error(JSON.stringify({
    reportVersion: 1,
    status: 'failed',
    code: 'manifest-lock-inspection-unproven',
    phase: failure?.phase ?? 'unclassified',
    cleanupFailed: failure?.cleanupFailed ?? false,
    connectionClosed: failure?.connectionClosed ?? false,
    lockReleased: false,
  }));
  process.exitCode = 1;
});

import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation, protectedDatabaseApprovalFromEnvironment } from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { inspectReleaseSessions } from '../server/_core/databaseAuthority/releaseSessionInspection';

async function main() {
  const authority = resolveDatabaseAuthority({ operation: 'release-session-inspect', credentialClass: 'bootstrap-admin' });
  const decision = authorizeDatabaseOperation(authority, { approval: protectedDatabaseApprovalFromEnvironment(authority) });
  const connection = await createAuthoritySqlConnection(authority, decision);
  let primary: unknown;
  let failed = false;
  let report;
  try { report = await inspectReleaseSessions(connection); }
  catch (error) { primary = error; failed = true; }
  try { await connection.end(); }
  catch (error) { if (!failed) { primary = error; failed = true; } }
  if (failed) throw primary;
  console.log(JSON.stringify({ targetFingerprintHash: authority.context.targetFingerprintHash, ...report }, null, 2));
}
void main().catch(() => {
  // Driver errors can contain credentials; retain only a bounded outcome.
  console.error(JSON.stringify({ operation: 'release-session-inspect', outcome: 'failed', frozen: false }));
  process.exitCode = 1;
});

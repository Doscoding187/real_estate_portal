/**
 * Fingerprint the Place tables on the resolved target.
 *
 * The national storage proof needs to show two things that row counts alone cannot:
 * that a replay changed nothing, and that a failed load left nothing behind. Both
 * need a value that is stable under a no-op and sensitive to a single changed row,
 * which is what a digest over the ordered table contents is for.
 *
 * It reports `PLACES`, `FP` and `IDS_SHA` on stdout so a shell caller can compare
 * them across steps. It reads only; it never writes.
 *
 * Usage: npx tsx tools/place-admission/fingerprint-target.mjs
 */

import { createHash } from 'node:crypto';

import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context.ts';
import { createAuthoritySqlConnection } from '../../server/_core/databaseAuthority/connectionAuthority.ts';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../../server/_core/databaseAuthority/authorization.ts';
import { queryRows } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';

const authority = resolveDatabaseAuthority({
  operation: 'verification',
  credentialClass: 'read-only',
});
const decision = authorizeDatabaseOperation(authority, {
  approval: protectedDatabaseApprovalFromEnvironment(authority),
});
const connection = await createAuthoritySqlConnection(authority, decision);

/** Ordered so the digest is a function of content, not of query plan. */
const TABLES = ['place', 'place_name', 'place_relationship', 'place_evidence', 'place_external_mapping'];

try {
  const parts = [];
  for (const table of TABLES) {
    const rows = await queryRows(connection, `SELECT * FROM \`${table}\` ORDER BY 1,2,3`);
    const digest = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    parts.push(`${table}:${rows.length}:${digest}`);
  }
  const ids = (
    await queryRows(connection, 'SELECT place_id FROM `place` ORDER BY place_id')
  ).map(row => row.place_id);

  console.log(`FP ${parts.join('|')}`);
  console.log(`PLACES ${ids.length}`);
  console.log(`IDS_SHA ${createHash('sha256').update(JSON.stringify(ids)).digest('hex')}`);
} finally {
  await connection.end();
}

process.exit(0);

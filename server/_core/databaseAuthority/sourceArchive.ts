import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from './authorization';
import { createAuthoritySqlConnection } from './connectionAuthority';
import type { ResolvedDatabaseAuthority } from './types';

export const TIDB_ARCHIVE_SOURCE_FINGERPRINT =
  '68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e';
const MAGIC = Buffer.from('PL-TIDB-ARCHIVE-V1\n');
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_ROWS = 100000;

export function sealSourceArchive(payload: Buffer, key: Buffer): Buffer {
  if (key.length !== 32 || payload.length > MAX_BYTES)
    throw new Error('Invalid archive key or payload size.');
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
export function openSourceArchive(archive: Buffer, key: Buffer): Buffer {
  if (
    key.length !== 32 ||
    !archive.subarray(0, MAGIC.length).equals(MAGIC) ||
    archive.length < MAGIC.length + 28 ||
    archive.length > MAX_BYTES + MAGIC.length + 28
  )
    throw new Error('Invalid source archive.');
  const start = MAGIC.length,
    decipher = createDecipheriv('aes-256-gcm', key, archive.subarray(start, start + 12));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(archive.subarray(start + 12, start + 28));
  return Buffer.concat([decipher.update(archive.subarray(start + 28)), decipher.final()]);
}
export function sourceArchiveCell(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { encoding: 'base64', value: value.toString('base64') };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value))
  )
    return value;
  throw new Error(
    'Source archive refused a value that cannot be represented without precision loss.',
  );
}

function archiveRows(result: unknown): Record<string, unknown>[] {
  if (
    !Array.isArray(result) ||
    !Array.isArray(result[0]) ||
    result[0].some(row => row === null || typeof row !== 'object' || Array.isArray(row))
  ) {
    throw new Error('Source archive received an invalid query result.');
  }
  return result[0];
}

/** Source-only encrypted evidence; never an import or database authority change. */
export async function capturePreliminaryTiDbArchive(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  key: Buffer;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, ['read-only-connect']);
  if (
    input.authority.context.targetFingerprintHash !== TIDB_ARCHIVE_SOURCE_FINGERPRINT ||
    input.authority.context.credentialClass !== 'read-only'
  )
    throw new Error('Exact read-only TiDB source required.');
  if (input.key.length !== 32) throw new Error('A 256-bit archive key is required.');
  const c = await createAuthoritySqlConnection(input.authority, input.decision, {
    preserveTiDbArchiveTypes: true,
  });
  let transaction = false;
  try {
    const identity = archiveRows(
      await c.query(
        'SELECT VERSION() version,DATABASE() selected_database,@@session.time_zone time_zone',
      ),
    );
    if (
      identity.length !== 1 ||
      !String(identity[0].version).includes('TiDB') ||
      identity[0].selected_database !== input.authority.context.databaseName ||
      identity[0].time_zone !== '+00:00'
    )
      throw new Error('Source archive identity or UTC session verification failed.');
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    // TiDB READ ONLY is a no-op; the restricted source account is the write boundary.
    await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    transaction = true;
    const inventory = archiveRows(
      await c.query(
        'SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME',
      ),
    );
    const tables = inventory as { TABLE_NAME: string; TABLE_TYPE: string }[];
    if (
      !tables.length ||
      tables.length > 512 ||
      tables.some(t => !/^[a-zA-Z0-9_]+$/.test(t.TABLE_NAME) || t.TABLE_TYPE !== 'BASE TABLE')
    )
      throw new Error('Source archive table inventory is unsupported or unbounded.');
    const frames: string[] = [];
    let bytes = 0,
      totalRows = 0;
    const add = (value: unknown) => {
      const line = JSON.stringify(value) + '\n';
      bytes += Buffer.byteLength(line);
      if (bytes > MAX_BYTES) throw new Error('Source archive exceeded its approved size bound.');
      frames.push(line);
    };
    const startedAt = new Date().toISOString();
    add({
      format: 'property-listify-source-archive-v1',
      sourceFingerprint: TIDB_ARCHIVE_SOURCE_FINGERPRINT,
      identity,
      startedAt,
      frozen: false,
      purpose: 'preliminary TiDB retirement archive; fresh Azure accounts; no import',
    });
    const counts: { table: string; rows: number }[] = [];
    for (const table of tables) {
      const name = table.TABLE_NAME;
      const ddl = archiveRows(await c.query(`SHOW CREATE TABLE \`${name}\``));
      add({ kind: 'table-schema', table: name, ddl });
      const rows = archiveRows(
        await c.query(`SELECT * FROM \`${name}\` LIMIT ${MAX_ROWS - totalRows + 1}`),
      );
      const records = rows as Record<string, unknown>[];
      totalRows += records.length;
      if (totalRows > MAX_ROWS) throw new Error('Source archive exceeded its approved row bound.');
      for (const row of records)
        add({
          kind: 'row',
          table: name,
          cells: Object.fromEntries(
            Object.entries(row).map(([column, value]) => [column, sourceArchiveCell(value)]),
          ),
        });
      counts.push({ table: name, rows: records.length });
    }
    add({ kind: 'footer', counts, totalRows, completedAt: new Date().toISOString() });
    await c.query('ROLLBACK');
    transaction = false;
    const payload = Buffer.from(frames.join('')),
      encrypted = sealSourceArchive(payload, input.key);
    if (!openSourceArchive(encrypted, input.key).equals(payload))
      throw new Error('Source archive authenticated readback failed.');
    return {
      encrypted,
      evidence: {
        sourceFingerprint: TIDB_ARCHIVE_SOURCE_FINGERPRINT,
        startedAt,
        tableCount: tables.length,
        totalRows,
        counts,
        plaintextBytes: payload.length,
        archiveSha256: createHash('sha256').update(encrypted).digest('hex'),
        authenticatedReadback: true,
        frozen: false,
      },
    };
  } finally {
    if (transaction) await c.query('ROLLBACK').catch(() => undefined);
    await c.end();
  }
}

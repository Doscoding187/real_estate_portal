import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_RUNTIME_IDENTITY,
} from './authorization';
import { createAuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { runtimeGrant0197Plan } from './runtimeGrant0197Plan';

const DATABASE = 'propertylistify_database';

function rowsFromQueryResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

async function readRows(
  connection: Awaited<ReturnType<typeof createAuthoritySqlConnection>>,
  sql: string,
) {
  return rowsFromQueryResult(await connection.query(sql));
}

function safeCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    if (/^[A-Z0-9_]{1,64}$/.test(code)) return code;
  }
  return 'UNCLASSIFIED';
}

async function main() {
  const plan = runtimeGrant0197Plan();
  const inventory = JSON.parse(
    readFileSync(resolve(process.cwd(), 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { tableCount: number; structuralDigest: string; tables: string[] };
  if (
    inventory.tableCount !== plan.expectedTableCount ||
    inventory.structuralDigest !== plan.expectedModelDigest ||
    inventory.tables.length !== plan.expectedTableCount ||
    new Set(inventory.tables).size !== plan.expectedTableCount ||
    inventory.tables.some(table => !/^[A-Za-z0-9_]+$/.test(table))
  )
    throw new Error('0197 probe refused: canonical inventory differs from the reviewed plan.');

  const authority = resolveDatabaseAuthority({
    operation: 'read-only-connect',
    credentialClass: 'runtime',
  });
  if (
    authority.context.targetClass !== 'production' ||
    authority.context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
    authority.context.databaseName !== DATABASE ||
    authority.context.credentialClass !== 'runtime'
  )
    throw new Error('0197 probe refused: resolved target or credential identity differs.');
  const decision = authorizeDatabaseOperation(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);

  const quote = String.fromCharCode(96);
  const tableResults: Array<{ table: string; status: 'selectable' | 'denied'; code?: string }> = [];
  try {
    const accountRows = await readRows(connection, 'SELECT CURRENT_USER() AS current_user');
    const currentUser = String(accountRows[0]?.current_user ?? '');
    if (!currentUser.toLowerCase().startsWith(B08_RUNTIME_IDENTITY + '@'))
      throw new Error('0197 probe refused: connected MySQL account differs from runtime identity.');

    const grantRows = await readRows(connection, 'SHOW GRANTS');
    const grants = grantRows.map(row => String(Object.values(row)[0] ?? '')).filter(Boolean);
    if (grants.length === 0)
      throw new Error('0197 probe refused: SHOW GRANTS returned no rows.');

    for (const table of inventory.tables) {
      try {
        await readRows(
          connection,
          'SELECT * FROM ' +
            quote +
            DATABASE +
            quote +
            '.' +
            quote +
            table +
            quote +
            ' LIMIT 0',
        );
        tableResults.push({ table, status: 'selectable' });
      } catch (error) {
        const code = safeCode(error);
        if (code !== 'ER_TABLEACCESS_DENIED_ERROR') throw error;
        tableResults.push({ table, status: 'denied', code });
      }
    }
    process.stdout.write(
      JSON.stringify(
        {
          operation: 'runtime-grant-read-only-probe',
          sourceHead: plan.expectedHead,
          manifestDigest: plan.manifestDigest,
          modelDigest: plan.expectedModelDigest,
          tableCount: tableResults.length,
          targetFingerprintHash: authority.context.targetFingerprintHash,
          credentialClass: authority.context.credentialClass,
          account: currentUser,
          grants,
          tables: tableResults,
          writesAttempted: false,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await connection.end();
  }
}

main().catch(() => {
  process.stderr.write(
    '0197 runtime grant probe failed; preserve output and stop for read-only review. No automatic retry is allowed.\n',
  );
  process.exitCode = 1;
});

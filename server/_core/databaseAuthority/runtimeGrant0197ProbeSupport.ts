import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import type { ResolvedDatabaseAuthority } from './types';

/** Same approval path as scripts/databaseAuthorityCli.ts: DATABASE_AUTHORITY_APPROVAL_* env. */
export function authorizeProbe(
  authority: ResolvedDatabaseAuthority,
  env: NodeJS.ProcessEnv = process.env,
  root?: string,
) {
  return authorizeDatabaseOperation(authority, {
    root,
    approval: protectedDatabaseApprovalFromEnvironment(authority, env),
  });
}

const SAFE_MESSAGE_PREFIXES = ['Database operation refused:', '0197 probe refused:'];

/** Error class plus message only when it is an authored refusal; never driver text, URLs or env values. */
export const PROBE_STEPS = [
  'inventory',
  'authority',
  'connect',
  'account',
  'grants',
  'table-select',
  'founder-count',
  'output',
] as const;
export type ProbeStep = (typeof PROBE_STEPS)[number];

export function safeProbeErrorLine(error: unknown, step?: ProbeStep): string {
  const name = error instanceof Error && /^[A-Za-z0-9_]{1,64}$/.test(error.name) ? error.name : 'Error';
  const rawCode = (error as { code?: unknown } | null)?.code;
  const code = typeof rawCode === 'string' && /^[A-Z0-9_]{1,64}$/.test(rawCode) ? rawCode : null;
  const message =
    error instanceof Error && SAFE_MESSAGE_PREFIXES.some(p => error.message.startsWith(p))
      ? error.message.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[redacted]').slice(0, 300)
      : null;
  const label = step && (PROBE_STEPS as readonly string[]).includes(step) ? step : null;
  return (
    '0197 probe error: ' +
    (label ? 'step=' + label + ' ' : '') +
    'class=' +
    name +
    (code ? ' code=' + code : '') +
    (message ? ' message=' + message : '')
  );
}

export const PROBE_DATABASE = 'propertylistify_database';

const BT = String.fromCharCode(96);
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

function quoteIdentifier(name: string): string {
  if (!SAFE_IDENTIFIER.test(name)) throw new Error('0197 probe refused: unsafe SQL identifier.');
  return BT + name + BT;
}

/** `current_user` is reserved in MySQL; the alias must stay `current_identity`. */
export const PROBE_ACCOUNT_SQL = 'SELECT CURRENT_USER() AS current_identity';
export const PROBE_GRANTS_SQL = 'SHOW GRANTS';

export function probeTableSql(database: string, table: string): string {
  return 'SELECT * FROM ' + quoteIdentifier(database) + '.' + quoteIdentifier(table) + ' LIMIT 0';
}

export function founderCountSql(database: string): string {
  return (
    'SELECT COUNT(*) AS email_rows, ' +
    "COALESCE(SUM(role = 'super_admin'), 0) AS super_admin_rows, " +
    "COALESCE(SUM(role = 'super_admin' AND founder_authority = 'platform_founder'), 0) AS platform_founder_rows " +
    'FROM ' +
    quoteIdentifier(database) +
    '.' +
    quoteIdentifier('users') +
    ' WHERE LOWER(email) = ?'
  );
}

export type ProbeTargetContext = {
  targetClass: string;
  targetFingerprintHash: string;
  databaseName?: string;
  credentialClass: string;
};

/** Production-only: pinned fingerprint, runtime credential, canonical database. */
export function isAcceptedProbeTarget(context: ProbeTargetContext): boolean {
  return (
    context.targetClass === 'production' &&
    context.targetFingerprintHash === B08_AZURE_TARGET_FINGERPRINT_HASH &&
    context.databaseName === PROBE_DATABASE &&
    context.credentialClass === 'runtime'
  );
}

export type FounderCounts = {
  emailRows: number;
  superAdminRows: number;
  platformFounderRows: number;
};

type QueryConnection = {
  query: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
};

function firstRow(result: unknown): Record<string, unknown> {
  const value: any = result;
  const rows = Array.isArray(value?.[0]) ? value[0] : Array.isArray(value) ? value : [];
  return (rows[0] ?? {}) as Record<string, unknown>;
}

/** One read-only, parameterized query. Returns counts only; never the email or row data. */
export async function readFounderCounts(
  connection: QueryConnection,
  rawEmail: string | undefined,
): Promise<FounderCounts | null> {
  const email = rawEmail?.trim().toLowerCase();
  if (!email) return null;
  const row = firstRow(
    await connection.query(
      founderCountSql(PROBE_DATABASE),
      [email],
    ),
  );
  return {
    emailRows: Number(row.email_rows ?? 0),
    superAdminRows: Number(row.super_admin_rows ?? 0),
    platformFounderRows: Number(row.platform_founder_rows ?? 0),
  };
}

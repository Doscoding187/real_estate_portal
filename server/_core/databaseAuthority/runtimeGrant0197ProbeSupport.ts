import { B08_AZURE_TARGET_FINGERPRINT_HASH } from './authorization';

export const PROBE_DATABASE = 'propertylistify_database';

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
      'SELECT COUNT(*) AS email_rows, ' +
        "COALESCE(SUM(role = 'super_admin'), 0) AS super_admin_rows, " +
        "COALESCE(SUM(role = 'super_admin' AND founder_authority = 'platform_founder'), 0) AS platform_founder_rows " +
        'FROM ' +
        String.fromCharCode(96) +
        PROBE_DATABASE +
        String.fromCharCode(96) +
        '.users WHERE LOWER(email) = ?',
      [email],
    ),
  );
  return {
    emailRows: Number(row.email_rows ?? 0),
    superAdminRows: Number(row.super_admin_rows ?? 0),
    platformFounderRows: Number(row.platform_founder_rows ?? 0),
  };
}

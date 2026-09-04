import type { AuthoritySqlConnection } from './connectionAuthority';

export const TIDB_CHECK_CONSTRAINT_VARIABLE = 'tidb_enable_check_constraint';

export type TiDbCheckConstraintCapability = Readonly<{
  applicable: boolean;
  variable: typeof TIDB_CHECK_CONSTRAINT_VARIABLE;
  value: string | null;
  enabled: boolean | null;
}>;

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

function isEnabled(value: string): boolean {
  return /^(?:1|on|true)$/i.test(value.trim());
}

/**
 * TiDB accepts CHECK syntax while this cluster setting is disabled, but does
 * not enforce or retain the resulting constraints. Treat the setting as a
 * deployment capability, not as an optional schema feature.
 */
export async function readTiDbCheckConstraintCapability(
  connection: AuthoritySqlConnection,
  provider: 'mysql' | 'tidb' | 'unknown',
): Promise<TiDbCheckConstraintCapability> {
  if (provider !== 'tidb') {
    return Object.freeze({
      applicable: false,
      variable: TIDB_CHECK_CONSTRAINT_VARIABLE,
      value: null,
      enabled: null,
    });
  }

  const rows = rowsFromResult(
    // SHOW is a control/metadata statement; use the driver's non-prepared
    // query path rather than the prepared execution path used for data SQL.
    await connection.query(`SHOW GLOBAL VARIABLES LIKE '${TIDB_CHECK_CONSTRAINT_VARIABLE}'`),
  );
  if (rows.length !== 1) {
    throw new Error(
      `TiDB CHECK-constraint capability could not be proven: ${TIDB_CHECK_CONSTRAINT_VARIABLE} was not returned exactly once.`,
    );
  }
  const value = String(rowValue(rows[0], 'Value') ?? '').trim();
  if (!value) {
    throw new Error(
      `TiDB CHECK-constraint capability could not be proven: ${TIDB_CHECK_CONSTRAINT_VARIABLE} has no value.`,
    );
  }
  return Object.freeze({
    applicable: true,
    variable: TIDB_CHECK_CONSTRAINT_VARIABLE,
    value,
    enabled: isEnabled(value),
  });
}

export async function assertTiDbCheckConstraintCapability(
  connection: AuthoritySqlConnection,
  provider: 'mysql' | 'tidb' | 'unknown',
): Promise<TiDbCheckConstraintCapability> {
  const capability = await readTiDbCheckConstraintCapability(connection, provider);
  if (capability.applicable && !capability.enabled) {
    throw new Error(
      `TiDB CHECK-constraint enforcement is disabled (${TIDB_CHECK_CONSTRAINT_VARIABLE}=${capability.value}).`,
    );
  }
  return capability;
}

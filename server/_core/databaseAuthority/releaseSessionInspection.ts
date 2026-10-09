import type { AuthoritySqlConnection } from './connectionAuthority';

/** Fixed projections intentionally omit SQL text, host addresses and customer data. */
export const SESSION_INSPECTION_SQL = {
  identity: 'SELECT CURRENT_USER() AS identity, CONNECTION_ID() AS connectionId, DATABASE() AS databaseName',
  grants: 'SHOW GRANTS FOR CURRENT_USER',
  sessions: 'SELECT ID AS id, USER AS user, DB AS databaseName, COMMAND AS command, TIME AS seconds FROM information_schema.PROCESSLIST ORDER BY ID',
  transactions: 'SELECT trx_mysql_thread_id AS connectionId, trx_state AS state, trx_rows_modified AS rowsModified FROM information_schema.INNODB_TRX ORDER BY trx_mysql_thread_id',
} as const;

export async function inspectReleaseSessions(connection: AuthoritySqlConnection) {
  async function rows(sql: string): Promise<Array<Record<string, unknown>>> {
    const result = await connection.query(sql);
    if (!Array.isArray(result) || !Array.isArray(result[0])) throw new Error('Session inspection result shape invalid');
    return result[0];
  }
  const identity = (await rows(SESSION_INSPECTION_SQL.identity))[0];
  if (!identity || identity.databaseName !== 'propertylistify_database') throw new Error('Session inspection target mismatch');
  const grants = (await rows(SESSION_INSPECTION_SQL.grants)).flatMap(row => Object.values(row).map(String));
  const processPrivilege = grants.some(grant => {
    const match = /^GRANT (.+) ON `?\*`?\.`?\*`? TO /i.exec(grant);
    return match?.[1].split(',').map(value => value.trim().toUpperCase()).some(value => value === 'PROCESS' || value === 'ALL PRIVILEGES');
  });
  if (!processPrivilege) throw new Error('Global PROCESS visibility is not established; no freeze claim');
  const sessions = await rows(SESSION_INSPECTION_SQL.sessions);
  const transactions = await rows(SESSION_INSPECTION_SQL.transactions);
  if (!sessions.some(row => String(row.id) === String(identity.connectionId))) throw new Error('Observer missing from session inventory');
  return { observedAt: new Date().toISOString(), identity, globalProcessPrivilegeVerified: true,
    sessions, transactions, snapshotOnly: true, frozen: false };
}

/** Operator credentials are never exposed as an unrestricted query surface. */
export function restrictSessionInspection(connection: AuthoritySqlConnection): AuthoritySqlConnection {
  return {
    async execute() { throw new Error('Session observer execute prohibited'); },
    query(statement, values) {
      if (values?.length || !Object.values(SESSION_INSPECTION_SQL).includes(statement as typeof SESSION_INSPECTION_SQL[keyof typeof SESSION_INSPECTION_SQL])) {
        throw new Error('Session observer permits only its fixed metadata projections');
      }
      return connection.query(statement);
    },
    end: () => connection.end(),
  };
}

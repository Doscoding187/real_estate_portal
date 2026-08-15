import mysql from 'mysql2/promise';

const LOCK_TIMEOUT_SECONDS = 180;
const LOCK_PREFIX = 's3dev:';

export const DEVELOPMENT_INTEGRATION_MUTEX_HOOK_TIMEOUT_MS = LOCK_TIMEOUT_SECONDS * 1000;

let lockConnection: mysql.Connection | null = null;
let lockName: string | null = null;

export async function acquireDevelopmentIntegrationMutex(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (lockConnection) throw new Error('Development integration mutex is already held.');

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  lockConnection = connection;

  try {
    const [databaseRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT DATABASE() AS databaseName',
    );
    const databaseName = databaseRows[0]?.databaseName;
    if (!databaseName) throw new Error('Development integration mutex requires a database target.');

    lockName = `${LOCK_PREFIX}${databaseName}`;
    const [lockRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [lockName, LOCK_TIMEOUT_SECONDS],
    );

    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error(`Could not acquire ${lockName} within ${LOCK_TIMEOUT_SECONDS} seconds.`);
    }
  } catch (error) {
    await releaseDevelopmentIntegrationMutex();
    throw error;
  }
}

export async function releaseDevelopmentIntegrationMutex(): Promise<void> {
  const connection = lockConnection;
  const name = lockName;
  lockConnection = null;
  lockName = null;

  if (!connection) return;

  try {
    if (name) await connection.query('SELECT RELEASE_LOCK(?)', [name]);
  } finally {
    await connection.end();
  }
}

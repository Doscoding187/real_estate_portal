import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The only host/port pair owned by the local Database Authority service. */
export const LOCAL_SERVICE_HOST = '127.0.0.1' as const;
export const LOCAL_SERVICE_PORT = '3307' as const;
export const LOCAL_SERVICE_TMP_PARENT = '/var/tmp' as const;
export const LOCAL_SERVICE_DIRECTORY_NAME = 'mysql-3307' as const;
export const LOCAL_SERVICE_UID_DIRECTORY_PREFIX = 'property-listify-' as const;

function currentUid(): number {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
  if (uid === undefined || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('Database Authority local service requires a positive non-root process UID.');
  }
  return uid;
}

export function localServiceUid(uid = currentUid()): string {
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('Database Authority local service UID is invalid or root.');
  }
  return String(uid);
}

export function localServiceUidRoot(uid = currentUid()): string {
  return join(
    LOCAL_SERVICE_TMP_PARENT,
    `${LOCAL_SERVICE_UID_DIRECTORY_PREFIX}${localServiceUid(uid)}`,
  );
}

export function localServiceRoot(uid = currentUid()): string {
  return join(localServiceUidRoot(uid), LOCAL_SERVICE_DIRECTORY_NAME);
}

export function localServiceDataDir(uid = currentUid()): string {
  return join(localServiceRoot(uid), 'data');
}

export function localServiceSocketPath(uid = currentUid()): string {
  return join(localServiceRoot(uid), 'mysql.sock');
}

export function localServicePidPath(uid = currentUid()): string {
  return join(localServiceRoot(uid), 'mysqld.pid');
}

export function localServiceLogPath(uid = currentUid()): string {
  return join(localServiceRoot(uid), 'mysqld.log');
}

/**
 * The previous home-directory path is metadata for residue reporting only.
 * It is never used to derive an active service path.
 */
export function localServiceLegacyRoot(home = homedir()): string {
  return join(home, '.config', 'property-listify', LOCAL_SERVICE_DIRECTORY_NAME);
}

export function localServiceFingerprint(uid = currentUid()): string {
  const root = localServiceRoot(uid);
  return createHash('sha256')
    .update(`${LOCAL_SERVICE_HOST}:${LOCAL_SERVICE_PORT}:${root}:${localServiceDataDir(uid)}`)
    .digest('hex');
}

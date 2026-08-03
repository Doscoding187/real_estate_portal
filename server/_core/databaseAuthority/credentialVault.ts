import { randomUUID } from 'node:crypto';
import type { DatabaseCredentialHandle } from './types';

const credentialUrls = new WeakMap<DatabaseCredentialHandle, string>();

export function storeDatabaseCredentialUrl(databaseUrl: string): DatabaseCredentialHandle {
  const handle = Object.freeze({ handleId: randomUUID() });
  credentialUrls.set(handle, databaseUrl);
  return handle;
}

/** Internal connection-authority boundary. Never log or serialize the returned value. */
export function readDatabaseCredentialUrl(handle: DatabaseCredentialHandle): string {
  const value = credentialUrls.get(handle);
  if (!value) throw new Error('Database credential handle is unknown or expired.');
  return value;
}

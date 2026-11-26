import {
  closeSync,
  constants,
  fstatSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';

import { isLocalParityPreviewActive, type LocalAuthorityTarget } from './localParityPreview';

export type LocalAuthOutboxEntry = {
  kind: 'verification' | 'password_reset';
  to: string;
  subject: string;
  url: string;
};

export const OUTBOX_MAX_ENTRIES = 20;
export const OUTBOX_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function localAuthOutboxDirectory(uid = process.getuid?.() ?? 0): string {
  return `/var/tmp/property-listify-parity-${uid}`;
}

function privateAndOwned(
  stat: { mode: number; uid: number },
  uid: number,
  mode: number,
): boolean {
  return stat.uid === uid && (stat.mode & 0o777) === mode;
}

/**
 * Local preview only: record the auth link a real mail transport would have
 * delivered. Returns false (and writes nothing) unless the dev-only preview
 * gate holds or the location is not a private, owned, non-symlink path. Never
 * logs the URL and never throws into the caller.
 * Keeps only the newest 20 entries, none older than 24 hours.
 */
export function appendLocalAuthOutbox(
  entry: LocalAuthOutboxEntry,
  environment: NodeJS.ProcessEnv = process.env,
  directory = localAuthOutboxDirectory(),
  resolveTarget?: (env: NodeJS.ProcessEnv) => LocalAuthorityTarget | null,
  now = Date.now(),
): boolean {
  if (!isLocalParityPreviewActive(environment, resolveTarget)) return false;
  try {
    const uid = process.getuid?.() ?? 0;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const dirStat = lstatSync(directory);
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) throw new Error('not a directory');
    if (dirStat.uid !== uid) throw new Error('wrong owner');
    if ((dirStat.mode & 0o777) !== 0o700) throw new Error('wrong mode');

    const file = join(directory, 'outbox.jsonl');
    const fd = openSync(
      file,
      constants.O_RDWR | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW,
      0o600,
    );
    try {
      const fileStat = fstatSync(fd);
      if (!fileStat.isFile() || !privateAndOwned(fileStat, uid, 0o600)) {
        throw new Error('file not private');
      }
      const kept = readFileSync(fd, 'utf8')
        .split('\n')
        .filter(line => {
          if (!line) return false;
          try {
            return now - Date.parse(JSON.parse(line).capturedAt) <= OUTBOX_MAX_AGE_MS;
          } catch {
            return false;
          }
        })
        .slice(-(OUTBOX_MAX_ENTRIES - 1));
      const row = JSON.stringify({ ...entry, capturedAt: new Date(now).toISOString() });
      // Rewrite the pruned set through the same verified descriptor.
      ftruncateSync(fd, 0);
      writeSync(fd, `${[...kept, row].join('\n')}\n`);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch (error) {
    console.warn(`[Email Local Dev] Auth outbox skipped: ${(error as Error).message}`);
    return false;
  }
}

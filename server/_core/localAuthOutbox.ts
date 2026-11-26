import { appendFileSync, chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { isLocalParityPreviewActive } from './localParityPreview';

export type LocalAuthOutboxEntry = {
  kind: 'verification' | 'password_reset';
  to: string;
  subject: string;
  url: string;
};

export function localAuthOutboxDirectory(uid = process.getuid?.() ?? 0): string {
  return `/var/tmp/property-listify-parity-${uid}`;
}

/**
 * Local preview only: record the auth link a real mail transport would have
 * delivered. Returns false (and writes nothing) unless the dev-only preview
 * gate holds. Never logs the URL. Private file: dir 0700, file 0600.
 */
export function appendLocalAuthOutbox(
  entry: LocalAuthOutboxEntry,
  environment: NodeJS.ProcessEnv = process.env,
  directory = localAuthOutboxDirectory(),
): boolean {
  if (!isLocalParityPreviewActive(environment)) return false;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = join(directory, 'outbox.jsonl');
  appendFileSync(file, `${JSON.stringify({ ...entry, capturedAt: new Date().toISOString() })}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  chmodSync(file, 0o600);
  return true;
}

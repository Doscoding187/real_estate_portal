import { mkdtempSync, readFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { appendLocalAuthOutbox } from '../localAuthOutbox';
import { isLocalParityPilotActive, isLocalParityPreviewActive } from '../localParityPreview';

const LOCAL = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: '1',
  PROPERTY_LISTIFY_LOCAL_PARITY_PILOT: '1',
  DATABASE_URL: 'mysql://u:p@127.0.0.1:3307/db',
} as const;

const entry = {
  kind: 'verification' as const,
  to: 'a@example.invalid',
  subject: 'Verify',
  url: 'http://127.0.0.1:5070/api/auth/verify-email?token=abc',
};

const dirs: string[] = [];
function freshDir() {
  const dir = join(mkdtempSync(join(tmpdir(), 'outbox-test-')), 'parity');
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(join(d, '..'), { recursive: true, force: true });
});

describe('local parity preview gate', () => {
  it('is active only for the exact local development configuration', () => {
    expect(isLocalParityPreviewActive(LOCAL)).toBe(true);
    expect(isLocalParityPilotActive(LOCAL)).toBe(true);
  });

  it.each([
    ['production', { NODE_ENV: 'production', APP_ENV: 'production' }],
    ['test', { NODE_ENV: 'test', APP_ENV: 'test' }],
    ['vitest runner', { VITEST: 'true' }],
    ['missing opt-in', { PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: undefined }],
    ['remote database', { DATABASE_URL: 'mysql://u:p@db.example.com:3306/db' }],
    ['wrong port', { DATABASE_URL: 'mysql://u:p@127.0.0.1:3306/db' }],
    ['no database url', { DATABASE_URL: undefined }],
    ['hosted marker', { RAILWAY_ENVIRONMENT: 'production' }],
  ])('is refused for %s', (_name, override) => {
    const env = { ...LOCAL, ...override };
    expect(isLocalParityPreviewActive(env)).toBe(false);
    expect(isLocalParityPilotActive(env)).toBe(false);
  });

  it('pilot requires its own flag on top of the preview gate', () => {
    const env = { ...LOCAL, PROPERTY_LISTIFY_LOCAL_PARITY_PILOT: undefined };
    expect(isLocalParityPreviewActive(env)).toBe(true);
    expect(isLocalParityPilotActive(env)).toBe(false);
  });
});

describe('local auth outbox', () => {
  it('writes a private JSONL entry when the gate holds', () => {
    const dir = freshDir();
    expect(appendLocalAuthOutbox(entry, LOCAL as NodeJS.ProcessEnv, dir)).toBe(true);
    const file = join(dir, 'outbox.jsonl');
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const row = JSON.parse(readFileSync(file, 'utf8').trim());
    expect(row).toMatchObject(entry);
    expect(typeof row.capturedAt).toBe('string');
  });

  it.each([
    ['production', { ...LOCAL, NODE_ENV: 'production', APP_ENV: 'production' }],
    ['test', { ...LOCAL, NODE_ENV: 'test', APP_ENV: 'test' }],
    ['no opt-in', { ...LOCAL, PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: undefined }],
  ])('writes nothing in %s', (_name, env) => {
    const dir = freshDir();
    expect(appendLocalAuthOutbox(entry, env as NodeJS.ProcessEnv, dir)).toBe(false);
    expect(existsSync(dir)).toBe(false);
  });
});

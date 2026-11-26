import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
} as const;

const localTarget = () => ({
  targetClass: 'disposable-worktree',
  host: '127.0.0.1',
  port: '3307',
  local: true,
});

const entry = {
  kind: 'verification' as const,
  to: 'a@example.invalid',
  subject: 'Verify',
  url: 'http://127.0.0.1:5070/api/auth/verify-email?token=abc',
};

const bases: string[] = [];
function freshBase() {
  const base = mkdtempSync(join(tmpdir(), 'outbox-test-'));
  bases.push(base);
  return base;
}
function freshDir() {
  const dir = join(freshBase(), 'parity');
  return dir;
}
afterEach(() => {
  for (const b of bases.splice(0)) rmSync(b, { recursive: true, force: true });
});

describe('local parity preview gate', () => {
  it('is active only for the resolved local authority plus the opt-in', () => {
    expect(isLocalParityPreviewActive(LOCAL, localTarget)).toBe(true);
    expect(isLocalParityPilotActive(LOCAL, localTarget)).toBe(true);
  });

  it.each([
    ['production', { NODE_ENV: 'production', APP_ENV: 'production' }],
    ['test', { NODE_ENV: 'test', APP_ENV: 'test' }],
    ['vitest runner', { VITEST: 'true' }],
    ['missing opt-in', { PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: undefined }],
    ['railway marker', { RAILWAY_ENVIRONMENT: 'production' }],
    ['container app name', { CONTAINER_APP_NAME: 'api' }],
    ['container app dns suffix', { CONTAINER_APP_ENV_DNS_SUFFIX: 'x.azurecontainerapps.io' }],
    ['container app revision', { CONTAINER_APP_REVISION: 'api--1' }],
    ['kubernetes', { KUBERNETES_SERVICE_HOST: '10.0.0.1' }],
  ])('is refused for %s', (_name, override) => {
    const env = { ...LOCAL, ...override };
    expect(isLocalParityPreviewActive(env, localTarget)).toBe(false);
    expect(isLocalParityPilotActive(env, localTarget)).toBe(false);
  });

  it.each([
    ['production target', { targetClass: 'production', host: '127.0.0.1', port: '3307', local: true }],
    ['shared remote', { targetClass: 'shared-remote', host: 'db.example.com', port: '3306', local: false }],
    ['wrong port', { targetClass: 'disposable-worktree', host: '127.0.0.1', port: '3306', local: true }],
    ['test target', { targetClass: 'disposable-test', host: '127.0.0.1', port: '3307', local: true }],
    ['unresolvable', null],
  ])('is refused for authority target: %s', (_name, target) => {
    expect(isLocalParityPreviewActive(LOCAL, () => target)).toBe(false);
  });

  it('never resolves the authority when a cheap condition already fails', () => {
    let calls = 0;
    const spy = () => {
      calls += 1;
      return localTarget();
    };
    isLocalParityPreviewActive({ ...LOCAL, NODE_ENV: 'production' }, spy);
    isLocalParityPreviewActive({ ...LOCAL, PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: undefined }, spy);
    expect(calls).toBe(0);
  });

  it('pilot requires its own flag on top of the preview gate', () => {
    const env = { ...LOCAL, PROPERTY_LISTIFY_LOCAL_PARITY_PILOT: undefined };
    expect(isLocalParityPreviewActive(env, localTarget)).toBe(true);
    expect(isLocalParityPilotActive(env, localTarget)).toBe(false);
  });
});

describe('local auth outbox', () => {
  const write = (dir: string, env = LOCAL as NodeJS.ProcessEnv, now?: number, e = entry) =>
    appendLocalAuthOutbox(e, env, dir, localTarget, now);

  it('writes a private JSONL entry when the gate holds', () => {
    const dir = freshDir();
    expect(write(dir)).toBe(true);
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
    expect(write(dir, env as NodeJS.ProcessEnv)).toBe(false);
    expect(existsSync(dir)).toBe(false);
  });

  it('refuses a symlinked directory, a symlinked file and wrong modes without throwing', () => {
    const base = freshBase();
    const real = join(base, 'real');
    mkdirSync(real, { mode: 0o700 });
    const linkDir = join(base, 'linkdir');
    symlinkSync(real, linkDir);
    expect(write(linkDir)).toBe(false);
    expect(existsSync(join(real, 'outbox.jsonl'))).toBe(false);

    const dir = join(base, 'd');
    mkdirSync(dir, { mode: 0o700 });
    writeFileSync(join(base, 'target'), 'x');
    symlinkSync(join(base, 'target'), join(dir, 'outbox.jsonl'));
    expect(write(dir)).toBe(false);
    expect(readFileSync(join(base, 'target'), 'utf8')).toBe('x');

    const loose = join(base, 'loose');
    mkdirSync(loose);
    chmodSync(loose, 0o755);
    expect(write(loose)).toBe(false);

    const wideFile = join(base, 'wide');
    mkdirSync(wideFile, { mode: 0o700 });
    writeFileSync(join(wideFile, 'outbox.jsonl'), '');
    chmodSync(join(wideFile, 'outbox.jsonl'), 0o644);
    expect(write(wideFile)).toBe(false);
  });

  it('keeps the newest 20 entries and drops those older than 24 hours', () => {
    const dir = freshDir();
    const t0 = Date.parse('2026-01-01T00:00:00Z');
    write(dir, LOCAL as NodeJS.ProcessEnv, t0, { ...entry, to: 'old@example.invalid' });
    for (let i = 0; i < 25; i += 1) {
      write(dir, LOCAL as NodeJS.ProcessEnv, t0 + 25 * 3600_000 + i, {
        ...entry,
        to: `u${i}@example.invalid`,
      });
    }
    const rows = readFileSync(join(dir, 'outbox.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(l => JSON.parse(l));
    expect(rows).toHaveLength(20);
    expect(rows.some(r => r.to === 'old@example.invalid')).toBe(false);
    expect(rows[19].to).toBe('u24@example.invalid');
    expect(rows[0].to).toBe('u5@example.invalid');
  });
});

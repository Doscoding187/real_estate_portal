import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exportParityLoginSecret,
  parityLoginSecretStatus,
  readParityLoginSecret,
} from '../preview/parityLoginSecret';

const FAKE_SECRET = 'f'.repeat(40);

function centralFile(overrides: Record<string, string | undefined> = {}, mode = 0o600) {
  const values: Record<string, string | undefined> = {
    DATABASE_URL: 'mysql://listify_app:pw@127.0.0.1:3307/listify_local',
    LOCAL_DEMO_AGENCY_PASSWORD: 'demo-pass-value-1234',
    JWT_SECRET: FAKE_SECRET,
    APP_URL: 'http://localhost:3009',
    FRONTEND_URL: 'http://localhost:3009',
    VITE_API_URL: 'http://localhost:5000',
    VITE_API_BASE_URL: 'http://localhost:5000',
    ...overrides,
  };
  const path = join(mkdtempSync(join(tmpdir(), 'listify-parity-secret-')), 'local.env');
  writeFileSync(
    path,
    Object.entries(values)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  chmodSync(path, mode);
  return path;
}

afterEach(() => vi.restoreAllMocks());

describe('parity login secret', () => {
  it('fails with a clear message pointing at db:authority:status when the file is missing', () => {
    const path = join(tmpdir(), 'listify-parity-does-not-exist', 'local.env');
    expect(() => readParityLoginSecret(path, {})).toThrow(/db:authority:status/);
    expect(parityLoginSecretStatus(path)).toBe('missing');
  });

  it('fails when JWT_SECRET is missing, without leaking other values', () => {
    const path = centralFile({ JWT_SECRET: undefined });
    let message = '';
    try {
      readParityLoginSecret(path, {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/JWT_SECRET \(missing\)/);
    expect(message).toMatch(/db:authority:status/);
    expect(message).not.toContain('demo-pass-value-1234');
    expect(parityLoginSecretStatus(path)).toBe('missing');
  });

  it('refuses unsafe permissions and non-development runtimes', () => {
    expect(() => readParityLoginSecret(centralFile({}, 0o644), {})).toThrow(/0600/);
    expect(() => readParityLoginSecret(centralFile(), { APP_ENV: 'production' })).toThrow(
      /local development only/,
    );
  });

  it('exports only JWT_SECRET and never logs the value', () => {
    const path = centralFile();
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    ];
    const target: NodeJS.ProcessEnv = {};
    exportParityLoginSecret(target, path);
    expect(Object.keys(target)).toEqual(['JWT_SECRET']);
    expect(target.JWT_SECRET).toBe(FAKE_SECRET);
    expect(parityLoginSecretStatus(path)).toBe('available');
    for (const spy of logs) expect(spy).not.toHaveBeenCalled();
  });

  it('is invoked by local-parity.sh for start and status', () => {
    const script = readFileSync(join(__dirname, '..', 'preview', 'local-parity.sh'), 'utf8');
    expect(script).toContain('scripts/preview/parityLoginSecret.ts');
    expect(script).toMatch(/JWT_SECRET="\$\(.*parityLoginSecret\.ts\)"/);
    expect(script).toContain('parityLoginSecret.ts --status');
  });
});

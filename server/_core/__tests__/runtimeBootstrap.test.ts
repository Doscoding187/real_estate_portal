import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  assertDeployedTrustProxyConfiguration,
  loadAppRuntimeEnv,
  resolveAppRuntimeEnv,
} from '../runtimeBootstrap';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempEnvDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-bootstrap-'));
  tempDirs.push(dir);

  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), contents, 'utf8');
  }

  return dir;
}

describe('resolveAppRuntimeEnv', () => {
  it('prefers deployment environment hints over NODE_ENV', () => {
    expect(
      resolveAppRuntimeEnv({
        NODE_ENV: 'development',
        RAILWAY_ENVIRONMENT: 'production',
      } as NodeJS.ProcessEnv),
    ).toBe('production');
  });

  it('normalizes APP_ENV aliases and capitalization', () => {
    expect(
      resolveAppRuntimeEnv({
        APP_ENV: 'prod',
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toBe('production');

    expect(
      resolveAppRuntimeEnv({
        APP_ENV: 'stage',
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toBe('staging');

    expect(
      resolveAppRuntimeEnv({
        APP_ENV: 'Production',
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toBe('production');
  });
});

describe('assertDeployedTrustProxyConfiguration', () => {
  it('requires an explicit positive hop count in production', () => {
    expect(() =>
      assertDeployedTrustProxyConfiguration({ APP_ENV: 'production', TRUST_PROXY: 'false' }),
    ).toThrow('TRUST_PROXY must be the exact positive number');

    expect(() =>
      assertDeployedTrustProxyConfiguration({ APP_ENV: 'production', TRUST_PROXY: '1' }),
    ).not.toThrow();
  });
});

describe('loadAppRuntimeEnv', () => {
  it('loads .env.local over .env when no explicit caller value exists', () => {
    const cwd = createTempEnvDir({
      '.env': 'DATABASE_URL=mysql://user:pass@host/base\nSHARED=from-env\n',
      '.env.local': 'DATABASE_URL=mysql://user:pass@host/local\n',
    });
    const env = {} as NodeJS.ProcessEnv;

    const result = loadAppRuntimeEnv({ cwd, env });

    expect(result.runtimeEnv).toBe('development');
    expect(result.loadedFiles).toEqual(['.env', '.env.local']);
    expect(env.DATABASE_URL).toBe('mysql://user:pass@host/local');
    expect(env.DATABASE_AUTHORITY_DATABASE_URL_SOURCE).toBe('runtime-bootstrap-file');
    expect(env.SHARED).toBe('from-env');
  });

  it('preserves an explicit caller target instead of overwriting it from files', () => {
    const cwd = createTempEnvDir({
      '.env': 'DATABASE_URL=mysql://user:pass@host/base\n',
      '.env.local': 'DATABASE_URL=mysql://user:pass@host/local\n',
    });
    const env = {
      DATABASE_URL: 'mysql://user:pass@host/explicit',
    } as NodeJS.ProcessEnv;

    loadAppRuntimeEnv({ cwd, env });

    expect(env.DATABASE_URL).toBe('mysql://user:pass@host/explicit');
    expect(env.DATABASE_AUTHORITY_DATABASE_URL_SOURCE).toBe('explicit-process');
  });

  it('loads .env.production in production instead of .env.local', () => {
    const cwd = createTempEnvDir({
      '.env': 'DATABASE_URL=mysql://user:pass@host/base\n',
      '.env.local': 'DATABASE_URL=mysql://user:pass@host/local\n',
      '.env.production': 'DATABASE_URL=mysql://user:pass@host/prod\n',
    });
    const env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

    const result = loadAppRuntimeEnv({ cwd, env });

    expect(result.runtimeEnv).toBe('production');
    expect(result.loadedFiles).toEqual(['.env', '.env.production']);
    expect(env.DATABASE_URL).toBe('mysql://user:pass@host/prod');
  });
});

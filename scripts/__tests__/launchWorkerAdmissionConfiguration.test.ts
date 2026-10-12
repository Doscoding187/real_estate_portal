import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const configuration = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), 'deployment/railway-worker-admission-service-settings.json'),
    'utf8',
  ),
);
const inputs = {
  LAUNCH_WORKER_ADMISSION_EXPECTED_SHA: 'a'.repeat(40),
  LAUNCH_WORKER_ADMISSION_EXPECTED_FINGERPRINT: 'b'.repeat(64),
  LAUNCH_WORKER_ADMISSION_EXPECTED_PROJECT_ID: '8cdd7515-ddd2-4252-bbee-df5a5c209d4b',
  LAUNCH_WORKER_ADMISSION_EXPECTED_ENVIRONMENT_ID: '63070d99-357a-40ba-99c3-6d1368f61652',
  LAUNCH_WORKER_ADMISSION_EXPECTED_SERVICE_ID: 'e1e32aa8-0b85-4c91-af18-843f1bc52d9f',
  LAUNCH_WORKER_ADMISSION_EXPIRES_AT: '2026-10-12T17:10:00Z',
};

describe('deployment-effective held worker admission command', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'listify-admission-argv-'));
    // Capture argv at the process boundary; never invoke pnpm or a database.
    writeFileSync(
      path.join(directory, 'pnpm'),
      '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));\n',
      { mode: 0o700 },
    );
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function run(overrides: Record<string, string | undefined> = {}) {
    return spawnSync('/bin/sh', ['-c', configuration.deploy.startCommand], {
      env: { ...process.env, ...inputs, ...overrides, PATH: `${directory}:${process.env.PATH}` },
      encoding: 'utf8',
      timeout: 5_000,
    });
  }

  it('has no default repository file that can override the chosen service settings', () => {
    for (const filename of ['railway.json', 'railway.toml']) {
      expect(existsSync(path.resolve(process.cwd(), filename))).toBe(false);
    }
    expect(configuration.build).toEqual({
      builder: 'RAILPACK',
      buildCommand: 'pnpm build:backend',
    });
  });

  it('preserves the API release settings separately from the admission process', () => {
    const api = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), 'deployment/railway-api-service-settings.json'),
        'utf8',
      ),
    );
    expect(api.build).toEqual({ builder: 'RAILPACK', buildCommand: 'pnpm build:railway' });
    expect(api.deploy).toEqual({
      startCommand: 'node --import tsx server/_core/start.ts',
      drainingSeconds: 30,
      healthcheckPath: '/api/readiness',
      healthcheckTimeout: 300,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    });
    expect(api.deploy.startCommand).not.toBe(configuration.deploy.startCommand);
  });

  it('starts only the diagnostic and forwards all independently reviewed arguments', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual([
      'launch:worker-admission',
      `--sha=${inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_SHA}`,
      `--fingerprint=${inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_FINGERPRINT}`,
      `--project-id=${inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_PROJECT_ID}`,
      `--environment-id=${inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_ENVIRONMENT_ID}`,
      `--service-id=${inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_SERVICE_ID}`,
      `--expires-at=${inputs.LAUNCH_WORKER_ADMISSION_EXPIRES_AT}`,
    ]);
    expect(configuration.deploy).toMatchObject({
      restartPolicyType: 'NEVER',
      preDeployCommand: [],
    });
    expect(configuration.deploy).not.toHaveProperty('cronSchedule');
    expect(configuration.deploy).not.toHaveProperty('healthcheckPath');
  });

  it.each(Object.keys(inputs))('refuses missing %s before launching the diagnostic', key => {
    const result = run({
      [key]: undefined,
      RAILWAY_GIT_COMMIT_SHA: inputs.LAUNCH_WORKER_ADMISSION_EXPECTED_SHA,
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('missing');
  });

  it('preserves shell-shaped input as one literal argument without evaluating it', () => {
    const literal = '$(printf injected); space *';
    const result = run({ LAUNCH_WORKER_ADMISSION_EXPECTED_SHA: literal });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)[1]).toBe(`--sha=${literal}`);
  });
});

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RehearsalRefusal } from '../../loadRehearsal/config';
import { HOSTED_LOAD_CONFIRM_ENV, parseHostedLoadConfig, parseTargetOrigin } from '../config';
import { HOSTED_LOAD_BOUNDS, PROVISIONAL_RATE_PLAN } from '../schedule';

const target = 'https://api.example.co.za';
const confirmEnv = { [HOSTED_LOAD_CONFIRM_ENV]: 'api.example.co.za' };
const tempDirs: string[] = [];

const writeTempFile = (name: string, contents: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'hosted-load-'));
  tempDirs.push(dir);
  const path = join(dir, name);
  writeFileSync(path, contents);
  return path;
};

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('parseHostedLoadConfig', () => {
  it('applies admitted defaults with a matching confirmation', () => {
    expect(parseHostedLoadConfig(['--target', target], confirmEnv)).toEqual({
      targetOrigin: target,
      targetHost: 'api.example.co.za',
      durationSeconds: 86_400,
      ratePlan: PROVISIONAL_RATE_PLAN,
      ratePlanSource: 'provisional',
      scenarios: [],
      smokeWrite: false,
      abortFile: null,
      evidenceOut: null,
      inflightCap: 1_024,
      allowInsecureLocal: false,
    });
  });

  it('tolerates a leading -- separator from package scripts', () => {
    const config = parseHostedLoadConfig(['--', '--target', target], confirmEnv);
    expect(config.targetOrigin).toBe(target);
  });

  it('accepts --confirm-host in place of the environment variable', () => {
    const config = parseHostedLoadConfig(
      ['--target', target, '--confirm-host', 'api.example.co.za'],
      {},
    );
    expect(config.targetHost).toBe('api.example.co.za');
  });

  it('refuses a missing or mismatched confirmation', () => {
    expect(() => parseHostedLoadConfig(['--target', target], {})).toThrow(RehearsalRefusal);
    expect(() =>
      parseHostedLoadConfig(['--target', target], {
        [HOSTED_LOAD_CONFIRM_ENV]: 'other.example.co.za',
      }),
    ).toThrow(RehearsalRefusal);
  });

  it('requires https unless an insecure loopback target is explicitly allowed', () => {
    expect(() =>
      parseHostedLoadConfig(['--target', 'http://api.example.co.za'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(() =>
      parseHostedLoadConfig(
        ['--target', 'http://api.example.co.za', '--allow-insecure-local'],
        confirmEnv,
      ),
    ).toThrow(RehearsalRefusal);
    const local = parseHostedLoadConfig(
      [
        '--target',
        'http://127.0.0.1:5000',
        '--allow-insecure-local',
        '--confirm-host',
        '127.0.0.1',
      ],
      {},
    );
    expect(local.targetOrigin).toBe('http://127.0.0.1:5000');
  });

  it('parses explicit flags and deduplicates scenarios', () => {
    const config = parseHostedLoadConfig(
      [
        '--target',
        target,
        '--duration-seconds',
        '300',
        '--scenario',
        'property-detail',
        '--scenario',
        'property-detail',
        '--scenario',
        'search-typed-city',
        '--enable-smoke-write',
        '--inflight-cap',
        '64',
        '--abort-file',
        '/tmp/abort',
        '--evidence-out',
        '/tmp/evidence.json',
      ],
      confirmEnv,
    );
    expect(config.durationSeconds).toBe(300);
    expect(config.scenarios).toEqual(['property-detail', 'search-typed-city']);
    expect(config.smokeWrite).toBe(true);
    expect(config.inflightCap).toBe(64);
    expect(config.abortFile).toBe('/tmp/abort');
    expect(config.evidenceOut).toBe('/tmp/evidence.json');
  });

  it('refuses unknown scenarios and flags', () => {
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--scenario', 'drop-tables'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(() => parseHostedLoadConfig(['--target', target, '--turbo'], confirmEnv)).toThrow(
      RehearsalRefusal,
    );
  });

  it('enforces duration and in-flight bounds', () => {
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--duration-seconds', '4'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--duration-seconds', '86401'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--inflight-cap', '15'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--inflight-cap', '4097'], confirmEnv),
    ).toThrow(RehearsalRefusal);
    expect(HOSTED_LOAD_BOUNDS.maxDurationSeconds).toBe(86_400);
  });

  it('loads a replacement rate plan from a file', () => {
    const path = writeTempFile(
      'rate-plan.json',
      JSON.stringify({ sustainedRps: 2, peaks: [], doublePeak: null }),
    );
    const config = parseHostedLoadConfig(
      ['--target', target, '--rate-plan', path, '--duration-seconds', '600'],
      confirmEnv,
    );
    expect(config.ratePlanSource).toBe('file');
    expect(config.ratePlan.sustainedRps).toBe(2);
  });

  it('refuses unreadable and invalid rate plan files', () => {
    expect(() =>
      parseHostedLoadConfig(
        ['--target', target, '--rate-plan', '/nonexistent-plan.json'],
        confirmEnv,
      ),
    ).toThrow(RehearsalRefusal);
    const path = writeTempFile('rate-plan.json', '{"sustainedRps":41}');
    expect(() =>
      parseHostedLoadConfig(['--target', target, '--rate-plan', path], confirmEnv),
    ).toThrow(RehearsalRefusal);
  });
});

describe('parseTargetOrigin', () => {
  it('refuses credentials and non-origin targets', () => {
    expect(() => parseTargetOrigin('https://user:pass@api.example.co.za', false)).toThrow(
      RehearsalRefusal,
    );
    expect(() => parseTargetOrigin('https://api.example.co.za/api', false)).toThrow(
      RehearsalRefusal,
    );
    expect(() => parseTargetOrigin('not-a-url', false)).toThrow(RehearsalRefusal);
  });
});

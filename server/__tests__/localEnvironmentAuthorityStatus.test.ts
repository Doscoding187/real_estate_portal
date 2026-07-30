import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAuthorityManifest } from '../../scripts/databaseAuthorityStatus';
import {
  inspectEnvironmentPath,
  parseEnvironmentText,
  runEnvironmentAuthorityDiagnostic,
} from '../../scripts/localEnvironmentAuthorityContract';

const canonicalManifest = loadAuthorityManifest(process.cwd());
const requiredValues = [
  'DATABASE_URL=mysql://local:local@127.0.0.1:3307/listify_local',
  'LOCAL_DEMO_AGENCY_PASSWORD=fixture-only-secret',
  'JWT_SECRET=fixture-only-jwt-secret-which-is-not-output',
  'APP_URL=http://localhost:3009',
  'FRONTEND_URL=http://localhost:3009',
  'VITE_API_URL=http://localhost:5000',
  'VITE_API_BASE_URL=http://localhost:5000',
].join('\n');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'listify-stage2b-'));
  const central = join(root, 'machine', 'local.env');
  mkdirSync(join(root, 'machine'), { recursive: true });
  writeFileSync(central, `${requiredValues}\nAPP_ENV=development\n`, { mode: 0o600 });
  return { root, central };
}

function diagnose(
  root: string,
  central: string,
  options: Parameters<typeof runEnvironmentAuthorityDiagnostic>[1] = {},
) {
  return runEnvironmentAuthorityDiagnostic(root, {
    centralPath: central,
    repositoryRoot: root,
    manifestRoot: process.cwd(),
    manifestLoader: () => canonicalManifest,
    ...options,
  });
}

describe('local environment authority diagnostics', () => {
  it('parses names, preserves duplicates, and counts malformed entries', () => {
    const parsed = parseEnvironmentText(
      `${requiredValues}\nDATABASE_URL=second\nnot-an-assignment\n`,
    );
    expect(parsed.names).toContain('DATABASE_URL');
    expect(parsed.duplicateNames).toEqual(['DATABASE_URL']);
    expect(parsed.malformedEntries).toBe(1);
  });

  it('classifies a canonical link and reports Stage 3 eligibility only for a complete contract', () => {
    const { root, central } = fixture();
    symlinkSync(central, join(root, '.env.local'));
    const result = diagnose(root, central, {
      now: () => new Date('2026-07-30T00:00:00.000Z'),
    });
    expect(result.environmentPath.state).toBe('CANONICAL_LINK');
    expect(result.centralAuthority.inspection.ownership).toBe('OWNER_CURRENT_USER');
    expect(result.databaseTarget).toMatchObject({ classification: 'local', approved: true });
    expect(result.completeApplicationCompliance).toBe(true);
    expect(result.stage3Eligibility).toBe(true);
    expect(JSON.stringify(result)).not.toContain('fixture-only');
  });

  it('does not read a noncanonical symlink target', () => {
    const { root, central } = fixture();
    const outside = join(root, 'machine', 'outside.env');
    writeFileSync(outside, 'SECRET_SENTINEL=must-not-be-read\n');
    symlinkSync(outside, join(root, '.env.local'));
    const result = diagnose(root, central);
    expect(result.environmentPath.state).toBe('INCORRECT_LINK');
    expect(JSON.stringify(result)).not.toContain('SECRET_SENTINEL');
    expect(JSON.stringify(result)).not.toContain('must-not-be-read');
  });

  it.each([
    ['missing', 'MISSING'],
    ['regular file', 'REGULAR_FILE_CONFLICT'],
    ['incorrect link', 'INCORRECT_LINK'],
    ['broken link', 'BROKEN_LINK'],
    ['non-file path', 'NON_FILE_PATH'],
  ] as const)('classifies %s without changing the target', (_label, expected) => {
    const { root, central } = fixture();
    const localPath = join(root, '.env.local');
    if (expected === 'REGULAR_FILE_CONFLICT') writeFileSync(localPath, 'SAFE_NAME=safe-value\n');
    if (expected === 'INCORRECT_LINK') {
      const other = join(root, 'machine', 'other.env');
      writeFileSync(other, 'SAFE_NAME=safe-value\n');
      symlinkSync(other, localPath);
    }
    if (expected === 'BROKEN_LINK') symlinkSync(join(root, 'machine', 'missing.env'), localPath);
    if (expected === 'NON_FILE_PATH') mkdirSync(localPath);
    const before = lstatSync(localPath, { throwIfNoEntry: false });
    expect(inspectEnvironmentPath(root, central).state).toBe(expected);
    const after = lstatSync(localPath, { throwIfNoEntry: false });
    expect(after?.mode).toBe(before?.mode);
    expect(readFileSync(central, 'utf8')).toContain('DATABASE_URL=');
  });

  it.each(['LISTIFY_E2E_DATABASE_URL', 'LOCAL_SEED_ALLOWED'] as const)(
    'blocks TEST_ONLY central name %s without exposing its value',
    name => {
      const { root, central } = fixture();
      writeFileSync(central, `${requiredValues}\n${name}=fixture-only-test-value\n`, {
        mode: 0o600,
      });
      const result = diagnose(root, central);
      expect(result.centralAuthority.testOnlyNames).toContain(name);
      expect(result.completeApplicationCompliance).toBe(false);
      expect(result.stage3Eligibility).toBe(false);
      expect(result.blockers).toContain(
        `TEST_ONLY names are prohibited in central authority: ${name}.`,
      );
      expect(result.exitCode).toBe(1);
      expect(JSON.stringify(result)).not.toContain('fixture-only-test-value');
    },
  );

  it('rejects placeholder and unsafe values for canonical required names', () => {
    const { root, central } = fixture();
    const contents = requiredValues
      .replace('JWT_SECRET=fixture-only-jwt-secret-which-is-not-output', 'JWT_SECRET=changeme')
      .replace('APP_URL=http://localhost:3009', 'APP_URL=https://example.com')
      .replace(
        'LOCAL_DEMO_AGENCY_PASSWORD=fixture-only-secret',
        'LOCAL_DEMO_AGENCY_PASSWORD=placeholder',
      )
      .concat('\n');
    writeFileSync(central, contents, { mode: 0o600 });
    const result = diagnose(root, central);
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.stage3Eligibility).toBe(false);
    expect(result.blockers.join('\n')).toContain('Required names have invalid values:');
    expect(result.blockers.join('\n')).toContain('APP_URL');
    expect(result.blockers.join('\n')).toContain('LOCAL_DEMO_AGENCY_PASSWORD');
    expect(result.blockers.join('\n')).toContain('JWT_SECRET');
    expect(result.exitCode).toBe(1);
    expect(JSON.stringify(result)).not.toContain('changeme');
  });

  it('returns exit 1 for unknown and deprecated central names', () => {
    const { root, central } = fixture();
    writeFileSync(central, `${requiredValues}\nUNKNOWN_FIXTURE_NAME=safe\nDB_HOST=localhost\n`, {
      mode: 0o600,
    });
    const result = diagnose(root, central);
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.warnings.join('\n')).toContain('UNKNOWN_FIXTURE_NAME');
    expect(result.warnings.join('\n')).toContain('DB_HOST');
  });

  it('treats catalogued unknown-pending names as unknown', () => {
    const { root, central } = fixture();
    writeFileSync(central, `${requiredValues}\nAPI_SECRET=safe\n`, { mode: 0o600 });
    const result = diagnose(root, central);
    expect(result.centralAuthority.unknownNames).toContain('API_SECRET');
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('matches runtime dotenv comment semantics before validating values', () => {
    const { root, central } = fixture();
    const contents = requiredValues.replace(
      'JWT_SECRET=fixture-only-jwt-secret-which-is-not-output',
      'JWT_SECRET=short#abcdefghijklmnopqrstuvwxyz123456789',
    );
    writeFileSync(central, contents, { mode: 0o600 });
    const result = diagnose(root, central);
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.stage3Eligibility).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it.each(['APP_URL', 'FRONTEND_URL', 'VITE_API_URL', 'VITE_API_BASE_URL'] as const)(
    'requires canonical routing name %s from the manifest',
    name => {
      const { root, central } = fixture();
      const contents = requiredValues
        .split('\n')
        .filter(line => !line.startsWith(`${name}=`))
        .join('\n');
      writeFileSync(central, contents, { mode: 0o600 });
      const result = diagnose(root, central);
      expect(result.centralAuthority.missingRequiredNames).toContain(name);
      expect(result.completeApplicationCompliance).toBe(false);
      expect(result.stage3Eligibility).toBe(false);
      expect(result.exitCode).toBe(1);
    },
  );

  it('fails closed when the canonical manifest is malformed or unavailable', () => {
    const { root, central } = fixture();
    const malformed = diagnose(root, central, {
      manifestLoader: () => ({ ...canonicalManifest, requiredLocalVariables: ['DATABASE_URL'] }),
    });
    const unavailable = diagnose(root, central, {
      manifestLoader: () => {
        throw new Error('fixture manifest unavailable');
      },
    });
    expect(malformed.blockers).toContain(
      'Canonical authority manifest is unavailable or malformed.',
    );
    expect(unavailable.blockers).toContain(
      'Canonical authority manifest is unavailable or malformed.',
    );
    expect(malformed.exitCode).toBe(1);
    expect(unavailable.exitCode).toBe(1);
  });

  it.each([
    ['mysql://local:local@127.0.0.1:3307/listify_local', 'local', true],
    ['mysql://local:local@127.0.0.1:3307/listify_test', 'test', true],
    ['https://127.0.0.1/listify_local', 'unknown', false],
    ['postgres://127.0.0.1/listify_local', 'unknown', false],
    ['mysql://127.0.0.1/not_listify_local', 'unknown', false],
    ['mysql://127.0.0.1/listify_local/extra', 'unknown', false],
    ['mysql://127.0.0.1/%6cistify_local', 'unknown', false],
    ['mysql://remote.example/listify_local', 'unknown', false],
    ['not-a-url', 'unknown', false],
  ] as const)('classifies database target %s safely', (databaseUrl, classification, approved) => {
    const { root, central } = fixture();
    const contents = requiredValues
      .split('\n')
      .map(line => (line.startsWith('DATABASE_URL=') ? `DATABASE_URL=${databaseUrl}` : line))
      .join('\n');
    writeFileSync(central, contents, { mode: 0o600 });
    const result = diagnose(root, central);
    expect(result.databaseTarget).toMatchObject({ classification, approved });
    expect(JSON.stringify(result)).not.toContain('local:local');
  });

  it('rejects local database targets when the runtime mode is production or staging', () => {
    for (const runtime of ['production', 'staging']) {
      const { root, central } = fixture();
      const contents = `${requiredValues}\nAPP_ENV=${runtime}\n`;
      writeFileSync(central, contents, { mode: 0o600 });
      const result = diagnose(root, central);
      expect(result.databaseTarget.approved).toBe(false);
      expect(result.completeApplicationCompliance).toBe(false);
      expect(result.stage3Eligibility).toBe(false);
      expect(result.exitCode).toBe(1);
    }
  });

  it('rejects contradictory runtime modes', () => {
    const { root, central } = fixture();
    writeFileSync(central, `${requiredValues}\nAPP_ENV=development\nNODE_ENV=production\n`, {
      mode: 0o600,
    });
    const result = diagnose(root, central);
    expect(result.databaseTarget.approved).toBe(false);
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.stage3Eligibility).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('normalizes an approved bracketed IPv6 database host', () => {
    const { root, central } = fixture();
    const contents = requiredValues
      .split('\n')
      .map(line =>
        line.startsWith('DATABASE_URL=')
          ? 'DATABASE_URL=mysql://local:local@[::1]:3307/listify_local'
          : line,
      )
      .join('\n');
    writeFileSync(central, contents, { mode: 0o600 });
    const result = diagnose(root, central);
    expect(result.databaseTarget).toMatchObject({ classification: 'local', approved: true });
    expect(JSON.stringify(result)).not.toContain('local:local');
  });

  it('reports owner state conservatively without changing filesystem metadata', () => {
    const { root, central } = fixture();
    const current = diagnose(root, central, { effectiveUid: () => process.geteuid?.() });
    const mismatch = diagnose(root, central, {
      effectiveUid: () => (process.geteuid?.() ?? 0) + 1,
    });
    const unavailable = diagnose(root, central, { effectiveUid: () => undefined });
    expect(current.centralAuthority.inspection.ownership).toBe('OWNER_CURRENT_USER');
    expect(mismatch.centralAuthority.inspection.ownership).toBe('OWNER_MISMATCH');
    expect(unavailable.centralAuthority.inspection.ownership).toBe('OWNER_UNAVAILABLE');
    expect(mismatch.completeApplicationCompliance).toBe(false);
    expect(unavailable.completeApplicationCompliance).toBe(false);
    expect(mismatch.exitCode).toBe(1);
    expect(unavailable.exitCode).toBe(1);
  });

  it('returns sanitized exit-2 output for an unsupported worktree target', () => {
    const target = mkdtempSync(join(tmpdir(), 'listify-stage2b-not-git-'));
    const result = runEnvironmentAuthorityDiagnostic(target, {
      now: () => new Date('2026-07-30T00:00:00.000Z'),
    });
    expect(result.targetClassification).toBe('UNSUPPORTED');
    expect(result.repositoryRoot).toBeNull();
    expect(result.stage3Eligibility).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(JSON.stringify(result)).not.toContain('Error:');
    expect(JSON.stringify(result)).not.toContain('fixture-only');
  });

  it('returns exit 2 without a stack trace through the CLI for an unsupported target', () => {
    const target = mkdtempSync(join(tmpdir(), 'listify-stage2b-cli-not-git-'));
    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      ['scripts/localEnvironmentAuthorityStatus.ts', '--worktree', target, '--json'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain(' at ');
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('does not alter fixture files or links during a diagnostic', () => {
    const { root, central } = fixture();
    const localPath = join(root, '.env.local');
    writeFileSync(localPath, 'SAFE_NAME=safe-value\n');
    chmodSync(localPath, 0o640);
    const before = {
      env: readFileSync(localPath, 'utf8'),
      central: readFileSync(central, 'utf8'),
      mode: lstatSync(localPath).mode,
    };
    diagnose(root, central);
    expect(readFileSync(localPath, 'utf8')).toBe(before.env);
    expect(readFileSync(central, 'utf8')).toBe(before.central);
    expect(lstatSync(localPath).mode).toBe(before.mode);
  });
});

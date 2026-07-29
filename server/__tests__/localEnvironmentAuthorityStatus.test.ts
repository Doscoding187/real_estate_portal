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
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  inspectEnvironmentPath,
  parseEnvironmentText,
  runEnvironmentAuthorityDiagnostic,
} from '../../scripts/localEnvironmentAuthorityContract';

const requiredValues = [
  'DATABASE_URL=mysql://local:local@127.0.0.1:3307/listify_local',
  'LOCAL_DEMO_AGENCY_PASSWORD=fixture-only-secret',
  'JWT_SECRET=fixture-only-jwt-secret-which-is-not-output',
].join('\n');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'listify-stage2b-'));
  const central = join(root, 'machine', 'local.env');
  mkdirSync(join(root, 'machine'), { recursive: true });
  writeFileSync(central, `${requiredValues}\nAPP_ENV=development\n`, { mode: 0o600 });
  return { root, central };
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
    const result = runEnvironmentAuthorityDiagnostic(root, {
      centralPath: central,
      repositoryRoot: root,
      now: () => new Date('2026-07-30T00:00:00.000Z'),
    });
    expect(result.environmentPath.state).toBe('CANONICAL_LINK');
    expect(result.databaseTarget).toMatchObject({ classification: 'local', approved: true });
    expect(result.completeApplicationCompliance).toBe(true);
    expect(result.stage3Eligibility).toBe(true);
    expect(JSON.stringify(result)).not.toContain('fixture-only');
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

  it('reports production names, unknown names, malformed entries, and missing required names by name only', () => {
    const { root, central } = fixture();
    writeFileSync(
      central,
      'DATABASE_URL=mysql://remote:secret@railway.example/listify_property_sa\nPROD_RESET_ENABLED=true\nUNKNOWN_NAME=value\nmalformed\n',
      { mode: 0o600 },
    );
    const result = runEnvironmentAuthorityDiagnostic(root, {
      centralPath: central,
      repositoryRoot: root,
    });
    expect(result.centralAuthority.prohibitedLocalNames).toContain('PROD_RESET_ENABLED');
    expect(result.centralAuthority.unknownNames).toContain('UNKNOWN_NAME');
    expect(result.centralAuthority.missingRequiredNames).toContain('JWT_SECRET');
    expect(result.centralAuthority.malformedEntryCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(result.exitCode).toBe(1);
  });

  it('distinguishes an approved local database target from complete application compliance', () => {
    const { root, central } = fixture();
    writeFileSync(central, `${requiredValues}\n`, { mode: 0o600 });
    const result = runEnvironmentAuthorityDiagnostic(root, {
      centralPath: central,
      repositoryRoot: root,
    });
    expect(result.databaseTarget.approved).toBe(true);
    expect(result.completeApplicationCompliance).toBe(false);
    expect(result.stage3Eligibility).toBe(false);
    expect(result.blockers.some(blocker => blocker.includes('Worktree environment path'))).toBe(
      true,
    );
  });

  it('produces stable JSON for a fixed clock and never reads the process environment as a fixture', () => {
    const { root, central } = fixture();
    const options = {
      centralPath: central,
      repositoryRoot: root,
      now: () => new Date('2026-07-30T00:00:00.000Z'),
    };
    const first = runEnvironmentAuthorityDiagnostic(root, options);
    const second = runEnvironmentAuthorityDiagnostic(root, options);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toContain('fixture-only-secret');
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
    runEnvironmentAuthorityDiagnostic(root, { centralPath: central, repositoryRoot: root });
    expect(readFileSync(localPath, 'utf8')).toBe(before.env);
    expect(readFileSync(central, 'utf8')).toBe(before.central);
    expect(lstatSync(localPath).mode).toBe(before.mode);
  });
});

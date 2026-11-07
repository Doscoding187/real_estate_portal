import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { B08_AZURE_TARGET_FINGERPRINT_HASH } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  authorizeProbe,
  isAcceptedProbeTarget,
  safeProbeErrorLine,
} from '../runtimeGrant0197ProbeSupport';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

const roots: string[] = [];

function identity() {
  const root = mkdtempSync(join(tmpdir(), 'listify-probe-'));
  const common = join(root, '.git-common');
  const worktree = join(root, 'wt');
  mkdirSync(common);
  mkdirSync(worktree);
  roots.push(root);
  return deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'fix/probe',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    upstream: 'origin/main',
    registered: true,
    clean: true,
  });
}

function productionAuthority() {
  const id = identity();
  return resolveDatabaseAuthority({
    operation: 'read-only-connect',
    cwd: id.worktreePath,
    gitIdentity: id,
    explicitDatabaseUrl:
      'mysql://propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
    credentialClass: 'runtime',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('0197 probe protected-target approval', () => {
  it('refuses production without an approval', () => {
    const authority = productionAuthority();
    expect(isAcceptedProbeTarget(authority.context)).toBe(true);
    expect(() => authorizeProbe(authority, {}, process.cwd())).toThrow(
      'protected target requires an exact operation and fingerprint approval',
    );
  });

  it('refuses a mismatched approved fingerprint', () => {
    expect(() =>
      authorizeProbe(
        productionAuthority(),
        {
          DATABASE_AUTHORITY_APPROVAL_REFERENCE: 'REF',
          DATABASE_AUTHORITY_APPROVAL_ACTOR: 'actor',
          DATABASE_AUTHORITY_APPROVED_FINGERPRINT: 'not-the-target',
        },
        process.cwd(),
      ),
    ).toThrow('protected target requires an exact operation and fingerprint approval');
  });

  it('authorizes with a matching fingerprint approval', () => {
    const decision = authorizeProbe(
      productionAuthority(),
      {
        DATABASE_AUTHORITY_APPROVAL_REFERENCE: 'REF',
        DATABASE_AUTHORITY_APPROVAL_ACTOR: 'actor',
        DATABASE_AUTHORITY_APPROVED_FINGERPRINT: B08_AZURE_TARGET_FINGERPRINT_HASH,
        DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS: 'runtime',
      },
      process.cwd(),
    );
    expect(decision.operation).toBe('read-only-connect');
    expect(decision.targetClass).toBe('production');
  });
});

describe('0197 probe safe error line', () => {
  it('keeps authored refusals and redacts URLs', () => {
    const line = safeProbeErrorLine(
      new Error('Database operation refused: see mysql://user:pw@host/db now'),
    );
    expect(line).toContain('Database operation refused:');
    expect(line).not.toContain('pw@host');
  });

  it('drops driver text entirely', () => {
    const error = Object.assign(new Error('connect to mysql://u:secret@h failed'), {
      code: 'ECONNREFUSED',
    });
    const line = safeProbeErrorLine(error);
    expect(line).toContain('code=ECONNREFUSED');
    expect(line).not.toContain('secret');
    expect(line).not.toContain('message=');
  });
});

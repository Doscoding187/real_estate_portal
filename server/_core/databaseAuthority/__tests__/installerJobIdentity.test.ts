import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyContainerAppsContext, readInstallerWorktreeIdentity } from '../worktreeIdentity';

const roots: string[] = [];
const JOB = { CONTAINER_APP_JOB_NAME: 'job-legal', CONTAINER_APP_JOB_EXECUTION_NAME: 'job-legal-x1' };

function dir() {
  const root = mkdtempSync(join(tmpdir(), 'installer-job-identity-'));
  roots.push(root);
  return root;
}
function git(root: string, ...args: string[]) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function repo() {
  const root = dir();
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 't@example.invalid');
  git(root, 'config', 'user.name', 'T');
  writeFileSync(join(root, 'a.txt'), 'a');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('installer identity in Container Apps jobs', () => {
  it('classifies contexts', () => {
    expect(classifyContainerAppsContext(JOB)).toBe('job');
    expect(classifyContainerAppsContext({ CONTAINER_APP_JOB_NAME: 'j' })).toBe('none');
    expect(classifyContainerAppsContext({})).toBe('none');
    expect(classifyContainerAppsContext({ ...JOB, CONTAINER_APP_ENV_DNS_SUFFIX: 'x.io' })).toBe(
      'job',
    );
  });

  it('allows a job with a clean matching git checkout', () => {
    const root = repo();
    const identity = readInstallerWorktreeIdentity(root, {
      env: { ...JOB, CONTAINER_APP_ENV_DNS_SUFFIX: 'x.io' },
    });
    expect(identity.head).toBe(git(root, 'rev-parse', 'HEAD'));
    expect(identity.clean).toBe(true);
  });

  it('exposes the real head so a different packet sourceHead mismatches', () => {
    const root = repo();
    const identity = readInstallerWorktreeIdentity(root, { env: JOB });
    expect(identity.head).not.toBe('f'.repeat(40));
  });

  it('reports a dirty tree as not clean (installer refuses unclean source)', () => {
    const root = repo();
    writeFileSync(join(root, 'a.txt'), 'changed');
    expect(readInstallerWorktreeIdentity(root, { env: JOB }).clean).toBe(false);
  });

  it('refuses a job without a valid git checkout', () => {
    expect(() => readInstallerWorktreeIdentity(dir(), { env: JOB })).toThrow();
  });

  it.each(['CONTAINER_APP_NAME', 'CONTAINER_APP_REVISION', 'CONTAINER_APP_REPLICA_NAME'])(
    'refuses app marker %s even with job markers and a valid checkout',
    marker => {
      const root = repo();
      expect(() =>
        readInstallerWorktreeIdentity(root, { env: { ...JOB, [marker]: 'v' } }),
      ).toThrow('app replica');
      expect(() => readInstallerWorktreeIdentity(root, { env: { [marker]: 'v' } })).toThrow(
        'app replica',
      );
    },
  );
});

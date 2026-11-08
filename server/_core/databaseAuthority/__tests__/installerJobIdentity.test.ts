import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyContainerAppsContext, readInstallerWorktreeIdentity } from '../worktreeIdentity';

const roots: string[] = [];
const JOB = {
  CONTAINER_APP_JOB_NAME: 'job-legal',
  CONTAINER_APP_JOB_EXECUTION_NAME: 'job-legal-x1',
};
const APP_REFUSAL = 'Legal-release installer refused: it must not run inside an app replica.';
const HOST_REFUSAL =
  'Legal-release installer refused: deployment host without a Container Apps job context';

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

  it('allows a job with a clean git checkout, even with a DNS suffix', () => {
    const root = repo();
    const identity = readInstallerWorktreeIdentity(root, {
      env: { ...JOB, CONTAINER_APP_ENV_DNS_SUFFIX: 'x.io' },
    });
    expect(identity.head).toBe(git(root, 'rev-parse', 'HEAD'));
    expect(identity.clean).toBe(true);
  });

  it('allows a plain git checkout with no markers', () => {
    expect(readInstallerWorktreeIdentity(repo(), { env: {} }).clean).toBe(true);
  });

  it('reports a dirty tree as not clean', () => {
    const root = repo();
    writeFileSync(join(root, 'a.txt'), 'changed');
    expect(readInstallerWorktreeIdentity(root, { env: JOB }).clean).toBe(false);
  });

  it('refuses a job without a git checkout with git failing, not a fallback identity', () => {
    const attempt = () => readInstallerWorktreeIdentity(dir(), { env: JOB });
    expect(attempt).toThrow(/not a git repository/i);
    expect(attempt).not.toThrow(APP_REFUSAL);
  });

  it('treats job vars plus a replica or app name as a job', () => {
    expect(classifyContainerAppsContext({ ...JOB, CONTAINER_APP_REPLICA_NAME: 'r' })).toBe('job');
    expect(classifyContainerAppsContext({ ...JOB, CONTAINER_APP_NAME: 'a' })).toBe('job');
  });

  it('treats any defined revision as an app, even with job vars', () => {
    const root = repo();
    for (const value of ['v', '', '   ']) {
      expect(classifyContainerAppsContext({ ...JOB, CONTAINER_APP_REVISION: value })).toBe('app');
      expect(() =>
        readInstallerWorktreeIdentity(root, { env: { ...JOB, CONTAINER_APP_REVISION: value } }),
      ).toThrow(APP_REFUSAL);
    }
    expect(() =>
      readInstallerWorktreeIdentity(root, { env: { CONTAINER_APP_REVISION: 'v' } }),
    ).toThrow(APP_REFUSAL);
  });

  it.each(['CONTAINER_APP_NAME', 'CONTAINER_APP_REPLICA_NAME'])(
    'refuses %s alone as an app replica',
    marker => {
      const root = repo();
      for (const value of ['v', '', '   ']) {
        expect(() => readInstallerWorktreeIdentity(root, { env: { [marker]: value } })).toThrow(
          APP_REFUSAL,
        );
      }
    },
  );

  it('treats a single job var, or blank job vars, plus a replica name as an app', () => {
    const replica = { CONTAINER_APP_REPLICA_NAME: 'r' };
    expect(classifyContainerAppsContext({ CONTAINER_APP_JOB_NAME: 'j', ...replica })).toBe('app');
    expect(
      classifyContainerAppsContext({
        CONTAINER_APP_JOB_NAME: '',
        CONTAINER_APP_JOB_EXECUTION_NAME: ' ',
        ...replica,
      }),
    ).toBe('app');
  });

  it('refuses a DNS suffix without job markers', () => {
    expect(() =>
      readInstallerWorktreeIdentity(repo(), { env: { CONTAINER_APP_ENV_DNS_SUFFIX: 'x.io' } }),
    ).toThrow(HOST_REFUSAL);
  });

  it.each(['RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_ENVIRONMENT', 'RAILWAY_PUBLIC_DOMAIN'])(
    'refuses Railway marker %s without job markers',
    marker => {
      expect(() => readInstallerWorktreeIdentity(repo(), { env: { [marker]: 'x' } })).toThrow(
        HOST_REFUSAL,
      );
    },
  );
});

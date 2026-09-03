import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { GitWorktreeIdentity } from './types';

type WorktreeIdentityMaterial = {
  repositoryRoot: string;
  gitCommonDirectory: string;
  worktreePath: string;
  branch: string;
  head: string;
  upstream?: string | null;
  originMainHead?: string | null;
  registered?: boolean;
  clean?: boolean;
};

type RuntimeIdentityOptions = {
  env?: NodeJS.ProcessEnv;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function readableSlug(worktreePath: string): string {
  const slug = basename(worktreePath)
    .toLowerCase()
    .replace(/^(?:property-)?listify-/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return slug || 'worktree';
}

export function deriveGitWorktreeIdentity(material: WorktreeIdentityMaterial): GitWorktreeIdentity {
  const repositoryRoot = realpathSync(material.repositoryRoot);
  const gitCommonDirectory = realpathSync(material.gitCommonDirectory);
  const worktreePath = realpathSync(material.worktreePath);
  const ownershipDigest = sha256(`${worktreePath}\0${gitCommonDirectory}`);
  const ownershipKey = ownershipDigest.slice(0, 24);
  const expectedWorktreeDatabase = `listify_wt_${readableSlug(worktreePath)}_${ownershipDigest.slice(0, 12)}`;

  if (expectedWorktreeDatabase.length > 64) {
    throw new Error('Worktree database identity exceeds the MySQL identifier limit.');
  }

  return Object.freeze({
    repositoryRoot,
    gitCommonDirectory,
    gitCommonDirectoryFingerprint: sha256(gitCommonDirectory),
    worktreePath,
    branch: material.branch,
    head: material.head,
    upstream: material.upstream ?? null,
    originMainHead: material.originMainHead ?? null,
    registered: material.registered ?? true,
    clean: material.clean ?? true,
    ownershipKey,
    expectedWorktreeDatabase,
  });
}

function hasRailwayDeploymentIdentity(env: NodeJS.ProcessEnv): boolean {
  return [
    env.RAILWAY_GIT_COMMIT_SHA,
    env.RAILWAY_ENVIRONMENT,
    env.RAILWAY_ENVIRONMENT_NAME,
    env.RAILWAY_PUBLIC_DOMAIN,
  ].some(value => Boolean(String(value ?? '').trim()));
}

function railwayDeploymentLabel(env: NodeJS.ProcessEnv): string {
  const value = String(
    env.RAILWAY_GIT_BRANCH ??
      env.RAILWAY_ENVIRONMENT_NAME ??
      env.RAILWAY_ENVIRONMENT ??
      'deployment',
  ).trim();
  return value || 'deployment';
}

function railwayDeploymentHead(env: NodeJS.ProcessEnv): string {
  const value = String(
    env.RAILWAY_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? env.SOURCE_VERSION ?? 'railway-artifact',
  ).trim();
  return value || 'railway-artifact';
}

/**
 * Railway's production artifact is deliberately not a Git checkout. Remote
 * targets do not use worktree ownership for authorization, but the resolved
 * context still needs a stable, non-local identity for audit evidence.
 */
export function deriveRailwayDeploymentIdentity(
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): GitWorktreeIdentity {
  const deploymentRoot = realpathSync(cwd);

  return deriveGitWorktreeIdentity({
    repositoryRoot: deploymentRoot,
    gitCommonDirectory: deploymentRoot,
    worktreePath: deploymentRoot,
    branch: `railway/${railwayDeploymentLabel(env)}`,
    head: railwayDeploymentHead(env),
    registered: false,
    clean: false,
  });
}

function git(cwd: string, args: string[], allowMissing = false): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', allowMissing ? 'ignore' : 'pipe'],
    }).trim();
  } catch (error) {
    if (allowMissing) return '';
    throw error;
  }
}

export function readGitWorktreeIdentity(cwd = process.cwd()): GitWorktreeIdentity {
  const repositoryRootRaw = git(cwd, ['rev-parse', '--show-toplevel']);
  const worktreePath = realpathSync(repositoryRootRaw);
  const commonDirectoryRaw = git(cwd, ['rev-parse', '--git-common-dir']);
  const gitCommonDirectory = realpathSync(
    commonDirectoryRaw.startsWith('/')
      ? commonDirectoryRaw
      : resolve(worktreePath, commonDirectoryRaw),
  );
  const registeredPaths = git(cwd, ['worktree', 'list', '--porcelain'])
    .split(/\n(?=worktree )/)
    .map(block => block.match(/^worktree (.+)$/m)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(value => {
      try {
        return realpathSync(value);
      } catch {
        return resolve(value);
      }
    });

  return deriveGitWorktreeIdentity({
    repositoryRoot: worktreePath,
    gitCommonDirectory,
    worktreePath,
    branch: git(cwd, ['branch', '--show-current'], true),
    head: git(cwd, ['rev-parse', 'HEAD']),
    upstream:
      git(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true) || null,
    originMainHead: git(cwd, ['rev-parse', 'origin/main'], true) || null,
    registered: registeredPaths.includes(worktreePath),
    clean: git(cwd, ['status', '--porcelain']).length === 0,
  });
}

/**
 * Resolve the identity appropriate to the runtime artifact. Local and CI
 * callers retain the Git-backed identity and fail closed when Git metadata is
 * unavailable. Railway production uses its deployment metadata instead:
 * Railpack does not include a Git executable or checkout in the runtime image.
 */
export function readRuntimeWorktreeIdentity(
  cwd = process.cwd(),
  options: RuntimeIdentityOptions = {},
): GitWorktreeIdentity {
  const env = options.env ?? process.env;
  if (hasRailwayDeploymentIdentity(env)) {
    return deriveRailwayDeploymentIdentity(cwd, env);
  }

  return readGitWorktreeIdentity(cwd);
}

export function isProtectedIntegrationBranch(branch: string): boolean {
  return branch === 'main' || branch === 'master';
}

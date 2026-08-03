import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { GitWorktreeIdentity } from './types';

export type WorktreeDatabaseProfile = {
  profileVersion: 1;
  ownershipKey: string;
  worktreePath: string;
  gitCommonDirectoryFingerprint: string;
  databaseName: string;
  createdAt: string;
  lastVerifiedManifestHead: string | null;
};

export function worktreeProfileRoot(home = homedir()): string {
  return join(home, '.config', 'property-listify', 'worktrees');
}

export function worktreeProfilePath(
  identity: Pick<GitWorktreeIdentity, 'ownershipKey'>,
  root = worktreeProfileRoot(),
): string {
  return join(root, `${identity.ownershipKey}.json`);
}

function assertProfileMatchesIdentity(
  profile: WorktreeDatabaseProfile,
  identity: GitWorktreeIdentity,
): void {
  if (
    profile.profileVersion !== 1 ||
    profile.ownershipKey !== identity.ownershipKey ||
    profile.worktreePath !== identity.worktreePath ||
    profile.gitCommonDirectoryFingerprint !== identity.gitCommonDirectoryFingerprint ||
    profile.databaseName !== identity.expectedWorktreeDatabase
  ) {
    throw new Error(
      'Worktree database profile does not match the registered worktree ownership identity.',
    );
  }
}

export function readWorktreeDatabaseProfile(
  identity: GitWorktreeIdentity,
  root = worktreeProfileRoot(),
): WorktreeDatabaseProfile | null {
  const path = worktreeProfilePath(identity, root);
  if (!existsSync(path)) return null;
  const mode = statSync(path).mode & 0o777;
  if (mode !== 0o600) {
    throw new Error('Worktree database profile permissions must be exactly 0600.');
  }
  const profile = JSON.parse(readFileSync(path, 'utf8')) as WorktreeDatabaseProfile;
  assertProfileMatchesIdentity(profile, identity);
  return Object.freeze(profile);
}

export function writeWorktreeDatabaseProfile(
  identity: GitWorktreeIdentity,
  input: { createdAt?: string; lastVerifiedManifestHead?: string | null } = {},
  root = worktreeProfileRoot(),
): WorktreeDatabaseProfile {
  const path = worktreeProfilePath(identity, root);
  const existing = readWorktreeDatabaseProfile(identity, root);
  const profile: WorktreeDatabaseProfile = {
    profileVersion: 1,
    ownershipKey: identity.ownershipKey,
    worktreePath: identity.worktreePath,
    gitCommonDirectoryFingerprint: identity.gitCommonDirectoryFingerprint,
    databaseName: identity.expectedWorktreeDatabase,
    createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
    lastVerifiedManifestHead:
      input.lastVerifiedManifestHead ?? existing?.lastVerifiedManifestHead ?? null,
  };
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  chmodSync(dirname(path), 0o700);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, {
    mode: 0o600,
    encoding: 'utf8',
  });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, path);
  return Object.freeze(profile);
}

export function removeWorktreeDatabaseProfile(
  identity: GitWorktreeIdentity,
  root = worktreeProfileRoot(),
): void {
  const path = worktreeProfilePath(identity, root);
  if (!existsSync(path)) return;
  readWorktreeDatabaseProfile(identity, root);
  rmSync(path);
}

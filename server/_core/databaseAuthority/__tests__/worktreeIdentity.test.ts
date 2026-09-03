import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import { readRuntimeWorktreeIdentity } from '../worktreeIdentity';

const temporaryRoots: string[] = [];

function temporaryArtifact() {
  const root = mkdtempSync(join(tmpdir(), 'property-listify-railway-artifact-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('runtime worktree identity', () => {
  it('derives a non-local identity for a Railway artifact without Git metadata', () => {
    const artifact = temporaryArtifact();
    const identity = readRuntimeWorktreeIdentity(artifact, {
      env: {
        RAILWAY_ENVIRONMENT: 'production',
        RAILWAY_GIT_COMMIT_SHA: 'a'.repeat(40),
      },
    });

    expect(identity).toMatchObject({
      repositoryRoot: resolve(artifact),
      gitCommonDirectory: resolve(artifact),
      worktreePath: resolve(artifact),
      branch: 'railway/production',
      head: 'a'.repeat(40),
      registered: false,
      clean: false,
    });
  });

  it('continues to fail closed outside Railway when Git metadata is unavailable', () => {
    const artifact = temporaryArtifact();

    expect(() => readRuntimeWorktreeIdentity(artifact, { env: {} })).toThrow();
  });

  it('keeps Railway production runtime connection authorization protected', () => {
    const artifact = temporaryArtifact();
    const centralPath = join(artifact, 'absent-central.env');
    const authority = resolveDatabaseAuthority({
      operation: 'runtime-connect',
      cwd: artifact,
      centralPath,
      processEnv: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT: 'production',
        RAILWAY_GIT_COMMIT_SHA: 'b'.repeat(40),
        DATABASE_CREDENTIAL_CLASS: 'runtime',
        DATABASE_URL:
          'mysql://runtime:secret@tidb.example.test:4000/listify_property_sa?sslaccept=strict',
      },
    });

    expect(authority.context).toMatchObject({
      targetClass: 'production',
      credentialClass: 'runtime',
      worktree: {
        registered: false,
        clean: false,
        branch: 'railway/production',
      },
    });

    expect(() => authorizeDatabaseOperation(authority, { root: process.cwd() })).toThrow(
      'protected target requires an exact operation and fingerprint approval',
    );
  });
});

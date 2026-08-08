import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import {
  assertListingPreviewAgencyIdentity,
  assertListingPreviewPassword,
  assertListingPreviewTarget,
  assertListingPreviewUserIdentity,
  hashListingPreviewPassword,
  LISTING_PREVIEW_FIXTURE_DIGEST,
  LISTING_PREVIEW_FIXTURE_IDENTITIES,
  LISTING_PREVIEW_FIXTURE_VERSION,
} from '../dataAdapters/listingPreviewFixture';

const ROOT = process.cwd();

function identity(branch = 'fix/database-authority-listing-preview-test') {
  return deriveGitWorktreeIdentity({
    repositoryRoot: ROOT,
    gitCommonDirectory: join(ROOT, '.git'),
    worktreePath: ROOT,
    branch,
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: true,
  });
}

function exactWorktreeTarget() {
  const currentIdentity = identity();
  return resolveDatabaseAuthority({
    operation: 'demo-seed',
    cwd: ROOT,
    gitIdentity: currentIdentity,
    explicitDatabaseUrl: `mysql://listify_app:private@127.0.0.1:3307/${currentIdentity.expectedWorktreeDatabase}`,
    credentialClass: 'local-owner',
    processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
  });
}

describe('listing-preview Database Authority fixture', () => {
  it('publishes deterministic identities without Search-to-Lead ownership', () => {
    expect(LISTING_PREVIEW_FIXTURE_VERSION).toBe('listing-preview-auth-v1');
    expect(LISTING_PREVIEW_FIXTURE_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(LISTING_PREVIEW_FIXTURE_IDENTITIES.agentEmail).toBe('agent@listify.local');
    expect(LISTING_PREVIEW_FIXTURE_IDENTITIES.agencyAdminEmail).toBe('agency@listify.local');
    expect(LISTING_PREVIEW_FIXTURE_IDENTITIES.agencySlug).toBe('listing-preview-agency-v1');
    expect(LISTING_PREVIEW_FIXTURE_IDENTITIES.agentEmail).not.toContain('@invalid.example');
  });

  it.each([
    'mysql://listify_app:private@127.0.0.1:3307/listify_local',
    'mysql://listify_app:private@127.0.0.1:3307/listify_arbitrary',
    'mysql://listify_app:private@remote.example/listify_shared',
  ])('refuses protected, arbitrary or remote target %s before SQL', url => {
    const authority = resolveDatabaseAuthority({
      operation: 'demo-seed',
      cwd: ROOT,
      gitIdentity: identity(),
      explicitDatabaseUrl: url,
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => assertListingPreviewTarget(authority)).toThrow(
      'exact owned disposable worktree database',
    );
  });

  it('refuses a target owned by another registered worktree', () => {
    const current = exactWorktreeTarget();
    const otherWorktreePath = '/home/edwardspc/Desktop/Dev/property-listify-main';
    const wrongOwner = resolveDatabaseAuthority({
      operation: 'demo-seed',
      cwd: ROOT,
      gitIdentity: deriveGitWorktreeIdentity({
        repositoryRoot: ROOT,
        gitCommonDirectory: join(ROOT, '.git'),
        worktreePath: otherWorktreePath,
        branch: 'main',
        head: 'a'.repeat(40),
        originMainHead: 'b'.repeat(40),
        registered: true,
        clean: true,
      }),
      explicitDatabaseUrl: `mysql://listify_app:private@127.0.0.1:3307/${current.context.databaseName}`,
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => assertListingPreviewTarget(wrongOwner)).toThrow(
      'exact owned disposable worktree database',
    );
  });

  it('fails closed when the central password authority is absent', () => {
    expect(() => assertListingPreviewPassword(undefined)).toThrow('LOCAL_DEMO_AGENCY_PASSWORD');
    expect(() => assertListingPreviewPassword('short')).toThrow('LOCAL_DEMO_AGENCY_PASSWORD');
  });

  it('creates a bcrypt password hash without returning the password', async () => {
    const password = 'UnitTestPassword!123';
    const hash = await hashListingPreviewPassword(password);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('rejects conflicting deterministic fixture identities', () => {
    expect(() =>
      assertListingPreviewUserIdentity(
        { email: 'other@example.invalid', openId: 'listing-preview-agent-v1', role: 'agent' },
        { email: 'agent@listify.local', openId: 'listing-preview-agent-v1' },
        'agent',
      ),
    ).toThrow('conflicts at user agent email');
    expect(() =>
      assertListingPreviewAgencyIdentity({
        slug: 'other-agency',
        email: 'agency@listify.local',
      }),
    ).toThrow('conflicts at agency slug');
  });
});

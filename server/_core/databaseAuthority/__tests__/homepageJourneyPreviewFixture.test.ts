import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import {
  assertHomepageJourneyPreviewPassword,
  assertHomepageJourneyPreviewTarget,
  hashHomepageJourneyPreviewPassword,
  HOMEPAGE_JOURNEY_PREVIEW_DIGEST,
  HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES,
  HOMEPAGE_JOURNEY_PREVIEW_RENTAL_PROPERTY_ID,
  HOMEPAGE_JOURNEY_PREVIEW_SALE_PROPERTY_IDS,
  HOMEPAGE_JOURNEY_PREVIEW_VERSION,
} from '../dataAdapters/homepageJourneyPreviewFixture';

const ROOT = process.cwd();

function identity(branch = 'fix/database-authority-homepage-preview-test') {
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

describe('homepage journey preview Database Authority fixture', () => {
  it('accepts only the exact owned local worktree target', () => {
    expect(() => assertHomepageJourneyPreviewTarget(exactWorktreeTarget())).not.toThrow();
  });

  it('defines a ten-card Buy rail, a separate rental, and local-only login identities', () => {
    expect(HOMEPAGE_JOURNEY_PREVIEW_VERSION).toBe('homepage-journey-preview-v1');
    expect(HOMEPAGE_JOURNEY_PREVIEW_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(HOMEPAGE_JOURNEY_PREVIEW_SALE_PROPERTY_IDS).toHaveLength(10);
    expect(new Set(HOMEPAGE_JOURNEY_PREVIEW_SALE_PROPERTY_IDS).size).toBe(10);
    expect(HOMEPAGE_JOURNEY_PREVIEW_SALE_PROPERTY_IDS).not.toContain(
      HOMEPAGE_JOURNEY_PREVIEW_RENTAL_PROPERTY_ID,
    );
    expect(HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES).toMatchObject({
      agentEmail: 'home-preview-agent@listify.local',
      agencyAdminEmail: 'home-preview-agency@listify.local',
      developerEmail: 'home-preview-developer@listify.local',
      canonicalLocation: 'gauteng/johannesburg/sandton',
    });
    expect(HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.agentEmail).not.toContain('@invalid.example');
    expect(HOMEPAGE_JOURNEY_PREVIEW_IDENTITIES.developerEmail).not.toContain('@invalid.example');
  });

  it.each([
    'mysql://listify_app:private@127.0.0.1:3307/listify_local',
    'mysql://listify_app:private@127.0.0.1:3307/listify_arbitrary',
    'mysql://listify_app:private@remote.example/listify_shared',
  ])('refuses protected, arbitrary, or remote target %s before SQL', url => {
    const authority = resolveDatabaseAuthority({
      operation: 'demo-seed',
      cwd: ROOT,
      gitIdentity: identity(),
      explicitDatabaseUrl: url,
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(() => assertHomepageJourneyPreviewTarget(authority)).toThrow(
      'exact owned disposable worktree database',
    );
  });

  it('refuses a target owned by another registered worktree', () => {
    const current = exactWorktreeTarget();
    const otherWorktreePath = mkdtempSync(join(tmpdir(), 'property-listify-other-worktree-'));
    try {
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
      expect(() => assertHomepageJourneyPreviewTarget(wrongOwner)).toThrow(
        'exact owned disposable worktree database',
      );
    } finally {
      rmSync(otherWorktreePath, { recursive: true, force: true });
    }
  });

  it('requires the central local password authority without exposing it', async () => {
    expect(() => assertHomepageJourneyPreviewPassword(undefined)).toThrow(
      'LOCAL_DEMO_AGENCY_PASSWORD',
    );
    expect(() => assertHomepageJourneyPreviewPassword('short')).toThrow(
      'LOCAL_DEMO_AGENCY_PASSWORD',
    );

    const password = 'UnitTestPassword!123';
    const hash = await hashHomepageJourneyPreviewPassword(password);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });
});

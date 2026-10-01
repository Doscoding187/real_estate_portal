import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { authorizeDatabaseOperation } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  isGovernedContainedScenarioFixtureActive,
  issueGovernedContainedScenarioFixture,
  revokeGovernedContainedScenarioFixture,
} from '../governedContainedScenarioFixture';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

const temporaryRoots: string[] = [];

function fixtureAuthority(runtimeMode: 'test' | 'development' = 'test') {
  const root = mkdtempSync(join(tmpdir(), 'listify-governed-scenario-fixture-'));
  const common = join(root, '.git-common');
  const worktree = join(root, 'fixture-worktree');
  mkdirSync(common);
  mkdirSync(worktree);
  temporaryRoots.push(root);

  const identity = deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'fix/governed-scenario-fixture',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    upstream: 'origin/main',
    registered: true,
    clean: true,
  });
  const databaseName = `listify_test_${identity.ownershipKey.slice(0, 12)}`;
  return resolveDatabaseAuthority({
    operation: 'verification',
    cwd: identity.worktreePath,
    gitIdentity: identity,
    explicitDatabaseUrl: `mysql://fixture:fixture-password@127.0.0.1:3307/${databaseName}`,
    processEnv: { NODE_ENV: runtimeMode, APP_ENV: runtimeMode },
  });
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('governed contained-scenario fixture capability', () => {
  it('requires a real Database Authority decision and exact issued context', () => {
    const authority = fixtureAuthority();
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    const capability = issueGovernedContainedScenarioFixture({ authority, decision });
    const environment = {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: capability,
      DATABASE_AUTHORITY_PARENT_FINGERPRINT: authority.context.targetFingerprintHash,
      DATABASE_AUTHORITY_CORRELATION_ID: authority.context.correlationId,
    };

    try {
      expect(isGovernedContainedScenarioFixtureActive(environment)).toBe(true);
      expect(
        isGovernedContainedScenarioFixtureActive({
          ...environment,
          PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: 'true',
        }),
      ).toBe(false);
      expect(
        isGovernedContainedScenarioFixtureActive({
          ...environment,
          DATABASE_AUTHORITY_PARENT_FINGERPRINT: '0'.repeat(64),
        }),
      ).toBe(false);
      expect(
        isGovernedContainedScenarioFixtureActive({
          ...environment,
          DATABASE_AUTHORITY_CORRELATION_ID: 'not-the-issued-correlation',
        }),
      ).toBe(false);
    } finally {
      revokeGovernedContainedScenarioFixture(capability);
    }

    expect(isGovernedContainedScenarioFixtureActive(environment)).toBe(false);
  });

  it('rejects forged authority decisions and non-test runtimes', () => {
    const authority = fixtureAuthority();
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    const forgedDecision = Object.freeze({ ...decision }) as typeof decision;
    expect(() =>
      issueGovernedContainedScenarioFixture({ authority, decision: forgedDecision }),
    ).toThrow('operation authorization is absent or mismatched');

    const developmentAuthority = fixtureAuthority('development');
    expect(() =>
      issueGovernedContainedScenarioFixture({
        authority: developmentAuthority,
        decision: forgedDecision,
      }),
    ).toThrow('require the test runtime');
  });

  it('fails closed when either runtime environment is not exactly test', () => {
    const authority = fixtureAuthority();
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    const capability = issueGovernedContainedScenarioFixture({ authority, decision });
    const environment = {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: capability,
      DATABASE_AUTHORITY_PARENT_FINGERPRINT: authority.context.targetFingerprintHash,
      DATABASE_AUTHORITY_CORRELATION_ID: authority.context.correlationId,
    };

    try {
      expect(
        isGovernedContainedScenarioFixtureActive({ ...environment, NODE_ENV: 'development' }),
      ).toBe(false);
      expect(
        isGovernedContainedScenarioFixtureActive({ ...environment, APP_ENV: 'development' }),
      ).toBe(false);
      expect(
        isGovernedContainedScenarioFixtureActive({ ...environment, NODE_ENV: 'production' }),
      ).toBe(false);
    } finally {
      revokeGovernedContainedScenarioFixture(capability);
    }
  });
});

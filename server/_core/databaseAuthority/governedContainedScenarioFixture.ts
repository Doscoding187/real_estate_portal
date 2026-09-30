import { randomUUID } from 'node:crypto';

import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from './authorization';
import { requireReferenceAdapterTarget } from './dataAdapters/common';
import type { ResolvedDatabaseAuthority } from './types';

type FixtureEnvironment = Record<string, string | undefined>;

type IssuedFixtureCapability = Readonly<{
  targetFingerprintHash: string;
  correlationId: string;
}>;

// This registry is process-scoped and intentionally has no persistence or
// public-input path. A marker value is useful only when it was issued from a
// real Database Authority decision in this process.
const issuedCapabilities = new Map<string, IssuedFixtureCapability>();

/**
 * Issues a short-lived capability for the contained Search-to-Lead verifier.
 * This is database-test plumbing, not a commercial release or entitlement
 * authority. The caller must already hold a genuine Database Authority
 * verification decision for an owned disposable target.
 */
export function issueGovernedContainedScenarioFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  profileRoot?: string;
}): string {
  if (input.authority.context.runtimeMode !== 'test') {
    throw new Error('Governed contained scenario fixtures require the test runtime.');
  }
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'verification',
    'browser-verification',
  ]);
  requireReferenceAdapterTarget(input.authority, input.profileRoot);

  const capability = randomUUID();
  issuedCapabilities.set(
    capability,
    Object.freeze({
      targetFingerprintHash: input.authority.context.targetFingerprintHash,
      correlationId: input.authority.context.correlationId,
    }),
  );
  return capability;
}

export function revokeGovernedContainedScenarioFixture(capability: string): void {
  issuedCapabilities.delete(capability);
}

export function isGovernedContainedScenarioFixtureActive(
  environment: FixtureEnvironment = process.env,
): boolean {
  if (environment.NODE_ENV !== 'test' || environment.APP_ENV !== 'test') return false;

  const capability = environment.PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE;
  if (!capability) return false;
  const issued = issuedCapabilities.get(capability);
  return Boolean(
    issued &&
      environment.DATABASE_AUTHORITY_PARENT_FINGERPRINT === issued.targetFingerprintHash &&
      environment.DATABASE_AUTHORITY_CORRELATION_ID === issued.correlationId,
  );
}

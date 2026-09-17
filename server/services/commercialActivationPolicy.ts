import { TRPCError } from '@trpc/server';

import { isGovernedContainedScenarioFixtureActive } from '../_core/databaseAuthority/governedContainedScenarioFixture';
import { COMMERCIAL_ACTIVATION_STATE } from '../../shared/commercialActivation';

type RuntimeEnvironment = Record<string, string | undefined>;

/**
 * Test fixtures may model paid states only from Vitest or an authority-wrapped
 * browser/contained-scenario fixture runner. The contained-scenario capability
 * is issued from a real Database Authority decision and is process-scoped;
 * neither marker is a normal app setting. Development and deployed runtimes
 * therefore retain the immutable release state below.
 */
export function isCommercialActivationAvailable(
  environment: RuntimeEnvironment = process.env,
): boolean {
  const authorityWrappedBrowserFixture =
    environment.NODE_ENV === 'test' &&
    environment.APP_ENV === 'test' &&
    environment.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE === 'true' &&
    Boolean(environment.DATABASE_AUTHORITY_PARENT_FINGERPRINT) &&
    Boolean(environment.DATABASE_AUTHORITY_CORRELATION_ID);
  const authorityWrappedScenarioFixture = isGovernedContainedScenarioFixtureActive(environment);

  return (
    COMMERCIAL_ACTIVATION_STATE.enabled ||
    (environment.NODE_ENV === 'test' && environment.VITEST === 'true') ||
    authorityWrappedBrowserFixture ||
    authorityWrappedScenarioFixture
  );
}

export function getCommercialActivationStatus(environment: RuntimeEnvironment = process.env) {
  return {
    ...COMMERCIAL_ACTIVATION_STATE,
    enabled: isCommercialActivationAvailable(environment),
  };
}

/** Fail closed before an invoice, payment, or entitlement mutation can begin. */
export function requireCommercialActivation(operation: string): void {
  if (isCommercialActivationAvailable()) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${operation} is unavailable while Property Listify is in preparation-only onboarding. ${COMMERCIAL_ACTIVATION_STATE.message}`,
  });
}

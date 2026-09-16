import { TRPCError } from '@trpc/server';

import { COMMERCIAL_ACTIVATION_STATE } from '../../shared/commercialActivation';

type RuntimeEnvironment = Record<string, string | undefined>;

/**
 * Test fixtures may model paid states only from Vitest or the authority-wrapped
 * browser fixture runner. The latter marker is injected only after that runner
 * has authorized an owned disposable target; it is not a normal app setting.
 * Development and deployed runtimes therefore retain the immutable release
 * state below.
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

  return (
    COMMERCIAL_ACTIVATION_STATE.enabled ||
    (environment.NODE_ENV === 'test' && environment.VITEST === 'true') ||
    authorityWrappedBrowserFixture
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

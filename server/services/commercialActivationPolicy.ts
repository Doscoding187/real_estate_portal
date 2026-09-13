import { TRPCError } from '@trpc/server';

import { COMMERCIAL_ACTIVATION_STATE } from '../../shared/commercialActivation';

type RuntimeEnvironment = Record<string, string | undefined>;

/**
 * Test fixtures may model paid states only from the Vitest process so
 * entitlement consumers retain coverage. No development or deployed runtime
 * can enable commercial activation through environment configuration.
 */
export function isCommercialActivationAvailable(
  environment: RuntimeEnvironment = process.env,
): boolean {
  return (
    COMMERCIAL_ACTIVATION_STATE.enabled ||
    (environment.NODE_ENV === 'test' && environment.VITEST === 'true')
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

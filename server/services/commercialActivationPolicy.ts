import { TRPCError } from '@trpc/server';

import { isGovernedContainedScenarioFixtureActive } from '../_core/databaseAuthority/governedContainedScenarioFixture';
import {
  COMMERCIAL_ACTIVATION_STATE,
  PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS,
  isPaidMvpLaunchAccessProductKey,
  isPaidMvpLaunchAccessProductEnabled,
  type PaidMvpLaunchAccessProductKey,
} from '../../shared/commercialActivation';

type RuntimeEnvironment = Record<string, string | undefined>;

const CONTROLLED_PRODUCT_KEYS_ENV = 'PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS';

function isAuthorityWrappedBrowserFixture(environment: RuntimeEnvironment): boolean {
  return (
    environment.NODE_ENV === 'test' &&
    environment.APP_ENV === 'test' &&
    environment.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE === 'true' &&
    Boolean(environment.DATABASE_AUTHORITY_PARENT_FINGERPRINT) &&
    Boolean(environment.DATABASE_AUTHORITY_CORRELATION_ID)
  );
}

function isControlledFixture(environment: RuntimeEnvironment): boolean {
  return (
    (environment.NODE_ENV === 'test' && environment.VITEST === 'true') ||
    isAuthorityWrappedBrowserFixture(environment) ||
    isGovernedContainedScenarioFixtureActive(environment)
  );
}

/**
 * The product selector is test-only and only interpreted after the existing
 * Database Authority fixture gate has succeeded. A malformed selector fails
 * closed. Omitting it preserves older governed suites that intentionally
 * exercise the complete paid-MVP cohort.
 */
function controlledFixtureProductKeys(
  environment: RuntimeEnvironment,
): readonly PaidMvpLaunchAccessProductKey[] {
  if (!isControlledFixture(environment)) return [];

  const configured = environment[CONTROLLED_PRODUCT_KEYS_ENV];
  if (configured === undefined || configured.trim() === '') {
    return PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS;
  }

  const parsed = configured
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (parsed.length === 0 || parsed.some(value => !isPaidMvpLaunchAccessProductKey(value))) {
    return [];
  }

  return [...new Set(parsed)] as PaidMvpLaunchAccessProductKey[];
}

/**
 * Test fixtures may model paid states only from Vitest or an authority-wrapped
 * browser/contained-scenario fixture runner. The contained-scenario capability
 * is issued from a real Database Authority decision and is process-scoped;
 * neither marker is a normal app setting. Development and deployed runtimes
 * therefore retain the immutable release state below.
 */
export function isCommercialActivationAvailable(
  environment: RuntimeEnvironment = process.env,
  productKey?: PaidMvpLaunchAccessProductKey,
): boolean {
  if (isControlledFixture(environment)) {
    const enabledProductKeys = controlledFixtureProductKeys(environment);
    return productKey
      ? enabledProductKeys.includes(productKey)
      : enabledProductKeys.length > 0;
  }

  // A product must be stated at normal runtime. This prevents a caller for a
  // legacy checkout, boosts, Land, or a future tier from inheriting approval
  // intended only for the three paid-MVP Launch Access products.
  return Boolean(
    productKey && isPaidMvpLaunchAccessProductEnabled(productKey, COMMERCIAL_ACTIVATION_STATE),
  );
}

/** Whether any approved Launch Access product is available to a bounded flow. */
export function isAnyPaidMvpLaunchAccessActivationAvailable(
  environment: RuntimeEnvironment = process.env,
): boolean {
  if (isControlledFixture(environment)) return controlledFixtureProductKeys(environment).length > 0;

  return (
    COMMERCIAL_ACTIVATION_STATE.enabled &&
    COMMERCIAL_ACTIVATION_STATE.enabledProductKeys.some(isPaidMvpLaunchAccessProductKey)
  );
}

export function getCommercialActivationStatus(environment: RuntimeEnvironment = process.env) {
  const productAvailability = {} as Record<PaidMvpLaunchAccessProductKey, boolean>;
  for (const productKey of PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS) {
    productAvailability[productKey] = isCommercialActivationAvailable(environment, productKey);
  }

  return {
    ...COMMERCIAL_ACTIVATION_STATE,
    enabled: isAnyPaidMvpLaunchAccessActivationAvailable(environment),
    productAvailability,
  };
}

/** Fail closed before an invoice, payment, or entitlement mutation can begin. */
export function requireCommercialActivation(
  operation: string,
  productKey?: PaidMvpLaunchAccessProductKey,
): void {
  if (isCommercialActivationAvailable(process.env, productKey)) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${operation} is unavailable while Property Listify is in preparation-only onboarding. ${COMMERCIAL_ACTIVATION_STATE.message}`,
  });
}

/**
 * Used only before a bounded Launch Access flow can load the selected plan.
 * Every mutating flow must subsequently require its exact product key.
 */
export function requireAnyPaidMvpLaunchAccessActivation(operation: string): void {
  if (isAnyPaidMvpLaunchAccessActivationAvailable()) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${operation} is unavailable while Property Listify is in preparation-only onboarding. ${COMMERCIAL_ACTIVATION_STATE.message}`,
  });
}

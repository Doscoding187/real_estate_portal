import { TRPCError } from '@trpc/server';

import { isGovernedContainedScenarioFixtureActive } from '../_core/databaseAuthority/governedContainedScenarioFixture';
import { resolveAppRuntimeEnv, type AppRuntimeEnv } from '../_core/runtimeBootstrap';
import {
  COMMERCIAL_ACTIVATION_STATE,
  PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS,
  isPaidMvpLaunchAccessProductKey,
  type PaidMvpLaunchAccessProductKey,
} from '../../shared/commercialActivation';

type RuntimeEnvironment = Record<string, string | undefined>;

export const PAID_MVP_ENABLED_PRODUCT_KEYS_ENV = 'PAID_MVP_ENABLED_PRODUCT_KEYS';
export const PAID_MVP_RELEASE_ID_ENV = 'PAID_MVP_RELEASE_ID';
export const PAID_MVP_APPROVAL_REF_ENV = 'PAID_MVP_APPROVAL_REF';
const CONTROLLED_PRODUCT_KEYS_ENV = 'PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS';

export type CommercialActivationConfiguration = {
  mode: 'preparation_only' | 'paid_mvp_release' | 'governed_test_fixture';
  enabled: boolean;
  enabledProductKeys: readonly PaidMvpLaunchAccessProductKey[];
  releaseId: string | null;
  approvalRef: string | null;
};

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
    isGovernedContainedScenarioFixtureActive(environment as NodeJS.ProcessEnv)
  );
}

function runtimeEnvironment(environment: RuntimeEnvironment): AppRuntimeEnv {
  return resolveAppRuntimeEnv(environment as NodeJS.ProcessEnv);
}

function parseProductKeys(value: string, source: string): readonly PaidMvpLaunchAccessProductKey[] {
  const parts = value.split(',');
  if (parts.length === 0 || parts.some(part => part.trim().length === 0)) {
    throw new Error(`${source} must be a comma-separated list without empty components.`);
  }

  const keys = parts.map(part => part.trim());
  if (keys.some(key => !isPaidMvpLaunchAccessProductKey(key))) {
    throw new Error(`${source} contains an unknown Paid MVP product key.`);
  }
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${source} must not contain duplicate product keys.`);
  }

  return Object.freeze(keys as PaidMvpLaunchAccessProductKey[]);
}

function validateReleaseMetadata(value: string, key: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(normalized)) {
    throw new Error(`${key} must be a non-empty release reference using safe identifier characters.`);
  }
  return normalized;
}

function preparationConfiguration(): CommercialActivationConfiguration {
  return Object.freeze({
    mode: 'preparation_only',
    enabled: false,
    enabledProductKeys: Object.freeze([]),
    releaseId: null,
    approvalRef: null,
  });
}

/**
 * Resolve the only production activation authority. An absent product list is
 * safe preparation mode; a configured release is an explicit allow-list and
 * must carry its review references. No customer or database state is read.
 */
export function resolveCommercialActivationConfiguration(
  environment: RuntimeEnvironment = process.env,
  runtimeEnv: AppRuntimeEnv = runtimeEnvironment(environment),
): CommercialActivationConfiguration {
  if (runtimeEnv === 'development' || runtimeEnv === 'test') {
    if (!isControlledFixture(environment)) return preparationConfiguration();

    const configured = environment[CONTROLLED_PRODUCT_KEYS_ENV];
    const keys = configured === undefined || configured.trim() === ''
      ? PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS
      : parseProductKeys(configured, CONTROLLED_PRODUCT_KEYS_ENV);
    return Object.freeze({
      mode: 'governed_test_fixture',
      enabled: keys.length > 0,
      enabledProductKeys: Object.freeze([...keys]),
      releaseId: null,
      approvalRef: null,
    });
  }

  const rawKeys = environment[PAID_MVP_ENABLED_PRODUCT_KEYS_ENV];
  const releaseId = environment[PAID_MVP_RELEASE_ID_ENV]?.trim() || '';
  const approvalRef = environment[PAID_MVP_APPROVAL_REF_ENV]?.trim() || '';

  if (rawKeys === undefined) {
    if (releaseId || approvalRef) {
      throw new Error('Commercial release metadata is configured without an enabled product list.');
    }
    return preparationConfiguration();
  }

  const keys = parseProductKeys(rawKeys, PAID_MVP_ENABLED_PRODUCT_KEYS_ENV);
  if (keys.length === 0) {
    throw new Error(`${PAID_MVP_ENABLED_PRODUCT_KEYS_ENV} must not be empty when configured.`);
  }
  if (runtimeEnv === 'production') {
    const exactLaunchSet = new Set(PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS);
    if (keys.length !== exactLaunchSet.size || keys.some(key => !exactLaunchSet.has(key))) {
      throw new Error(
        'Production commercial activation requires exactly the three approved Paid MVP product keys.',
      );
    }
  }
  if (!releaseId) throw new Error(`${PAID_MVP_RELEASE_ID_ENV} is required when products are enabled.`);
  if (!approvalRef) {
    throw new Error(`${PAID_MVP_APPROVAL_REF_ENV} is required when products are enabled.`);
  }

  return Object.freeze({
    mode: 'paid_mvp_release',
    enabled: true,
    enabledProductKeys: Object.freeze([...keys]),
    releaseId: validateReleaseMetadata(releaseId, PAID_MVP_RELEASE_ID_ENV),
    approvalRef: validateReleaseMetadata(approvalRef, PAID_MVP_APPROVAL_REF_ENV),
  });
}

let processActivationConfiguration: CommercialActivationConfiguration | null = null;

/** Parse once before startup begins serving requests; subsequent policy calls use this snapshot. */
export function initializeCommercialActivationPolicy(
  environment: RuntimeEnvironment = process.env,
): CommercialActivationConfiguration {
  const config = resolveCommercialActivationConfiguration(environment);
  if (environment === process.env) processActivationConfiguration = config;
  return config;
}

function getConfiguration(environment: RuntimeEnvironment): CommercialActivationConfiguration {
  if (environment === process.env && processActivationConfiguration) {
    return processActivationConfiguration;
  }
  return resolveCommercialActivationConfiguration(environment);
}

export function isCommercialActivationAvailable(
  environment: RuntimeEnvironment = process.env,
  productKey?: PaidMvpLaunchAccessProductKey,
): boolean {
  const config = getConfiguration(environment);
  return productKey
    ? config.enabledProductKeys.includes(productKey)
    : config.enabledProductKeys.length > 0;
}

export function isAnyPaidMvpLaunchAccessActivationAvailable(
  environment: RuntimeEnvironment = process.env,
): boolean {
  return getConfiguration(environment).enabledProductKeys.length > 0;
}

export function getCommercialActivationStatus(environment: RuntimeEnvironment = process.env) {
  const config = getConfiguration(environment);
  const productAvailability = {} as Record<PaidMvpLaunchAccessProductKey, boolean>;
  for (const productKey of PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS) {
    productAvailability[productKey] = config.enabledProductKeys.includes(productKey);
  }

  return {
    ...COMMERCIAL_ACTIVATION_STATE,
    mode: config.mode,
    enabled: config.enabled,
    enabledProductKeys: config.enabledProductKeys,
    productAvailability,
  };
}

/** Status for authenticated operators. Release references are not customer-facing. */
export function getCommercialActivationOperatorStatus(
  environment: RuntimeEnvironment = process.env,
) {
  const config = getConfiguration(environment);
  const buildSha = String(
    environment.BUILD_SHA ??
      environment.RAILWAY_GIT_COMMIT_SHA ??
      environment.GITHUB_SHA ??
      environment.VERCEL_GIT_COMMIT_SHA ??
      'unknown',
  ).trim();

  return {
    status: config.mode === 'preparation_only' ? 'preparation_only' : 'valid',
    enabled: config.enabled,
    enabledProductKeys: config.enabledProductKeys,
    releaseId: config.releaseId,
    approvalRef: config.approvalRef,
    buildSha: buildSha || 'unknown',
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

/** Used before a bounded Launch Access flow can load the selected plan. */
export function requireAnyPaidMvpLaunchAccessActivation(operation: string): void {
  if (isAnyPaidMvpLaunchAccessActivationAvailable()) return;

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${operation} is unavailable while Property Listify is in preparation-only onboarding. ${COMMERCIAL_ACTIVATION_STATE.message}`,
  });
}

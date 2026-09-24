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
export const PAID_MVP_SALES_PAUSED_ENV = 'PAID_MVP_SALES_PAUSED';
export const PAID_MVP_SALES_OPEN_UNTIL_ENV = 'PAID_MVP_SALES_OPEN_UNTIL';
const SALES_WINDOW_DAY_MS = 24 * 60 * 60 * 1000;
const CONTROLLED_PRODUCT_KEYS_ENV = 'PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS';

export type CommercialActivationConfiguration = {
  mode: 'preparation_only' | 'paid_mvp_release' | 'governed_test_fixture';
  enabled: boolean;
  enabledProductKeys: readonly PaidMvpLaunchAccessProductKey[];
  releaseId: string | null;
  approvalRef: string | null;
  salesPaused: boolean;
  salesOpenUntil: string | null;
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
    salesPaused: false,
    salesOpenUntil: null,
  });
}

function parseSalesOpenUntil(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error(`${PAID_MVP_SALES_OPEN_UNTIL_ENV} must be an exact UTC timestamp.`);
  }
  const parsed = new Date(value);
  const normalized = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== normalized) {
    throw new Error(`${PAID_MVP_SALES_OPEN_UNTIL_ENV} is not a valid UTC timestamp.`);
  }
  const now = Date.now();
  const utcDay = new Date(now).getUTCDay();
  const daysToNextWeekday = utcDay === 5 ? 3 : utcDay === 6 ? 2 : 1;
  if (parsed.getTime() - now > daysToNextWeekday * SALES_WINDOW_DAY_MS) {
    throw new Error(`${PAID_MVP_SALES_OPEN_UNTIL_ENV} cannot exceed the next weekday check (72 hours maximum).`);
  }
  return value;
}

function effectiveSalesPause(config: CommercialActivationConfiguration): boolean {
  return config.salesPaused ||
    (config.salesOpenUntil !== null && Date.now() >= Date.parse(config.salesOpenUntil));
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
  const rawSalesPause = environment[PAID_MVP_SALES_PAUSED_ENV];
  if (rawSalesPause !== undefined && rawSalesPause !== 'true' && rawSalesPause !== 'false') {
    throw new Error(`${PAID_MVP_SALES_PAUSED_ENV} must be exactly true or false.`);
  }
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
      salesPaused: rawSalesPause === 'true',
      salesOpenUntil: parseSalesOpenUntil(environment[PAID_MVP_SALES_OPEN_UNTIL_ENV]),
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
    // A hosted paid release without a renewed window never opens sales by default.
    salesPaused: rawSalesPause === 'true' || !environment[PAID_MVP_SALES_OPEN_UNTIL_ENV],
    salesOpenUntil: parseSalesOpenUntil(environment[PAID_MVP_SALES_OPEN_UNTIL_ENV]),
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
  const config = environment === process.env && processActivationConfiguration
    ? processActivationConfiguration
    : resolveCommercialActivationConfiguration(environment);
  if (!effectiveSalesPause(config) || config.salesPaused) return config;
  return Object.freeze({ ...config, salesPaused: true });
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
    salesPaused: config.salesPaused,
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
    salesPaused: config.salesPaused,
    salesOpenUntil: config.salesOpenUntil,
    buildSha: buildSha || 'unknown',
  };
}

/** Suspend new invoices and finance activation without disabling paid access. */
export function requirePaidMvpSalesOpen(
  operation: string,
  environment: RuntimeEnvironment = process.env,
): void {
  if (!getConfiguration(environment).salesPaused) return;
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${operation} is paused while the founder is unavailable. Existing customer access remains available.`,
  });
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

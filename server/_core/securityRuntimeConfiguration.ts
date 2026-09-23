import { resolveAppRuntimeEnv, type AppRuntimeEnv } from './runtimeBootstrap';
import { resolveCommercialActivationConfiguration } from '../services/commercialActivationPolicy';

const TEST_ONLY_ENVIRONMENT_KEYS = [
  'VITEST',
  'S2_DB_TESTS',
  'LISTIFY_E2E_DATABASE_URL',
  'LISTIFY_TEST_DB_REBUILD_CONFIRM',
  'DATABASE_AUTHORITY_PARENT_FINGERPRINT',
  'DATABASE_AUTHORITY_CORRELATION_ID',
  'PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE',
  'PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS',
  'PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE',
  'PROPERTY_LISTIFY_GOVERNED_B04_EMAIL_CAPTURE_PATH',
  'PROPERTY_LISTIFY_GOVERNED_B05_EMAIL_CAPTURE_PATH',
  'PROPERTY_LISTIFY_GOVERNED_B06_EMAIL_CAPTURE_PATH',
] as const;

const SECRET_PLACEHOLDERS = [
  /replace-with/i,
  /example\.invalid/i,
  /local test/i,
  /^(?:your|test|testing|development|dev)[-_]/i,
  /changeme/i,
  /change-me/i,
  /^0+$/,
] as const;

function value(env: NodeJS.ProcessEnv, key: string): string {
  return String(env[key] ?? '').trim();
}

export function isStrongRuntimeSecret(secret: string): boolean {
  return (
    secret.length >= 32 &&
    !SECRET_PLACEHOLDERS.some(pattern => pattern.test(secret))
  );
}

function normalizedEnvironment(valueToNormalize: string | undefined): string | null {
  const normalized = String(valueToNormalize ?? '').trim().toLowerCase();
  if (normalized === 'production' || normalized === 'prod') return 'production';
  if (normalized === 'staging' || normalized === 'stage') return 'staging';
  if (normalized === 'development' || normalized === 'dev') return 'development';
  if (normalized === 'test' || normalized === 'testing') return 'test';
  return null;
}

function environmentConsistencyIssues(env: NodeJS.ProcessEnv, runtimeEnv: AppRuntimeEnv): string[] {
  const declared = [
    env.APP_ENV,
    env.RAILWAY_ENVIRONMENT_NAME,
    env.RAILWAY_ENVIRONMENT,
    env.VERCEL_ENV,
    env.NODE_ENV,
  ]
    .map(normalizedEnvironment)
    .filter((item): item is string => item !== null);
  const anyDeployedDeclaration = declared.some(item => item === 'production' || item === 'staging');
  if (!anyDeployedDeclaration) return [];
  if (declared.some(item => item !== runtimeEnv)) {
    return ['Deployment environment declarations disagree; align APP_ENV and NODE_ENV.'];
  }
  return [];
}

/** Test/runtime selectors must never be present in a hosted staging or production process. */
export function deployedTestConfigurationIssues(env: NodeJS.ProcessEnv = process.env): string[] {
  const runtimeEnv = resolveAppRuntimeEnv(env);
  if (runtimeEnv !== 'production' && runtimeEnv !== 'staging') return [];

  return TEST_ONLY_ENVIRONMENT_KEYS.filter(key => value(env, key).length > 0).map(
    key => `${key} is test-only and must be unset in deployed runtime.`,
  );
}

export function deployedSecurityConfigurationIssues(
  env: NodeJS.ProcessEnv = process.env,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(env),
): string[] {
  const issues = environmentConsistencyIssues(env, runtimeEnv);
  if (runtimeEnv !== 'production' && runtimeEnv !== 'staging') return issues;

  issues.push(...deployedTestConfigurationIssues(env));

  const jwtSecret = value(env, 'JWT_SECRET');
  if (!isStrongRuntimeSecret(jwtSecret)) {
    issues.push('JWT_SECRET must be present, non-placeholder, and at least 32 characters.');
  }

  const mediaAdapter = value(env, 'MEDIA_STORAGE_ADAPTER').toLowerCase();
  if (mediaAdapter !== 's3') {
    issues.push('MEDIA_STORAGE_ADAPTER must be explicitly set to s3 in deployed runtime.');
  }
  if (!value(env, 'S3_BUCKET_NAME')) issues.push('S3_BUCKET_NAME is required in deployed runtime.');
  if (!value(env, 'AWS_REGION')) issues.push('AWS_REGION is required in deployed runtime.');

  const mediaTokenSecret = value(env, 'MEDIA_UPLOAD_TOKEN_SECRET');
  if (!isStrongRuntimeSecret(mediaTokenSecret)) {
    issues.push('MEDIA_UPLOAD_TOKEN_SECRET must be present, non-placeholder, and at least 32 characters.');
  } else if (mediaTokenSecret === jwtSecret) {
    issues.push('MEDIA_UPLOAD_TOKEN_SECRET must be distinct from JWT_SECRET.');
  }

  try {
    resolveCommercialActivationConfiguration(env, runtimeEnv);
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : 'Paid MVP commercial activation configuration is invalid.',
    );
  }

  return [...new Set(issues)];
}

/** Run before any deployed web or worker process begins work. */
export function assertDeployedSecurityConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(env),
): void {
  const issues = deployedSecurityConfigurationIssues(env, runtimeEnv);
  if (issues.length > 0) {
    throw new Error(`Deployed security configuration rejected: ${issues.join(' ')}`);
  }
}

/** Narrow guard for one-shot internal workers which do not use browser/media configuration. */
export function assertNoDeployedTestConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(env),
): void {
  const issues = [...environmentConsistencyIssues(env, runtimeEnv), ...deployedTestConfigurationIssues(env)];
  if (issues.length > 0) {
    throw new Error(`Deployed runtime selectors rejected: ${issues.join(' ')}`);
  }
}

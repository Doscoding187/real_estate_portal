import { isValidAuthRateLimitRedisUrl } from './authRateLimitStore';
import { resolveBrowserSecurityPolicy } from './browserSecurity';
import { resolveAppRuntimeEnv, assertDeployedTrustProxyConfiguration, type AppRuntimeEnv } from './runtimeBootstrap';
import { deployedSecurityConfigurationIssues, isStrongRuntimeSecret } from './securityRuntimeConfiguration';
import { isTransactionalEmailConfigured, transactionalEmailOrigin } from './transactionalEmailConfig';

const APP_ORIGIN_KEYS = ['APP_URL', 'FRONTEND_URL', 'BASE_URL', 'NEXT_PUBLIC_APP_URL', 'VITE_APP_URL'] as const;
const API_ORIGIN_KEYS = ['API_URL', 'VITE_API_URL', 'VITE_API_BASE_URL'] as const;
const SHA_KEYS = ['BUILD_SHA', 'RAILWAY_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA', 'SOURCE_VERSION'] as const;

function configured(env: NodeJS.ProcessEnv, key: string): string {
  return String(env[key] ?? '').trim();
}

export function resolveHostedBuildSha(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const key of SHA_KEYS) {
    const sha = configured(env, key);
    if (sha) return /^[a-f\d]{40}$/i.test(sha) ? sha.toLowerCase() : null;
  }
  return null;
}

function exactHttpsOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
        url.search || url.hash || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function originIssues(env: NodeJS.ProcessEnv, runtimeEnv: AppRuntimeEnv): string[] {
  const issues: string[] = [];
  const app = exactHttpsOrigin(configured(env, 'APP_URL'));
  const api = exactHttpsOrigin(configured(env, 'API_URL') || configured(env, 'VITE_API_URL'));
  if (!app) issues.push('APP_URL must be an exact HTTPS frontend origin.');
  if (!api) issues.push('API_URL or VITE_API_URL must be an exact HTTPS API origin.');
  for (const key of APP_ORIGIN_KEYS) {
    const value = configured(env, key);
    if (value && (!exactHttpsOrigin(value) || value !== app?.origin)) {
      issues.push(`${key} must equal the canonical APP_URL origin.`);
    }
  }
  for (const key of API_ORIGIN_KEYS) {
    const value = configured(env, key);
    if (value && (!exactHttpsOrigin(value) || value !== api?.origin)) {
      issues.push(`${key} must equal the canonical API origin.`);
    }
  }
  if (runtimeEnv === 'production' &&
      (app?.origin !== 'https://www.propertylistifysa.co.za' ||
       api?.origin !== 'https://api.propertylistifysa.co.za')) {
    issues.push('Production frontend/API origins must match the approved www/API domains.');
  }
  if (runtimeEnv === 'staging' &&
      (app?.origin !== 'https://staging.propertylistifysa.co.za' ||
       api?.origin !== 'https://api-staging.propertylistifysa.co.za')) {
    issues.push('Staging frontend/API origins must match the approved staging domain pair.');
  }
  const cors = configured(env, 'CORS_ALLOWED_ORIGINS');
  if (cors && cors !== app?.origin) issues.push('CORS_ALLOWED_ORIGINS must equal APP_URL in deployed runtime.');
  const policy = resolveBrowserSecurityPolicy({ env, runtimeEnv });
  issues.push(...policy.configurationErrors);
  if (app && (policy.allowedCorsOrigins.size !== 1 || !policy.allowedCorsOrigins.has(app.origin))) {
    issues.push('Deployed CORS must allow only the canonical frontend origin.');
  }
  return issues;
}

/** Static launch contract. No dependency connections or protected database operation. */
export function hostedRuntimeConfigurationIssues(
  env: NodeJS.ProcessEnv = process.env,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(env),
): string[] {
  if (runtimeEnv !== 'staging' && runtimeEnv !== 'production') return [];
  const issues = [...deployedSecurityConfigurationIssues(env, runtimeEnv), ...originIssues(env, runtimeEnv)];
  if (configured(env, 'APP_ENV') !== runtimeEnv || configured(env, 'NODE_ENV') !== 'production') {
    issues.push('Hosted runtime requires explicit APP_ENV and NODE_ENV=production.');
  }
  if (!resolveHostedBuildSha(env)) issues.push('A full 40-character BUILD_SHA or provider commit SHA is required.');
  if (!configured(env, 'DATABASE_URL')) issues.push('DATABASE_URL is required.');
  if (configured(env, 'SKIP_FRONTEND') !== 'true') {
    issues.push('Railway backend services require SKIP_FRONTEND=true.');
  }
  if (configured(env, 'VITE_USE_MOCK_EMAILS') === 'true') {
    issues.push('VITE_USE_MOCK_EMAILS is forbidden in deployed runtime.');
  }
  if (configured(env, 'SL_PHONE_OTP_DEV_MODE') === '1') {
    issues.push('SL_PHONE_OTP_DEV_MODE is forbidden in deployed runtime.');
  }
  if (!isValidAuthRateLimitRedisUrl(configured(env, 'REDIS_URL'))) {
    issues.push('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'BILLING_PROOF_S3_BUCKET']) {
    if (!configured(env, key)) issues.push(`${key} is required.`);
  }
  if (configured(env, 'AWS_S3_BUCKET') !== configured(env, 'S3_BUCKET_NAME')) {
    issues.push('AWS_S3_BUCKET must equal S3_BUCKET_NAME for mounted video/media paths.');
  }
  if (configured(env, 'BILLING_PROOF_STORAGE_ADAPTER') !== 's3') {
    issues.push('BILLING_PROOF_STORAGE_ADAPTER must be s3.');
  }
  if (!configured(env, 'BILLING_PROOF_AWS_ACCESS_KEY_ID') ||
      !configured(env, 'BILLING_PROOF_AWS_SECRET_ACCESS_KEY')) {
    issues.push('Private billing proof requires dedicated scoped AWS credentials.');
  } else if (configured(env, 'BILLING_PROOF_AWS_ACCESS_KEY_ID') === configured(env, 'AWS_ACCESS_KEY_ID')) {
    issues.push('Private billing proof credentials must be distinct from public media credentials.');
  }
  if (configured(env, 'BILLING_PROOF_S3_BUCKET') === configured(env, 'S3_BUCKET_NAME')) {
    issues.push('Private billing proof and public media must use different buckets.');
  }
  if (!isTransactionalEmailConfigured(env)) issues.push('Resend key and non-placeholder sender are required.');
  try {
    transactionalEmailOrigin('app', env);
    transactionalEmailOrigin('api', env);
  } catch {
    issues.push('Transactional email app/API origins must be valid HTTPS origins.');
  }
  if (configured(env, 'SAVED_SEARCH_SCHEDULER_ENABLED') !== 'false') {
    if (configured(env, 'SAVED_SEARCH_SCHEDULER_ENABLED') !== 'true' ||
        !isStrongRuntimeSecret(configured(env, 'SAVED_SEARCH_ACTION_TOKEN_SECRET'))) {
      issues.push('Set SAVED_SEARCH_SCHEDULER_ENABLED=false, or true with a strong token secret.');
    }
  }
  try { assertDeployedTrustProxyConfiguration(env); } catch (error) {
    issues.push(error instanceof Error ? error.message : 'TRUST_PROXY is invalid.');
  }
  return [...new Set(issues)];
}

export function assertHostedRuntimeConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(env),
): void {
  const issues = hostedRuntimeConfigurationIssues(env, runtimeEnv);
  if (issues.length) throw new Error(`Hosted runtime configuration rejected: ${issues.join(' ')}`);
}

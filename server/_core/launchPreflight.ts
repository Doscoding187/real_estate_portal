import { resolveDatabaseAuthority } from './databaseAuthority/context';
import { isValidAuthRateLimitRedisUrl } from './authRateLimitStore';
import { resolveBrowserSecurityPolicy } from './browserSecurity';
import type { AppRuntimeEnv } from './runtimeBootstrap';
import { resolveAppRuntimeEnv } from './runtimeBootstrap';

export type LaunchPreflightLevel = 'required' | 'recommended';

export type LaunchPreflightCheck = {
  id: string;
  level: LaunchPreflightLevel;
  ok: boolean;
  message: string;
  missing?: string[];
};

export type LaunchPreflightResult = {
  ok: boolean;
  runtimeEnv: AppRuntimeEnv;
  checks: LaunchPreflightCheck[];
};

type EnvLike = NodeJS.ProcessEnv;

const PLACEHOLDER_PATTERNS = [
  /replace-with/i,
  /example\.invalid/i,
  /not-payable/i,
  /local test/i,
  /onboarding@resend\.dev/i,
  /^0+$/,
];

function readEnv(env: EnvLike, key: string) {
  return String(env[key] || '').trim();
}

function firstValue(env: EnvLike, keys: string[]) {
  for (const key of keys) {
    const value = readEnv(env, key);
    if (value) return { key, value };
  }
  return null;
}

function missingKeys(env: EnvLike, keys: string[]) {
  return keys.filter(key => !readEnv(env, key));
}

function hasPlaceholder(value: string) {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value.trim()));
}

function placeholderKeys(env: EnvLike, keys: string[]) {
  return keys.filter(key => {
    const value = readEnv(env, key);
    return value.length > 0 && hasPlaceholder(value);
  });
}

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  );
}

function validateHttpsUrl(label: string, value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return `${label} must use https in production.`;
    }
    if (isLocalHostname(parsed.hostname)) {
      return `${label} must not point to localhost in production.`;
    }
    return null;
  } catch {
    return `${label} must be a valid absolute URL.`;
  }
}

function makeCheck(input: LaunchPreflightCheck): LaunchPreflightCheck {
  return input;
}

function requiredPresenceCheck(env: EnvLike, id: string, keys: string[], message: string) {
  const missing = missingKeys(env, keys);
  const placeholders = placeholderKeys(env, keys);
  const failures = [...missing, ...placeholders.map(key => `${key} (placeholder)`).filter(Boolean)];

  return makeCheck({
    id,
    level: 'required',
    ok: failures.length === 0,
    message,
    missing: failures,
  });
}

function databaseCheck(env: EnvLike, runtimeEnv: AppRuntimeEnv) {
  const databaseUrl = readEnv(env, 'DATABASE_URL');
  if (!databaseUrl) {
    return makeCheck({
      id: 'database-target',
      level: 'required',
      ok: false,
      message: 'DATABASE_URL must be set.',
      missing: ['DATABASE_URL'],
    });
  }

  try {
    const authority = resolveDatabaseAuthority({
      operation: 'release-plan',
      explicitDatabaseUrl: databaseUrl,
      processEnv: env,
      credentialClass: 'read-only',
    });
    const expectedTargetClass =
      runtimeEnv === 'production' ? 'production' : runtimeEnv === 'staging' ? 'staging' : null;
    if (!expectedTargetClass || authority.context.targetClass !== expectedTargetClass) {
      throw new Error(
        `Database release context refused: ${runtimeEnv} requires an exact ${expectedTargetClass ?? 'protected'} target class.`,
      );
    }
    return makeCheck({
      id: 'database-target',
      level: 'required',
      ok: true,
      message: `Database target is ${authority.context.targetFingerprint}.`,
    });
  } catch (error) {
    return makeCheck({
      id: 'database-target',
      level: 'required',
      ok: false,
      message: error instanceof Error ? error.message : 'Database release context is invalid.',
    });
  }
}

function jwtSecretCheck(env: EnvLike) {
  const key = 'JWT_SECRET';
  const value = readEnv(env, key);
  const missing = !value;
  const weak = value.length > 0 && value.length < 32;
  const placeholder = value.length > 0 && hasPlaceholder(value);

  return makeCheck({
    id: 'auth-secret',
    level: 'required',
    ok: !missing && !weak && !placeholder,
    message: 'JWT_SECRET must be a non-placeholder value with at least 32 characters.',
    missing: [
      ...(missing ? [key] : []),
      ...(weak ? [`${key} (too short)`] : []),
      ...(placeholder ? [`${key} (placeholder)`] : []),
    ],
  });
}

function urlChecks(env: EnvLike) {
  const publicApp = firstValue(env, ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'FRONTEND_URL', 'BASE_URL']);
  const viteApp = firstValue(env, ['VITE_APP_URL']);
  const viteApi = firstValue(env, ['VITE_API_URL', 'VITE_API_BASE_URL']);

  const checks: LaunchPreflightCheck[] = [];

  for (const [id, label, value] of [
    ['public-app-url', 'APP_URL/NEXT_PUBLIC_APP_URL', publicApp],
    ['vite-app-url', 'VITE_APP_URL', viteApp],
    ['vite-api-url', 'VITE_API_URL/VITE_API_BASE_URL', viteApi],
  ] as const) {
    if (!value) {
      checks.push(
        makeCheck({
          id,
          level: 'required',
          ok: false,
          message: `${label} must be configured for production browser and email flows.`,
          missing: [label],
        }),
      );
      continue;
    }

    const problem = validateHttpsUrl(value.key, value.value);
    checks.push(
      makeCheck({
        id,
        level: 'required',
        ok: !problem && !hasPlaceholder(value.value),
        message: problem || `${value.key} is production-safe.`,
        missing: hasPlaceholder(value.value) ? [`${value.key} (placeholder)`] : [],
      }),
    );
  }

  return checks;
}

function browserSecurityCheck(env: EnvLike, runtimeEnv: AppRuntimeEnv) {
  const policy = resolveBrowserSecurityPolicy({ env, runtimeEnv });
  return makeCheck({
    id: 'browser-origin-boundary',
    level: 'required',
    ok: policy.configurationErrors.length === 0 && policy.allowedCorsOrigins.size > 0,
    message:
      policy.configurationErrors[0] ||
      'Browser CORS and state-changing requests are limited to exact configured origins.',
    missing:
      policy.configurationErrors.length > 0
        ? [...policy.configurationErrors]
        : policy.allowedCorsOrigins.size === 0
          ? ['APP_URL, FRONTEND_URL, BASE_URL, NEXT_PUBLIC_APP_URL, or VITE_APP_URL']
          : undefined,
  });
}

function trustedProxyCheck(env: EnvLike, runtimeEnv: AppRuntimeEnv) {
  const rawValue = readEnv(env, 'TRUST_PROXY');
  const requiresProxy = runtimeEnv === 'production' || runtimeEnv === 'staging';
  const valid = /^[1-9]\d*$/.test(rawValue);

  return makeCheck({
    id: 'trusted-proxy-boundary',
    level: 'required',
    ok: !requiresProxy || valid,
    message: requiresProxy
      ? 'TRUST_PROXY must be the exact positive number of trusted reverse proxies.'
      : 'Trust-proxy configuration is not required outside deployed environments.',
    missing: !requiresProxy || valid ? undefined : ['TRUST_PROXY (positive proxy-hop count)'],
  });
}

function publicMediaStorageCheck(env: EnvLike) {
  return requiredPresenceCheck(
    env,
    'public-media-storage',
    ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'],
    'Public media uploads require production S3 configuration.',
  );
}

function manualEftCheck(env: EnvLike) {
  return requiredPresenceCheck(
    env,
    'manual-eft-billing',
    [
      'BILLING_EFT_ACCOUNT_NAME',
      'BILLING_EFT_BANK_NAME',
      'BILLING_EFT_BRANCH_CODE',
      'BILLING_EFT_ACCOUNT_NUMBER',
      'BILLING_EFT_ACCOUNT_TYPE',
      'BILLING_SUPPORT_EMAIL',
    ],
    'Manual EFT billing must have payable bank details and support contact configured.',
  );
}

function billingProofStorageCheck(env: EnvLike) {
  const adapter = readEnv(env, 'BILLING_PROOF_STORAGE_ADAPTER') || 's3';
  const missing = [
    adapter !== 's3' ? 'BILLING_PROOF_STORAGE_ADAPTER=s3' : null,
    !readEnv(env, 'BILLING_PROOF_S3_BUCKET') ? 'BILLING_PROOF_S3_BUCKET' : null,
    !(readEnv(env, 'BILLING_PROOF_S3_REGION') || readEnv(env, 'AWS_REGION'))
      ? 'BILLING_PROOF_S3_REGION or AWS_REGION'
      : null,
    !(readEnv(env, 'BILLING_PROOF_AWS_ACCESS_KEY_ID') || readEnv(env, 'AWS_ACCESS_KEY_ID'))
      ? 'BILLING_PROOF_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID'
      : null,
    !(readEnv(env, 'BILLING_PROOF_AWS_SECRET_ACCESS_KEY') || readEnv(env, 'AWS_SECRET_ACCESS_KEY'))
      ? 'BILLING_PROOF_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY'
      : null,
  ].filter(Boolean) as string[];

  return makeCheck({
    id: 'billing-proof-storage',
    level: 'required',
    ok: missing.length === 0,
    message: 'Payment proof documents require private durable S3 storage in production.',
    missing,
  });
}

function emailCheck(env: EnvLike) {
  const from = firstValue(env, ['RESEND_FROM_EMAIL', 'EMAIL_FROM']);
  const missing = [
    !readEnv(env, 'RESEND_API_KEY') ? 'RESEND_API_KEY' : null,
    !from ? 'RESEND_FROM_EMAIL or EMAIL_FROM' : null,
    from && hasPlaceholder(from.value) ? `${from.key} (placeholder)` : null,
  ].filter(Boolean) as string[];

  return makeCheck({
    id: 'transactional-email',
    level: 'required',
    ok: missing.length === 0,
    message:
      'Transactional email must be configured for verification, reset, invite, and billing flows.',
    missing,
  });
}

function distributedAuthRateLimitCheck(env: EnvLike) {
  const redisUrl = readEnv(env, 'REDIS_URL');
  const failures: string[] = [];

  if (!redisUrl) {
    failures.push('REDIS_URL');
  } else if (!isValidAuthRateLimitRedisUrl(redisUrl)) {
    failures.push('REDIS_URL (valid redis:// or rediss:// URL)');
  }

  for (const [key, minimum, maximum] of [
    ['AUTH_RATE_LIMIT_STORE_TIMEOUT_MS', 250, 5_000],
    ['AUTH_RATE_LIMIT_STORE_COOLDOWN_MS', 1_000, 60_000],
  ] as const) {
    const value = readEnv(env, key);
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
      failures.push(`${key} (integer ${minimum}-${maximum})`);
    }
  }

  return makeCheck({
    id: 'distributed-auth-rate-limit',
    level: 'required',
    ok: failures.length === 0,
    message:
      'Authentication requires a valid Redis-backed shared limiter configuration with bounded connection and retry settings.',
    missing: failures,
  });
}

function recommendedPresenceCheck(env: EnvLike, id: string, keys: string[], message: string) {
  const missing = missingKeys(env, keys);
  return makeCheck({
    id,
    level: 'recommended',
    ok: missing.length === 0,
    message,
    missing,
  });
}

export function runLaunchPreflight(options?: {
  env?: EnvLike;
  runtimeEnv?: AppRuntimeEnv;
}): LaunchPreflightResult {
  const env = options?.env ?? process.env;
  const runtimeEnv = options?.runtimeEnv ?? resolveAppRuntimeEnv(env);
  const checks: LaunchPreflightCheck[] = [
    databaseCheck(env, runtimeEnv),
    jwtSecretCheck(env),
    ...urlChecks(env),
    browserSecurityCheck(env, runtimeEnv),
    trustedProxyCheck(env, runtimeEnv),
    publicMediaStorageCheck(env),
    manualEftCheck(env),
    billingProofStorageCheck(env),
    emailCheck(env),
    distributedAuthRateLimitCheck(env),
    recommendedPresenceCheck(
      env,
      'maps',
      ['GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_API_KEY'],
      'Google Maps keys are recommended for map and location UX.',
    ),
    recommendedPresenceCheck(
      env,
      'saved-search-actions',
      ['SAVED_SEARCH_ACTION_TOKEN_SECRET'],
      'Saved-search action tokens are recommended before enabling notification delivery.',
    ),
  ];

  return {
    ok: checks.every(check => check.level !== 'required' || check.ok),
    runtimeEnv,
    checks,
  };
}

export function formatLaunchPreflight(result: LaunchPreflightResult) {
  const lines = [`Launch preflight (${result.runtimeEnv}) ${result.ok ? 'passed' : 'failed'}.`];

  for (const check of result.checks) {
    const marker = check.ok ? 'PASS' : check.level === 'required' ? 'FAIL' : 'WARN';
    lines.push(`[${marker}] ${check.id}: ${check.message}`);
    if (!check.ok && check.missing?.length) {
      lines.push(`      Missing/action: ${check.missing.join(', ')}`);
    }
  }

  return lines.join('\n');
}

export function assertLaunchPreflight(options?: { env?: EnvLike; runtimeEnv?: AppRuntimeEnv }) {
  const result = runLaunchPreflight(options);
  if (!result.ok) {
    throw new Error(formatLaunchPreflight(result));
  }
  return result;
}

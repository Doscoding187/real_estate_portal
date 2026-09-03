import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export type AppRuntimeEnv = 'development' | 'test' | 'staging' | 'production';

const normalizeRuntimeEnv = (value: string | undefined): AppRuntimeEnv | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'development' || normalized === 'dev') return 'development';
  if (normalized === 'test' || normalized === 'testing') return 'test';
  if (normalized === 'staging' || normalized === 'stage') return 'staging';
  if (normalized === 'production' || normalized === 'prod') return 'production';

  return null;
};

export function resolveAppRuntimeEnv(env: NodeJS.ProcessEnv = process.env): AppRuntimeEnv {
  const deploymentEnv = normalizeRuntimeEnv(
    env.APP_ENV ?? env.RAILWAY_ENVIRONMENT_NAME ?? env.RAILWAY_ENVIRONMENT ?? env.VERCEL_ENV,
  );

  if (deploymentEnv) {
    return deploymentEnv;
  }

  return normalizeRuntimeEnv(env.NODE_ENV) ?? 'development';
}

export function resolveTrustProxySetting(
  env: NodeJS.ProcessEnv = process.env,
): number | string | boolean {
  const rawValue = String(env.TRUST_PROXY ?? '')
    .trim()
    .toLowerCase();

  if (rawValue === 'false') return false;
  if (rawValue === 'true') return 1;

  if (rawValue.length > 0) {
    const numericValue = Number(rawValue);
    if (Number.isInteger(numericValue) && numericValue >= 0) {
      return numericValue;
    }

    if (rawValue === 'loopback' || rawValue === 'linklocal' || rawValue === 'uniquelocal') {
      return rawValue;
    }
  }

  if (env.RAILWAY_ENVIRONMENT || env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_PUBLIC_DOMAIN) {
    return 1;
  }

  return false;
}

/**
 * Deployed environments must state the exact reverse-proxy hop count. This
 * keeps req.ip, req.protocol, and host redirects from trusting client-supplied
 * forwarding headers by accident.
 */
export function assertDeployedTrustProxyConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  const runtimeEnv = resolveAppRuntimeEnv(env);
  if (runtimeEnv !== 'production' && runtimeEnv !== 'staging') return;

  const rawValue = String(env.TRUST_PROXY ?? '').trim();
  if (!/^[1-9]\d*$/.test(rawValue)) {
    throw new Error(
      'TRUST_PROXY must be the exact positive number of trusted reverse-proxy hops in deployed environments.',
    );
  }
}

export function loadAppRuntimeEnv(options?: { cwd?: string; env?: NodeJS.ProcessEnv }) {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const runtimeEnv = resolveAppRuntimeEnv(env);

  const envPaths = [path.resolve(cwd, '.env')];
  if (runtimeEnv === 'development') {
    envPaths.push(path.resolve(cwd, '.env.local'));
  } else {
    envPaths.push(path.resolve(cwd, `.env.${runtimeEnv}`));
  }

  const loadedFiles: string[] = [];
  const fileValues: Record<string, string> = {};
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    Object.assign(fileValues, dotenv.parse(fs.readFileSync(envPath, 'utf8')));
    loadedFiles.push(path.basename(envPath));
  }

  const explicitDatabaseUrl = env.DATABASE_URL;
  const explicitE2eDatabaseUrl = env.LISTIFY_E2E_DATABASE_URL;
  if (explicitE2eDatabaseUrl && runtimeEnv !== 'development' && runtimeEnv !== 'test') {
    throw new Error(
      'LISTIFY_E2E_DATABASE_URL is permitted only in development or test environments.',
    );
  }
  if (
    explicitDatabaseUrl &&
    explicitE2eDatabaseUrl &&
    explicitDatabaseUrl !== explicitE2eDatabaseUrl
  ) {
    throw new Error(
      'LISTIFY_E2E_DATABASE_URL disagrees with DATABASE_URL. Pass one explicit target to database authority.',
    );
  }
  for (const [key, value] of Object.entries(fileValues)) {
    if (key === 'DATABASE_URL' && explicitE2eDatabaseUrl) continue;
    if (env[key] === undefined) env[key] = value;
  }
  if (explicitE2eDatabaseUrl) {
    env.DATABASE_URL = explicitE2eDatabaseUrl;
    env.DATABASE_AUTHORITY_DATABASE_URL_SOURCE = 'explicit-process';
  } else if (explicitDatabaseUrl) {
    env.DATABASE_AUTHORITY_DATABASE_URL_SOURCE = 'explicit-process';
  } else if (fileValues.DATABASE_URL) {
    env.DATABASE_AUTHORITY_DATABASE_URL_SOURCE = 'runtime-bootstrap-file';
  }

  const finalRuntimeEnv = resolveAppRuntimeEnv(env);
  if (finalRuntimeEnv !== runtimeEnv) {
    throw new Error(
      `Runtime environment changed from ${runtimeEnv} to ${finalRuntimeEnv} after environment loading.`,
    );
  }
  env.NODE_ENV = runtimeEnv;

  return {
    runtimeEnv,
    loadedFiles,
  };
}

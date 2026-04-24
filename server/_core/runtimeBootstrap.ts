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

export function loadAppRuntimeEnv(options?: { cwd?: string; env?: NodeJS.ProcessEnv }) {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const runtimeEnv = resolveAppRuntimeEnv(env);

  if (env.NODE_ENV !== runtimeEnv) {
    env.NODE_ENV = runtimeEnv;
  }

  const envPaths = [path.resolve(cwd, '.env')];
  if (runtimeEnv === 'development') {
    envPaths.push(path.resolve(cwd, '.env.local'));
  } else {
    envPaths.push(path.resolve(cwd, `.env.${runtimeEnv}`));
  }

  const loadedFiles: string[] = [];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({
      path: envPath,
      override: envPath.endsWith('.local') || envPath.endsWith(`.${runtimeEnv}`),
      processEnv: env,
    });
    loadedFiles.push(path.basename(envPath));
  }

  return {
    runtimeEnv,
    loadedFiles,
  };
}

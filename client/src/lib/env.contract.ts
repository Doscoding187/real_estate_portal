// client/src/lib/env.contract.ts

export type DeployEnv = 'production' | 'staging' | 'preview' | 'development';

export const DEPLOY_ENVS: readonly DeployEnv[] = [
  'production',
  'staging',
  'preview',
  'development',
] as const;

/**
 * Backend hosts allowed per deploy environment
 */
export const BACKEND_HOSTS = {
  production: new Set(['api.propertylistifysa.co.za']),
  staging: new Set(['realestateportal-staging.up.railway.app']),
  preview: new Set(['realestateportal-staging.up.railway.app']), // previews use staging backend
  development: new Set([
    'localhost:3000',
    'localhost:5000',
    '127.0.0.1:3000',
    '127.0.0.1:5000',
    'realestateportal-staging.up.railway.app', // allow dev to point to staging when needed
  ]),
} as const;

export function parseDeployEnv(raw: unknown): DeployEnv {
  const val = String(raw ?? 'development') as DeployEnv;
  if (!DEPLOY_ENVS.includes(val)) return 'development';
  return val;
}

export function requireApiUrl(raw: unknown): string {
  const val = String(raw ?? '');
  if (!val) throw new Error('CRITICAL ENV ERROR: VITE_API_URL is not defined');
  // Validate URL format early (gives clearer errors)
  try {
    new URL(val);
  } catch {
    throw new Error(`CRITICAL ENV ERROR: VITE_API_URL is not a valid URL. Got: ${val}`);
  }
  return val;
}

export function apiHostFromUrl(apiUrl: string): string {
  return new URL(apiUrl).host;
}

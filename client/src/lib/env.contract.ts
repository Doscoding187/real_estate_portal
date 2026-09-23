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
  staging: new Set(['api-staging.propertylistifysa.co.za']),
  preview: new Set(['api-staging.propertylistifysa.co.za']), // unauthenticated previews only
  development: new Set([
    'localhost:3000',
    'localhost:5000',
    '127.0.0.1:3000',
    '127.0.0.1:5000',
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
  let parsed: URL;
  try {
    parsed = new URL(val);
  } catch {
    throw new Error(`CRITICAL ENV ERROR: VITE_API_URL is not a valid URL. Got: ${val}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('VITE_API_URL must be an origin without path, credentials, query or hash.');
  }
  return val;
}

export function apiHostFromUrl(apiUrl: string): string {
  return new URL(apiUrl).host;
}

import type express from 'express';
import { getDb } from '../db-connection';
import { getCacheHealth } from './cache/redis';

export interface ApiHealthResponse {
  ok: true;
  env: string;
  build: {
    sha: string;
    builtAt: string | null;
  };
  db: { ok: boolean };
  cache: { ok: boolean; mode: 'redis' | 'memory' };
  s3: { ok: boolean };
}

export interface ApiVersionResponse {
  gitSha: string;
  buildTime: string | null;
  env: string;
}

const REQUIRED_S3_ENV_KEYS = [
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
] as const;

function hasEnvValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveBuildSha(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [
    env.RAILWAY_GIT_COMMIT_SHA,
    env.VERCEL_GIT_COMMIT_SHA,
    env.GITHUB_SHA,
    env.SOURCE_VERSION,
  ];
  const match = candidates.find(hasEnvValue);
  return match ?? 'unknown';
}

function resolveBuildTime(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [env.BUILD_TIME, env.VERCEL_GIT_COMMIT_MESSAGE];
  const match = candidates.find(hasEnvValue);
  return match ?? null;
}

export function isS3Configured(env: NodeJS.ProcessEnv = process.env): boolean {
  return REQUIRED_S3_ENV_KEYS.every(key => hasEnvValue(env[key]));
}

async function checkDbOk(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch (_error) {
    return false;
  }
}

async function checkCacheStatus(): Promise<{ ok: boolean; mode: 'redis' | 'memory' }> {
  try {
    const cacheHealth = await getCacheHealth();
    return {
      ok: cacheHealth.status !== 'unhealthy',
      mode: cacheHealth.metrics.fallback_mode ? 'memory' : 'redis',
    };
  } catch (_error) {
    return {
      ok: false,
      mode: 'memory',
    };
  }
}

export async function buildApiHealthResponse(): Promise<ApiHealthResponse> {
  const [dbOk, cacheStatus] = await Promise.all([checkDbOk(), checkCacheStatus()]);

  return {
    ok: true,
    env: process.env.NODE_ENV || 'development',
    build: {
      sha: resolveBuildSha(),
      builtAt: resolveBuildTime(),
    },
    db: { ok: dbOk },
    cache: cacheStatus,
    s3: { ok: isS3Configured() },
  };
}

export function registerHealthEndpoint(app: express.Express): void {
  app.get('/api/health', async (_req, res) => {
    const payload = await buildApiHealthResponse();
    res.setHeader('x-build-sha', payload.build.sha);
    res.json(payload);
  });
}

export function buildApiVersionResponse(): ApiVersionResponse {
  return {
    gitSha: resolveBuildSha(),
    buildTime: resolveBuildTime(),
    env: process.env.NODE_ENV || 'development',
  };
}

export function registerVersionEndpoint(app: express.Express): void {
  app.get('/api/version', (_req, res) => {
    res.json(buildApiVersionResponse());
  });
}

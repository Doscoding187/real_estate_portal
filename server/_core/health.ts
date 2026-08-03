import type express from 'express';
import {
  assessRuntimeDatabaseReadiness,
  type LayeredDatabaseReadiness,
} from './databaseAuthority/readiness';
import { getCacheHealth } from './cache/redis';

export interface ApiHealthResponse {
  ok: true;
  kind: 'liveness';
  env: string;
  build: {
    sha: string;
    builtAt: string | null;
  };
}

export interface ApiReadinessResponse {
  ok: boolean;
  kind: 'readiness';
  env: string;
  build: ApiHealthResponse['build'];
  db: LayeredDatabaseReadiness;
  cache: { ok: boolean; mode: 'redis' | 'memory' };
  s3: { ok: boolean; required: boolean };
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

async function checkCacheStatus(): Promise<{ ok: boolean; mode: 'redis' | 'memory' }> {
  try {
    const cacheHealth = await getCacheHealth();
    return {
      ok: cacheHealth.status !== 'unhealthy',
      mode: cacheHealth.metrics.fallback_mode ? 'memory' : 'redis',
    };
  } catch {
    return { ok: false, mode: 'memory' };
  }
}

export function buildApiHealthResponse(): ApiHealthResponse {
  return {
    ok: true,
    kind: 'liveness',
    env: process.env.NODE_ENV || 'development',
    build: {
      sha: resolveBuildSha(),
      builtAt: resolveBuildTime(),
    },
  };
}

export async function buildApiReadinessResponse(): Promise<ApiReadinessResponse> {
  const [db, cache] = await Promise.all([
    assessRuntimeDatabaseReadiness(),
    checkCacheStatus(),
  ]);
  const s3Required = process.env.NODE_ENV === 'production';
  const s3Ok = isS3Configured();
  return {
    ok: db.applicationReady && cache.ok && (!s3Required || s3Ok),
    kind: 'readiness',
    env: process.env.NODE_ENV || 'development',
    build: {
      sha: resolveBuildSha(),
      builtAt: resolveBuildTime(),
    },
    db,
    cache,
    s3: { ok: s3Ok, required: s3Required },
  };
}

export function registerHealthEndpoint(app: express.Express): void {
  app.get('/api/health', (_req, res) => {
    const payload = buildApiHealthResponse();
    res.setHeader('x-build-sha', payload.build.sha);
    res.status(200).json(payload);
  });

  app.get('/api/readiness', async (_req, res) => {
    const payload = await buildApiReadinessResponse();
    res.setHeader('x-build-sha', payload.build.sha);
    res.status(payload.ok ? 200 : 503).json(payload);
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

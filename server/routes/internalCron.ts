import { randomUUID } from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { redisCache } from '../lib/redis';
import { recomputeActorScores } from '../services/exploreActorScoringService';

const router = Router();

const ACTOR_SCORE_LOCK_KEY = 'internal:cron:recompute-actor-scores:lock';
const ACTOR_SCORE_LOCK_TTL_SECONDS = 10 * 60;

function getBearerToken(req: Request): string {
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const directSecret = req.header('x-internal-cron-secret') || req.header('internal_cron_secret');
  return typeof directSecret === 'string' ? directSecret.trim() : '';
}

router.post('/recompute-actor-scores', async (req: Request, res: Response) => {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET || '';
  const providedSecret = getBearerToken(req);

  if (!configuredSecret) {
    console.error('[InternalCron] INTERNAL_CRON_SECRET is missing; refusing execution');
    return res.status(503).json({
      success: false,
      error: 'Internal cron is not configured',
    });
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const runId = randomUUID();
  const startedAt = Date.now();
  const lockValue = `${runId}:${startedAt}`;

  const lockAcquired = await redisCache.acquireLock(
    ACTOR_SCORE_LOCK_KEY,
    ACTOR_SCORE_LOCK_TTL_SECONDS,
    lockValue,
  );

  if (!lockAcquired) {
    console.warn('[InternalCron] recompute-actor-scores skipped (lock already held)', {
      runId,
      lockKey: ACTOR_SCORE_LOCK_KEY,
    });
    return res.status(409).json({
      success: false,
      error: 'Job is already running',
    });
  }

  console.log('[InternalCron] recompute-actor-scores started', {
    runId,
    lockKey: ACTOR_SCORE_LOCK_KEY,
  });

  try {
    const result = await recomputeActorScores();
    const durationMs = Date.now() - startedAt;

    console.log('[InternalCron] recompute-actor-scores completed', {
      runId,
      actorsUpdated: result.updated,
      durationMs,
    });

    return res.json({
      success: true,
      actorsUpdated: result.updated,
      durationMs,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    console.error('[InternalCron] recompute-actor-scores failed', {
      runId,
      durationMs,
      message: error?.message || String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to recompute actor scores',
    });
  } finally {
    await redisCache.releaseLock(ACTOR_SCORE_LOCK_KEY, lockValue);
  }
});

export default router;
export { router };

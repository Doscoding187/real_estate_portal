import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getKpiFunnelSummary,
  getKpiSummary,
  runDailyKpiRollup,
  runKpiRollupRange,
} from '../services/kpiRollupService';

const router = Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const kpiCache = new Map<string, { expiresAt: number; payload: any }>();

function parseDate(input?: string): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function normalizeRange(from: string, to: string) {
  if (from <= to) return { from, to };
  return { from: to, to: from };
}

function getCached(cacheKey: string) {
  const hit = kpiCache.get(cacheKey);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    kpiCache.delete(cacheKey);
    return null;
  }
  return hit.payload;
}

function setCached(cacheKey: string, payload: any) {
  kpiCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });
}

function isAuthorizedRollupRequest(req: Request): boolean {
  const configuredToken = process.env.KPI_ROLLUP_TOKEN;
  if (!configuredToken) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedToken = String(req.headers['x-kpi-token'] || '');
  return providedToken.length > 0 && providedToken === configuredToken;
}

async function handleSummary(req: Request, res: Response) {
  try {
    const defaults = getDefaultRange();
    const range = normalizeRange(
      parseDate(typeof req.query.from === 'string' ? req.query.from : defaults.from),
      parseDate(typeof req.query.to === 'string' ? req.query.to : defaults.to),
    );
    const from = range.from;
    const to = range.to;
    const cacheKey = `summary:${from}:${to}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cache: { hit: true, ttlMs: CACHE_TTL_MS },
      });
    }

    const payload = await getKpiSummary(from, to);
    setCached(cacheKey, payload);
    return res.json({
      ...payload,
      cache: { hit: false, ttlMs: CACHE_TTL_MS },
    });
  } catch (error: any) {
    console.error('[KPI Router] Summary error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch KPI summary',
    });
  }
}

async function handleFunnel(req: Request, res: Response) {
  try {
    const defaults = getDefaultRange();
    const range = normalizeRange(
      parseDate(typeof req.query.from === 'string' ? req.query.from : defaults.from),
      parseDate(typeof req.query.to === 'string' ? req.query.to : defaults.to),
    );
    const from = range.from;
    const to = range.to;
    const cacheKey = `funnel:${from}:${to}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cache: { hit: true, ttlMs: CACHE_TTL_MS },
      });
    }

    const payload = await getKpiFunnelSummary(from, to);
    setCached(cacheKey, payload);
    return res.json({
      ...payload,
      cache: { hit: false, ttlMs: CACHE_TTL_MS },
    });
  } catch (error: any) {
    console.error('[KPI Router] Funnel error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch KPI funnel summary',
    });
  }
}

router.get('/health', (_req, res) => {
  return res.json({
    ok: true,
    router: 'kpi',
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

router.get('/summary', handleSummary);
router.get('/v1/summary', handleSummary);

router.get('/funnel', handleFunnel);
router.get('/v1/funnel', handleFunnel);

router.post('/rollup', async (req, res) => {
  try {
    if (!isAuthorizedRollupRequest(req)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to run KPI rollup',
      });
    }

    const date =
      typeof req.body?.date === 'string'
        ? req.body.date
        : typeof req.query.date === 'string'
          ? req.query.date
          : null;
    const from =
      typeof req.body?.from === 'string'
        ? req.body.from
        : typeof req.query.from === 'string'
          ? req.query.from
          : null;
    const to =
      typeof req.body?.to === 'string'
        ? req.body.to
        : typeof req.query.to === 'string'
          ? req.query.to
          : null;

    let result: any;
    if (from && to) {
      const range = normalizeRange(parseDate(from), parseDate(to));
      result = await runKpiRollupRange(range.from, range.to);
    } else {
      result = await runDailyKpiRollup(date ? parseDate(date) : undefined);
    }

    // Invalidate cache after rollup run.
    kpiCache.clear();

    return res.json({
      success: true,
      version: 'v1',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[KPI Router] Rollup error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to run KPI rollup',
    });
  }
});

export default router;
export { router };

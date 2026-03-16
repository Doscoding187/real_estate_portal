/**
 * server/routes/analytics.ts
 * ---------------------------------------------
 * Analytics Tracking Router
 * Boot-safe, production-ready Express router
 * ---------------------------------------------
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

const router = Router();
const MAX_MEMORY_EVENTS = 5000;
const memoryEvents: Record<string, any>[] = [];
let tableEnsured = false;

type AnalyticsPayload = {
  eventType: string;
  page?: string;
  deviceType?: string;
  userId?: string | number;
  sessionId?: string;
  timestamp?: string;
  eventId?: string;
  [key: string]: unknown;
};

function normalizeEventId(input: AnalyticsPayload): string {
  if (typeof input.eventId === 'string' && input.eventId.trim()) {
    return input.eventId.trim();
  }

  const stableInput = JSON.stringify({
    eventType: input.eventType,
    sessionId: input.sessionId ?? null,
    timestamp: input.timestamp ?? null,
    page: input.page ?? null,
    payload: input,
  });

  return createHash('sha256').update(stableInput).digest('hex');
}

function parseTimestamp(input?: string): Date {
  if (!input) return new Date();
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function ensureAnalyticsTable(db: any) {
  if (tableEnsured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      event_id VARCHAR(64) NOT NULL UNIQUE,
      event_type VARCHAR(128) NOT NULL,
      page VARCHAR(512) NULL,
      device_type VARCHAR(64) NULL,
      user_id VARCHAR(64) NULL,
      session_id VARCHAR(128) NULL,
      event_timestamp DATETIME(3) NOT NULL,
      received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      payload_json JSON NOT NULL,
      source VARCHAR(32) NOT NULL DEFAULT 'web',
      INDEX idx_analytics_event_type (event_type),
      INDEX idx_analytics_event_timestamp (event_timestamp),
      INDEX idx_analytics_page (page),
      INDEX idx_analytics_user (user_id),
      INDEX idx_analytics_session (session_id)
    )
  `);

  tableEnsured = true;
}

async function persistEventToMemory(event: AnalyticsPayload, eventId: string) {
  memoryEvents.push({
    id: memoryEvents.length + 1,
    eventId,
    eventType: event.eventType,
    page: event.page ?? null,
    deviceType: event.deviceType ?? null,
    userId: event.userId ?? null,
    sessionId: event.sessionId ?? null,
    eventTimestamp: parseTimestamp(event.timestamp).toISOString(),
    receivedAt: new Date().toISOString(),
    payload: event,
    source: 'web',
  });

  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.splice(0, memoryEvents.length - MAX_MEMORY_EVENTS);
  }
}

async function persistEventLegacy(db: any, event: AnalyticsPayload, eventId: string, req: Request) {
  // Best-effort dedupe for legacy schema by eventId inside event_data payload.
  const dedupeResult = (await db.execute(sql`
    SELECT id
    FROM analytics_events
    WHERE event_type = ${event.eventType.trim()}
      AND session_id = ${typeof event.sessionId === 'string' && event.sessionId ? event.sessionId : 'unknown'}
      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.eventId')) = ${eventId}
    LIMIT 1
  `)) as any;
  const dedupeRows = dedupeResult?.rows ?? dedupeResult?.[0] ?? [];
  if (Array.isArray(dedupeRows) && dedupeRows.length > 0) {
    return;
  }

  const payload = {
    ...event,
    eventId,
  };

  await db.execute(sql`
    INSERT INTO analytics_events (
      user_id,
      session_id,
      event_type,
      event_data,
      url,
      referrer,
      user_agent,
      ip_address,
      created_at
    )
    VALUES (
      ${
        event.userId !== undefined && event.userId !== null && Number.isFinite(Number(event.userId))
          ? Number(event.userId)
          : null
      },
      ${typeof event.sessionId === 'string' && event.sessionId ? event.sessionId : 'unknown'},
      ${event.eventType.trim()},
      ${JSON.stringify(payload)},
      ${typeof req.originalUrl === 'string' ? req.originalUrl : null},
      ${
        typeof req.headers.referer === 'string'
          ? req.headers.referer
          : typeof req.headers.referrer === 'string'
            ? req.headers.referrer
            : null
      },
      ${typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null},
      ${typeof req.ip === 'string' ? req.ip : null},
      ${parseTimestamp(event.timestamp)}
    )
  `);
}

/**
 * GET /health
 * Health check for router loader + deployment verification
 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    router: 'analytics',
    status: 'healthy',
    storage: tableEnsured ? 'database' : 'boot-safe',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /track
 * Track analytics events from the frontend
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const event = req.body as AnalyticsPayload;

    // Basic validation (boot-safe, non-blocking)
    if (!event || typeof event.eventType !== 'string' || !event.eventType.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analytics payload',
      });
    }

    const eventId = normalizeEventId(event);
    const eventTimestamp = parseTimestamp(event.timestamp);

    let storedIn: 'database' | 'memory' = 'memory';

    try {
      const db = await getDb();

      if (db && typeof db.execute === 'function') {
        try {
          await ensureAnalyticsTable(db);
          await db.execute(sql`
            INSERT INTO analytics_events (
              event_id,
              event_type,
              page,
              device_type,
              user_id,
              session_id,
              event_timestamp,
              payload_json,
              source
            )
            VALUES (
              ${eventId},
              ${event.eventType.trim()},
              ${typeof event.page === 'string' ? event.page : null},
              ${typeof event.deviceType === 'string' ? event.deviceType : null},
              ${event.userId !== undefined && event.userId !== null ? String(event.userId) : null},
              ${typeof event.sessionId === 'string' ? event.sessionId : null},
              ${eventTimestamp},
              ${JSON.stringify(event)},
              ${'web'}
            )
            ON DUPLICATE KEY UPDATE
              received_at = CURRENT_TIMESTAMP(3)
          `);
        } catch {
          await persistEventLegacy(db, event, eventId, req);
        }

        storedIn = 'database';
      } else {
        await persistEventToMemory(event, eventId);
      }
    } catch (persistError) {
      console.warn('[Analytics] DB persist failed, using memory fallback:', persistError);
      await persistEventToMemory(event, eventId);
    }

    // Structured logging (prod-safe)
    console.log('[Analytics Event]', {
      id: eventId,
      type: event.eventType,
      page: event.page ?? null,
      deviceType: event.deviceType ?? null,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      timestamp: eventTimestamp.toISOString(),
      meta: event.meta ?? {},
      storedIn,
    });

    res.status(200).json({ success: true, eventId, storedIn });
  } catch (error) {
    console.error('[Analytics] Track Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics event',
    });
  }
});

/**
 * GET /events
 * Query latest analytics events for diagnostics and KPI pipeline verification.
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;

    const db = await getDb();
    if (db && typeof db.execute === 'function') {
      let rows: any[] = [];
      try {
        await ensureAnalyticsTable(db);
        const rowsResult = (await db.execute(sql`
          SELECT
            id,
            event_id AS eventId,
            event_type AS eventType,
            page,
            device_type AS deviceType,
            user_id AS userId,
            session_id AS sessionId,
            event_timestamp AS eventTimestamp,
            received_at AS receivedAt,
            payload_json AS payload,
            source
          FROM analytics_events
          ORDER BY id DESC
          LIMIT ${limit}
        `)) as any;
        rows = rowsResult?.rows ?? rowsResult?.[0] ?? [];
      } catch {
        const legacyResult = (await db.execute(sql`
          SELECT
            id,
            JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.eventId')) AS eventId,
            event_type AS eventType,
            url AS page,
            NULL AS deviceType,
            user_id AS userId,
            session_id AS sessionId,
            created_at AS eventTimestamp,
            created_at AS receivedAt,
            event_data AS payload,
            'legacy' AS source
          FROM analytics_events
          ORDER BY id DESC
          LIMIT ${limit}
        `)) as any;
        rows = legacyResult?.rows ?? legacyResult?.[0] ?? [];
      }

      return res.json({
        success: true,
        count: Array.isArray(rows) ? rows.length : 0,
        storage: 'database',
        data: rows,
      });
    }

    const fallback = memoryEvents.slice(-limit).reverse();
    return res.json({
      success: true,
      count: fallback.length,
      storage: 'memory',
      data: fallback,
    });
  } catch (error) {
    console.error('[Analytics] Events Query Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query analytics events',
    });
  }
});

export default router;
export { router };

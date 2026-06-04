import { and, desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import { developmentOperatingEvents, developments } from '../../drizzle/schema';
import {
  DEVELOPMENT_OPERATING_SOURCE_SURFACES,
  type DEVELOPMENT_OPERATING_TRANSACTION_TYPES,
} from '../../drizzle/schema/developmentOperations';
import { getDb } from '../db-connection';

type DevelopmentOperatingSourceSurface =
  (typeof DEVELOPMENT_OPERATING_SOURCE_SURFACES)[number];
type DevelopmentOperatingTransactionType =
  (typeof DEVELOPMENT_OPERATING_TRANSACTION_TYPES)[number];

const DEFAULT_EVENT_LIMIT = 20;
const MAX_EVENT_LIMIT = 50;

function readInsertId(insertResult: unknown): number | null {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    const id = Number((candidate as { insertId: unknown }).insertId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

function normalizeEventLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_EVENT_LIMIT;
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), MAX_EVENT_LIMIT);
}

export function normalizeOperatingSourceSurface(
  value: unknown,
): DevelopmentOperatingSourceSurface {
  const normalized = String(value || '').trim();
  return DEVELOPMENT_OPERATING_SOURCE_SURFACES.includes(
    normalized as DevelopmentOperatingSourceSurface,
  )
    ? (normalized as DevelopmentOperatingSourceSurface)
    : 'developer_dashboard';
}

export function parseDevelopmentOperatingEventJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getDevelopmentOperatingEventNote(event: {
  metadata?: unknown;
  afterData?: unknown;
}): string {
  const metadata = parseDevelopmentOperatingEventJson(event.metadata);
  const afterData = parseDevelopmentOperatingEventJson(event.afterData);
  const note = metadata.note ?? afterData.note;
  return typeof note === 'string' ? note.trim() : '';
}

async function requireOwnedDevelopment(input: { developerId: number; developmentId: number }) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
  }

  const [development] = await db
    .select({
      id: developments.id,
      developerId: developments.developerId,
      name: developments.name,
      transactionType: developments.transactionType,
    })
    .from(developments)
    .where(eq(developments.id, input.developmentId))
    .limit(1);

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  if (Number(development.developerId) !== Number(input.developerId)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Development is not owned by developer.' });
  }

  return {
    db,
    development: {
      ...development,
      transactionType: development.transactionType as DevelopmentOperatingTransactionType,
    },
  };
}

export async function listDevelopmentOperatingEvents(input: {
  developerId: number;
  developmentId: number;
  limit?: number;
}) {
  const { db } = await requireOwnedDevelopment(input);
  const limit = normalizeEventLimit(input.limit);

  const items = await db
    .select()
    .from(developmentOperatingEvents)
    .where(eq(developmentOperatingEvents.developmentId, input.developmentId))
    .orderBy(desc(developmentOperatingEvents.eventAt), desc(developmentOperatingEvents.id))
    .limit(limit);

  return { items };
}

export async function createDevelopmentOperatingNote(input: {
  developerId: number;
  developmentId: number;
  actorUserId: number;
  note: string;
  sourceSurface?: unknown;
}) {
  const note = String(input.note || '').trim();
  if (note.length < 3) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Operating note must be at least 3 characters.',
    });
  }

  const { db, development } = await requireOwnedDevelopment(input);
  const sourceSurface = normalizeOperatingSourceSurface(input.sourceSurface);
  const payload = {
    note,
    developmentName: development.name,
  };

  const insertResult = await db.insert(developmentOperatingEvents).values({
    developmentId: input.developmentId,
    transactionType: development.transactionType,
    eventType: 'operating_note_added',
    afterData: payload,
    metadata: payload,
    actorUserId: input.actorUserId,
    sourceSurface,
  });

  const insertedId = readInsertId(insertResult);
  if (!insertedId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Operating note could not be saved.',
    });
  }

  const [event] = await db
    .select()
    .from(developmentOperatingEvents)
    .where(
      and(
        eq(developmentOperatingEvents.id, insertedId),
        eq(developmentOperatingEvents.developmentId, input.developmentId),
      ),
    )
    .limit(1);

  if (!event) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Operating note was saved but could not be read back.',
    });
  }

  return event;
}

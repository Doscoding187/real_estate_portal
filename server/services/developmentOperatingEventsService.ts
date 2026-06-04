import { and, desc, eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import { developmentOperatingEvents, developments, unitTypes } from '../../drizzle/schema';
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

export const SALE_UNIT_RESERVATION_TRANSITIONS = ['reserve', 'release'] as const;
export type SaleUnitReservationTransition = (typeof SALE_UNIT_RESERVATION_TRANSITIONS)[number];

function readInsertId(insertResult: unknown): number | null {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    const id = Number((candidate as { insertId: unknown }).insertId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

function readAffectedRows(result: unknown): number {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (candidate && typeof candidate === 'object' && 'affectedRows' in candidate) {
    const affectedRows = Number((candidate as { affectedRows: unknown }).affectedRows);
    return Number.isFinite(affectedRows) ? affectedRows : 0;
  }
  return 0;
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

export function getSaleUnitReservationTransitionStatuses(
  transition: SaleUnitReservationTransition,
) {
  if (transition === 'reserve') {
    return {
      fromStatus: 'available',
      toStatus: 'reserved',
      quantityDelta: -1,
    };
  }

  return {
    fromStatus: 'reserved',
    toStatus: 'available',
    quantityDelta: 1,
  };
}

function toNonNegativeInt(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
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
      availableUnits: developments.availableUnits,
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

export async function listSaleOperatingInventory(input: {
  developerId: number;
  developmentId: number;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'for_sale') {
    return { items: [], aggregateAvailableUnits: null };
  }

  const items = await db
    .select({
      id: unitTypes.id,
      developmentId: unitTypes.developmentId,
      name: unitTypes.name,
      totalUnits: unitTypes.totalUnits,
      availableUnits: unitTypes.availableUnits,
      reservedUnits: unitTypes.reservedUnits,
      priceFrom: unitTypes.priceFrom,
      priceTo: unitTypes.priceTo,
      basePriceFrom: unitTypes.basePriceFrom,
      basePriceTo: unitTypes.basePriceTo,
      displayOrder: unitTypes.displayOrder,
    })
    .from(unitTypes)
    .where(and(eq(unitTypes.developmentId, input.developmentId), eq(unitTypes.isActive, 1)))
    .orderBy(unitTypes.displayOrder);

  const aggregateAvailableUnits = items.reduce(
    (sum, item) => sum + toNonNegativeInt(item.availableUnits),
    0,
  );

  return {
    items: items.map(item => ({
      ...item,
      totalUnits: toNonNegativeInt(item.totalUnits),
      availableUnits: toNonNegativeInt(item.availableUnits),
      reservedUnits: toNonNegativeInt(item.reservedUnits),
      priceFrom: item.priceFrom != null ? Number(item.priceFrom) : null,
      priceTo: item.priceTo != null ? Number(item.priceTo) : null,
      basePriceFrom: item.basePriceFrom != null ? Number(item.basePriceFrom) : null,
      basePriceTo: item.basePriceTo != null ? Number(item.basePriceTo) : null,
    })),
    aggregateAvailableUnits,
  };
}

export async function transitionSaleUnitReservation(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  transition: SaleUnitReservationTransition;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'for_sale') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Sale reservation transitions are only available for Sale developments.',
    });
  }

  const { fromStatus, toStatus, quantityDelta } = getSaleUnitReservationTransitionStatuses(
    input.transition,
  );
  const note = input.note ? String(input.note).trim() : '';
  const sourceSurface = normalizeOperatingSourceSurface(input.sourceSurface);

  return await db.transaction(async (tx: any) => {
    const [beforeUnit] = await tx
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        developmentId: unitTypes.developmentId,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
      })
      .from(unitTypes)
      .where(
        and(
          eq(unitTypes.id, input.unitTypeId),
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.isActive, 1),
        ),
      )
      .limit(1);

    if (!beforeUnit) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unit type not found.' });
    }

    const beforeSnapshot = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      reservedUnits: toNonNegativeInt(beforeUnit.reservedUnits),
    };

    if (input.transition === 'reserve' && beforeSnapshot.availableUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No available units can be reserved for this unit type.',
      });
    }

    if (input.transition === 'release' && beforeSnapshot.reservedUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No reserved units can be released for this unit type.',
      });
    }

    const updateResult =
      input.transition === 'reserve'
        ? await tx
            .update(unitTypes)
            .set({
              availableUnits: sql`${unitTypes.availableUnits} - 1`,
              reservedUnits: sql`COALESCE(${unitTypes.reservedUnits}, 0) + 1`,
            })
            .where(
              and(
                eq(unitTypes.id, input.unitTypeId),
                eq(unitTypes.developmentId, input.developmentId),
                sql`${unitTypes.availableUnits} > 0`,
              ),
            )
        : await tx
            .update(unitTypes)
            .set({
              availableUnits: sql`${unitTypes.availableUnits} + 1`,
              reservedUnits: sql`COALESCE(${unitTypes.reservedUnits}, 0) - 1`,
            })
            .where(
              and(
                eq(unitTypes.id, input.unitTypeId),
                eq(unitTypes.developmentId, input.developmentId),
                sql`COALESCE(${unitTypes.reservedUnits}, 0) > 0`,
              ),
            );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Sale inventory changed before this transition could be saved.',
      });
    }

    const [afterUnit] = await tx
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        developmentId: unitTypes.developmentId,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
      })
      .from(unitTypes)
      .where(and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Sale inventory updated but could not be read back.',
      });
    }

    const afterSnapshot = {
      unitTypeId: afterUnit.id,
      unitTypeName: afterUnit.name,
      totalUnits: toNonNegativeInt(afterUnit.totalUnits),
      availableUnits: toNonNegativeInt(afterUnit.availableUnits),
      reservedUnits: toNonNegativeInt(afterUnit.reservedUnits),
    };

    const activeUnits = await tx
      .select({ availableUnits: unitTypes.availableUnits })
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, input.developmentId), eq(unitTypes.isActive, 1)));
    const aggregateAvailableUnits = activeUnits.reduce(
      (sum: number, row: { availableUnits: unknown }) => sum + toNonNegativeInt(row.availableUnits),
      0,
    );

    await tx
      .update(developments)
      .set({ availableUnits: aggregateAvailableUnits })
      .where(eq(developments.id, input.developmentId));

    const metadata = {
      transition: input.transition,
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: 'for_sale',
      eventType: 'inventory_status_changed',
      fromStatus,
      toStatus,
      quantityDelta,
      beforeData: {
        ...beforeSnapshot,
        developmentAvailableUnits: toNonNegativeInt(development.availableUnits),
      },
      afterData: {
        ...afterSnapshot,
        developmentAvailableUnits: aggregateAvailableUnits,
      },
      metadata,
      actorUserId: input.actorUserId,
      sourceSurface,
    });

    const insertedId = readInsertId(insertResult);
    if (!insertedId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Sale inventory event could not be saved.',
      });
    }

    const [event] = await tx
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
        message: 'Sale inventory event was saved but could not be read back.',
      });
    }

    return {
      unit: afterSnapshot,
      aggregateAvailableUnits,
      event,
    };
  });
}

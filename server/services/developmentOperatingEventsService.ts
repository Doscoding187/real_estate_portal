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
export const RENTAL_UNIT_HOLD_TRANSITIONS = ['hold', 'release'] as const;
export type RentalUnitHoldTransition = (typeof RENTAL_UNIT_HOLD_TRANSITIONS)[number];
export const AUCTION_REGISTRATION_TRANSITIONS = [
  'open_registration',
  'close_registration',
] as const;
export type AuctionRegistrationTransition = (typeof AUCTION_REGISTRATION_TRANSITIONS)[number];
type AuctionLifecycleStatus =
  | 'scheduled'
  | 'registration_open'
  | 'active'
  | 'sold'
  | 'passed_in'
  | 'withdrawn';

type InventoryTransitionEngineConfig = {
  transactionType: Extract<DevelopmentOperatingTransactionType, 'for_sale' | 'for_rent'>;
  engineLabel: 'Sale' | 'Rental';
  occupyTransition: 'reserve' | 'hold';
  occupiedStatus: 'reserved' | 'held';
  occupiedSnapshotKey: 'reservedUnits' | 'heldUnits';
  nonMatchingTransactionMessage: string;
  noAvailableMessage: string;
  noOccupiedMessage: string;
};

const SALE_INVENTORY_TRANSITION_CONFIG: InventoryTransitionEngineConfig = {
  transactionType: 'for_sale',
  engineLabel: 'Sale',
  occupyTransition: 'reserve',
  occupiedStatus: 'reserved',
  occupiedSnapshotKey: 'reservedUnits',
  nonMatchingTransactionMessage:
    'Sale reservation transitions are only available for Sale developments.',
  noAvailableMessage: 'No available units can be reserved for this unit type.',
  noOccupiedMessage: 'No reserved units can be released for this unit type.',
};

const RENTAL_INVENTORY_TRANSITION_CONFIG: InventoryTransitionEngineConfig = {
  transactionType: 'for_rent',
  engineLabel: 'Rental',
  occupyTransition: 'hold',
  occupiedStatus: 'held',
  occupiedSnapshotKey: 'heldUnits',
  nonMatchingTransactionMessage:
    'Rental hold transitions are only available for Rental developments.',
  noAvailableMessage: 'No available rental units can be held for this unit type.',
  noOccupiedMessage: 'No held rental units can be released for this unit type.',
};

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

export function getRentalUnitHoldTransitionStatuses(transition: RentalUnitHoldTransition) {
  if (transition === 'hold') {
    return {
      fromStatus: 'available',
      toStatus: 'held',
      quantityDelta: -1,
    };
  }

  return {
    fromStatus: 'held',
    toStatus: 'available',
    quantityDelta: 1,
  };
}

export function getAuctionRegistrationTransitionStatuses(
  transition: AuctionRegistrationTransition,
): { fromStatus: AuctionLifecycleStatus; toStatus: AuctionLifecycleStatus } {
  if (transition === 'open_registration') {
    return {
      fromStatus: 'scheduled',
      toStatus: 'registration_open',
    };
  }

  return {
    fromStatus: 'registration_open',
    toStatus: 'scheduled',
  };
}

function toNonNegativeInt(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function toPositiveNumberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function toDateMsOrNull(value: unknown): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function getAuctionRegistrationReadinessIssue(
  unit: {
    startingBid?: unknown;
    reservePrice?: unknown;
    auctionStartDate?: unknown;
    auctionEndDate?: unknown;
  },
  nowMs = Date.now(),
): string | null {
  const startingBid = toPositiveNumberOrNull(unit.startingBid);
  const reservePrice = toPositiveNumberOrNull(unit.reservePrice);
  const startMs = toDateMsOrNull(unit.auctionStartDate);
  const endMs = toDateMsOrNull(unit.auctionEndDate);

  if (startingBid === null) return 'Starting bid is required before registration can open.';
  if (reservePrice !== null && reservePrice < startingBid) {
    return 'Reserve price cannot be below the starting bid.';
  }
  if (startMs === null) return 'Auction start date is required before registration can open.';
  if (endMs === null) return 'Auction end date is required before registration can open.';
  if (endMs <= startMs) return 'Auction end date must be after the start date.';
  if (startMs <= nowMs) return 'Registration can only open before the auction starts.';
  return null;
}

export function getAuctionActivationReadinessIssue(
  unit: {
    auctionStartDate?: unknown;
    auctionEndDate?: unknown;
  },
  nowMs = Date.now(),
): string | null {
  const startMs = toDateMsOrNull(unit.auctionStartDate);
  const endMs = toDateMsOrNull(unit.auctionEndDate);

  if (startMs === null) return 'Auction start date is required before activation.';
  if (endMs === null) return 'Auction end date is required before activation.';
  if (endMs <= startMs) return 'Auction end date must be after the start date.';
  if (nowMs < startMs) return 'Auction activation can only start at or after the auction start time.';
  if (nowMs >= endMs) return 'Auction activation cannot start after the auction window has ended.';
  return null;
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

export async function listRentalOperatingInventory(input: {
  developerId: number;
  developmentId: number;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'for_rent') {
    return { items: [], aggregateAvailableUnits: null };
  }

  const items = await db
    .select({
      id: unitTypes.id,
      developmentId: unitTypes.developmentId,
      name: unitTypes.name,
      totalUnits: unitTypes.totalUnits,
      availableUnits: unitTypes.availableUnits,
      heldUnitsProjection: unitTypes.reservedUnits,
      monthlyRentFrom: unitTypes.monthlyRentFrom,
      monthlyRentTo: unitTypes.monthlyRentTo,
      depositRequired: unitTypes.depositRequired,
      leaseTerm: unitTypes.leaseTerm,
      isFurnished: unitTypes.isFurnished,
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
      id: item.id,
      developmentId: item.developmentId,
      name: item.name,
      totalUnits: toNonNegativeInt(item.totalUnits),
      availableUnits: toNonNegativeInt(item.availableUnits),
      heldUnits: toNonNegativeInt(item.heldUnitsProjection),
      monthlyRentFrom: item.monthlyRentFrom != null ? Number(item.monthlyRentFrom) : null,
      monthlyRentTo: item.monthlyRentTo != null ? Number(item.monthlyRentTo) : null,
      depositRequired: item.depositRequired != null ? Number(item.depositRequired) : null,
      leaseTerm: item.leaseTerm,
      isFurnished: item.isFurnished === 1,
      displayOrder: item.displayOrder,
    })),
    aggregateAvailableUnits,
  };
}

export async function listAuctionOperatingInventory(input: {
  developerId: number;
  developmentId: number;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'auction') {
    return { items: [], statusCounts: {} };
  }

  const items = await db
    .select({
      id: unitTypes.id,
      developmentId: unitTypes.developmentId,
      name: unitTypes.name,
      totalUnits: unitTypes.totalUnits,
      availableUnits: unitTypes.availableUnits,
      startingBid: unitTypes.startingBid,
      reservePrice: unitTypes.reservePrice,
      auctionStartDate: unitTypes.auctionStartDate,
      auctionEndDate: unitTypes.auctionEndDate,
      auctionStatus: unitTypes.auctionStatus,
      displayOrder: unitTypes.displayOrder,
    })
    .from(unitTypes)
    .where(and(eq(unitTypes.developmentId, input.developmentId), eq(unitTypes.isActive, 1)))
    .orderBy(unitTypes.displayOrder);

  const normalizedItems = items.map(item => ({
    ...item,
    totalUnits: toNonNegativeInt(item.totalUnits),
    availableUnits: toNonNegativeInt(item.availableUnits),
    startingBid: item.startingBid != null ? Number(item.startingBid) : null,
    reservePrice: item.reservePrice != null ? Number(item.reservePrice) : null,
    auctionStatus: item.auctionStatus || 'scheduled',
  }));
  const statusCounts = normalizedItems.reduce(
    (counts: Record<string, number>, item: { auctionStatus: string }) => {
      counts[item.auctionStatus] = (counts[item.auctionStatus] || 0) + 1;
      return counts;
    },
    {},
  );

  return { items: normalizedItems, statusCounts };
}

export async function transitionAuctionRegistration(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  transition: AuctionRegistrationTransition;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'auction') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Auction registration transitions are only available for Auction developments.',
    });
  }

  const { fromStatus, toStatus } = getAuctionRegistrationTransitionStatuses(input.transition);
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
        startingBid: unitTypes.startingBid,
        reservePrice: unitTypes.reservePrice,
        auctionStartDate: unitTypes.auctionStartDate,
        auctionEndDate: unitTypes.auctionEndDate,
        auctionStatus: unitTypes.auctionStatus,
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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Auction lot not found.' });
    }

    const currentStatus = beforeUnit.auctionStatus || 'scheduled';
    if (currentStatus !== fromStatus) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Auction registration can only move from ${fromStatus.replace(/_/g, ' ')} to ${toStatus.replace(/_/g, ' ')}.`,
      });
    }

    if (input.transition === 'open_registration') {
      const readinessIssue = getAuctionRegistrationReadinessIssue(beforeUnit);
      if (readinessIssue) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: readinessIssue });
      }
    }

    const beforeSnapshot = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      auctionStatus: currentStatus,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      startingBid: toPositiveNumberOrNull(beforeUnit.startingBid),
      reservePrice: toPositiveNumberOrNull(beforeUnit.reservePrice),
      auctionStartDate: beforeUnit.auctionStartDate,
      auctionEndDate: beforeUnit.auctionEndDate,
    };

    const updateResult = await tx
      .update(unitTypes)
      .set({ auctionStatus: toStatus })
      .where(
        and(
          eq(unitTypes.id, input.unitTypeId),
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.isActive, 1),
          eq(unitTypes.auctionStatus, fromStatus),
        ),
      );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Auction lifecycle changed before this transition could be saved.',
      });
    }

    const [afterUnit] = await tx
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        developmentId: unitTypes.developmentId,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        startingBid: unitTypes.startingBid,
        reservePrice: unitTypes.reservePrice,
        auctionStartDate: unitTypes.auctionStartDate,
        auctionEndDate: unitTypes.auctionEndDate,
        auctionStatus: unitTypes.auctionStatus,
      })
      .from(unitTypes)
      .where(and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auction lifecycle updated but could not be read back.',
      });
    }

    const afterSnapshot = {
      ...beforeSnapshot,
      auctionStatus: afterUnit.auctionStatus || toStatus,
    };
    const metadata = {
      transition: input.transition,
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: 'auction',
      eventType: 'registration_status_changed',
      fromStatus,
      toStatus,
      beforeData: beforeSnapshot,
      afterData: afterSnapshot,
      metadata,
      actorUserId: input.actorUserId,
      sourceSurface,
    });

    const insertedId = readInsertId(insertResult);
    if (!insertedId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auction registration event could not be saved.',
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
        message: 'Auction registration event was saved but could not be read back.',
      });
    }

    return {
      unit: afterSnapshot,
      event,
    };
  });
}

export async function activateAuctionLot(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'auction') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Auction activation is only available for Auction developments.',
    });
  }

  const fromStatus: AuctionLifecycleStatus = 'registration_open';
  const toStatus: AuctionLifecycleStatus = 'active';
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
        startingBid: unitTypes.startingBid,
        reservePrice: unitTypes.reservePrice,
        auctionStartDate: unitTypes.auctionStartDate,
        auctionEndDate: unitTypes.auctionEndDate,
        auctionStatus: unitTypes.auctionStatus,
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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Auction lot not found.' });
    }

    const currentStatus = beforeUnit.auctionStatus || 'scheduled';
    if (currentStatus !== fromStatus) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Auction activation requires registration to be open first.',
      });
    }

    const readinessIssue = getAuctionActivationReadinessIssue(beforeUnit);
    if (readinessIssue) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: readinessIssue });
    }

    const beforeSnapshot = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      auctionStatus: currentStatus,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      reservedUnits: toNonNegativeInt(beforeUnit.reservedUnits),
      startingBid: toPositiveNumberOrNull(beforeUnit.startingBid),
      reservePrice: toPositiveNumberOrNull(beforeUnit.reservePrice),
      auctionStartDate: beforeUnit.auctionStartDate,
      auctionEndDate: beforeUnit.auctionEndDate,
    };

    const updateResult = await tx
      .update(unitTypes)
      .set({ auctionStatus: toStatus })
      .where(
        and(
          eq(unitTypes.id, input.unitTypeId),
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.isActive, 1),
          eq(unitTypes.auctionStatus, fromStatus),
        ),
      );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Auction lifecycle changed before activation could be saved.',
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
        startingBid: unitTypes.startingBid,
        reservePrice: unitTypes.reservePrice,
        auctionStartDate: unitTypes.auctionStartDate,
        auctionEndDate: unitTypes.auctionEndDate,
        auctionStatus: unitTypes.auctionStatus,
      })
      .from(unitTypes)
      .where(and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auction lot activated but could not be read back.',
      });
    }

    const afterSnapshot = {
      ...beforeSnapshot,
      auctionStatus: afterUnit.auctionStatus || toStatus,
    };
    const metadata = {
      transition: 'activate',
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: 'auction',
      eventType: 'inventory_status_changed',
      fromStatus,
      toStatus,
      beforeData: beforeSnapshot,
      afterData: afterSnapshot,
      metadata,
      actorUserId: input.actorUserId,
      sourceSurface,
    });

    const insertedId = readInsertId(insertResult);
    if (!insertedId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auction activation event could not be saved.',
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
        message: 'Auction activation event was saved but could not be read back.',
      });
    }

    return {
      unit: afterSnapshot,
      event,
    };
  });
}

async function transitionUnitAvailability(
  input: {
    developerId: number;
    developmentId: number;
    unitTypeId: string;
    actorUserId: number;
    transition: 'reserve' | 'hold' | 'release';
    note?: string;
    sourceSurface?: unknown;
  },
  config: InventoryTransitionEngineConfig,
) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== config.transactionType) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: config.nonMatchingTransactionMessage,
    });
  }

  if (input.transition !== config.occupyTransition && input.transition !== 'release') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unsupported ${config.engineLabel} inventory transition.`,
    });
  }

  const isOccupyTransition = input.transition === config.occupyTransition;
  const fromStatus = isOccupyTransition ? 'available' : config.occupiedStatus;
  const toStatus = isOccupyTransition ? config.occupiedStatus : 'available';
  const quantityDelta = isOccupyTransition ? -1 : 1;
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

    const beforeSnapshot: Record<string, unknown> = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      [config.occupiedSnapshotKey]: toNonNegativeInt(beforeUnit.reservedUnits),
    };

    if (isOccupyTransition && Number(beforeSnapshot.availableUnits) <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: config.noAvailableMessage,
      });
    }

    if (!isOccupyTransition && Number(beforeSnapshot[config.occupiedSnapshotKey]) <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: config.noOccupiedMessage,
      });
    }

    const updateResult =
      isOccupyTransition
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
                eq(unitTypes.isActive, 1),
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
                eq(unitTypes.isActive, 1),
                sql`COALESCE(${unitTypes.reservedUnits}, 0) > 0`,
              ),
            );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `${config.engineLabel} inventory changed before this transition could be saved.`,
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
        message: `${config.engineLabel} inventory updated but could not be read back.`,
      });
    }

    const afterSnapshot: Record<string, unknown> = {
      unitTypeId: afterUnit.id,
      unitTypeName: afterUnit.name,
      totalUnits: toNonNegativeInt(afterUnit.totalUnits),
      availableUnits: toNonNegativeInt(afterUnit.availableUnits),
      [config.occupiedSnapshotKey]: toNonNegativeInt(afterUnit.reservedUnits),
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
      inventoryProjectionColumn: 'unit_types.reserved_units',
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: config.transactionType,
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
        message: `${config.engineLabel} inventory event could not be saved.`,
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
        message: `${config.engineLabel} inventory event was saved but could not be read back.`,
      });
    }

    return {
      unit: afterSnapshot,
      aggregateAvailableUnits,
      event,
    };
  });
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
  return await transitionUnitAvailability(input, SALE_INVENTORY_TRANSITION_CONFIG);
}

export async function transitionRentalUnitHold(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  transition: RentalUnitHoldTransition;
  note?: string;
  sourceSurface?: unknown;
}) {
  return await transitionUnitAvailability(input, RENTAL_INVENTORY_TRANSITION_CONFIG);
}

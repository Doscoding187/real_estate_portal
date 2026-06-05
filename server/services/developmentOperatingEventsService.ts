import { and, desc, eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import {
  developmentOperatingEvents,
  developments,
  distributionDealEvents,
  distributionDeals,
  leads,
  unitTypes,
} from '../../drizzle/schema';
import { DISTRIBUTION_DEAL_STAGE_VALUES } from '../../drizzle/schema/distribution';
import {
  DEVELOPMENT_OPERATING_SOURCE_SURFACES,
  type DEVELOPMENT_OPERATING_TRANSACTION_TYPES,
} from '../../drizzle/schema/developmentOperations';
import {
  canonicalStageToUpdate,
  deriveCanonicalLeadStage,
  formatLeadTimestamp,
} from './developerFunnelService';
import { getDb } from '../db-connection';
import {
  isLeadTransitionAllowed,
  type LeadStage,
} from '../../shared/developerFunnel';

type DevelopmentOperatingSourceSurface =
  (typeof DEVELOPMENT_OPERATING_SOURCE_SURFACES)[number];
type DevelopmentOperatingTransactionType =
  (typeof DEVELOPMENT_OPERATING_TRANSACTION_TYPES)[number];

const DEFAULT_EVENT_LIMIT = 20;
const MAX_EVENT_LIMIT = 50;

export const SALE_UNIT_RESERVATION_TRANSITIONS = ['reserve', 'release'] as const;
export type SaleUnitReservationTransition = (typeof SALE_UNIT_RESERVATION_TRANSITIONS)[number];
export const SALE_UNIT_OUTCOME_TRANSITIONS = ['mark_sold'] as const;
export type SaleUnitOutcomeTransition = (typeof SALE_UNIT_OUTCOME_TRANSITIONS)[number];
type SaleUnitOutcomeSource = 'reserved' | 'available_direct';
export const RENTAL_UNIT_HOLD_TRANSITIONS = ['hold', 'release'] as const;
export type RentalUnitHoldTransition = (typeof RENTAL_UNIT_HOLD_TRANSITIONS)[number];
export const RENTAL_UNIT_OUTCOME_TRANSITIONS = ['mark_let'] as const;
export type RentalUnitOutcomeTransition = (typeof RENTAL_UNIT_OUTCOME_TRANSITIONS)[number];
type RentalUnitOutcomeSource = 'held' | 'available_direct';
export const AUCTION_REGISTRATION_TRANSITIONS = [
  'open_registration',
  'close_registration',
] as const;
export type AuctionRegistrationTransition = (typeof AUCTION_REGISTRATION_TRANSITIONS)[number];
export const AUCTION_OUTCOME_TRANSITIONS = ['sold', 'passed_in', 'withdrawn'] as const;
export type AuctionOutcomeTransition = (typeof AUCTION_OUTCOME_TRANSITIONS)[number];
export const LEAD_OUTCOME_SYNC_ACTIONS = [
  'sale_sold',
  'rental_let',
  'auction_sold',
  'auction_passed_in',
  'auction_withdrawn',
] as const;
export type LeadOutcomeSyncAction = (typeof LEAD_OUTCOME_SYNC_ACTIONS)[number];
export const DISTRIBUTION_HANDOFF_ACTIONS = [
  'link_only',
  'request_review',
  'stage_transition_requested',
] as const;
export type DistributionHandoffAction = (typeof DISTRIBUTION_HANDOFF_ACTIONS)[number];
type DistributionDealStage = (typeof DISTRIBUTION_DEAL_STAGE_VALUES)[number];
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

function appendLeadSyncNote(existing: string | null | undefined, next: string): string {
  const line = `[${new Date().toISOString()}] ${next}`;
  return existing ? `${existing}\n${line}` : line;
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

export function getSaleUnitOutcomeTransitionStatuses(transition: SaleUnitOutcomeTransition) {
  if (transition === 'mark_sold') {
    return {
      fromStatus: 'reserved',
      toStatus: 'sold',
      quantityDelta: 0,
    };
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Unsupported Sale outcome transition.',
  });
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

export function getRentalUnitOutcomeTransitionStatuses(transition: RentalUnitOutcomeTransition) {
  if (transition === 'mark_let') {
    return {
      fromStatus: 'held',
      toStatus: 'let',
      quantityDelta: 0,
    };
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Unsupported Rental outcome transition.',
  });
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

export function getAuctionOutcomeTransitionStatuses(input: {
  currentStatus: AuctionLifecycleStatus;
  outcome: AuctionOutcomeTransition;
}): { fromStatus: AuctionLifecycleStatus; toStatus: AuctionLifecycleStatus } {
  const { currentStatus, outcome } = input;

  if (outcome === 'sold' || outcome === 'passed_in') {
    if (currentStatus !== 'active') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Auction ${outcome.replace(/_/g, ' ')} outcomes require an active auction lot.`,
      });
    }
    return { fromStatus: currentStatus, toStatus: outcome };
  }

  if (outcome === 'withdrawn') {
    if (currentStatus === 'sold' || currentStatus === 'passed_in' || currentStatus === 'withdrawn') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Final Auction outcomes cannot be withdrawn again.',
      });
    }
    return { fromStatus: currentStatus, toStatus: 'withdrawn' };
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Unsupported Auction outcome transition.',
  });
}

export function getLeadOutcomeSyncTarget(input: {
  transactionType: DevelopmentOperatingTransactionType;
  outcome: LeadOutcomeSyncAction;
  note?: string | null;
}): { toStage: LeadStage; displayLabel: string; activityLabel: string } {
  const note = String(input.note || '').trim();

  if (input.outcome === 'sale_sold') {
    if (input.transactionType !== 'for_sale') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sale sold lead sync is only available for Sale developments.',
      });
    }
    return { toStage: 'closed_won', displayLabel: 'Sold', activityLabel: 'Sale lead synced as sold' };
  }

  if (input.outcome === 'rental_let') {
    if (input.transactionType !== 'for_rent') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Rental let lead sync is only available for Rental developments.',
      });
    }
    return {
      toStage: 'closed_won',
      displayLabel: 'Lease signed / Let',
      activityLabel: 'Rental lead synced as lease signed / let',
    };
  }

  if (input.outcome === 'auction_sold') {
    if (input.transactionType !== 'auction') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Auction sold lead sync is only available for Auction developments.',
      });
    }
    return {
      toStage: 'closed_won',
      displayLabel: 'Sold at auction',
      activityLabel: 'Auction lead synced as sold at auction',
    };
  }

  if (input.outcome === 'auction_passed_in' || input.outcome === 'auction_withdrawn') {
    if (input.transactionType !== 'auction') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Auction lost-outcome lead sync is only available for Auction developments.',
      });
    }
    if (note.length < 3) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Auction passed-in or withdrawn lead sync requires a note.',
      });
    }
    const displayLabel = input.outcome === 'auction_passed_in' ? 'Passed in follow-up' : 'Withdrawn follow-up';
    return {
      toStage: 'closed_lost',
      displayLabel,
      activityLabel: `Auction lead synced as ${displayLabel.toLowerCase()}`,
    };
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Unsupported lead outcome sync action.',
  });
}

export function getDistributionHandoffTarget(input: {
  action: DistributionHandoffAction;
  note?: string;
  requestedStage?: string | null;
}) {
  const note = String(input.note || '').trim();

  if (input.action === 'link_only') {
    return {
      action: input.action,
      toStatus: 'linked_only',
      resultLabel: 'Referral deal linked to DLE outcome context',
      noteRequired: false,
      requestedStage: null,
    };
  }

  if (note.length < 3) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A handoff review note is required.',
    });
  }

  if (input.action === 'request_review') {
    return {
      action: input.action,
      toStatus: 'review_requested',
      resultLabel: 'Referral handoff review requested',
      noteRequired: true,
      requestedStage: null,
    };
  }

  const requestedStage = String(input.requestedStage || '').trim() as DistributionDealStage;
  if (!DISTRIBUTION_DEAL_STAGE_VALUES.includes(requestedStage)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A valid requested distribution stage is required.',
    });
  }
  if (requestedStage === 'commission_pending' || requestedStage === 'commission_paid') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Commission stage requests must go through distribution readiness review.',
    });
  }

  return {
    action: input.action,
    toStatus: 'stage_transition_requested',
    resultLabel: 'Distribution stage review requested',
    noteRequired: true,
    requestedStage,
  };
}

export function validateLeadOutcomeSyncTransition(input: {
  fromStage: LeadStage;
  toStage: LeadStage;
}) {
  if (input.fromStage === input.toStage) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Lead is already at ${input.toStage}.`,
    });
  }

  if (!isLeadTransitionAllowed(input.fromStage, input.toStage)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid lead outcome sync from ${input.fromStage} to ${input.toStage}.`,
    });
  }
}

function toNonNegativeInt(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function calculateInferredOutcomeUnits(input: {
  totalUnits?: unknown;
  availableUnits?: unknown;
  reservedUnits?: unknown;
}): number {
  const totalUnits = toNonNegativeInt(input.totalUnits);
  const availableUnits = toNonNegativeInt(input.availableUnits);
  const reservedUnits = toNonNegativeInt(input.reservedUnits);
  return Math.max(totalUnits - availableUnits - reservedUnits, 0);
}

function readExplicitSoldUnits(input: {
  totalUnits?: unknown;
  availableUnits?: unknown;
  reservedUnits?: unknown;
  soldUnits?: unknown;
}): number {
  return toNonNegativeInt(input.soldUnits ?? calculateInferredOutcomeUnits(input));
}

function readExplicitLetUnits(input: {
  totalUnits?: unknown;
  availableUnits?: unknown;
  reservedUnits?: unknown;
  letUnits?: unknown;
}): number {
  return toNonNegativeInt(input.letUnits ?? calculateInferredOutcomeUnits(input));
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

export async function syncLeadOutcome(input: {
  developerId: number;
  developmentId: number;
  leadId: number;
  actorUserId: number;
  outcome: LeadOutcomeSyncAction;
  sourceOutcomeEventId?: number | null;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  const note = input.note ? String(input.note).trim() : '';
  const target = getLeadOutcomeSyncTarget({
    transactionType: development.transactionType,
    outcome: input.outcome,
    note,
  });
  const sourceSurface = normalizeOperatingSourceSurface(input.sourceSurface);

  return await db.transaction(async (tx: any) => {
    const [lead] = await tx
      .select()
      .from(leads)
      .where(and(eq(leads.id, input.leadId), eq(leads.developmentId, input.developmentId)))
      .limit(1);

    if (!lead) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Lead not found for this development.',
      });
    }

    let sourceOutcomeEvent: typeof developmentOperatingEvents.$inferSelect | null = null;
    if (input.sourceOutcomeEventId) {
      const [event] = await tx
        .select()
        .from(developmentOperatingEvents)
        .where(
          and(
            eq(developmentOperatingEvents.id, input.sourceOutcomeEventId),
            eq(developmentOperatingEvents.developmentId, input.developmentId),
          ),
        )
        .limit(1);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source outcome event not found for this development.',
        });
      }
      sourceOutcomeEvent = event;
    }

    const fromStage = deriveCanonicalLeadStage(lead);
    validateLeadOutcomeSyncTransition({ fromStage, toStage: target.toStage });

    const syncNote = note
      ? `${target.activityLabel}. ${note}`
      : target.activityLabel;
    const updateSet: any = {
      ...canonicalStageToUpdate(target.toStage),
      notes: appendLeadSyncNote(lead.notes, syncNote),
      updatedAt: formatLeadTimestamp(),
    };

    const updateResult = await tx.update(leads).set(updateSet).where(eq(leads.id, input.leadId));
    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Lead outcome sync could not update the lead.',
      });
    }

    await tx.execute(sql`
      insert into lead_activities (leadId, activityType, description)
      values (
        ${input.leadId},
        ${'status_change'},
        ${`${target.activityLabel}: ${fromStage} -> ${target.toStage}`}
      )
    `);

    const metadata = {
      transition: 'lead_outcome_sync',
      outcome: input.outcome,
      sourceOutcomeEventId: input.sourceOutcomeEventId || null,
      displayLabel: target.displayLabel,
      activityLabel: target.activityLabel,
      ...(note ? { note } : {}),
      ...(sourceOutcomeEvent
        ? {
            sourceOutcomeEventType: sourceOutcomeEvent.eventType,
            sourceOutcomeFromStatus: sourceOutcomeEvent.fromStatus,
            sourceOutcomeToStatus: sourceOutcomeEvent.toStatus,
          }
        : {}),
      developmentName: development.name,
      leadName: lead.name,
    };

    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      leadId: input.leadId,
      transactionType: development.transactionType,
      eventType: 'lead_stage_changed',
      fromStatus: fromStage,
      toStatus: target.toStage,
      beforeData: {
        leadId: input.leadId,
        stage: fromStage,
        status: lead.status,
        funnelStage: lead.funnelStage,
        unitId: lead.unitId,
        unitName: lead.unitName,
      },
      afterData: {
        leadId: input.leadId,
        stage: target.toStage,
        displayLabel: target.displayLabel,
        outcome: input.outcome,
        sourceOutcomeEventId: input.sourceOutcomeEventId || null,
      },
      metadata,
      actorUserId: input.actorUserId,
      sourceSurface,
    });

    const insertedId = readInsertId(insertResult);
    if (!insertedId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Lead outcome sync event could not be saved.',
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

    const [updatedLead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

    if (!event || !updatedLead) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Lead outcome sync was saved but could not be read back.',
      });
    }

    return {
      fromStage,
      toStage: target.toStage,
      displayLabel: target.displayLabel,
      event,
      lead: {
        id: updatedLead.id,
        developmentId: updatedLead.developmentId,
        name: updatedLead.name,
        status: updatedLead.status,
        funnelStage: updatedLead.funnelStage,
        stage: deriveCanonicalLeadStage(updatedLead),
        unitId: updatedLead.unitId,
        unitName: updatedLead.unitName,
      },
    };
  });
}

export async function createDistributionHandoff(input: {
  developerId: number;
  developmentId: number;
  distributionDealId: number;
  actorUserId: number;
  action: DistributionHandoffAction;
  leadId?: number | null;
  sourceOutcomeEventId?: number | null;
  requestedStage?: string | null;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  const note = input.note ? String(input.note).trim() : '';
  const target = getDistributionHandoffTarget({
    action: input.action,
    note,
    requestedStage: input.requestedStage,
  });
  const sourceSurface = normalizeOperatingSourceSurface(input.sourceSurface);

  return await db.transaction(async (tx: any) => {
    const [deal] = await tx
      .select({
        id: distributionDeals.id,
        developmentId: distributionDeals.developmentId,
        buyerName: distributionDeals.buyerName,
        buyerEmail: distributionDeals.buyerEmail,
        buyerPhone: distributionDeals.buyerPhone,
        agentId: distributionDeals.agentId,
        ownerType: distributionDeals.ownerType,
        ownerId: distributionDeals.ownerId,
        assignedAgentId: distributionDeals.assignedAgentId,
        visibilityScope: distributionDeals.visibilityScope,
        currentStage: distributionDeals.currentStage,
        commissionStatus: distributionDeals.commissionStatus,
        managerUserId: distributionDeals.managerUserId,
      })
      .from(distributionDeals)
      .where(
        and(
          eq(distributionDeals.id, input.distributionDealId),
          eq(distributionDeals.developmentId, input.developmentId),
        ),
      )
      .limit(1);

    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Referral deal not found for this development.',
      });
    }

    let lead: typeof leads.$inferSelect | null = null;
    if (input.leadId) {
      const [row] = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.developmentId, input.developmentId)))
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Lead not found for this development.',
        });
      }
      lead = row;
    }

    let sourceOutcomeEvent: typeof developmentOperatingEvents.$inferSelect | null = null;
    if (input.sourceOutcomeEventId) {
      const [event] = await tx
        .select()
        .from(developmentOperatingEvents)
        .where(
          and(
            eq(developmentOperatingEvents.id, input.sourceOutcomeEventId),
            eq(developmentOperatingEvents.developmentId, input.developmentId),
          ),
        )
        .limit(1);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source operating event not found for this development.',
        });
      }
      if (
        !['inventory_status_changed', 'auction_outcome_recorded', 'lead_stage_changed'].includes(
          String(event.eventType),
        )
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source event must be an inventory, auction outcome, or lead-stage event.',
        });
      }
      sourceOutcomeEvent = event;
    }

    const handoffNote =
      note || `${target.resultLabel} for ${deal.buyerName || 'referral deal'}.`;
    const metadata = {
      source: 'dle.distribution_handoff',
      action: target.action,
      resultLabel: target.resultLabel,
      developmentName: development.name,
      developmentId: input.developmentId,
      distributionDealId: input.distributionDealId,
      leadId: input.leadId || null,
      leadName: lead?.name || null,
      sourceOutcomeEventId: input.sourceOutcomeEventId || null,
      sourceOutcomeEventType: sourceOutcomeEvent?.eventType || null,
      requestedStage: target.requestedStage,
      currentStage: deal.currentStage,
      commissionStatus: deal.commissionStatus,
      note: handoffNote,
    };

    const distributionEventInsert = await tx.insert(distributionDealEvents).values({
      dealId: input.distributionDealId,
      eventType: 'note',
      fromStage: deal.currentStage,
      toStage: deal.currentStage,
      actorUserId: input.actorUserId,
      ownerType: deal.ownerType || 'agent',
      ownerId: deal.ownerId,
      assignedAgentId: deal.assignedAgentId || deal.agentId,
      visibilityScope: deal.visibilityScope || 'private',
      metadata,
      notes: handoffNote,
    });
    const distributionEventId = readInsertId(distributionEventInsert);
    if (!distributionEventId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Referral handoff note could not be saved.',
      });
    }

    const operatingEventInsert = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      leadId: input.leadId || null,
      distributionDealId: input.distributionDealId,
      transactionType: development.transactionType,
      eventType: 'distribution_handoff_created',
      fromStatus: deal.currentStage,
      toStatus: target.toStatus,
      beforeData: {
        distributionDealId: input.distributionDealId,
        currentStage: deal.currentStage,
        commissionStatus: deal.commissionStatus,
        buyerName: deal.buyerName,
      },
      afterData: {
        action: target.action,
        resultLabel: target.resultLabel,
        requestedStage: target.requestedStage,
        distributionEventId,
        stageChanged: false,
        commissionChanged: false,
      },
      metadata,
      actorUserId: input.actorUserId,
      sourceSurface,
    });
    const operatingEventId = readInsertId(operatingEventInsert);
    if (!operatingEventId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'DLE referral handoff event could not be saved.',
      });
    }

    const [event] = await tx
      .select()
      .from(developmentOperatingEvents)
      .where(
        and(
          eq(developmentOperatingEvents.id, operatingEventId),
          eq(developmentOperatingEvents.developmentId, input.developmentId),
        ),
      )
      .limit(1);
    const [dealAfter] = await tx
      .select({
        id: distributionDeals.id,
        currentStage: distributionDeals.currentStage,
        commissionStatus: distributionDeals.commissionStatus,
      })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, input.distributionDealId))
      .limit(1);

    if (!event || !dealAfter) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Referral handoff was saved but could not be read back.',
      });
    }

    return {
      action: target.action,
      resultLabel: target.resultLabel,
      distributionEventId,
      event,
      distributionDeal: {
        id: dealAfter.id,
        buyerName: deal.buyerName,
        currentStage: dealAfter.currentStage,
        commissionStatus: dealAfter.commissionStatus,
        stageChanged: dealAfter.currentStage !== deal.currentStage,
        commissionChanged: dealAfter.commissionStatus !== deal.commissionStatus,
      },
    };
  });
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
      soldUnits: unitTypes.soldUnits,
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
      soldUnits: readExplicitSoldUnits(item),
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
      letUnits: unitTypes.letUnits,
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
      letUnits: readExplicitLetUnits({
        totalUnits: item.totalUnits,
        availableUnits: item.availableUnits,
        reservedUnits: item.heldUnitsProjection,
        letUnits: item.letUnits,
      }),
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

export async function recordAuctionLotOutcome(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  outcome: AuctionOutcomeTransition;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'auction') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Auction outcomes are only available for Auction developments.',
    });
  }

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

    const currentStatus = (beforeUnit.auctionStatus || 'scheduled') as AuctionLifecycleStatus;
    const { fromStatus, toStatus } = getAuctionOutcomeTransitionStatuses({
      currentStatus,
      outcome: input.outcome,
    });

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
        message: 'Auction lifecycle changed before the outcome could be saved.',
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
      .where(
        and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)),
      )
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auction outcome saved but could not be read back.',
      });
    }

    const afterSnapshot = {
      ...beforeSnapshot,
      auctionStatus: afterUnit.auctionStatus || toStatus,
    };
    const metadata = {
      transition: 'record_outcome',
      outcome: input.outcome,
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: 'auction',
      eventType: 'auction_outcome_recorded',
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
        message: 'Auction outcome event could not be saved.',
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
        message: 'Auction outcome event was saved but could not be read back.',
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
        soldUnits: unitTypes.soldUnits,
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

export async function markSaleUnitTypeSold(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  source?: SaleUnitOutcomeSource;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'for_sale') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Sale sold outcomes are only available for Sale developments.',
    });
  }

  const outcomeSource = input.source === 'available_direct' ? 'available_direct' : 'reserved';
  const reservedOutcomeStatuses = getSaleUnitOutcomeTransitionStatuses('mark_sold');
  const fromStatus =
    outcomeSource === 'available_direct' ? 'available' : reservedOutcomeStatuses.fromStatus;
  const toStatus = reservedOutcomeStatuses.toStatus;
  const quantityDelta =
    outcomeSource === 'available_direct' ? -1 : reservedOutcomeStatuses.quantityDelta;
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
        soldUnits: unitTypes.soldUnits,
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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sale unit type not found.' });
    }

    const beforeSnapshot = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      reservedUnits: toNonNegativeInt(beforeUnit.reservedUnits),
      soldUnits: readExplicitSoldUnits(beforeUnit),
    };

    if (outcomeSource === 'reserved' && beforeSnapshot.reservedUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No reserved units can be marked sold for this unit type.',
      });
    }
    if (outcomeSource === 'available_direct' && beforeSnapshot.availableUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No available units can be marked directly sold for this unit type.',
      });
    }

    const updateSet =
      outcomeSource === 'available_direct'
        ? {
            availableUnits: sql`COALESCE(${unitTypes.availableUnits}, 0) - 1`,
            soldUnits: sql`COALESCE(${unitTypes.soldUnits}, 0) + 1`,
          }
        : {
            reservedUnits: sql`COALESCE(${unitTypes.reservedUnits}, 0) - 1`,
            soldUnits: sql`COALESCE(${unitTypes.soldUnits}, 0) + 1`,
          };
    const stockGuard =
      outcomeSource === 'available_direct'
        ? sql`COALESCE(${unitTypes.availableUnits}, 0) > 0`
        : sql`COALESCE(${unitTypes.reservedUnits}, 0) > 0`;

    const updateResult = await tx
      .update(unitTypes)
      .set(updateSet)
      .where(
        and(
          eq(unitTypes.id, input.unitTypeId),
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.isActive, 1),
          stockGuard,
        ),
      );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Sale inventory changed before the sold outcome could be saved.',
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
        soldUnits: unitTypes.soldUnits,
      })
      .from(unitTypes)
      .where(
        and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)),
      )
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Sale sold outcome saved but could not be read back.',
      });
    }

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

    const afterSnapshot = {
      unitTypeId: afterUnit.id,
      unitTypeName: afterUnit.name,
      totalUnits: toNonNegativeInt(afterUnit.totalUnits),
      availableUnits: toNonNegativeInt(afterUnit.availableUnits),
      reservedUnits: toNonNegativeInt(afterUnit.reservedUnits),
      soldUnits: readExplicitSoldUnits(afterUnit),
    };
    const metadata = {
      transition: 'mark_sold',
      outcome: 'sold',
      outcomeSource,
      inventoryProjectionColumn:
        outcomeSource === 'available_direct'
          ? 'unit_types.available_units'
          : 'unit_types.reserved_units',
      outcomeProjectionColumn: 'unit_types.sold_units',
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
        message: 'Sale sold outcome event could not be saved.',
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
        message: 'Sale sold outcome event was saved but could not be read back.',
      });
    }

    return {
      unit: afterSnapshot,
      aggregateAvailableUnits,
      event,
    };
  });
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

export async function markRentalUnitTypeLet(input: {
  developerId: number;
  developmentId: number;
  unitTypeId: string;
  actorUserId: number;
  source?: RentalUnitOutcomeSource;
  note?: string;
  sourceSurface?: unknown;
}) {
  const { db, development } = await requireOwnedDevelopment(input);
  if (development.transactionType !== 'for_rent') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Rental let outcomes are only available for Rental developments.',
    });
  }

  const outcomeSource = input.source === 'available_direct' ? 'available_direct' : 'held';
  const heldOutcomeStatuses = getRentalUnitOutcomeTransitionStatuses('mark_let');
  const fromStatus =
    outcomeSource === 'available_direct' ? 'available' : heldOutcomeStatuses.fromStatus;
  const toStatus = heldOutcomeStatuses.toStatus;
  const quantityDelta =
    outcomeSource === 'available_direct' ? -1 : heldOutcomeStatuses.quantityDelta;
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
        letUnits: unitTypes.letUnits,
        monthlyRentFrom: unitTypes.monthlyRentFrom,
        monthlyRentTo: unitTypes.monthlyRentTo,
        depositRequired: unitTypes.depositRequired,
        leaseTerm: unitTypes.leaseTerm,
        isFurnished: unitTypes.isFurnished,
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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Rental unit type not found.' });
    }

    const beforeSnapshot = {
      unitTypeId: beforeUnit.id,
      unitTypeName: beforeUnit.name,
      totalUnits: toNonNegativeInt(beforeUnit.totalUnits),
      availableUnits: toNonNegativeInt(beforeUnit.availableUnits),
      heldUnits: toNonNegativeInt(beforeUnit.reservedUnits),
      letUnits: readExplicitLetUnits(beforeUnit),
      monthlyRentFrom:
        beforeUnit.monthlyRentFrom != null ? Number(beforeUnit.monthlyRentFrom) : null,
      monthlyRentTo: beforeUnit.monthlyRentTo != null ? Number(beforeUnit.monthlyRentTo) : null,
      depositRequired:
        beforeUnit.depositRequired != null ? Number(beforeUnit.depositRequired) : null,
      leaseTerm: beforeUnit.leaseTerm,
      isFurnished: beforeUnit.isFurnished === 1,
    };

    if (outcomeSource === 'held' && beforeSnapshot.heldUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No held rental units can be marked let for this unit type.',
      });
    }
    if (outcomeSource === 'available_direct' && beforeSnapshot.availableUnits <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No available rental units can be marked directly let for this unit type.',
      });
    }

    const updateSet =
      outcomeSource === 'available_direct'
        ? {
            availableUnits: sql`COALESCE(${unitTypes.availableUnits}, 0) - 1`,
            letUnits: sql`COALESCE(${unitTypes.letUnits}, 0) + 1`,
          }
        : {
            reservedUnits: sql`COALESCE(${unitTypes.reservedUnits}, 0) - 1`,
            letUnits: sql`COALESCE(${unitTypes.letUnits}, 0) + 1`,
          };
    const stockGuard =
      outcomeSource === 'available_direct'
        ? sql`COALESCE(${unitTypes.availableUnits}, 0) > 0`
        : sql`COALESCE(${unitTypes.reservedUnits}, 0) > 0`;

    const updateResult = await tx
      .update(unitTypes)
      .set(updateSet)
      .where(
        and(
          eq(unitTypes.id, input.unitTypeId),
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.isActive, 1),
          stockGuard,
        ),
      );

    if (readAffectedRows(updateResult) < 1) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Rental inventory changed before the let outcome could be saved.',
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
        letUnits: unitTypes.letUnits,
        monthlyRentFrom: unitTypes.monthlyRentFrom,
        monthlyRentTo: unitTypes.monthlyRentTo,
        depositRequired: unitTypes.depositRequired,
        leaseTerm: unitTypes.leaseTerm,
        isFurnished: unitTypes.isFurnished,
      })
      .from(unitTypes)
      .where(
        and(eq(unitTypes.id, input.unitTypeId), eq(unitTypes.developmentId, input.developmentId)),
      )
      .limit(1);

    if (!afterUnit) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Rental let outcome saved but could not be read back.',
      });
    }

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

    const afterSnapshot = {
      unitTypeId: afterUnit.id,
      unitTypeName: afterUnit.name,
      totalUnits: toNonNegativeInt(afterUnit.totalUnits),
      availableUnits: toNonNegativeInt(afterUnit.availableUnits),
      heldUnits: toNonNegativeInt(afterUnit.reservedUnits),
      letUnits: readExplicitLetUnits(afterUnit),
      monthlyRentFrom: afterUnit.monthlyRentFrom != null ? Number(afterUnit.monthlyRentFrom) : null,
      monthlyRentTo: afterUnit.monthlyRentTo != null ? Number(afterUnit.monthlyRentTo) : null,
      depositRequired:
        afterUnit.depositRequired != null ? Number(afterUnit.depositRequired) : null,
      leaseTerm: afterUnit.leaseTerm,
      isFurnished: afterUnit.isFurnished === 1,
    };
    const metadata = {
      transition: 'mark_let',
      outcome: 'let',
      outcomeSource,
      inventoryProjectionColumn:
        outcomeSource === 'available_direct'
          ? 'unit_types.available_units'
          : 'unit_types.reserved_units',
      outcomeProjectionColumn: 'unit_types.let_units',
      ...(note ? { note } : {}),
      developmentName: development.name,
    };
    const insertResult = await tx.insert(developmentOperatingEvents).values({
      developmentId: input.developmentId,
      unitTypeId: input.unitTypeId,
      transactionType: 'for_rent',
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
        message: 'Rental let outcome event could not be saved.',
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
        message: 'Rental let outcome event was saved but could not be read back.',
      });
    }

    return {
      unit: afterSnapshot,
      aggregateAvailableUnits,
      event,
    };
  });
}

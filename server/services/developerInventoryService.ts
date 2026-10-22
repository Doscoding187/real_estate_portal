import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import { developerIdentityService } from './developerIdentityService';
import { hasValidDevelopmentInventoryMarketPrice } from './developmentInventoryPricing';
import {
  developmentInventoryItems,
  developmentPhases,
  developments,
  managerialAuditLogs,
  unitTypes,
  users,
} from '../../drizzle/schema';

export const DEVELOPMENT_INVENTORY_STATUSES = [
  'planned',
  'available',
  'reserved',
  'under_offer',
  'under_contract',
  'sold',
  'leased',
  'withdrawn',
  'legal_hold',
  'reconciliation_required',
] as const;

export type DevelopmentInventoryStatus = (typeof DEVELOPMENT_INVENTORY_STATUSES)[number];
export type DevelopmentTransactionMode = 'for_sale' | 'for_rent';

const INVENTORY_MANAGER_ROLES = new Set(['owner', 'admin', 'sales_manager']);
const INVENTORY_READ_ROLES = new Set([
  ...INVENTORY_MANAGER_ROLES,
  'sales_consultant',
  'marketing',
  'finance',
  'viewer',
]);
const MAX_IMPORT_ITEMS = 5_000;
const MAX_RELEASE_BATCH_ITEMS = 200;
const PHASE_ARCHIVE_BLOCKING_STATUSES = [
  'available',
  'reserved',
  'under_offer',
  'under_contract',
  'leased',
  'legal_hold',
  'reconciliation_required',
] as const;

interface PreparedInventoryItem {
  phaseId: number;
  unitTypeId: string;
  internalIdentifier: string;
  publicIdentifier?: string | null;
  allocationNotes?: string | null;
  transactionType: DevelopmentTransactionMode;
  status: DevelopmentInventoryStatus;
  salePrice?: string | null;
  rentPrice?: string | null;
}

interface InventoryActorScope {
  publisherId: number;
  role: string;
}

function fail(code: 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'PRECONDITION_FAILED', message: string): never {
  throw new TRPCError({ code, message });
}

function requireReason(reason: string): string {
  const normalized = typeof reason === 'string' ? reason.trim() : '';
  if (normalized.length < 10 || normalized.length > 500) {
    fail('BAD_REQUEST', 'Enter a reason between 10 and 500 characters.');
  }
  return normalized;
}

function requireMarketPrice(
  item: Pick<PreparedInventoryItem, 'transactionType' | 'salePrice' | 'rentPrice' | 'internalIdentifier'>,
  unitType: { basePriceFrom?: unknown; basePriceTo?: unknown; monthlyRentFrom?: unknown; monthlyRentTo?: unknown } | null | undefined,
) {
  if (hasValidDevelopmentInventoryMarketPrice(item, unitType)) return;
  const modeLabel = item.transactionType === 'for_rent' ? 'monthly rent' : 'sale';
  fail(
    'PRECONDITION_FAILED',
    `${item.internalIdentifier} needs a valid ${modeLabel} price before it can be marketable. Set the unit type range or an allocation price override.`,
  );
}

async function assertPhaseHasNoMarketableOrCommittedInventory(
  tx: any,
  developmentId: number,
  phaseId: number,
) {
  const counts = await tx
    .select({
      status: developmentInventoryItems.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(developmentInventoryItems)
    .where(
      and(
        eq(developmentInventoryItems.developmentId, developmentId),
        eq(developmentInventoryItems.phaseId, phaseId),
        inArray(developmentInventoryItems.status, [...PHASE_ARCHIVE_BLOCKING_STATUSES]),
      ),
    )
    .groupBy(developmentInventoryItems.status);

  const blockers = counts
    .map((row: { status: string; count: number | string }) => ({
      status: row.status,
      count: Number(row.count || 0),
    }))
    .filter((row: { count: number }) => row.count > 0);
  if (blockers.length) {
    const summary = blockers.map((row: { status: string; count: number }) => `${row.count} ${row.status.replace(/_/g, ' ')}`).join(', ');
    fail(
      'PRECONDITION_FAILED',
      `Resolve this phase's marketable or committed inventory before archiving or reopening it: ${summary}. Inventory states are not changed by this action.`,
    );
  }
}

async function assertPhaseNotArchived(tx: any, developmentId: number, phaseId: number) {
  const [phase] = await tx
    .select({ id: developmentPhases.id, archivedAt: developmentPhases.archivedAt })
    .from(developmentPhases)
    .where(and(
      eq(developmentPhases.id, phaseId),
      eq(developmentPhases.developmentId, developmentId),
    ))
    .limit(1)
    .for('update');
  if (!phase) fail('NOT_FOUND', 'The inventory item no longer belongs to an active phase.');
  if (phase.archivedAt) fail('PRECONDITION_FAILED', 'Reopen this phase before changing its inventory.');
}

async function getActorScope(userId: number, allowReadOnlyRoles = false): Promise<InventoryActorScope> {
  const profile = await developerIdentityService.getDeveloperByUserId(userId);
  if (!profile) fail('FORBIDDEN', 'Developer profile not found.');
  const role = String(profile.membership?.role || '');
  const allowedRoles = allowReadOnlyRoles ? INVENTORY_READ_ROLES : INVENTORY_MANAGER_ROLES;
  if (!allowedRoles.has(role)) {
    fail('FORBIDDEN', 'Only a developer owner, admin, or sales manager can manage inventory.');
  }
  return { publisherId: Number(profile.publisherId), role };
}

async function lockOwnedDevelopment(tx: any, developmentId: number, publisherId: number) {
  const [development] = await tx
    .select({
      id: developments.id,
      inventoryMode: developments.inventoryMode,
      transactionType: developments.transactionType,
    })
    .from(developments)
    .where(
      and(
        eq(developments.id, developmentId),
        eq(developments.cataloguePublisherId, publisherId),
      ),
    )
    .limit(1)
    .for('update');
  if (!development) fail('NOT_FOUND', 'Development not found.');
  return development;
}

function normalizePreparedItems(input: PreparedInventoryItem[]): PreparedInventoryItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IMPORT_ITEMS) {
    fail('BAD_REQUEST', `Prepare between 1 and ${MAX_IMPORT_ITEMS} inventory items at a time.`);
  }

  const internalIds = new Set<string>();
  const publicIds = new Set<string>();
  return input.map((item, index) => {
    const internalIdentifier = String(item?.internalIdentifier || '').trim();
    const publicIdentifier = item?.publicIdentifier
      ? String(item.publicIdentifier).trim()
      : null;
    const allocationNotes = item?.allocationNotes == null
      ? null
      : String(item.allocationNotes).trim() || null;
    const unitTypeId = String(item?.unitTypeId || '').trim();
    if (!internalIdentifier || internalIdentifier.length > 100) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} needs an internal identifier of 1–100 characters.`);
    }
    if (!unitTypeId || unitTypeId.length > 36) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} needs a valid unit type.`);
    }
    if (!Number.isSafeInteger(item.phaseId) || item.phaseId <= 0) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} needs a valid phase.`);
    }
    if (item.transactionType !== 'for_sale' && item.transactionType !== 'for_rent') {
      fail('BAD_REQUEST', `Inventory row ${index + 1} needs a sale or rental mode.`);
    }
    if (!DEVELOPMENT_INVENTORY_STATUSES.includes(item.status)) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} has an unsupported inventory state.`);
    }
    if (publicIdentifier && publicIdentifier.length > 100) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} has a public identifier longer than 100 characters.`);
    }
    if (allocationNotes && allocationNotes.length > 1000) {
      fail('BAD_REQUEST', `Inventory row ${index + 1} allocation details must be 1,000 characters or fewer.`);
    }
    const normalizedInternal = internalIdentifier.toLocaleLowerCase();
    const normalizedPublic = publicIdentifier?.toLocaleLowerCase();
    if (internalIds.has(normalizedInternal)) {
      fail('BAD_REQUEST', 'Internal inventory identifiers must be unique within the import.');
    }
    if (normalizedPublic && publicIds.has(normalizedPublic)) {
      fail('BAD_REQUEST', 'Public inventory identifiers must be unique within the import.');
    }
    internalIds.add(normalizedInternal);
    if (normalizedPublic) publicIds.add(normalizedPublic);
    const normalizePrice = (value: unknown, label: string) => {
      const normalized = value === undefined || value === null || value === '' ? null : String(value);
      if (
        normalized !== null &&
        (!/^\d{1,13}(\.\d{1,2})?$/.test(normalized) || !Number.isFinite(Number(normalized)) || Number(normalized) <= 0)
      ) {
        fail('BAD_REQUEST', `Inventory row ${index + 1} ${label} must be greater than zero with no more than two decimals, or left blank.`);
      }
      return normalized;
    };
    return {
      ...item,
      internalIdentifier,
      publicIdentifier,
      allocationNotes,
      unitTypeId,
      salePrice: normalizePrice(item.salePrice, 'sale price'),
      rentPrice: normalizePrice(item.rentPrice, 'rental price'),
    };
  });
}

function statusCount(rows: PreparedInventoryItem[], status: DevelopmentInventoryStatus): number {
  return rows.reduce((count, row) => count + (row.status === status ? 1 : 0), 0);
}

/**
 * Reconcile explicit operational item rows into the aggregate compatibility
 * columns used by existing read surfaces. The item rows are authoritative only
 * when inventory_mode is itemized.
 */
export async function refreshItemizedProjection(tx: any, developmentId: number) {
  const summaries = await tx
    .select({
      unitTypeId: developmentInventoryItems.unitTypeId,
      total: sql<number>`COUNT(*)`,
      releasedForSale: sql<number>`SUM(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} IN ('available','reserved','under_offer','under_contract','sold','leased') AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN 1 ELSE 0 END)`,
      releasedForRent: sql<number>`SUM(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} IN ('available','reserved','under_offer','under_contract','sold','leased') AND ${developmentInventoryItems.transactionType} = 'for_rent' THEN 1 ELSE 0 END)`,
      availableForSale: sql<number>`SUM(CASE WHEN ${developmentInventoryItems.status} = 'available' AND ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN 1 ELSE 0 END)`,
      availableForRent: sql<number>`SUM(CASE WHEN ${developmentInventoryItems.status} = 'available' AND ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.transactionType} = 'for_rent' THEN 1 ELSE 0 END)`,
      reservedForSale: sql<number>`SUM(CASE WHEN ${developmentInventoryItems.status} = 'reserved' AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN 1 ELSE 0 END)`,
      reservedForRent: sql<number>`SUM(CASE WHEN ${developmentInventoryItems.status} = 'reserved' AND ${developmentInventoryItems.transactionType} = 'for_rent' THEN 1 ELSE 0 END)`,
      soldForSale: sql<number>`SUM(CASE WHEN ${developmentInventoryItems.status} = 'sold' AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN 1 ELSE 0 END)`,
      availableSalePriceFrom: sql<string | null>`MIN(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} = 'available' AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN COALESCE(NULLIF(${developmentInventoryItems.salePrice}, 0), NULLIF(${unitTypes.basePriceFrom}, 0)) ELSE NULL END)`,
      availableSalePriceTo: sql<string | null>`MAX(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} = 'available' AND ${developmentInventoryItems.transactionType} = 'for_sale' THEN CASE WHEN ${developmentInventoryItems.salePrice} > 0 THEN ${developmentInventoryItems.salePrice} ELSE COALESCE(NULLIF(${unitTypes.basePriceTo}, 0), NULLIF(${unitTypes.basePriceFrom}, 0)) END ELSE NULL END)`,
      availableRentPriceFrom: sql<string | null>`MIN(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} = 'available' AND ${developmentInventoryItems.transactionType} = 'for_rent' THEN COALESCE(NULLIF(${developmentInventoryItems.rentPrice}, 0), NULLIF(${unitTypes.monthlyRentFrom}, 0)) ELSE NULL END)`,
      availableRentPriceTo: sql<string | null>`MAX(CASE WHEN ${developmentPhases.status} = 'selling' AND ${developmentPhases.archivedAt} IS NULL AND ${developmentInventoryItems.status} = 'available' AND ${developmentInventoryItems.transactionType} = 'for_rent' THEN CASE WHEN ${developmentInventoryItems.rentPrice} > 0 THEN ${developmentInventoryItems.rentPrice} ELSE COALESCE(NULLIF(${unitTypes.monthlyRentTo}, 0), NULLIF(${unitTypes.monthlyRentFrom}, 0)) END ELSE NULL END)`,
    })
    .from(developmentInventoryItems)
    .innerJoin(developmentPhases, eq(developmentInventoryItems.phaseId, developmentPhases.id))
    .innerJoin(unitTypes, eq(developmentInventoryItems.unitTypeId, unitTypes.id))
    .where(eq(developmentInventoryItems.developmentId, developmentId))
    .groupBy(developmentInventoryItems.unitTypeId);

  for (const summary of summaries) {
    const availableForSale = Number(summary.availableForSale || 0);
    const availableForRent = Number(summary.availableForRent || 0);
    await tx
      .update(unitTypes)
      .set({
        totalUnits: Number(summary.total || 0),
        availableUnits: availableForSale + availableForRent,
        availableForSaleUnits: availableForSale,
        availableForRentUnits: availableForRent,
        releasedForSaleUnits: Number(summary.releasedForSale || 0),
        releasedForRentUnits: Number(summary.releasedForRent || 0),
        reservedForSaleUnits: Number(summary.reservedForSale || 0),
        reservedForRentUnits: Number(summary.reservedForRent || 0),
        soldForSaleUnits: Number(summary.soldForSale || 0),
        availableSalePriceFrom: summary.availableSalePriceFrom,
        availableSalePriceTo: summary.availableSalePriceTo,
        availableRentPriceFrom: summary.availableRentPriceFrom,
        availableRentPriceTo: summary.availableRentPriceTo,
        reservedUnits: Number(summary.reservedForSale || 0) + Number(summary.reservedForRent || 0),
      })
      .where(and(eq(unitTypes.id, summary.unitTypeId), eq(unitTypes.developmentId, developmentId)));
  }

  return summaries.map((summary: any) => ({
    unitTypeId: String(summary.unitTypeId),
    total: Number(summary.total || 0),
    releasedForSale: Number(summary.releasedForSale || 0),
    releasedForRent: Number(summary.releasedForRent || 0),
    availableForSale: Number(summary.availableForSale || 0),
    availableForRent: Number(summary.availableForRent || 0),
    reservedForSale: Number(summary.reservedForSale || 0),
    reservedForRent: Number(summary.reservedForRent || 0),
    soldForSale: Number(summary.soldForSale || 0),
    availableSalePriceFrom: summary.availableSalePriceFrom === null ? null : Number(summary.availableSalePriceFrom),
    availableSalePriceTo: summary.availableSalePriceTo === null ? null : Number(summary.availableSalePriceTo),
    availableRentPriceFrom: summary.availableRentPriceFrom === null ? null : Number(summary.availableRentPriceFrom),
    availableRentPriceTo: summary.availableRentPriceTo === null ? null : Number(summary.availableRentPriceTo),
  }));
}

export async function getDeveloperInventoryWorkspace(developmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(userId, true);
  const [development] = await db
    .select({
      id: developments.id,
      name: developments.name,
      inventoryMode: developments.inventoryMode,
      transactionType: developments.transactionType,
      status: developments.status,
    })
    .from(developments)
    .where(
      and(
        eq(developments.id, developmentId),
        eq(developments.cataloguePublisherId, actor.publisherId),
      ),
    )
    .limit(1);
  if (!development) fail('NOT_FOUND', 'Development not found.');

  const [phases, items, types] = await Promise.all([
    db
      .select()
      .from(developmentPhases)
      .where(eq(developmentPhases.developmentId, developmentId))
      .orderBy(developmentPhases.phaseNumber, developmentPhases.id),
    development.inventoryMode === 'itemized'
      ? db
          .select()
          .from(developmentInventoryItems)
          .where(eq(developmentInventoryItems.developmentId, developmentId))
          .orderBy(developmentInventoryItems.phaseId, developmentInventoryItems.internalIdentifier)
      : Promise.resolve([]),
    db
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        bedrooms: unitTypes.bedrooms,
        bathrooms: unitTypes.bathrooms,
        unitSize: unitTypes.unitSize,
        yardSize: unitTypes.yardSize,
        label: unitTypes.label,
        structuralType: unitTypes.structuralType,
        floors: unitTypes.floors,
        configDescription: unitTypes.configDescription,
        baseFeatures: unitTypes.baseFeatures,
        baseFinishes: unitTypes.baseFinishes,
        extras: unitTypes.extras,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
        basePriceFrom: unitTypes.basePriceFrom,
        basePriceTo: unitTypes.basePriceTo,
        monthlyRentFrom: unitTypes.monthlyRentFrom,
        monthlyRentTo: unitTypes.monthlyRentTo,
        availableSalePriceFrom: unitTypes.availableSalePriceFrom,
        availableSalePriceTo: unitTypes.availableSalePriceTo,
        availableRentPriceFrom: unitTypes.availableRentPriceFrom,
        availableRentPriceTo: unitTypes.availableRentPriceTo,
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId))
      .orderBy(unitTypes.displayOrder, unitTypes.name),
  ]);
  const itemIds = (items as Array<{ id: number }>).map(item => Number(item.id));
  const phaseIds = (phases as Array<{ id: number }>).map(phase => Number(phase.id));
  const audit = itemIds.length || phaseIds.length
    ? await db
        .select({
          id: managerialAuditLogs.id,
          actorUserId: managerialAuditLogs.actorUserId,
          targetType: managerialAuditLogs.targetType,
          targetId: managerialAuditLogs.targetId,
          action: managerialAuditLogs.action,
          beforeData: managerialAuditLogs.beforeData,
          afterData: managerialAuditLogs.afterData,
          metadata: managerialAuditLogs.metadata,
          createdAt: managerialAuditLogs.createdAt,
          actorName: users.name,
          actorFirstName: users.firstName,
          actorLastName: users.lastName,
        })
        .from(managerialAuditLogs)
        .leftJoin(users, eq(managerialAuditLogs.actorUserId, users.id))
        .where(or(
          ...(itemIds.length
            ? [and(
                eq(managerialAuditLogs.targetType, 'development_inventory_item'),
                inArray(managerialAuditLogs.targetId, itemIds),
              )]
            : []),
          ...(phaseIds.length
            ? [and(
                eq(managerialAuditLogs.targetType, 'development_phase'),
                inArray(managerialAuditLogs.targetId, phaseIds),
              )]
            : []),
          and(
            eq(managerialAuditLogs.targetType, 'development'),
            eq(managerialAuditLogs.targetId, developmentId),
          ),
        ))
        .orderBy(desc(managerialAuditLogs.createdAt), desc(managerialAuditLogs.id))
        .limit(100)
    : [];
  return { development, phases, items, unitTypes: types, audit };
}

export async function getInventoryItemHistory(input: {
  developmentId: number;
  itemId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId, true);
  const [development] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(
        eq(developments.id, input.developmentId),
        eq(developments.cataloguePublisherId, actor.publisherId),
      ),
    )
    .limit(1);
  if (!development) fail('NOT_FOUND', 'Development not found.');

  const [item] = await db
    .select({ id: developmentInventoryItems.id, phaseId: developmentInventoryItems.phaseId })
    .from(developmentInventoryItems)
    .where(
      and(
        eq(developmentInventoryItems.id, input.itemId),
        eq(developmentInventoryItems.developmentId, input.developmentId),
      ),
    )
    .limit(1);
  if (!item) fail('NOT_FOUND', 'Inventory item not found.');

  return db
    .select({
      id: managerialAuditLogs.id,
      actorUserId: managerialAuditLogs.actorUserId,
      targetType: managerialAuditLogs.targetType,
      targetId: managerialAuditLogs.targetId,
      action: managerialAuditLogs.action,
      beforeData: managerialAuditLogs.beforeData,
      afterData: managerialAuditLogs.afterData,
      metadata: managerialAuditLogs.metadata,
      createdAt: managerialAuditLogs.createdAt,
      actorName: users.name,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
    })
    .from(managerialAuditLogs)
    .leftJoin(users, eq(managerialAuditLogs.actorUserId, users.id))
    .where(or(
      and(
        eq(managerialAuditLogs.targetType, 'development_inventory_item'),
        eq(managerialAuditLogs.targetId, input.itemId),
      ),
      and(
        eq(managerialAuditLogs.targetType, 'development_phase'),
        eq(managerialAuditLogs.targetId, Number(item.phaseId)),
      ),
      and(
        eq(managerialAuditLogs.targetType, 'development'),
        eq(managerialAuditLogs.targetId, input.developmentId),
      ),
    ))
    .orderBy(desc(managerialAuditLogs.createdAt), desc(managerialAuditLogs.id))
    .limit(200);
}

/**
 * First-time import/activation is an explicit reconciliation. Existing
 * aggregate counts must match the named rows; the unclassified remainder is
 * represented by explicit row states rather than inferred as sold.
 */
export async function prepareItemizedInventory(input: {
  developmentId: number;
  userId: number;
  items: PreparedInventoryItem[];
  reason: string;
  sourceSystem: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const sourceSystem = String(input.sourceSystem || '').trim();
  if (!sourceSystem || sourceSystem.length > 100) {
    fail('BAD_REQUEST', 'Choose the source system used to reconcile these inventory rows.');
  }
  const items = normalizePreparedItems(input.items);

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'aggregate') {
      fail('PRECONDITION_FAILED', 'This development is already using itemized inventory.');
    }
    if (development.transactionType === 'auction') {
      fail('PRECONDITION_FAILED', 'Auction inventory is not supported by this inventory workflow.');
    }

    const [existingItem] = await tx
      .select({ id: developmentInventoryItems.id })
      .from(developmentInventoryItems)
      .where(eq(developmentInventoryItems.developmentId, input.developmentId))
      .limit(1)
      .for('update');
    if (existingItem) {
      fail('PRECONDITION_FAILED', 'Inventory rows already exist; reconcile the current itemized record.');
    }

    const [typeRows, phaseRows] = await Promise.all([
      tx.select().from(unitTypes).where(eq(unitTypes.developmentId, input.developmentId)).for('update'),
      tx
        .select()
        .from(developmentPhases)
        .where(eq(developmentPhases.developmentId, input.developmentId))
        .for('update'),
    ]);
    if (typeRows.length === 0 || phaseRows.length === 0) {
      fail('PRECONDITION_FAILED', 'Add at least one unit type and one phase before importing inventory.');
    }

    const typeById = new Map(typeRows.map((row: any) => [String(row.id), row]));
    const phaseById = new Map(phaseRows.map((row: any) => [Number(row.id), row]));
    for (const item of items) {
      const unitType = typeById.get(item.unitTypeId) as any;
      if (!unitType) {
        fail('BAD_REQUEST', `Unit type ${item.unitTypeId} does not belong to this development.`);
      }
      const phase = phaseById.get(item.phaseId) as any;
      if (!phase) {
        fail('BAD_REQUEST', `Phase ${item.phaseId} does not belong to this development.`);
      }
      if (item.status === 'available') {
        if (phase.status !== 'selling' || phase.archivedAt) {
          fail('PRECONDITION_FAILED', `${item.internalIdentifier} cannot be marked available until its phase is selling.`);
        }
        requireMarketPrice(item, unitType);
      }
    }

    const rowsByType = new Map<string, PreparedInventoryItem[]>();
    for (const item of items) {
      const rows = rowsByType.get(item.unitTypeId) || [];
      rows.push(item);
      rowsByType.set(item.unitTypeId, rows);
    }

    const isNewUncountedInventory = typeRows.every(
      (row: any) => Number(row.totalUnits || 0) === 0 && Number(row.availableUnits || 0) === 0 && Number(row.reservedUnits || 0) === 0,
    );
    for (const type of typeRows as any[]) {
      const rows = rowsByType.get(String(type.id)) || [];
      if (rows.length === 0) {
        const hasExistingCount =
          Number(type.totalUnits || 0) > 0 ||
          Number(type.availableUnits || 0) > 0 ||
          Number(type.reservedUnits || 0) > 0;
        if (!hasExistingCount) continue;
        fail('PRECONDITION_FAILED', `Add an explicit inventory row for every allocation in ${type.name}.`);
      }
      if (isNewUncountedInventory) {
        if (rows.some(row => row.status !== 'planned')) {
          fail('PRECONDITION_FAILED', 'New inventory must start planned and be released through the workspace.');
        }
        continue;
      }

      const expectedTotal = Number(type.totalUnits || 0);
      const expectedAvailable = Number(type.availableUnits || 0);
      const expectedReserved = Number(type.reservedUnits || 0);
      if (
        rows.length !== expectedTotal ||
        statusCount(rows, 'available') + statusCount(rows, 'planned') !== expectedAvailable ||
        statusCount(rows, 'reserved') !== expectedReserved
      ) {
        fail(
          'PRECONDITION_FAILED',
          `Inventory for ${type.name} does not reconcile with its current total, available, and reserved counts. Review the source register and retry.`,
        );
      }
    }

    for (let offset = 0; offset < items.length; offset += 250) {
      const chunk = items.slice(offset, offset + 250);
      await tx.insert(developmentInventoryItems).values(
        chunk.map(item => ({
          developmentId: input.developmentId,
          phaseId: item.phaseId,
          unitTypeId: item.unitTypeId,
          internalIdentifier: item.internalIdentifier,
          publicIdentifier: item.publicIdentifier || null,
          allocationNotes: item.allocationNotes || null,
          transactionType: item.transactionType,
          status: item.status,
          salePrice: item.salePrice || null,
          rentPrice: item.rentPrice || null,
        })),
      );
    }

    const reconciledRows = await tx
      .select({
        id: developmentInventoryItems.id,
        phaseId: developmentInventoryItems.phaseId,
        unitTypeId: developmentInventoryItems.unitTypeId,
        internalIdentifier: developmentInventoryItems.internalIdentifier,
        publicIdentifier: developmentInventoryItems.publicIdentifier,
        allocationNotes: developmentInventoryItems.allocationNotes,
        transactionType: developmentInventoryItems.transactionType,
        status: developmentInventoryItems.status,
        salePrice: developmentInventoryItems.salePrice,
        rentPrice: developmentInventoryItems.rentPrice,
        versionId: developmentInventoryItems.versionId,
      })
      .from(developmentInventoryItems)
      .where(eq(developmentInventoryItems.developmentId, input.developmentId));
    const expectedIdentifiers = new Set(items.map(item => item.internalIdentifier.toLocaleLowerCase()));
    if (
      reconciledRows.length !== items.length ||
      reconciledRows.some(row => !expectedIdentifiers.has(String(row.internalIdentifier).toLocaleLowerCase()))
    ) {
      fail('PRECONDITION_FAILED', 'The reconciled inventory register did not match the submitted rows. No inventory changes were committed.');
    }
    for (let offset = 0; offset < reconciledRows.length; offset += 250) {
      const chunk = reconciledRows.slice(offset, offset + 250);
      await tx.insert(managerialAuditLogs).values(
        chunk.map(row => ({
          actorUserId: input.userId,
          action: 'developer.inventory.item_reconciled',
          targetType: 'development_inventory_item',
          targetId: Number(row.id),
          beforeData: null,
          afterData: {
            status: row.status,
            transactionType: row.transactionType,
          allocationNotes: row.allocationNotes,
            salePrice: row.salePrice,
            rentPrice: row.rentPrice,
            versionId: Number(row.versionId),
          },
          metadata: {
            developmentId: input.developmentId,
            phaseId: Number(row.phaseId),
            unitTypeId: String(row.unitTypeId),
            internalIdentifier: row.internalIdentifier,
            publicIdentifier: row.publicIdentifier,
            allocationNotes: row.allocationNotes,
            reason,
            sourceSystem,
            actorRole: actor.role,
          },
        })),
      );
    }

    await tx
      .update(developments)
      .set({ inventoryMode: 'itemized' })
      .where(eq(developments.id, input.developmentId));
    const projection = await refreshItemizedProjection(tx, input.developmentId);
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.reconciled_to_itemized',
      targetType: 'development',
      targetId: input.developmentId,
      beforeData: {
        inventoryMode: 'aggregate',
        unitTypes: typeRows.map((row: any) => ({
          id: row.id,
          totalUnits: Number(row.totalUnits || 0),
          availableUnits: Number(row.availableUnits || 0),
          reservedUnits: Number(row.reservedUnits || 0),
        })),
      },
      afterData: {
        inventoryMode: 'itemized',
        itemCount: items.length,
        unitTypes: projection,
      },
      metadata: { reason, sourceSystem, actorRole: actor.role },
    });
    return { inventoryMode: 'itemized' as const, itemCount: items.length, unitTypes: projection };
  });
}

export async function prepareDevelopmentPhase(input: {
  developmentId: number;
  phaseNumber: number;
  name: string;
  description?: string | null;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const name = String(input.name || '').trim();
  const description = input.description?.trim() || null;
  if (!Number.isSafeInteger(input.phaseNumber) || input.phaseNumber <= 0 || input.phaseNumber > 100_000) {
    fail('BAD_REQUEST', 'Enter a phase number between 1 and 100,000.');
  }
  if (name.length < 2 || name.length > 255) {
    fail('BAD_REQUEST', 'Phase name must be between 2 and 255 characters.');
  }
  if (description && description.length > 2_000) {
    fail('BAD_REQUEST', 'Phase description must be 2,000 characters or fewer.');
  }

  return db.transaction(async (tx: any) => {
    await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    const [existingPhase] = await tx
      .select({ id: developmentPhases.id })
      .from(developmentPhases)
      .where(and(
        eq(developmentPhases.developmentId, input.developmentId),
        eq(developmentPhases.phaseNumber, input.phaseNumber),
      ))
      .limit(1)
      .for('update');
    if (existingPhase) {
      fail('CONFLICT', `Phase ${input.phaseNumber} already exists in this development.`);
    }

    const [insertResult] = await tx.insert(developmentPhases).values({
      developmentId: input.developmentId,
      phaseNumber: input.phaseNumber,
      name,
      description,
      status: 'planning',
      totalUnits: 0,
      availableUnits: 0,
    });
    const phaseId = Number(insertResult?.insertId);
    if (!Number.isSafeInteger(phaseId) || phaseId <= 0) {
      throw new Error('Could not identify the prepared development phase.');
    }
    const [phase] = await tx
      .select()
      .from(developmentPhases)
      .where(and(
        eq(developmentPhases.id, phaseId),
        eq(developmentPhases.developmentId, input.developmentId),
      ))
      .limit(1);
    if (!phase) throw new Error('Prepared development phase could not be reloaded.');

    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.phase.prepared',
      targetType: 'development_phase',
      targetId: phaseId,
      beforeData: null,
      afterData: {
        phaseNumber: input.phaseNumber,
        name,
        description,
        status: 'planning',
      },
      metadata: {
        developmentId: input.developmentId,
        reason,
        actorRole: actor.role,
      },
    });
    return phase;
  });
}

export async function addPlannedInventoryItems(input: {
  developmentId: number;
  userId: number;
  items: PreparedInventoryItem[];
  reason: string;
  sourceSystem: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const sourceSystem = String(input.sourceSystem || '').trim();
  if (!sourceSystem || sourceSystem.length > 100) {
    fail('BAD_REQUEST', 'Choose the source system used to prepare these inventory rows.');
  }
  const items = normalizePreparedItems(input.items);
  if (items.some(item => item.status !== 'planned')) {
    fail('BAD_REQUEST', 'New allocations must start planned. Release them through the phase and batch workflow.');
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Reconcile this development into itemized inventory before adding allocations.');
    }
    if (development.transactionType === 'auction') {
      fail('PRECONDITION_FAILED', 'Auction inventory is not supported by this inventory workflow.');
    }

    const [typeRows, phaseRows, existingRows] = await Promise.all([
      tx.select().from(unitTypes).where(eq(unitTypes.developmentId, input.developmentId)).for('update'),
      tx.select().from(developmentPhases).where(eq(developmentPhases.developmentId, input.developmentId)).for('update'),
      tx
        .select({
          phaseId: developmentInventoryItems.phaseId,
          unitTypeId: developmentInventoryItems.unitTypeId,
          internalIdentifier: developmentInventoryItems.internalIdentifier,
          publicIdentifier: developmentInventoryItems.publicIdentifier,
        })
        .from(developmentInventoryItems)
        .where(eq(developmentInventoryItems.developmentId, input.developmentId))
        .for('update'),
    ]);

    const typeById = new Map(typeRows.map((row: any) => [String(row.id), row]));
    const phaseById = new Map(phaseRows.map((row: any) => [Number(row.id), row]));
    const allocationsByType = new Map<string, number>();
    const internalIdentifiers = new Set<string>();
    const publicIdentifiers = new Set<string>();
    for (const row of existingRows as Array<{
      phaseId: number;
      unitTypeId: string;
      internalIdentifier: string;
      publicIdentifier: string | null;
    }>) {
      const unitTypeId = String(row.unitTypeId);
      if (!typeById.has(unitTypeId) || !phaseById.has(Number(row.phaseId))) {
        fail('PRECONDITION_FAILED', 'The current inventory contains a phase or unit type outside this development. Correct the register before adding allocations.');
      }
      allocationsByType.set(unitTypeId, (allocationsByType.get(unitTypeId) || 0) + 1);
      internalIdentifiers.add(String(row.internalIdentifier).trim().toLocaleLowerCase());
      if (row.publicIdentifier) publicIdentifiers.add(String(row.publicIdentifier).trim().toLocaleLowerCase());
    }

    for (const type of typeRows as any[]) {
      if ((allocationsByType.get(String(type.id)) || 0) !== Number(type.totalUnits || 0)) {
        fail('PRECONDITION_FAILED', `Inventory for ${type.name} does not reconcile. Review the current register before adding allocations.`);
      }
    }
    for (const item of items) {
      if (!typeById.has(item.unitTypeId)) {
        fail('BAD_REQUEST', `Unit type ${item.unitTypeId} does not belong to this development.`);
      }
      const phase = phaseById.get(item.phaseId) as any;
      if (!phase) {
        fail('BAD_REQUEST', `Phase ${item.phaseId} does not belong to this development.`);
      }
      if (phase.archivedAt) fail('PRECONDITION_FAILED', `Reopen phase ${item.phaseId} before adding inventory.`);
      const internalKey = item.internalIdentifier.toLocaleLowerCase();
      if (internalIdentifiers.has(internalKey)) {
        fail('CONFLICT', `Inventory reference ${item.internalIdentifier} already exists in this development.`);
      }
      internalIdentifiers.add(internalKey);
      if (item.publicIdentifier) {
        const publicKey = item.publicIdentifier.toLocaleLowerCase();
        if (publicIdentifiers.has(publicKey)) {
          fail('CONFLICT', `Public inventory reference ${item.publicIdentifier} already exists in this development.`);
        }
        publicIdentifiers.add(publicKey);
      }
    }

    for (let offset = 0; offset < items.length; offset += 250) {
      await tx.insert(developmentInventoryItems).values(
        items.slice(offset, offset + 250).map(item => ({
          developmentId: input.developmentId,
          phaseId: item.phaseId,
          unitTypeId: item.unitTypeId,
          internalIdentifier: item.internalIdentifier,
          publicIdentifier: item.publicIdentifier || null,
          allocationNotes: item.allocationNotes || null,
          transactionType: item.transactionType,
          status: 'planned' as const,
          salePrice: item.salePrice || null,
          rentPrice: item.rentPrice || null,
        })),
      );
    }

    for (let offset = 0; offset < items.length; offset += 250) {
      const chunk = items.slice(offset, offset + 250);
      const rows = await tx
        .select({
          id: developmentInventoryItems.id,
          phaseId: developmentInventoryItems.phaseId,
          unitTypeId: developmentInventoryItems.unitTypeId,
          internalIdentifier: developmentInventoryItems.internalIdentifier,
          publicIdentifier: developmentInventoryItems.publicIdentifier,
          allocationNotes: developmentInventoryItems.allocationNotes,
          transactionType: developmentInventoryItems.transactionType,
          salePrice: developmentInventoryItems.salePrice,
          rentPrice: developmentInventoryItems.rentPrice,
          versionId: developmentInventoryItems.versionId,
        })
        .from(developmentInventoryItems)
        .where(and(
          eq(developmentInventoryItems.developmentId, input.developmentId),
          inArray(developmentInventoryItems.internalIdentifier, chunk.map(item => item.internalIdentifier)),
        ));
      if (rows.length !== chunk.length) {
        fail('PRECONDITION_FAILED', 'The added inventory did not match the submitted rows. No changes were committed.');
      }
      await tx.insert(managerialAuditLogs).values(
        rows.map((row: any) => ({
          actorUserId: input.userId,
          action: 'developer.inventory.item_added',
          targetType: 'development_inventory_item',
          targetId: Number(row.id),
          beforeData: null,
          afterData: {
            status: row.status,
            transactionType: row.transactionType,
            allocationNotes: row.allocationNotes,
            salePrice: row.salePrice,
            rentPrice: row.rentPrice,
            versionId: Number(row.versionId),
          },
          metadata: {
            developmentId: input.developmentId,
            phaseId: Number(row.phaseId),
            unitTypeId: String(row.unitTypeId),
            internalIdentifier: row.internalIdentifier,
            publicIdentifier: row.publicIdentifier,
            reason,
            sourceSystem,
            actorRole: actor.role,
          },
        })),
      );
    }

    const projection = await refreshItemizedProjection(tx, input.developmentId);
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.items_added',
      targetType: 'development',
      targetId: input.developmentId,
      beforeData: { itemCount: existingRows.length },
      afterData: { itemCount: existingRows.length + items.length },
      metadata: { reason, sourceSystem, actorRole: actor.role },
    });
    return { addedCount: items.length, unitTypes: projection };
  });
}

export async function releaseDevelopmentPhase(input: {
  developmentId: number;
  phaseId: number;
  expectedStatus: 'planning' | 'pre_launch';
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Reconcile this development into itemized inventory before releasing a phase.');
    }
    const [phase] = await tx
      .select()
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.id, input.phaseId),
          eq(developmentPhases.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!phase) fail('NOT_FOUND', 'Phase not found.');
    if (phase.archivedAt) fail('PRECONDITION_FAILED', 'Reopen this phase before releasing it.');
    if (phase.status !== input.expectedStatus) {
      fail('PRECONDITION_FAILED', 'The phase changed after you opened this action. Refresh and review its current status.');
    }
    const [plannedStock] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.developmentId, input.developmentId),
          eq(developmentInventoryItems.phaseId, input.phaseId),
          eq(developmentInventoryItems.status, 'planned'),
        ),
      );
    if (Number(plannedStock?.count || 0) === 0) {
      fail('PRECONDITION_FAILED', 'This phase needs at least one planned allocation before it can be released.');
    }
    const [alreadyAvailable] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.developmentId, input.developmentId),
          eq(developmentInventoryItems.phaseId, input.phaseId),
          eq(developmentInventoryItems.status, 'available'),
        ),
      );
    if (Number(alreadyAvailable?.count || 0) > 0) {
      fail(
        'PRECONDITION_FAILED',
        'This phase has inventory already marked available. Move unbatched stock back to planned, then release only the homes selected for a batch.',
      );
    }

    await tx
      .update(developmentPhases)
      .set({ status: 'selling' })
      .where(and(eq(developmentPhases.id, input.phaseId), eq(developmentPhases.status, input.expectedStatus)));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.phase.released',
      targetType: 'development_phase',
      targetId: input.phaseId,
      beforeData: { status: input.expectedStatus },
      afterData: { status: 'selling' },
      metadata: { developmentId: input.developmentId, reason, actorRole: actor.role },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { phaseId: input.phaseId, status: 'selling' as const, unitTypes: unitTypesProjection };
  });
}

export async function archiveDevelopmentPhase(input: {
  developmentId: number;
  phaseId: number;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail(
        'PRECONDITION_FAILED',
        'Phase archival requires itemized inventory so the workspace can verify that no stock or commitments are hidden by the archive.',
      );
    }
    const [phase] = await tx
      .select()
      .from(developmentPhases)
      .where(and(
        eq(developmentPhases.id, input.phaseId),
        eq(developmentPhases.developmentId, input.developmentId),
      ))
      .limit(1)
      .for('update');
    if (!phase) fail('NOT_FOUND', 'Phase not found.');
    if (phase.archivedAt) fail('PRECONDITION_FAILED', 'This phase is already archived. Refresh and review its current state.');

    await assertPhaseHasNoMarketableOrCommittedInventory(tx, input.developmentId, input.phaseId);
    await tx
      .update(developmentPhases)
      .set({ archivedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(developmentPhases.id, input.phaseId),
        eq(developmentPhases.developmentId, input.developmentId),
        isNull(developmentPhases.archivedAt),
      ));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.phase.archived',
      targetType: 'development_phase',
      targetId: input.phaseId,
      beforeData: { status: phase.status, archived: false },
      afterData: { status: phase.status, archived: true },
      metadata: { developmentId: input.developmentId, reason, actorRole: actor.role },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { phaseId: input.phaseId, status: phase.status, archived: true, unitTypes: unitTypesProjection };
  });
}

export async function reopenDevelopmentPhase(input: {
  developmentId: number;
  phaseId: number;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Reopening a phase requires itemized inventory so marketability can be verified safely.');
    }
    const [phase] = await tx
      .select()
      .from(developmentPhases)
      .where(and(
        eq(developmentPhases.id, input.phaseId),
        eq(developmentPhases.developmentId, input.developmentId),
      ))
      .limit(1)
      .for('update');
    if (!phase) fail('NOT_FOUND', 'Phase not found.');
    if (!phase.archivedAt) fail('PRECONDITION_FAILED', 'This phase is not archived. Refresh and review its current state.');

    await assertPhaseHasNoMarketableOrCommittedInventory(tx, input.developmentId, input.phaseId);
    await tx
      .update(developmentPhases)
      .set({ archivedAt: null })
      .where(and(
        eq(developmentPhases.id, input.phaseId),
        eq(developmentPhases.developmentId, input.developmentId),
      ));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.phase.reopened',
      targetType: 'development_phase',
      targetId: input.phaseId,
      beforeData: { status: phase.status, archived: true },
      afterData: { status: phase.status, archived: false },
      metadata: { developmentId: input.developmentId, reason, actorRole: actor.role },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { phaseId: input.phaseId, status: phase.status, archived: false, unitTypes: unitTypesProjection };
  });
}

export async function releaseInventoryBatch(input: {
  developmentId: number;
  phaseId: number;
  items: Array<{ id: number; expectedVersionId: number }>;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > MAX_RELEASE_BATCH_ITEMS) {
    fail('BAD_REQUEST', `Select between 1 and ${MAX_RELEASE_BATCH_ITEMS} inventory items for a release.`);
  }
  const ids = input.items.map(item => item.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    fail('BAD_REQUEST', 'The release contains duplicate or invalid inventory rows.');
  }
  const expectedVersions = new Map(input.items.map(item => [item.id, item.expectedVersionId]));
  const releaseBatchId = randomUUID();

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Reconcile this development into itemized inventory before releasing stock.');
    }
    const [phase] = await tx
      .select({ id: developmentPhases.id, status: developmentPhases.status, archivedAt: developmentPhases.archivedAt })
      .from(developmentPhases)
      .where(and(eq(developmentPhases.id, input.phaseId), eq(developmentPhases.developmentId, input.developmentId)))
      .limit(1)
      .for('update');
    if (!phase) fail('NOT_FOUND', 'Phase not found.');
    if (phase.archivedAt) fail('PRECONDITION_FAILED', 'Reopen this phase before releasing inventory.');
    if (phase.status !== 'selling') {
      fail('PRECONDITION_FAILED', 'Release the phase before releasing inventory from it.');
    }
    const rows = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.developmentId, input.developmentId),
          eq(developmentInventoryItems.phaseId, input.phaseId),
          inArray(developmentInventoryItems.id, ids),
        ),
      )
      .for('update');
    if (rows.length !== ids.length) {
      fail('NOT_FOUND', 'One or more selected inventory items are not in this phase. Refresh and try again.');
    }
    const unitTypeIds = Array.from(new Set((rows as any[]).map(row => String(row.unitTypeId))));
    const unitTypeRows = await tx
      .select()
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, input.developmentId), inArray(unitTypes.id, unitTypeIds)))
      .for('update');
    const unitTypeById = new Map(unitTypeRows.map((unitType: any) => [String(unitType.id), unitType]));
    for (const row of rows as any[]) {
      if (row.status !== 'planned') {
        fail('PRECONDITION_FAILED', `${row.internalIdentifier} is no longer planned and cannot be released by this batch.`);
      }
      if (Number(row.versionId) !== expectedVersions.get(Number(row.id))) {
        fail('PRECONDITION_FAILED', `${row.internalIdentifier} changed after you selected it. Refresh and review the current status.`);
      }
      requireMarketPrice(row, unitTypeById.get(String(row.unitTypeId)) as any);
    }

    for (const row of rows as any[]) {
      await tx
        .update(developmentInventoryItems)
        .set({ status: 'available', versionId: Number(row.versionId) + 1 })
        .where(
          and(
            eq(developmentInventoryItems.id, row.id),
            eq(developmentInventoryItems.versionId, row.versionId),
            eq(developmentInventoryItems.status, 'planned'),
          ),
        );
      await tx.insert(managerialAuditLogs).values({
        actorUserId: input.userId,
        action: 'developer.inventory.item_released',
        targetType: 'development_inventory_item',
        targetId: Number(row.id),
        beforeData: { status: 'planned', versionId: Number(row.versionId) },
        afterData: { status: 'available', versionId: Number(row.versionId) + 1 },
        metadata: {
          developmentId: input.developmentId,
          phaseId: input.phaseId,
          releaseBatchId,
          reason,
          transactionType: row.transactionType,
          actorRole: actor.role,
        },
      });
    }
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { releaseBatchId, releasedCount: rows.length, unitTypes: unitTypesProjection };
  });
}

const INVENTORY_STATUS_TRANSITIONS: Partial<Record<DevelopmentInventoryStatus, DevelopmentInventoryStatus[]>> = {
  available: ['planned', 'reserved', 'under_offer', 'withdrawn', 'legal_hold', 'reconciliation_required'],
  reserved: ['available', 'under_offer', 'under_contract', 'legal_hold'],
  under_offer: ['available', 'reserved', 'under_contract', 'legal_hold'],
  under_contract: ['sold', 'leased', 'legal_hold'],
};

export async function transitionInventoryItemStatus(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  expectedStatus: DevelopmentInventoryStatus;
  nextStatus: DevelopmentInventoryStatus;
  userId: number;
  reason: string;
  sourceSystem: string;
  sourceReference?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const sourceSystem = String(input.sourceSystem || '').trim();
  const sourceReference = input.sourceReference?.trim() || null;
  if (!sourceSystem || sourceSystem.length > 100) {
    fail('BAD_REQUEST', 'Choose the CRM or operating record used for this status change.');
  }
  const sourceReferenceRequired =
    ['reserved', 'under_offer', 'under_contract', 'sold', 'leased', 'legal_hold'].includes(input.nextStatus) ||
    (input.nextStatus === 'available' && ['reserved', 'under_offer'].includes(input.expectedStatus));
  if (sourceReferenceRequired && !sourceReference) {
    fail(
      'BAD_REQUEST',
      'Add the reservation, offer, cancellation, contract, or clearance reference from the developer’s operating system.',
    );
  }
  if (input.nextStatus === 'sold' && input.expectedStatus !== 'under_contract') {
    fail('PRECONDITION_FAILED', 'Mark a unit under contract before recording it as sold.');
  }
  if (!INVENTORY_STATUS_TRANSITIONS[input.expectedStatus]?.includes(input.nextStatus)) {
    fail('PRECONDITION_FAILED', 'This inventory state change is not allowed. Use the dedicated release or return-to-market action.');
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'This status workflow is available only for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (
      Number(item.versionId) !== input.expectedVersionId ||
      item.status !== input.expectedStatus
    ) {
      fail('PRECONDITION_FAILED', 'This inventory item changed. Refresh and review its current status.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    if (input.nextStatus === 'sold' && item.transactionType !== 'for_sale') {
      fail('PRECONDITION_FAILED', 'Rental inventory cannot be recorded as a completed sale.');
    }
    if (input.nextStatus === 'leased' && item.transactionType !== 'for_rent') {
      fail('PRECONDITION_FAILED', 'Sale inventory cannot be recorded as leased. Change its market mode through the guarded workflow first.');
    }
    const requiresSellingPhase = input.nextStatus === 'available'
      || (input.expectedStatus === 'available' && ['reserved', 'under_offer'].includes(input.nextStatus));
    if (requiresSellingPhase) {
      const [phase] = await tx
        .select({ status: developmentPhases.status, archivedAt: developmentPhases.archivedAt })
        .from(developmentPhases)
        .where(
          and(
            eq(developmentPhases.id, item.phaseId),
            eq(developmentPhases.developmentId, input.developmentId),
          ),
        )
        .limit(1)
        .for('update');
      if (!phase || phase.status !== 'selling' || phase.archivedAt) {
        fail('PRECONDITION_FAILED', 'The phase must be selling before inventory can be available or enter a deal.');
      }
    }
    if (input.nextStatus === 'available') {
      const [unitType] = await tx
        .select()
        .from(unitTypes)
        .where(and(eq(unitTypes.id, item.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
        .limit(1)
        .for('update');
      requireMarketPrice(item, unitType);
    }

    await tx
      .update(developmentInventoryItems)
      .set({ status: input.nextStatus, versionId: Number(item.versionId) + 1 })
      .where(
        and(
          eq(developmentInventoryItems.id, item.id),
          eq(developmentInventoryItems.versionId, item.versionId),
          eq(developmentInventoryItems.status, input.expectedStatus),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.status_changed',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: { status: item.status, versionId: Number(item.versionId) },
      afterData: { status: input.nextStatus, versionId: Number(item.versionId) + 1 },
      metadata: {
        developmentId: input.developmentId,
        phaseId: Number(item.phaseId),
        reason,
        sourceSystem,
        sourceReference,
        actorRole: actor.role,
      },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return {
      itemId: Number(item.id),
      status: input.nextStatus,
      transactionType: item.transactionType,
      unitTypes: unitTypesProjection,
    };
  });
}

export async function resolveInventoryLegalHold(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  returnTo: 'available' | 'planned' | 'withdrawn';
  userId: number;
  reason: string;
  clearanceSourceSystem: string;
  clearanceReference: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const clearanceSourceSystem = String(input.clearanceSourceSystem || '').trim();
  const clearanceReference = String(input.clearanceReference || '').trim();
  if (!clearanceSourceSystem || clearanceSourceSystem.length > 100) {
    fail('BAD_REQUEST', 'Identify the CRM, deal register, or legal system confirming clearance.');
  }
  if (!clearanceReference || clearanceReference.length > 160) {
    fail('BAD_REQUEST', 'Add the cancellation or clearance record reference before returning this item.');
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Legal hold resolution is available only for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (Number(item.versionId) !== input.expectedVersionId || item.status !== 'legal_hold') {
      fail('PRECONDITION_FAILED', 'The legal hold changed. Refresh and review its current status.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    if (input.returnTo === 'available') {
      const [phase] = await tx
        .select({ status: developmentPhases.status, archivedAt: developmentPhases.archivedAt })
        .from(developmentPhases)
        .where(eq(developmentPhases.id, item.phaseId))
        .limit(1)
        .for('update');
      if (!phase || phase.status !== 'selling' || phase.archivedAt) {
        fail('PRECONDITION_FAILED', 'A held item can return as available only while its phase is selling.');
      }
      const [unitType] = await tx
        .select()
        .from(unitTypes)
        .where(and(eq(unitTypes.id, item.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
        .limit(1)
        .for('update');
      requireMarketPrice(item, unitType);
    }

    await tx
      .update(developmentInventoryItems)
      .set({ status: input.returnTo, versionId: Number(item.versionId) + 1 })
      .where(
        and(
          eq(developmentInventoryItems.id, item.id),
          eq(developmentInventoryItems.versionId, item.versionId),
          eq(developmentInventoryItems.status, 'legal_hold'),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.legal_hold_resolved',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: { status: 'legal_hold', versionId: Number(item.versionId) },
      afterData: { status: input.returnTo, versionId: Number(item.versionId) + 1 },
      metadata: {
        developmentId: input.developmentId,
        phaseId: Number(item.phaseId),
        reason,
        clearanceSourceSystem,
        clearanceReference,
        actorRole: actor.role,
      },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { itemId: Number(item.id), status: input.returnTo, unitTypes: unitTypesProjection };
  });
}

export async function changeInventoryTransactionMode(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  transactionType: DevelopmentTransactionMode;
  /** Target-mode price override. Undefined preserves an existing override; null clears it. */
  price?: number | null;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  if (input.price != null) {
    const normalizedCents = Math.round(input.price * 100);
    if (
      !Number.isFinite(input.price) ||
      input.price <= 0 ||
      Math.abs(input.price - normalizedCents / 100) > 0.0000001
    ) {
      fail('BAD_REQUEST', 'Enter a target-mode price greater than zero with no more than two decimals, or leave it blank to use unit type pricing.');
    }
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Transaction mode can only be changed for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (Number(item.versionId) !== input.expectedVersionId) {
      fail('PRECONDITION_FAILED', 'This inventory item changed after you opened it. Refresh and review its current status.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    if (item.status !== 'planned' && item.status !== 'available') {
      fail(
        'PRECONDITION_FAILED',
        `${item.internalIdentifier} has a protected inventory status and cannot change between sale and rental modes.`,
      );
    }
    if (item.transactionType === input.transactionType) {
      fail('BAD_REQUEST', 'Choose the other transaction mode before saving.');
    }
    const targetModePrice = input.transactionType === 'for_sale' ? item.salePrice : item.rentPrice;
    const nextTargetModePrice = input.price === undefined
      ? targetModePrice
      : input.price === null
        ? null
        : (Math.round(input.price * 100) / 100).toFixed(2);
    const nextPrices = input.transactionType === 'for_sale'
      ? { salePrice: nextTargetModePrice, rentPrice: item.rentPrice }
      : { salePrice: item.salePrice, rentPrice: nextTargetModePrice };
    if (item.status === 'available') {
      const [phase] = await tx
        .select({ status: developmentPhases.status, archivedAt: developmentPhases.archivedAt })
        .from(developmentPhases)
        .where(
          and(
            eq(developmentPhases.id, item.phaseId),
            eq(developmentPhases.developmentId, input.developmentId),
          ),
        )
        .limit(1)
        .for('update');
      if (!phase || phase.status !== 'selling' || phase.archivedAt) {
        fail('PRECONDITION_FAILED', 'Release the phase before changing the market mode of available inventory.');
      }
      const [unitType] = await tx
        .select()
        .from(unitTypes)
        .where(and(eq(unitTypes.id, item.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
        .limit(1)
        .for('update');
      requireMarketPrice({ ...item, ...nextPrices, transactionType: input.transactionType }, unitType);
    }

    await tx
      .update(developmentInventoryItems)
      .set({ ...nextPrices, transactionType: input.transactionType, versionId: Number(item.versionId) + 1 })
      .where(and(
        eq(developmentInventoryItems.id, item.id),
        eq(developmentInventoryItems.versionId, item.versionId),
        eq(developmentInventoryItems.status, item.status),
      ));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.transaction_mode_changed',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: {
        transactionType: item.transactionType,
        status: item.status,
        salePrice: item.salePrice,
        rentPrice: item.rentPrice,
        versionId: Number(item.versionId),
      },
      afterData: {
        transactionType: input.transactionType,
        status: item.status,
        salePrice: nextPrices.salePrice,
        rentPrice: nextPrices.rentPrice,
        versionId: Number(item.versionId) + 1,
      },
      metadata: { developmentId: input.developmentId, phaseId: Number(item.phaseId), reason, actorRole: actor.role },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { itemId: Number(item.id), transactionType: input.transactionType, unitTypes: unitTypesProjection };
  });
}

export async function updateInventoryItemPrice(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  transactionType: DevelopmentTransactionMode;
  price: number | null;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  if (input.price !== null) {
    const normalizedCents = Math.round(input.price * 100);
    if (
      !Number.isFinite(input.price) ||
      input.price <= 0 ||
      Math.abs(input.price - normalizedCents / 100) > 0.0000001
    ) {
      fail('BAD_REQUEST', 'Enter a price greater than zero with no more than two decimal places, or clear it to use the unit type price.');
    }
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Allocation pricing is available only for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (Number(item.versionId) !== input.expectedVersionId) {
      fail('PRECONDITION_FAILED', 'This inventory item changed after you opened it. Refresh and review its current state.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    if (item.status !== 'planned' && item.status !== 'available') {
      fail('PRECONDITION_FAILED', 'Price changes are limited to planned or available inventory. Protected or committed inventory cannot be repriced here.');
    }
    if (item.transactionType !== input.transactionType) {
      fail('PRECONDITION_FAILED', 'The inventory market mode changed. Refresh before changing its price.');
    }

    const nextPrice = input.price === null ? null : (Math.round(input.price * 100) / 100).toFixed(2);
    if (item.status === 'available' && nextPrice === null) {
      const [unitType] = await tx
        .select()
        .from(unitTypes)
        .where(and(eq(unitTypes.id, item.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
        .limit(1)
        .for('update');
      const itemWithoutOverride = input.transactionType === 'for_sale'
        ? { ...item, salePrice: null }
        : { ...item, rentPrice: null };
      requireMarketPrice(itemWithoutOverride, unitType);
    }
    const priceUpdate = input.transactionType === 'for_sale'
      ? { salePrice: nextPrice }
      : { rentPrice: nextPrice };
    const nextSalePrice = input.transactionType === 'for_sale' ? nextPrice : item.salePrice;
    const nextRentPrice = input.transactionType === 'for_rent' ? nextPrice : item.rentPrice;
    await tx
      .update(developmentInventoryItems)
      .set({ ...priceUpdate, versionId: Number(item.versionId) + 1 })
      .where(
        and(
          eq(developmentInventoryItems.id, item.id),
          eq(developmentInventoryItems.versionId, item.versionId),
          eq(developmentInventoryItems.status, item.status),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.price_changed',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: {
        salePrice: item.salePrice,
        rentPrice: item.rentPrice,
        versionId: Number(item.versionId),
      },
      afterData: {
        salePrice: nextSalePrice,
        rentPrice: nextRentPrice,
        versionId: Number(item.versionId) + 1,
      },
      metadata: {
        developmentId: input.developmentId,
        phaseId: Number(item.phaseId),
        transactionType: input.transactionType,
        status: item.status,
        reason,
        actorRole: actor.role,
      },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return {
      itemId: Number(item.id),
      transactionType: input.transactionType,
      price: nextPrice,
      unitTypes: unitTypesProjection,
    };
  });
}

export async function updateInventoryItemDetails(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  allocationNotes: string | null;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  const allocationNotes = input.allocationNotes?.trim() || null;
  if (allocationNotes && allocationNotes.length > 1000) {
    fail('BAD_REQUEST', 'Allocation details must be 1,000 characters or fewer.');
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Allocation details are available only for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (Number(item.versionId) !== input.expectedVersionId) {
      fail('PRECONDITION_FAILED', 'This inventory item changed after you opened it. Refresh and review its current state.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    if (item.status !== 'planned' && item.status !== 'available') {
      fail('PRECONDITION_FAILED', 'Allocation details can only be changed for planned or available inventory.');
    }

    const nextVersionId = Number(item.versionId) + 1;
    await tx
      .update(developmentInventoryItems)
      .set({ allocationNotes, versionId: nextVersionId })
      .where(
        and(
          eq(developmentInventoryItems.id, item.id),
          eq(developmentInventoryItems.versionId, item.versionId),
          eq(developmentInventoryItems.status, item.status),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.allocation_details_changed',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: {
        allocationNotes: item.allocationNotes,
        versionId: Number(item.versionId),
      },
      afterData: {
        allocationNotes,
        versionId: nextVersionId,
      },
      metadata: {
        developmentId: input.developmentId,
        phaseId: Number(item.phaseId),
        reason,
        actorRole: actor.role,
      },
    });
    return { itemId: Number(item.id), allocationNotes, versionId: nextVersionId };
  });
}

export async function returnLeasedInventoryToMarket(input: {
  developmentId: number;
  itemId: number;
  expectedVersionId: number;
  transactionType: DevelopmentTransactionMode;
  /** Target-mode price override. Undefined preserves an existing override; null clears it. */
  price?: number | null;
  leaseEndConfirmed: true;
  sourceSystem: string;
  leaseEndReference: string;
  userId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await getActorScope(input.userId);
  const reason = requireReason(input.reason);
  if (input.price != null) {
    const normalizedCents = Math.round(input.price * 100);
    if (
      !Number.isFinite(input.price) ||
      input.price <= 0 ||
      Math.abs(input.price - normalizedCents / 100) > 0.0000001
    ) {
      fail('BAD_REQUEST', 'Enter a target-mode price greater than zero with no more than two decimals, or leave it blank to use unit type pricing.');
    }
  }
  const sourceSystem = String(input.sourceSystem || '').trim();
  const leaseEndReference = String(input.leaseEndReference || '').trim();
  if (!sourceSystem || sourceSystem.length > 100) {
    fail('BAD_REQUEST', 'Choose the system that confirms the lease end.');
  }
  if (!leaseEndReference || leaseEndReference.length > 160) {
    fail('BAD_REQUEST', 'Add the lease close-out or termination reference.');
  }

  return db.transaction(async (tx: any) => {
    const development = await lockOwnedDevelopment(tx, input.developmentId, actor.publisherId);
    if (development.inventoryMode !== 'itemized') {
      fail('PRECONDITION_FAILED', 'Lease completion is available only for itemized inventory.');
    }
    const [item] = await tx
      .select()
      .from(developmentInventoryItems)
      .where(
        and(
          eq(developmentInventoryItems.id, input.itemId),
          eq(developmentInventoryItems.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!item) fail('NOT_FOUND', 'Inventory item not found.');
    if (Number(item.versionId) !== input.expectedVersionId || item.status !== 'leased') {
      fail('PRECONDITION_FAILED', 'The lease or inventory state changed. Refresh and review the current record.');
    }
    await assertPhaseNotArchived(tx, input.developmentId, Number(item.phaseId));
    const [phase] = await tx
      .select({ status: developmentPhases.status, archivedAt: developmentPhases.archivedAt })
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.id, item.phaseId),
          eq(developmentPhases.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!phase || phase.status !== 'selling' || phase.archivedAt) {
      fail('PRECONDITION_FAILED', 'The phase must be selling before a lease can return directly to market.');
    }
    const [unitType] = await tx
      .select()
      .from(unitTypes)
      .where(and(eq(unitTypes.id, item.unitTypeId), eq(unitTypes.developmentId, input.developmentId)))
      .limit(1)
      .for('update');
    const targetModePrice = input.transactionType === 'for_sale' ? item.salePrice : item.rentPrice;
    const nextTargetModePrice = input.price === undefined
      ? targetModePrice
      : input.price === null
        ? null
        : (Math.round(input.price * 100) / 100).toFixed(2);
    const nextPrices = input.transactionType === 'for_sale'
      ? { salePrice: nextTargetModePrice, rentPrice: item.rentPrice }
      : { salePrice: item.salePrice, rentPrice: nextTargetModePrice };
    requireMarketPrice({ ...item, ...nextPrices, transactionType: input.transactionType }, unitType);

    await tx
      .update(developmentInventoryItems)
      .set({ ...nextPrices, status: 'available', transactionType: input.transactionType, versionId: Number(item.versionId) + 1 })
      .where(and(
        eq(developmentInventoryItems.id, item.id),
        eq(developmentInventoryItems.versionId, item.versionId),
        eq(developmentInventoryItems.status, 'leased'),
      ));
    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: 'developer.inventory.lease_ended_and_returned_to_market',
      targetType: 'development_inventory_item',
      targetId: Number(item.id),
      beforeData: {
        transactionType: item.transactionType,
        status: 'leased',
        salePrice: item.salePrice,
        rentPrice: item.rentPrice,
        versionId: Number(item.versionId),
      },
      afterData: {
        transactionType: input.transactionType,
        status: 'available',
        salePrice: nextPrices.salePrice,
        rentPrice: nextPrices.rentPrice,
        versionId: Number(item.versionId) + 1,
      },
      metadata: {
        developmentId: input.developmentId,
        phaseId: Number(item.phaseId),
        reason,
        leaseEndConfirmed: true,
        sourceSystem,
        leaseEndReference,
        actorRole: actor.role,
      },
    });
    const unitTypesProjection = await refreshItemizedProjection(tx, input.developmentId);
    return { itemId: Number(item.id), status: 'available' as const, transactionType: input.transactionType, unitTypes: unitTypesProjection };
  });
}

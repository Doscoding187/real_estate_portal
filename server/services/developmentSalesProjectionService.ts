import { createHash } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  developmentDocuments,
  developmentInventoryItems,
  developmentPhases,
  developmentTeamContacts,
  developments,
  unitTypes,
} from '../../drizzle/schema';
import {
  hasValidDevelopmentInventoryMarketPrice,
  type DevelopmentInventoryPriceSource,
} from './developmentInventoryPricing';

export type DevelopmentSalesMode = 'for_sale' | 'for_rent';

export interface DevelopmentSalesModeProjection {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
}

export interface DevelopmentSalesProjection {
  contractVersion: 1;
  developmentId: number;
  publisherId: number | null;
  observedAt: string;
  revision: string;
  campaign: {
    /** Approved/published campaign visibility; this does not imply marketable inventory. */
    visible: boolean;
    /** Development lifecycle. Without mode-specific lifecycle fields, only `selling` permits marketability. */
    lifecycle: 'launching-soon' | 'selling' | 'sold-out';
    name: string;
    tagline: string | null;
    description: string | null;
    developmentType: string;
    city: string;
    province: string;
    images: string[];
  };
  inventory: {
    mode: 'aggregate' | 'itemized';
    /** Present only when the scope is safe for marketability; sold-out has no mode entries. */
    phaseScope: 'phase-released' | 'development-wide' | 'unscoped-hidden';
    /** Independent sale/rent marketable totals; an absent mode means no marketable quantity for that mode. */
    modes: Partial<Record<DevelopmentSalesMode, DevelopmentSalesModeProjection>>;
    phases: Array<{ id: number; name: string; phaseNumber: number }>;
    unitTypes: Array<{
      id: string;
      name: string;
      description: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      size: number | null;
      imageUrl: string | null;
      modes: Partial<Record<DevelopmentSalesMode, DevelopmentSalesModeProjection>>;
    }>;
  };
  contacts: Array<{
    id: number;
    phaseId: number | null;
    phaseName: string | null;
    roleTitle: string;
    displayName: string;
    organizationName: string | null;
    email: string | null;
    phone: string | null;
    responsibility: string | null;
  }>;
  resources: Array<{
    id: number;
    title: string;
    documentType: string;
    category: string;
    version: number;
    downloadable: boolean;
  }>;
}

type PriceRange = { from: number; to: number };
type MutableModeProjection = {
  count: number;
  minimum: number;
  maximum: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeCount(value: unknown): number {
  const parsed = safeNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parseCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      const nested: unknown = JSON.parse(parsed);
      return Array.isArray(nested) ? nested : [];
    }
  } catch {
    return [];
  }
  return [];
}

function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 2048 || normalized.startsWith('//')) return null;
  try {
    if (normalized.startsWith('/')) {
      const parsed = new URL(normalized, 'https://property-listify.invalid');
      return parsed.origin === 'https://property-listify.invalid' ? normalized : null;
    }
    const parsed = new URL(normalized);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function extractImages(value: unknown): string[] {
  const urls = parseCollection(value)
    .map(item => {
      if (typeof item === 'string') return safeMediaUrl(item);
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      if (record.type && record.type !== 'image') return null;
      return safeMediaUrl(record.url ?? record.imageUrl ?? record.fileUrl);
    })
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

function primaryUnitImage(value: unknown): string | null {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const gallery = parseCollection(record.gallery);
  for (const item of gallery) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const media = item as Record<string, unknown>;
    if (media.type && media.type !== 'image') continue;
    const url = safeMediaUrl(media.url ?? media.imageUrl);
    if (url) return url;
  }
  return null;
}

function effectivePriceRange(
  mode: DevelopmentSalesMode,
  item: DevelopmentInventoryPriceSource,
  unitType: { basePriceFrom?: unknown; basePriceTo?: unknown; monthlyRentFrom?: unknown; monthlyRentTo?: unknown },
): PriceRange | null {
  if (!hasValidDevelopmentInventoryMarketPrice(item, unitType)) return null;
  const override = safeNumber(mode === 'for_rent' ? item.rentPrice : item.salePrice);
  if (override !== null && override > 0) return { from: override, to: override };

  const from = safeNumber(mode === 'for_rent' ? unitType.monthlyRentFrom : unitType.basePriceFrom);
  const to = safeNumber(mode === 'for_rent' ? unitType.monthlyRentTo : unitType.basePriceTo);
  if (from === null || from <= 0 || (to !== null && to < from)) return null;
  return { from, to: to !== null && to > 0 ? to : from };
}

function addMode(
  target: Partial<Record<DevelopmentSalesMode, MutableModeProjection>>,
  mode: DevelopmentSalesMode,
  count: number,
  range: PriceRange,
) {
  if (count <= 0) return;
  const existing = target[mode];
  const priceBasis = mode === 'for_rent' ? 'monthly_rent' : 'purchase_price';
  if (!existing) {
    target[mode] = { count, minimum: range.from, maximum: range.to, priceBasis };
    return;
  }
  existing.count += count;
  existing.minimum = Math.min(existing.minimum, range.from);
  existing.maximum = Math.max(existing.maximum, range.to);
}

function finalizeModes(
  modes: Partial<Record<DevelopmentSalesMode, MutableModeProjection>>,
): Partial<Record<DevelopmentSalesMode, DevelopmentSalesModeProjection>> {
  const finalized: Partial<Record<DevelopmentSalesMode, DevelopmentSalesModeProjection>> = {};
  for (const mode of ['for_sale', 'for_rent'] as const) {
    const value = modes[mode];
    if (!value || value.count <= 0) continue;
    finalized[mode] = {
      availableCount: value.count,
      priceFrom: value.minimum,
      priceTo: value.maximum,
      priceBasis: value.priceBasis,
    };
  }
  return finalized;
}

/**
 * Read-only Developer-owned contract for Distribution and other server-side
 * consumers. It exposes released, priced quantities, never item allocations,
 * internal identifiers, buyer data, or document storage URLs.
 */
export async function getDevelopmentSalesProjection(
  developmentId: number,
): Promise<DevelopmentSalesProjection | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [development] = await db
    .select({
      id: developments.id,
      publisherId: developments.cataloguePublisherId,
      name: developments.name,
      marketingName: developments.marketingName,
      tagline: developments.tagline,
      description: developments.description,
      developmentType: developments.developmentType,
      city: developments.city,
      province: developments.province,
      images: developments.images,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      lifecycle: developments.status,
      inventoryMode: developments.inventoryMode,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  if (!development) return null;

  const [phaseRows, unitTypeRows] = await Promise.all([
    db
      .select({
        id: developmentPhases.id,
        name: developmentPhases.name,
        phaseNumber: developmentPhases.phaseNumber,
        status: developmentPhases.status,
        archivedAt: developmentPhases.archivedAt,
      })
      .from(developmentPhases)
      .where(eq(developmentPhases.developmentId, developmentId))
      .orderBy(asc(developmentPhases.phaseNumber), asc(developmentPhases.id)),
    db
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        isActive: unitTypes.isActive,
        bedrooms: unitTypes.bedrooms,
        bathrooms: unitTypes.bathrooms,
        unitSize: unitTypes.unitSize,
        description: unitTypes.description,
        baseMedia: unitTypes.baseMedia,
        basePriceFrom: unitTypes.basePriceFrom,
        basePriceTo: unitTypes.basePriceTo,
        monthlyRentFrom: unitTypes.monthlyRentFrom,
        monthlyRentTo: unitTypes.monthlyRentTo,
        availableForSaleUnits: unitTypes.availableForSaleUnits,
        availableForRentUnits: unitTypes.availableForRentUnits,
        availableSalePriceFrom: unitTypes.availableSalePriceFrom,
        availableSalePriceTo: unitTypes.availableSalePriceTo,
        availableRentPriceFrom: unitTypes.availableRentPriceFrom,
        availableRentPriceTo: unitTypes.availableRentPriceTo,
        displayOrder: unitTypes.displayOrder,
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId))
      .orderBy(asc(unitTypes.displayOrder), asc(unitTypes.name), asc(unitTypes.id)),
  ]);

  const publicationVisible =
    Number(development.isPublished) === 1 &&
    development.approvalStatus === 'approved' &&
    development.publisherId !== null;
  // Publication controls whether the campaign itself can be shown. Inventory
  // marketability has a separate lifecycle gate: without a mode-specific
  // lifecycle contract, only a selling development may expose sale or rental
  // availability. In particular, sold-out never implies rentable stock.
  const inventoryMarketabilityEnabled =
    publicationVisible && development.lifecycle === 'selling';
  const eligiblePhaseRows =
    inventoryMarketabilityEnabled
      ? phaseRows.filter(phase => phase.status === 'selling' && phase.archivedAt === null)
      : [];
  const eligiblePhaseIds = new Set<number>(
    eligiblePhaseRows.map(phase => Number(phase.id)),
  );

  const modesByUnitType = new Map<
    string,
    Partial<Record<DevelopmentSalesMode, MutableModeProjection>>
  >();
  const totalModes: Partial<Record<DevelopmentSalesMode, MutableModeProjection>> = {};
  const activeUnitTypes = unitTypeRows.filter(unitType => Number(unitType.isActive) === 1);
  const unitTypeById = new Map<string, (typeof activeUnitTypes)[number]>(
    activeUnitTypes.map(unitType => [String(unitType.id), unitType] as const),
  );
  let phaseScope: DevelopmentSalesProjection['inventory']['phaseScope'] = 'unscoped-hidden';

  if (inventoryMarketabilityEnabled && development.inventoryMode === 'itemized') {
    if (eligiblePhaseIds.size > 0) {
      phaseScope = 'phase-released';
      const availableItems = await db
        .select({
          phaseId: developmentInventoryItems.phaseId,
          unitTypeId: developmentInventoryItems.unitTypeId,
          transactionType: developmentInventoryItems.transactionType,
          salePrice: developmentInventoryItems.salePrice,
          rentPrice: developmentInventoryItems.rentPrice,
        })
        .from(developmentInventoryItems)
        .where(
          and(
            eq(developmentInventoryItems.developmentId, developmentId),
            eq(developmentInventoryItems.status, 'available'),
            inArray(developmentInventoryItems.phaseId, [...eligiblePhaseIds]),
          ),
        );

      for (const item of availableItems) {
        const mode: DevelopmentSalesMode =
          item.transactionType === 'for_rent' ? 'for_rent' : 'for_sale';
        const unitType = unitTypeById.get(String(item.unitTypeId));
        if (!unitType) continue;
        const range = effectivePriceRange(mode, item, unitType);
        if (!range) continue;

        const perType = modesByUnitType.get(String(unitType.id)) || {};
        addMode(perType, mode, 1, range);
        modesByUnitType.set(String(unitType.id), perType);
        addMode(totalModes, mode, 1, range);
      }
    }
  } else if (inventoryMarketabilityEnabled && development.inventoryMode === 'aggregate') {
    const aggregateScopeIsSafe =
      phaseRows.length === 0 ||
      (eligiblePhaseRows.length === phaseRows.length && eligiblePhaseIds.size > 0);
    phaseScope = aggregateScopeIsSafe ? 'development-wide' : 'unscoped-hidden';

    if (aggregateScopeIsSafe) {
      for (const unitType of activeUnitTypes) {
        const perType: Partial<Record<DevelopmentSalesMode, MutableModeProjection>> = {};
        const aggregateModes = [
          {
            mode: 'for_sale' as const,
            count: safeCount(unitType.availableForSaleUnits),
            storedFrom: unitType.availableSalePriceFrom,
            storedTo: unitType.availableSalePriceTo,
            baseFrom: unitType.basePriceFrom,
            baseTo: unitType.basePriceTo,
          },
          {
            mode: 'for_rent' as const,
            count: safeCount(unitType.availableForRentUnits),
            storedFrom: unitType.availableRentPriceFrom,
            storedTo: unitType.availableRentPriceTo,
            baseFrom: unitType.monthlyRentFrom,
            baseTo: unitType.monthlyRentTo,
          },
        ];

        for (const candidate of aggregateModes) {
          if (candidate.count <= 0) continue;
          const storedFrom = safeNumber(candidate.storedFrom);
          const from = storedFrom ?? safeNumber(candidate.baseFrom);
          const to =
            storedFrom !== null
              ? safeNumber(candidate.storedTo) ?? from
              : safeNumber(candidate.baseTo) ?? from;
          if (from === null || from <= 0 || to === null || to < from) continue;
          addMode(perType, candidate.mode, candidate.count, { from, to });
          addMode(totalModes, candidate.mode, candidate.count, { from, to });
        }
        if (Object.keys(perType).length > 0) modesByUnitType.set(String(unitType.id), perType);
      }
    }
  }

  const publishedPhaseRows = publicationVisible ? eligiblePhaseRows : [];
  const contacts = publicationVisible
    ? await db
        .select({
          id: developmentTeamContacts.id,
          phaseId: developmentTeamContacts.phaseId,
          roleTitle: developmentTeamContacts.roleTitle,
          displayName: developmentTeamContacts.displayName,
          organizationName: developmentTeamContacts.organizationName,
          email: developmentTeamContacts.email,
          phone: developmentTeamContacts.phone,
          responsibility: developmentTeamContacts.responsibility,
        })
        .from(developmentTeamContacts)
        .where(
          and(
            eq(developmentTeamContacts.developmentId, developmentId),
            eq(developmentTeamContacts.visibleToPartners, 1),
            eq(developmentTeamContacts.isActive, 1),
          ),
        )
        .orderBy(
          asc(developmentTeamContacts.displayOrder),
          asc(developmentTeamContacts.roleTitle),
          asc(developmentTeamContacts.id),
        )
    : [];
  const partnerContacts = contacts
    .filter(contact => contact.phaseId === null || eligiblePhaseIds.has(Number(contact.phaseId)))
    .map(contact => ({
      id: Number(contact.id),
      phaseId: contact.phaseId === null ? null : Number(contact.phaseId),
      phaseName:
        contact.phaseId === null
          ? null
          : eligiblePhaseRows.find(phase => Number(phase.id) === Number(contact.phaseId))?.name || null,
      roleTitle: String(contact.roleTitle),
      displayName: String(contact.displayName),
      organizationName: contact.organizationName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      responsibility: contact.responsibility || null,
    }));

  const documentRows = publicationVisible
    ? await db
        .select({
          id: developmentDocuments.id,
          title: developmentDocuments.title,
          documentType: developmentDocuments.documentType,
          category: developmentDocuments.category,
          visibility: developmentDocuments.visibility,
          version: developmentDocuments.version,
          downloadable: developmentDocuments.downloadable,
          isActive: developmentDocuments.isActive,
        })
        .from(developmentDocuments)
        .where(
          and(
            eq(developmentDocuments.developmentId, developmentId),
            inArray(developmentDocuments.visibility, ['referrer', 'public']),
            inArray(developmentDocuments.category, ['sales_asset', 'technical_asset']),
            eq(developmentDocuments.isActive, 1),
          ),
        )
        .orderBy(asc(developmentDocuments.documentType), asc(developmentDocuments.title), asc(developmentDocuments.id))
    : [];

  const unitTypeProjections = activeUnitTypes.flatMap(unitType => {
    const modes = modesByUnitType.get(String(unitType.id));
    if (!modes) return [];
    return [
      {
        id: String(unitType.id),
        name: String(unitType.name),
        description: unitType.description || null,
        bedrooms: safeNumber(unitType.bedrooms),
        bathrooms: safeNumber(unitType.bathrooms),
        size: safeNumber(unitType.unitSize),
        imageUrl: primaryUnitImage(unitType.baseMedia),
        modes: finalizeModes(modes),
      },
    ];
  });

  const observedAt = new Date().toISOString();
  const payload = {
    contractVersion: 1 as const,
    developmentId: Number(development.id),
    publisherId: development.publisherId === null ? null : Number(development.publisherId),
    campaign: {
      // Publication is independent of lifecycle and marketable inventory.
      // Distribution still enforces its active opportunity and actor entitlement.
      visible: publicationVisible,
      lifecycle: development.lifecycle,
      name: publicationVisible ? String(development.marketingName || development.name) : '',
      tagline: publicationVisible ? development.tagline || null : null,
      description: publicationVisible ? development.description || null : null,
      developmentType: publicationVisible ? String(development.developmentType) : '',
      city: publicationVisible ? String(development.city) : '',
      province: publicationVisible ? String(development.province) : '',
      images: publicationVisible ? extractImages(development.images) : [],
    },
    inventory: {
      mode: development.inventoryMode,
      phaseScope,
      modes: inventoryMarketabilityEnabled ? finalizeModes(totalModes) : {},
      phases: publishedPhaseRows.map(phase => ({
        id: Number(phase.id),
        name: String(phase.name),
        phaseNumber: Number(phase.phaseNumber),
      })),
      unitTypes: inventoryMarketabilityEnabled ? unitTypeProjections : [],
    },
    contacts: publicationVisible ? partnerContacts : [],
    resources: publicationVisible
      ? documentRows.map(document => ({
          id: Number(document.id),
          title: String(document.title),
          documentType: String(document.documentType),
          category: String(document.category),
          version: Number(document.version),
          downloadable: Number(document.downloadable) === 1,
        }))
      : [],
  };
  const revision = `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;

  return {
    ...payload,
    observedAt,
    revision,
  };
}

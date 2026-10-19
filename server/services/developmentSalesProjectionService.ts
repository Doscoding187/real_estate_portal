import { createHash } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import {
  cataloguePublishers,
  developmentPhases,
  developmentSupersessions,
  developmentTeamContacts,
  developments,
  developerOrganisationMemberships,
  developerOrganisations,
  unitTypes,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { evaluatePublicDevelopmentEligibility } from './publicDevelopmentEligibility';
import { getDeveloperPublicationAccess } from './developerPublicationAccess';
import {
  resolveDistributionPreviewDemoInventory,
  type DistributionPreviewDemoUnitType,
} from './distributionPreviewDemoInventory';

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
    /** Publication eligibility only; this does not assert marketable stock. */
    visible: boolean;
    /** Lifecycle is separate; sold-out never implies rental availability. */
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
    /** Stock remains hidden until a governed release/state-change authority exists. */
    phaseScope: 'phase-released' | 'development-wide' | 'unscoped-hidden';
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
    displayName: string;
    roleTitle: string | null;
    phaseName: string | null;
    organizationName: string | null;
    email: string | null;
    phone: string | null;
  }>;
  /** Delivery is unavailable here; metadata must not imply a downloadable grant. */
  resources: [];
}

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048 || candidate.startsWith('//')) return null;
  if (candidate.startsWith('/')) return candidate;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function publicImageUrls(value: unknown): string[] {
  let entries: unknown[] = [];
  if (Array.isArray(value)) {
    entries = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      entries = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      entries = [value];
    }
  }

  const urls = entries.flatMap(entry => {
    if (typeof entry === 'string') {
      const url = safeImageUrl(entry);
      return url ? [url] : [];
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const image = entry as { type?: unknown; url?: unknown; imageUrl?: unknown; src?: unknown };
    if (image.type && image.type !== 'image') return [];
    const url = safeImageUrl(image.url ?? image.imageUrl ?? image.src);
    return url ? [url] : [];
  });
  return [...new Set(urls)];
}

function revisionFor(payload: Omit<DevelopmentSalesProjection, 'observedAt' | 'revision'>): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')}`;
}

function toDistributionPreviewDemoUnitType(row: {
  id: string;
  name: string;
  description: string | null;
  bedrooms: number;
  bathrooms: string;
  unitSize: number | null;
  basePriceFrom: string;
  basePriceTo: string | null;
  availableUnits: number;
  isActive: number | null;
}): DistributionPreviewDemoUnitType {
  const numeric = (value: string | null): number | null => {
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description || null,
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    unitSize: row.unitSize === null ? null : Number(row.unitSize),
    basePriceFrom: numeric(row.basePriceFrom),
    basePriceTo: numeric(row.basePriceTo),
    availableUnits: Number(row.availableUnits || 0),
    isActive: Number(row.isActive || 0) === 1,
  };
}

/**
 * Developer-owned read boundary for Distribution and other server consumers.
 * Campaign publication uses the canonical Developer eligibility policy.
 * Inventory remains fail-closed until phase/batch release and inventory state
 * changes are written through an authorized, audited Developer command.
 */
export async function getDevelopmentSalesProjection(
  developmentId: number,
): Promise<DevelopmentSalesProjection | null> {
  if (!Number.isSafeInteger(developmentId) || developmentId <= 0) {
    throw new Error('Development ID must be a positive safe integer.');
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [row] = await db
    .select({
      development: {
        id: developments.id,
        cataloguePublisherId: developments.cataloguePublisherId,
        name: developments.name,
        marketingName: developments.marketingName,
        slug: developments.slug,
        tagline: developments.tagline,
        description: developments.description,
        developmentType: developments.developmentType,
        transactionType: developments.transactionType,
        city: developments.city,
        province: developments.province,
        images: developments.images,
        status: developments.status,
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
        inventoryMode: developments.inventoryMode,
      },
      publisher: {
        id: cataloguePublishers.id,
        authorityKind: cataloguePublishers.authorityKind,
        developerOrganisationId: cataloguePublishers.developerOrganisationId,
        isVisible: cataloguePublishers.isVisible,
        sourceAttribution: cataloguePublishers.sourceAttribution,
      },
      organisation: {
        id: developerOrganisations.id,
        status: developerOrganisations.status,
      },
    })
    .from(developments)
    .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
    .leftJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!row) return null;

  const [unitTypeRows, activeOperatorRows, activeSupersessionRows] = await Promise.all([
    db
      .select({
        id: unitTypes.id,
        developmentId: unitTypes.developmentId,
        isActive: unitTypes.isActive,
        name: unitTypes.name,
        description: unitTypes.description,
        bedrooms: unitTypes.bedrooms,
        bathrooms: unitTypes.bathrooms,
        unitSize: unitTypes.unitSize,
        basePriceFrom: unitTypes.basePriceFrom,
        basePriceTo: unitTypes.basePriceTo,
        availableUnits: unitTypes.availableUnits,
        displayOrder: unitTypes.displayOrder,
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId))
      .orderBy(asc(unitTypes.displayOrder), asc(unitTypes.id)),
    row.publisher?.developerOrganisationId == null
      ? Promise.resolve([{ activeOperatorCount: 0 }])
      : db
          .select({ activeOperatorCount: count() })
          .from(developerOrganisationMemberships)
          .where(
            and(
              eq(
                developerOrganisationMemberships.organisationId,
                row.publisher.developerOrganisationId,
              ),
              eq(developerOrganisationMemberships.status, 'active'),
            ),
          ),
    db
      .select({ id: developmentSupersessions.id })
      .from(developmentSupersessions)
      .where(
        and(
          eq(developmentSupersessions.sourceDevelopmentId, developmentId),
          eq(developmentSupersessions.status, 'active'),
        ),
      )
      .limit(1),
  ]);

  const commercialAccess =
    row.publisher?.authorityKind === 'developer_first_party' &&
    row.publisher.developerOrganisationId !== null
      ? await getDeveloperPublicationAccess(row.publisher.developerOrganisationId, { db })
      : null;
  const publication = evaluatePublicDevelopmentEligibility({
    development: {
      id: row.development.id,
      cataloguePublisherId: row.development.cataloguePublisherId,
      developmentType: row.development.developmentType,
      transactionType: row.development.transactionType,
      isPublished: row.development.isPublished,
      approvalStatus: row.development.approvalStatus,
    },
    publisher: row.publisher,
    organisation: row.organisation,
    unitTypes: unitTypeRows,
    activeUnitTypeCount: unitTypeRows.filter(unitType => Number(unitType.isActive) === 1).length,
    commercialAccess: commercialAccess?.eligible ?? false,
    activeOperatorCount: Number(activeOperatorRows[0]?.activeOperatorCount ?? 0),
    activeSupersessionSource: activeSupersessionRows.length > 0,
  });
  const publicationVisible = publication.eligible;

  // Synthetic stock is exposed only for an exactly governed preview demo
  // development; real inventory stays fail-closed to the unscoped-hidden shape.
  const demoInventory = publicationVisible
    ? resolveDistributionPreviewDemoInventory({
        development: {
          slug: row.development.slug,
          transactionType: row.development.transactionType,
          isPublished: row.development.isPublished,
          approvalStatus: row.development.approvalStatus,
          inventoryMode: row.development.inventoryMode,
        },
        publisher: row.publisher
          ? {
              authorityKind: row.publisher.authorityKind,
              isVisible: row.publisher.isVisible,
              sourceAttribution: row.publisher.sourceAttribution,
            }
          : null,
        unitTypes: unitTypeRows.map(toDistributionPreviewDemoUnitType),
        activeSupersession: activeSupersessionRows.length > 0,
      })
    : null;

  const activePhases =
    publicationVisible && row.development.status === 'selling'
      ? await db
          .select({
            id: developmentPhases.id,
            name: developmentPhases.name,
            phaseNumber: developmentPhases.phaseNumber,
          })
          .from(developmentPhases)
          .where(
            and(
              eq(developmentPhases.developmentId, developmentId),
              eq(developmentPhases.status, 'selling'),
              isNull(developmentPhases.archivedAt),
            ),
          )
          .orderBy(asc(developmentPhases.phaseNumber), asc(developmentPhases.id))
      : [];
  const activePhaseIds = new Set(activePhases.map(phase => Number(phase.id)));

  const partnerContactRows =
    publicationVisible && row.development.status !== 'sold-out'
      ? await db
          .select({
            id: developmentTeamContacts.id,
            phaseId: developmentTeamContacts.phaseId,
            displayName: developmentTeamContacts.displayName,
            roleTitle: developmentTeamContacts.roleTitle,
            organizationName: developmentTeamContacts.organizationName,
            email: developmentTeamContacts.email,
            phone: developmentTeamContacts.phone,
          })
          .from(developmentTeamContacts)
          .where(
            and(
              eq(developmentTeamContacts.developmentId, developmentId),
              eq(developmentTeamContacts.visibleToPartners, 1),
              eq(developmentTeamContacts.isActive, 1),
            ),
          )
          // Contact order is part of the projection revision; use stable keys.
          .orderBy(asc(developmentTeamContacts.phaseId), asc(developmentTeamContacts.id))
      : [];
  const contacts = partnerContactRows
    .filter(contact => contact.phaseId === null || activePhaseIds.has(Number(contact.phaseId)))
    .map(contact => ({
      id: Number(contact.id),
      displayName: String(contact.displayName),
      roleTitle: String(contact.roleTitle),
      phaseName:
        contact.phaseId === null
          ? null
          : activePhases.find(phase => Number(phase.id) === Number(contact.phaseId))?.name || null,
      organizationName: contact.organizationName || null,
      email: contact.email || null,
      phone: contact.phone || null,
    }));

  const payload = {
    contractVersion: 1 as const,
    developmentId: Number(row.development.id),
    publisherId:
      row.development.cataloguePublisherId === null
        ? null
        : Number(row.development.cataloguePublisherId),
    campaign: {
      // Publication, lifecycle, and inventory marketability are independent facts.
      visible: publicationVisible,
      lifecycle: row.development.status,
      name: publicationVisible ? String(row.development.marketingName || row.development.name) : '',
      tagline: publicationVisible ? row.development.tagline || null : null,
      description: publicationVisible ? row.development.description || null : null,
      developmentType: publicationVisible ? String(row.development.developmentType) : '',
      city: publicationVisible ? String(row.development.city) : '',
      province: publicationVisible ? String(row.development.province) : '',
      images: publicationVisible ? publicImageUrls(row.development.images) : [],
    },
    inventory:
      demoInventory ??
      ({
        mode: row.development.inventoryMode,
        phaseScope: 'unscoped-hidden' as const,
        modes: {} as Partial<Record<DevelopmentSalesMode, DevelopmentSalesModeProjection>>,
        phases: [] as Array<{ id: number; name: string; phaseNumber: number }>,
        unitTypes: [] as DevelopmentSalesProjection['inventory']['unitTypes'],
      } as const),
    contacts,
    resources: [] as [],
  };
  const observedAt = new Date().toISOString();

  return {
    ...payload,
    observedAt,
    revision: revisionFor(payload),
  };
}

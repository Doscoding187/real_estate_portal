import { createHash } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';

import {
  cataloguePublishers,
  developmentSupersessions,
  developments,
  developerOrganisationMemberships,
  developerOrganisations,
  unitTypes,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { evaluatePublicDevelopmentEligibility } from './publicDevelopmentEligibility';
import { getDeveloperPublicationAccess } from './developerPublicationAccess';

export type DevelopmentSalesMode = 'for_sale' | 'for_rent';

export type DevelopmentSalesModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

export type DevelopmentSalesProjection = {
  contractVersion: 1;
  developmentId: number;
  publisherId: number | null;
  observedAt: string;
  revision: string;
  campaign: {
    /** Publication eligibility only; this does not assert that inventory is marketable. */
    visible: boolean;
    /** Commercial lifecycle is reported independently and never opens inventory. */
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
    /** Aggregate stock without a phase/release link is deliberately hidden. */
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
};

type ProjectionDevelopment = Pick<
  typeof developments.$inferSelect,
  | 'id'
  | 'cataloguePublisherId'
  | 'name'
  | 'tagline'
  | 'description'
  | 'developmentType'
  | 'city'
  | 'province'
  | 'images'
  | 'status'
  | 'approvalStatus'
  | 'isPublished'
>;

function imageUrls(value: unknown): string[] {
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

  return entries.flatMap(entry => {
    const candidate =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object'
          ? ((entry as { url?: unknown; src?: unknown }).url ?? (entry as { src?: unknown }).src)
          : null;
    if (typeof candidate !== 'string') return [];
    const url = candidate.trim();
    return /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//')) ? [url] : [];
  });
}

function revisionFor(value: Omit<DevelopmentSalesProjection, 'observedAt' | 'revision'>): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

/**
 * Developer-owned read boundary for Distribution and other server consumers.
 *
 * The canonical model still has aggregate unit-type inventory, but it has no
 * authoritative link from that stock to a phase or release batch. Returning
 * those counts as marketable would publish inventory that may be planned,
 * reserved, sold, or assigned elsewhere. Until the controlled release model
 * supplies that link, inventory is deliberately hidden here.
 */
export async function getDevelopmentSalesProjection(
  developmentId: number,
): Promise<DevelopmentSalesProjection | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [row] = await db
    .select({
      development: {
        id: developments.id,
        cataloguePublisherId: developments.cataloguePublisherId,
        name: developments.name,
        tagline: developments.tagline,
        description: developments.description,
        developmentType: developments.developmentType,
        city: developments.city,
        province: developments.province,
        images: developments.images,
        status: developments.status,
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
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
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId)),
    row.publisher?.developerOrganisationId === null ||
    row.publisher?.developerOrganisationId === undefined
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
  const eligibility = evaluatePublicDevelopmentEligibility({
    development: row.development,
    publisher: row.publisher,
    organisation: row.organisation,
    unitTypes: unitTypeRows,
    activeUnitTypeCount: unitTypeRows.filter(unitType => Number(unitType.isActive) === 1).length,
    commercialAccess: commercialAccess?.eligible ?? false,
    activeOperatorCount: Number(activeOperatorRows[0]?.activeOperatorCount ?? 0),
    activeSupersessionSource: activeSupersessionRows.length > 0,
  });
  const visible = eligibility.eligible;

  const campaign = {
    visible,
    lifecycle: row.development.status,
    name: visible ? row.development.name : '',
    tagline: visible ? (row.development.tagline ?? null) : null,
    description: visible ? (row.development.description ?? null) : null,
    developmentType: row.development.developmentType,
    city: visible ? row.development.city : '',
    province: visible ? row.development.province : '',
    images: visible ? imageUrls(row.development.images) : [],
  } satisfies DevelopmentSalesProjection['campaign'];

  const inventory: DevelopmentSalesProjection['inventory'] = {
    mode: 'aggregate',
    phaseScope: 'unscoped-hidden',
    modes: {},
    phases: [],
    unitTypes: [],
  };
  const projectionWithoutRevision = {
    contractVersion: 1 as const,
    developmentId,
    publisherId: row.development.cataloguePublisherId ?? null,
    campaign,
    inventory,
    // The canonical schema in this branch has no phase-scoped partner contact
    // directory or revocable resource-delivery authority yet.
    contacts: [],
    resources: [],
  };
  const projection: DevelopmentSalesProjection = {
    ...projectionWithoutRevision,
    observedAt: new Date().toISOString(),
    revision: revisionFor(projectionWithoutRevision),
  };

  return projection;
}

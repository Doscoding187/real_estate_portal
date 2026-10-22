import { TRPCError } from '@trpc/server';
import { and, eq, inArray, type SQL } from 'drizzle-orm';

import { cataloguePublishers, distributionDevelopmentAccess } from '../../drizzle/schema';
import { getDb } from '../db';
import { listDevelopmentSalesWorkspaceReferences } from './developmentSalesWorkspaceService';
import {
  evaluateDevelopmentDistributionAccess,
  type DevelopmentDistributionAccessEvaluation,
} from './distributionAccessPolicy';
import {
  getBrandPartnershipByPublisherId,
  getDevelopmentAccessByDevelopmentId,
} from './distributionAccessRepository';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type InventoryStateCounts = Record<
  DevelopmentDistributionAccessEvaluation['inventoryState'],
  number
>;

function buildInventoryStateCounts(): InventoryStateCounts {
  return {
    hidden: 0,
    listed: 0,
    accessible: 0,
    ready: 0,
    enabled: 0,
  };
}

async function listLinkedDevelopmentIdsForBrand(db: DbHandle, cataloguePublisherId: number) {
  const references: Awaited<ReturnType<typeof listDevelopmentSalesWorkspaceReferences>> = [];
  for (let offset = 0; ; offset += 100) {
    const page = await listDevelopmentSalesWorkspaceReferences({ publisherId: cataloguePublisherId, limit: 100, offset });
    references.push(...page);
    if (page.length < 100) break;
  }
  return references.map(reference => reference.developmentId);
}

export async function getBrandPartnershipDetails(db: DbHandle, cataloguePublisherId: number) {
  const [brand] = await db
    .select({
      id: cataloguePublishers.id,
      brandName: cataloguePublishers.name,
      slug: cataloguePublishers.slug,
      isVisible: cataloguePublishers.isVisible,
      ownerType: cataloguePublishers.authorityKind,
    })
    .from(cataloguePublishers)
    .where(eq(cataloguePublishers.id, cataloguePublisherId))
    .limit(1);

  if (!brand) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Catalogue Publisher not found.' });
  }

  const entity = await getBrandPartnershipByPublisherId(db, cataloguePublisherId);
  const developmentIds = await listLinkedDevelopmentIdsForBrand(db, cataloguePublisherId);
  const evaluations = await Promise.all(
    developmentIds.map(developmentId =>
      evaluateDevelopmentDistributionAccess({
        db,
        developmentId,
        actor: { role: 'admin' },
        channel: 'admin_catalog',
      }),
    ),
  );

  const childAccessStatusCounts = {
    listed: 0,
    included: 0,
    excluded: 0,
    paused: 0,
  } as Record<'listed' | 'included' | 'excluded' | 'paused', number>;
  const childInventoryStateCounts = buildInventoryStateCounts();

  for (const evaluation of evaluations) {
    const accessStatus = evaluation.developmentAccessStatus;
    if (accessStatus && accessStatus in childAccessStatusCounts) {
      childAccessStatusCounts[accessStatus] += 1;
    }
    childInventoryStateCounts[evaluation.inventoryState] += 1;
  }

  return {
    brand: {
      id: Number(brand.id),
      brandName: String(brand.brandName || ''),
      slug: brand.slug || null,
      isVisible: Number(brand.isVisible || 0) === 1,
      ownerType: brand.ownerType || null,
    },
    entity,
    derivedState: {
      childAccessStatusCounts,
      childInventoryStateCounts,
      reasons: entity
        ? entity.status === 'active'
          ? []
          : [`brand_partnership_${entity.status}`]
        : ['missing_brand_partnership_row'],
    },
  };
}

export async function getDevelopmentAccessDetails(db: DbHandle, developmentId: number) {
  const [development] = await listDevelopmentSalesWorkspaceReferences({ developmentIds: [developmentId], limit: 1 });

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  return {
    development: {
      id: development.developmentId,
      name: development.displayName,
      city: development.city || null,
      province: development.province || null,
      cataloguePublisherId: development.publisherId,
      isPublished: development.isPublished,
      approvalStatus: development.approvalStatus,
    },
    entity: await getDevelopmentAccessByDevelopmentId(db, developmentId),
    evaluation: await evaluateDevelopmentDistributionAccess({
      db,
      developmentId,
      actor: { role: 'admin' },
      channel: 'admin_catalog',
    }),
  };
}

export async function listDevelopmentAccessDetails(
  db: DbHandle,
  filters: {
    cataloguePublisherId?: number;
    partnershipStatus?: Array<'pending' | 'active' | 'paused' | 'ended'>;
    accessStatus?: Array<'listed' | 'included' | 'excluded' | 'paused'>;
    submitReady?: boolean;
    search?: string;
    limit?: number;
  },
) {
  const conditions: SQL[] = [];
  if (typeof filters.cataloguePublisherId === 'number') {
    conditions.push(eq(distributionDevelopmentAccess.cataloguePublisherId, filters.cataloguePublisherId));
  }
  if (filters.accessStatus?.length) {
    conditions.push(inArray(distributionDevelopmentAccess.status, filters.accessStatus));
  }
  const accessRows = await db
    .select({
      developmentId: distributionDevelopmentAccess.developmentId,
    })
    .from(distributionDevelopmentAccess)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(Math.min(200, filters.limit ?? 200));
  const ids = [...new Set(accessRows.map(row => Number(row.developmentId)))];
  if (!ids.length) return [];
  const references = (await Promise.all(
    Array.from({ length: Math.ceil(ids.length / 100) }, (_, page) =>
      listDevelopmentSalesWorkspaceReferences({
        developmentIds: ids.slice(page * 100, (page + 1) * 100),
        limit: 100,
      }),
    ),
  )).flat();
  const referenceById = new Map(references.map(reference => [reference.developmentId, reference]));
  const search = filters.search?.trim().toLowerCase();

  const candidates = ids.flatMap(developmentId => {
    const row = referenceById.get(developmentId);
    if (!row) return [];
    if (search && ![row.displayName, row.name, row.city, row.province].some(value => value.toLowerCase().includes(search))) return [];
    return [{ developmentId, row }];
  });
  const evaluated = await Promise.all(
    candidates.map(async ({ developmentId, row }) => {
      const evaluation = await evaluateDevelopmentDistributionAccess({
        db,
        developmentId,
        actor: { role: 'admin' },
        channel: 'admin_catalog',
      });

      return {
        development: {
          id: row.developmentId,
          name: row.displayName,
          city: row.city || null,
          province: row.province || null,
          cataloguePublisherId: row.publisherId,
          isPublished: row.isPublished,
          approvalStatus: row.approvalStatus,
          status: row.lifecycle,
          updatedAt: row.updatedAt,
        },
        partnership: evaluation.cataloguePublisherId
          ? await getBrandPartnershipByPublisherId(db, evaluation.cataloguePublisherId)
          : null,
        access: await getDevelopmentAccessByDevelopmentId(db, developmentId),
        evaluation,
      };
    }),
  );

  return evaluated.filter(row => {
    if (filters.partnershipStatus?.length) {
      if (!row.evaluation.brandPartnershipStatus) return false;
      if (!filters.partnershipStatus.includes(row.evaluation.brandPartnershipStatus)) return false;
    }
    if (filters.accessStatus?.length) {
      if (!row.evaluation.developmentAccessStatus) return false;
      if (!filters.accessStatus.includes(row.evaluation.developmentAccessStatus)) return false;
    }
    if (
      typeof filters.submitReady === 'boolean' &&
      row.evaluation.submitReady !== filters.submitReady
    ) {
      return false;
    }
    return true;
  });
}

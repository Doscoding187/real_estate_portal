import { TRPCError } from '@trpc/server';
import { and, eq, like, or, type SQL } from 'drizzle-orm';

import { cataloguePublishers, developments } from '../../drizzle/schema';
import { getDb } from '../db';
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
  const rows = await db
    .select({ developmentId: developments.id })
    .from(developments)
    .where(eq(developments.cataloguePublisherId, cataloguePublisherId));

  return rows.map(row => Number(row.developmentId)).filter(Boolean);
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
      legacyFallbackUsed: evaluations.some(evaluation => evaluation.legacyFallbackUsed),
    },
  };
}

export async function getDevelopmentAccessDetails(db: DbHandle, developmentId: number) {
  const [development] = await db
    .select({
      id: developments.id,
      name: developments.name,
      city: developments.city,
      province: developments.province,
      cataloguePublisherId: developments.cataloguePublisherId,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  return {
    development: {
      id: Number(development.id),
      name: String(development.name || ''),
      city: development.city || null,
      province: development.province || null,
      cataloguePublisherId: development.cataloguePublisherId
        ? Number(development.cataloguePublisherId)
        : null,
      isPublished: Number(development.isPublished || 0) === 1,
      approvalStatus: development.approvalStatus || null,
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
    conditions.push(
      eq(developments.cataloguePublisherId, filters.cataloguePublisherId),
    );
  }

  const search = filters.search?.trim();
  if (search) {
    conditions.push(
      or(
        like(developments.name, `%${search}%`),
        like(developments.city, `%${search}%`),
        like(developments.province, `%${search}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: developments.id,
      name: developments.name,
      city: developments.city,
      province: developments.province,
      cataloguePublisherId: developments.cataloguePublisherId,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      status: developments.status,
      updatedAt: developments.updatedAt,
    })
    .from(developments)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(filters.limit ?? 200);

  const evaluated = await Promise.all(
    rows.map(async row => {
      const evaluation = await evaluateDevelopmentDistributionAccess({
        db,
        developmentId: Number(row.id),
        actor: { role: 'admin' },
        channel: 'admin_catalog',
      });

      return {
        development: {
          id: Number(row.id),
          name: String(row.name || ''),
          city: row.city || null,
          province: row.province || null,
          cataloguePublisherId: row.cataloguePublisherId
            ? Number(row.cataloguePublisherId)
            : null,
          isPublished: Number(row.isPublished || 0) === 1,
          approvalStatus: row.approvalStatus || null,
          status: row.status || null,
          updatedAt: row.updatedAt || null,
        },
        partnership: evaluation.cataloguePublisherId
          ? await getBrandPartnershipByPublisherId(db, evaluation.cataloguePublisherId)
          : null,
        access: await getDevelopmentAccessByDevelopmentId(db, Number(row.id)),
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

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import {
  getDevelopmentSalesWorkspaceReference,
  listDevelopmentSalesWorkspaceReferences,
  type DevelopmentSalesWorkspaceReference,
} from './distributionDeveloperReadPort';
import {
  evaluateDevelopmentDistributionAccess,
  type DevelopmentDistributionAccessEvaluation,
} from './distributionAccessPolicy';
import {
  getBrandPartnershipByPublisherId,
  getDevelopmentAccessByDevelopmentId,
  listDevelopmentAccess,
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

async function listPublisherReferences(publisherId: number) {
  const references: DevelopmentSalesWorkspaceReference[] = [];
  for (let offset = 0; offset < 10_000; offset += 100) {
    const page = await listDevelopmentSalesWorkspaceReferences({
      publisherId,
      limit: 100,
      offset,
    });
    references.push(...page);
    if (page.length < 100) return references;
  }
  throw new Error('Publisher development enumeration exceeded the administrative page limit.');
}

export async function getBrandPartnershipDetails(db: DbHandle, cataloguePublisherId: number) {
  const [entity, references] = await Promise.all([
    getBrandPartnershipByPublisherId(db, cataloguePublisherId),
    listPublisherReferences(cataloguePublisherId),
  ]);
  if (!references.length && !entity) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Catalogue Publisher not found.' });
  }

  const evaluations = await Promise.all(
    references.map(reference =>
      evaluateDevelopmentDistributionAccess({
        db,
        developmentId: reference.developmentId,
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

  const reference = references[0];
  return {
    brand: {
      id: cataloguePublisherId,
      brandName: reference?.publisherName || `Publisher ${cataloguePublisherId}`,
      ownerType: reference?.publisherAuthorityKind || null,
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
      legacyFallbackUsed: false,
    },
  };
}

export async function getDevelopmentAccessDetails(db: DbHandle, developmentId: number) {
  const reference = await getDevelopmentSalesWorkspaceReference(developmentId);
  if (!reference) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  return {
    development: {
      id: reference.developmentId,
      name: reference.displayName,
      canonicalPlaceId: reference.canonicalPlaceId,
      locationLabels: reference.locationLabels,
      cataloguePublisherId: reference.publisherId,
      isPublished: reference.isPublished,
      approvalStatus: reference.approvalStatus,
      lifecycle: reference.lifecycle,
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
  const rows = await listDevelopmentAccess(db, filters);
  const evaluated = await Promise.all(
    rows.map(async row => {
      const developmentId = Number(row.developmentId);
      const evaluation = await evaluateDevelopmentDistributionAccess({
        db,
        developmentId,
        actor: { role: 'admin' },
        channel: 'admin_catalog',
      });

      return {
        development: {
          id: developmentId,
          name: row.developmentName,
        canonicalPlaceId: row.canonicalPlaceId,
        locationLabels: row.locationLabels,
          cataloguePublisherId: row.cataloguePublisherId,
          publisherName: row.publisherName,
          isPublished: row.isPublished,
          approvalStatus: row.approvalStatus,
          lifecycle: row.lifecycle,
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

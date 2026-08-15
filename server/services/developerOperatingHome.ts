import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../db';
import {
  cataloguePublishers,
  developmentApprovalQueue,
  developerOrganisations,
  developments,
  unitTypes,
} from '../../drizzle/schema';
import {
  getOwnedDevelopmentHomeLeadSummary,
  type DevelopmentHomeRange,
} from './developerFunnelService';
import {
  buildDevelopmentHomeAttention,
  compareDevelopmentHomeAttentionItems,
  type DevelopmentHomeAttention,
  type DevelopmentHomeAttentionItem,
} from './developmentHomeAttention';
import {
  buildDevelopmentHomeInventory,
  type DevelopmentHomeInventory,
} from './developmentInventorySummary';
import {
  developerVisibleReviewFeedback,
  deriveDevelopmentHomeLifecycleState,
  isDevelopmentHomePublicEligible,
  type DevelopmentHomeLifecycleState,
  type DevelopmentHomeReadinessBlocker,
  type DevelopmentHomeReviewRow,
} from './developmentOperatingLifecycle';
import {
  getDeveloperPublicationAccess,
  type DeveloperPublicationAccess,
} from './developerPublicationAccess';
import { validatePersistedSubmissionReadiness } from './developmentSubmissionReadiness';
import { buildDevelopmentRootPath } from './developmentRouteAuthority';

export type DeveloperOperatingHomeScope =
  | {
      mode: 'developer';
      organisationId: number;
      cataloguePublisherId: number;
    }
  | {
      mode: 'platform_curator';
      cataloguePublisherId: number;
    };

export type DeveloperOperatingNextActionCode =
  | 'resolve_review_rejection'
  | 'review_requested_changes'
  | 'activate_launch_access'
  | 'respond_to_lead'
  | 'fix_readiness'
  | 'repair_inventory'
  | 'submit_for_review'
  | 'review_publication_status'
  | 'await_review'
  | 'view_published_development';

export type DeveloperOperatingNextAction = {
  code: DeveloperOperatingNextActionCode;
  label: string;
  explanation: string;
  href: string;
};

export type DeveloperOperatingAttentionItem = DevelopmentHomeAttentionItem & {
  developmentId: number;
  developmentName: string;
};

export type DeveloperOperatingDevelopmentSummary = {
  identity: {
    id: number;
    name: string;
    slug: string | null;
    imageUrl: string | null;
    location: {
      address: string | null;
      suburb: string | null;
      city: string;
      province: string;
    };
  };
  lifecycle: {
    state: DevelopmentHomeLifecycleState;
    approvalStatus: (typeof developments.$inferSelect)['approvalStatus'];
    isPublished: boolean;
    publishedAt: (typeof developments.$inferSelect)['publishedAt'];
    publicEligible: boolean;
    latestReview: {
      status: DevelopmentHomeReviewRow['status'];
      submittedAt: DevelopmentHomeReviewRow['submittedAt'];
      reviewedAt: DevelopmentHomeReviewRow['reviewedAt'];
      feedback: string | null;
    } | null;
  };
  readiness: {
    status: 'ready' | 'blocked';
    blockerCount: number;
    blockers: DevelopmentHomeReadinessBlocker[];
  };
  inventory: DevelopmentHomeInventory;
  leads: {
    range: DevelopmentHomeRange;
    capturedLeadCount: number;
    newLeadCount: number;
    openLeadCount: number;
    slaWarningCount: number;
    slaBreachCount: number;
  };
  attention: DevelopmentHomeAttention;
  publication: {
    publicEligible: boolean;
    commercialAccessRequired: boolean;
  };
  nextAction: DeveloperOperatingNextAction | null;
};

export type DeveloperOperatingHome = {
  range: DevelopmentHomeRange;
  commercialAccess: DeveloperPublicationAccess | null;
  portfolio: {
    developmentCount: number;
    lifecycleCounts: Record<DevelopmentHomeLifecycleState, number>;
    readiness: {
      readyDevelopmentCount: number;
      blockedDevelopmentCount: number;
    };
    inventory: {
      totalUnits: number | null;
      availableUnits: number | null;
      trackedDevelopmentCount: number;
      configuredDevelopmentCount: number;
    };
    leads: {
      capturedLeadCount: number;
      openLeadCount: number;
      slaWarningCount: number;
      slaBreachCount: number;
    };
    attentionCount: number;
    nextAction:
      | (DeveloperOperatingNextAction & {
          developmentId: number;
          developmentName: string;
        })
      | null;
  };
  developments: DeveloperOperatingDevelopmentSummary[];
  attention: DeveloperOperatingAttentionItem[];
};

type DevelopmentOperatingRow = Pick<
  typeof developments.$inferSelect,
  | 'id'
  | 'name'
  | 'slug'
  | 'address'
  | 'suburb'
  | 'city'
  | 'province'
  | 'transactionType'
  | 'approvalStatus'
  | 'isPublished'
  | 'publishedAt'
  | 'description'
  | 'images'
  | 'highlights'
  | 'ownershipType'
  | 'developmentType'
  | 'rejectionNote'
>;

type DeveloperOperatingLeadSummary = Awaited<ReturnType<typeof getOwnedDevelopmentHomeLeadSummary>>;
type OperatingDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type OperatingHomeDependencies = {
  database?: OperatingDatabase;
  now?: Date;
  getLeadSummary?: typeof getOwnedDevelopmentHomeLeadSummary;
  publicationAccess?: DeveloperPublicationAccess;
};

const lifecycleStates: DevelopmentHomeLifecycleState[] = [
  'live',
  'approved_private',
  'in_review',
  'changes_required',
  'rejected',
  'draft_ready_to_submit',
  'draft_action_required',
];

const attentionActionCodes: Record<
  DevelopmentHomeAttentionItem['type'],
  DeveloperOperatingNextActionCode
> = {
  review_rejected: 'resolve_review_rejection',
  review_changes_requested: 'review_requested_changes',
  commercial_access_required: 'activate_launch_access',
  lead_sla_breach: 'respond_to_lead',
  readiness_blockers: 'fix_readiness',
  catalogue_invalid: 'repair_inventory',
  zero_aggregate_availability: 'repair_inventory',
  lead_sla_warning: 'respond_to_lead',
};

const nextActionPriority: Record<DeveloperOperatingNextActionCode, number> = {
  resolve_review_rejection: 1,
  review_requested_changes: 2,
  activate_launch_access: 3,
  respond_to_lead: 4,
  fix_readiness: 5,
  repair_inventory: 6,
  submit_for_review: 7,
  review_publication_status: 8,
  await_review: 9,
  view_published_development: 10,
};

function parsePrimaryImageUrl(value: unknown): string | null {
  let entries: unknown[] = [];
  if (Array.isArray(value)) entries = value;
  else if (value && typeof value === 'object') entries = [value];
  else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      entries = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      entries = value.startsWith('http') || value.startsWith('/') ? [value] : [];
    }
  }

  for (const entry of entries) {
    const image = entry as { url?: unknown; key?: unknown; src?: unknown } | null;
    const url = typeof entry === 'string' ? entry : (image?.url ?? image?.key ?? image?.src);
    if (typeof url === 'string' && (url.trim().startsWith('http') || url.trim().startsWith('/'))) {
      return url.trim();
    }
  }
  return null;
}

function developmentWorkspaceHref(developmentId: number): string {
  return `/developer/developments/${developmentId}`;
}

function actionFromAttention(item: DevelopmentHomeAttentionItem): DeveloperOperatingNextAction {
  return {
    code: attentionActionCodes[item.type],
    label: item.actionLabel,
    explanation: item.explanation,
    href: item.href,
  };
}

export function buildDeveloperOperatingNextAction(input: {
  development: Pick<DevelopmentOperatingRow, 'id' | 'slug' | 'name'>;
  lifecycleState: DevelopmentHomeLifecycleState;
  publicEligible: boolean;
  commercialAccessRequired?: boolean;
  attention: DevelopmentHomeAttention;
}): DeveloperOperatingNextAction | null {
  const firstAttention = input.attention.items[0];
  if (firstAttention) return actionFromAttention(firstAttention);

  const editorHref = `/developer/create-development?id=${input.development.id}`;
  const workspaceHref = developmentWorkspaceHref(input.development.id);

  if (input.lifecycleState === 'draft_ready_to_submit') {
    return {
      code: 'submit_for_review',
      label: 'Submit for review',
      explanation: 'This development passes the persisted submission-readiness checks.',
      href: editorHref,
    };
  }

  if (input.lifecycleState === 'draft_action_required') {
    return {
      code: 'fix_readiness',
      label: 'Fix readiness blockers',
      explanation:
        'Complete the persisted development requirements before submitting it for review.',
      href: editorHref,
    };
  }

  if (input.lifecycleState === 'in_review') {
    return {
      code: 'await_review',
      label: 'View review status',
      explanation: 'This development is awaiting the canonical review decision.',
      href: workspaceHref,
    };
  }

  if (input.lifecycleState === 'approved_private') {
    if (input.commercialAccessRequired) {
      return {
        code: 'activate_launch_access',
        label: 'Activate Launch Access',
        explanation:
          'Launch Access is required before this approved development can be publicly eligible.',
        href: '/developer/plans',
      };
    }
    return {
      code: 'review_publication_status',
      label: 'Review publication status',
      explanation: 'The development is approved but is not currently published.',
      href: workspaceHref,
    };
  }

  if (input.lifecycleState === 'live' && input.publicEligible) {
    return {
      code: 'view_published_development',
      label: 'View published development',
      explanation: 'The development is approved, published, and eligible for public discovery.',
      href: buildDevelopmentRootPath(input.development),
    };
  }

  return null;
}

export function buildDevelopmentOperatingSummary(input: {
  development: DevelopmentOperatingRow;
  persistedUnitTypes: (typeof unitTypes.$inferSelect)[];
  reviewRows: DevelopmentHomeReviewRow[];
  leadSummary: DeveloperOperatingLeadSummary;
  commercialAccess?: DeveloperPublicationAccess | null;
}): DeveloperOperatingDevelopmentSummary {
  const blockers: DevelopmentHomeReadinessBlocker[] = validatePersistedSubmissionReadiness(
    input.development,
    input.persistedUnitTypes,
  ).map(blocker => ({ ...blocker, severity: 'critical' as const }));
  const inventory = buildDevelopmentHomeInventory(
    input.development,
    input.persistedUnitTypes,
    blockers,
  );
  const latestReviewRow = input.reviewRows[0] ?? null;
  const latestReview = latestReviewRow
    ? {
        status: latestReviewRow.status,
        submittedAt: latestReviewRow.submittedAt,
        reviewedAt: latestReviewRow.reviewedAt,
        feedback:
          developerVisibleReviewFeedback(latestReviewRow) ??
          (latestReviewRow.status === 'rejected'
            ? input.development.rejectionNote?.trim() || null
            : null),
      }
    : null;
  const currentReviewStatus =
    input.development.approvalStatus === 'draft' ? latestReview?.status : null;
  const commercialEligible = input.commercialAccess?.eligible ?? true;
  const publicEligible = isDevelopmentHomePublicEligible({
    ...input.development,
    commercialEligible,
  });
  const commercialAccessRequired =
    input.development.approvalStatus === 'approved' && !commercialEligible;
  const lifecycleState = deriveDevelopmentHomeLifecycleState({
    ...input.development,
    blockers,
    currentReviewStatus,
    currentChangesRequestedFeedback: latestReview?.feedback,
    commercialEligible,
  });
  const attention = buildDevelopmentHomeAttention({
    developmentId: input.development.id,
    range: input.leadSummary.demand.range,
    lifecycleState,
    latestReviewFeedback: latestReview?.feedback ?? null,
    blockers,
    inventory,
    funnel: input.leadSummary.funnel,
    commercialAccessRequired,
  });

  return {
    identity: {
      id: input.development.id,
      name: input.development.name,
      slug: input.development.slug ?? null,
      imageUrl: parsePrimaryImageUrl(input.development.images),
      location: {
        address: input.development.address ?? null,
        suburb: input.development.suburb ?? null,
        city: input.development.city,
        province: input.development.province,
      },
    },
    lifecycle: {
      state: lifecycleState,
      approvalStatus: input.development.approvalStatus,
      isPublished: Number(input.development.isPublished) === 1,
      publishedAt: input.development.publishedAt,
      publicEligible,
      latestReview,
    },
    readiness: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      blockerCount: blockers.length,
      blockers,
    },
    inventory,
    leads: {
      range: input.leadSummary.demand.range,
      capturedLeadCount: input.leadSummary.demand.capturedLeadCount,
      newLeadCount: input.leadSummary.demand.newLeadCount,
      openLeadCount: input.leadSummary.funnel.openLeadCount,
      slaWarningCount: input.leadSummary.funnel.slaWarningCount,
      slaBreachCount: input.leadSummary.funnel.slaBreachCount,
    },
    attention,
    publication: {
      publicEligible,
      commercialAccessRequired,
    },
    nextAction: buildDeveloperOperatingNextAction({
      development: input.development,
      lifecycleState,
      publicEligible,
      commercialAccessRequired,
      attention,
    }),
  };
}

function compareOperatingAttention(
  left: DeveloperOperatingAttentionItem,
  right: DeveloperOperatingAttentionItem,
): number {
  return (
    compareDevelopmentHomeAttentionItems(left, right) ||
    left.developmentName.localeCompare(right.developmentName) ||
    left.developmentId - right.developmentId
  );
}

export function buildDeveloperOperatingHome(input: {
  range: DevelopmentHomeRange;
  developments: DeveloperOperatingDevelopmentSummary[];
  commercialAccess?: DeveloperPublicationAccess | null;
}): DeveloperOperatingHome {
  const lifecycleCounts = Object.fromEntries(lifecycleStates.map(state => [state, 0])) as Record<
    DevelopmentHomeLifecycleState,
    number
  >;
  const attention = input.developments
    .flatMap(development =>
      development.attention.items.map(item => ({
        ...item,
        developmentId: development.identity.id,
        developmentName: development.identity.name,
      })),
    )
    .sort(compareOperatingAttention)
    .slice(0, 10);

  let capturedLeadCount = 0;
  let openLeadCount = 0;
  let slaWarningCount = 0;
  let slaBreachCount = 0;
  let readyDevelopmentCount = 0;
  let blockedDevelopmentCount = 0;
  let attentionCount = 0;

  for (const development of input.developments) {
    lifecycleCounts[development.lifecycle.state] += 1;
    if (development.readiness.status === 'ready') readyDevelopmentCount += 1;
    else blockedDevelopmentCount += 1;
    capturedLeadCount += development.leads.capturedLeadCount;
    openLeadCount += development.leads.openLeadCount;
    slaWarningCount += development.leads.slaWarningCount;
    slaBreachCount += development.leads.slaBreachCount;
    attentionCount += development.attention.totalCount;
  }

  const trackedInventory = input.developments.filter(
    development => development.inventory.catalogueState !== 'land_not_required',
  );
  const inventoryIsKnown =
    trackedInventory.length > 0 &&
    trackedInventory.every(
      development =>
        development.inventory.totalUnits !== null && development.inventory.availableUnits !== null,
    );
  const configuredDevelopmentCount = input.developments.filter(
    development => development.inventory.catalogueState === 'configured',
  ).length;

  const actionCandidates = input.developments
    .flatMap(development =>
      development.nextAction
        ? [
            {
              ...development.nextAction,
              developmentId: development.identity.id,
              developmentName: development.identity.name,
            },
          ]
        : [],
    )
    .sort(
      (left, right) =>
        nextActionPriority[left.code] - nextActionPriority[right.code] ||
        left.developmentName.localeCompare(right.developmentName) ||
        left.developmentId - right.developmentId,
    );

  return {
    range: input.range,
    commercialAccess: input.commercialAccess ?? null,
    portfolio: {
      developmentCount: input.developments.length,
      lifecycleCounts,
      readiness: { readyDevelopmentCount, blockedDevelopmentCount },
      inventory: {
        totalUnits: inventoryIsKnown
          ? trackedInventory.reduce(
              (sum, development) => sum + development.inventory.totalUnits!,
              0,
            )
          : null,
        availableUnits: inventoryIsKnown
          ? trackedInventory.reduce(
              (sum, development) => sum + development.inventory.availableUnits!,
              0,
            )
          : null,
        trackedDevelopmentCount: trackedInventory.length,
        configuredDevelopmentCount,
      },
      leads: { capturedLeadCount, openLeadCount, slaWarningCount, slaBreachCount },
      attentionCount,
      nextAction: actionCandidates[0] ?? null,
    },
    developments: input.developments,
    attention,
  };
}

async function loadDevelopmentRows(
  database: OperatingDatabase,
  scope: DeveloperOperatingHomeScope,
): Promise<DevelopmentOperatingRow[]> {
  const selection = {
    id: developments.id,
    name: developments.name,
    slug: developments.slug,
    address: developments.address,
    suburb: developments.suburb,
    city: developments.city,
    province: developments.province,
    transactionType: developments.transactionType,
    approvalStatus: developments.approvalStatus,
    isPublished: developments.isPublished,
    publishedAt: developments.publishedAt,
    description: developments.description,
    images: developments.images,
    highlights: developments.highlights,
    ownershipType: developments.ownershipType,
    developmentType: developments.developmentType,
    rejectionNote: developments.rejectionNote,
  };

  if (scope.mode === 'developer') {
    return (await database
      .select(selection)
      .from(developments)
      .innerJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
      .innerJoin(
        developerOrganisations,
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
      )
      .where(
        and(
          eq(developments.cataloguePublisherId, scope.cataloguePublisherId),
          eq(cataloguePublishers.developerOrganisationId, scope.organisationId),
          eq(cataloguePublishers.authorityKind, 'developer_first_party'),
        ),
      )
      .orderBy(desc(developments.updatedAt), desc(developments.id))) as DevelopmentOperatingRow[];
  }

  return (await database
    .select(selection)
    .from(developments)
    .innerJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
    .where(eq(developments.cataloguePublisherId, scope.cataloguePublisherId))
    .orderBy(desc(developments.updatedAt), desc(developments.id))) as DevelopmentOperatingRow[];
}

export async function getDeveloperOperatingHome(input: {
  scope: DeveloperOperatingHomeScope;
  range: DevelopmentHomeRange;
  dependencies?: OperatingHomeDependencies;
}): Promise<DeveloperOperatingHome> {
  const database = input.dependencies?.database ?? (await getDb());
  if (!database) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
  }

  const now = input.dependencies?.now ?? new Date();
  const commercialAccess =
    input.scope.mode === 'developer'
      ? (input.dependencies?.publicationAccess ??
        (await getDeveloperPublicationAccess(input.scope.organisationId, {
          db: database,
          now,
        })))
      : null;
  const developmentRows = await loadDevelopmentRows(database, input.scope);

  if (developmentRows.length === 0) {
    return buildDeveloperOperatingHome({
      range: input.range,
      developments: [],
      commercialAccess,
    });
  }

  const developmentIds = developmentRows.map(development => development.id);
  const [persistedUnitTypes, reviewRows] = await Promise.all([
    database.select().from(unitTypes).where(inArray(unitTypes.developmentId, developmentIds)),
    database
      .select({
        id: developmentApprovalQueue.id,
        developmentId: developmentApprovalQueue.developmentId,
        status: developmentApprovalQueue.status,
        submittedAt: developmentApprovalQueue.submittedAt,
        reviewedAt: developmentApprovalQueue.reviewedAt,
        reviewNotes: developmentApprovalQueue.reviewNotes,
        rejectionReason: developmentApprovalQueue.rejectionReason,
      })
      .from(developmentApprovalQueue)
      .where(inArray(developmentApprovalQueue.developmentId, developmentIds))
      .orderBy(desc(developmentApprovalQueue.submittedAt), desc(developmentApprovalQueue.id)),
  ]);

  const unitTypesByDevelopment = new Map<number, (typeof unitTypes.$inferSelect)[]>();
  for (const unitType of persistedUnitTypes) {
    const rows = unitTypesByDevelopment.get(unitType.developmentId) ?? [];
    rows.push(unitType);
    unitTypesByDevelopment.set(unitType.developmentId, rows);
  }

  const reviewsByDevelopment = new Map<number, DevelopmentHomeReviewRow[]>();
  for (const review of reviewRows as Array<DevelopmentHomeReviewRow & { developmentId: number }>) {
    const rows = reviewsByDevelopment.get(review.developmentId) ?? [];
    rows.push(review);
    reviewsByDevelopment.set(review.developmentId, rows);
  }

  const getLeadSummary = input.dependencies?.getLeadSummary ?? getOwnedDevelopmentHomeLeadSummary;
  const summaries = await Promise.all(
    developmentRows.map(async development => {
      const leadSummary = await getLeadSummary({
        developmentId: development.id,
        range: input.range,
        now,
        includePlatformCustody: input.scope.mode === 'platform_curator',
      });
      return buildDevelopmentOperatingSummary({
        development,
        persistedUnitTypes: unitTypesByDevelopment.get(development.id) ?? [],
        reviewRows: reviewsByDevelopment.get(development.id) ?? [],
        leadSummary,
        commercialAccess,
      });
    }),
  );

  return buildDeveloperOperatingHome({
    range: input.range,
    developments: summaries,
    commercialAccess,
  });
}

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { distributionReferrerSearchAssessments } from '../../drizzle/schema';
import {
  DISTRIBUTION_BEDROOM_FILTERS,
  DISTRIBUTION_PRICE_BANDS,
  type DistributionBedroomFilter,
  type DistributionMarketMode,
} from '../../shared/distributionOpportunityMatching';
import {
  listPublicDistributionOpportunities,
  type DistributionPublicOpportunity,
} from './distributionPublicOpportunityReadService';

type AssessmentDb = any;

export const DISTRIBUTION_SEARCH_POLICY_VERSION = 'distribution_browse_matching_v1';

const bedroomFilterSchema = z.union([
  z.literal('studio'),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal('4+'),
]);

export const distributionSearchFiltersSchema = z.object({
  priceBandKey: z.string().trim().min(1).max(64),
  areaText: z.string().trim().max(120),
  bedrooms: z.array(bedroomFilterSchema).max(DISTRIBUTION_BEDROOM_FILTERS.length),
}).superRefine((filters, context) => {
  if (new Set(filters.bedrooms).size !== filters.bedrooms.length) {
    context.addIssue({ code: 'custom', message: 'Bedroom filters must be unique.', path: ['bedrooms'] });
  }
});

const developmentIdsSchema = z.array(z.number().int().positive()).max(5)
  .refine(ids => new Set(ids).size === ids.length, 'Selected opportunities must be unique.');

export const savePublicSearchAssessmentInputSchema = z.object({
  continuityToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  marketMode: z.enum(['sale', 'rent']),
  filters: distributionSearchFiltersSchema,
  developmentIds: developmentIdsSchema,
}).refine(input => input.continuityToken || input.developmentIds.length > 0, {
  message: 'Select an opportunity before saving a public shortlist.',
});

export const saveOwnedSearchAssessmentInputSchema = z.object({
  assessmentId: z.string().uuid().optional(),
  continuityToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  marketMode: z.enum(['sale', 'rent']),
  filters: distributionSearchFiltersSchema,
  developmentIds: developmentIdsSchema,
}).refine(input => input.assessmentId || input.continuityToken || input.developmentIds.length > 0, {
  message: 'An assessment ID, continuity token, or selected opportunity is required.',
});

export const claimPublicSearchAssessmentsInputSchema = z.object({
  assessments: z.array(z.object({
    marketMode: z.enum(['sale', 'rent']),
    continuityToken: z.string().regex(/^[a-f0-9]{64}$/),
  })).max(2),
});

export type DistributionSearchFilters = z.infer<typeof distributionSearchFiltersSchema>;

export type DistributionSearchOpportunitySnapshot = {
  developmentId: number;
  projectionRevision: string;
  observedAt: string;
  marketMode: DistributionMarketMode;
  campaign: DistributionPublicOpportunity['campaign'];
  mode: NonNullable<DistributionPublicOpportunity['inventory']['modes'][DistributionMarketMode]>;
  unitTypes: Array<{
    name: string;
    bedrooms: number | null;
    mode: NonNullable<DistributionPublicOpportunity['inventory']['unitTypes'][number]['modes'][DistributionMarketMode]>;
  }>;
};

export function buildDistributionSearchOpportunitySnapshots({
  marketMode,
  developmentIds,
  opportunities,
}: {
  marketMode: DistributionMarketMode;
  developmentIds: number[];
  opportunities: DistributionPublicOpportunity[];
}): DistributionSearchOpportunitySnapshot[] {
  const byDevelopmentId = new Map(opportunities.map(opportunity => [opportunity.developmentId, opportunity]));
  return developmentIds.map(developmentId => {
    const opportunity = byDevelopmentId.get(developmentId);
    const mode = opportunity?.inventory.modes[marketMode];
    if (!opportunity || !mode) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'One or more selected opportunities are no longer currently marketable.',
      });
    }
    return {
      developmentId,
      projectionRevision: opportunity.revision,
      observedAt: opportunity.observedAt,
      marketMode,
      campaign: opportunity.campaign,
      mode,
      unitTypes: opportunity.inventory.unitTypes.flatMap(unitType => {
        const unitMode = unitType.modes[marketMode];
        return unitMode
          ? [{ name: unitType.name, bedrooms: unitType.bedrooms, mode: unitMode }]
          : [];
      }),
    };
  });
}

function hashContinuityToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function mysqlTimestampNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function assertSearchFiltersMatchMode(
  marketMode: DistributionMarketMode,
  filters: DistributionSearchFilters,
) {
  if (!DISTRIBUTION_PRICE_BANDS[marketMode].some(band => band.key === filters.priceBandKey)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The selected price filter is invalid for this market.' });
  }
}

async function snapshotSearchWork(input: {
  marketMode: DistributionMarketMode;
  filters: DistributionSearchFilters;
  developmentIds: number[];
}) {
  assertSearchFiltersMatchMode(input.marketMode, input.filters);
  const searchFilters = {
    priceBandKey: input.filters.priceBandKey,
    areaText: input.filters.areaText.trim(),
    bedrooms: [...input.filters.bedrooms] as DistributionBedroomFilter[],
  };
  const publicProjection = input.developmentIds.length
    ? await listPublicDistributionOpportunities(input.developmentIds)
    : { items: [] as DistributionPublicOpportunity[] };

  return {
    searchFilters,
    selectedOpportunities: buildDistributionSearchOpportunitySnapshots({
      marketMode: input.marketMode,
      developmentIds: input.developmentIds,
      opportunities: publicProjection.items,
    }),
  };
}

export async function saveDistributionSearchAssessment({
  db,
  userId,
  input,
}: {
  db: AssessmentDb;
  userId: number | null;
  input: z.infer<typeof savePublicSearchAssessmentInputSchema> & { assessmentId?: string };
}) {
  const snapshot = await snapshotSearchWork(input);
  const now = mysqlTimestampNow();

  if (input.assessmentId) {
    if (userId === null) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in to save this shortlist to your account.' });
    }
    const [existing] = await db
      .select()
      .from(distributionReferrerSearchAssessments)
      .where(and(
        eq(distributionReferrerSearchAssessments.id, input.assessmentId),
        eq(distributionReferrerSearchAssessments.ownerUserId, userId),
      ))
      .limit(1);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved shortlist not found.' });
    }
    if (
      input.continuityToken &&
      existing.continuityTokenHash !== hashContinuityToken(input.continuityToken)
    ) {
      throw new TRPCError({ code: 'CONFLICT', message: 'The saved shortlist token does not match this record.' });
    }
    if (existing.marketMode !== input.marketMode) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Saved shortlist market mode cannot be changed.' });
    }
    await db.update(distributionReferrerSearchAssessments)
      .set({
        searchPolicyVersion: DISTRIBUTION_SEARCH_POLICY_VERSION,
        searchFiltersJson: snapshot.searchFilters,
        selectedOpportunitiesJson: snapshot.selectedOpportunities,
        updatedAt: now,
      })
      .where(eq(distributionReferrerSearchAssessments.id, input.assessmentId));
    return { id: input.assessmentId, marketMode: input.marketMode, continuityToken: null as string | null };
  }

  const continuityToken = input.continuityToken ?? randomBytes(32).toString('hex');
  const continuityTokenHash = hashContinuityToken(continuityToken);
  const [existing] = await db
    .select()
    .from(distributionReferrerSearchAssessments)
    .where(eq(distributionReferrerSearchAssessments.continuityTokenHash, continuityTokenHash))
    .limit(1);

  if (existing) {
    if (existing.marketMode !== input.marketMode) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This continuity token belongs to a different shortlist mode.' });
    }
    if (existing.ownerUserId !== null && existing.ownerUserId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'This shortlist belongs to another account.' });
    }
    if (userId === null && existing.ownerUserId !== null) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in to continue this saved shortlist.' });
    }
    const ownershipFilter = userId === null || existing.ownerUserId === null
      ? isNull(distributionReferrerSearchAssessments.ownerUserId)
      : eq(distributionReferrerSearchAssessments.ownerUserId, userId);
    await db.update(distributionReferrerSearchAssessments)
      .set({
        ownerUserId: userId ?? existing.ownerUserId,
        searchPolicyVersion: DISTRIBUTION_SEARCH_POLICY_VERSION,
        searchFiltersJson: snapshot.searchFilters,
        selectedOpportunitiesJson: snapshot.selectedOpportunities,
        claimedAt: userId !== null && existing.ownerUserId === null ? now : existing.claimedAt,
        updatedAt: now,
      })
      .where(and(
        eq(distributionReferrerSearchAssessments.id, existing.id),
        eq(distributionReferrerSearchAssessments.continuityTokenHash, continuityTokenHash),
        ownershipFilter,
      ));
    const [afterUpdate] = await db
      .select({ ownerUserId: distributionReferrerSearchAssessments.ownerUserId })
      .from(distributionReferrerSearchAssessments)
      .where(eq(distributionReferrerSearchAssessments.id, existing.id))
      .limit(1);
    if (!afterUpdate || afterUpdate.ownerUserId !== userId) {
      throw new TRPCError({
        code: userId === null ? 'UNAUTHORIZED' : 'FORBIDDEN',
        message: 'This shortlist is no longer available to this session.',
      });
    }
    return { id: existing.id, marketMode: input.marketMode, continuityToken };
  }

  if (userId === null && input.developmentIds.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an opportunity before saving a public shortlist.' });
  }

  const id = randomUUID();
  await db.insert(distributionReferrerSearchAssessments).values({
    id,
    ownerUserId: userId,
    continuityTokenHash,
    marketMode: input.marketMode,
    searchPolicyVersion: DISTRIBUTION_SEARCH_POLICY_VERSION,
    searchFiltersJson: snapshot.searchFilters,
    selectedOpportunitiesJson: snapshot.selectedOpportunities,
    claimedAt: userId === null ? null : now,
  });
  return { id, marketMode: input.marketMode, continuityToken };
}

export async function claimDistributionSearchAssessments({
  db,
  userId,
  assessments,
}: {
  db: AssessmentDb;
  userId: number;
  assessments: Array<{ marketMode: DistributionMarketMode; continuityToken: string }>;
}) {
  const claimed: Array<{ marketMode: DistributionMarketMode; assessmentId: string }> = [];
  for (const assessment of assessments) {
    const tokenHash = hashContinuityToken(assessment.continuityToken);
    const [existing] = await db
      .select()
      .from(distributionReferrerSearchAssessments)
      .where(eq(distributionReferrerSearchAssessments.continuityTokenHash, tokenHash))
      .limit(1);
    if (!existing || existing.marketMode !== assessment.marketMode) continue;
    if (existing.ownerUserId !== null && existing.ownerUserId !== userId) continue;
    if (existing.ownerUserId === null) {
      const now = mysqlTimestampNow();
      await db.update(distributionReferrerSearchAssessments)
        .set({ ownerUserId: userId, claimedAt: now, updatedAt: now })
        .where(and(
          eq(distributionReferrerSearchAssessments.id, existing.id),
          eq(distributionReferrerSearchAssessments.continuityTokenHash, tokenHash),
          isNull(distributionReferrerSearchAssessments.ownerUserId),
        ));
    }
    const [afterClaim] = await db
      .select({ ownerUserId: distributionReferrerSearchAssessments.ownerUserId })
      .from(distributionReferrerSearchAssessments)
      .where(eq(distributionReferrerSearchAssessments.id, existing.id))
      .limit(1);
    if (afterClaim?.ownerUserId === userId) {
      claimed.push({ marketMode: assessment.marketMode, assessmentId: existing.id });
    }
  }
  return claimed;
}

export async function listMyDistributionSearchAssessments({
  db,
  userId,
}: {
  db: AssessmentDb;
  userId: number;
}) {
  return db.select({
    id: distributionReferrerSearchAssessments.id,
    marketMode: distributionReferrerSearchAssessments.marketMode,
    searchPolicyVersion: distributionReferrerSearchAssessments.searchPolicyVersion,
    searchFilters: distributionReferrerSearchAssessments.searchFiltersJson,
    selectedOpportunities: distributionReferrerSearchAssessments.selectedOpportunitiesJson,
    createdAt: distributionReferrerSearchAssessments.createdAt,
    updatedAt: distributionReferrerSearchAssessments.updatedAt,
  })
    .from(distributionReferrerSearchAssessments)
    .where(eq(distributionReferrerSearchAssessments.ownerUserId, userId))
    .orderBy(desc(distributionReferrerSearchAssessments.updatedAt))
    .limit(50);
}

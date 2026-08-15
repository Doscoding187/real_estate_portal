import { z } from 'zod';
import { router, protectedProcedure, publicProcedure, superAdminProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { ENV } from './_core/env';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import { getDeveloperByUserId, requireDeveloperProfileByUserId } from './services/developerService'; // [NEW] Import service methods
import { getPublisherById } from './services/cataloguePublisherService';
import { cataloguePublisherService } from './services/cataloguePublisherService';
import { developerIdentityService } from './services/developerIdentityService';
import {
  calculateAffordabilityCompanion,
  matchUnitsToAffordability,
} from './services/affordabilityCompanion';
import { getActivityFeed as getActivityFeedService } from './services/activityService';
import { getKPIsWithCache } from './services/kpiService';
import { capturePublicLead } from './services/publicLeadCaptureService';
import {
  assignDeveloperLead,
  getDeveloperDistributionSettings,
  getDeveloperFunnelAttention,
  getDeveloperFunnelKpis,
  getOwnedDevelopmentHomeLeadSummary,
  listDeveloperLeads,
  logDeveloperLeadActivity,
  setDeveloperDistributionEnabled,
  setDeveloperLeadNextAction,
  transitionDeveloperLead,
} from './services/developerFunnelService';
import {
  developmentDrafts,
  developments,
  developmentApprovalQueue,
  developerOrganisations,
  users,
  unitTypes,
} from '../drizzle/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import {
  AssignmentModeSchema,
  LeadOwnerTypeSchema,
  LeadStageSchema,
  SlaStatusSchema,
} from '../shared/developerFunnel';
import { calculateDevelopmentReadiness } from './lib/readiness';
import { sanitizeDraftData } from './lib/sanitizeDraftData';
import { requireUser } from './_core/requireUser';
import { resolveOperatingIdentity } from './_core/identityResolver';
import { composeResidentialHomeFeedItems } from './services/homeFeedComposition';
import { validatePersistedSubmissionReadiness } from './services/developmentSubmissionReadiness';
import { buildDevelopmentHomeInventory } from './services/developmentInventorySummary';
import { buildDevelopmentHomeAttention } from './services/developmentHomeAttention';
import { getDevelopmentHomeDistribution } from './services/developmentHomeDistribution';
import { developmentSupersessionService } from './services/developmentSupersessionService';
import {
  developerVisibleReviewFeedback,
  deriveDevelopmentHomeLifecycleState,
  isDevelopmentHomePublicEligible,
  type DevelopmentHomeLifecycleState,
  type DevelopmentHomeReadinessBlocker,
  type DevelopmentHomeReviewRow,
} from './services/developmentOperatingLifecycle';
import {
  getDeveloperOperatingHome,
  type DeveloperOperatingHomeScope,
} from './services/developerOperatingHome';
import { getDeveloperPublicationAccess } from './services/developerPublicationAccess';
import type { DeveloperPublicationAccess } from './services/developerPublicationAccess';

console.log('[DEV ROUTER LOADED] build stamp', new Date().toISOString());

export {
  developerVisibleReviewFeedback,
  deriveDevelopmentHomeLifecycleState,
  isDevelopmentHomePublicEligible,
} from './services/developmentOperatingLifecycle';
export type {
  CanonicalDevelopmentReviewStatus,
  DevelopmentHomeLifecycleState,
  DevelopmentHomeReadinessBlocker,
  DevelopmentHomeReviewRow,
} from './services/developmentOperatingLifecycle';

export const DevelopmentHomeInputSchema = z
  .object({
    developmentId: z.number().int().positive(),
    range: z.enum(['7d', '30d', '90d']),
  })
  .strict();

export const DeveloperOperatingHomeInputSchema = z
  .object({
    range: z.enum(['7d', '30d', '90d']).default('30d'),
  })
  .strict();

type DevelopmentHomeIdentityRow = Pick<
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

function assertDeveloperDistributionEnabled() {
  if (!ENV.distributionNetworkEnabled) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Distribution Network is disabled. Set FEATURE_DISTRIBUTION_NETWORK=true to enable this module.',
    });
  }
}

const EMPTY_DEVELOPER_KPIS = {
  totalLeads: 0,
  qualifiedLeads: 0,
  conversionRate: 0,
  unitsSold: 0,
  unitsAvailable: 0,
  affordabilityMatchPercent: 0,
  marketingPerformanceScore: 0,
  trends: {
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    unitsSold: 0,
    affordabilityMatchPercent: 0,
    marketingPerformanceScore: 0,
  },
};
async function resolvePublicPublisherProfile(profile: any) {
  if (!profile || Number(profile.isVisible) !== 1) return null;

  if (profile.authorityKind === 'platform_reference') {
    return { publisherProfile: profile, developer: null };
  }

  const dbConn = await db.getDb();
  if (!dbConn) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
  }

  const [linkedDeveloper] = await dbConn
    .select()
    .from(developerOrganisations)
    .where(eq(developerOrganisations.id, profile.developerOrganisationId))
    .limit(1);

  // Subscriber brands are not public until the underlying developer is approved.
  if (!linkedDeveloper || linkedDeveloper.status !== 'approved') return null;

  return { publisherProfile: profile, developer: linkedDeveloper };
}

function toPublicPublisherProfileResponse(publisherProfile: any, developer: any) {
  const publicEmail = publisherProfile.publicContactEmail || developer?.email || null;

  return {
    id: publisherProfile.id,
    type: 'publisher' as const,
    cataloguePublisherId: publisherProfile.id,
    authorityKind: publisherProfile.authorityKind,
    name: publisherProfile.brandName,
    slug: publisherProfile.slug,
    logo: publisherProfile.logoUrl || developer?.logo || null,
    description: publisherProfile.about || developer?.description || null,
    address: publisherProfile.headOfficeLocation || developer?.address || null,
    phones: developer?.phone ? [developer.phone] : [],
    emails: publicEmail ? [publicEmail] : [],
    website: publisherProfile.websiteUrl || developer?.website || null,
    isClaimable: false,
    stats: {
      isVerified: Number(publisherProfile.isContactVerified || developer?.isVerified || 0) === 1,
      isTrusted: Number(developer?.isTrusted || 0) === 1,
      establishedYear: publisherProfile.foundedYear || developer?.establishedYear || null,
      totalProjects: Number(developer?.totalProjects || 0),
    },
  };
}

// ===========================================================================
// ROUTER DEFINITION
// ===========================================================================

export const developerRouter = router({
  verifySupersession: superAdminProcedure
    .input(
      z.object({
        sourceDevelopmentId: z.number().int().positive(),
        replacementDevelopmentId: z.number().int().positive(),
        verificationNote: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      developmentSupersessionService.verifyDevelopmentSupersession({
        ...input,
        actorUserId: requireUser(ctx).id,
      }),
    ),

  activateSupersession: superAdminProcedure
    .input(z.object({ supersessionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      developmentSupersessionService.activateDevelopmentSupersession({
        ...input,
        actorUserId: requireUser(ctx).id,
      }),
    ),

  reverseSupersession: superAdminProcedure
    .input(
      z.object({
        supersessionId: z.number().int().positive(),
        reversalReason: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      developmentSupersessionService.reverseDevelopmentSupersession({
        ...input,
        actorUserId: requireUser(ctx).id,
      }),
    ),

  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);

    if (user.role !== 'property_developer' && user.role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Developer onboarding is only available to property developers.',
      });
    }

    if (user.role === 'super_admin') {
      return {
        hasProfile: true,
        profileSubmitted: true,
        profileApproved: true,
        profileRejected: false,
        profileStatus: 'approved' as const,
        onboardingStep: 4,
        dashboardUnlocked: true,
        fullFeaturesUnlocked: true,
        recommendedNextStep: '/developer/dashboard',
        developmentsCount: 0,
        profile: null,
      };
    }

    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database unavailable',
      });
    }

    const profile = await getDeveloperByUserId(user.id);

    if (!profile) {
      if (Number(user.onboardingStep || 0) !== 0 || Number(user.onboardingComplete || 0) !== 0) {
        await dbConn
          .update(users)
          .set({
            onboardingStep: 0,
            onboardingComplete: 0,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      return {
        hasProfile: false,
        profileSubmitted: false,
        profileApproved: false,
        profileRejected: false,
        profileStatus: 'missing' as const,
        onboardingStep: 0,
        dashboardUnlocked: false,
        fullFeaturesUnlocked: false,
        recommendedNextStep: '/developer/setup',
        developmentsCount: 0,
        profile: null,
      };
    }

    const [{ count: developmentsCountRaw }] = await dbConn
      .select({
        count: sql<number>`count(*)`,
      })
      .from(developments)
      .where(eq(developments.cataloguePublisherId, profile.publisherId));

    const developmentsCount = Number(developmentsCountRaw || 0);
    const profileStatus = profile.status;
    const profileSubmitted = true;
    const profileApproved = profileStatus === 'approved';
    const profileRejected = profileStatus === 'rejected';

    let onboardingStep = 1;
    if (profileStatus === 'pending') onboardingStep = 2;
    if (profileApproved) onboardingStep = 3;
    if (profileApproved && developmentsCount > 0) onboardingStep = 4;

    const dashboardUnlocked = !profileRejected;
    const fullFeaturesUnlocked = profileApproved && developmentsCount > 0;
    const recommendedNextStep = profileRejected
      ? '/developer/setup'
      : !profileApproved
        ? '/developer/dashboard'
        : developmentsCount > 0
          ? '/developer/dashboard'
          : '/developer/create-development';

    if (
      Number(user.onboardingStep || 0) !== onboardingStep ||
      Number(user.onboardingComplete || 0) !== (fullFeaturesUnlocked ? 1 : 0)
    ) {
      await dbConn
        .update(users)
        .set({
          onboardingStep,
          onboardingComplete: fullFeaturesUnlocked ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return {
      hasProfile: true,
      profileSubmitted,
      profileApproved,
      profileRejected,
      profileStatus,
      onboardingStep,
      dashboardUnlocked,
      fullFeaturesUnlocked,
      recommendedNextStep,
      developmentsCount,
      profile: {
        id: profile.id,
        name: profile.name,
        status: profile.status,
        city: profile.city ?? null,
        province: profile.province ?? null,
        cataloguePublisherId: profile.publisherId,
      },
    };
  }),

  adminListPendingDevelopers: superAdminProcedure.input(z.void()).query(async () => {
    const developers = await db.listPendingDevelopers();
    return { developers, total: developers.length };
  }),

  adminListAllDevelopers: superAdminProcedure.input(z.void()).query(async () => {
    const developers = await db.listAllDevelopers();
    return { developers, total: developers.length };
  }),

  adminApproveDeveloper: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.approveDeveloper(input.id, requireUser(ctx).id);
      return { ok: true };
    }),

  adminRejectDeveloper: superAdminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.rejectDeveloper(input.id, requireUser(ctx).id, input.reason);
      return { ok: true };
    }),

  adminSetTrusted: superAdminProcedure
    .input(
      z
        .object({
          developerId: z.number().optional(),
          id: z.number().optional(),
          isTrusted: z.boolean(),
        })
        .refine(value => typeof value.developerId === 'number' || typeof value.id === 'number', {
          message: 'developerId or id is required',
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const developerId = input.developerId ?? input.id;
      await db.setDeveloperTrust(developerId as number, input.isTrusted);
      return {
        ok: true,
        message: input.isTrusted ? 'Developer marked as trusted' : 'Developer trust removed',
      };
    }),
  getPublicDeveloperBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const publisherProfile = await cataloguePublisherService.getPublicPublisherBySlug(input.slug);
      const resolvedBrand = await resolvePublicPublisherProfile(publisherProfile);
      if (resolvedBrand) {
        return toPublicPublisherProfileResponse(
          resolvedBrand.publisherProfile,
          resolvedBrand.developer,
        );
      }
      return null;
    }),

  getPublicDevelopmentsForPublisher: publicProcedure
    .input(
      z.object({
        cataloguePublisherId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      const resolvedPublisher = await resolvePublicPublisherProfile(
        await cataloguePublisherService.getPublicPublisherById(input.cataloguePublisherId),
      );
      if (!resolvedPublisher) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Catalogue Publisher not found' });
      }
      return developmentService.listPublicDevelopments({
        cataloguePublisherId: resolvedPublisher.publisherProfile.id,
      });
    }),

  searchDevelopers: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(2),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      return await developerIdentityService.listPublicCataloguePublishers({
        search: input.query,
        isVisible: true,
        limit: input.limit,
      });
    }),

  searchDevelopments: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(2),
        developerId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      return await developmentService.searchPublicDevelopments({
        query: input.query,
        developerId: input.developerId,
        limit: input.limit,
      });
    }),

  createProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        establishedYear: z.number().int().optional().nullable(),
        website: z.string().optional().nullable(),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().min(2),
        province: z.string().min(2),
        logo: z.string().optional().nullable(),
        completedProjects: z.number().int().optional(),
        currentProjects: z.number().int().optional(),
        upcomingProjects: z.number().int().optional(),
        specializations: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (user.role !== 'property_developer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only property developers can create a developer organisation.',
        });
      }

      const existingProfile = await getDeveloperByUserId(user.id);
      if (existingProfile) return existingProfile;

      const profile = await developerIdentityService.createDeveloperOrganisation({
        name: input.name,
        description: input.description || null,
        logo: input.logo || null,
        website: input.website || null,
        email: input.email,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city,
        province: input.province,
        category: (input.category as any) || 'residential',
        specializations: input.specializations || [],
        establishedYear: input.establishedYear ?? null,
        createdByUserId: user.id,
      });
      await developerSubscriptionService.ensureSubscription(profile.organisationId);

      return profile;
    }),
  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        cataloguePublisherId: z.number().int().optional(),
        draftData: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sanitized = sanitizeDraftData(input.draftData ?? {});
      const currentStep = Math.max(0, Number((sanitized as any).currentPhase ?? 0));
      const progress = Math.min(100, Math.max(0, Math.round((currentStep / 11) * 100)));
      const draftName =
        String((sanitized as any).developmentData?.name ?? (sanitized as any).name ?? '').trim() ||
        'Untitled Draft';

      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      if (
        input.cataloguePublisherId !== undefined &&
        Number(input.cataloguePublisherId) !== Number(profile.publisherId)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'The draft publisher must belong to the authenticated organisation.',
        });
      }

      if (input.id) {
        const updateSet: Record<string, any> = {
          draftName,
          draftData: sanitized,
          progress,
          currentStep,
          lastModified: new Date().toISOString(),
          cataloguePublisherId: profile.publisherId,
          developerOrganisationId: profile.organisationId,
        };

        const [existingDraft] = await dbConn
          .select({ id: developmentDrafts.id })
          .from(developmentDrafts)
          .where(
            and(
              eq(developmentDrafts.id, input.id),
              eq(developmentDrafts.developerOrganisationId, profile.organisationId),
              eq(developmentDrafts.cataloguePublisherId, profile.publisherId),
            ),
          )
          .limit(1);
        if (!existingDraft) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Draft not found' });
        }

        await dbConn
          .update(developmentDrafts)
          .set(updateSet)
          .where(
            and(
              eq(developmentDrafts.id, input.id),
              eq(developmentDrafts.developerOrganisationId, profile.organisationId),
              eq(developmentDrafts.cataloguePublisherId, profile.publisherId),
            ),
          );

        return { id: input.id, success: true, draftData: sanitized };
      }

      const insertResult = await dbConn.insert(developmentDrafts).values({
        developerOrganisationId: profile.organisationId,
        cataloguePublisherId: profile.publisherId,
        draftName,
        draftData: sanitized,
        progress,
        currentStep,
      });
      const inserted = Array.isArray(insertResult) ? insertResult[0] : insertResult;

      return {
        id: Number(inserted?.insertId ?? 0),
        success: true,
        draftData: sanitized,
      };
    }),

  getDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const [draft] = await dbConn
        .select()
        .from(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.id, input.id),
            eq(developmentDrafts.developerOrganisationId, profile.organisationId),
            eq(developmentDrafts.cataloguePublisherId, profile.publisherId),
          ),
        )
        .limit(1);

      if (!draft) return null;

      return {
        ...draft,
        draftData: sanitizeDraftData((draft as any).draftData ?? {}),
      };
    }),

  getDrafts: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
    }

    const drafts = await dbConn
      .select()
      .from(developmentDrafts)
      .where(
        and(
          eq(developmentDrafts.developerOrganisationId, profile.organisationId),
          eq(developmentDrafts.cataloguePublisherId, profile.publisherId),
        ),
      )
      .orderBy(desc(developmentDrafts.lastModified));

    return drafts.map((draft: any) => ({
      ...draft,
      draftData: sanitizeDraftData(draft?.draftData ?? {}),
    }));
  }),

  deleteDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const deleteResult = await dbConn
        .delete(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.id, input.id),
            eq(developmentDrafts.developerOrganisationId, profile.organisationId),
            eq(developmentDrafts.cataloguePublisherId, profile.publisherId),
          ),
        );
      const affectedRows = Number(
        (deleteResult as any)?.affectedRows ?? (deleteResult as any)?.[0]?.affectedRows ?? 0,
      );
      if (affectedRows !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Draft not found' });
      }

      return { success: true, id: input.id };
    }),
  getPublishedDevelopments: publicProcedure
    .input(
      z.object({
        province: z.string().optional(),
        limit: z.number().optional(),
        transactionType: z.enum(['for_sale', 'for_rent', 'auction']).optional(),
        developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']).optional(),
        enableFallback: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Primary Query
      let results = await developmentService.listPublicDevelopments({
        province: input.province,
        limit: input.limit,
        developmentType: input.developmentType,
      } as any);

      let usedFallback = false;
      let fallbackLevel: 'none' | 'province' | 'nationwide' = 'none';

      // Fallback Logic
      if (input.enableFallback && results.length === 0) {
        usedFallback = true;

        // Fallback A: Residential For Sale in SAME province
        if (input.province) {
          fallbackLevel = 'province';
          results = await developmentService.listPublicDevelopments({
            province: input.province,
            limit: input.limit,
            developmentType: 'residential',
          } as any);
        }

        // Fallback B: Residential For Sale NATIONWIDE (if Fallback A empty or no province)
        if (results.length === 0) {
          fallbackLevel = 'nationwide';
          results = await developmentService.listPublicDevelopments({
            limit: input.limit,
            developmentType: 'residential',
          } as any);
        }
      }

      return {
        developments: results,
        meta: {
          usedFallback,
          fallbackLevel,
          primaryCount: usedFallback ? 0 : results.length,
        },
      };
    }),

  getHomeTrendingFeed: publicProcedure
    .input(
      z.object({
        tab: z.enum(['buy', 'rent', 'developments', 'shared_living', 'plot_land', 'commercial']),
        province: z.string().optional(),
        city: z.string().optional(),
        suburb: z.string().optional(),
        limit: z.number().min(1).max(10).optional(),
      }),
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 5;
      const requestedProvince = input.province?.trim() || undefined;
      const requestedCity = input.city?.trim() || undefined;
      const requestedSuburb = input.suburb?.trim() || undefined;

      type LocationScope = 'suburb' | 'city' | 'province' | 'national';
      type LocationFilter = {
        province?: string;
        city?: string;
        suburb?: string;
      };
      type FeedItem = {
        id: string;
        kind: 'development' | 'listing' | 'unit';
        title: string;
        city: string;
        suburb: string;
        priceFrom: number;
        priceTo: number;
        image: string;
        href: string;
        listingType?: 'sale' | 'rent';
        bedrooms?: number | null;
        bathrooms?: number | null;
        area?: number | null;
        yardSize?: number | null;
        unitSize?: number | null;
        propertyType?: string | null;
        developmentName?: string | null;
        developmentKey?: string | null;
        badges?: string[];
      };
      type ListingFeedItem = FeedItem & { kind: 'listing' };
      type UnitFeedItem = FeedItem & { kind: 'unit' };

      const normalizeDevImage = (images: any): string => {
        if (!images) return '';
        if (Array.isArray(images) && images.length > 0) {
          const first = images[0];
          if (typeof first === 'string') return first;
          if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
        }
        return '';
      };

      const mapDevelopment = (dev: any) => ({
        id: String(dev.id),
        kind: 'development' as const,
        title: dev.name,
        city: dev.city || '',
        suburb: dev.suburb || '',
        priceFrom: Number(dev.priceFrom || 0),
        priceTo: Number(dev.priceTo || 0),
        image: normalizeDevImage(dev.images),
        href: `/development/${dev.slug || dev.id}`,
      });

      const listingMediaBaseUrl =
        ENV.cloudFrontUrl ||
        (ENV.s3BucketName && ENV.awsRegion
          ? `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`
          : '');

      const toPublicListingImageUrl = (value: unknown): string => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (
          trimmed.startsWith('http://') ||
          trimmed.startsWith('https://') ||
          trimmed.startsWith('data:') ||
          trimmed.startsWith('blob:')
        ) {
          return trimmed;
        }
        if (!listingMediaBaseUrl) {
          return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        }
        return trimmed.startsWith('/')
          ? `${listingMediaBaseUrl}${trimmed}`
          : `${listingMediaBaseUrl}/${trimmed}`;
      };

      const normalizeListingImage = (prop: any): string => {
        const firstImage = Array.isArray(prop.images) ? prop.images[0] : undefined;
        const firstImageUrl =
          typeof firstImage === 'string'
            ? firstImage
            : firstImage?.url ||
              firstImage?.imageUrl ||
              firstImage?.thumbnailUrl ||
              firstImage?.processedUrl ||
              firstImage?.originalUrl ||
              firstImage?.fileUrl ||
              firstImage?.key ||
              firstImage?.src;

        const primaryMediaUrl = Array.isArray(prop.media)
          ? prop.media.find((item: any) => item?.isPrimary)?.url ||
            prop.media.find((item: any) => item?.isPrimary)?.processedUrl ||
            prop.media.find((item: any) => item?.isPrimary)?.originalUrl ||
            prop.media.find((item: any) => item?.isPrimary)?.fileUrl
          : '';

        const fallbackMediaUrl = Array.isArray(prop.media)
          ? prop.media[0]?.url ||
            prop.media[0]?.processedUrl ||
            prop.media[0]?.originalUrl ||
            prop.media[0]?.fileUrl
          : '';

        return toPublicListingImageUrl(
          prop.mainImage ||
            prop.image ||
            prop.coverImage ||
            prop.thumbnailUrl ||
            prop.imageUrl ||
            firstImageUrl ||
            primaryMediaUrl ||
            fallbackMediaUrl,
        );
      };

      const buildListingTitle = (prop: any): string => {
        const explicitTitle = String(prop.title || '').trim();
        if (
          explicitTitle &&
          explicitTitle.toLowerCase() !== 'property listing' &&
          explicitTitle.toLowerCase() !== 'untitled property'
        ) {
          return explicitTitle;
        }

        const bedrooms = Number(prop.bedrooms || 0);
        const propertyType = String(prop.propertyType || 'Property')
          .replace(/_/g, ' ')
          .trim();
        const normalizedType =
          propertyType.length > 0
            ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1).toLowerCase()
            : 'Property';

        if (bedrooms > 0) {
          return String(prop.listingType || '').toLowerCase() === 'rent'
            ? `${bedrooms} Bedroom ${normalizedType} to Rent`
            : `${bedrooms} Bedroom ${normalizedType}`;
        }

        return String(prop.listingType || '').toLowerCase() === 'rent'
          ? `${normalizedType} to Rent`
          : normalizedType;
      };

      const mapListing = (prop: any): ListingFeedItem => ({
        id: String(prop.id),
        kind: 'listing' as const,
        title: buildListingTitle(prop),
        city: prop.city || '',
        suburb: prop.suburb || '',
        priceFrom: Number(prop.price || 0),
        priceTo: Number(prop.price || 0),
        image: normalizeListingImage(prop),
        href: `/property/${prop.id}`,
        listingType: String(prop.listingType || 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale',
        bedrooms: Number(prop.bedrooms || 0) || null,
        bathrooms: Number(prop.bathrooms || 0) || null,
        area: Number(prop.floorSize || prop.area || 0) || null,
        yardSize: Number(prop.erfSize || prop.yardSize || 0) || null,
        developmentName:
          String(prop.development?.name || prop.developmentName || '').trim() || null,
        badges: Array.isArray(prop.badges)
          ? prop.badges.filter((badge: unknown): badge is string => typeof badge === 'string')
          : [],
      });

      const mapUnitListing = (item: any): UnitFeedItem => ({
        id: String(item.id),
        kind: 'unit' as const,
        title: item.title,
        city: item.city || '',
        suburb: item.suburb || '',
        priceFrom: Number(item.price || 0),
        priceTo: Number(item.priceTo || item.price || 0),
        image: String(item.image || ''),
        href:
          item.href ||
          (item.development?.slug
            ? `/development/${item.development.slug}/unit/${item.unitTypeId}`
            : `/development/${item.developmentId}/unit/${item.unitTypeId}`),
        listingType: item.listingType === 'rent' ? 'rent' : 'sale',
        bedrooms: Number(item.bedrooms || 0) || null,
        bathrooms: Number(item.bathrooms || 0) || null,
        unitSize: Number(item.floorSize || 0) || null,
        yardSize: Number(item.erfSize || 0) || null,
        propertyType: item.propertyType || null,
        developmentName: String(item.development?.name || '').trim() || null,
        developmentKey:
          String(
            item.development?.id || item.developmentId || item.development?.slug || '',
          ).trim() || null,
        badges: Array.isArray(item.badges)
          ? item.badges.filter((badge: unknown): badge is string => typeof badge === 'string')
          : [],
      });

      const composeResidentialHomeFeed = async (
        locationFilter: LocationFilter,
        listingType: 'sale' | 'rent',
      ): Promise<{ items: FeedItem[]; source: 'mixed' | 'listings' | 'units' }> => {
        const { propertySearchService } = await import('./services/propertySearchService');
        const { developmentDerivedListingService } =
          await import('./services/developmentDerivedListingService');

        const poolLimit = Math.max(limit * 2, 12);
        const [listingResults, derivedDevelopmentListings] = await Promise.all([
          propertySearchService.searchProperties(
            {
              province: locationFilter.province,
              city: locationFilter.city,
              suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
              listingType,
              propertyType:
                listingType === 'rent'
                  ? ['house', 'apartment', 'townhouse']
                  : ['house', 'apartment', 'townhouse', 'plot'],
            } as any,
            'date_desc',
            1,
            poolLimit,
          ),
          developmentDerivedListingService.searchListings(
            {
              province: locationFilter.province,
              city: locationFilter.city,
              suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
              listingType,
            },
            'date_desc',
            1,
            poolLimit,
          ),
        ]);

        const listingItems = (listingResults.properties || []).map(mapListing);
        const developmentUnitItems = (derivedDevelopmentListings.items || []).map(mapUnitListing);
        const { items, source } = composeResidentialHomeFeedItems(
          listingItems,
          developmentUnitItems,
          limit,
        );

        return {
          items: items as FeedItem[],
          source,
        };
      };

      const fetchTabItems = async (
        locationFilter: LocationFilter,
      ): Promise<{
        items: FeedItem[];
        source: 'developments' | 'listings' | 'units' | 'mixed';
      }> => {
        if (input.tab === 'buy') {
          return composeResidentialHomeFeed(locationFilter, 'sale');
        }

        if (input.tab === 'rent') {
          return composeResidentialHomeFeed(locationFilter, 'rent');
        }

        if (input.tab === 'developments') {
          const devs = await developmentService.listPublicDevelopments({
            province: locationFilter.province,
            city: locationFilter.city,
            suburb: locationFilter.suburb,
            limit,
            developmentType: 'residential',
          });
          return { items: devs.map(mapDevelopment), source: 'developments' };
        }

        if (input.tab === 'plot_land') {
          const devs = await developmentService.listPublicDevelopments({
            province: locationFilter.province,
            city: locationFilter.city,
            suburb: locationFilter.suburb,
            limit,
            developmentType: 'land',
          });
          return { items: devs.map(mapDevelopment), source: 'developments' };
        }

        if (input.tab === 'shared_living') {
          // Shared Living has its own journey identity. Until its executable
          // inventory contract exists, fail closed instead of using Rent as a
          // proxy and returning an unrelated rental feed.
          return { items: [], source: 'listings' };
        }

        // commercial
        const { propertySearchService } = await import('./services/propertySearchService');
        const commercialResults = await Promise.all(
          (['sale', 'rent'] as const).map(listingType =>
            propertySearchService.searchProperties(
              {
                province: locationFilter.province,
                city: locationFilter.city,
                suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
                propertyType: ['commercial'],
                listingType,
              } as any,
              'date_desc',
              1,
              limit,
            ),
          ),
        );
        const deduped = Array.from(
          new Map(
            commercialResults
              .flatMap(r => r.properties || [])
              .map((prop: any) => [String(prop.id), prop]),
          ).values(),
        ).slice(0, limit);

        return { items: deduped.map(mapListing), source: 'listings' };
      };

      const requestedScope: LocationScope = requestedSuburb
        ? 'suburb'
        : requestedCity
          ? 'city'
          : requestedProvince
            ? 'province'
            : 'national';

      const locationCandidates: Array<{ scope: LocationScope; filters: LocationFilter }> = [];

      if (requestedSuburb) {
        locationCandidates.push({
          scope: 'suburb',
          filters: {
            province: requestedProvince,
            city: requestedCity,
            suburb: requestedSuburb,
          },
        });
      }

      if (requestedCity) {
        locationCandidates.push({
          scope: 'city',
          filters: {
            province: requestedProvince,
            city: requestedCity,
          },
        });
      }

      if (requestedProvince) {
        locationCandidates.push({
          scope: 'province',
          filters: {
            province: requestedProvince,
          },
        });
      }

      locationCandidates.push({ scope: 'national', filters: {} });

      const dedupedCandidates = locationCandidates.filter(
        (candidate, idx, all) =>
          all.findIndex(
            c =>
              c.scope === candidate.scope &&
              (c.filters.province || '') === (candidate.filters.province || '') &&
              (c.filters.city || '') === (candidate.filters.city || '') &&
              (c.filters.suburb || '') === (candidate.filters.suburb || ''),
          ) === idx,
      );

      let items: FeedItem[] = [];
      let source: 'developments' | 'listings' | 'units' | 'mixed' = 'developments';
      let selectedScope: LocationScope = requestedScope;

      for (const candidate of dedupedCandidates) {
        const result = await fetchTabItems(candidate.filters);
        if (result.items.length > 0 || candidate.scope === 'national') {
          items = result.items;
          source = result.source;
          selectedScope = candidate.scope;
          break;
        }
      }

      const usedFallback = requestedScope !== selectedScope;
      const fallbackLevel = usedFallback ? `${requestedScope}_to_${selectedScope}` : 'none';

      return {
        items,
        meta: {
          tab: input.tab,
          source,
          usedFallback,
          fallbackLevel,
          requestedScope,
          selectedScope,
          requestedProvince: requestedProvince ?? null,
          requestedCity: requestedCity ?? null,
          requestedSuburb: requestedSuburb ?? null,
          resultCount: items.length,
        },
      };
    }),

  getPublicDevelopmentBySlug: publicProcedure
    .input(z.object({ slugOrId: z.string().min(1) }))
    .query(async ({ input }) => {
      return await developmentService.getPublicDevelopmentBySlug(input.slugOrId);
    }),

  listPublicDevelopments: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await developmentService.listPublicDevelopments({
        limit: input.limit,
      });
    }),

  createLead: publicProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        cataloguePublisherId: z.number().int().positive().optional(),
        unitId: z.string().trim().max(36).optional(),
        unitName: z.string().trim().max(255).optional(),
        unitPriceFrom: z.number().nonnegative().optional(),
        unitBedrooms: z.number().int().nonnegative().optional(),
        unitBathrooms: z.number().nonnegative().optional(),
        leadType: z.enum(['inquiry', 'viewing_request']).default('inquiry'),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().optional(),
        affordabilityData: z
          .object({
            monthlyIncome: z.number().optional(),
            monthlyExpenses: z.number().optional(),
            monthlyDebts: z.number().optional(),
            availableDeposit: z.number().optional(),
            maxAffordable: z.number().optional(),
            calculatedAt: z.string().optional(),
          })
          .optional(),
        referrerUrl: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        sourceSurface: z.string().optional(),
        leadSource: z.string().optional(),
        captureRequestId: z.string().trim().min(8).max(128),
        consent: z.object({
          accepted: z.literal(true),
          version: z.string().trim().min(1).max(64),
          source: z.string().trim().max(100).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await capturePublicLead({
        developmentId: input.developmentId,
        cataloguePublisherId: input.cataloguePublisherId,
        unitId: input.unitId,
        unitName: input.unitName,
        unitPriceFrom: input.unitPriceFrom,
        unitBedrooms: input.unitBedrooms,
        unitBathrooms: input.unitBathrooms,
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        leadType: input.leadType,
        source: input.sourceSurface || 'development_detail',
        sourceSurface: input.sourceSurface || 'development_detail',
        leadSource: input.leadSource || 'development_detail',
        referrerUrl: input.referrerUrl,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        authenticatedUserId: ctx.user?.id,
        affordabilityData: input.affordabilityData,
        captureRequestId: input.captureRequestId,
        consent: input.consent,
      });
    }),

  getLeads: protectedProcedure
    .input(
      z
        .object({
          developmentId: z.number().int().positive().optional(),
          stage: LeadStageSchema.optional(),
          owner: LeadOwnerTypeSchema.optional(),
          source: z.string().trim().max(120).optional(),
          q: z.string().trim().max(120).optional(),
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(200).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await listDeveloperLeads({
        developerId: profile.publisherId,
        developmentId: input?.developmentId,
        stage: input?.stage,
        owner: input?.owner,
        source: input?.source,
        q: input?.q,
        from: input?.from,
        to: input?.to,
        limit: input?.limit,
        offset: input?.offset,
      });
    }),

  assignLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        ownerType: LeadOwnerTypeSchema,
        ownerId: z.number().int().positive().nullable().optional(),
        assignmentMode: AssignmentModeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await assignDeveloperLead({
        developerId: profile.publisherId,
        leadId: input.leadId,
        ownerType: input.ownerType,
        ownerId: input.ownerId ?? null,
        assignmentMode: input.assignmentMode,
      });
    }),

  transitionLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        toStage: LeadStageSchema,
        notes: z.string().max(2000).optional(),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await transitionDeveloperLead({
        developerId: profile.publisherId,
        userId: user.id,
        leadId: input.leadId,
        toStage: input.toStage,
        notes: input.notes,
        force: input.force,
      });
    }),

  logLeadActivity: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        type: z.enum(['note', 'call', 'email', 'meeting', 'status_change', 'whatsapp']),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await logDeveloperLeadActivity({
        developerId: profile.publisherId,
        userId: user.id,
        leadId: input.leadId,
        type: input.type,
        description: input.description,
      });
    }),

  setLeadNextAction: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        at: z.string().datetime(),
        type: z.enum(['call', 'email', 'whatsapp', 'schedule_viewing', 'send_brochure', 'other']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await setDeveloperLeadNextAction({
        developerId: profile.publisherId,
        userId: user.id,
        leadId: input.leadId,
        at: input.at,
        type: input.type,
      });
    }),

  getDistributionSettings: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDeveloperDistributionEnabled();
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperDistributionSettings({
        developerId: profile.publisherId,
        developmentId: input.developmentId,
      });
    }),

  setDistributionEnabled: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDeveloperDistributionEnabled();
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await setDeveloperDistributionEnabled({
        developerId: profile.publisherId,
        userId: user.id,
        developmentId: input.developmentId,
        enabled: input.enabled,
      });
    }),

  getFunnelKPIs: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive().optional(),
        range: z.enum(['7d', '30d', '90d']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperFunnelKpis({
        developerId: profile.publisherId,
        developmentId: input.developmentId,
        range: input.range ?? '30d',
      });
    }),

  getFunnelAttention: protectedProcedure
    .input(
      z
        .object({
          developmentId: z.number().int().positive().optional(),
          range: z.enum(['7d', '30d', '90d']).optional(),
          sla: SlaStatusSchema.optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperFunnelAttention({
        developerId: profile.publisherId,
        developmentId: input?.developmentId,
        range: input?.range ?? '30d',
        sla: input?.sla,
        limit: input?.limit,
      });
    }),

  createDevelopment: protectedProcedure
    .input(
      z
        .object({
          name: z.string(),
          developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']).optional(),
        })
        .passthrough(),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const role = user.role;
      if (role === 'super_admin') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Super admins must create developments through the canonical publisher workflow.',
        });
      }

      const identity = await resolveOperatingIdentity(ctx, { mode: 'developer' });
      if (identity.mode !== 'developer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'A canonical developer identity is required for development authoring.',
        });
      }

      const serverAuthorizedInput = { ...(input as Record<string, unknown>) };
      for (const authorityField of [
        'developerId',
        'developerProfileId',
        'cataloguePublisherId',
        'marketingBrandProfileId',
        'devOwnerType',
        'ownerType',
      ]) {
        delete serverAuthorizedInput[authorityField];
      }

      const development = await developmentService.createDevelopment(
        user.id,
        serverAuthorizedInput as any,
        {
          cataloguePublisherId: identity.cataloguePublisherId ?? undefined,
          ownerType: 'developer',
        },
        null,
      );

      return { development };
    }),

  deleteDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      // Use operatingAs from applyPublisherContext middleware
      const operatingAs = (ctx as any).operatingAs;

      // Debug: Log context again to confirm router sees what middleware set
      console.log('[deleteDevelopment Router] Context inspection:', {
        userId: user.id,
        userRole: user.role,
        operatingAs: operatingAs,
        hasOperatingAs: !!operatingAs,
      });

      // Build operating context for super admin emulation
      const operatingContext = operatingAs?.cataloguePublisherId
        ? { cataloguePublisherId: operatingAs.cataloguePublisherId }
        : null;

      console.log('[deleteDevelopment Router] Built operatingContext:', operatingContext);

      const deletionResult = await developmentService.deleteDevelopment(
        input.id,
        user.id,
        operatingContext,
      );
      const affectedRows = Number(
        (deletionResult as any)?.affectedRows ?? (deletionResult as any)?.[0]?.affectedRows ?? 0,
      );
      if (affectedRows !== 1) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Development deletion did not affect an authorized development.',
        });
      }

      return { success: true, deletedId: input.id };
    }),

  getDashboardKPIs: protectedProcedure
    .input(
      z
        .object({
          timeRange: z.enum(['7d', '30d', '90d']).optional(),
          forceRefresh: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        return await getKPIsWithCache(
          profile.organisationId,
          input?.timeRange,
          input?.forceRefresh ?? false,
        );
      } catch (error) {
        console.warn('[developer.getDashboardKPIs] Returning safe defaults due to error:', error);
        return EMPTY_DEVELOPER_KPIS;
      }
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return developerSubscriptionService.ensureSubscription(profile.organisationId);
  }),

  getActivityFeed: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return await getActivityFeedService(profile.organisationId);
  }),

  /**
   * Get Developer Profile (Dashboard)
   * Secured by role guard: property_developer or super_admin
   * Supports brand emulation for super admins
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    const operatingAs = ctx.operatingAs;
    const role = user.role;

    if (role !== 'property_developer' && role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient role for developer profile.',
      });
    }

    // Resolve the server-authorized platform-curator identity before returning
    // a developer-facing operating view.
    if (role === 'super_admin' && operatingAs) {
      const identity = await resolveOperatingIdentity(ctx, { mode: 'platform_curator' });
      if (
        identity.mode !== 'platform_curator' ||
        (identity.publisherType !== 'developer' && identity.publisherType !== 'hybrid')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Platform curator context must be developer or hybrid type for developer profile.',
        });
      }

      // Return the selected platform brand as the operating developer view.
      const publisherProfile = await getPublisherById(identity.cataloguePublisherId);
      if (!publisherProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Catalogue Publisher ${identity.cataloguePublisherId} not found.`,
        });
      }

      // Transform Catalogue Publisher to match expected developer profile format
      return {
        id: publisherProfile.id,
        userId: user.id, // Use super admin's user ID for context
        companyName: publisherProfile.brandName,
        cataloguePublisherId: publisherProfile.id,
        logoUrl: publisherProfile.logoUrl,
        about: publisherProfile.about,
        websiteUrl: publisherProfile.websiteUrl,
        foundedYear: publisherProfile.foundedYear,
        headOfficeLocation: publisherProfile.headOfficeLocation,
        operatingProvinces: publisherProfile.operatingProvinces,
        propertyFocus: publisherProfile.propertyFocus,
        // Operating-identity fields
        isPlatformCurator: true,
        operatingMode: 'platform_curator',
        actualUser: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }

    if (role === 'super_admin' && !operatingAs) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'BRAND_CONTEXT_REQUIRED',
      });
    }

    // Normal real user flow
    const profile = await getDeveloperByUserId(user.id);

    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found.' });
    }

    return profile;
  }),

  // ------------------------------

  updateDevelopment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.record(z.any()), // Accepts loose partial updates
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await resolveOperatingIdentity(ctx, { mode: 'developer' });
      return await developmentService.updateDevelopment(
        input.id,
        requireUser(ctx).id,
        input.data as any,
      );
    }),

  getDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);

        // NOTE: Using getDevelopmentWithPhases to ensure we return full object
        const dev = await developmentService.getDevelopmentWithPhases(input.id);
        if (!dev) return null;

        if (dev.cataloguePublisherId !== profile.publisherId) {
          return null;
        }
        return dev;
      } catch (error) {
        console.warn('[developer.getDevelopment] Returning null due to error:', error);
        return null;
      }
    }),

  getOperatingHome: protectedProcedure
    .input(DeveloperOperatingHomeInputSchema)
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const identity = await resolveOperatingIdentity(ctx, {
        mode: user.role === 'super_admin' ? 'platform_curator' : 'developer',
      });
      const scope: DeveloperOperatingHomeScope =
        identity.mode === 'developer'
          ? {
              mode: 'developer',
              organisationId: identity.organisationId,
              cataloguePublisherId: identity.cataloguePublisherId,
            }
          : {
              mode: 'platform_curator',
              cataloguePublisherId: identity.cataloguePublisherId,
            };

      return getDeveloperOperatingHome({ scope, range: input.range });
    }),

  getDevelopmentHome: protectedProcedure
    .input(DevelopmentHomeInputSchema)
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const selectIdentity = {
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

      let row: DevelopmentHomeIdentityRow | undefined;
      let publicationAccess: DeveloperPublicationAccess | null = null;

      if (user.role === 'property_developer') {
        // Development Home is a read model. Its existing ownership helper is
        // already server-derived; S4 will replace this read model wholesale.
        const profile = await requireDeveloperProfileByUserId(user.id);
        [row] = await dbConn
          .select(selectIdentity)
          .from(developments)
          .where(
            and(
              eq(developments.id, input.developmentId),
              eq(developments.cataloguePublisherId, profile.publisherId),
            ),
          )
          .limit(1);
        if (profile.organisationId) {
          publicationAccess = await getDeveloperPublicationAccess(profile.organisationId, {
            db: dbConn,
          });
        }
      } else if (user.role === 'super_admin') {
        const operatingAs = ctx.operatingAs;
        if (!operatingAs?.cataloguePublisherId) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'PUBLISHER_CONTEXT_REQUIRED',
          });
        }
        if (operatingAs.publisherType !== 'developer' && operatingAs.publisherType !== 'hybrid') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Developer or hybrid brand context is required for Development Home.',
          });
        }

        [row] = await dbConn
          .select(selectIdentity)
          .from(developments)
          .where(
            and(
              eq(developments.id, input.developmentId),
              eq(developments.cataloguePublisherId, operatingAs.cataloguePublisherId),
            ),
          )
          .limit(1);
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or contextual super admins can access Development Home.',
        });
      }

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found' });
      }

      const persistedUnitTypes = await dbConn
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.developmentId, row.id));
      const blockers: DevelopmentHomeReadinessBlocker[] = validatePersistedSubmissionReadiness(
        row,
        persistedUnitTypes,
      ).map(blocker => ({ ...blocker, severity: 'critical' }));
      const inventory = buildDevelopmentHomeInventory(row, persistedUnitTypes, blockers);
      const reviewRows: DevelopmentHomeReviewRow[] = await dbConn
        .select({
          id: developmentApprovalQueue.id,
          status: developmentApprovalQueue.status,
          submittedAt: developmentApprovalQueue.submittedAt,
          reviewedAt: developmentApprovalQueue.reviewedAt,
          reviewNotes: developmentApprovalQueue.reviewNotes,
          rejectionReason: developmentApprovalQueue.rejectionReason,
        })
        .from(developmentApprovalQueue)
        .where(eq(developmentApprovalQueue.developmentId, row.id))
        .orderBy(desc(developmentApprovalQueue.submittedAt), desc(developmentApprovalQueue.id))
        .limit(3);
      const latestReviewRow = reviewRows[0] ?? null;
      const latestReview = latestReviewRow
        ? {
            status: latestReviewRow.status,
            submittedAt: latestReviewRow.submittedAt,
            reviewedAt: latestReviewRow.reviewedAt,
            feedback:
              developerVisibleReviewFeedback(latestReviewRow) ??
              (latestReviewRow.status === 'rejected' ? row.rejectionNote?.trim() || null : null),
          }
        : null;
      const currentChangesRequestedFeedback =
        row.approvalStatus === 'draft' && latestReview?.status === 'changes_requested'
          ? latestReview.feedback
          : null;
      const commercialEligible = publicationAccess?.eligible ?? true;
      const lifecycleState = deriveDevelopmentHomeLifecycleState({
        ...row,
        blockers,
        currentReviewStatus: latestReview?.status ?? null,
        currentChangesRequestedFeedback,
        commercialEligible,
      });
      const isPublished = Number(row.isPublished) === 1;
      // A single server timestamp keeps all selected-period demand, funnel, and SLA values aligned.
      const leadSummary = await getOwnedDevelopmentHomeLeadSummary({
        developmentId: row.id,
        range: input.range,
        now: new Date(),
      });
      const attention = buildDevelopmentHomeAttention({
        developmentId: row.id,
        range: input.range,
        lifecycleState,
        latestReviewFeedback: latestReview?.feedback ?? null,
        blockers,
        inventory,
        funnel: leadSummary.funnel,
        commercialAccessRequired: row.approvalStatus === 'approved' && !commercialEligible,
      });
      const distribution = await getDevelopmentHomeDistribution({
        db: dbConn,
        developmentId: row.id,
      });

      return {
        development: {
          id: row.id,
          name: row.name,
          slug: row.slug,
          location: {
            address: row.address ?? null,
            suburb: row.suburb ?? null,
            city: row.city,
            province: row.province,
          },
          transactionType: row.transactionType,
          approvalStatus: row.approvalStatus,
          isPublished,
          publishedAt: row.publishedAt,
          publicEligible: isDevelopmentHomePublicEligible({ ...row, commercialEligible }),
          lifecycleState,
        },
        readiness: {
          state: lifecycleState,
          blockers,
          latestReview,
          recentReviewHistory: reviewRows.map(review => ({
            status: review.status,
            submittedAt: review.submittedAt,
            reviewedAt: review.reviewedAt,
            feedback: developerVisibleReviewFeedback(review),
          })),
        },
        demand: leadSummary.demand,
        funnel: leadSummary.funnel,
        inventory,
        attention,
        publication: {
          publicEligible: isDevelopmentHomePublicEligible({ ...row, commercialEligible }),
          commercialAccess: publicationAccess,
        },
        distribution,
        range: input.range,
      };
    }),

  getDevelopments: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    const identity = await resolveOperatingIdentity(ctx, {
      mode: user.role === 'super_admin' ? 'platform_curator' : 'developer',
    });
    const scope: DeveloperOperatingHomeScope =
      identity.mode === 'developer'
        ? {
            mode: 'developer',
            organisationId: identity.organisationId,
            cataloguePublisherId: identity.cataloguePublisherId,
          }
        : {
            mode: 'platform_curator',
            cataloguePublisherId: identity.cataloguePublisherId,
          };
    const home = await getDeveloperOperatingHome({ scope, range: '30d' });

    return home.developments.map(development => ({
      id: development.identity.id,
      name: development.identity.name,
      slug: development.identity.slug,
      address: development.identity.location.address,
      suburb: development.identity.location.suburb,
      city: development.identity.location.city,
      province: development.identity.location.province,
      images: development.identity.imageUrl ? [development.identity.imageUrl] : [],
      approvalStatus: development.lifecycle.approvalStatus,
      isPublished: development.lifecycle.isPublished ? 1 : 0,
      publishedAt: development.lifecycle.publishedAt,
      lifecycleState: development.lifecycle.state,
      readiness: development.readiness,
      inventory: development.inventory,
      leads: development.leads,
      attention: development.attention,
      nextAction: development.nextAction,
      rejectionReason: development.lifecycle.latestReview?.feedback ?? null,
      priceFrom: development.inventory.pricing.from,
    }));
  }),

  upgradeSubscription: protectedProcedure
    .input(z.object({ tier: z.enum(['basic', 'premium']) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const subscription = await developerSubscriptionService.ensureSubscription(
        profile.organisationId,
      );

      return {
        success: false,
        status: 'sales_assisted' as const,
        currentTier: subscription?.commercial.planName || null,
        requestedTier: input.tier,
        currentPlan: subscription?.commercial.planDisplayName || null,
        message:
          'Paid developer plan changes are sales-assisted until developer EFT billing is enabled. Your current entitlement has not changed.',
      };
    }),

  getUnreadNotificationsCount: protectedProcedure.query(async () => {
    return { count: 0 };
  }),

  publishDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const user = requireUser(ctx);
      await resolveOperatingIdentity(
        ctx,
        user.role === 'super_admin' ? { mode: 'platform_curator' } : { mode: 'developer' },
      );

      // Simplified: Let the service handle super admin vs developer logic
      const result = await developmentService.publishDevelopment(
        input.id,
        user.id,
        ctx.operatingAs, // Server-derived platform-curator context, when present
      );

      return result;
    }),

  unpublishDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const result = await developmentService.unpublishDevelopment(input.id, requireUser(ctx).id);
      return result;
    }),
});

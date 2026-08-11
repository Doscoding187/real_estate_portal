import { z } from 'zod';
import { router, protectedProcedure, publicProcedure, superAdminProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { ENV } from './_core/env';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import * as partnershipService from './services/partnershipService';
import { getDeveloperByUserId, requireDeveloperProfileByUserId } from './services/developerService'; // [NEW] Import service methods
import { getBrandProfileById } from './services/developerBrandProfileService';
import { developerBrandProfileService } from './services/developerBrandProfileService';
import {
  calculateAffordabilityCompanion,
  matchUnitsToAffordability,
} from './services/affordabilityCompanion';
import { getActivityFeed as getActivityFeedService } from './services/activityService';
import { getKPIsWithCache } from './services/kpiService';
import { seedCleanupService } from './services/seedCleanupService';
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
  developers,
  developerBrandProfiles,
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

console.log('[DEV ROUTER LOADED] build stamp', new Date().toISOString());

export type DevelopmentHomeLifecycleState =
  | 'live'
  | 'approved_private'
  | 'in_review'
  | 'changes_required'
  | 'rejected'
  | 'draft_ready_to_submit'
  | 'draft_action_required';

export type CanonicalDevelopmentReviewStatus = NonNullable<
  (typeof developmentApprovalQueue.$inferSelect)['status']
>;

export const DevelopmentHomeInputSchema = z
  .object({
    developmentId: z.number().int().positive(),
    range: z.enum(['7d', '30d', '90d']),
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

type DevelopmentHomeReviewRow = Pick<
  typeof developmentApprovalQueue.$inferSelect,
  'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewNotes' | 'rejectionReason'
>;

type DevelopmentHomeReadinessBlocker = {
  field: string;
  message: string;
  severity: 'critical';
};

function developerVisibleReviewFeedback(
  review: Pick<DevelopmentHomeReviewRow, 'status' | 'reviewNotes' | 'rejectionReason'>,
): string | null {
  if (review.status === 'changes_requested') return review.reviewNotes?.trim() || null;
  if (review.status === 'rejected') return review.rejectionReason?.trim() || null;
  return null;
}

export function deriveDevelopmentHomeLifecycleState(input: {
  approvalStatus: (typeof developments.$inferSelect)['approvalStatus'];
  isPublished: (typeof developments.$inferSelect)['isPublished'];
  blockers?: readonly DevelopmentHomeReadinessBlocker[];
  currentChangesRequestedFeedback?: string | null;
}): DevelopmentHomeLifecycleState {
  if (input.approvalStatus === 'approved' && Number(input.isPublished) === 1) return 'live';
  if (input.approvalStatus === 'approved') return 'approved_private';
  if (input.approvalStatus === 'pending') return 'in_review';
  if (input.approvalStatus === 'rejected') return 'rejected';
  if (input.currentChangesRequestedFeedback?.trim()) return 'changes_required';
  if ((input.blockers?.length ?? 0) === 0) return 'draft_ready_to_submit';
  return 'draft_action_required';
}

export function isDevelopmentHomePublicEligible(input: {
  approvalStatus: (typeof developments.$inferSelect)['approvalStatus'];
  isPublished: (typeof developments.$inferSelect)['isPublished'];
}): boolean {
  return input.approvalStatus === 'approved' && Number(input.isPublished) === 1;
}

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
async function resolvePublicBrandProfile(profile: any) {
  if (!profile || Number(profile.isVisible) !== 1) return null;

  if (!profile.linkedDeveloperAccountId) {
    return { brandProfile: profile, developer: null };
  }

  const dbConn = await db.getDb();
  if (!dbConn) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
  }

  const [linkedDeveloper] = await dbConn
    .select()
    .from(developers)
    .where(eq(developers.id, profile.linkedDeveloperAccountId))
    .limit(1);

  // Subscriber brands are not public until the underlying developer is approved.
  if (!linkedDeveloper || linkedDeveloper.status !== 'approved') return null;

  return { brandProfile: profile, developer: linkedDeveloper };
}

function toPublicBrandProfileResponse(brandProfile: any, developer: any) {
  const publicEmail = brandProfile.publicContactEmail || developer?.email || null;

  return {
    id: brandProfile.id,
    type: 'brand' as const,
    name: brandProfile.brandName,
    slug: brandProfile.slug,
    logo: brandProfile.logoUrl || developer?.logo || null,
    description: brandProfile.about || developer?.description || null,
    address: brandProfile.headOfficeLocation || developer?.address || null,
    phones: developer?.phone ? [developer.phone] : [],
    emails: publicEmail ? [publicEmail] : [],
    website: brandProfile.websiteUrl || developer?.website || null,
    isClaimable:
      Number(brandProfile.isClaimable || 0) === 1 && brandProfile.ownerType === 'platform',
    stats: {
      isVerified: Number(brandProfile.isContactVerified || developer?.isVerified || 0) === 1,
      isTrusted: Number(developer?.isTrusted || 0) === 1,
      establishedYear: brandProfile.foundedYear || developer?.establishedYear || null,
      totalProjects: Number(developer?.totalProjects || 0),
    },
  };
}

function toPublicDeveloperResponse(developer: any) {
  return {
    id: developer.id,
    type: 'subscriber' as const,
    name: developer.name,
    slug: developer.slug,
    logo: developer.logo || null,
    description: developer.description || null,
    address: developer.address || null,
    phones: developer.phone ? [developer.phone] : [],
    emails: developer.email ? [developer.email] : [],
    website: developer.website || null,
    isClaimable: false,
    stats: {
      isVerified: Number(developer.isVerified || 0) === 1,
      isTrusted: Number(developer.isTrusted || 0) === 1,
      establishedYear: developer.establishedYear || null,
      totalProjects: Number(developer.totalProjects || 0),
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
      .where(eq(developments.developerId, profile.id));

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
        developerBrandProfileId: profile.developerBrandProfileId ?? null,
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
      const brandProfile = await developerBrandProfileService.getBrandProfileBySlug(input.slug);
      const resolvedBrand = await resolvePublicBrandProfile(brandProfile);
      if (resolvedBrand) {
        return toPublicBrandProfileResponse(resolvedBrand.brandProfile, resolvedBrand.developer);
      }

      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }

      const [developer] = await dbConn
        .select()
        .from(developers)
        .where(and(eq(developers.slug, input.slug), eq(developers.status, 'approved')))
        .limit(1);

      return developer ? toPublicDeveloperResponse(developer) : null;
    }),

  getPublicDevelopmentsForProfile: publicProcedure
    .input(
      z.object({
        profileType: z.enum(['brand', 'subscriber']),
        profileId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      if (input.profileType === 'brand') {
        const resolvedBrand = await resolvePublicBrandProfile(
          await getBrandProfileById(input.profileId),
        );
        if (!resolvedBrand) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer brand not found' });
        }

        return developmentService.listPublicDevelopments({
          developerBrandProfileId: resolvedBrand.brandProfile.id,
        });
      }

      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      }
      const [developer] = await dbConn
        .select()
        .from(developers)
        .where(and(eq(developers.id, input.profileId), eq(developers.status, 'approved')))
        .limit(1);

      if (!developer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer not found' });
      }

      return developmentService.listPublicDevelopments({ developerId: developer.id });
    }),

  searchDevelopers: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(2),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      return await db.searchDevelopers(input.query, input.limit);
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
      return await db.searchDevelopments(input.query, input.developerId, input.limit);
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
      const existingProfile = await getDeveloperByUserId(requireUser(ctx).id);
      if (existingProfile) return existingProfile;

      // Generate slug for seed cleanup check (use shared generator for consistency)
      const generatedSlug = seedCleanupService.generateSlug(input.name);

      // Clean up any matching seeded brand profile BEFORE creating the real one
      // This blocks registration if deletion fails (fail-fast)
      const cleanupResult = await seedCleanupService.handleSeedDeletionOnRegistration(
        requireUser(ctx).id,
        input.name,
        generatedSlug,
        undefined, // seedBatchId not known at registration
        ctx.req,
      );

      if (cleanupResult.deleted) {
        console.log(
          '[developerRouter.createProfile] Cleaned up seeded brand:',
          cleanupResult.deletedCounts,
        );
      }

      const developerId = await db.createDeveloper({
        name: input.name,
        description: input.description || undefined,
        logo: input.logo || undefined,
        website: input.website || undefined,
        email: input.email,
        phone: input.phone || undefined,
        address: input.address || undefined,
        city: input.city,
        province: input.province,
        category: (input.category as any) || undefined,
        specializations: input.specializations,
        establishedYear: input.establishedYear ?? null,
        completedProjects: input.completedProjects ?? 0,
        currentProjects: input.currentProjects ?? 0,
        upcomingProjects: input.upcomingProjects ?? 0,
        userId: requireUser(ctx).id,
      });

      const brandProfile = await developerBrandProfileService.createBrandProfile({
        brandName: input.name,
        logoUrl: input.logo || null,
        about: input.description || null,
        foundedYear: input.establishedYear ?? null,
        headOfficeLocation:
          input.city && input.province ? `${input.city}, ${input.province}` : null,
        operatingProvinces: input.province ? [input.province] : [],
        propertyFocus: input.specializations || [],
        websiteUrl: input.website || null,
        publicContactEmail: input.email || null,
        identityType: 'developer',
        // Public discovery starts only after the developer account is approved.
        isVisible: false,
        createdBy: requireUser(ctx).id,
      });

      await developerBrandProfileService.updateBrandProfile(brandProfile.id, {
        isSubscriber: true,
        isClaimable: false,
        ownerType: 'developer',
        linkedDeveloperAccountId: developerId,
      });

      const profile = await getDeveloperByUserId(requireUser(ctx).id);
      if (!profile) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Profile creation failed.' });
      }

      await developerSubscriptionService.ensureSubscription(profile.id);

      return profile;
    }),
  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        brandProfileId: z.number().int().optional(),
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

      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) {
          return { id: input.id ?? Date.now(), success: false, draftData: sanitized };
        }

        if (input.id) {
          const updateSet: Record<string, any> = {
            draftName,
            draftData: sanitized,
            progress,
            currentStep,
            lastModified: new Date().toISOString(),
          };
          if (input.brandProfileId !== undefined) {
            updateSet.developerBrandProfileId = input.brandProfileId;
          }

          await dbConn
            .update(developmentDrafts)
            .set(updateSet)
            .where(
              and(
                eq(developmentDrafts.id, input.id),
                eq(developmentDrafts.developerId, profile.id),
              ),
            );

          return { id: input.id, success: true, draftData: sanitized };
        }

        const insertResult = await dbConn.insert(developmentDrafts).values({
          developerId: profile.id,
          developerBrandProfileId: input.brandProfileId ?? null,
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
      } catch (error) {
        console.warn('[developer.saveDraft] Falling back to safe response:', error);
        return { id: input.id ?? Date.now(), success: false, draftData: sanitized };
      }
    }),

  getDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) return null;

        const [draft] = await dbConn
          .select()
          .from(developmentDrafts)
          .where(
            and(eq(developmentDrafts.id, input.id), eq(developmentDrafts.developerId, profile.id)),
          )
          .limit(1);

        if (!draft) return null;

        return {
          ...draft,
          draftData: sanitizeDraftData((draft as any).draftData ?? {}),
        };
      } catch (error) {
        console.warn('[developer.getDraft] Returning null due to error:', error);
        return null;
      }
    }),

  getDrafts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const dbConn = await db.getDb();
      if (!dbConn) return [];

      const drafts = await dbConn
        .select()
        .from(developmentDrafts)
        .where(eq(developmentDrafts.developerId, profile.id))
        .orderBy(desc(developmentDrafts.lastModified));

      return drafts.map((draft: any) => ({
        ...draft,
        draftData: sanitizeDraftData(draft?.draftData ?? {}),
      }));
    } catch (error) {
      console.warn('[developer.getDrafts] Returning empty list due to error:', error);
      return [];
    }
  }),

  deleteDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false, id: input.id };

        await dbConn
          .delete(developmentDrafts)
          .where(
            and(eq(developmentDrafts.id, input.id), eq(developmentDrafts.developerId, profile.id)),
          );

        return { success: true, id: input.id };
      } catch (error) {
        console.warn('[developer.deleteDraft] Safe fallback after error:', error);
        return { success: false, id: input.id };
      }
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
        developerBrandProfileId: z.number().int().positive().optional(),
        unitId: z.string().trim().max(36).optional(),
        unitName: z.string().trim().max(255).optional(),
        unitPriceFrom: z.number().nonnegative().optional(),
        unitBedrooms: z.number().int().nonnegative().optional(),
        unitBathrooms: z.number().nonnegative().optional(),
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
        developerBrandProfileId: input.developerBrandProfileId,
        unitId: input.unitId,
        unitName: input.unitName,
        unitPriceFrom: input.unitPriceFrom,
        unitBedrooms: input.unitBedrooms,
        unitBathrooms: input.unitBathrooms,
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        leadType: 'inquiry',
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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
        developerId: profile.id,
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

      const developerId = identity.developerId;
      const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'developments');
      if (!limitCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            limitCheck.max !== null && limitCheck.max > 0
              ? `Development limit reached for ${limitCheck.tier}. Request a canonical developer plan change to create more developments.`
              : 'A canonical developer product and development entitlement are required before creating a development.',
          cause: {
            current: limitCheck.current,
            max: limitCheck.max,
            plan: limitCheck.tier,
          },
        });
      }

      const serverAuthorizedInput = { ...(input as Record<string, unknown>) };
      for (const authorityField of [
        'developerId',
        'developerProfileId',
        'developerBrandProfileId',
        'brandProfileId',
        'devOwnerType',
        'ownerType',
      ]) {
        delete serverAuthorizedInput[authorityField];
      }

      const development = await developmentService.createDevelopment(
        user.id,
        serverAuthorizedInput as any,
        {
          brandProfileId: identity.brandProfileId ?? undefined,
          ownerType: 'developer',
        },
        null,
      );

      await developerSubscriptionService.incrementUsage(developerId, 'developments');

      return { development };
    }),

  deleteDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      // Use operatingAs from applyBrandContext middleware
      const operatingAs = (ctx as any).operatingAs;

      // Debug: Log context again to confirm router sees what middleware set
      console.log('[deleteDevelopment Router] Context inspection:', {
        userId: user.id,
        userRole: user.role,
        operatingAs: operatingAs,
        hasOperatingAs: !!operatingAs,
      });

      // Build operating context for super admin emulation
      const operatingContext = operatingAs?.brandProfileId
        ? { brandProfileId: operatingAs.brandProfileId }
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

      if (user.role === 'property_developer') {
        const profile = await requireDeveloperProfileByUserId(user.id);
        await developerSubscriptionService.decrementUsage(profile.id, 'developments');
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
        return await getKPIsWithCache(profile.id, input?.timeRange, input?.forceRefresh ?? false);
      } catch (error) {
        console.warn('[developer.getDashboardKPIs] Returning safe defaults due to error:', error);
        return EMPTY_DEVELOPER_KPIS;
      }
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return developerSubscriptionService.ensureSubscription(profile.id);
  }),

  getActivityFeed: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return await getActivityFeedService(profile.id);
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
        (identity.identityType !== 'developer' && identity.identityType !== 'hybrid')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Platform curator context must be developer or hybrid type for developer profile.',
        });
      }

      // Return the selected platform brand as the operating developer view.
      const brandProfile = await getBrandProfileById(identity.brandProfileId);
      if (!brandProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Brand profile ${identity.brandProfileId} not found.`,
        });
      }

      // Transform brand profile to match expected developer profile format
      return {
        id: brandProfile.id,
        userId: user.id, // Use super admin's user ID for context
        companyName: brandProfile.brandName,
        brandProfileId: brandProfile.id,
        logoUrl: brandProfile.logoUrl,
        about: brandProfile.about,
        websiteUrl: brandProfile.websiteUrl,
        foundedYear: brandProfile.foundedYear,
        headOfficeLocation: brandProfile.headOfficeLocation,
        operatingProvinces: brandProfile.operatingProvinces,
        propertyFocus: brandProfile.propertyFocus,
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

        if (dev.developerId !== profile.id) {
          return null;
        }
        return dev;
      } catch (error) {
        console.warn('[developer.getDevelopment] Returning null due to error:', error);
        return null;
      }
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

      if (user.role === 'property_developer') {
        // Development Home is a read model. Its existing ownership helper is
        // already server-derived; S4 will replace this read model wholesale.
        const profile = await requireDeveloperProfileByUserId(user.id);
        [row] = await dbConn
          .select(selectIdentity)
          .from(developments)
          .where(
            and(eq(developments.id, input.developmentId), eq(developments.developerId, profile.id)),
          )
          .limit(1);
      } else if (user.role === 'super_admin') {
        const operatingAs = ctx.operatingAs;
        if (!operatingAs?.brandProfileId) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'BRAND_CONTEXT_REQUIRED' });
        }
        if (operatingAs.brandType !== 'developer' && operatingAs.brandType !== 'hybrid') {
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
              eq(developments.developerBrandProfileId, operatingAs.brandProfileId),
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
      const lifecycleState = deriveDevelopmentHomeLifecycleState({
        ...row,
        blockers,
        currentChangesRequestedFeedback,
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
          publicEligible: isDevelopmentHomePublicEligible(row),
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
        distribution,
        range: input.range,
      };
    }),

  getDevelopments: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    console.log(
      `[developer.getDevelopments] userId=${requireUser(ctx).id} developerProfileId=${profile.id} filterDeveloperId=${profile.id}`,
    );
    return await developmentService.getDevelopmentsByDeveloperId(profile.id);
  }),

  upgradeSubscription: protectedProcedure
    .input(z.object({ tier: z.enum(['basic', 'premium']) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const subscription = await developerSubscriptionService.ensureSubscription(profile.id);

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

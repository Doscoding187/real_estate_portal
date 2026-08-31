import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import {
  searchSharedLivingSpaces,
  sharedLivingDetailBySlug,
} from './services/sharedLivingPublicService';
import {
  addSharedLivingSpace,
  approvePlace,
  createSharedLivingDraft,
  listMyPlaces,
  pendingReviewQueue,
  rejectPlace,
  submitPlaceForReview,
  updateOwnedSpace,
} from './services/sharedLivingAuthoringService';
import {
  hasVerifiedPhone,
  latestPhoneEvidence,
  sendPhoneVerificationOtp,
  verifyPhoneOtp,
} from './services/sharedLivingVerificationService';
import {
  listerThreadView,
  listListerThreads,
  replyAsListerThread,
  replyByToken,
  threadViewByToken,
} from './services/sharedLivingEnquiryService';
import {
  SHARED_LIVING_ACCOMMODATION_TYPES,
  SHARED_LIVING_MARKET_TAGS,
  SHARED_LIVING_PLACE_KINDS,
  SHARED_LIVING_SPACE_STATUSES,
} from '../shared/sharedLivingDomain';
import { resolveSharedLivingSearchGeography } from '../shared/sharedLivingSearchContract';

const billsSchema = z.object({
  electricity: z.boolean().default(false),
  water: z.boolean().default(false),
  wifi: z.boolean().default(false),
});

const sharedLivingSearchSchema = z
  .object({
    marketTag: z.enum(SHARED_LIVING_MARKET_TAGS).optional(),
    accommodationTypes: z.array(z.enum(SHARED_LIVING_ACCOMMODATION_TYPES)).max(10).optional(),
    /** Whole-Rand monthly budget values; the service converts to canonical minor units. */
    minPrice: z.number().finite().min(0).max(1_000_000).optional(),
    maxPrice: z.number().finite().min(0).max(1_000_000).optional(),
    billsElectricity: z.boolean().optional(),
    billsWifi: z.boolean().optional(),
    furnished: z.enum(['furnished', 'partial', 'any']).optional(),
    bathroom: z.enum(['own', 'shared', 'any']).optional(),
    availableFrom: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    locationId: z.string().trim().min(1).max(32).optional(),
    locationIds: z.array(z.string().trim().min(1).max(32)).min(2).max(5).optional(),
    /** Kept in the strict contract solely so unsupported Search Area handoffs reject visibly. */
    searchAreaId: z.string().trim().min(1).max(120).optional(),
    page: z.number().int().min(0).max(10_000).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const geography = resolveSharedLivingSearchGeography(input);
    if (geography.status === 'invalid' || geography.status === 'unsupported_search_area') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: geography.message,
        path: ['locationId'],
      });
    }
    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      input.minPrice > input.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum monthly rent cannot exceed maximum monthly rent.',
        path: ['minPrice'],
      });
    }
  });

function requireSuperAdmin(role: string | undefined): void {
  if (role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access required.' });
  }
}

/** Convert expected domain rejections into usable, non-500 public API errors. */
async function authoringBoundary<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    const domainCode = String((error as { code?: unknown })?.code || '');
    const message =
      error instanceof Error ? error.message : 'The Shared Living action could not be completed.';
    const code =
      domainCode === 'FORBIDDEN'
        ? 'FORBIDDEN'
        : domainCode === 'NOT_FOUND'
          ? 'NOT_FOUND'
          : domainCode === 'PHONE_VERIFICATION_REQUIRED'
            ? 'PRECONDITION_FAILED'
            : 'BAD_REQUEST';
    throw new TRPCError({ code, message });
  }
}

const capabilityTokenSchema = z.string().uuid();

export const sharedLivingRouter = router({
  // ---------- Independent public discovery ----------
  search: publicProcedure.input(sharedLivingSearchSchema.optional()).query(async ({ input }) => {
    const result = await searchSharedLivingSpaces(input ?? {});
    if (result.locationState === 'invalid' || result.locationState === 'unsupported_search_area') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: result.locationMessage || 'The Shared Living location selection is not valid.',
      });
    }
    return result;
  }),

  detail: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(180) }).strict())
    .query(({ input }) => sharedLivingDetailBySlug(input.slug)),

  // ---------- Canonical public enquiry + secure lead thread ----------
  enquire: publicProcedure
    .input(
      z
        .object({
          slPlaceId: z.number().int().positive(),
          slSpaceId: z.number().int().positive(),
          name: z.string().trim().min(2).max(120),
          email: z.string().trim().email().max(320),
          message: z.string().trim().min(5).max(4000),
          captureRequestId: capabilityTokenSchema,
          consent: z.object({ accepted: z.literal(true), version: z.string(), source: z.string() }),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const { capturePublicLead } = await import('./services/publicLeadCaptureService');
      const result = await capturePublicLead({
        ...input,
        authenticatedUserId: ctx.user?.id,
        source: 'shared_living',
        sourceSurface: 'shared_living_detail',
        leadSource: 'shared_living',
      });
      return { ...result, threadToken: input.captureRequestId };
    }),

  thread: publicProcedure
    .input(z.object({ token: capabilityTokenSchema }).strict())
    .query(({ input }) => threadViewByToken(input.token)),

  replyByToken: publicProcedure
    .input(
      z.object({ token: capabilityTokenSchema, body: z.string().trim().min(1).max(4000) }).strict(),
    )
    .mutation(({ input }) => replyByToken(input.token, input.body)),

  // ---------- Owner / practitioner authoring ----------
  verificationStatus: protectedProcedure.query(async ({ ctx }) => ({
    phoneVerified: await hasVerifiedPhone(Number(ctx.user?.id)),
    evidence: await latestPhoneEvidence(Number(ctx.user?.id)),
  })),

  sendPhoneOtp: protectedProcedure
    .input(z.object({ phone: z.string().trim().min(8).max(20) }).strict())
    .mutation(async ({ ctx, input }) => {
      const result = await sendPhoneVerificationOtp(Number(ctx.user?.id), input.phone);
      if (result.status === 'unconfigured') {
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Phone verification is not configured yet. Please try again later.',
        });
      }
      return result;
    }),

  verifyPhoneOtp: protectedProcedure
    .input(
      z
        .object({ phone: z.string().trim().min(8).max(20), code: z.string().trim().min(4).max(10) })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await verifyPhoneOtp(Number(ctx.user?.id), input.phone, input.code);
      if (result.status === 'rejected') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.reason });
      }
      return { verified: true };
    }),

  myPlaces: protectedProcedure.query(async ({ ctx }) => listMyPlaces(Number(ctx.user?.id))),

  createDraft: protectedProcedure
    .input(
      z
        .object({
          addressLinePrivate: z.string().trim().min(5).max(255),
          locationId: z.string().trim().min(1).max(32),
          placeKind: z.enum(SHARED_LIVING_PLACE_KINDS),
          description: z.string().trim().max(2000).optional(),
          spaceLabel: z.string().trim().min(2).max(120),
          accommodationType: z.enum(SHARED_LIVING_ACCOMMODATION_TYPES),
          marketTag: z.enum(SHARED_LIVING_MARKET_TAGS),
          rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
          rentUnknown: z.boolean().optional(),
          bills: billsSchema,
          availableFrom: z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          occupantsCount: z.number().int().min(0).max(50).optional(),
          mandateReference: z.string().trim().min(3).max(255).optional(),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      authoringBoundary(() =>
        createSharedLivingDraft({
          ...input,
          actorUserId: Number(ctx.user?.id),
          actorRole: ctx.user?.role,
        }),
      ),
    ),

  addSpace: protectedProcedure
    .input(
      z
        .object({
          placeId: z.number().int().positive(),
          spaceLabel: z.string().trim().min(2).max(120),
          accommodationType: z.enum(SHARED_LIVING_ACCOMMODATION_TYPES),
          marketTag: z.enum(SHARED_LIVING_MARKET_TAGS),
          rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
          rentUnknown: z.boolean().optional(),
          bills: billsSchema,
          availableFrom: z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      authoringBoundary(() =>
        addSharedLivingSpace({ ...input, actorUserId: Number(ctx.user?.id) }),
      ),
    ),

  updateSpace: protectedProcedure
    .input(
      z
        .object({
          spaceId: z.number().int().positive(),
          label: z.string().trim().min(2).max(120).optional(),
          rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
          rentUnknown: z.boolean().optional(),
          bills: billsSchema.optional(),
          availableFrom: z
            .union([
              z
                .string()
                .trim()
                .regex(/^\d{4}-\d{2}-\d{2}$/),
              z.literal(''),
            ])
            .optional(),
          status: z.enum(SHARED_LIVING_SPACE_STATUSES).optional(),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) =>
      authoringBoundary(async () => {
        await updateOwnedSpace(Number(ctx.user?.id), input.spaceId, {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.rentAmountMinor !== undefined
            ? { rentAmountMinor: input.rentAmountMinor }
            : {}),
          ...(input.rentUnknown !== undefined ? { rentUnknown: input.rentUnknown } : {}),
          ...(input.bills !== undefined ? { bills: input.bills } : {}),
          availableFrom: input.availableFrom === '' ? null : input.availableFrom,
          ...(input.status !== undefined ? { status: input.status } : {}),
        });
        return { updated: true };
      }),
    ),

  submitForReview: protectedProcedure
    .input(z.object({ placeId: z.number().int().positive() }).strict())
    .mutation(async ({ ctx, input }) =>
      authoringBoundary(async () => {
        await submitPlaceForReview(Number(ctx.user?.id), input.placeId);
        return { submitted: true };
      }),
    ),

  // ---------- Lister inbox / delivery acknowledgement ----------
  myListerThreads: protectedProcedure.query(({ ctx }) => listListerThreads(Number(ctx.user?.id))),

  listerThread: protectedProcedure
    .input(z.object({ token: capabilityTokenSchema }).strict())
    .query(async ({ ctx, input }) => {
      const view = await listerThreadView(Number(ctx.user?.id), input.token);
      if (!view)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This thread is not one of your listings.',
        });
      return view;
    }),

  replyAsLister: protectedProcedure
    .input(
      z.object({ token: capabilityTokenSchema, body: z.string().trim().min(1).max(4000) }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user?.id);
      if (!(await replyAsListerThread(userId, input.token, input.body))) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This thread is not one of your listings.',
        });
      }
      return { ok: true };
    }),

  // ---------- Moderation ----------
  moderationQueue: protectedProcedure.query(async ({ ctx }) => {
    requireSuperAdmin(ctx.user?.role);
    return pendingReviewQueue();
  }),

  moderateApprove: protectedProcedure
    .input(z.object({ placeId: z.number().int().positive() }).strict())
    .mutation(async ({ ctx, input }) =>
      authoringBoundary(async () => {
        requireSuperAdmin(ctx.user?.role);
        await approvePlace(Number(ctx.user?.id), input.placeId);
        return { approved: true };
      }),
    ),

  moderateReject: protectedProcedure
    .input(
      z
        .object({ placeId: z.number().int().positive(), reason: z.string().trim().min(3).max(255) })
        .strict(),
    )
    .mutation(async ({ ctx, input }) =>
      authoringBoundary(async () => {
        requireSuperAdmin(ctx.user?.role);
        await rejectPlace(Number(ctx.user?.id), input.placeId, input.reason);
        return { rejected: true };
      }),
    ),
});

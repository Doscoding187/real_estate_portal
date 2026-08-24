import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { getDb } from './db-connection';
import { leads, slLeadContexts, slMessages, slPlaces } from '../drizzle/schema';
import {
  searchSharedLivingSpaces,
  sharedLivingDetailBySlug,
} from './services/sharedLivingPublicService';
import {
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
  appendThreadMessage,
  ensureLeadContextRow,
  listerOwnsThread,
  replyByToken,
  resolveSharedLivingLeadCustody,
  threadViewByToken,
} from './services/sharedLivingEnquiryService';

const billsSchema = z.object({
  electricity: z.boolean().default(false),
  water: z.boolean().default(false),
  wifi: z.boolean().default(false),
});

const accommodationTypeValues = [
  'private_room',
  'shared_room',
  'en_suite_room',
  'garden_cottage',
  'granny_flat',
  'bachelor_studio',
  'backyard_room',
  'backyard_unit',
  'room_shared_house',
  'room_shared_apartment',
] as const;

function requireSuperAdmin(role: string | undefined): void {
  if (role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access required.' });
  }
}

async function leadIdForToken(token: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.captureRequestId, token))
    .limit(1);
  if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found.' });
  return Number(lead.id);
}

export const sharedLivingRouter = router({
  // ---------- Public read ----------
  search: publicProcedure
    .input(
      z
        .object({
          marketTag: z.enum(['room_share', 'independent_micro', 'student']).optional(),
          accommodationTypes: z.array(z.enum(accommodationTypeValues)).max(10).optional(),
          minPrice: z.number().min(0).optional(),
          maxPrice: z.number().min(0).optional(),
          billsElectricity: z.boolean().optional(),
          billsWifi: z.boolean().optional(),
          furnished: z.enum(['furnished', 'partial', 'any']).optional(),
          bathroom: z.enum(['own', 'shared', 'any']).optional(),
          availableFrom: z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          locationId: z.string().trim().min(1).max(128).optional(),
          locationIds: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
          location: z.string().trim().max(120).optional(),
          page: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(({ input }) => searchSharedLivingSpaces(input ?? {})),

  detail: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(180) }))
    .query(({ input }) => sharedLivingDetailBySlug(input.slug)),

  // ---------- Public enquiry (canonical lead + on-platform thread) ----------
  enquire: publicProcedure
    .input(
      z.object({
        slPlaceId: z.number().int().positive(),
        slSpaceId: z.number().int().positive().optional(),
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(320),
        message: z.string().trim().min(5).max(4000),
        captureRequestId: z.string().trim().min(8).max(128),
        consent: z.object({ accepted: z.literal(true), version: z.string(), source: z.string() }),
      }),
    )
    .mutation(async ({ input }) => {
      const resolution = await resolveSharedLivingLeadCustody({
        slPlaceId: input.slPlaceId,
        slSpaceId: input.slSpaceId ?? null,
      });
      if (!resolution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Shared Living listing is not available for public enquiries.',
        });
      }

      const { capturePublicLead } = await import('./services/publicLeadCaptureService');
      const result = await capturePublicLead({
        name: input.name,
        email: input.email,
        message: input.message,
        source: 'shared_living',
        sourceSurface: 'shared_living_detail',
        leadSource: 'shared_living',
        captureRequestId: input.captureRequestId,
        consent: input.consent,
        slPlaceId: input.slPlaceId,
        slSpaceId: input.slSpaceId,
      });

      await ensureLeadContextRow({
        leadId: result.leadId,
        placeId: resolution.placeId,
        spaceId: resolution.spaceId,
        spaceLabelSnapshot: resolution.spaceLabelSnapshot,
        spaceTypeSnapshot: resolution.spaceTypeSnapshot,
      });
      await appendThreadMessage({
        leadId: result.leadId,
        authorKind: 'consumer',
        body: `${input.name}: ${input.message}`,
      });

      return {
        success: true,
        leadId: result.leadId,
        threadToken: input.captureRequestId,
        deliveryStatus: result.deliveryStatus,
      };
    }),

  thread: publicProcedure
    .input(z.object({ token: z.string().trim().min(8).max(128) }))
    .query(({ input }) => threadViewByToken(input.token)),

  replyByToken: publicProcedure
    .input(
      z.object({
        token: z.string().trim().min(8).max(128),
        body: z.string().trim().min(1).max(4000),
      }),
    )
    .mutation(({ input }) => replyByToken(input.token, input.body)),

  // ---------- Lister ----------
  verificationStatus: protectedProcedure.query(async ({ ctx }) => ({
    phoneVerified: await hasVerifiedPhone(Number(ctx.user?.id)),
    evidence: await latestPhoneEvidence(Number(ctx.user?.id)),
  })),

  sendPhoneOtp: protectedProcedure
    .input(z.object({ phone: z.string().trim().min(8).max(20) }))
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
      z.object({
        phone: z.string().trim().min(8).max(20),
        code: z.string().trim().min(4).max(10),
      }),
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
      z.object({
        addressLinePrivate: z.string().trim().min(5).max(255),
        provinceSlug: z.string().trim().max(80).optional(),
        citySlug: z.string().trim().max(80).optional(),
        suburbSlug: z.string().trim().max(80).optional(),
        placeKind: z.enum(['house', 'apartment', 'townhouse', 'student_residence', 'other']),
        description: z.string().trim().max(2000).optional(),
        spaceLabel: z.string().trim().min(2).max(120),
        accommodationType: z.enum(accommodationTypeValues),
        marketTag: z.enum(['room_share', 'independent_micro', 'student']),
        rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
        rentUnknown: z.boolean().optional(),
        bills: billsSchema,
        availableFrom: z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        occupantsCount: z.number().int().min(0).max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user?.id);
      await assertListerPhoneGate(userId);
      return createSharedLivingDraft({ ...input, actorUserId: userId });
    }),

  updateSpace: protectedProcedure
    .input(
      z.object({
        spaceId: z.number().int().positive(),
        label: z.string().trim().min(2).max(120).optional(),
        rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
        rentUnknown: z.boolean().optional(),
        bills: billsSchema.optional(),
        availableFrom: z
          .union([z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
          .optional(),
        status: z.enum(['available', 'occupied', 'paused', 'hidden']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => updateOwnedSpace(Number(ctx.user?.id), input.spaceId, input)),

  submitForReview: protectedProcedure
    .input(z.object({ placeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertListerPhoneGate(Number(ctx.user?.id));
      await submitPlaceForReview(Number(ctx.user?.id), input.placeId);
      return { submitted: true };
    }),

  // ---------- Lister threads (on-platform communication) ----------
  myListerThreads: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.user?.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const rows = await db
      .select({
        leadId: leads.id,
        token: leads.captureRequestId,
        leadStatus: leads.status,
        deliveryStatus: leads.deliveryStatus,
        placeSlug: slPlaces.slug,
        spaceLabelSnapshot: slLeadContexts.spaceLabelSnapshot,
        lastMessageAt: slMessages.createdAt,
      })
      .from(slLeadContexts)
      .innerJoin(leads, eq(slLeadContexts.leadId, leads.id))
      .innerJoin(slPlaces, eq(slLeadContexts.placeId, slPlaces.id))
      .leftJoin(slMessages, eq(slMessages.leadId, slLeadContexts.leadId))
      .where(eq(slPlaces.ownerUserId, userId));
    return rows;
  }),

  replyAsLister: protectedProcedure
    .input(
      z.object({
        token: z.string().trim().min(8).max(128),
        body: z.string().trim().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user?.id);
      if (!(await listerOwnsThread(userId, input.token))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This thread is not one of your listings.' });
      }
      const leadId = await leadIdForToken(input.token);
      await appendThreadMessage({
        leadId,
        authorKind: 'lister',
        senderUserId: userId,
        body: input.body,
      });
      return { ok: true };
    }),

  // ---------- Moderation ----------
  moderationQueue: protectedProcedure.query(async ({ ctx }) => {
    requireSuperAdmin(ctx.user?.role);
    return pendingReviewQueue();
  }),

  moderateApprove: protectedProcedure
    .input(z.object({ placeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireSuperAdmin(ctx.user?.role);
      await approvePlace(Number(ctx.user?.id), input.placeId);
      return { approved: true };
    }),

  moderateReject: protectedProcedure
    .input(
      z.object({
        placeId: z.number().int().positive(),
        reason: z.string().trim().min(3).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireSuperAdmin(ctx.user?.role);
      await rejectPlace(Number(ctx.user?.id), input.placeId, input.reason);
      return { rejected: true };
    }),
});

async function assertListerPhoneGate(userId: number): Promise<void> {
  if (!(await hasVerifiedPhone(userId))) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Verify your phone number before publishing a Shared Living listing.',
    });
  }
}

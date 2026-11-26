import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import {
  listerThreadView,
  listListerThreads,
  replyAsListerThread,
  replyByToken,
  threadViewByToken,
} from './services/sharedLivingEnquiryService';
import {
  hasVerifiedPhone,
  latestPhoneEvidence,
  sendPhoneVerificationOtp,
  verifyPhoneOtp,
} from './services/sharedLivingVerificationService';
import {
  SHARED_LIVING_ACCOMMODATION_TYPES,
  SHARED_LIVING_MARKET_TAGS,
  SHARED_LIVING_PLACE_KINDS,
} from '../shared/sharedLivingDomain';
import { resolveSharedLivingSearchGeography } from '../shared/sharedLivingSearchContract';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';
import { capturePublicLead } from './services/publicLeadCaptureService';
import {
  addResidenceFacilities,
  addSpaceDraft,
  agentResidenceDetail,
  attachListingMedia,
  attachMandateEvidence,
  createMandateEvidenceUploadTarget,
  createResidenceDraft,
  getAuthorityEvidenceDownloadUrl,
  getPublishedSpaceDetail,
  listAgentResidences,
  listRequestableResidences,
  moderationQueue,
  moderationReviewDetail,
  reviewAuthority,
  reviewResidenceOrSpace,
  revokeAuthority,
  requestResidenceAuthority,
  searchPublishedSpaces,
  submitMandateForReview,
  submitResidenceForReview,
  updateSpaceDraft,
} from './services/sharedLivingWorkflowService';

const capabilityTokenSchema = z.string().uuid();
const sharedLivingSearchSchema = z
  .object({
    marketTag: z.enum(SHARED_LIVING_MARKET_TAGS).optional(),
    accommodationTypes: z.array(z.enum(SHARED_LIVING_ACCOMMODATION_TYPES)).max(10).optional(),
    minPrice: z.number().finite().min(0).max(1_000_000).optional(),
    maxPrice: z.number().finite().min(0).max(1_000_000).optional(),
    billsElectricity: z.boolean().optional(),
    billsWifi: z.boolean().optional(),
    furnished: z.enum(['furnished', 'partial', 'any']).optional(),
    bathroom: z.enum(['own', 'shared', 'any']).optional(),
    availableFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    canonicalPlaceId: z.string().trim().regex(PLACE_ID_REGEX).optional(),
    canonicalPlaceIds: z.array(z.string().trim().regex(PLACE_ID_REGEX)).min(2).max(5).optional(),
    page: z.number().int().min(0).max(10_000).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const geography = resolveSharedLivingSearchGeography(input);
    if (geography.status === 'invalid') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: geography.message, path: ['canonicalPlaceId'] });
    }
    if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Minimum monthly rent cannot exceed maximum monthly rent.', path: ['minPrice'] });
    }
  });

function requireSuperAdmin(role: string | undefined): void {
  if (role !== 'super_admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access required.' });
}

function requireAgentActor(user: { id: number; role: string } | null | undefined): number {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in as a Property Listify agent.' });
  if (user.role !== 'agent') throw new TRPCError({ code: 'FORBIDDEN', message: 'Shared Living inventory is currently available to agent accounts.' });
  return Number(user.id);
}

const publicSpaceEnquirySchema = z.object({
  slPlaceId: z.number().int().positive(),
  slSpaceId: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(32).optional(),
  message: z.string().trim().min(5).max(4000),
  captureRequestId: capabilityTokenSchema,
  consent: z.object({ accepted: z.literal(true), version: z.string().trim().min(1).max(80), source: z.string().trim().min(1).max(120) }).strict(),
}).strict();

export const sharedLivingRouter = router({
  search: publicProcedure.input(sharedLivingSearchSchema.optional()).query(({ input }) => searchPublishedSpaces(input ?? {})),
  detail: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(180) }).strict()).query(async ({ input }) => {
    const detail = await getPublishedSpaceDetail(input.slug);
    if (!detail) throw new TRPCError({ code: 'NOT_FOUND', message: 'This accommodation is no longer available.' });
    return detail;
  }),
  enquire: publicProcedure.input(publicSpaceEnquirySchema).mutation(({ input }) => capturePublicLead({
    slPlaceId: input.slPlaceId,
    slSpaceId: input.slSpaceId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    captureRequestId: input.captureRequestId,
    source: 'shared_living',
    sourceSurface: 'shared_living_space_detail',
    leadSource: 'shared_living_marketplace',
    consent: { accepted: true, version: input.consent.version, source: input.consent.source },
  })),
  thread: publicProcedure.input(z.object({ token: capabilityTokenSchema }).strict()).query(({ input }) => threadViewByToken(input.token)),
  replyByToken: publicProcedure.input(z.object({ token: capabilityTokenSchema, body: z.string().trim().min(1).max(4000) }).strict()).mutation(({ input }) => replyByToken(input.token, input.body)),

  verificationStatus: protectedProcedure.query(async ({ ctx }) => ({
    phoneVerified: await hasVerifiedPhone(Number(ctx.user?.id)),
    evidence: await latestPhoneEvidence(Number(ctx.user?.id)),
  })),
  sendPhoneOtp: protectedProcedure.input(z.object({ phone: z.string().trim().min(8).max(20) }).strict()).mutation(async ({ ctx, input }) => {
    const result = await sendPhoneVerificationOtp(Number(ctx.user?.id), input.phone);
    if (result.status === 'unconfigured') throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'Phone verification is not configured yet. Please try again later.' });
    return result;
  }),
  verifyPhoneOtp: protectedProcedure.input(z.object({ phone: z.string().trim().min(8).max(20), code: z.string().trim().min(4).max(10) }).strict()).mutation(async ({ ctx, input }) => {
    const result = await verifyPhoneOtp(Number(ctx.user?.id), input.phone, input.code);
    if (result.status === 'rejected') throw new TRPCError({ code: 'BAD_REQUEST', message: result.reason });
    return { verified: true };
  }),

  myPlaces: protectedProcedure.query(({ ctx }) => listAgentResidences(requireAgentActor(ctx.user))),
  requestableResidences: protectedProcedure.query(({ ctx }) => {
    requireAgentActor(ctx.user);
    return listRequestableResidences();
  }),
  residenceDetail: protectedProcedure.input(z.object({ placeId: z.number().int().positive() }).strict()).query(({ ctx, input }) => agentResidenceDetail(requireAgentActor(ctx.user), input.placeId)),
  createDraft: protectedProcedure.input(z.object({
    residenceName: z.string().trim().min(2).max(160),
    addressLinePrivate: z.string().trim().min(5).max(255),
    canonicalPlaceId: z.string().trim().regex(PLACE_ID_REGEX),
    placeKind: z.enum(SHARED_LIVING_PLACE_KINDS),
    description: z.string().trim().max(2000).optional(),
    responsiblePartyRole: z.enum(['owner', 'landlord', 'operator']),
    responsiblePartyName: z.string().trim().min(2).max(160),
    responsiblePartyEmail: z.string().trim().email().max(320),
    responsiblePartyPhone: z.string().trim().min(8).max(32).optional(),
    authorityEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    authorityExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict()).mutation(({ ctx, input }) => createResidenceDraft(requireAgentActor(ctx.user), input)),
  requestAuthority: protectedProcedure.input(z.object({
    placeId: z.number().int().positive(),
    responsiblePartyRole: z.enum(['owner', 'landlord', 'operator']),
    responsiblePartyName: z.string().trim().min(2).max(160),
    responsiblePartyEmail: z.string().trim().email().max(320),
    responsiblePartyPhone: z.string().trim().min(8).max(32).optional(),
    authorityEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    authorityExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict()).mutation(({ ctx, input }) => {
    const { placeId, ...authority } = input;
    return requestResidenceAuthority(requireAgentActor(ctx.user), placeId, authority);
  }),
  mandateEvidenceUploadTarget: protectedProcedure.input(z.object({ placeId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(80) }).strict()).mutation(({ ctx, input }) => createMandateEvidenceUploadTarget(requireAgentActor(ctx.user), input.placeId, input)),
  attachMandateEvidence: protectedProcedure.input(z.object({ authorityId: z.number().int().positive(), uploadToken: z.string().min(1).max(4096) }).strict()).mutation(({ ctx, input }) => attachMandateEvidence(requireAgentActor(ctx.user), input.authorityId, input.uploadToken)),
  submitMandateForReview: protectedProcedure.input(z.object({ authorityId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => submitMandateForReview(requireAgentActor(ctx.user), input.authorityId)),

  addSpace: protectedProcedure.input(z.object({
    placeId: z.number().int().positive(),
    label: z.string().trim().min(2).max(120),
    description: z.string().trim().min(20).max(4000),
    accommodationType: z.enum(SHARED_LIVING_ACCOMMODATION_TYPES),
    marketTag: z.enum(SHARED_LIVING_MARKET_TAGS),
    rentAmountMinor: z.number().int().min(0).max(100_000_000),
    rentUnknown: z.boolean(),
    rentBasis: z.enum(['per_space', 'per_person']),
    availabilityStatus: z.enum(['available', 'occupied', 'unavailable']),
    availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    occupancyCount: z.number().int().min(1).max(50).optional(),
    furnishedState: z.enum(['furnished', 'unfurnished', 'partial', 'unknown']),
    bathroomAccess: z.enum(['own', 'shared', 'unknown']),
    parkingBays: z.number().int().min(0).max(50).optional(),
    bills: z.object({ electricity: z.enum(['included', 'excluded', 'to_be_confirmed']), water: z.enum(['included', 'excluded', 'to_be_confirmed']), wifi: z.enum(['included', 'excluded', 'to_be_confirmed']) }).strict(),
    facilities: z.array(z.string().trim().min(1).max(64)).max(30).default([]),
  }).strict()).mutation(({ ctx, input }) => addSpaceDraft(requireAgentActor(ctx.user), input)),
  updateSpace: protectedProcedure.input(z.object({
    spaceId: z.number().int().positive(),
    label: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(20).max(4000).optional(),
    accommodationType: z.enum(SHARED_LIVING_ACCOMMODATION_TYPES).optional(),
    marketTag: z.enum(SHARED_LIVING_MARKET_TAGS).optional(),
    rentAmountMinor: z.number().int().min(0).max(100_000_000).optional(),
    rentUnknown: z.boolean().optional(),
    rentBasis: z.enum(['per_space', 'per_person']).optional(),
    availabilityStatus: z.enum(['available', 'occupied', 'unavailable']).optional(),
    occupancyCount: z.number().int().min(0).max(50).nullable().optional(),
    furnishedState: z.enum(['furnished', 'unfurnished', 'partial', 'unknown']).optional(),
    bathroomAccess: z.enum(['own', 'shared', 'unknown']).optional(),
    parkingBays: z.number().int().min(0).max(50).nullable().optional(),
    bills: z.object({ electricity: z.enum(['included', 'excluded', 'to_be_confirmed']), water: z.enum(['included', 'excluded', 'to_be_confirmed']), wifi: z.enum(['included', 'excluded', 'to_be_confirmed']) }).strict().optional(),
    facilities: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
    availableFrom: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).optional(),
  }).strict()).mutation(({ ctx, input }) => updateSpaceDraft(requireAgentActor(ctx.user), input)),
  attachMedia: protectedProcedure.input(z.object({ scope: z.enum(['residence', 'space']), entityId: z.number().int().positive(), key: z.string().trim().min(1).max(512), contentType: z.string().trim().min(1).max(80), caption: z.string().trim().max(255).optional() }).strict()).mutation(({ ctx, input }) => attachListingMedia(requireAgentActor(ctx.user), input)),
  saveResidenceFacilities: protectedProcedure.input(z.object({ placeId: z.number().int().positive(), facilities: z.array(z.string()).max(30) }).strict()).mutation(({ ctx, input }) => addResidenceFacilities(requireAgentActor(ctx.user), input.placeId, input.facilities)),
  submitForReview: protectedProcedure.input(z.object({ placeId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => submitResidenceForReview(requireAgentActor(ctx.user), input.placeId)),

  myListerThreads: protectedProcedure.query(({ ctx }) => listListerThreads(Number(ctx.user?.id))),
  listerThread: protectedProcedure.input(z.object({ token: capabilityTokenSchema }).strict()).query(async ({ ctx, input }) => {
    const view = await listerThreadView(Number(ctx.user?.id), input.token);
    if (!view) throw new TRPCError({ code: 'FORBIDDEN', message: 'This thread is not one of your listings.' });
    return view;
  }),
  replyAsLister: protectedProcedure.input(z.object({ token: capabilityTokenSchema, body: z.string().trim().min(1).max(4000) }).strict()).mutation(async ({ ctx, input }) => {
    if (!(await replyAsListerThread(Number(ctx.user?.id), input.token, input.body))) throw new TRPCError({ code: 'FORBIDDEN', message: 'This thread is not one of your listings or its mandate has ended.' });
    return { ok: true };
  }),

  moderationQueue: protectedProcedure.query(({ ctx }) => {
    requireSuperAdmin(ctx.user?.role);
    return moderationQueue();
  }),
  moderationDetail: protectedProcedure.input(z.object({ placeId: z.number().int().positive(), subjectType: z.enum(['residence', 'space']), spaceId: z.number().int().positive().optional() }).strict()).query(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return moderationReviewDetail(input);
  }),
  reviewAuthority: protectedProcedure.input(z.object({ authorityId: z.number().int().positive(), decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(500).optional() }).strict()).mutation(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return reviewAuthority({ ...input, reviewerUserId: Number(ctx.user?.id) });
  }),
  authorityEvidenceUrl: protectedProcedure.input(z.object({ evidenceId: z.number().int().positive() }).strict()).query(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return getAuthorityEvidenceDownloadUrl(Number(ctx.user?.id), input.evidenceId);
  }),
  revokeAuthority: protectedProcedure.input(z.object({ authorityId: z.number().int().positive(), reason: z.string().trim().min(5).max(500) }).strict()).mutation(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return revokeAuthority({ ...input, actorUserId: Number(ctx.user?.id) });
  }),
  moderateApprove: protectedProcedure.input(z.object({ placeId: z.number().int().positive(), subjectType: z.enum(['residence', 'space']), spaceId: z.number().int().positive().optional() }).strict()).mutation(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return reviewResidenceOrSpace({ ...input, decision: 'approve', reviewerUserId: Number(ctx.user?.id) });
  }),
  moderateReject: protectedProcedure.input(z.object({ placeId: z.number().int().positive(), subjectType: z.enum(['residence', 'space']), spaceId: z.number().int().positive().optional(), reason: z.string().trim().min(3).max(500) }).strict()).mutation(({ ctx, input }) => {
    requireSuperAdmin(ctx.user?.role);
    return reviewResidenceOrSpace({ ...input, decision: 'reject', reviewerUserId: Number(ctx.user?.id) });
  }),
});

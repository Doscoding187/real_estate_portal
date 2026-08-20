import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router, superAdminProcedure } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  accessPrivateLandEvidence,
  addPrivateEvidence,
  createLandDraft,
  declareMarketingAuthority,
  isLandAuthorRole,
  landWorkflowSnapshot,
  recordLandClaims,
  submitLandForReview,
  transitionLandReview,
} from './services/landWorkflowService';

const claim = z.object({ code: z.enum(['land_extent', 'intended_use', 'access', 'road_frontage', 'water', 'electricity', 'sanitation', 'zoning_land_use', 'restrictions_servitudes', 'development_context']), valueState: z.enum(['asserted', 'unknown', 'unavailable', 'not_applicable']), value: z.unknown().optional() });

function author(ctx: { user?: { id: number; role?: string | null } | null }) {
  const user = requireUser(ctx);
  if (!isLandAuthorRole(user.role)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Land authoring requires an authorized seller, agent, agency, or developer role.' });
  return user;
}

function rethrow(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({ code: 'PRECONDITION_FAILED', message: error instanceof Error ? error.message : 'Land workflow action failed.' });
}

export const landRouter = router({
  createDraft: protectedProcedure.input(z.object({ classification: z.enum(['residential_stand', 'development_land', 'commercial_industrial_land']), title: z.string().trim().min(4).max(255), description: z.string().trim().min(20), askingPrice: z.number().positive(), city: z.string().trim().min(2), province: z.string().trim().min(2), address: z.string().trim().optional(), intendedUse: z.string().trim().max(120).optional(), parcel: z.object({ kind: z.enum(['erf', 'portion', 'farm', 'remainder', 'other']), identifier: z.string().trim().min(1).max(500), identifierHash: z.string().regex(/^[a-f0-9]{64}$/), extentM2: z.number().positive(), provinceId: z.number().int().positive().optional(), cityId: z.number().int().positive().optional(), suburbId: z.number().int().positive().optional(), geometryConfidence: z.enum(['unknown', 'approximate', 'confirmed']).optional() }) })).mutation(async ({ ctx, input }) => {
    try { return await createLandDraft({ ...input, userId: author(ctx).id }); } catch (error) { return rethrow(error); }
  }),
  addClaims: protectedProcedure.input(z.object({ listingId: z.number().int().positive(), claims: z.array(claim).min(1) })).mutation(async ({ ctx, input }) => {
    try { await recordLandClaims({ ...input, userId: author(ctx).id }); return { success: true }; } catch (error) { return rethrow(error); }
  }),
  declareAuthority: protectedProcedure.input(z.object({ listingId: z.number().int().positive(), actorType: z.enum(['owner_direct', 'agent', 'agency', 'developer', 'other']), authorityType: z.enum(['sole_mandate', 'open_mandate', 'joint_mandate', 'owner_direct', 'other']), supportingEvidenceId: z.number().int().positive().optional(), expiresAt: z.string().datetime().optional() })).mutation(async ({ ctx, input }) => {
    try { await declareMarketingAuthority({ ...input, userId: author(ctx).id }); return { success: true }; } catch (error) { return rethrow(error); }
  }),
  addPrivateEvidence: protectedProcedure.input(z.object({ listingId: z.number().int().positive(), evidenceType: z.enum(['mandate', 'identity', 'title_registry', 'parcel_survey', 'professional_report', 'planning', 'other']), privateStorageKey: z.string().trim().min(8).max(500), originalFileName: z.string().trim().max(255).optional(), mimeType: z.string().trim().max(120).optional(), byteSize: z.number().int().positive().optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), parcelId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    try { return { evidenceDocumentId: await addPrivateEvidence({ ...input, userId: author(ctx).id }) }; } catch (error) { return rethrow(error); }
  }),
  getWorkspace: protectedProcedure.input(z.object({ listingId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try { return await landWorkflowSnapshot(input.listingId, author(ctx).id); } catch (error) { return rethrow(error); }
  }),
  submit: protectedProcedure.input(z.object({ listingId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try { await submitLandForReview({ listingId: input.listingId, userId: author(ctx).id }); return { success: true }; } catch (error) { return rethrow(error); }
  }),
  reviewerWorkspace: superAdminProcedure.input(z.object({ listingId: z.number().int().positive() })).query(async ({ input }) => landWorkflowSnapshot(input.listingId)),
  review: superAdminProcedure.input(z.object({ listingId: z.number().int().positive(), action: z.enum(['start', 'request_changes', 'reject', 'approve', 'suspend']), reasonCode: z.string().trim().max(100).optional(), comment: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
    try { await transitionLandReview({ ...input, reviewerUserId: requireUser(ctx).id }); return { success: true }; } catch (error) { return rethrow(error); }
  }),
  accessEvidence: protectedProcedure.input(z.object({ evidenceDocumentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try { return await accessPrivateLandEvidence({ evidenceDocumentId: input.evidenceDocumentId, actorUserId: requireUser(ctx).id, role: requireUser(ctx).role, requestCorrelationId: ctx.requestId }); } catch (error) { return rethrow(error); }
  }),
});

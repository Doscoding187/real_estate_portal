import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { partnerService } from './services/partnerService';

export const partnerRouter = router({
  getPublicProfile: publicProcedure
    .input(
      z.object({
        partnerId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const profile = await partnerService.getPartnerProfile(input.partnerId);
      if (!profile) {
        return null;
      }

      return profile;
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .query(() => {
      return { partners: [] as any[], total: 0 };
    }),

  create: protectedProcedure
    .input(
      z.object({
        category: z.any(),
        status: z.any(),
        name: z.string(),
        description: z.string(),
        contactPerson: z.string(),
        email: z.string(),
        phone: z.string(),
        website: z.string(),
        isVerified: z.boolean(),
      }),
    )
    .mutation(() => {
      return { ok: true, id: 0 };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          category: z.any(),
          status: z.any(),
          name: z.string(),
          description: z.string(),
          contactPerson: z.string(),
          email: z.string(),
          phone: z.string(),
          website: z.string(),
          isVerified: z.boolean(),
        }),
      }),
    )
    .mutation(() => {
      return { ok: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(() => {
    return { ok: true };
  }),
});

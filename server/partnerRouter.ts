import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';

export const partnerRouter = router({
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(() => {
      return { ok: true };
    }),
});

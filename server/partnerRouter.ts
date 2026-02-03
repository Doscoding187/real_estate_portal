import { router, publicProcedure } from './_core/trpc';

export const partnerRouter = router({
  list: publicProcedure.query(() => {
    return [];
  }),

  create: publicProcedure.mutation(() => {
    throw new Error('NOT_IMPLEMENTED');
  }),

  update: publicProcedure.mutation(() => {
    throw new Error('NOT_IMPLEMENTED');
  }),

  delete: publicProcedure.mutation(() => {
    throw new Error('NOT_IMPLEMENTED');
  }),
});

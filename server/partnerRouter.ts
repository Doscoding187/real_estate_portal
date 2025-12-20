
import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import * as db from './db';

const partnerSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['mortgage_broker', 'lawyer', 'photographer', 'inspector', 'mover', 'other']),
  description: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  isVerified: z.boolean().default(false),
});

export const partnerRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        category: z
          .enum(['mortgage_broker', 'lawyer', 'photographer', 'inspector', 'mover', 'other'])
          .optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return db.listPartners(input);
    }),

  create: superAdminProcedure.input(partnerSchema).mutation(async ({ input }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isVerified, ...data } = input;
    return db.createPartner({
      ...data,
      isVerified: input.isVerified ? 1 : 0,
    });
  }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.number(),
        data: partnerSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, data } = input;
      // Convert boolean to number for DB if present
      const dbData: any = { ...data };
      if (typeof data.isVerified !== 'undefined') {
        dbData.isVerified = data.isVerified ? 1 : 0;
      }
      return db.updatePartner(id, dbData);
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deletePartner(input.id);
    }),
});

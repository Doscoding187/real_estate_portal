import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import {
  createPartner,
  deletePartner,
  listPartners,
  updatePartner,
} from './db';

const verificationStatusSchema = z.enum([
  'pending',
  'verified',
  'rejected',
]);

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullable().optional();

const optionalEmail = z
  .union([
    z.string().trim().email().max(320),
    z.literal(''),
  ])
  .nullable()
  .optional();

const optionalWebsite = z
  .union([
    z.string().trim().url().max(500),
    z.literal(''),
  ])
  .nullable()
  .optional();

const createPartnerInput = z.object({
  userId: z.number().int().positive(),
  companyName: z.string().trim().min(1).max(255),
  description: optionalText(5000),
  verificationStatus: verificationStatusSchema.default('pending'),
  websiteUrl: optionalWebsite,
  contactEmail: optionalEmail,
  contactPhone: optionalText(50),
  isActive: z.boolean().default(true),
});

const updatePartnerDataInput = z
  .object({
    userId: z.number().int().positive().optional(),
    companyName: z.string().trim().min(1).max(255).optional(),
    description: optionalText(5000),
    verificationStatus: verificationStatusSchema.optional(),
    websiteUrl: optionalWebsite,
    contactEmail: optionalEmail,
    contactPhone: optionalText(50),
    isActive: z.boolean().optional(),
  })
  .refine(
    data => Object.keys(data).length > 0,
    'At least one Partner field must be supplied',
  );

function normalizeOptionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;

  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export const partnerRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().trim().max(255).optional(),
      }),
    )
    .query(({ input }) => listPartners(input)),

  create: superAdminProcedure
    .input(createPartnerInput)
    .mutation(async ({ input }) => {
      const id = await createPartner({
        userId: input.userId,
        companyName: input.companyName,
        description: normalizeOptionalText(input.description),
        verificationStatus: input.verificationStatus,
        websiteUrl: normalizeOptionalText(input.websiteUrl),
        contactEmail: normalizeOptionalText(input.contactEmail),
        contactPhone: normalizeOptionalText(input.contactPhone),
        isActive: input.isActive ? 1 : 0,
      });

      return {
        ok: true,
        id,
      };
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: updatePartnerDataInput,
      }),
    )
    .mutation(async ({ input }) => {
      await updatePartner(input.id, {
        userId: input.data.userId,
        companyName: input.data.companyName,
        description: normalizeOptionalText(input.data.description),
        verificationStatus: input.data.verificationStatus,
        websiteUrl: normalizeOptionalText(input.data.websiteUrl),
        contactEmail: normalizeOptionalText(input.data.contactEmail),
        contactPhone: normalizeOptionalText(input.data.contactPhone),
        isActive:
          input.data.isActive === undefined
            ? undefined
            : input.data.isActive
              ? 1
              : 0,
      });

      return { ok: true };
    }),

  delete: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      await deletePartner(input.id);
      return { ok: true };
    }),
});

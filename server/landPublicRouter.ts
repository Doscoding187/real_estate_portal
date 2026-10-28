import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { LAND_PUBLIC_CLASSIFICATIONS, LAND_CANONICAL_ASSIGNMENT_BLOCKER } from '../shared/land-domain';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';
import { validateLandSearchGeography } from '../shared/landSearchGeography';

export const landPublicSearchInput = z
  .object({
    classification: z.enum(LAND_PUBLIC_CLASSIFICATIONS).optional(),
    canonicalPlaceId: z.string().trim().regex(PLACE_ID_REGEX).optional(),
    canonicalPlaceIds: z.array(z.string().trim().regex(PLACE_ID_REGEX)).max(5).optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    minSize: z.number().positive().optional(),
    maxSize: z.number().positive().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const issue = validateLandSearchGeography(input);
    if (issue)
      context.addIssue({ code: z.ZodIssueCode.custom, path: [issue.path], message: issue.message });
    if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minPrice'],
        message: 'Land minimum price cannot exceed maximum price.',
      });
    }
    if (input.minSize !== undefined && input.maxSize !== undefined && input.minSize > input.maxSize) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSize'],
        message: 'Land minimum extent cannot exceed maximum extent.',
      });
    }
  });

type PublicLandDetail = {
  listingId: number;
  title: string;
  classification: (typeof LAND_PUBLIC_CLASSIFICATIONS)[number];
  extentM2: number | string;
  city: string;
  province: string;
  precision: 'exact' | 'approximate';
  intendedUse: string | null;
  description: string | null;
  media: Array<{ url: string }>;
  passport: {
    trustState: string | null;
    claims: Array<{ code: string; state: string }>;
    assertions: Array<{
      claimCode: string;
      status: string;
      sourceProvider?: string | null;
      checkedAt?: string | Date | null;
      publicConclusion?: string | null;
      limitations?: string | null;
    }>;
  };
  parcelCount: number;
};

function requireCanonicalLandAssignments<T = never>(): T {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: LAND_CANONICAL_ASSIGNMENT_BLOCKER,
  });
}

export const landPublicRouter = router({
  search: publicProcedure.input(landPublicSearchInput).query(() => requireCanonicalLandAssignments()),
  detail: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(180) }).strict())
    .query(() => requireCanonicalLandAssignments<PublicLandDetail>()),
});

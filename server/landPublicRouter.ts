import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { LAND_PUBLIC_CLASSIFICATIONS } from '../shared/land-domain';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';
import { validateLandSearchGeography } from '../shared/landSearchGeography';
import { isLandVerticalAvailable } from '../shared/landLaunchPolicy';
import {
  publicLandDetail,
  publicLandGuideAreas,
  searchPublicLand,
} from './services/landPublicService';

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

export const landPublicRouter = router({
  search: publicProcedure.input(landPublicSearchInput).query(({ input }) => (isLandVerticalAvailable() ? searchPublicLand(input) : [])),
  guideAreas: publicProcedure
    .input(z.object({ canonicalPlaceId: z.string().trim().regex(PLACE_ID_REGEX) }).strict())
    .query(({ input }) => (isLandVerticalAvailable() ? publicLandGuideAreas(input.canonicalPlaceId) : [])),
  detail: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(180) }).strict())
    .query(({ input }) => (isLandVerticalAvailable() ? publicLandDetail(input.slug) : null)),
});

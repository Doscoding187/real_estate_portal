import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { LAND_PUBLIC_CLASSIFICATIONS } from '../shared/land-domain';
import { publicLandDetail, searchPublicLand } from './services/landPublicService';

const landSearchInput = z.object({
  classification: z.enum(LAND_PUBLIC_CLASSIFICATIONS).optional(),
  city: z.string().trim().min(1).optional(), province: z.string().trim().min(1).optional(),
  locationId: z.string().trim().optional(), locationIds: z.array(z.string().trim()).max(10).optional(), searchAreaId: z.string().trim().optional(),
  minPrice: z.number().positive().optional(), maxPrice: z.number().positive().optional(), minSize: z.number().positive().optional(), maxSize: z.number().positive().optional(),
}).optional();

export const landPublicRouter = router({
  search: publicProcedure.input(landSearchInput).query(({ input }) => searchPublicLand(input)),
  detail: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(({ input }) => publicLandDetail(input.slug)),
});

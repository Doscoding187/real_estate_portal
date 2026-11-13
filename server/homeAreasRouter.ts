import { z } from 'zod';

import { publicProcedure, router } from './_core/trpc';
import {
  DEFAULT_POPULAR_AREA_LIMIT,
  MAX_POPULAR_AREA_LIMIT,
  homeAreasService,
} from './services/homeAreasService';

export type { HomePopularArea, HomePopularAreasResult } from './services/homeAreasService';

export const popularAreasByProvinceInput = z
  .object({
    provincePlaceId: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(MAX_POPULAR_AREA_LIMIT).optional(),
  })
  .strict();

export const homeAreasRouter = router({
  getPopularAreasByProvince: publicProcedure
    .input(popularAreasByProvinceInput)
    .query(({ input }) =>
      homeAreasService.getPopularAreasByProvince({
        provincePlaceId: input.provincePlaceId,
        limit: input.limit ?? DEFAULT_POPULAR_AREA_LIMIT,
      }),
    ),
});

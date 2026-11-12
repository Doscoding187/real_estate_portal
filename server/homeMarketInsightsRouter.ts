import { z } from 'zod';

import { publicProcedure, router } from './_core/trpc';
import {
  DEFAULT_CITY_INSIGHT_LIMIT,
  MAX_CITY_INSIGHT_LIMIT,
  homeMarketInsightsService,
} from './services/homeMarketInsightsService';

export type {
  AskingPriceBand,
  HomeMarketCityInsight,
  HomeProvinceInsights,
} from './services/homeMarketInsightsService';

export const homeMarketInsightsInput = z
  .object({ limit: z.number().int().min(1).max(MAX_CITY_INSIGHT_LIMIT).optional() })
  .strict()
  .optional();

export const homeProvinceInsightsInput = z
  .object({ provincePlaceId: z.string().min(1).max(100) })
  .strict();

export const homeMarketInsightsRouter = router({
  getHomepageCityInsights: publicProcedure
    .input(homeMarketInsightsInput)
    .query(({ input }) =>
      homeMarketInsightsService.getHomepageCityInsights({
        limit: input?.limit ?? DEFAULT_CITY_INSIGHT_LIMIT,
      }),
    ),
  getProvinceInsights: publicProcedure
    .input(homeProvinceInsightsInput)
    .query(({ input }) =>
      homeMarketInsightsService.getProvinceInsights({ provincePlaceId: input.provincePlaceId }),
    ),
});

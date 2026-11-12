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
} from './services/homeMarketInsightsService';

export const homeMarketInsightsInput = z
  .object({ limit: z.number().int().min(1).max(MAX_CITY_INSIGHT_LIMIT).optional() })
  .strict()
  .optional();

export const homeMarketInsightsRouter = router({
  getHomepageCityInsights: publicProcedure
    .input(homeMarketInsightsInput)
    .query(({ input }) =>
      homeMarketInsightsService.getHomepageCityInsights({
        limit: input?.limit ?? DEFAULT_CITY_INSIGHT_LIMIT,
      }),
    ),
});

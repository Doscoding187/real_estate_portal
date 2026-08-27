import { z } from 'zod';

import { publicProcedure, router } from './_core/trpc';
import { homeMarketInsightsService } from './services/homeMarketInsightsService';

export const homeMarketInsightsRouter = router({
  getHomepageCityInsights: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(8).default(6) }).optional())
    .query(({ input }) => homeMarketInsightsService.getHomepageCityInsights(input?.limit ?? 6)),
});

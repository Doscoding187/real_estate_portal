import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { locationPagesService } from './services/locationPagesService';

export const locationPagesRouter = router({
  getProvinceData: publicProcedure
    .input(z.object({
      provinceSlug: z.string()
    }))
    .query(async ({ input }) => {
      return await locationPagesService.getProvinceData(input.provinceSlug);
    }),

  getCityData: publicProcedure
    .input(z.object({
      provinceSlug: z.string(),
      citySlug: z.string()
    }))
    .query(async ({ input }) => {
      return await locationPagesService.getCityData(input.provinceSlug, input.citySlug);
    }),

  getSuburbData: publicProcedure
    .input(z.object({
      provinceSlug: z.string(),
      citySlug: z.string(),
      suburbSlug: z.string()
    }))
    .query(async ({ input }) => {
      return await locationPagesService.getSuburbData(input.provinceSlug, input.citySlug, input.suburbSlug);
    })
});

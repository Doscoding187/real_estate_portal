import { locationPagesService as baseLocationPagesService } from './locationPagesService';

/**
 * Stabilized wrapper for location page APIs.
 *
 * This keeps the improved service surface expected by `locationPagesRouter`
 * while delegating core data fetching to the proven base implementation.
 */
export const locationPagesService = {
  async getPopularCities(limit?: number) {
    return await baseLocationPagesService.getPopularCities(limit);
  },

  async getProvinceData(provinceSlug: string) {
    return await baseLocationPagesService.getProvinceData(provinceSlug);
  },

  async getCityData(provinceSlug: string, citySlug: string) {
    return await baseLocationPagesService.getCityData(provinceSlug, citySlug);
  },

  async getSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    return await baseLocationPagesService.getSuburbData(provinceSlug, citySlug, suburbSlug);
  },

  async getEnhancedProvinceData(provinceSlug: string) {
    return await baseLocationPagesService.getProvinceData(provinceSlug);
  },

  async getEnhancedCityData(provinceSlug: string, citySlug: string) {
    return await baseLocationPagesService.getCityData(provinceSlug, citySlug);
  },

  async getEnhancedSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    return await baseLocationPagesService.getSuburbData(provinceSlug, citySlug, suburbSlug);
  },

  async getLocationByPath(province: string, city?: string, suburb?: string) {
    if (suburb && city) {
      return await baseLocationPagesService.getSuburbData(province, city, suburb);
    }
    if (city) {
      return await baseLocationPagesService.getCityData(province, city);
    }
    return await baseLocationPagesService.getProvinceData(province);
  },

  async invalidateLocationCache(_locationId: number) {
    // No-op in stabilized mode until location-level cache keys are unified.
    return;
  },
};

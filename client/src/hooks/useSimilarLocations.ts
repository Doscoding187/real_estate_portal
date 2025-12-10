/**
 * useSimilarLocations Hook
 * 
 * Fetches similar locations based on price bracket, property types, and market characteristics.
 * 
 * Requirements:
 * - 22.1-22.5: Get similar locations with statistics
 */

import { useQuery } from '@tanstack/react-query';

interface SimilarLocation {
  id: number;
  name: string;
  slug: string;
  type: string;
  cityName: string | null;
  provinceName: string | null;
  similarityScore: number;
  avgPrice: number | null;
  listingCount: number;
  propertyTypes: string[];
}

interface UseSimilarLocationsOptions {
  locationId: number;
  limit?: number;
  enabled?: boolean;
}

export function useSimilarLocations({ locationId, limit = 5, enabled = true }: UseSimilarLocationsOptions) {
  return useQuery<SimilarLocation[]>({
    queryKey: ['similar-locations', locationId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${locationId}/similar?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch similar locations');
      }
      
      return response.json();
    },
    enabled: enabled && locationId > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

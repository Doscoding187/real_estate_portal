import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  NEARBY_AMENITY_CATEGORIES,
  NEARBY_AMENITY_DEFAULT_LIMIT,
  NEARBY_AMENITY_MAX_LIMIT,
  NEARBY_AMENITY_MAX_RADIUS_METRES,
  NEARBY_AMENITY_MIN_RADIUS_METRES,
  getNearbyAmenityCategoryConfig,
  passesNearbyAmenityQualityGate,
  rankNearbyAmenities,
  type NearbyAmenity,
} from '../shared/nearbyAmenities';
import { safeErrorSummary } from './_core/safeError';

/**
 * Non-authoritative nearby points of interest. Place identity, search and
 * public geography are served only by Place Authority.
 */
export const locationRouter = router({
  getNearbyAmenities: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z
          .number()
          .min(NEARBY_AMENITY_MIN_RADIUS_METRES)
          .max(NEARBY_AMENITY_MAX_RADIUS_METRES),
        categories: z.array(z.enum(NEARBY_AMENITY_CATEGORIES)).min(1).max(5),
        limit: z.number().int().min(1).max(NEARBY_AMENITY_MAX_LIMIT).optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const { googlePlacesService } = await import('./services/googlePlacesService');
      const { latitude, longitude, radius, categories, limit } = input;

      try {
        const configs = categories.map(category => getNearbyAmenityCategoryConfig(category));
        const requests = configs.flatMap(config =>
          config.googleTypes.map(googleType =>
            googlePlacesService
              .getNearbyPlaces(latitude, longitude, radius, googleType, {
                throwOnUnavailable: true,
              })
              .then(places => ({ config, googleType, places })),
          ),
        );
        const groupedResults = await Promise.all(requests);
        const candidates = groupedResults.flatMap(({ config, googleType, places }) =>
          places.map(place => ({ config, googleType, place })),
        );

        const processed = candidates
          .map(({ config, googleType, place }): NearbyAmenity | null => {
            const providerPlaceId = String(place.place_id || place.id || '');
            if (!providerPlaceId) return null;
            if (
              !passesNearbyAmenityQualityGate(
                {
                  name: place.name || '',
                  rating: place.rating,
                  userRatingsTotal: place.user_ratings_total,
                  types: place.types,
                },
                config,
              )
            ) {
              return null;
            }

            const earthRadiusKm = 6371;
            const deltaLatitude = ((place.latitude - latitude) * Math.PI) / 180;
            const deltaLongitude = ((place.longitude - longitude) * Math.PI) / 180;
            const haversine =
              Math.sin(deltaLatitude / 2) ** 2 +
              Math.cos((latitude * Math.PI) / 180) *
                Math.cos((place.latitude * Math.PI) / 180) *
                Math.sin(deltaLongitude / 2) ** 2;
            const distanceValue =
              Math.round(
                2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 10,
              ) / 10;

            return {
              id: providerPlaceId,
              placeId: providerPlaceId,
              name: place.name || 'Unnamed place',
              category: config.id,
              googleType,
              address: place.address || '',
              latitude: place.latitude,
              longitude: place.longitude,
              distance: `${distanceValue.toFixed(1)} km`,
              distanceValue,
              rating: typeof place.rating === 'number' ? place.rating : null,
              userRatingsTotal:
                typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
            };
          })
          .filter((amenity): amenity is NearbyAmenity => amenity !== null);

        return rankNearbyAmenities(processed, limit ?? NEARBY_AMENITY_DEFAULT_LIMIT);
      } catch (error) {
        console.error('Error fetching nearby amenities:', safeErrorSummary(error));
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nearby amenities are temporarily unavailable',
          cause: error,
        });
      }
    }),
});

import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { ENV } from './_core/env';
import axios from 'axios';

/**
 * Google Maps Integration Router
 * Enhanced location services with Google Maps Platform APIs
 */
export const googleMapsRouter = router({
  /**
   * Google Places API - Enhanced place search with autocomplete
   */
  googlePlaceSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        radius: z.number().min(1).max(50000).default(25000), // meters
        type: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googlePlacesApiKey) {
        throw new Error('Google Places API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googlePlacesApiKey,
          input: input.query,
          types: input.type?.join(','),
        };

        // Add location bias if provided
        if (input.location) {
          params.location = `${input.location.latitude},${input.location.longitude}`;
          params.radius = input.radius;
        }

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/autocomplete/json',
          { params },
        );

        return {
          predictions:
            response.data.predictions?.map((prediction: any) => ({
              place_id: prediction.place_id,
              description: prediction.description,
              structured_formatting: prediction.structured_formatting,
              types: prediction.types,
              matched_substrings: prediction.matched_substrings,
            })) || [],
        };
      } catch (error) {
        console.error('Google Places API error:', error);
        throw new Error('Failed to search places');
      }
    }),

  /**
   * Google Places API - Get detailed place information
   */
  googlePlaceDetails: publicProcedure
    .input(
      z.object({
        placeId: z.string(),
        fields: z
          .array(z.string())
          .default([
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'photos',
            'rating',
            'user_ratings_total',
            'price_level',
            'opening_hours',
            'website',
            'formatted_phone_number',
          ]),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googlePlacesApiKey) {
        throw new Error('Google Places API key not configured');
      }

      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/details/json',
          {
            params: {
              key: ENV.googlePlacesApiKey,
              place_id: input.placeId,
              fields: input.fields.join(','),
            },
          },
        );

        if (response.data.status !== 'OK') {
          throw new Error(`Places API error: ${response.data.status}`);
        }

        const place = response.data.result;
        return {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          location: place.geometry?.location,
          viewport: place.geometry?.viewport,
          photos:
            place.photos?.map((photo: any) => ({
              photo_reference: photo.photo_reference,
              width: photo.width,
              height: photo.height,
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${ENV.googlePlacesApiKey}`,
            })) || [],
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level,
          opening_hours: place.opening_hours,
          website: place.website,
          formatted_phone_number: place.formatted_phone_number,
          types: place.types,
        };
      } catch (error) {
        console.error('Google Place Details API error:', error);
        throw new Error('Failed to get place details');
      }
    }),

  /**
   * Google Geocoding API - Enhanced address resolution
   */
  googleGeocoding: publicProcedure
    .input(
      z.object({
        address: z.string().optional(),
        latlng: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        components: z
          .object({
            country: z.string().optional(),
            locality: z.string().optional(),
            postal_code: z.string().optional(),
            route: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googleGeocodingApiKey) {
        throw new Error('Google Geocoding API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googleGeocodingApiKey,
        };

        if (input.address) {
          params.address = input.address;
        } else if (input.latlng) {
          params.latlng = `${input.latlng.latitude},${input.latlng.longitude}`;
        }

        if (input.components) {
          params.components = Object.entries(input.components)
            .map(([key, value]) => `${key}:${value}`)
            .join('|');
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params,
        });

        if (response.data.status !== 'OK') {
          throw new Error(`Geocoding API error: ${response.data.status}`);
        }

        return {
          results: response.data.results.map((result: any) => ({
            place_id: result.place_id,
            formatted_address: result.formatted_address,
            address_components: result.address_components,
            geometry: result.geometry,
            types: result.types,
            postcode_localities: result.postcode_localities,
          })),
        };
      } catch (error) {
        console.error('Google Geocoding API error:', error);
        throw new Error('Failed to geocode address');
      }
    }),

  /**
   * Google Places Nearby Search - Enhanced POI discovery
   */
  googleNearbySearch: publicProcedure
    .input(
      z.object({
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        radius: z.number().min(1).max(50000).default(2000), // meters
        type: z.array(z.string()).optional(),
        keyword: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googlePlacesApiKey) {
        throw new Error('Google Places API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googlePlacesApiKey,
          location: `${input.location.latitude},${input.location.longitude}`,
          radius: input.radius,
        };

        if (input.type?.length) {
          params.type = input.type[0]; // Google Places API supports single type
        }

        if (input.keyword) {
          params.keyword = input.keyword;
        }

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
          { params },
        );

        if (response.data.status !== 'OK') {
          throw new Error(`Nearby Search API error: ${response.data.status}`);
        }

        // Calculate distance from center point
        const results = response.data.results.map((place: any) => {
          const distance = calculateHaversineDistance(
            input.location.latitude,
            input.location.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng,
          );

          return {
            place_id: place.place_id,
            name: place.name,
            vicinity: place.vicinity,
            location: place.geometry.location,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            price_level: place.price_level,
            types: place.types,
            photos:
              place.photos?.map((photo: any) => ({
                photo_reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=300&photoreference=${photo.photo_reference}&key=${ENV.googlePlacesApiKey}`,
              })) || [],
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            opening_hours: place.opening_hours,
            business_status: place.business_status,
          };
        });

        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);

        return { results };
      } catch (error) {
        console.error('Google Nearby Search API error:', error);
        throw new Error('Failed to search nearby places');
      }
    }),

  /**
   * Google Street View API - Get Street View imagery
   */
  googleStreetView: publicProcedure
    .input(
      z.object({
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        heading: z.number().min(0).max(360).optional(),
        fov: z.number().min(10).max(120).default(90),
        pitch: z.number().min(-90).max(90).optional(),
        size: z.object({
          width: z.number().min(1).max(640).default(640),
          height: z.number().min(1).max(640).default(640),
        }),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googleStreetViewApiKey) {
        throw new Error('Google Street View API key not configured');
      }

      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/streetview', {
          params: {
            key: ENV.googleStreetViewApiKey,
            location: `${input.location.latitude},${input.location.longitude}`,
            heading: input.heading,
            fov: input.fov,
            pitch: input.pitch,
            size: `${input.size.width}x${input.size.height}`,
          },
          responseType: 'blob',
        });

        // Convert blob to base64 for frontend
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            resolve({
              imageUrl: reader.result as string,
              metadata: {
                location: input.location,
                heading: input.heading,
                fov: input.fov,
                pitch: input.pitch,
              },
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(response.data);
        });
      } catch (error) {
        console.error('Google Street View API error:', error);
        throw new Error('Failed to get Street View imagery');
      }
    }),

  /**
   * Google Directions API - Get routing and directions
   */
  googleDirections: publicProcedure
    .input(
      z.object({
        origin: z.union([
          z.object({
            latitude: z.number(),
            longitude: z.number(),
          }),
          z.string(),
        ]),
        destination: z.union([
          z.object({
            latitude: z.number(),
            longitude: z.number(),
          }),
          z.string(),
        ]),
        mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).default('driving'),
        departure_time: z.number().optional(),
        traffic_model: z.enum(['best_guess', 'pessimistic', 'optimistic']).default('best_guess'),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googleMapsApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googleMapsApiKey,
          mode: input.mode,
          departure_time: input.departure_time,
          traffic_model: input.traffic_model,
        };

        // Handle origin
        if (typeof input.origin === 'string') {
          params.origin = input.origin;
        } else {
          params.origin = `${input.origin.latitude},${input.origin.longitude}`;
        }

        // Handle destination
        if (typeof input.destination === 'string') {
          params.destination = input.destination;
        } else {
          params.destination = `${input.destination.latitude},${input.destination.longitude}`;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
          params,
        });

        if (response.data.status !== 'OK') {
          throw new Error(`Directions API error: ${response.data.status}`);
        }

        const route = response.data.routes[0];
        if (!route) {
          throw new Error('No routes found');
        }

        const leg = route.legs[0];
        return {
          summary: route.summary,
          distance: {
            text: leg.distance.text,
            value: leg.distance.value,
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value,
          },
          duration_in_traffic: leg.duration_in_traffic
            ? {
                text: leg.duration_in_traffic.text,
                value: leg.duration_in_traffic.value,
              }
            : null,
          steps: leg.steps.map((step: any) => ({
            instruction: step.html_instructions,
            distance: step.distance,
            duration: step.duration,
            polyline: step.polyline,
            travel_mode: step.travel_mode,
          })),
          overview_polyline: route.overview_polyline.points,
          bounds: route.bounds,
          copyrights: route.copyrights,
          warnings: route.warnings,
        };
      } catch (error) {
        console.error('Google Directions API error:', error);
        throw new Error('Failed to get directions');
      }
    }),

  /**
   * Google Distance Matrix API - Calculate distance and time between multiple points
   */
  googleDistanceMatrix: publicProcedure
    .input(
      z.object({
        origins: z.array(
          z.union([
            z.object({
              latitude: z.number(),
              longitude: z.number(),
            }),
            z.string(),
          ]),
        ),
        destinations: z.array(
          z.union([
            z.object({
              latitude: z.number(),
              longitude: z.number(),
            }),
            z.string(),
          ]),
        ),
        mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).default('driving'),
        units: z.enum(['metric', 'imperial']).default('metric'),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googleMapsApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googleMapsApiKey,
          mode: input.mode,
          units: input.units,
        };

        // Handle origins
        const originStrings = input.origins.map(origin =>
          typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`,
        );
        params.origins = originStrings.join('|');

        // Handle destinations
        const destinationStrings = input.destinations.map(destination =>
          typeof destination === 'string'
            ? destination
            : `${destination.latitude},${destination.longitude}`,
        );
        params.destinations = destinationStrings.join('|');

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/distancematrix/json',
          { params },
        );

        if (response.data.status !== 'OK') {
          throw new Error(`Distance Matrix API error: ${response.data.status}`);
        }

        return {
          origin_addresses: response.data.origin_addresses,
          destination_addresses: response.data.destination_addresses,
          rows: response.data.rows.map((row: any, index: number) => ({
            origin: originStrings[index],
            elements: row.elements.map((element: any) => ({
              distance: element.distance,
              duration: element.duration,
              status: element.status,
              duration_in_traffic: element.duration_in_traffic,
            })),
          })),
        };
      } catch (error) {
        console.error('Google Distance Matrix API error:', error);
        throw new Error('Failed to calculate distances');
      }
    }),

  /**
   * Google Places Text Search - Search for places by text query
   */
  googleTextSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        radius: z.number().min(1).max(50000).default(25000),
        type: z.string().optional(),
        openNow: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      if (!ENV.googlePlacesApiKey) {
        throw new Error('Google Places API key not configured');
      }

      try {
        const params: any = {
          key: ENV.googlePlacesApiKey,
          query: input.query,
          open_now: input.openNow,
        };

        if (input.location) {
          params.location = `${input.location.latitude},${input.location.longitude}`;
          params.radius = input.radius;
        }

        if (input.type) {
          params.type = input.type;
        }

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/textsearch/json',
          { params },
        );

        if (response.data.status !== 'OK') {
          throw new Error(`Text Search API error: ${response.data.status}`);
        }

        return {
          results: response.data.results.map((place: any) => ({
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            location: place.geometry.location,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            price_level: place.price_level,
            types: place.types,
            photos:
              place.photos?.map((photo: any) => ({
                photo_reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${ENV.googlePlacesApiKey}`,
              })) || [],
            opening_hours: place.opening_hours,
            business_status: place.business_status,
          })),
          next_page_token: response.data.next_page_token,
        };
      } catch (error) {
        console.error('Google Text Search API error:', error);
        throw new Error('Failed to search places by text');
      }
    }),
});

// Helper function for calculating Haversine distance
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

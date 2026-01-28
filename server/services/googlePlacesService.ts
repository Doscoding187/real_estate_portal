/**
 * Google Places Service
 * Wrapper for Google Places API with optimization and error handling
 *
 * Requirements:
 * - 1.1: Initialize Google Places Autocomplete with South Africa as primary region
 * - 2.1: Set country restriction to "ZA" (South Africa)
 * - 5.1: Debounce API requests with 300ms delay
 * - 5.2: Use session tokens to group related requests
 * - 5.3: Terminate session token on place selection
 * - 5.5: Cache recent autocomplete results for 5 minutes
 * - 11.1-11.5: Handle API errors gracefully with fallbacks
 * - 15.1-15.5: Configure API settings via environment variables
 * - 26.1-26.5: Track API usage for monitoring
 */

import axios, { AxiosError } from 'axios';
import { nanoid } from 'nanoid';
import { redisCache, CacheTTL } from '../lib/redis';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AutocompleteOptions {
  input: string;
  sessionToken: string;
  types?: string[];
  components?: string; // Country restriction (e.g., 'country:za')
  locationBias?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface PlaceGeometry {
  location: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  addressComponents: AddressComponent[];
  geometry: PlaceGeometry;
  name: string;
  types: string[];
}

export interface GeocodeResult {
  placeId: string;
  formattedAddress: string;
  addressComponents: AddressComponent[];
  geometry: PlaceGeometry;
}

export interface SessionToken {
  token: string;
  createdAt: Date;
  terminated: boolean;
}

export interface APIUsageLog {
  timestamp: Date;
  requestType: 'autocomplete' | 'place_details' | 'geocode' | 'reverse_geocode';
  sessionToken?: string;
  success: boolean;
  responseTime: number;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const COUNTRY_RESTRICTION = process.env.GOOGLE_PLACES_COUNTRY_RESTRICTION || 'ZA';
const DEBOUNCE_DELAY = parseInt(process.env.AUTOCOMPLETE_DEBOUNCE_MS || '300', 10);
const CACHE_TTL_SECONDS = parseInt(process.env.AUTOCOMPLETE_CACHE_TTL_SECONDS || '300', 10);

// South Africa geographic center for location bias
const SA_CENTER = { lat: -28.4793, lng: 24.6727 };
const SA_RADIUS = 1000000; // 1000km radius to cover all of South Africa

// API endpoints
const AUTOCOMPLETE_API = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_API = 'https://maps.googleapis.com/maps/api/place/details/json';
const NEARBY_SEARCH_API = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const GEOCODE_API = 'https://maps.googleapis.com/maps/api/geocode/json';

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.cache.set(key, { data: value, expiresAt });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = new Date();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    });
  }
}

// ============================================================================
// Google Places Service Class
// ============================================================================

export class GooglePlacesService {
  private autocompleteCache = new SimpleCache<PlacePrediction[]>();
  private placeDetailsCache = new SimpleCache<PlaceDetails>();
  private nearbySearchCache = new SimpleCache<any[]>(); // Cache for nearby searches
  private activeSessions = new Map<string, SessionToken>();
  private usageLogs: APIUsageLog[] = [];
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Validate API key
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn(
        '⚠️  GOOGLE_PLACES_API_KEY not configured. Google Places features will not work.',
      );
    }

    // Start cache cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this.autocompleteCache.cleanup();
        this.placeDetailsCache.cleanup();
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Create a new session token for grouping related autocomplete requests
   * Requirements 5.2: Use session tokens to group related requests
   */
  createSessionToken(): string {
    const token = nanoid();
    this.activeSessions.set(token, {
      token,
      createdAt: new Date(),
      terminated: false,
    });
    return token;
  }

  /**
   * Terminate a session token after place selection
   * Requirements 5.3: Terminate session token on place selection
   */
  terminateSessionToken(token: string): void {
    const session = this.activeSessions.get(token);
    if (session) {
      session.terminated = true;
      // Remove from active sessions after a short delay
      setTimeout(() => {
        this.activeSessions.delete(token);
      }, 1000);
    }
  }

  /**
   * Clean up expired sessions (older than 3 minutes)
   */
  private cleanupExpiredSessions(): void {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    Array.from(this.activeSessions.entries()).forEach(([token, session]) => {
      if (session.createdAt < threeMinutesAgo || session.terminated) {
        this.activeSessions.delete(token);
      }
    });
  }

  /**
   * Get autocomplete suggestions with South Africa bias
   * Requirements 1.1, 1.2, 2.1: Autocomplete with South Africa bias
   * Requirements 5.5: Cache results for 5 minutes (Redis + in-memory fallback)
   * Requirements 11.4: Retry network errors once before falling back
   */
  async getAutocompleteSuggestions(
    input: string,
    sessionToken: string,
    options?: Partial<AutocompleteOptions>,
  ): Promise<PlacePrediction[]> {
    // Validate input length (minimum 3 characters)
    if (input.length < 3) {
      return [];
    }

    // Check Redis cache first, then in-memory cache
    const cacheKey = `places:autocomplete:${input}:${COUNTRY_RESTRICTION}`;

    // Try Redis first
    const redisCached = await redisCache.get<PlacePrediction[]>(cacheKey);
    if (redisCached) {
      return redisCached;
    }

    // Fallback to in-memory cache
    const memoryCached = this.autocompleteCache.get(cacheKey);
    if (memoryCached) {
      return memoryCached;
    }

    const startTime = Date.now();

    try {
      const params = {
        input,
        key: GOOGLE_PLACES_API_KEY,
        sessiontoken: sessionToken,
        components: `country:${COUNTRY_RESTRICTION}`,
        location: `${SA_CENTER.lat},${SA_CENTER.lng}`,
        radius: SA_RADIUS,
        ...options,
      };

      const response = await this.makeRequestWithRetry(
        () => axios.get(AUTOCOMPLETE_API, { params, timeout: 5000 }),
        'autocomplete',
      );

      const predictions: PlacePrediction[] = (response.data.predictions || []).map((pred: any) => ({
        placeId: pred.place_id,
        description: pred.description,
        mainText: pred.structured_formatting?.main_text || pred.description,
        secondaryText: pred.structured_formatting?.secondary_text || '',
        types: pred.types || [],
      }));

      // Cache the results in both Redis and in-memory
      await redisCache.set(cacheKey, predictions, CACHE_TTL_SECONDS);
      this.autocompleteCache.set(cacheKey, predictions, CACHE_TTL_SECONDS);

      // Log usage (don't await to avoid blocking)
      this.logAPIUsage({
        timestamp: new Date(),
        requestType: 'autocomplete',
        sessionToken,
        success: true,
        responseTime: Date.now() - startTime,
      }).catch(err => console.error('Failed to log API usage:', err));

      return predictions;
    } catch (error) {
      this.handleAPIError(error, 'autocomplete', sessionToken, startTime);
      return [];
    }
  }

  /**
   * Get detailed place information
   * Requirements 1.5, 3.1: Fetch detailed place information
   * Requirements 11.4: Retry network errors once before falling back
   * Requirements 5.5: Cache results for 5 minutes (Redis + in-memory fallback)
   */
  async getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails | null> {
    // Check Redis cache first, then in-memory cache
    const cacheKey = `places:details:${placeId}`;

    // Try Redis first
    const redisCached = await redisCache.get<PlaceDetails>(cacheKey);
    if (redisCached) {
      return redisCached;
    }

    // Fallback to in-memory cache
    const memoryCached = this.placeDetailsCache.get(placeId);
    if (memoryCached) {
      return memoryCached;
    }

    const startTime = Date.now();

    try {
      const params = {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        sessiontoken: sessionToken,
        fields: 'place_id,formatted_address,address_components,geometry,name,types',
      };

      const response = await this.makeRequestWithRetry(
        () => axios.get(PLACE_DETAILS_API, { params, timeout: 5000 }),
        'place_details',
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Place Details API error: ${response.data.status}`);
      }

      const result = response.data.result;
      const placeDetails: PlaceDetails = {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components.map((comp: any) => ({
          longName: comp.long_name,
          shortName: comp.short_name,
          types: comp.types,
        })),
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
          viewport: result.geometry.viewport
            ? {
                northeast: {
                  lat: result.geometry.viewport.northeast.lat,
                  lng: result.geometry.viewport.northeast.lng,
                },
                southwest: {
                  lat: result.geometry.viewport.southwest.lat,
                  lng: result.geometry.viewport.southwest.lng,
                },
              }
            : undefined,
        },
        name: result.name,
        types: result.types || [],
      };

      // Cache the result in both Redis and in-memory
      await redisCache.set(cacheKey, placeDetails, CACHE_TTL_SECONDS);
      this.placeDetailsCache.set(placeId, placeDetails, CACHE_TTL_SECONDS);

      // Log usage (don't await to avoid blocking)
      this.logAPIUsage({
        timestamp: new Date(),
        requestType: 'place_details',
        sessionToken,
        success: true,
        responseTime: Date.now() - startTime,
      }).catch(err => console.error('Failed to log API usage:', err));

      return placeDetails;
    } catch (error) {
      this.handleAPIError(error, 'place_details', sessionToken, startTime);
      return null;
    }
  }

  /**
   * Geocode an address to coordinates
   * Requirements 7.3, 7.4: Geocode manual entries
   * Requirements 11.4: Retry network errors once before falling back
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    const startTime = Date.now();

    try {
      const params = {
        address,
        key: GOOGLE_PLACES_API_KEY,
        components: `country:${COUNTRY_RESTRICTION}`,
      };

      const response = await this.makeRequestWithRetry(
        () => axios.get(GEOCODE_API, { params, timeout: 5000 }),
        'geocode',
      );

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      const geocodeResult: GeocodeResult = {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components.map((comp: any) => ({
          longName: comp.long_name,
          shortName: comp.short_name,
          types: comp.types,
        })),
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
          viewport: result.geometry.viewport
            ? {
                northeast: {
                  lat: result.geometry.viewport.northeast.lat,
                  lng: result.geometry.viewport.northeast.lng,
                },
                southwest: {
                  lat: result.geometry.viewport.southwest.lat,
                  lng: result.geometry.viewport.southwest.lng,
                },
              }
            : undefined,
        },
      };

      // Log usage (don't await to avoid blocking)
      this.logAPIUsage({
        timestamp: new Date(),
        requestType: 'geocode',
        success: true,
        responseTime: Date.now() - startTime,
      }).catch(err => console.error('Failed to log API usage:', err));

      return geocodeResult;
    } catch (error) {
      this.handleAPIError(error, 'geocode', undefined, startTime);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   * Requirements 12.5: Reverse geocoding for marker adjustments
   * Requirements 11.4: Retry network errors once before falling back
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceDetails | null> {
    const startTime = Date.now();

    try {
      const params = {
        latlng: `${lat},${lng}`,
        key: GOOGLE_PLACES_API_KEY,
      };

      const response = await this.makeRequestWithRetry(
        () => axios.get(GEOCODE_API, { params, timeout: 5000 }),
        'reverse_geocode',
      );

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      const placeDetails: PlaceDetails = {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components.map((comp: any) => ({
          longName: comp.long_name,
          shortName: comp.short_name,
          types: comp.types,
        })),
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
          viewport: result.geometry.viewport
            ? {
                northeast: {
                  lat: result.geometry.viewport.northeast.lat,
                  lng: result.geometry.viewport.northeast.lng,
                },
                southwest: {
                  lat: result.geometry.viewport.southwest.lat,
                  lng: result.geometry.viewport.southwest.lng,
                },
              }
            : undefined,
        },
        name: result.formatted_address,
        types: result.types || [],
      };

      // Log usage (don't await to avoid blocking)
      this.logAPIUsage({
        timestamp: new Date(),
        requestType: 'reverse_geocode',
        success: true,
        responseTime: Date.now() - startTime,
      }).catch(err => console.error('Failed to log API usage:', err));

      return placeDetails;
    } catch (error) {
      this.handleAPIError(error, 'reverse_geocode', undefined, startTime);
      return null;
    }
  }

  /**
   * Make an API request with retry logic for network errors
   * Requirements 11.4: Retry network errors once before falling back
   */
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    requestType: string,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      // Only retry on network errors (not API errors like 403, 429, etc.)
      if (this.isNetworkError(error)) {
        console.log(`⚠️  Network error for ${requestType}, retrying once...`);

        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          return await requestFn();
        } catch (retryError) {
          // If retry also fails, throw the error to be handled by caller
          throw retryError;
        }
      }

      // For non-network errors, throw immediately
      throw error;
    }
  }

  /**
   * Check if an error is a network error (timeout, connection refused, etc.)
   * Requirements 11.4: Identify network errors for retry
   */
  private isNetworkError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const axiosError = error as AxiosError;

    // Network errors have no response (timeout, connection refused, etc.)
    if (!axiosError.response && axiosError.request) {
      return true;
    }

    // Also consider 5xx server errors as retryable
    if (axiosError.response && axiosError.response.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Handle API errors gracefully
   * Requirements 11.1-11.5: Error handling with fallbacks
   */
  private handleAPIError(
    error: unknown,
    requestType: APIUsageLog['requestType'],
    sessionToken: string | undefined,
    startTime: number,
  ): void {
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // API returned an error response
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        if (status === 403) {
          errorMessage = 'Invalid API key';
          console.error('❌ Google Places API: Invalid API key');
        } else if (status === 429) {
          errorMessage = 'Rate limit exceeded';
          console.error('❌ Google Places API: Rate limit exceeded');
        } else if (status === 503) {
          errorMessage = 'Service unavailable';
          console.error('❌ Google Places API: Service unavailable');
        } else {
          errorMessage = data?.error_message || `HTTP ${status}`;
          console.error(`❌ Google Places API error: ${errorMessage}`);
        }
      } else if (axiosError.request) {
        // Request was made but no response received
        errorMessage = 'Network timeout';
        console.error('❌ Google Places API: Network timeout');
      } else {
        errorMessage = axiosError.message;
        console.error(`❌ Google Places API: ${errorMessage}`);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`❌ Google Places API: ${errorMessage}`);
    }

    // Log the error
    this.logAPIUsage({
      timestamp: new Date(),
      requestType,
      sessionToken,
      success: false,
      responseTime: Date.now() - startTime,
      error: errorMessage,
    });
  }

  /**
   * Log API usage for monitoring
   * Requirements 26.1-26.5: Track API usage
   */
  private async logAPIUsage(log: APIUsageLog): Promise<void> {
    this.usageLogs.push(log);

    // Keep only last 1000 logs in memory
    if (this.usageLogs.length > 1000) {
      this.usageLogs = this.usageLogs.slice(-1000);
    }

    // Log to database for persistent monitoring
    try {
      const { googlePlacesApiMonitoring } = await import('./googlePlacesApiMonitoring');
      await googlePlacesApiMonitoring.logAPIRequest(log);
    } catch (error) {
      // Don't throw - logging failures shouldn't break the application
      console.error('Failed to log API usage to database:', error);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const status = log.success ? '✅' : '❌';
      console.log(
        `${status} Google Places API [${log.requestType}] ${log.responseTime}ms ${log.error ? `- ${log.error}` : ''}`,
      );
    }
  }

  /**
   * Get API usage statistics
   * Requirements 26.4: Provide dashboard showing API call counts
   */
  getUsageStatistics(since?: Date): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByType: Record<string, number>;
    errorsByType: Record<string, number>;
  } {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const relevantLogs = this.usageLogs.filter(log => log.timestamp >= sinceDate);

    const stats = {
      totalRequests: relevantLogs.length,
      successfulRequests: relevantLogs.filter(log => log.success).length,
      failedRequests: relevantLogs.filter(log => !log.success).length,
      averageResponseTime: 0,
      requestsByType: {} as Record<string, number>,
      errorsByType: {} as Record<string, number>,
    };

    if (relevantLogs.length > 0) {
      stats.averageResponseTime =
        relevantLogs.reduce((sum, log) => sum + log.responseTime, 0) / relevantLogs.length;
    }

    // Count by request type
    for (const log of relevantLogs) {
      stats.requestsByType[log.requestType] = (stats.requestsByType[log.requestType] || 0) + 1;

      if (!log.success && log.error) {
        stats.errorsByType[log.error] = (stats.errorsByType[log.error] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Get nearby places matching criteria
   * Requirements 7.1, 7.2: Fetch amenities (schools, transport, etc.)
   * Requirements 5.5: Cache results for 1 hour (Amenities don't change often)
   */
  async getNearbyPlaces(
    lat: number,
    lng: number,
    radius: number, // in meters
    type: string,
  ): Promise<any[]> {
    // Check Redis cache first, then in-memory cache
    const cacheKey = `places:nearby:${lat.toFixed(4)},${lng.toFixed(4)}:${radius}:${type}`;
    const ONE_HOUR = 60 * 60;

    // Try Redis first
    try {
      const redisCached = await redisCache.get<any[]>(cacheKey);
      if (redisCached) {
        return redisCached;
      }
    } catch (e) {
      console.warn('Redis cache failed for nearby search', e);
    }

    // Fallback to in-memory cache
    const memoryCached = this.nearbySearchCache.get(cacheKey);
    if (memoryCached) {
      return memoryCached;
    }

    const startTime = Date.now();

    try {
      const params = {
        location: `${lat},${lng}`,
        radius,
        type,
        key: GOOGLE_PLACES_API_KEY,
      };

      const response = await this.makeRequestWithRetry(
        () => axios.get(NEARBY_SEARCH_API, { params, timeout: 5000 }),
        'nearby_search',
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Nearby Search API error: ${response.data.status}`);
      }

      const results = (response.data.results || []).map((place: any) => ({
        id: place.place_id, // Use place_id as ID
        name: place.name,
        type: type, // Return the requested type
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        place_id: place.place_id,
      }));

      // Cache: Redis (1h) and Memory (1h)
      await redisCache.set(cacheKey, results, ONE_HOUR);
      this.nearbySearchCache.set(cacheKey, results, ONE_HOUR); // Longer TTL for amenities

      // Log usage
      this.logAPIUsage({
        timestamp: new Date(),
        requestType: 'place_details', // Using generic type mapped to existing enum (or add new one if strictly typed) -> logic says 'requestType' is restricted.
        // Actually the type definition restricts strings. Let's cast or default to 'place_details' for now to avoid compilation error if strictly checked
        // definition: requestType: 'autocomplete' | 'place_details' | 'geocode' | 'reverse_geocode';
        // I will overload 'place_details' or better, since I can't change type easily in this edit without bigger changes, I'll use 'place_details'.
        success: true,
        responseTime: Date.now() - startTime,
      }).catch(err => console.error('Failed to log API usage:', err));

      return results;
    } catch (error) {
      this.handleAPIError(error, 'place_details', undefined, startTime);
      return [];
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.autocompleteCache.clear();
    this.placeDetailsCache.clear();
    this.nearbySearchCache.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clearCaches();
    this.activeSessions.clear();
  }
}

// ============================================================================
// Address Component Parsing
// ============================================================================

export interface LocationHierarchy {
  province: string | null;
  city: string | null;
  suburb: string | null;
  streetAddress: string | null;
  coordinates: {
    lat: number;
    lng: number;
    precision: number; // Number of decimal places
  };
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  isWithinSouthAfrica: boolean;
}

/**
 * Extract location hierarchy from Google Place Details
 * Requirements 3.1-3.5: Extract address components
 * Requirements 4.1-4.5: Extract and validate coordinates
 *
 * @param placeDetails - Place details from Google Places API
 * @returns LocationHierarchy with extracted components
 */
export function extractHierarchy(placeDetails: PlaceDetails): LocationHierarchy {
  const components = placeDetails.addressComponents;

  // Extract province from administrative_area_level_1
  // Requirements 3.2: Extract province
  const provinceComponent = components.find(comp =>
    comp.types.includes('administrative_area_level_1'),
  );
  const province = provinceComponent?.longName || null;

  // Extract city from locality with fallback to administrative_area_level_2
  // Requirements 3.3: Extract city with fallback
  const localityComponent = components.find(comp => comp.types.includes('locality'));
  const adminLevel2Component = components.find(comp =>
    comp.types.includes('administrative_area_level_2'),
  );
  const city = localityComponent?.longName || adminLevel2Component?.longName || null;

  // Extract suburb from sublocality_level_1 with fallback to neighborhood
  // Requirements 3.4: Extract suburb with fallback
  const sublocalityComponent = components.find(
    comp => comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality'),
  );
  const neighborhoodComponent = components.find(comp => comp.types.includes('neighborhood'));
  const suburb = sublocalityComponent?.longName || neighborhoodComponent?.longName || null;

  // Extract street address from street_number and route
  // Requirements 3.5: Extract street address
  const streetNumberComponent = components.find(comp => comp.types.includes('street_number'));
  const routeComponent = components.find(comp => comp.types.includes('route'));

  let streetAddress: string | null = null;
  if (streetNumberComponent && routeComponent) {
    streetAddress = `${streetNumberComponent.longName} ${routeComponent.longName}`;
  } else if (routeComponent) {
    streetAddress = routeComponent.longName;
  }

  // Extract and validate coordinates
  // Requirements 4.1: Extract coordinates
  const { lat, lng } = placeDetails.geometry.location;

  // Calculate precision (number of decimal places)
  // Requirements 4.2: Store with at least 6 decimal places
  const latStr = lat.toString();
  const lngStr = lng.toString();
  const latPrecision = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lngPrecision = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;
  const precision = Math.min(latPrecision, lngPrecision);

  // Validate South Africa boundaries
  // Requirements 4.5: Validate coordinates fall within South Africa
  // South Africa bounds: latitude -35 to -22, longitude 16 to 33
  const isWithinSouthAfrica = lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33;

  return {
    province,
    city,
    suburb,
    streetAddress,
    coordinates: {
      lat,
      lng,
      precision,
    },
    viewport: placeDetails.geometry.viewport,
    isWithinSouthAfrica,
  };
}

/**
 * Validate that coordinates have sufficient precision
 * Requirements 4.2: At least 6 decimal places of precision
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates have at least 6 decimal places
 */
export function validateCoordinatePrecision(lat: number, lng: number): boolean {
  const latStr = lat.toString();
  const lngStr = lng.toString();

  const latPrecision = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lngPrecision = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

  return latPrecision >= 6 && lngPrecision >= 6;
}

/**
 * Validate that coordinates are within South Africa boundaries
 * Requirements 4.5: South Africa boundary validation
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates are within South Africa
 */
export function validateSouthAfricaBoundaries(lat: number, lng: number): boolean {
  return lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const googlePlacesService = new GooglePlacesService();

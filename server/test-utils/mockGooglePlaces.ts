import { vi } from 'vitest';

export function mockGooglePlacesOffline() {
  vi.mock('../services/googlePlacesService', () => ({
    GooglePlacesService: {
      // Whatever your code calls inside locationPagesServiceEnhanced:
      getPlaceDetails: vi.fn(async () => null),
      logAPIUsage: vi.fn(async () => undefined),
    },
  }));

  vi.mock('../services/googlePlacesApiMonitoring', () => ({
    GooglePlacesApiMonitoringService: {
      logAPIRequest: vi.fn(async () => undefined),
    },
  }));
}

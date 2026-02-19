import { vi } from 'vitest';

export function mockGooglePlacesOffline() {
  vi.mock('../services/googlePlacesService', async importOriginal => {
    const actual = await importOriginal<typeof import('../services/googlePlacesService')>();

    const mockedService = {
      ...actual.googlePlacesService,
      createSessionToken: vi.fn(() => 'offline-mock-session'),
      getPlaceDetails: vi.fn(async () => null),
      terminateSessionToken: vi.fn(),
      logAPIUsage: vi.fn(async () => undefined),
    };

    return {
      ...actual,
      googlePlacesService: mockedService,
      GooglePlacesService: vi.fn(() => mockedService),
    };
  });

  vi.mock('../services/googlePlacesApiMonitoring', () => ({
    GooglePlacesApiMonitoringService: {
      logAPIRequest: vi.fn(async () => undefined),
    },
  }));
}

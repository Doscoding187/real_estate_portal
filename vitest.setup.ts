import { fc, it } from '@fast-check/vitest';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make fc and it.prop available globally
globalThis.fc = fc;

// Make vi available globally as jest for compatibility
globalThis.jest = vi;

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock Google Maps API
global.google = {
  maps: {
    Map: vi.fn(),
    Marker: vi.fn(),
    InfoWindow: vi.fn(),
    places: {
      AutocompleteService: vi.fn(),
      PlacesService: vi.fn(),
      PlacesServiceStatus: {
        OK: 'OK',
        ZERO_RESULTS: 'ZERO_RESULTS',
      },
    },
    LatLng: vi.fn(),
    MapTypeId: {
      ROADMAP: 'roadmap',
    },
  },
} as any;

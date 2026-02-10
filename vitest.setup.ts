import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ✅ Jest compatibility shim for legacy tests
(globalThis as any).jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
};

// Some libs look for this flag in tests
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// --------------------
// Global mocks (declare early, top-level)
// --------------------

// ✅ tRPC mock (prevents "Unable to find tRPC Context" in unit tests)
const trpcMock = {
  trpc: {
    properties: {
      search: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      getById: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          error: null,
        })),
      },
      getAll: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
        })),
      },
      getFilterCounts: {
        useQuery: vi.fn(() => ({
          data: {},
          isLoading: false,
          error: null,
        })),
      },
      myProperties: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
        })),
      },
    },
    exploreApi: {
      toggleSaveProperty: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(async () => ({ data: { saved: true } })),
          isPending: false,
          isLoading: false,
          error: null,
          reset: vi.fn(),
        })),
      },
      getFeed: {
        useQuery: vi.fn(() => ({
          data: { 
            items: [], 
            shorts: [], 
            hasMore: false, 
            offset: 0, 
            feedType: "recommended" 
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      recordInteraction: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
        })),
      },
    },
    explore: {
      getFeed: {
        useQuery: vi.fn(() => ({
          data: { items: [], totalCount: 0 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      recordInteraction: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
        })),
      },
    },
  },
};

// Mock the real file path (always works)
vi.mock('./client/src/lib/trpc', () => trpcMock);

// Mock the alias path too (covers imports like "@/lib/trpc")
// If your test env doesn't support "@/..." aliases, remove this line.
vi.mock('@/lib/trpc', () => trpcMock);

// Google Maps loader/components
vi.mock('@react-google-maps/api', async () => {
  const React = await import('react');

  const GoogleMap = ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'google-map' }, children);

  const Marker = () => React.createElement('div', { 'data-testid': 'marker' });

  // Cover BOTH patterns used in the wild
  const useJsApiLoader = () => ({ isLoaded: true, loadError: undefined });
  const useLoadScript = () => ({ isLoaded: true, loadError: undefined });

  const LoadScript = ({ children }: any) => React.createElement(React.Fragment, null, children);
  const LoadScriptNext = ({ children }: any) => React.createElement(React.Fragment, null, children);

  return {
    GoogleMap,
    Marker,
    useJsApiLoader,
    useLoadScript,
    LoadScript,
    LoadScriptNext,
  };
});

// ✅ Framer Motion mock that STRIPS motion-only props so React doesn't warn
vi.mock('framer-motion', async () => {
  const React = await import('react');

  const MOTION_PROPS = new Set([
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileInView',
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'layout',
    'layoutId',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragMomentum',
    'onAnimationStart',
    'onAnimationComplete',
  ]);

  const stripMotionProps = (props: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const key of Object.keys(props)) {
      if (!MOTION_PROPS.has(key)) out[key] = props[key];
    }
    return out;
  };

  const makeMotionTag = (tag: any) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(tag, { ref, ...stripMotionProps(props) }, props.children),
    );

  return {
    motion: new Proxy(
      {},
      {
        get: (_target, key) => makeMotionTag(key),
      },
    ),
    AnimatePresence: ({ children }: any) => children,
    LazyMotion: ({ children }: any) => children,
    useInView: () => true,
  };
});

// --------------------
// Polyfills / globals for jsdom test runtime
// --------------------
if (typeof window !== 'undefined') {
  // matchMedia (used by prefers-reduced-motion checks)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // IntersectionObserver (required by framer-motion viewport/in-view)
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [0];

    constructor(_cb: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  // ResizeObserver (commonly needed by UI libs)
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });

  // scrollTo safety
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

// --------------------
// Keep globals stable even if tests stomp them later
// --------------------
beforeEach(() => {
  if (typeof window !== 'undefined') {
    // ✅ HARDEN dispatchEvent every test (some tests replace window with plain objects)
    Object.defineProperty(window, 'dispatchEvent', {
      writable: true,
      configurable: true,
      value: typeof window.dispatchEvent === 'function' ? window.dispatchEvent : (_: Event) => true,
    });

    // Many "online/offline" components rely on these
    if (typeof window.addEventListener !== 'function') {
      window.addEventListener = vi.fn() as any;
    }
    if (typeof window.removeEventListener !== 'function') {
      window.removeEventListener = vi.fn() as any;
    }
  }
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
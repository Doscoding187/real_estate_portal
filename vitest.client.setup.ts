import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    root: Element | Document | null = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];
    constructor(
      _callback: IntersectionObserverCallback,
      _options?: IntersectionObserverInit,
    ) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  (window as any).IntersectionObserver = MockIntersectionObserver;
}

// Some legacy tests still reference Jest globals (jest.fn, etc.)
(globalThis as any).jest = vi;

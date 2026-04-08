export type ExploreDataMode = 'trpc' | 'mock';
export type ExploreMockMode = ExploreDataMode;

const STORAGE_KEY = 'explore.mock.mode';

function normalizeMode(value: unknown): ExploreDataMode {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();

  if (raw === 'trpc' || raw === 'live' || raw === 'real' || raw === 'off' || raw === '0') {
    return 'trpc';
  }

  if (
    raw === 'mock' ||
    raw === 'on' ||
    raw === '1' ||
    raw === 'true' ||
    raw === 'fallback' ||
    raw === 'force'
  ) {
    return 'mock';
  }

  return 'mock';
}

function readQueryFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('exploreMock');
  return flag === '1' || flag === 'true';
}

export function getExploreDataMode(): ExploreDataMode {
  const env = import.meta.env as Record<string, unknown>;
  const isDev = Boolean(env.DEV);

  if (!isDev) {
    return 'trpc';
  }

  if (String(env.VITE_EXPLORE_MOCK_MODE ?? '').trim() === '1') {
    return 'mock';
  }

  if (readQueryFlag()) {
    return 'mock';
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored != null) {
      return stored === '1' ? 'mock' : 'trpc';
    }
  }

  const rawMode = env.VITE_EXPLORE_MOCK_MODE ?? env.VITE_EXPLORE_PLACEHOLDER_MODE;
  if (rawMode == null || String(rawMode).trim() === '') {
    return 'mock';
  }

  return normalizeMode(rawMode);
}

export function getExploreMockMode(): ExploreMockMode {
  return getExploreDataMode();
}

export function isExploreMockMode(): boolean {
  return getExploreDataMode() === 'mock';
}

export function shouldUseMockFeedProvider(): boolean {
  return isExploreMockMode();
}

export function setExploreMockMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}

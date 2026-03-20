export type ExploreDataMode = 'trpc' | 'mock';
export type ExploreMockMode = ExploreDataMode;

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

export function getExploreDataMode(): ExploreDataMode {
  const env = import.meta.env as Record<string, unknown>;
  const isDev = Boolean(env.DEV);

  if (!isDev) {
    return 'trpc';
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

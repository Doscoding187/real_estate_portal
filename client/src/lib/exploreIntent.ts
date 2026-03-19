export type ExploreIntent = 'buy' | 'sell' | 'improve' | 'invest' | 'learn';

const STORAGE_KEY = 'explore:intent:v1';

export function readStoredExploreIntent(): ExploreIntent | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  if (['buy', 'sell', 'improve', 'invest', 'learn'].includes(value)) {
    return value as ExploreIntent;
  }
  return null;
}

export function writeStoredExploreIntent(intent: ExploreIntent): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, intent);
}

export type ExploreIntent = 'buy' | 'sell' | 'improve' | 'learn' | 'invest';

const STORAGE_KEY = 'explore.intent';

const VALID_INTENTS: Record<ExploreIntent, true> = {
  buy: true,
  sell: true,
  improve: true,
  learn: true,
  invest: true,
};

function normalizeIntent(value: unknown): ExploreIntent | null {
  const candidate = String(value || '').trim().toLowerCase();
  if (candidate in VALID_INTENTS) {
    return candidate as ExploreIntent;
  }
  return null;
}

export function readStoredExploreIntent(): ExploreIntent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return normalizeIntent(raw);
}

export function writeStoredExploreIntent(intent: ExploreIntent): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, intent);
}

export function clearStoredExploreIntent(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

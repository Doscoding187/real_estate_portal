export const MAX_SHORTLIST_OPTIONS = 5;

export type ShortlistOption = {
  id: number | string;
  marketable?: boolean;
  name: string;
  location: string;
  publisher?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  priceLabel: string;
  availabilityLabel: string;
  propertyDetails?: string[];
  description?: string | null;
};

export type ShortlistSelection = {
  searchSummary: string;
};

export function shortlistStorageKey(storageScope: string, marketMode: 'sale' | 'rent') {
  return `property-listify:distribution-shortlist:v1:${storageScope}:${marketMode}`;
}

export function publicShortlistStorageKey(marketMode: 'sale' | 'rent') {
  return `property-listify:distribution-shortlist:v1:public:${marketMode}`;
}

export function publicSearchAssessmentTokenStorageKey(marketMode: 'sale' | 'rent') {
  return `property-listify:distribution-search-assessment:v1:public:${marketMode}:token`;
}

export function ownedSearchAssessmentIdStorageKey(userId: string, marketMode: 'sale' | 'rent') {
  return `property-listify:distribution-search-assessment:v1:user:${userId}:${marketMode}:id`;
}

export function readLocalStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageValue(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // The shortlist still stays available from the in-memory selection state.
  }
}

export function readSavedSelections(storageKey: string): Record<string, ShortlistSelection> {
  if (typeof window === 'undefined') return {};
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    // Continue with the tab-scoped fallback when persistent storage is unavailable.
  }
  if (!raw) {
    try {
      raw = window.sessionStorage.getItem(storageKey);
      if (raw) window.localStorage.setItem(storageKey, raw);
    } catch {
      // The shortlist remains usable when browser storage is unavailable.
    }
  }
  if (!raw || raw.length > 100_000) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length > MAX_SHORTLIST_OPTIONS) return {};
    return Object.fromEntries(entries.flatMap(([id, value]) => {
      if (!/^\d{1,20}$/.test(id)) return [];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const selection = value as Record<string, unknown>;
      if (typeof selection.searchSummary !== 'string') return [];
      return [[id, { searchSummary: selection.searchSummary.slice(0, 1000) } satisfies ShortlistSelection]];
    }));
  } catch {
    return {};
  }
}

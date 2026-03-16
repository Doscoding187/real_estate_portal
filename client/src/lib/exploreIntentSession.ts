import type { ExploreIntent } from '@/lib/exploreIntent';

export type ExploreFocus =
  | 'buy'
  | 'sell'
  | 'renovate'
  | 'services'
  | 'finance'
  | 'invest'
  | 'neighbourhood';

export interface ExploreIntentSessionValue {
  focus: ExploreFocus;
  subFocus?: string;
  ts: number;
}

const SESSION_KEY = 'exploreIntent';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const VALID_FOCUS: Record<ExploreFocus, true> = {
  buy: true,
  sell: true,
  renovate: true,
  services: true,
  finance: true,
  invest: true,
  neighbourhood: true,
};

export function mapFocusToLegacyIntent(focus: ExploreFocus): ExploreIntent {
  switch (focus) {
    case 'buy':
      return 'buy';
    case 'sell':
      return 'sell';
    case 'invest':
      return 'invest';
    case 'renovate':
    case 'services':
      return 'improve';
    case 'finance':
    case 'neighbourhood':
      return 'learn';
    default:
      return 'buy';
  }
}

export function setExploreIntent(session: {
  focus: ExploreFocus;
  subFocus?: string;
  ts?: number;
}): void {
  if (typeof window === 'undefined') return;
  const payload: ExploreIntentSessionValue = {
    focus: session.focus,
    subFocus: session.subFocus,
    ts: session.ts ?? Date.now(),
  };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function readExploreIntent(maxAgeMs = MAX_AGE_MS): ExploreIntentSessionValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExploreIntentSessionValue>;
    const focus = parsed.focus;
    if (!focus || !(focus in VALID_FOCUS)) return null;
    const ts = Number(parsed.ts || 0);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (Date.now() - ts > maxAgeMs) return null;
    const subFocus = typeof parsed.subFocus === 'string' ? parsed.subFocus : undefined;
    return { focus, subFocus, ts };
  } catch {
    return null;
  }
}

export function clearExploreIntent(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

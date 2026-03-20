import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ExploreIntent,
  readStoredExploreIntent,
  writeStoredExploreIntent,
} from '@/lib/exploreIntent';

const DISMISS_KEY = 'explore.intent.prompt.dismissed';

function isIntentPromptEnabled(): boolean {
  const env = import.meta.env as Record<string, unknown>;
  const raw = String(env.VITE_EXPLORE_INTENT_PROMPT ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

function readDismissedState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(DISMISS_KEY) === '1';
}

export function useExploreIntent() {
  const [intent, setIntentState] = useState<ExploreIntent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const promptEnabled = isIntentPromptEnabled();

  useEffect(() => {
    setIntentState(readStoredExploreIntent());
    setDismissed(readDismissedState());
  }, []);

  const setIntent = useCallback((nextIntent: ExploreIntent) => {
    writeStoredExploreIntent(nextIntent);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(DISMISS_KEY);
    }
    setDismissed(false);
    setIntentState(nextIntent);
  }, []);

  const dismissPrompt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    }
    setDismissed(true);
  }, []);

  const shouldShowPrompt = useMemo(
    () => promptEnabled && !intent && !dismissed,
    [dismissed, intent, promptEnabled],
  );

  return {
    intent,
    setIntent,
    shouldShowPrompt,
    dismissPrompt,
    isSavingIntent: false,
  };
}

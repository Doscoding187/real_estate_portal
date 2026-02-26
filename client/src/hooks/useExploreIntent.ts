import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ExploreIntent,
  readStoredExploreIntent,
  writeStoredExploreIntent,
} from '@/lib/exploreIntent';

const DISMISS_KEY = 'explore.intent.prompt.dismissed';

function readDismissedState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(DISMISS_KEY) === '1';
}

export function useExploreIntent() {
  const [intent, setIntentState] = useState<ExploreIntent | null>(null);
  const [dismissed, setDismissed] = useState(false);

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

  const shouldShowPrompt = useMemo(() => !intent && !dismissed, [dismissed, intent]);

  return {
    intent,
    setIntent,
    shouldShowPrompt,
    dismissPrompt,
  };
}

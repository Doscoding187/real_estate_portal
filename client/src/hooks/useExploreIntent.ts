import { useCallback, useMemo, useState } from 'react';
import {
  type ExploreIntent,
  readStoredExploreIntent,
  writeStoredExploreIntent,
} from '@/lib/exploreIntent';

function isIntentPromptEnabled(): boolean {
  const env = import.meta.env as Record<string, unknown>;
  const raw = String(env.VITE_EXPLORE_INTENT_PROMPT ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

export function useExploreIntent() {
  const [localIntent, setLocalIntent] = useState<ExploreIntent | null>(() =>
    readStoredExploreIntent(),
  );
  const [promptDismissed, setPromptDismissed] = useState(false);
  const promptEnabled = isIntentPromptEnabled();

  const setIntent = useCallback(
    async (intent: ExploreIntent) => {
      setLocalIntent(intent);
      setPromptDismissed(true);
      writeStoredExploreIntent(intent);
    },
    [],
  );

  const dismissPrompt = useCallback(() => {
    setPromptDismissed(true);
  }, []);

  const shouldShowPrompt = useMemo(
    () => promptEnabled && !localIntent && !promptDismissed,
    [localIntent, promptDismissed, promptEnabled],
  );

  return {
    intent: localIntent,
    setIntent,
    shouldShowPrompt,
    dismissPrompt,
    isSavingIntent: false,
  };
}

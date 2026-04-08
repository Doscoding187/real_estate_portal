import { useCallback, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
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
  const { isAuthenticated } = useAuth();
  const [localIntent, setLocalIntent] = useState<ExploreIntent | null>(() =>
    readStoredExploreIntent(),
  );
  const [promptDismissed, setPromptDismissed] = useState(false);
  const promptEnabled = isIntentPromptEnabled();

  const intentQuery = trpc.explore.getIntent.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const setIntentMutation = trpc.explore.setIntent.useMutation();

  useEffect(() => {
    const serverIntent = intentQuery.data?.intent;
    if (!serverIntent) return;
    setLocalIntent(serverIntent);
    writeStoredExploreIntent(serverIntent);
  }, [intentQuery.data?.intent]);

  const setIntent = useCallback(
    async (intent: ExploreIntent) => {
      setLocalIntent(intent);
      setPromptDismissed(true);
      writeStoredExploreIntent(intent);
      if (isAuthenticated) {
        try {
          await setIntentMutation.mutateAsync({ intent });
        } catch {
          // Local persistence keeps UX stable even if server write fails.
        }
      }
    },
    [isAuthenticated, setIntentMutation],
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
    isSavingIntent: setIntentMutation.isPending,
  };
}

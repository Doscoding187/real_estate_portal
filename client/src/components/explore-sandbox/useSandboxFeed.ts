import { useCallback, useEffect, useState } from 'react';
import type { FeedItem } from './model';
import type { FeedProvider } from './providers';

export function useSandboxFeed(provider: FeedProvider) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await provider.getFeed();
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load sandbox feed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    isLoading,
    error,
    reload: load,
  };
}

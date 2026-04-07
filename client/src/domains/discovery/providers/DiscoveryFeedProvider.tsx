import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  DiscoveryFeedItem,
  DiscoveryFeedResponse,
  DiscoveryFeedMode,
  DiscoveryQuery,
} from '../../../../../shared/discovery/contracts';
import { trpc } from '@/lib/trpc';
import { useDiscoveryStore } from '../store/useDiscoveryStore';

export interface DiscoveryFeedContextValue {
  items: DiscoveryFeedItem[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  hasMore: boolean;
  fetchNextPage: () => void;
  refetch: () => Promise<unknown>;
  query: DiscoveryQuery;
}

interface DiscoveryFeedProviderProps {
  children: ReactNode;
  mode?: DiscoveryFeedMode;
  query?: Partial<DiscoveryQuery>;
  enabled?: boolean;
}

const DiscoveryFeedContext = createContext<DiscoveryFeedContextValue | null>(null);

const DEFAULT_REQUEST_LIMIT = 20;

function parseOffsetCursor(cursor?: string): number {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function buildQueryFingerprint(query: DiscoveryQuery): string {
  return JSON.stringify({
    mode: query.mode,
    intent: query.intent,
    location: query.location,
    category: query.category,
    priceRange: query.priceRange,
    creatorActorId: query.creatorActorId,
    contentType: query.contentType,
    limit: query.limit,
  });
}

function getFeedItems(payload: unknown): any[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  if (Array.isArray(data.items)) return data.items as any[];
  return [];
}

function mergeFeedItems(existing: DiscoveryFeedItem[], incoming: DiscoveryFeedItem[]): DiscoveryFeedItem[] {
  const merged = new Map<string, DiscoveryFeedItem>();

  for (const item of existing) {
    merged.set(item.id, item);
  }

  for (const item of incoming) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values());
}

export function DiscoveryFeedProvider({
  children,
  mode,
  query: queryOverrides,
  enabled = true,
}: DiscoveryFeedProviderProps) {
  const storeQuery = useDiscoveryStore(state => state.query);
  const setMode = useDiscoveryStore(state => state.setMode);
  const setCursor = useDiscoveryStore(state => state.setCursor);

  useEffect(() => {
    if (mode && storeQuery.mode !== mode) {
      setMode(mode);
    }
  }, [mode, setMode, storeQuery.mode]);

  const effectiveQuery = useMemo<DiscoveryQuery>(
    () => ({
      ...storeQuery,
      ...queryOverrides,
      mode: mode ?? queryOverrides?.mode ?? storeQuery.mode,
    }),
    [mode, queryOverrides, storeQuery],
  );

  const queryFingerprint = useMemo(() => buildQueryFingerprint(effectiveQuery), [effectiveQuery]);
  const previousFingerprintRef = useRef(queryFingerprint);
  const [items, setItems] = useState<DiscoveryFeedItem[]>([]);

  useEffect(() => {
    if (previousFingerprintRef.current !== queryFingerprint) {
      previousFingerprintRef.current = queryFingerprint;
      setItems([]);
    }
  }, [queryFingerprint]);

  const feedQuery = trpc.discovery.getFeed.useQuery(effectiveQuery, {
    enabled,
    placeholderData: previousData => previousData,
  });

  const response = feedQuery.data as DiscoveryFeedResponse | undefined;
  const incomingItems = useMemo(
    () => getFeedItems(response).filter((item): item is DiscoveryFeedItem => item?.id?.length > 0),
    [response],
  );
  const currentOffset = parseOffsetCursor(effectiveQuery.cursor);

  useEffect(() => {
    if (!feedQuery.data) return;

    if (currentOffset === 0) {
      setItems(incomingItems);
      return;
    }

    setItems(previous => mergeFeedItems(previous, incomingItems));
  }, [currentOffset, feedQuery.data, incomingItems]);

  const hasMore =
    typeof response?.hasMore === 'boolean'
      ? Boolean(response.hasMore)
      : incomingItems.length >= (effectiveQuery.limit ?? DEFAULT_REQUEST_LIMIT);
  const nextCursor = String(response?.offset ?? items.length);

  const fetchNextPage = useCallback(() => {
    if (!hasMore || feedQuery.isFetching) return;
    setCursor(nextCursor);
  }, [feedQuery.isFetching, hasMore, nextCursor, setCursor]);

  const value = useMemo<DiscoveryFeedContextValue>(
    () => ({
      items,
      isLoading: feedQuery.isLoading,
      isFetching: feedQuery.isFetching,
      error: feedQuery.error,
      hasMore,
      fetchNextPage,
      refetch: feedQuery.refetch,
      query: effectiveQuery,
    }),
    [
      effectiveQuery,
      feedQuery.error,
      feedQuery.isFetching,
      feedQuery.isLoading,
      feedQuery.refetch,
      fetchNextPage,
      hasMore,
      items,
    ],
  );

  return <DiscoveryFeedContext.Provider value={value}>{children}</DiscoveryFeedContext.Provider>;
}

export function useDiscoveryFeed(): DiscoveryFeedContextValue {
  const context = useContext(DiscoveryFeedContext);

  if (!context) {
    throw new Error('useDiscoveryFeed must be used within a DiscoveryFeedProvider');
  }

  return context;
}

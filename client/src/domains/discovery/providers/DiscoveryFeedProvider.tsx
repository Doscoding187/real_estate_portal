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
import type { FeedType } from '../../../../../shared/types';
import type {
  DiscoveryFeedItem,
  DiscoveryFeedMode,
  DiscoveryQuery,
} from '../../../../../shared/discovery/contracts';
import { trpc } from '@/lib/trpc';
import { useDiscoveryStore } from '../store/useDiscoveryStore';

type LegacyFeedQuery = {
  feedType: FeedType;
  limit: number;
  offset: number;
  location?: string;
  category?: string;
};

export interface DiscoveryFeedContextValue {
  items: DiscoveryFeedItem[];
  rawItems: unknown[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  hasMore: boolean;
  fetchNextPage: () => void;
  refetch: () => Promise<unknown>;
  query: DiscoveryQuery;
  request: LegacyFeedQuery;
}

interface DiscoveryFeedProviderProps {
  children: ReactNode;
  mode?: DiscoveryFeedMode;
  query?: Partial<DiscoveryQuery>;
  enabled?: boolean;
  legacyFeedType?: FeedType;
  legacyLocationLabel?: string;
}

const DiscoveryFeedContext = createContext<DiscoveryFeedContextValue | null>(null);

const DEFAULT_REQUEST_LIMIT = 20;

// Temporary adapter for PR3: the provider already speaks DiscoveryQuery,
// but this worktree still fetches through the legacy explore router.
function resolveLegacyRequest(
  query: DiscoveryQuery,
  options: Pick<DiscoveryFeedProviderProps, 'legacyFeedType' | 'legacyLocationLabel'>,
): LegacyFeedQuery {
  const feedType = options.legacyFeedType ?? inferLegacyFeedType(query, options.legacyLocationLabel);

  return {
    feedType,
    limit: query.limit ?? DEFAULT_REQUEST_LIMIT,
    offset: parseOffsetCursor(query.cursor),
    location: feedType === 'area' ? options.legacyLocationLabel : undefined,
    category: feedType === 'category' ? query.category : undefined,
  };
}

function inferLegacyFeedType(
  query: DiscoveryQuery,
  legacyLocationLabel?: string,
): FeedType {
  if (query.category) {
    return 'category';
  }

  if (query.location && legacyLocationLabel) {
    return 'area';
  }

  return 'recommended';
}

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
  if (Array.isArray(data.shorts)) return data.shorts as any[];

  return [];
}

function inferItemType(item: any): DiscoveryFeedItem['type'] {
  if (item?.contentType === 'short' || item?.contentType === 'walkthrough' || item?.contentType === 'showcase') {
    return 'video';
  }
  if (item?.development || item?.developmentId) return 'development';
  if (item?.locationInsight || item?.locationType === 'suburb') return 'location';
  if (item?.category === 'finance' || item?.category === 'investment') return 'insight';
  if (item?.service || item?.category === 'services') return 'service';
  return 'property';
}

function mapLegacyItem(item: any): DiscoveryFeedItem {
  const suburb = item?.location?.suburb;
  const city = item?.location?.city;
  const province = item?.location?.province;
  const locationName = [suburb, city].filter(Boolean).join(', ') || city || province || item?.location;
  const coverUrl =
    item?.thumbnailUrl ||
    item?.primaryMediaUrl ||
    item?.media?.[0]?.thumbnailUrl ||
    item?.media?.[0]?.url ||
    '';
  const videoUrl = item?.videoUrl || item?.media?.find?.((media: any) => media?.type === 'video')?.url;

  return {
    id: String(item?.id ?? ''),
    type: inferItemType(item),
    title: item?.title,
    description: item?.description ?? item?.caption,
    media: {
      coverUrl,
      videoUrl: typeof videoUrl === 'string' ? videoUrl : undefined,
    },
    location: locationName
      ? {
          name: locationName,
          province: province || undefined,
        }
      : undefined,
    price:
      item?.property?.price ??
      item?.price ??
      item?.priceMin ??
      item?.listing?.price,
    engagement: {
      likes: Number(item?.likeCount ?? item?.stats?.likes ?? 0),
      saves: Number(item?.saveCount ?? item?.stats?.saves ?? 0),
      views: Number(item?.viewCount ?? item?.stats?.views ?? 0),
    },
    metadata: item,
  };
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
  legacyFeedType,
  legacyLocationLabel,
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

  const request = useMemo(
    () => resolveLegacyRequest(effectiveQuery, { legacyFeedType, legacyLocationLabel }),
    [effectiveQuery, legacyFeedType, legacyLocationLabel],
  );

  const queryFingerprint = useMemo(() => buildQueryFingerprint(effectiveQuery), [effectiveQuery]);
  const previousFingerprintRef = useRef(queryFingerprint);
  const [items, setItems] = useState<DiscoveryFeedItem[]>([]);
  const [rawItems, setRawItems] = useState<unknown[]>([]);

  useEffect(() => {
    if (previousFingerprintRef.current !== queryFingerprint) {
      previousFingerprintRef.current = queryFingerprint;
      setItems([]);
      setRawItems([]);
    }
  }, [queryFingerprint]);

  const feedQuery = trpc.discovery.getFeed.useQuery(effectiveQuery, {
    enabled,
    placeholderData: previousData => previousData,
  });

  const incomingRawItems = useMemo(() => getFeedItems(feedQuery.data), [feedQuery.data]);
  const incomingItems = useMemo(
    () => incomingRawItems.map(mapLegacyItem).filter(item => item.id.length > 0),
    [incomingRawItems],
  );

  useEffect(() => {
    if (!feedQuery.data) return;

    if (request.offset === 0) {
      setItems(incomingItems);
      setRawItems(incomingRawItems);
      return;
    }

    setItems(previous => mergeFeedItems(previous, incomingItems));
    setRawItems(previous => {
      const merged = [...previous];
      for (const item of incomingRawItems) {
        const id = String((item as any)?.id ?? '');
        if (!id || merged.some(existing => String((existing as any)?.id ?? '') === id)) {
          continue;
        }
        merged.push(item);
      }
      return merged;
    });
  }, [feedQuery.data, incomingItems, incomingRawItems, request.offset]);

  const hasMore =
    typeof (feedQuery.data as any)?.hasMore === 'boolean'
      ? Boolean((feedQuery.data as any)?.hasMore)
      : incomingItems.length >= request.limit;
  const nextCursor = String((feedQuery.data as any)?.offset ?? items.length);

  const fetchNextPage = useCallback(() => {
    if (!hasMore || feedQuery.isFetching) return;
    setCursor(nextCursor);
  }, [feedQuery.isFetching, hasMore, nextCursor, setCursor]);

  const value = useMemo<DiscoveryFeedContextValue>(
    () => ({
      items,
      rawItems,
      isLoading: feedQuery.isLoading,
      isFetching: feedQuery.isFetching,
      error: feedQuery.error,
      hasMore,
      fetchNextPage,
      refetch: feedQuery.refetch,
      query: effectiveQuery,
      request,
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
      rawItems,
      request,
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoCard } from './VideoCard';
import type { FeedItem, VideoFeedEventHandlers } from './types';

interface VideoFeedBaseProps {
  items: FeedItem[];
  onActiveIndexChange?: (index: number) => void;
  initialIndex?: number;
}

type VideoFeedProps =
  | (VideoFeedBaseProps & {
      handlers: VideoFeedEventHandlers;
    } & Partial<VideoFeedEventHandlers>)
  | (VideoFeedBaseProps & VideoFeedEventHandlers & { handlers?: never });

const PROGRESS_MARKS = [25, 50, 75];

function resolveHandlers(props: VideoFeedProps): VideoFeedEventHandlers {
  if ('handlers' in props && props.handlers) {
    return props.handlers;
  }

  return {
    onImpression: props.onImpression,
    onViewStart: props.onViewStart,
    onViewProgress: props.onViewProgress,
    onViewComplete: props.onViewComplete,
    onLike: props.onLike,
    onSave: props.onSave,
    onShare: props.onShare,
    onNotInterested: props.onNotInterested,
    onCtaClick: props.onCtaClick,
    onModuleImpression: props.onModuleImpression,
    onModuleListingClick: props.onModuleListingClick,
  };
}

export function VideoFeed(props: VideoFeedProps) {
  const items = props.items;
  const handlers = resolveHandlers(props);
  const { onActiveIndexChange } = props;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const impressedIds = useRef(new Set<string>());
  const viewStartedIds = useRef(new Set<string>());
  const viewCompletedIds = useRef(new Set<string>());
  const progressByItem = useRef<Record<string, Set<number>>>({});

  const [activeIndex, setActiveIndex] = useState(() => {
    const requested = props.initialIndex ?? 0;
    return Math.max(0, Math.min(items.length - 1, requested));
  });
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const activeItem = items[activeIndex];

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container || items.length === 0) return;
      const safeIndex = Math.max(0, Math.min(items.length - 1, index));
      container.scrollTo({
        top: safeIndex * container.clientHeight,
        behavior: 'smooth',
      });
    },
    [items.length],
  );

  useEffect(() => {
    const requested = props.initialIndex ?? 0;
    if (!Number.isFinite(requested)) return;
    const clamped = Math.max(0, Math.min(items.length - 1, requested));
    setActiveIndex(clamped);
    scrollToIndex(clamped);
  }, [items.length, props.initialIndex, scrollToIndex]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-feed-item="true"]'));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const nextEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!nextEntry || nextEntry.intersectionRatio < 0.65) return;

        const index = Number(nextEntry.target.getAttribute('data-index'));
        if (Number.isNaN(index) || index < 0 || index >= items.length) return;

        setActiveIndex(previous => {
          if (previous !== index) {
            onActiveIndexChange?.(index);
          }
          return index;
        });
        const item = items[index];
        if (!impressedIds.current.has(item.id)) {
          impressedIds.current.add(item.id);
          handlers.onImpression(item.id);
        }
      },
      {
        root: container,
        threshold: [0.5, 0.65, 0.8],
      },
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [handlers, items, onActiveIndexChange]);

  useEffect(() => {
    if (!activeItem) return;

    setExpandedItemId(null);

    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (!video) return;
      if (index === activeIndex) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });

    if (!viewStartedIds.current.has(activeItem.id)) {
      viewStartedIds.current.add(activeItem.id);
      handlers.onViewStart(activeItem.id);
    }
  }, [activeIndex, activeItem, handlers, items]);

  useEffect(() => {
    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (!video) return;
      video.preload = Math.abs(index - activeIndex) <= 1 ? 'auto' : 'metadata';
    });
  }, [activeIndex, items]);

  const handleVideoTimeUpdate = useCallback(
    (contentId: string, currentTimeSec: number, durationSec: number) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return;
      const progressPct = (currentTimeSec / durationSec) * 100;
      const marks = (progressByItem.current[contentId] ||= new Set<number>());

      PROGRESS_MARKS.forEach(mark => {
        if (progressPct >= mark && !marks.has(mark)) {
          marks.add(mark);
          handlers.onViewProgress(contentId, mark);
        }
      });

      if (progressPct >= 95 && !viewCompletedIds.current.has(contentId)) {
        viewCompletedIds.current.add(contentId);
        handlers.onViewComplete(contentId);
      }
    },
    [handlers],
  );

  const handleVideoEnded = useCallback(
    (contentId: string) => {
      if (viewCompletedIds.current.has(contentId)) return;
      viewCompletedIds.current.add(contentId);
      handlers.onViewComplete(contentId);
    },
    [handlers],
  );

  const handleLike = useCallback(
    (contentId: string) => {
      setLikedIds(previous => {
        const next = new Set(previous);
        if (next.has(contentId)) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });
      handlers.onLike(contentId);
    },
    [handlers],
  );

  const handleSave = useCallback(
    (contentId: string) => {
      setSavedIds(previous => {
        const next = new Set(previous);
        if (next.has(contentId)) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });
      handlers.onSave(contentId);
    },
    [handlers],
  );

  const handleShare = useCallback(
    async (contentId: string) => {
      handlers.onShare(contentId);
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
      const item = items.find(candidate => candidate.id === contentId);
      if (!item) return;
      try {
        await navigator.share({
          title: 'Explore',
          text: item.caption,
          url: window.location.href,
        });
      } catch {
        // Ignore cancelled share action.
      }
    },
    [handlers, items],
  );

  const handleNotInterested = useCallback(
    (contentId: string) => {
      handlers.onNotInterested(contentId);
      scrollToIndex(activeIndex + 1);
    },
    [activeIndex, handlers, scrollToIndex],
  );

  const assignVideoRef = useCallback((contentId: string, node: HTMLVideoElement | null) => {
    videoRefs.current[contentId] = node;
  }, []);

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={scrollRef} className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth">
        {items.map((item, index) => (
          <VideoCard
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            isActive={index === activeIndex}
            isContextOpen={expandedItemId === item.id}
            liked={likedIds.has(item.id)}
            saved={savedIds.has(item.id)}
            setVideoRef={assignVideoRef}
            onOpenContext={contentId => setExpandedItemId(contentId)}
            onCloseContext={() => setExpandedItemId(null)}
            onVideoTimeUpdate={handleVideoTimeUpdate}
            onVideoEnded={handleVideoEnded}
            onLike={handleLike}
            onSave={handleSave}
            onShare={contentId => {
              void handleShare(contentId);
            }}
            onNotInterested={handleNotInterested}
            onCtaClick={handlers.onCtaClick}
          />
        ))}
      </div>
    </div>
  );
}

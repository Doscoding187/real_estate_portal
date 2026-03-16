import type { FeedType } from '@/../../shared/types';
import { readStoredExploreIntent } from '@/lib/exploreIntent';
import { TrpcFeedProvider } from '@/features/explore/components/video-feed/TrpcFeedProvider';

interface ExploreVideoFeedProps {
  categoryId?: number;
}

const FEED_CATEGORIES = ['property', 'renovation', 'finance', 'investment', 'services'] as const;

export function ExploreVideoFeed({ categoryId }: ExploreVideoFeedProps) {
  const category = categoryId ? FEED_CATEGORIES[categoryId - 1] : undefined;
  const feedType: FeedType = category ? 'category' : 'recommended';
  const intent = readStoredExploreIntent();

  return (
    <div className="h-full w-full" role="region" aria-label="Explore video feed">
      <TrpcFeedProvider feedType={feedType} category={category} intent={intent} />
    </div>
  );
}

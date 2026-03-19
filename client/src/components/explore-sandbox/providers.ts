import { mockFeedItems } from './mockFeedItems';
import type { FeedItem } from './model';

export interface FeedProvider {
  getFeed: () => Promise<FeedItem[]>;
}

export const mockFeedProvider: FeedProvider = {
  async getFeed() {
    return mockFeedItems;
  },
};

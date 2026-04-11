export const DISCOVERY_FEED_MODES = ['home', 'feed', 'shorts'] as const;
export type DiscoveryFeedMode = (typeof DISCOVERY_FEED_MODES)[number];

export const DISCOVERY_INTENTS = ['buy', 'rent', 'invest', 'explore'] as const;
export type DiscoveryIntent = (typeof DISCOVERY_INTENTS)[number];

export const DISCOVERY_LOCATION_TYPES = ['province', 'city', 'suburb'] as const;
export type DiscoveryLocationType = (typeof DISCOVERY_LOCATION_TYPES)[number];

export const DISCOVERY_CATEGORIES = [
  'property',
  'development',
  'location',
  'insight',
  'service',
] as const;
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

export const DISCOVERY_CONTENT_TYPES = ['video', 'card', 'collection'] as const;
export type DiscoveryContentType = (typeof DISCOVERY_CONTENT_TYPES)[number];

export const DISCOVERY_ITEM_TYPES = [
  'property',
  'video',
  'development',
  'location',
  'insight',
  'service',
] as const;
export type DiscoveryItemType = (typeof DISCOVERY_ITEM_TYPES)[number];

export const DISCOVERY_ENGAGEMENT_ACTIONS = [
  'view',
  'viewProgress',
  'viewComplete',
  'like',
  'save',
  'share',
  'notInterested',
  'listingOpen',
] as const;
export type DiscoveryEngagementAction = (typeof DISCOVERY_ENGAGEMENT_ACTIONS)[number];

export interface DiscoveryLocationFilter {
  type: DiscoveryLocationType;
  id: number;
}

export interface DiscoveryPriceRange {
  min?: number;
  max?: number;
}

export interface DiscoveryQuery {
  mode: DiscoveryFeedMode;
  intent?: DiscoveryIntent;
  location?: DiscoveryLocationFilter;
  category?: DiscoveryCategory;
  priceRange?: DiscoveryPriceRange;
  creatorActorId?: number;
  contentType?: DiscoveryContentType;
  cursor?: string;
  limit?: number;
}

export interface DiscoveryMediaAsset {
  coverUrl: string;
  videoUrl?: string;
}

export interface DiscoveryLocationSummary {
  name: string;
  province?: string;
}

export interface DiscoveryItemEngagement {
  likes: number;
  saves: number;
  views: number;
}

export interface DiscoveryFeedItem {
  id: string;
  type: DiscoveryItemType;
  title?: string;
  description?: string;
  media: DiscoveryMediaAsset;
  location?: DiscoveryLocationSummary;
  price?: number;
  engagement: DiscoveryItemEngagement;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryFeedResponse {
  items: DiscoveryFeedItem[];
  hasMore: boolean;
  offset: number;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryEngagementContext {
  mode?: DiscoveryFeedMode;
  position?: number;
  query?: Partial<DiscoveryQuery>;
}

export interface DiscoveryEngagementEvent {
  itemId: string;
  action: DiscoveryEngagementAction;
  context?: DiscoveryEngagementContext;
}

export const DEFAULT_DISCOVERY_PAGE_SIZE = 20;

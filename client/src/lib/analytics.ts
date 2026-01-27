import { trpc } from './trpc';

type EventName =
  | 'location_view'
  | 'development_view'
  | 'listing_view'
  | 'hero_ad_click'
  | 'hero_ad_impression'
  | 'filter_change'
  | 'inquiry_submit'
  | 'hero_category_click'
  | 'hero_campaign_click';

interface EventProperties {
  locationId?: number;
  locationType?: 'province' | 'city' | 'suburb';
  developmentId?: number;
  listingId?: number;
  adId?: number;
  filters?: Record<string, any>;
  source?: string;
  [key: string]: any;
}

export const trackEvent = (eventName: EventName, properties: EventProperties) => {
  // Fire and forget - don't await response to avoid blocking UI
  try {
    // We will implement this mutation in the backend next
    // analytics.track.mutate({ event: eventName, ...properties });
    console.log(`[Analytics] ${eventName}`, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

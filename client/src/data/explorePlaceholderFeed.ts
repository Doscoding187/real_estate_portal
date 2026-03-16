import type { FeedItem } from '@/lib/exploreFeed';
import { PLACEHOLDER_PROPERTIES, PLACEHOLDER_VIDEOS } from './explorePlaceholderData';

const SAMPLE_VIDEO_URLS = [
  'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
];

const CATEGORY_ROTATION: FeedItem['category'][] = [
  'property',
  'services',
  'renovation',
  'finance',
  'investment',
];

function orientationForCategory(category: FeedItem['category']): FeedItem['orientation'] {
  if (category === 'property') return 'vertical';
  if (category === 'services' || category === 'renovation') return 'horizontal';
  return 'square';
}

function contentTypeForCategory(category: FeedItem['category']): FeedItem['contentType'] {
  if (category === 'property') return 'short';
  if (category === 'services' || category === 'renovation') return 'walkthrough';
  return 'showcase';
}

function actorTypeForCategory(
  category: FeedItem['category'],
): FeedItem['actor']['actorType'] {
  if (category === 'services' || category === 'renovation') return 'contractor';
  if (category === 'finance' || category === 'investment') return 'finance_partner';
  return 'agent';
}

function durationForType(contentType: FeedItem['contentType']): number {
  if (contentType === 'short') return 45;
  if (contentType === 'walkthrough') return 180;
  return 70;
}

function toFeedItemFromVideo(video: any, index: number): FeedItem {
  const category = CATEGORY_ROTATION[index % CATEGORY_ROTATION.length];
  const contentType = contentTypeForCategory(category);
  const orientation = orientationForCategory(category);
  const actorType = actorTypeForCategory(category);

  return {
    id: Number(video.id),
    contentType,
    category,
    title: String(video.title || 'Explore Video'),
    mediaUrl: SAMPLE_VIDEO_URLS[index % SAMPLE_VIDEO_URLS.length],
    thumbnailUrl: String(video.thumbnailUrl || ''),
    durationSec: Number(video.duration || durationForType(contentType)),
    orientation,
    actor: {
      id: 9000 + index,
      displayName: String(video.creatorName || 'Creator'),
      actorType,
      verificationStatus: index % 2 === 0 ? 'verified' : 'pending',
    },
    actorInsights: {
      trustScore: 58 + (index % 30),
      momentumScore: 42 + (index % 40),
      abuseScore: 70 - (index % 20),
      trustBand: index % 3 === 0 ? 'high' : 'standard',
      momentumLabel: index % 3 === 1 ? 'rising' : 'stable',
      lowReports: true,
    },
    stats: {
      views: Number(video.views || video.viewCount || 0),
      saves: Math.max(4, Math.round(Number(video.views || 0) * 0.03)),
      shares: Math.max(2, Math.round(Number(video.views || 0) * 0.015)),
    },
    location: {
      city: String(video.propertyLocation || '').split(',').pop()?.trim() || 'Johannesburg',
      suburb: String(video.propertyLocation || '').split(',')[0]?.trim() || 'Sandton',
      province: 'Gauteng',
    },
    linkedListingId: 8000 + index,
  };
}

function toFeedItemFromProperty(property: any, index: number): FeedItem {
  const category = CATEGORY_ROTATION[(index + 2) % CATEGORY_ROTATION.length];
  const contentType = contentTypeForCategory(category);
  const orientation = orientationForCategory(category);
  const actorType = actorTypeForCategory(category);

  return {
    id: Number(property.id) + 5000,
    contentType,
    category,
    title: String(property.title || 'Property Preview'),
    mediaUrl: SAMPLE_VIDEO_URLS[(index + 1) % SAMPLE_VIDEO_URLS.length],
    thumbnailUrl: String(property.thumbnailUrl || property.imageUrl || ''),
    durationSec: durationForType(contentType) + (index % 20),
    orientation,
    actor: {
      id: 9500 + index,
      displayName: `${property.city || 'Local'} ${actorType === 'agent' ? 'Agent' : 'Specialist'}`,
      actorType,
      verificationStatus: index % 3 === 0 ? 'verified' : 'unverified',
    },
    actorInsights: {
      trustScore: 50 + (index % 35),
      momentumScore: 35 + (index % 45),
      abuseScore: 60 - (index % 15),
      trustBand: index % 4 === 0 ? 'high' : 'standard',
      momentumLabel: index % 4 === 2 ? 'rising' : 'stable',
      lowReports: true,
    },
    stats: {
      views: Number(property.viewCount || 0),
      saves: Math.max(2, Math.round(Number(property.viewCount || 0) * 0.02)),
      shares: Math.max(1, Math.round(Number(property.viewCount || 0) * 0.01)),
    },
    location: {
      city: String(property.city || ''),
      suburb: String(property.location || '').split(',')[0]?.trim(),
      province: String(property.province || ''),
    },
    linkedListingId: Number(property.id),
  };
}

export function getExplorePlaceholderFeedItems(): FeedItem[] {
  const fromVideos = PLACEHOLDER_VIDEOS.map((video, index) => toFeedItemFromVideo(video, index));
  const fromProperties = PLACEHOLDER_PROPERTIES.map((property, index) =>
    toFeedItemFromProperty(property, index),
  );

  return [...fromVideos, ...fromProperties].sort((a, b) => b.stats.views - a.stats.views);
}


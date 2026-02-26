import type { FeedItem } from '@/lib/exploreFeed';

const MOCK_FEED: FeedItem[] = [
  {
    id: 1001,
    title: 'Modern townhouse tour in Sandton',
    category: 'property',
    contentType: 'short',
    mediaUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=1200&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=700&fit=crop',
    durationSec: 42,
    orientation: 'vertical',
    actor: {
      id: 501,
      displayName: 'Prime Homes',
      actorType: 'agent',
      verificationStatus: 'verified',
    },
    actorInsights: { trustBand: 'high' },
    stats: { views: 12400, saves: 540, shares: 120 },
    location: { city: 'Johannesburg', suburb: 'Sandton', province: 'Gauteng' },
    linkedListingId: 101,
  },
  {
    id: 1002,
    title: 'Kitchen remodel before and after',
    category: 'renovation',
    contentType: 'showcase',
    mediaUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&h=800&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop',
    durationSec: 56,
    orientation: 'horizontal',
    actor: {
      id: 0,
      displayName: 'Build Better SA',
      actorType: 'contractor',
      verificationStatus: 'verified',
    },
    actorInsights: { trustBand: 'standard' },
    stats: { views: 8900, saves: 330, shares: 82 },
    location: { city: 'Cape Town', suburb: 'Claremont', province: 'Western Cape' },
  },
  {
    id: 1003,
    title: 'Bond basics in 60 seconds',
    category: 'finance',
    contentType: 'short',
    mediaUrl:
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=1200&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=700&fit=crop',
    durationSec: 60,
    orientation: 'vertical',
    actor: {
      id: 0,
      displayName: 'Finance with Tumi',
      actorType: 'finance_partner',
      verificationStatus: 'verified',
    },
    actorInsights: { trustBand: 'standard' },
    stats: { views: 15600, saves: 640, shares: 201 },
    location: { city: 'Pretoria', suburb: 'Menlyn', province: 'Gauteng' },
  },
  {
    id: 1004,
    title: 'Top rental yield pockets this quarter',
    category: 'investment',
    contentType: 'short',
    mediaUrl:
      'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=800&h=1200&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=400&h=700&fit=crop',
    durationSec: 38,
    orientation: 'vertical',
    actor: {
      id: 0,
      displayName: 'Investor Pulse',
      actorType: 'user',
      verificationStatus: 'unverified',
    },
    actorInsights: { trustBand: 'low' },
    stats: { views: 7200, saves: 190, shares: 40 },
    location: { city: 'Durban', suburb: 'Umhlanga', province: 'KwaZulu-Natal' },
  },
  {
    id: 1005,
    title: 'Top 5 home service providers this month',
    category: 'services',
    contentType: 'showcase',
    mediaUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=800&fit=crop',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop',
    durationSec: 33,
    orientation: 'horizontal',
    actor: {
      id: 0,
      displayName: 'Home Helper Hub',
      actorType: 'contractor',
      verificationStatus: 'pending',
    },
    actorInsights: { trustBand: 'standard' },
    stats: { views: 6400, saves: 160, shares: 25 },
    location: { city: 'Johannesburg', suburb: 'Rosebank', province: 'Gauteng' },
  },
];

export function getExploreMockFeedItems(): FeedItem[] {
  return MOCK_FEED.map(item => ({
    ...item,
    actor: { ...item.actor },
    actorInsights: item.actorInsights ? { ...item.actorInsights } : undefined,
    stats: { ...item.stats },
    location: item.location ? { ...item.location } : undefined,
    metadata: item.metadata ? { ...item.metadata } : undefined,
  }));
}

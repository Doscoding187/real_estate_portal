/**
 * VideoCard Component Examples
 * 
 * This file demonstrates various usage patterns for the refactored VideoCard component.
 */

import { VideoCard } from './VideoCard';
import { useState } from 'react';

// Example 1: Basic Usage
export function BasicVideoCardExample() {
  const handleClick = () => {
    console.log('Video clicked');
  };

  const handleSave = () => {
    console.log('Video saved');
  };

  return (
    <div className="max-w-sm">
      <VideoCard
        video={{
          id: 1,
          title: "Stunning 3BR Apartment with City Views",
          thumbnailUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
          duration: 125,
          views: 15420,
          creatorName: "John Smith",
          creatorAvatar: "https://i.pravatar.cc/150?img=1",
          isSaved: false,
        }}
        onClick={handleClick}
        onSave={handleSave}
      />
    </div>
  );
}

// Example 2: Grid Layout
export function VideoCardGridExample() {
  const videos = [
    {
      id: 1,
      title: "Modern Penthouse in Sandton",
      thumbnailUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
      duration: 95,
      views: 12500,
      creatorName: "Sarah Johnson",
      creatorAvatar: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: 2,
      title: "Luxury Villa with Pool",
      thumbnailUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
      duration: 180,
      views: 28900,
      creatorName: "Mike Davis",
      creatorAvatar: "https://i.pravatar.cc/150?img=12",
    },
    {
      id: 3,
      title: "Cozy Studio in Rosebank",
      thumbnailUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400",
      duration: 65,
      views: 8200,
      creatorName: "Emma Wilson",
      creatorAvatar: "https://i.pravatar.cc/150?img=9",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={() => console.log('Play video', video.id)}
          onSave={() => console.log('Save video', video.id)}
        />
      ))}
    </div>
  );
}

// Example 3: With State Management
export function VideoCardWithStateExample() {
  const [savedVideos, setSavedVideos] = useState<Set<number>>(new Set());

  const videos = [
    {
      id: 1,
      title: "Beachfront Property Tour",
      thumbnailUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400",
      duration: 145,
      views: 45200,
      creatorName: "Alex Turner",
      creatorAvatar: "https://i.pravatar.cc/150?img=3",
    },
    {
      id: 2,
      title: "Downtown Loft Walkthrough",
      thumbnailUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400",
      duration: 98,
      views: 19800,
      creatorName: "Lisa Chen",
      creatorAvatar: "https://i.pravatar.cc/150?img=7",
    },
  ];

  const toggleSave = (videoId: number) => {
    setSavedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Property Videos</h2>
        <span className="text-sm text-gray-600">
          {savedVideos.size} saved
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={{
              ...video,
              isSaved: savedVideos.has(video.id),
            }}
            onClick={() => console.log('Play video', video.id)}
            onSave={() => toggleSave(video.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Example 4: Horizontal Scroll
export function VideoCardHorizontalScrollExample() {
  const videos = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: `Property Tour ${i + 1}`,
    thumbnailUrl: `https://images.unsplash.com/photo-${1560448204 + i}?w=400`,
    duration: 60 + i * 20,
    views: 1000 + i * 500,
    creatorName: `Agent ${i + 1}`,
  }));

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Featured Videos</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {videos.map((video) => (
          <div key={video.id} className="flex-shrink-0 w-64 snap-start">
            <VideoCard
              video={video}
              onClick={() => console.log('Play video', video.id)}
              onSave={() => console.log('Save video', video.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Without Creator Avatar
export function VideoCardNoAvatarExample() {
  return (
    <div className="max-w-sm">
      <VideoCard
        video={{
          id: 1,
          title: "Garden Apartment with Patio",
          thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400",
          duration: 110,
          views: 7500,
          creatorName: "Property Agent",
          // No creatorAvatar - will show initial
        }}
        onClick={() => console.log('Video clicked')}
        onSave={() => console.log('Video saved')}
      />
    </div>
  );
}

// Example 6: High View Count
export function VideoCardHighViewsExample() {
  return (
    <div className="max-w-sm">
      <VideoCard
        video={{
          id: 1,
          title: "Viral Property Tour - Must See!",
          thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400",
          duration: 240,
          views: 1250000, // 1.25M views
          creatorName: "Top Agent",
          creatorAvatar: "https://i.pravatar.cc/150?img=15",
          isSaved: true,
        }}
        onClick={() => console.log('Video clicked')}
        onSave={() => console.log('Video saved')}
      />
    </div>
  );
}

// Example 7: Demo Page with All Examples
export function VideoCardDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">VideoCard Component Examples</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Basic Usage</h2>
          <BasicVideoCardExample />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Grid Layout</h2>
          <VideoCardGridExample />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">With State Management</h2>
          <VideoCardWithStateExample />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Horizontal Scroll</h2>
          <VideoCardHorizontalScrollExample />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Without Avatar</h2>
          <VideoCardNoAvatarExample />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">High View Count</h2>
          <VideoCardHighViewsExample />
        </section>
      </div>
    </div>
  );
}

// Export all examples
export default {
  BasicVideoCardExample,
  VideoCardGridExample,
  VideoCardWithStateExample,
  VideoCardHorizontalScrollExample,
  VideoCardNoAvatarExample,
  VideoCardHighViewsExample,
  VideoCardDemoPage,
};

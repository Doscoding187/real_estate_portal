# Explore Frontend Refinement - Design Document

## Overview

This design document outlines the technical approach for refining the Explore feature frontend to achieve world-class production quality. The refinement focuses on six key areas: unified visual design, enhanced video experience, map/feed synchronization, advanced filtering, accessibility, and performance optimization.

**Design Direction: Hybrid Modern + Soft UI**

We are adopting a **Hybrid Modern + Soft** aesthetic that combines:
- Clean, modern layouts inspired by Airbnb, Instagram Explore, and Google Discover
- Soft shadows and gentle gradients (not heavy neumorphism)
- High readability and crisp contrast
- Lightweight elevation with subtle depth
- Glass/blur overlays where appropriate
- Smooth micro-interactions and animations

**What We're Keeping:**
✓ Rounded edges and soft shadows (1-4px, subtle)
✓ Gentle gradients and smooth transitions
✓ Glass/blur overlays for video and map controls
✓ Modern typography and clean spacing
✓ Friendly, approachable card design

**What We're Avoiding:**
✗ Heavy inner shadows and deep neumorphism
✗ Excessive elevation layers
✗ Overly "puffy" surfaces
✗ Multiple shadow stacks per element
✗ Low-contrast pressed states

**Core Principles:**
- Preserve all existing backend contracts and API signatures
- Refactor and enhance rather than rewrite
- Maintain existing routing and hook integrations
- Deliver modular, well-documented changes
- Ensure WCAG AA accessibility compliance
- Optimize for 55+ FPS on mid-range devices
- Create a scalable, modern design system

## Architecture

### High-Level Component Structure

```
client/src/
├── components/
│   ├── ui/soft/                    # NEW: Soft UI component library
│   │   ├── SoftCard.tsx
│   │   ├── IconButton.tsx
│   │   ├── AvatarBubble.tsx
│   │   ├── MicroPill.tsx
│   │   └── SoftSkeleton.tsx
│   ├── explore-discovery/          # REFACTORED: Existing components
│   │   ├── DiscoveryCardFeed.tsx
│   │   ├── ExploreVideoFeed.tsx
│   │   ├── PersonalizedContentBlock.tsx
│   │   ├── MapHybridView.tsx
│   │   ├── LifestyleCategorySelector.tsx
│   │   ├── FilterPanel.tsx
│   │   └── cards/
│   │       ├── PropertyCard.tsx    # REFACTORED
│   │       ├── VideoCard.tsx       # REFACTORED
│   │       ├── NeighbourhoodCard.tsx # REFACTORED
│   │       └── InsightCard.tsx     # REFACTORED
│   └── explore/                    # REFACTORED: Video components
│       ├── VideoCard.tsx
│       ├── ShortsContainer.tsx
│       └── PropertyOverlay.tsx
├── hooks/
│   ├── useExploreCommonState.ts    # NEW: Shared state logic
│   ├── useVideoPlayback.ts         # NEW: Video control logic
│   ├── useMapFeedSync.ts           # NEW: Map/feed synchronization
│   └── [existing hooks]            # PRESERVED
├── lib/
│   ├── design-tokens.ts            # NEW: Design system tokens
│   └── animations/
│       └── exploreAnimations.ts    # NEW: Framer Motion variants
├── store/
│   └── exploreFiltersStore.ts      # NEW: Zustand filter store
└── pages/
    ├── ExploreHome.tsx             # REFACTORED
    ├── ExploreFeed.tsx             # REFACTORED
    ├── ExploreShorts.tsx           # REFACTORED
    └── ExploreMap.tsx              # REFACTORED
```



## Components and Interfaces

### 1. Design System Foundation

#### Design Tokens (`client/src/lib/design-tokens.ts`)

```typescript
export const designTokens = {
  colors: {
    // Modern, clean backgrounds
    bg: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#f1f3f5',
    },
    // Soft accent colors
    accent: {
      primary: '#6366f1',
      hover: '#4f46e5',
      light: '#818cf8',
      subtle: '#e0e7ff',
    },
    // Glass/overlay effects
    glass: {
      bg: 'rgba(255, 255, 255, 0.85)',
      bgDark: 'rgba(0, 0, 0, 0.4)',
      border: 'rgba(255, 255, 255, 0.3)',
      backdrop: 'blur(12px)',
    },
    // Text colors
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
      inverse: '#ffffff',
    },
  },
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  borderRadius: {
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    pill: '9999px',
  },
  shadows: {
    // Subtle, modern shadows (not neumorphic)
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '2xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    // Glass effect shadow
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    // Hover states
    hover: '0 6px 12px -2px rgba(0, 0, 0, 0.12)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
```

#### Tailwind Plugin (`tailwind.config.js` extension)

```javascript
// Add to tailwind.config.js plugins
plugin(function({ addUtilities }) {
  addUtilities({
    // Modern card with subtle shadow
    '.modern-card': {
      background: '#ffffff',
      borderRadius: '1rem',
      boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: '0 6px 12px -2px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-2px)',
      },
    },
    // Glass overlay for video/map controls
    '.glass-overlay': {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    },
    // Dark glass for video overlays
    '.glass-overlay-dark': {
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    // Modern button with soft shadow
    '.modern-btn': {
      background: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transform: 'scale(1.02)',
      },
      '&:active': {
        transform: 'scale(0.98)',
      },
    },
    // Accent button
    '.accent-btn': {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: '0 6px 12px -2px rgba(99, 102, 241, 0.4)',
        transform: 'translateY(-1px)',
      },
    },
  });
})
```



### 2. Soft UI Component Library

#### ModernCard Component

```typescript
// client/src/components/ui/soft/ModernCard.tsx
import { motion } from 'framer-motion';
import { designTokens } from '@/lib/design-tokens';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  variant?: 'default' | 'glass' | 'elevated';
}

export function ModernCard({ 
  children, 
  className = '', 
  onClick, 
  hoverable = true,
  variant = 'default'
}: ModernCardProps) {
  const variantClasses = {
    default: 'modern-card',
    glass: 'glass-overlay',
    elevated: 'modern-card shadow-xl',
  };

  return (
    <motion.div
      className={`${variantClasses[variant]} p-4 ${className}`}
      onClick={onClick}
      whileHover={hoverable ? { y: -2, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

#### IconButton Component

```typescript
// client/src/components/ui/soft/IconButton.tsx
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'accent';
}

export function IconButton({ 
  icon: Icon, 
  onClick, 
  label, 
  size = 'md',
  variant = 'default' 
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variantClasses = {
    default: 'modern-btn bg-white text-gray-700',
    glass: 'glass-overlay text-white',
    accent: 'accent-btn text-white',
  };

  return (
    <motion.button
      className={`${sizeClasses[size]} ${variantClasses[variant]} flex items-center justify-center`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}
```



### 3. Enhanced Video Experience

#### Video Playback Hook

```typescript
// client/src/hooks/useVideoPlayback.ts
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseVideoPlaybackOptions {
  preloadNext?: boolean;
  lowBandwidthMode?: boolean;
}

export function useVideoPlayback(
  videoUrl: string,
  options: UseVideoPlaybackOptions = {}
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Viewport detection with 50% threshold
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  });

  // Auto-play when in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inView) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error('Autoplay failed:', err);
            setError(err);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [inView]);

  // Preload next videos
  useEffect(() => {
    if (options.preloadNext && inView) {
      // Preload logic handled by parent component
    }
  }, [inView, options.preloadNext]);

  // Buffer detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  return {
    videoRef,
    inViewRef,
    isPlaying,
    isBuffering,
    error,
    inView,
  };
}
```

#### Enhanced Video Card

```typescript
// Refactored client/src/components/explore/VideoCard.tsx
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Play } from 'lucide-react';

export function VideoCard({ video, isActive, onView }: VideoCardProps) {
  const { videoRef, inViewRef, isPlaying, isBuffering, error, inView } = 
    useVideoPlayback(video.videoUrl, { preloadNext: true });

  useEffect(() => {
    if (inView && onView) {
      onView();
    }
  }, [inView, onView]);

  return (
    <div ref={inViewRef} className="relative w-full h-full">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted
      />

      {/* Buffering indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            onClick={() => window.location.reload()}
            className="soft-btn px-6 py-3 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            Retry
          </button>
        </div>
      )}

      {/* Property overlay */}
      <PropertyOverlay property={video} />
    </div>
  );
}
```



### 4. Map and Feed Synchronization

#### Map/Feed Sync Hook

```typescript
// client/src/hooks/useMapFeedSync.ts
import { useState, useCallback, useRef } from 'react';
import { useThrottle, useDebounce } from '@/hooks/useThrottle';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function useMapFeedSync() {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<any[]>([]);

  // Throttle map updates to 250ms
  const throttledMapBounds = useThrottle(mapBounds, 250);

  // Debounce feed updates to 300ms
  const debouncedFeedUpdate = useDebounce(throttledMapBounds, 300);

  // Handle map pan
  const handleMapPan = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // Handle feed item selection
  const handleFeedItemSelect = useCallback((propertyId: number) => {
    setSelectedPropertyId(propertyId);
    // Trigger map center animation
  }, []);

  // Handle map marker click
  const handleMarkerClick = useCallback((propertyId: number) => {
    setSelectedPropertyId(propertyId);
    // Scroll feed to item
  }, []);

  return {
    mapBounds: debouncedFeedUpdate,
    selectedPropertyId,
    feedItems,
    handleMapPan,
    handleFeedItemSelect,
    handleMarkerClick,
  };
}
```

#### Refactored MapHybridView

```typescript
// client/src/components/explore-discovery/MapHybridView.tsx
import { useMapFeedSync } from '@/hooks/useMapFeedSync';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, Marker, MarkerClusterer } from '@react-google-maps/api';

export function MapHybridView({ categoryId, filters, onPropertyClick }: MapHybridViewProps) {
  const {
    mapBounds,
    selectedPropertyId,
    handleMapPan,
    handleFeedItemSelect,
    handleMarkerClick,
  } = useMapFeedSync();

  // Fetch properties based on map bounds
  const { data: properties } = useDiscoveryFeed({
    categoryId,
    filters,
    bounds: mapBounds,
  });

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          onBoundsChanged={(map) => {
            const bounds = map.getBounds();
            if (bounds) {
              handleMapPan({
                north: bounds.getNorthEast().lat(),
                south: bounds.getSouthWest().lat(),
                east: bounds.getNorthEast().lng(),
                west: bounds.getSouthWest().lng(),
              });
            }
          }}
        >
          <MarkerClusterer>
            {(clusterer) =>
              properties?.map((property) => (
                <Marker
                  key={property.id}
                  position={{ lat: property.lat, lng: property.lng }}
                  clusterer={clusterer}
                  onClick={() => handleMarkerClick(property.id)}
                  animation={
                    selectedPropertyId === property.id
                      ? google.maps.Animation.BOUNCE
                      : undefined
                  }
                />
              ))
            }
          </MarkerClusterer>
        </GoogleMap>

        {/* Selected property sticky card */}
        <AnimatePresence>
          {selectedPropertyId && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            >
              <SoftCard className="w-80">
                <PropertyCard
                  property={properties?.find((p) => p.id === selectedPropertyId)}
                  compact
                />
              </SoftCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feed sidebar */}
      <div className="w-96 overflow-y-auto">
        {properties?.map((property) => (
          <motion.div
            key={property.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleFeedItemSelect(property.id)}
          >
            <PropertyCard property={property} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```



### 5. Advanced Filtering with Zustand

#### Filter Store

```typescript
// client/src/store/exploreFiltersStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  propertyType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  categoryId: number | null;
  location: string | null;
  
  // Actions
  setPropertyType: (type: string | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setBedrooms: (count: number | null) => void;
  setBathrooms: (count: number | null) => void;
  setCategoryId: (id: number | null) => void;
  setLocation: (location: string | null) => void;
  clearFilters: () => void;
  getFilterCount: () => number;
}

export const useExploreFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({
      propertyType: null,
      priceMin: null,
      priceMax: null,
      bedrooms: null,
      bathrooms: null,
      categoryId: null,
      location: null,

      setPropertyType: (type) => set({ propertyType: type }),
      setPriceRange: (min, max) => set({ priceMin: min, priceMax: max }),
      setBedrooms: (count) => set({ bedrooms: count }),
      setBathrooms: (count) => set({ bathrooms: count }),
      setCategoryId: (id) => set({ categoryId: id }),
      setLocation: (location) => set({ location }),
      
      clearFilters: () =>
        set({
          propertyType: null,
          priceMin: null,
          priceMax: null,
          bedrooms: null,
          bathrooms: null,
          categoryId: null,
          location: null,
        }),
      
      getFilterCount: () => {
        const state = get();
        return [
          state.propertyType,
          state.priceMin,
          state.priceMax,
          state.bedrooms,
          state.bathrooms,
          state.categoryId,
          state.location,
        ].filter(Boolean).length;
      },
    }),
    {
      name: 'explore-filters',
    }
  )
);
```

#### URL Sync Hook

```typescript
// client/src/hooks/useFilterUrlSync.ts
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

export function useFilterUrlSync() {
  const [location, setLocation] = useLocation();
  const filters = useExploreFiltersStore();

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.priceMin) params.set('minPrice', filters.priceMin.toString());
    if (filters.priceMax) params.set('maxPrice', filters.priceMax.toString());
    if (filters.bedrooms) params.set('beds', filters.bedrooms.toString());
    if (filters.bathrooms) params.set('baths', filters.bathrooms.toString());
    if (filters.categoryId) params.set('category', filters.categoryId.toString());
    if (filters.location) params.set('location', filters.location);

    const queryString = params.toString();
    const newUrl = queryString ? `${location.split('?')[0]}?${queryString}` : location.split('?')[0];
    
    if (newUrl !== location) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [filters, location]);

  // Sync URL to filters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const type = params.get('type');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const beds = params.get('beds');
    const baths = params.get('baths');
    const category = params.get('category');
    const loc = params.get('location');

    if (type) filters.setPropertyType(type);
    if (minPrice || maxPrice) {
      filters.setPriceRange(
        minPrice ? parseInt(minPrice) : null,
        maxPrice ? parseInt(maxPrice) : null
      );
    }
    if (beds) filters.setBedrooms(parseInt(beds));
    if (baths) filters.setBathrooms(parseInt(baths));
    if (category) filters.setCategoryId(parseInt(category));
    if (loc) filters.setLocation(loc);
  }, []);
}
```



### 6. Performance Optimization

#### Virtualized List Component

```typescript
// client/src/components/explore-discovery/VirtualizedFeed.tsx
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { PropertyCard } from './cards/PropertyCard';

interface VirtualizedFeedProps {
  items: any[];
  onItemClick: (item: any) => void;
}

export function VirtualizedFeed({ items, onItemClick }: VirtualizedFeedProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="px-4 py-2">
      <PropertyCard
        property={items[index]}
        onClick={() => onItemClick(items[index])}
      />
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={items.length}
          itemSize={280}
          width={width}
          overscanCount={3}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}
```

#### Image Preloading Hook

```typescript
// client/src/hooks/useImagePreload.ts
import { useEffect, useState } from 'react';

export function useImagePreload(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setLoadedImages((prev) => new Set(prev).add(url));
      };
    });
  }, [urls]);

  return loadedImages;
}
```

#### React Query Configuration

```typescript
// client/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Prefetch strategies
export function prefetchExploreData(queryClient: QueryClient, filters: any) {
  // Prefetch next page
  queryClient.prefetchQuery({
    queryKey: ['explore', 'feed', filters, { offset: filters.offset + 20 }],
    queryFn: () => fetchExploreFeed({ ...filters, offset: filters.offset + 20 }),
  });
}
```



## Data Models

### Filter State Model

```typescript
interface ExploreFilters {
  propertyType: 'residential' | 'development' | 'land' | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  categoryId: number | null;
  location: string | null;
  areaMin: number | null;
  areaMax: number | null;
}
```

### Video Playback State

```typescript
interface VideoPlaybackState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  error: Error | null;
  inView: boolean;
}
```

### Map Sync State

```typescript
interface MapSyncState {
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  selectedPropertyId: number | null;
  hoveredPropertyId: number | null;
  feedItems: DiscoveryItem[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Filter State Persistence
*For any* filter configuration, when a user applies filters and navigates between Explore pages, the filter state should remain consistent across all pages.
**Validates: Requirements 4.1, 4.2**

### Property 2: Video Autoplay Consistency
*For any* video in the feed, when the video enters the viewport with at least 50% visibility, playback should begin within 300ms on good network connections.
**Validates: Requirements 2.1, 2.2**

### Property 3: Map/Feed Synchronization
*For any* map pan or feed scroll action, the corresponding UI element (map pin or feed item) should update within 400ms with proper debouncing/throttling applied.
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 4: Accessibility Focus Management
*For any* interactive element, when navigating with keyboard, focus indicators should be visible and focus order should follow logical reading order.
**Validates: Requirements 5.1, 5.6**

### Property 5: Performance Frame Rate
*For any* scroll action on a list with 50+ items, the frame rate should maintain 55+ FPS on mid-range devices when virtualization is enabled.
**Validates: Requirements 6.1**

### Property 6: Error Recovery
*For any* failed API call, when the user clicks retry, the system should re-attempt the request and clear the error state upon success.
**Validates: Requirements 7.1**

### Property 7: URL Query Sync
*For any* filter change, the URL query parameters should update to reflect the current filter state within one render cycle.
**Validates: Requirements 4.2**

### Property 8: Design Token Consistency
*For any* Soft UI component, the component should use design tokens from the centralized design system rather than inline styles.
**Validates: Requirements 1.1, 1.2**



## Error Handling

### Network Error Handling

```typescript
// client/src/components/explore-discovery/ErrorBoundary.tsx
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function NetworkError({ error, onRetry }: NetworkErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
      <p className="text-gray-600 mb-6">
        {error.message || 'Unable to load content. Please check your connection.'}
      </p>
      <button
        onClick={onRetry}
        className="soft-btn px-6 py-3 flex items-center gap-2"
      >
        <RefreshCw className="w-5 h-5" />
        Retry
      </button>
    </motion.div>
  );
}
```

### Empty State Handling

```typescript
// client/src/components/explore-discovery/EmptyState.tsx
import { motion } from 'framer-motion';
import { Search, MapPin } from 'lucide-react';

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const content = {
    noResults: {
      icon: Search,
      title: 'No properties found',
      description: 'Try adjusting your filters or search in a different area',
      action: 'Clear Filters',
    },
    noLocation: {
      icon: MapPin,
      title: 'Enable location access',
      description: 'Get personalized recommendations based on your location',
      action: 'Enable Location',
    },
  };

  const config = content[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <Icon className="w-20 h-20 text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold mb-2">{config.title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{config.description}</p>
      <button onClick={onAction} className="soft-btn px-8 py-3">
        {config.action}
      </button>
    </motion.div>
  );
}
```

### Offline Detection

```typescript
// client/src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```



## Testing Strategy

### Unit Testing

#### Video Playback Logic Tests

```typescript
// client/src/hooks/__tests__/useVideoPlayback.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useVideoPlayback } from '../useVideoPlayback';

describe('useVideoPlayback', () => {
  it('should auto-play when video enters viewport', async () => {
    const { result } = renderHook(() => 
      useVideoPlayback('https://example.com/video.mp4')
    );

    // Simulate viewport entry
    act(() => {
      // Trigger IntersectionObserver callback
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it('should pause when video exits viewport', async () => {
    const { result } = renderHook(() => 
      useVideoPlayback('https://example.com/video.mp4')
    );

    act(() => {
      // Simulate viewport exit
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should handle playback errors gracefully', async () => {
    const { result } = renderHook(() => 
      useVideoPlayback('https://example.com/invalid.mp4')
    );

    await act(async () => {
      // Trigger error
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

#### Filter Store Tests

```typescript
// client/src/store/__tests__/exploreFiltersStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useExploreFiltersStore } from '../exploreFiltersStore';

describe('exploreFiltersStore', () => {
  it('should update filter state correctly', () => {
    const { result } = renderHook(() => useExploreFiltersStore());

    act(() => {
      result.current.setPropertyType('residential');
      result.current.setPriceRange(100000, 500000);
    });

    expect(result.current.propertyType).toBe('residential');
    expect(result.current.priceMin).toBe(100000);
    expect(result.current.priceMax).toBe(500000);
  });

  it('should calculate filter count correctly', () => {
    const { result } = renderHook(() => useExploreFiltersStore());

    act(() => {
      result.current.setPropertyType('residential');
      result.current.setBedrooms(3);
    });

    expect(result.current.getFilterCount()).toBe(2);
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useExploreFiltersStore());

    act(() => {
      result.current.setPropertyType('residential');
      result.current.setBedrooms(3);
      result.current.clearFilters();
    });

    expect(result.current.getFilterCount()).toBe(0);
  });
});
```

### Integration Testing

#### Map/Feed Sync Tests

```typescript
// client/src/components/explore-discovery/__tests__/MapHybridView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MapHybridView } from '../MapHybridView';

describe('MapHybridView', () => {
  it('should sync map pan to feed updates', async () => {
    const { container } = render(<MapHybridView />);

    // Simulate map pan
    fireEvent.pan(screen.getByTestId('map'), { deltaX: 100, deltaY: 100 });

    // Wait for debounced update
    await waitFor(() => {
      expect(screen.getByTestId('feed')).toHaveAttribute('data-updated', 'true');
    }, { timeout: 500 });
  });

  it('should highlight map pin when feed item is selected', () => {
    render(<MapHybridView />);

    const feedItem = screen.getByTestId('feed-item-1');
    fireEvent.click(feedItem);

    expect(screen.getByTestId('map-pin-1')).toHaveClass('highlighted');
  });
});
```

### Performance Testing

```typescript
// client/src/__tests__/performance.test.ts
import { measurePerformance } from '@/lib/testing/performance';

describe('Explore Performance', () => {
  it('should maintain 55+ FPS during scroll', async () => {
    const fps = await measurePerformance(() => {
      // Simulate scroll
      window.scrollBy(0, 1000);
    });

    expect(fps).toBeGreaterThanOrEqual(55);
  });

  it('should start video within 1 second', async () => {
    const startTime = performance.now();
    
    // Trigger video load
    await waitForVideoStart();
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
});
```

### Accessibility Testing

```typescript
// client/src/__tests__/accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Explore Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ExploreHome />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    render(<ExploreHome />);
    
    // Tab through interactive elements
    userEvent.tab();
    expect(screen.getByRole('button', { name: /filter/i })).toHaveFocus();
    
    userEvent.tab();
    expect(screen.getByRole('button', { name: /home/i })).toHaveFocus();
  });
});
```



## Implementation Phases

### Phase 1: Design System Foundation (Days 1-2)
- Create design tokens file
- Implement Tailwind plugin for Soft UI utilities
- Build core Soft UI components (SoftCard, IconButton, MicroPill, AvatarBubble)
- Create animation variants library
- Set up Storybook or demo pages

**Deliverables:**
- `client/src/lib/design-tokens.ts`
- `client/src/components/ui/soft/` directory with 5 components
- `client/src/lib/animations/exploreAnimations.ts`
- Updated `tailwind.config.js`

### Phase 2: Video Experience Enhancement (Days 3-4)
- Implement `useVideoPlayback` hook with IntersectionObserver
- Add video preloading logic
- Refactor VideoCard component
- Add buffering and error states
- Implement low-bandwidth detection
- Add accessibility controls

**Deliverables:**
- `client/src/hooks/useVideoPlayback.ts`
- Refactored `client/src/components/explore/VideoCard.tsx`
- Unit tests for video playback logic

### Phase 3: Map/Feed Synchronization (Days 5-6)
- Implement `useMapFeedSync` hook
- Add throttling and debouncing utilities
- Refactor MapHybridView component
- Implement animated map markers
- Add sticky property card
- Optimize React Query caching

**Deliverables:**
- `client/src/hooks/useMapFeedSync.ts`
- `client/src/hooks/useThrottle.ts`
- Refactored `client/src/components/explore-discovery/MapHybridView.tsx`
- Integration tests for map/feed sync

### Phase 4: Filter State Management (Days 7-8)
- Create Zustand filter store
- Implement URL sync hook
- Refactor FilterPanel component
- Add mobile bottom sheet
- Implement keyboard navigation
- Add accessibility features

**Deliverables:**
- `client/src/store/exploreFiltersStore.ts`
- `client/src/hooks/useFilterUrlSync.ts`
- Refactored `client/src/components/explore-discovery/FilterPanel.tsx`
- Unit tests for filter store

### Phase 5: Performance Optimization (Days 9-10)
- Implement virtualized lists
- Add image preloading
- Optimize React Query configuration
- Add performance monitoring
- Implement lazy loading
- Add bundle size optimization

**Deliverables:**
- `client/src/components/explore-discovery/VirtualizedFeed.tsx`
- `client/src/hooks/useImagePreload.ts`
- Updated `client/src/lib/queryClient.ts`
- Performance benchmark results

### Phase 6: Card Refactoring (Days 11-12)
- Refactor PropertyCard with Soft UI
- Refactor VideoCard with animations
- Refactor NeighbourhoodCard
- Refactor InsightCard
- Add consistent skeleton states
- Implement micro-interactions

**Deliverables:**
- Refactored card components in `client/src/components/explore-discovery/cards/`
- Consistent skeleton components
- Hover and press state animations

### Phase 7: Page Integration (Days 13-14)
- Refactor ExploreHome page
- Refactor ExploreFeed page
- Refactor ExploreShorts page
- Refactor ExploreMap page
- Extract common logic to `useExploreCommonState`
- Ensure consistent UX patterns

**Deliverables:**
- Refactored all 4 Explore pages
- `client/src/hooks/useExploreCommonState.ts`
- Unified navigation and header components

### Phase 8: Error Handling & Accessibility (Days 15-16)
- Implement error boundaries
- Add empty states
- Implement offline detection
- Add retry mechanisms
- Ensure WCAG AA compliance
- Add keyboard navigation
- Implement focus management

**Deliverables:**
- Error handling components
- Empty state components
- Accessibility improvements across all pages
- Lighthouse accessibility score ≥ 90

### Phase 9: Testing & QA (Days 17-18)
- Write unit tests for critical logic
- Write integration tests for map/feed sync
- Perform cross-browser testing
- Perform cross-device testing
- Run performance benchmarks
- Run accessibility audits
- Create QA checklist

**Deliverables:**
- Comprehensive test suite
- QA checklist with results
- Performance benchmark report
- Accessibility audit report

### Phase 10: Documentation & PR (Days 19-20)
- Write EXPLORE_FRONTEND_REFACTOR.md
- Create before/after screenshots
- Record demo videos
- Write PR description
- Document environment flags
- Create verification steps
- Prepare for code review

**Deliverables:**
- `EXPLORE_FRONTEND_REFACTOR.md`
- PR with clear commit history
- Demo videos/GIFs
- Complete documentation

## Success Metrics

### Performance Metrics
- Scroll FPS: ≥ 55 on mid-range devices
- Video start time: ≤ 1s on good network
- Time to Interactive (TTI): ≤ 3s
- First Contentful Paint (FCP): ≤ 1.5s
- React Query cache hit rate: ≥ 70%

### Accessibility Metrics
- Lighthouse accessibility score: ≥ 90
- Keyboard navigation: 100% coverage
- Screen reader compatibility: Full support
- Color contrast: WCAG AA compliant
- Focus indicators: Visible on all interactive elements

### User Experience Metrics
- Map/feed sync latency: ≤ 400ms
- Filter apply latency: ≤ 300ms
- Animation smoothness: 60 FPS
- Error recovery success rate: ≥ 95%
- Empty state clarity: User testing validation

### Code Quality Metrics
- Test coverage: ≥ 80% for new code
- Component reusability: ≥ 70% shared components
- Bundle size increase: ≤ 10%
- TypeScript strict mode: 100% compliance
- ESLint warnings: 0

## Risk Mitigation

### Technical Risks
1. **Performance degradation**: Mitigate with virtualization and lazy loading
2. **Browser compatibility**: Test on Chrome, Firefox, Safari, Edge
3. **Mobile performance**: Test on mid-range Android devices
4. **Animation jank**: Use CSS transforms and will-change property
5. **Bundle size increase**: Code splitting and tree shaking

### Integration Risks
1. **Backend API changes**: Maintain adapter layer for flexibility
2. **React Query cache invalidation**: Implement proper cache keys
3. **State management conflicts**: Use Zustand for isolated filter state
4. **Hook dependency issues**: Careful dependency array management
5. **Third-party library updates**: Pin versions and test thoroughly

### User Experience Risks
1. **Accessibility regressions**: Automated and manual testing
2. **Reduced motion preferences**: Respect prefers-reduced-motion
3. **Low bandwidth scenarios**: Implement graceful degradation
4. **Offline functionality**: Cache critical data with React Query
5. **Error message clarity**: User testing and feedback

## Conclusion

This design provides a comprehensive approach to refining the Explore feature frontend while maintaining all existing backend contracts. The modular structure allows for incremental implementation and testing, ensuring high quality and minimal risk of regressions.

The design prioritizes:
- **User Experience**: Smooth animations, responsive interactions, clear feedback
- **Performance**: Virtualization, lazy loading, optimized caching
- **Accessibility**: WCAG AA compliance, keyboard navigation, screen reader support
- **Maintainability**: Reusable components, centralized state, clear documentation
- **Quality**: Comprehensive testing, performance monitoring, error handling

By following this design, the Explore feature will achieve world-class production quality while remaining stable, performant, and accessible to all users.

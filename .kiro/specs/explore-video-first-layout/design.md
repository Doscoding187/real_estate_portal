# Design Document

## Overview

This design implements a video-first layout for the Explore Home page by adding a dedicated Trending Videos section immediately after the header. The implementation leverages existing components (VideoCard) and hooks (useDiscoveryFeed) while introducing a new TrendingVideosSection component.

## Architecture

### Component Structure

```
ExploreHome.tsx
├── Header (sticky)
│   ├── Title + View Mode Toggle
│   └── LifestyleCategorySelector
├── TrendingVideosSection (NEW) ← First content after header
│   ├── Section Header ("Trending Now" + "See All")
│   └── Horizontal Scrollable Video Row
│       └── TrendingVideoCard (compact VideoCard variant)
├── PersonalizedContentBlock (existing)
└── DiscoveryCardFeed (existing, in cards view)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ExploreHome.tsx                          │
├─────────────────────────────────────────────────────────────┤
│  useTrendingVideos(categoryId)                              │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TrendingVideosSection                                │   │
│  │   - videos: TrendingVideo[]                          │   │
│  │   - isLoading: boolean                               │   │
│  │   - onVideoClick: (video) => void                    │   │
│  │   - onSeeAll: () => void                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  usePersonalizedContent(categoryId, location)               │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PersonalizedContentBlock (existing)                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### TrendingVideosSection

New component for displaying trending videos in a horizontal scrollable row.

```typescript
interface TrendingVideosSectionProps {
  categoryId?: number;
  onVideoClick: (video: TrendingVideo) => void;
  onSeeAll: () => void;
}

interface TrendingVideo {
  id: number;
  title: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  creatorName: string;
  creatorAvatar?: string;
}
```

**Design Specifications:**
- Section padding: 24px horizontal, 16px vertical
- Video card width: 160px (mobile), 180px (tablet), 200px (desktop)
- Video card aspect ratio: 9:16
- Gap between cards: 12px
- Horizontal scroll with snap points
- Hide scrollbar on mobile, show thin scrollbar on desktop

### TrendingVideoCard

Compact variant of VideoCard optimized for horizontal scrolling.

**Design Specifications:**
- Rounded corners: 12px
- Shadow: subtle elevation (shadow-sm)
- Overlay: gradient from bottom for text readability
- Duration badge: bottom-right, glass effect
- View count: bottom-left, glass effect
- Play icon: centered, 40px diameter
- Hover: scale(1.02), shadow increase

### useTrendingVideos Hook

New hook to fetch trending videos with category filtering.

```typescript
interface UseTrendingVideosOptions {
  categoryId?: number;
  limit?: number; // default: 12
}

interface UseTrendingVideosReturn {
  videos: TrendingVideo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**API Integration:**
- Uses existing `trpc.explore.getFeed` with `feedType: 'trending'`
- Filters by categoryId when provided
- Sorts by engagement score (views + saves + watch time)
- Limits to videos from last 7 days

## File Changes

### New Files

1. `client/src/components/explore-discovery/TrendingVideosSection.tsx`
   - Main section component with header and scrollable row

2. `client/src/components/explore-discovery/TrendingVideoCard.tsx`
   - Compact video card for horizontal display

3. `client/src/hooks/useTrendingVideos.ts`
   - Hook for fetching trending videos with category filter

### Modified Files

1. `client/src/pages/ExploreHome.tsx`
   - Import TrendingVideosSection
   - Add useTrendingVideos hook call
   - Insert TrendingVideosSection after header, before PersonalizedContentBlock
   - Handle video click to switch to videos view
   - Handle "See All" to switch to videos view

## Styling

### Design Tokens Usage

```typescript
// Section styling
backgroundColor: designTokens.colors.bg.secondary
borderRadius: designTokens.borderRadius.xl

// Card styling
backgroundColor: designTokens.colors.bg.primary
boxShadow: designTokens.shadows.sm
hoverShadow: designTokens.shadows.md

// Text styling
titleColor: designTokens.colors.text.primary
subtitleColor: designTokens.colors.text.secondary
```

### Animation Variants

```typescript
// Section entrance
sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

// Card stagger
cardStaggerVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 }
}

// Hover effect
cardHoverVariants = {
  hover: { scale: 1.02, boxShadow: designTokens.shadows.md }
}
```

## Accessibility

- Section has `role="region"` with `aria-label="Trending videos"`
- Horizontal scroll container has `role="list"`
- Each video card has `role="listitem"`
- Video cards are keyboard navigable with arrow keys
- "See All" link has descriptive aria-label
- Loading state announces via aria-live region

## Performance

- Videos lazy-load thumbnails as they enter viewport
- Horizontal scroll uses CSS scroll-snap for smooth snapping
- Skeleton loaders match exact card dimensions to prevent layout shift
- Video data prefetched on hover for faster navigation

## Error Handling

- Network error: Show retry button with error message
- No videos: Hide section gracefully (no empty state shown)
- Partial load: Show available videos, log error for missing items


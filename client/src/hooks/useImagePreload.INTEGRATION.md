# Image Preloading Integration Guide

## Quick Start: Integrating with VirtualizedFeed

### Step 1: Import the Hook

```typescript
import { useFeedImagePreload } from '@/hooks/useImagePreload';
```

### Step 2: Add to Your Feed Component

```typescript
function ExploreFeedPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();

  // Preload images for next 5 items
  useFeedImagePreload(items, currentIndex, {
    preloadCount: 5,
    priority: 'low',
    preloadOnSlowConnection: false,
  });

  return (
    <VirtualizedFeed
      items={items}
      onItemClick={handleItemClick}
      onScroll={(index) => setCurrentIndex(index)}
    />
  );
}
```

### Step 3: Update VirtualizedFeed to Track Scroll Position

```typescript
// In VirtualizedFeed.tsx
export function VirtualizedFeed({
  items,
  onItemClick,
  onScroll, // Add this prop
  ...props
}: VirtualizedFeedProps & {
  onScroll?: (index: number) => void;
}) {
  const handleScroll = (event: any) => {
    const scrollTop = event.scrollTop;
    const currentIndex = Math.floor(scrollTop / itemHeight);
    onScroll?.(currentIndex);
  };

  return (
    <List
      onScroll={handleScroll}
      // ... other props
    />
  );
}
```

## Integration with Explore Pages

### ExploreHome.tsx

```typescript
import { useFeedImagePreload } from '@/hooks/useImagePreload';

export function ExploreHome() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();

  // Preload images
  useFeedImagePreload(items, currentIndex, {
    preloadCount: 5,
    priority: 'low',
  });

  return (
    <div className="explore-home">
      <DiscoveryCardFeed
        items={items}
        onScroll={(index) => setCurrentIndex(index)}
      />
    </div>
  );
}
```

### ExploreFeed.tsx

```typescript
import { useFeedImagePreload } from '@/hooks/useImagePreload';

export function ExploreFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();

  // Preload with higher count for desktop
  useFeedImagePreload(items, currentIndex, {
    preloadCount: 7,
    priority: 'low',
  });

  return (
    <VirtualizedFeed
      items={items}
      onScroll={(index) => setCurrentIndex(index)}
    />
  );
}
```

### ExploreShorts.tsx

```typescript
import { useFeedImagePreload } from '@/hooks/useImagePreload';

export function ExploreShorts() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: videos } = useExploreVideoFeed();

  // Preload video thumbnails
  useFeedImagePreload(videos, currentIndex, {
    preloadCount: 3, // Fewer for videos
    priority: 'high', // Higher priority for visible content
  });

  return (
    <ShortsContainer
      videos={videos}
      currentIndex={currentIndex}
      onIndexChange={setCurrentIndex}
    />
  );
}
```

### ExploreMap.tsx

```typescript
import { useImagePreload } from '@/hooks/useImagePreload';

export function ExploreMap() {
  const { data: properties } = useMapProperties();
  
  // Preload all visible property images
  const imageUrls = properties?.map(p => p.thumbnailUrl) || [];
  useImagePreload(imageUrls, {
    preloadCount: 10, // More for map view
    priority: 'low',
  });

  return (
    <MapHybridView properties={properties} />
  );
}
```

## Integration with PropertyCard

### Option 1: Use with ProgressiveImage

```typescript
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { useImagePreload } from '@/hooks/useImagePreload';

function PropertyCard({ property, isPreloaded }) {
  return (
    <div className="property-card">
      <ProgressiveImage
        src={property.imageUrl}
        alt={property.title}
        priority={isPreloaded} // Use preload status
        className="w-full h-48"
      />
      {/* ... rest of card */}
    </div>
  );
}
```

### Option 2: Direct Integration

```typescript
function PropertyCard({ property }) {
  const { isImageLoaded } = useImagePreload([property.imageUrl]);

  return (
    <div className="property-card">
      <img
        src={property.imageUrl}
        alt={property.title}
        className={`w-full h-48 transition-opacity ${
          isImageLoaded(property.imageUrl) ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* ... rest of card */}
    </div>
  );
}
```

## Progressive Loading for Large Images

### For Property Detail Pages

```typescript
import { useProgressiveImagePreload } from '@/hooks/useImagePreload';

function PropertyDetailPage({ property }) {
  const { lowQualityLoaded, highQualityLoaded } = useProgressiveImagePreload(
    property.heroImageUrl,
    { priority: 'high' }
  );

  return (
    <div className="relative w-full h-96">
      {/* Low quality placeholder */}
      {lowQualityLoaded && !highQualityLoaded && (
        <img
          src={getLowQualityUrl(property.heroImageUrl)}
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
        />
      )}
      
      {/* High quality image */}
      {highQualityLoaded && (
        <img
          src={property.heroImageUrl}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {/* Loading indicator */}
      {!highQualityLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
}
```

## Mobile vs Desktop Configuration

### Responsive Preload Count

```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ExploreFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Adjust preload count based on device
  useFeedImagePreload(items, currentIndex, {
    preloadCount: isMobile ? 3 : 7,
    priority: 'low',
    preloadOnSlowConnection: !isMobile, // Only preload on desktop for slow connections
  });

  return <VirtualizedFeed items={items} />;
}
```

## Network-Aware Configuration

### Detect and Adapt

```typescript
function ExploreFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();
  
  // Check connection
  const connection = (navigator as any).connection;
  const isSlowConnection = connection?.effectiveType === '2g' || 
                          connection?.effectiveType === 'slow-2g';

  useFeedImagePreload(items, currentIndex, {
    preloadCount: isSlowConnection ? 2 : 5, // Fewer on slow connections
    priority: 'low',
    preloadOnSlowConnection: false,
    onImageLoaded: (url) => {
      console.log('Preloaded:', url);
    },
  });

  return <VirtualizedFeed items={items} />;
}
```

## Performance Monitoring

### Track Preload Success Rate

```typescript
function ExploreFeed() {
  const [stats, setStats] = useState({ loaded: 0, failed: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed();

  useFeedImagePreload(items, currentIndex, {
    preloadCount: 5,
    onImageLoaded: (url) => {
      setStats(prev => ({ ...prev, loaded: prev.loaded + 1 }));
    },
    onImageError: (url, error) => {
      setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      console.error('Preload failed:', url, error);
    },
  });

  return (
    <div>
      <div className="text-xs text-gray-500">
        Preloaded: {stats.loaded} | Failed: {stats.failed}
      </div>
      <VirtualizedFeed items={items} />
    </div>
  );
}
```

## Testing Integration

### Test with Mock Data

```typescript
import { render, screen } from '@testing-library/react';
import { ExploreFeed } from './ExploreFeed';

test('preloads images for feed items', async () => {
  const mockItems = [
    { id: 1, data: { imageUrl: 'image1.jpg' } },
    { id: 2, data: { imageUrl: 'image2.jpg' } },
  ];

  render(<ExploreFeed items={mockItems} />);

  // Wait for preload
  await waitFor(() => {
    // Check that images are preloaded
    expect(screen.getByAltText('Property 1')).toBeInTheDocument();
  });
});
```

## Common Patterns

### Pattern 1: Infinite Scroll with Preloading

```typescript
function InfiniteScrollFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(...);
  
  const allItems = data?.pages.flatMap(page => page.items) || [];

  // Preload images
  useFeedImagePreload(allItems, currentIndex, {
    preloadCount: 5,
  });

  // Fetch next page when near end
  useEffect(() => {
    if (currentIndex > allItems.length - 10 && hasNextPage) {
      fetchNextPage();
    }
  }, [currentIndex, allItems.length, hasNextPage]);

  return <VirtualizedFeed items={allItems} onScroll={setCurrentIndex} />;
}
```

### Pattern 2: Category-Based Preloading

```typescript
function CategoryFeed({ categoryId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: items } = useDiscoveryFeed({ categoryId });

  // Different preload counts per category
  const preloadCount = categoryId === 'video' ? 3 : 5;

  useFeedImagePreload(items, currentIndex, {
    preloadCount,
    priority: categoryId === 'featured' ? 'high' : 'low',
  });

  return <VirtualizedFeed items={items} />;
}
```

### Pattern 3: Prefetch on Hover

```typescript
function PropertyCard({ property, nextProperty }) {
  const { preloadImage } = useImagePreload([]);

  const handleHover = () => {
    if (nextProperty?.imageUrl) {
      preloadImage(nextProperty.imageUrl);
    }
  };

  return (
    <div onMouseEnter={handleHover}>
      <img src={property.imageUrl} alt={property.title} />
    </div>
  );
}
```

## Troubleshooting

### Images Not Preloading

1. Check that `currentIndex` is updating correctly
2. Verify image URLs are valid
3. Check network tab for failed requests
4. Ensure `preloadOnSlowConnection` is set correctly

### High Memory Usage

1. Reduce `preloadCount` (try 3 instead of 5)
2. Ensure cleanup is working (check unmount)
3. Monitor with Chrome DevTools Memory profiler

### Slow Performance

1. Check if too many images are preloading
2. Verify network conditions
3. Use `priority: 'low'` for non-critical images
4. Consider reducing image quality for preload

## Best Practices

1. ✅ Use `preloadCount` between 3-7
2. ✅ Set `priority: 'low'` for background preloading
3. ✅ Respect slow connections with `preloadOnSlowConnection: false`
4. ✅ Track preload success/failure for monitoring
5. ✅ Adjust preload count based on device type
6. ✅ Use progressive loading for large images (>500KB)
7. ✅ Integrate with ProgressiveImage for best results

## Next Steps

1. Add to VirtualizedFeed component
2. Integrate with all Explore pages
3. Test on various network conditions
4. Monitor performance metrics
5. Adjust configuration based on analytics

# useImagePreload Hook

## Overview

The `useImagePreload` hook provides intelligent image preloading capabilities for the Explore feed, improving perceived performance by loading images before they're needed.

## Features

- ✅ Preloads next 5 images in feed by default
- ✅ Network-aware (respects slow connections and data saver mode)
- ✅ Progressive loading support (low-quality → high-quality)
- ✅ Automatic cleanup and abort on unmount
- ✅ Feed-aware preloading based on scroll position
- ✅ Integration with ProgressiveImage component

## Usage

### Basic Image Preloading

```tsx
import { useImagePreload } from '@/hooks/useImagePreload';

function MyComponent() {
  const imageUrls = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];

  const { loadedImages, isImageLoaded } = useImagePreload(imageUrls, {
    preloadCount: 5,
    priority: 'low',
  });

  return (
    <div>
      {imageUrls.map((url) => (
        <img
          key={url}
          src={url}
          alt=""
          className={isImageLoaded(url) ? 'loaded' : 'loading'}
        />
      ))}
    </div>
  );
}
```

### Feed Image Preloading

```tsx
import { useFeedImagePreload } from '@/hooks/useImagePreload';

function FeedComponent({ items, currentIndex }) {
  const { loadedImages } = useFeedImagePreload(items, currentIndex, {
    preloadCount: 5,
    priority: 'low',
  });

  return (
    <div>
      {items.map((item, index) => (
        <FeedItem
          key={item.id}
          item={item}
          isPreloaded={loadedImages.has(item.data.imageUrl)}
        />
      ))}
    </div>
  );
}
```

### Progressive Image Preloading

```tsx
import { useProgressiveImagePreload } from '@/hooks/useImagePreload';

function ImageComponent({ url }) {
  const { lowQualityLoaded, highQualityLoaded, isLoading } = 
    useProgressiveImagePreload(url);

  return (
    <div className="relative">
      {lowQualityLoaded && !highQualityLoaded && (
        <img src={getLowQualityUrl(url)} className="blur-sm" />
      )}
      {highQualityLoaded && (
        <img src={url} className="sharp" />
      )}
      {isLoading && <Spinner />}
    </div>
  );
}
```

## API Reference

### `useImagePreload(urls, options)`

Main hook for preloading images.

**Parameters:**
- `urls: string[]` - Array of image URLs to preload
- `options: PreloadOptions` - Configuration options

**Returns:**
```typescript
{
  loadedImages: Set<string>;      // Successfully loaded images
  failedImages: Set<string>;      // Failed to load images
  loadingImages: Set<string>;     // Currently loading images
  isImageLoaded: (url: string) => boolean;
  isImageLoading: (url: string) => boolean;
  isImageFailed: (url: string) => boolean;
  preloadImage: (url: string) => Promise<void>;
}
```

**Options:**
```typescript
interface PreloadOptions {
  preloadCount?: number;              // Default: 5
  priority?: 'high' | 'low';          // Default: 'low'
  preloadOnSlowConnection?: boolean;  // Default: false
  onImageLoaded?: (url: string) => void;
  onImageError?: (url: string, error: Error) => void;
}
```

### `useFeedImagePreload(items, currentIndex, options)`

Specialized hook for feed-based preloading.

**Parameters:**
- `items: T[]` - Array of feed items
- `currentIndex: number` - Current visible item index
- `options: PreloadOptions` - Configuration options

**Returns:** Same as `useImagePreload`

### `useProgressiveImagePreload(url, options)`

Hook for progressive quality loading.

**Parameters:**
- `url: string` - Image URL to preload
- `options: PreloadOptions` - Configuration options

**Returns:**
```typescript
{
  lowQualityLoaded: boolean;
  highQualityLoaded: boolean;
  isLoading: boolean;
}
```

## Integration with VirtualizedFeed

```tsx
import { VirtualizedFeed } from '@/components/explore-discovery/VirtualizedFeed';
import { useFeedImagePreload } from '@/hooks/useImagePreload';

function ExplorePage() {
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

## Integration with ProgressiveImage

The hook works seamlessly with the existing `ProgressiveImage` component:

```tsx
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { useImagePreload } from '@/hooks/useImagePreload';

function Gallery({ images }) {
  // Preload all images
  const { isImageLoaded } = useImagePreload(images.map(img => img.url));

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image) => (
        <ProgressiveImage
          key={image.id}
          src={image.url}
          alt={image.alt}
          priority={isImageLoaded(image.url)}
        />
      ))}
    </div>
  );
}
```

## Performance Considerations

### Network Awareness

The hook automatically detects slow connections and data saver mode:

```typescript
// Will skip preloading on 2G or slow-2g connections
useFeedImagePreload(items, currentIndex, {
  preloadOnSlowConnection: false, // Default
});

// Force preloading even on slow connections
useFeedImagePreload(items, currentIndex, {
  preloadOnSlowConnection: true,
});
```

### Priority Hints

Use priority hints to control loading order:

```typescript
// High priority - loads immediately
useImagePreload(criticalImages, { priority: 'high' });

// Low priority - loads when browser is idle
useImagePreload(upcomingImages, { priority: 'low' });
```

### Cleanup

The hook automatically cleans up on unmount:
- Aborts ongoing image loads
- Clears internal references
- Prevents memory leaks

## Best Practices

1. **Preload Count**: Keep preloadCount between 3-7 for optimal balance
2. **Priority**: Use 'high' only for above-the-fold images
3. **Slow Connections**: Respect user's data saver preferences
4. **Error Handling**: Provide fallback images for failed loads
5. **Progressive Loading**: Use for large images (>500KB)

## Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useImagePreload } from '@/hooks/useImagePreload';

test('preloads images successfully', async () => {
  const urls = ['image1.jpg', 'image2.jpg'];
  
  const { result } = renderHook(() => useImagePreload(urls));

  await waitFor(() => {
    expect(result.current.loadedImages.size).toBe(2);
  });
});
```

## Requirements Validation

✅ **Requirement 6.4**: Implements lazy loading and progressive image loading techniques
- Preloads next 5 items in feed
- Progressive quality loading (low → high)
- Network-aware preloading
- Integration with ProgressiveImage component

## Related Components

- `ProgressiveImage` - Progressive image loading component
- `VirtualizedFeed` - Virtualized feed component
- `useDiscoveryFeed` - Feed data hook

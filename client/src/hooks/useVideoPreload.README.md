# useVideoPreload Hook

Intelligent video preloading hook with network speed detection and adaptive loading strategies.

## Features

- ✅ Preload next 2 videos in feed automatically
- ✅ Network speed detection using Network Information API
- ✅ Low-bandwidth mode with poster images
- ✅ Adaptive loading based on connection quality
- ✅ Automatic cleanup of out-of-range preloaded videos
- ✅ Manual play button support for slow connections

## Requirements

- **2.2**: Preload next 2 videos in feed
- **2.4**: Network speed detection for adaptive loading

## Usage

### Basic Usage

```tsx
import { useVideoPreload } from '@/hooks/useVideoPreload';

function VideoFeed({ videos }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { isLowBandwidth, preloadedUrls, isPreloaded } = useVideoPreload({
    currentIndex,
    videoUrls: videos.map(v => v.url),
    preloadCount: 2,
  });

  return (
    <div>
      {isLowBandwidth && (
        <div className="banner">
          Low bandwidth detected - videos will not auto-play
        </div>
      )}
      
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          isPreloaded={isPreloaded(video.url)}
          showManualPlay={isLowBandwidth}
        />
      ))}
    </div>
  );
}
```

### With Network Change Callback

```tsx
const { isLowBandwidth, networkInfo } = useVideoPreload({
  currentIndex: 0,
  videoUrls: ['video1.mp4', 'video2.mp4'],
  onNetworkChange: (info) => {
    console.log('Network changed:', info);
    // Show notification to user
    if (info.saveData) {
      toast.info('Data saver mode detected');
    }
  },
});
```

### Manual Preload Control

```tsx
const { preloadUrl, clearPreloaded, isPreloaded } = useVideoPreload({
  currentIndex: 0,
  videoUrls: videos.map(v => v.url),
});

// Manually preload a specific video
const handlePreloadNext = () => {
  preloadUrl(videos[currentIndex + 1].url);
};

// Clear all preloaded videos
const handleClearCache = () => {
  clearPreloaded();
};
```

## API Reference

### Options

```typescript
interface UseVideoPreloadOptions {
  /**
   * Number of videos to preload ahead
   * @default 2
   */
  preloadCount?: number;
  
  /**
   * Current video index in feed
   */
  currentIndex: number;
  
  /**
   * Array of video URLs to preload
   */
  videoUrls: string[];
  
  /**
   * Callback when network speed changes
   */
  onNetworkChange?: (info: NetworkInfo) => void;
}
```

### Return Value

```typescript
interface UseVideoPreloadReturn {
  /**
   * Whether low-bandwidth mode is active
   */
  isLowBandwidth: boolean;
  
  /**
   * Current network information
   */
  networkInfo: NetworkInfo | null;
  
  /**
   * Set of preloaded video URLs
   */
  preloadedUrls: Set<string>;
  
  /**
   * Whether a specific URL is preloaded
   */
  isPreloaded: (url: string) => boolean;
  
  /**
   * Manually trigger preload for a URL
   */
  preloadUrl: (url: string) => void;
  
  /**
   * Clear all preloaded videos
   */
  clearPreloaded: () => void;
}
```

### Network Information

```typescript
interface NetworkInfo {
  /**
   * Effective connection type (4g, 3g, 2g, slow-2g)
   */
  effectiveType: string;
  
  /**
   * Downlink speed in Mbps
   */
  downlink: number;
  
  /**
   * Whether data saver mode is enabled
   */
  saveData: boolean;
  
  /**
   * Round-trip time in milliseconds
   */
  rtt: number;
}
```

## Low-Bandwidth Detection

The hook automatically detects low-bandwidth connections based on:

1. **Save Data Mode**: User has enabled data saver in browser
2. **Connection Type**: 2g or slow-2g connections
3. **Downlink Speed**: < 1.5 Mbps
4. **Round-Trip Time**: > 300ms

When low-bandwidth is detected:
- Video preloading is disabled
- `isLowBandwidth` returns `true`
- Components should show manual play buttons
- Poster images should be displayed instead of auto-play

## Browser Support

The hook uses the [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API) when available:

- ✅ Chrome 61+
- ✅ Edge 79+
- ✅ Opera 48+
- ⚠️ Firefox (behind flag)
- ❌ Safari (not supported)

When the API is unavailable, the hook:
- Assumes good connection by default
- Still provides preloading functionality
- Returns `null` for `networkInfo`

## Performance Considerations

### Memory Management

The hook automatically manages memory by:
- Removing preload elements that are out of range
- Cleaning up on unmount
- Limiting preload to specified count

### Bandwidth Optimization

- Only preloads when not in low-bandwidth mode
- Uses hidden video elements for efficient preloading
- Respects user's data saver preferences
- Automatically adjusts to network changes

### Best Practices

1. **Set appropriate preloadCount**: Default is 2, adjust based on video size
2. **Monitor network changes**: Use `onNetworkChange` callback for user feedback
3. **Show manual controls**: Always provide manual play button in low-bandwidth mode
4. **Use with useVideoPlayback**: Combine both hooks for complete video experience

## Example: Complete Video Feed

```tsx
import { useVideoPreload } from '@/hooks/useVideoPreload';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';

function VideoFeed({ videos }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Preloading logic
  const { 
    isLowBandwidth, 
    networkInfo, 
    isPreloaded 
  } = useVideoPreload({
    currentIndex,
    videoUrls: videos.map(v => v.url),
    preloadCount: 2,
    onNetworkChange: (info) => {
      if (info.effectiveType === '2g') {
        toast.warning('Slow connection detected');
      }
    },
  });

  return (
    <div className="video-feed">
      {/* Network status banner */}
      {isLowBandwidth && (
        <div className="bg-yellow-100 p-4 text-center">
          <p>Low bandwidth mode - tap to play videos</p>
          {networkInfo && (
            <p className="text-sm text-gray-600">
              Connection: {networkInfo.effectiveType} 
              ({networkInfo.downlink.toFixed(1)} Mbps)
            </p>
          )}
        </div>
      )}
      
      {/* Video cards */}
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          isActive={index === currentIndex}
          isPreloaded={isPreloaded(video.url)}
          lowBandwidthMode={isLowBandwidth}
          onView={() => setCurrentIndex(index)}
        />
      ))}
    </div>
  );
}

function VideoCard({ video, isActive, isPreloaded, lowBandwidthMode, onView }) {
  const { 
    videoRef, 
    containerRef, 
    isPlaying, 
    isBuffering, 
    play 
  } = useVideoPlayback({
    lowBandwidthMode,
    onEnterViewport: onView,
  });

  return (
    <div ref={containerRef} className="video-card">
      <video
        ref={videoRef}
        src={video.url}
        poster={video.thumbnailUrl}
        preload={isPreloaded ? 'auto' : 'metadata'}
        loop
        playsInline
        muted
      />
      
      {/* Manual play button for low bandwidth */}
      {lowBandwidthMode && !isPlaying && (
        <button
          onClick={play}
          className="absolute inset-0 flex items-center justify-center"
        >
          <PlayIcon className="w-16 h-16 text-white" />
        </button>
      )}
      
      {/* Buffering indicator */}
      {isBuffering && <Spinner />}
      
      {/* Preload indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && isPreloaded && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 text-xs rounded">
          Preloaded
        </div>
      )}
    </div>
  );
}
```

## Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useVideoPreload } from './useVideoPreload';

describe('useVideoPreload', () => {
  it('should preload next 2 videos', () => {
    const { result } = renderHook(() =>
      useVideoPreload({
        currentIndex: 0,
        videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4'],
        preloadCount: 2,
      })
    );

    // Wait for preload
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isPreloaded('v2.mp4')).toBe(true);
    expect(result.current.isPreloaded('v3.mp4')).toBe(true);
  });

  it('should detect low bandwidth', () => {
    // Mock Network Information API
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '2g',
        downlink: 0.5,
        saveData: false,
        rtt: 400,
      },
    });

    const { result } = renderHook(() =>
      useVideoPreload({
        currentIndex: 0,
        videoUrls: ['v1.mp4'],
      })
    );

    expect(result.current.isLowBandwidth).toBe(true);
  });
});
```

## Troubleshooting

### Videos not preloading

1. Check if low-bandwidth mode is active
2. Verify Network Information API support
3. Check browser console for errors
4. Ensure video URLs are valid

### High memory usage

1. Reduce `preloadCount` (default is 2)
2. Ensure cleanup is working (check DevTools)
3. Monitor `preloadedUrls` size

### Network detection not working

1. Check browser support for Network Information API
2. Test with Chrome DevTools network throttling
3. Verify `onNetworkChange` callback is firing

## Related Hooks

- `useVideoPlayback`: Viewport-based auto-play/pause
- `useSwipeGestures`: Swipe navigation for video feeds
- `useShortsFeed`: Complete shorts feed management

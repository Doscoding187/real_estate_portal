# useVideoPreload Hook - Manual Validation Guide

Since the project's test configuration is currently set up for server-side tests only, this guide provides manual validation steps for the `useVideoPreload` hook.

## Requirements Validation

### Requirement 2.2: Preload next 2 videos in feed

**Test Steps:**
1. Open browser DevTools → Network tab
2. Navigate to a page using `useVideoPreload` with `preloadCount: 2`
3. Observe network requests
4. Verify that 2 video files are being preloaded ahead of current video

**Expected Behavior:**
- Hidden video elements created in DOM
- Network requests initiated for next 2 videos
- Videos marked as preloaded in state

**Validation:**
```javascript
// In browser console
const videos = document.querySelectorAll('video[style*="display: none"]');
console.log('Preloaded videos:', videos.length); // Should be 2
```

### Requirement 2.4: Network speed detection for adaptive loading

**Test Steps:**
1. Open Chrome DevTools → Network tab
2. Set network throttling to "Slow 3G"
3. Reload page with video feed
4. Observe behavior

**Expected Behavior:**
- `isLowBandwidth` should be `true`
- No automatic preloading occurs
- Manual play button is shown
- Network info displays connection type

**Validation:**
```javascript
// Check Network Information API
console.log('Connection:', navigator.connection);
console.log('Effective Type:', navigator.connection?.effectiveType);
console.log('Downlink:', navigator.connection?.downlink);
console.log('Save Data:', navigator.connection?.saveData);
```

## Feature Validation

### 1. Good Connection (4G)

**Setup:**
- Network: Fast 3G or 4G
- Save Data: Off

**Expected:**
- ✅ Videos preload automatically
- ✅ `isLowBandwidth = false`
- ✅ No manual play button
- ✅ Smooth playback

### 2. Low Bandwidth (2G)

**Setup:**
- Network: Slow 3G or 2G
- Save Data: Off

**Expected:**
- ✅ No automatic preloading
- ✅ `isLowBandwidth = true`
- ✅ Manual play button shown
- ✅ Poster images displayed

### 3. Save Data Mode

**Setup:**
- Network: 4G
- Save Data: On (Chrome Settings → Data Saver)

**Expected:**
- ✅ No automatic preloading
- ✅ `isLowBandwidth = true`
- ✅ Manual play button shown
- ✅ Respects user preference

### 4. Network Change Detection

**Test Steps:**
1. Start with good connection
2. Change network throttling to Slow 3G
3. Observe behavior change

**Expected:**
- ✅ `onNetworkChange` callback fires
- ✅ Mode switches to low-bandwidth
- ✅ Preloading stops
- ✅ UI updates accordingly

## Browser Compatibility Testing

### Chrome/Edge (Full Support)

**Test:**
```javascript
console.log('Network API:', !!navigator.connection); // true
console.log('Effective Type:', navigator.connection?.effectiveType);
```

**Expected:**
- ✅ Full network detection
- ✅ All features work

### Firefox (Limited Support)

**Test:**
```javascript
console.log('Network API:', !!navigator.connection); // false (unless flag enabled)
```

**Expected:**
- ✅ Hook works with conservative defaults
- ✅ `networkInfo = null`
- ✅ `isLowBandwidth = false`
- ✅ Preloading still functions

### Safari (No Support)

**Test:**
```javascript
console.log('Network API:', !!navigator.connection); // false
```

**Expected:**
- ✅ Hook works with conservative defaults
- ✅ `networkInfo = null`
- ✅ `isLowBandwidth = false`
- ✅ Preloading still functions

## Performance Validation

### Memory Usage

**Test Steps:**
1. Open DevTools → Performance Monitor
2. Navigate through video feed
3. Monitor memory usage

**Expected:**
- ✅ Memory stays stable
- ✅ Old preloaded videos are cleaned up
- ✅ No memory leaks

**Validation:**
```javascript
// Check number of hidden video elements
setInterval(() => {
  const count = document.querySelectorAll('video[style*="display: none"]').length;
  console.log('Preloaded videos:', count); // Should stay around 2
}, 1000);
```

### Network Efficiency

**Test Steps:**
1. Open DevTools → Network tab
2. Navigate through video feed
3. Monitor network requests

**Expected:**
- ✅ Only 2 videos preloaded at a time
- ✅ No duplicate requests
- ✅ Old preloads cancelled/cleaned up

## Integration Testing

### With useVideoPlayback Hook

**Test Component:**
```tsx
function TestComponent() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videos = ['v1.mp4', 'v2.mp4', 'v3.mp4'];
  
  const { isLowBandwidth, isPreloaded } = useVideoPreload({
    currentIndex,
    videoUrls: videos,
  });
  
  const { videoRef, containerRef, isPlaying } = useVideoPlayback({
    lowBandwidthMode: isLowBandwidth,
  });
  
  return (
    <div ref={containerRef}>
      <video
        ref={videoRef}
        src={videos[currentIndex]}
        preload={isPreloaded(videos[currentIndex]) ? 'auto' : 'metadata'}
      />
      {isLowBandwidth && !isPlaying && (
        <button onClick={() => videoRef.current?.play()}>
          Play
        </button>
      )}
    </div>
  );
}
```

**Expected:**
- ✅ Both hooks work together
- ✅ Low-bandwidth mode affects both
- ✅ Preloading respects playback state

### With Video Feed Component

**Test:**
1. Use `VideoFeedWithPreload` component
2. Navigate through videos
3. Check preloading behavior

**Expected:**
- ✅ Smooth navigation
- ✅ Videos start quickly
- ✅ Network banner shows when needed
- ✅ Manual play works in low-bandwidth

## Edge Cases

### Empty Video Array

**Test:**
```tsx
useVideoPreload({
  currentIndex: 0,
  videoUrls: [],
});
```

**Expected:**
- ✅ No errors
- ✅ Hook returns valid state

### Index Out of Bounds

**Test:**
```tsx
useVideoPreload({
  currentIndex: 10,
  videoUrls: ['v1.mp4', 'v2.mp4'],
});
```

**Expected:**
- ✅ No errors
- ✅ No preloading beyond array

### Rapid Index Changes

**Test:**
1. Quickly swipe through videos
2. Change index rapidly

**Expected:**
- ✅ No duplicate preloads
- ✅ Cleanup happens correctly
- ✅ No memory leaks

## Checklist

Before marking task as complete, verify:

- [ ] Preloads next 2 videos automatically
- [ ] Detects network speed correctly
- [ ] Shows low-bandwidth mode when needed
- [ ] Manual play button works
- [ ] Network change detection works
- [ ] Memory cleanup works
- [ ] No duplicate preloads
- [ ] Works in Chrome/Edge
- [ ] Degrades gracefully in Firefox/Safari
- [ ] Integrates with useVideoPlayback
- [ ] Documentation is complete
- [ ] Example component works

## Automated Testing (Future)

When client-side testing is set up, add these tests:

```typescript
describe('useVideoPreload', () => {
  it('should preload next 2 videos', async () => {
    const { result } = renderHook(() =>
      useVideoPreload({
        currentIndex: 0,
        videoUrls: ['v1.mp4', 'v2.mp4', 'v3.mp4'],
        preloadCount: 2,
      })
    );
    
    await waitFor(() => {
      expect(result.current.isPreloaded('v2.mp4')).toBe(true);
      expect(result.current.isPreloaded('v3.mp4')).toBe(true);
    });
  });
  
  it('should detect low bandwidth', () => {
    mockNetworkInfo({ effectiveType: '2g', downlink: 0.5 });
    
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

## Notes

- Network Information API is experimental and not available in all browsers
- The hook provides conservative defaults when API is unavailable
- Manual testing is required until client-side test setup is complete
- Consider adding E2E tests with Playwright/Cypress for full validation

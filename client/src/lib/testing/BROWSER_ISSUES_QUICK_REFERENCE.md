# Browser Issues Quick Reference - Explore Frontend

## Overview

This document provides quick solutions to common browser-specific issues encountered during cross-browser testing of the Explore frontend refinements.

---

## Quick Issue Lookup

### Video Playback Issues

#### Issue: Video won't autoplay in Safari
**Browser**: Safari (all versions)
**Cause**: Safari's autoplay policy requires user interaction
**Solution**:
```typescript
// Show play button if autoplay fails
const handleAutoplayFailed = () => {
  setShowPlayButton(true);
};

try {
  await videoRef.current?.play();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    handleAutoplayFailed();
  }
}
```
**Status**: ✅ Handled in useVideoPlayback hook

---

#### Issue: Video controls not showing
**Browser**: All browsers
**Cause**: Custom controls override native controls
**Solution**:
```typescript
// Ensure controls attribute is set
<video controls playsInline muted>
  <source src={videoUrl} type="video/mp4" />
</video>
```
**Status**: ✅ Implemented

---

#### Issue: Video stuttering during scroll
**Browser**: Firefox, Safari (lower-end devices)
**Cause**: Heavy rendering during scroll
**Solution**:
```typescript
// Pause videos during fast scroll
const handleScroll = useThrottle(() => {
  if (scrollSpeed > threshold) {
    pauseAllVideos();
  }
}, 100);
```
**Status**: ⚠️ Monitor performance

---

### CSS Rendering Issues

#### Issue: Backdrop-filter not working
**Browser**: Older browsers (< Chrome 76, Firefox 70)
**Cause**: Feature not supported
**Solution**:
```css
.glass-overlay {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
}

@supports not (backdrop-filter: blur(12px)) {
  .glass-overlay {
    background: rgba(255, 255, 255, 0.95);
    /* Solid fallback */
  }
}
```
**Status**: ✅ Implemented

---

#### Issue: Shadows rendering differently
**Browser**: Firefox
**Cause**: Different shadow rendering engine
**Solution**:
```css
/* Use consistent shadow values */
box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.08);
/* Avoid multiple shadows */
```
**Status**: ✅ Design tokens standardized

---

#### Issue: Border-radius clipping issues
**Browser**: Safari
**Cause**: Overflow not properly clipped
**Solution**:
```css
.card {
  border-radius: 1rem;
  overflow: hidden; /* Force clipping */
  transform: translateZ(0); /* Force GPU acceleration */
}
```
**Status**: ✅ Applied to cards

---

### Animation Issues

#### Issue: Animations janky or stuttering
**Browser**: All browsers (lower-end devices)
**Cause**: Heavy DOM manipulation
**Solution**:
```css
/* Use transform and opacity only */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
}

/* Avoid animating: */
/* - width/height */
/* - top/left */
/* - margin/padding */
```
**Status**: ✅ Implemented in animations

---

#### Issue: Reduced motion not respected
**Browser**: All browsers
**Cause**: Media query not checked
**Solution**:
```typescript
// Check prefers-reduced-motion
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Disable animations if true
const animationVariants = prefersReducedMotion
  ? { initial: {}, animate: {} }
  : { initial: { opacity: 0 }, animate: { opacity: 1 } };
```
**Status**: ✅ Implemented in animation library

---

### Performance Issues

#### Issue: Scroll performance poor
**Browser**: All browsers (long lists)
**Cause**: Too many DOM nodes
**Solution**:
```typescript
// Use virtualization for lists > 50 items
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={280}
  overscanCount={3}
>
  {Row}
</FixedSizeList>
```
**Status**: ✅ Implemented in VirtualizedFeed

---

#### Issue: Memory leaks during navigation
**Browser**: All browsers
**Cause**: Event listeners not cleaned up
**Solution**:
```typescript
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('scroll', handler);
  
  // Always cleanup
  return () => {
    window.removeEventListener('scroll', handler);
  };
}, []);
```
**Status**: ✅ All hooks cleanup properly

---

#### Issue: Images loading slowly
**Browser**: All browsers (slow network)
**Cause**: No preloading strategy
**Solution**:
```typescript
// Preload next 5 images
const { preloadImages } = useImagePreload(
  items.slice(currentIndex, currentIndex + 5)
    .map(item => item.imageUrl)
);
```
**Status**: ✅ Implemented in useImagePreload

---

### Map Issues

#### Issue: Map not rendering
**Browser**: All browsers
**Cause**: Google Maps API not loaded
**Solution**:
```typescript
// Check if Google Maps is loaded
if (typeof google === 'undefined') {
  return <div>Loading map...</div>;
}

// Or use loading state
const { isLoaded } = useLoadScript({
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
});
```
**Status**: ✅ Handled in MapHybridView

---

#### Issue: Map markers not clustering
**Browser**: All browsers
**Cause**: MarkerClusterer not configured
**Solution**:
```typescript
<MarkerClusterer
  options={{
    imagePath: '/images/m',
    gridSize: 60,
    maxZoom: 15
  }}
>
  {(clusterer) => markers.map(marker => (
    <Marker clusterer={clusterer} {...marker} />
  ))}
</MarkerClusterer>
```
**Status**: ✅ Implemented

---

#### Issue: Map pan laggy
**Browser**: All browsers
**Cause**: Too many API calls
**Solution**:
```typescript
// Throttle map pan updates
const handleBoundsChanged = useThrottle(() => {
  const bounds = map.getBounds();
  updateFeed(bounds);
}, 250);
```
**Status**: ✅ Implemented in useMapFeedSync

---

### Filter Issues

#### Issue: Filters not persisting
**Browser**: All browsers
**Cause**: LocalStorage not saving
**Solution**:
```typescript
// Ensure Zustand persist middleware configured
export const useExploreFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({ /* state */ }),
    {
      name: 'explore-filters',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```
**Status**: ✅ Implemented

---

#### Issue: URL not updating with filters
**Browser**: All browsers
**Cause**: URL sync not implemented
**Solution**:
```typescript
// Sync filters to URL
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.propertyType) params.set('type', filters.propertyType);
  // ... other filters
  
  window.history.replaceState({}, '', `?${params.toString()}`);
}, [filters]);
```
**Status**: ✅ Implemented in useFilterUrlSync

---

#### Issue: Mobile bottom sheet not draggable
**Browser**: Mobile browsers
**Cause**: Touch events not handled
**Solution**:
```typescript
// Use Framer Motion drag
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(e, info) => {
    if (info.offset.y > 100) {
      closeSheet();
    }
  }}
>
  {/* Sheet content */}
</motion.div>
```
**Status**: ✅ Implemented in MobileFilterBottomSheet

---

### Accessibility Issues

#### Issue: Focus indicators not visible
**Browser**: All browsers
**Cause**: Default outline removed
**Solution**:
```css
/* Always provide visible focus */
*:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Never remove outline without replacement */
button:focus {
  outline: none; /* ❌ Bad */
}

button:focus-visible {
  outline: 2px solid #6366f1; /* ✅ Good */
}
```
**Status**: ✅ Implemented in keyboard-navigation.css

---

#### Issue: Screen reader not announcing changes
**Browser**: All browsers
**Cause**: Missing aria-live regions
**Solution**:
```typescript
// Add aria-live for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For urgent updates
<div aria-live="assertive">
  {errorMessage}
</div>
```
**Status**: ✅ Implemented in key components

---

#### Issue: Keyboard navigation broken
**Browser**: All browsers
**Cause**: Tab order not logical
**Solution**:
```typescript
// Ensure logical tab order
<div>
  <button tabIndex={0}>First</button>
  <button tabIndex={0}>Second</button>
  <button tabIndex={0}>Third</button>
</div>

// Avoid positive tabIndex values
<button tabIndex={1}>❌ Bad</button>
<button tabIndex={0}>✅ Good</button>
```
**Status**: ✅ Verified in all components

---

### Network Issues

#### Issue: API calls failing
**Browser**: All browsers
**Cause**: Network error or CORS
**Solution**:
```typescript
// Implement retry logic
const { data, error, refetch } = useQuery({
  queryKey: ['explore', 'feed'],
  queryFn: fetchFeed,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Show retry button on error
{error && (
  <button onClick={() => refetch()}>
    Retry
  </button>
)}
```
**Status**: ✅ Implemented in React Query config

---

#### Issue: Offline mode not working
**Browser**: All browsers
**Cause**: Online/offline events not handled
**Solution**:
```typescript
// Listen for online/offline events
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
```
**Status**: ✅ Implemented in useOnlineStatus

---

### State Management Issues

#### Issue: State not syncing across pages
**Browser**: All browsers
**Cause**: Local state instead of global
**Solution**:
```typescript
// Use Zustand for global state
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

// Access in any component
const filters = useExploreFiltersStore();
const setPropertyType = useExploreFiltersStore(s => s.setPropertyType);
```
**Status**: ✅ Implemented

---

#### Issue: Stale data showing
**Browser**: All browsers
**Cause**: React Query cache not invalidated
**Solution**:
```typescript
// Invalidate cache after mutation
const mutation = useMutation({
  mutationFn: updateProperty,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'feed'] });
  },
});
```
**Status**: ✅ Implemented where needed

---

## Browser-Specific Quirks

### Chrome
- **Quirk**: None significant
- **Workaround**: N/A

### Firefox
- **Quirk**: Backdrop-filter may be slower
- **Workaround**: Monitor performance, provide fallback if needed

### Safari
- **Quirk**: Autoplay policy is strict
- **Workaround**: Always provide manual play button

### Edge
- **Quirk**: None (Chromium-based)
- **Workaround**: N/A

---

## Testing Checklist

When encountering an issue:

1. [ ] Check browser console for errors
2. [ ] Verify browser version meets minimum requirements
3. [ ] Test in incognito/private mode (rules out extensions)
4. [ ] Clear cache and reload
5. [ ] Check network tab for failed requests
6. [ ] Verify feature support on caniuse.com
7. [ ] Test on different device/OS if possible
8. [ ] Check this document for known issues
9. [ ] Document new issues found

---

## Reporting New Issues

If you find a new browser-specific issue:

1. **Document the issue**:
   - Browser and version
   - OS and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/videos

2. **Test workarounds**:
   - Try solutions from this document
   - Research on MDN, Stack Overflow
   - Test in other browsers

3. **Update documentation**:
   - Add to this document
   - Update compatibility matrix
   - Note in test results

4. **Create issue ticket**:
   - Use issue template
   - Tag with browser label
   - Assign priority

---

## Useful Resources

### Browser Documentation
- **Chrome**: https://developer.chrome.com/
- **Firefox**: https://developer.mozilla.org/
- **Safari**: https://developer.apple.com/safari/
- **Edge**: https://docs.microsoft.com/microsoft-edge/

### Testing Tools
- **Can I Use**: https://caniuse.com/
- **BrowserStack**: https://www.browserstack.com/
- **LambdaTest**: https://www.lambdatest.com/
- **Sauce Labs**: https://saucelabs.com/

### Debugging Tools
- **Chrome DevTools**: F12
- **Firefox DevTools**: F12
- **Safari Web Inspector**: Cmd+Option+I
- **Edge DevTools**: F12

---

## Quick Commands

### Check browser version
```javascript
// In browser console
console.log(navigator.userAgent);
```

### Check feature support
```javascript
// Check if feature is supported
if ('IntersectionObserver' in window) {
  console.log('✅ IntersectionObserver supported');
}

// Check CSS feature
if (CSS.supports('backdrop-filter', 'blur(10px)')) {
  console.log('✅ backdrop-filter supported');
}
```

### Monitor performance
```javascript
// Monitor FPS
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    console.log(`FPS: ${Math.round((frames * 1000) / (currentTime - lastTime))}`);
    frames = 0;
    lastTime = currentTime;
  }
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

### Check memory usage
```javascript
// Chrome only
if (performance.memory) {
  console.log('Used:', Math.round(performance.memory.usedJSHeapSize / 1048576), 'MB');
  console.log('Total:', Math.round(performance.memory.totalJSHeapSize / 1048576), 'MB');
}
```

---

## Conclusion

This quick reference covers the most common browser-specific issues encountered during cross-browser testing. Keep this document updated as new issues are discovered and resolved.

**Last Updated**: 2024
**Maintained By**: Frontend Team
**Next Review**: After major browser updates

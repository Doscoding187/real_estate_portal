# Cross-Device Testing Quick Reference

**Quick access guide for testing Explore pages across devices**

---

## Test URLs

```
ExploreHome:   http://localhost:5000/explore
ExploreFeed:   http://localhost:5000/explore/feed
ExploreShorts: http://localhost:5000/explore/shorts
ExploreMap:    http://localhost:5000/explore/map
```

---

## Device Emulation (Chrome DevTools)

### Quick Setup
1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device from dropdown

### Recommended Devices

**iPhone:**
```
iPhone SE (375x667)
iPhone 12 Pro (390x844)
iPhone 14 Pro Max (428x926)
```

**Android:**
```
Pixel 5 (393x851)
Samsung Galaxy S20 Ultra (412x915)
```

**iPad:**
```
iPad Mini (768x1024)
iPad Air (820x1180)
iPad Pro 11" (834x1194)
```

**Desktop:**
```
1920x1080 (Full HD)
1366x768 (Laptop)
```

---

## Responsive Breakpoints

```css
Mobile:  < 640px   (sm)
Tablet:  640-1024px (md-lg)
Desktop: > 1024px   (lg+)
```

### Visual Indicators

**Mobile Layout Active:**
- Single column content
- Bottom sheet filters
- Compact navigation
- Icons without text

**Tablet Layout Active:**
- 2-column content
- Side panel filters
- Expanded navigation
- Icons with text

**Desktop Layout Active:**
- 3-column content
- Sidebar visible
- Full navigation
- All text labels

---

## Quick Test Checklist

### ✅ Layout
- [ ] No horizontal scrolling
- [ ] Content fits viewport
- [ ] Proper spacing
- [ ] Readable text sizes

### ✅ Touch Targets
- [ ] Buttons ≥ 44x44px
- [ ] Spacing between targets ≥ 8px
- [ ] Easy to tap with thumb

### ✅ Navigation
- [ ] All pages accessible
- [ ] Back button works
- [ ] Swipe gestures work
- [ ] Scroll smooth

### ✅ Performance
- [ ] Smooth scrolling (55+ FPS)
- [ ] Fast page loads (< 2s)
- [ ] No jank or lag
- [ ] Videos play smoothly

### ✅ Orientation
- [ ] Portrait mode works
- [ ] Landscape mode works
- [ ] Smooth transition
- [ ] No layout breaks

---

## Common Issues to Check

### iPhone
```
⚠️ Safe area insets (notch)
⚠️ Video autoplay (must be muted)
⚠️ 100vh includes address bar
⚠️ Backdrop-filter performance
```

### Android
```
⚠️ Address bar auto-hide
⚠️ Overscroll glow effect
⚠️ Performance on budget devices
⚠️ Chrome-specific behaviors
```

### iPad
```
⚠️ Split-view support
⚠️ Hover states (Apple Pencil)
⚠️ Keyboard navigation
⚠️ Orientation changes
```

### Desktop
```
⚠️ Hover effects
⚠️ Keyboard shortcuts
⚠️ Mouse wheel scrolling
⚠️ Window resizing
```

---

## Performance Targets

```
Scroll FPS:        55-60fps
Video Start:       < 300ms (mobile), < 200ms (desktop)
Time to Interactive: < 2s (mobile), < 1s (desktop)
First Contentful Paint: < 1s (mobile), < 0.5s (desktop)
```

---

## Browser Testing

### Required Browsers

**Mobile:**
- iOS Safari 14+
- Chrome Mobile 90+

**Desktop:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Testing Tools

**Chrome DevTools:**
```
F12 → Toggle device toolbar (Ctrl+Shift+M)
Network throttling: Fast 3G, Slow 3G
CPU throttling: 4x slowdown
```

**Firefox Responsive Design Mode:**
```
Ctrl+Shift+M
Select device or custom size
```

**Safari Responsive Design Mode:**
```
Develop → Enter Responsive Design Mode
Select device from dropdown
```

---

## Manual Testing Steps

### 1. ExploreHome
```
1. Load page on device
2. Check header sticky behavior
3. Test view mode toggle
4. Scroll through categories
5. Test filter button
6. Check personalized sections
7. Test card interactions
8. Verify animations smooth
```

### 2. ExploreFeed
```
1. Load page on device
2. Check header layout
3. Test feed type tabs
4. Scroll through videos
5. Test video autoplay
6. Check controls overlay
7. Test filter panel
8. Verify smooth scrolling
```

### 3. ExploreShorts
```
1. Load page on device
2. Check full-screen layout
3. Test vertical swipe
4. Test video playback
5. Check controls overlay
6. Test double-tap to like
7. Verify smooth transitions
8. Check swipe hint
```

### 4. ExploreMap
```
1. Load page on device
2. Check header layout
3. Test category selector
4. Pan and zoom map
5. Test marker interactions
6. Check feed synchronization
7. Test filter panel
8. Verify smooth updates
```

---

## Debugging Tips

### Layout Issues
```javascript
// Check viewport size
console.log(window.innerWidth, window.innerHeight);

// Check breakpoint
console.log(window.matchMedia('(min-width: 1024px)').matches);

// Check safe area insets (iOS)
console.log(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'));
```

### Performance Issues
```javascript
// Check FPS
// Chrome DevTools → Performance → Record

// Check memory
// Chrome DevTools → Memory → Take snapshot

// Check network
// Chrome DevTools → Network → Throttling
```

### Touch Issues
```javascript
// Log touch events
document.addEventListener('touchstart', (e) => {
  console.log('Touch:', e.touches[0].clientX, e.touches[0].clientY);
});
```

---

## Reporting Issues

### Issue Template
```markdown
**Device:** iPhone 14 Pro / Android Pixel 5 / iPad Air / Desktop
**Browser:** Safari 14 / Chrome 90 / Firefox 88
**Screen Size:** 390x844
**Page:** ExploreHome / ExploreFeed / ExploreShorts / ExploreMap
**Issue:** [Description]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshot:** [If applicable]
```

---

## Quick Fixes

### Horizontal Scrolling
```css
/* Add to problematic element */
max-width: 100vw;
overflow-x: hidden;
```

### Touch Target Too Small
```css
/* Increase size */
min-width: 44px;
min-height: 44px;
```

### Text Too Small
```css
/* Increase font size */
font-size: 16px; /* Minimum for mobile */
```

### Layout Breaks on Orientation Change
```javascript
// Force layout recalculation
window.addEventListener('orientationchange', () => {
  window.location.reload();
});
```

---

## Resources

### Documentation
- [CROSS_DEVICE_TEST_RESULTS.md](./CROSS_DEVICE_TEST_RESULTS.md) - Full test results
- [CROSS_BROWSER_TEST_RESULTS.md](./CROSS_BROWSER_TEST_RESULTS.md) - Browser compatibility
- [BROWSER_COMPATIBILITY_MATRIX.md](./BROWSER_COMPATIBILITY_MATRIX.md) - Feature support

### Guidelines
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://material.io/design)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [Safari Web Inspector](https://developer.apple.com/safari/tools/)
- [BrowserStack](https://www.browserstack.com/) - Real device testing

---

## Status

✅ **Responsive Design:** Implemented  
✅ **Breakpoints:** Configured  
✅ **Touch Targets:** Sized correctly  
✅ **Performance:** Optimized  
⏳ **Manual Testing:** Required on physical devices

**Last Updated:** December 7, 2025

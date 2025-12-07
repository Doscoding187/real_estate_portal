# Manual Testing Guide

**Step-by-step guide for manual testing on physical devices**

---

## Overview

This guide provides detailed instructions for manually testing the Explore frontend refinement on physical devices. Follow these steps to verify responsive behavior, performance, and user experience.

---

## Prerequisites

### Required Devices
- [ ] iPhone (iOS Safari) - Any model with iOS 14+
- [ ] Android phone (Chrome Mobile) - Any model with Android 10+
- [ ] iPad (Safari) - Any model with iPadOS 14+
- [ ] Desktop/Laptop - Chrome, Firefox, Safari, or Edge

### Setup
1. Ensure devices are connected to the same network as development server
2. Find your local IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
3. Access app on devices using: `http://[YOUR_IP]:5000/explore`

---

## Testing Workflow

### For Each Device
1. Test all 4 pages
2. Test both orientations (portrait/landscape)
3. Document any issues
4. Take screenshots of problems
5. Note performance observations

---

## Page-by-Page Testing

### 1. ExploreHome (`/explore`)

#### Visual Checks
- [ ] Header is sticky and doesn't overlap content
- [ ] View mode toggle is visible and accessible
- [ ] Category chips scroll horizontally
- [ ] Content cards display properly
- [ ] Filter button is visible and accessible
- [ ] Spacing looks appropriate for device
- [ ] Text is readable (not too small)
- [ ] Images load and display correctly

#### Interaction Tests
- [ ] Tap view mode toggle buttons
  - Expected: View changes smoothly
  - Check: No lag or jank
  
- [ ] Scroll through categories
  - Expected: Smooth horizontal scroll
  - Check: Snap points work
  
- [ ] Tap category chips
  - Expected: Category selected, content updates
  - Check: Visual feedback on tap
  
- [ ] Scroll through content
  - Expected: Smooth vertical scroll at 60fps
  - Check: No stuttering or dropped frames
  
- [ ] Tap filter button
  - Expected: Filter panel opens
  - Check: Smooth animation
  
- [ ] Tap property cards
  - Expected: Navigate to detail (or log)
  - Check: Touch target large enough

#### Performance Checks
- [ ] Page loads in < 2 seconds
- [ ] Scrolling is smooth (55-60fps)
- [ ] Animations are smooth
- [ ] No layout shifts
- [ ] Images load progressively

#### Orientation Test
- [ ] Rotate device to landscape
  - Expected: Layout adjusts smoothly
  - Check: No content cut off
  
- [ ] Rotate back to portrait
  - Expected: Layout returns to normal
  - Check: Scroll position maintained

---

### 2. ExploreFeed (`/explore/feed`)

#### Visual Checks
- [ ] Header displays correctly
- [ ] Feed type tabs are visible
- [ ] Video fills screen appropriately
- [ ] Controls overlay is visible
- [ ] Property info overlay is readable
- [ ] Upload button is visible (if authenticated)
- [ ] Filter button is accessible

#### Interaction Tests
- [ ] Tap feed type tabs
  - Expected: Feed type changes
  - Check: Smooth transition
  
- [ ] Scroll through videos
  - Expected: Snap to each video
  - Check: Smooth scrolling
  
- [ ] Tap video to pause/play
  - Expected: Video pauses/plays
  - Check: Immediate response
  
- [ ] Tap property info
  - Expected: Navigate to detail (or log)
  - Check: Touch target large enough
  
- [ ] Tap filter button
  - Expected: Filter panel opens
  - Check: Smooth animation
  
- [ ] Swipe up/down
  - Expected: Navigate to next/previous video
  - Check: Smooth transition

#### Performance Checks
- [ ] Video starts playing in < 300ms
- [ ] Scrolling is smooth (55-60fps)
- [ ] Video playback is smooth
- [ ] No buffering on good connection
- [ ] Controls respond immediately

#### Video Autoplay Test
- [ ] Scroll to new video
  - Expected: Video starts playing automatically
  - Check: Muted by default
  
- [ ] Scroll away from video
  - Expected: Video pauses
  - Check: Immediate pause

#### Orientation Test
- [ ] Rotate to landscape
  - Expected: Video fills screen
  - Check: Controls still accessible
  
- [ ] Rotate to portrait
  - Expected: Layout adjusts
  - Check: Video continues playing

---

### 3. ExploreShorts (`/explore/shorts`)

#### Visual Checks
- [ ] Full-screen video display
- [ ] Top bar with back/upload buttons
- [ ] Property overlay at bottom
- [ ] Controls positioned correctly
- [ ] Swipe hint appears (first visit)

#### Interaction Tests
- [ ] Swipe up
  - Expected: Next video loads
  - Check: Smooth transition
  
- [ ] Swipe down
  - Expected: Previous video loads
  - Check: Smooth transition
  
- [ ] Double-tap video
  - Expected: Like animation
  - Check: Heart animation appears
  
- [ ] Tap video
  - Expected: Pause/play
  - Check: Immediate response
  
- [ ] Tap back button
  - Expected: Navigate back
  - Check: Smooth transition
  
- [ ] Tap property info
  - Expected: Navigate to detail (or log)
  - Check: Touch target large enough

#### Performance Checks
- [ ] Video starts in < 300ms
- [ ] Swipe transitions smooth (60fps)
- [ ] No jank during swipe
- [ ] Video playback smooth
- [ ] Instant video switching

#### Gesture Tests
- [ ] Fast swipe up
  - Expected: Quick transition
  - Check: Velocity detected
  
- [ ] Slow swipe up
  - Expected: Smooth transition
  - Check: Follows finger
  
- [ ] Swipe and release
  - Expected: Completes or cancels
  - Check: Smooth animation

#### Orientation Test
- [ ] Rotate to landscape
  - Expected: Video fills screen
  - Check: Controls adjust position
  
- [ ] Rotate to portrait
  - Expected: Layout adjusts
  - Check: Video continues playing

---

### 4. ExploreMap (`/explore/map`)

#### Visual Checks
- [ ] Category bar displays correctly
- [ ] Map loads and displays
- [ ] Map markers are visible
- [ ] Property cards display (desktop) or bottom sheet (mobile)
- [ ] Filter button is accessible

#### Interaction Tests
- [ ] Tap category chips
  - Expected: Category selected, map updates
  - Check: Smooth transition
  
- [ ] Pan map
  - Expected: Map moves smoothly
  - Check: No lag
  
- [ ] Pinch to zoom (mobile/tablet)
  - Expected: Map zooms
  - Check: Smooth zoom
  
- [ ] Tap map marker
  - Expected: Property selected
  - Check: Marker highlights, card shows
  
- [ ] Tap property card
  - Expected: Navigate to detail (or log)
  - Check: Touch target large enough
  
- [ ] Tap filter button
  - Expected: Filter panel opens
  - Check: Smooth animation

#### Performance Checks
- [ ] Map loads in < 2 seconds
- [ ] Panning is smooth (60fps)
- [ ] Zooming is smooth
- [ ] Markers render quickly
- [ ] Feed updates within 400ms of map change

#### Map/Feed Sync Test
- [ ] Pan map to new area
  - Expected: Feed updates with properties in view
  - Check: Updates within 400ms
  
- [ ] Tap property in feed
  - Expected: Map centers on property
  - Check: Smooth animation
  
- [ ] Tap map marker
  - Expected: Property card highlights
  - Check: Immediate feedback

#### Orientation Test
- [ ] Rotate to landscape (tablet/desktop)
  - Expected: Map and feed side-by-side
  - Check: Both visible and functional
  
- [ ] Rotate to portrait
  - Expected: Map full width, feed below
  - Check: Layout adjusts smoothly

---

## Device-Specific Tests

### iPhone (iOS Safari)

#### Safe Area Insets
- [ ] Check notched devices (iPhone X and later)
  - Expected: Content doesn't overlap notch
  - Check: Header respects safe area
  
- [ ] Check bottom safe area
  - Expected: Filter button doesn't overlap home indicator
  - Check: Proper padding applied

#### Video Autoplay
- [ ] Load ExploreFeed
  - Expected: Video plays automatically (muted)
  - Check: No user interaction required
  
- [ ] Unmute video
  - Expected: Audio plays
  - Check: Volume control works

#### Touch Targets
- [ ] Measure button sizes
  - Expected: All buttons ≥ 44x44px
  - Check: Easy to tap with thumb

#### Performance
- [ ] Scroll through long list
  - Expected: 60fps scrolling
  - Check: No dropped frames
  
- [ ] Play video
  - Expected: Smooth playback
  - Check: No stuttering

---

### Android (Chrome Mobile)

#### Address Bar
- [ ] Scroll down
  - Expected: Address bar hides
  - Check: Layout adjusts smoothly
  
- [ ] Scroll up
  - Expected: Address bar shows
  - Check: No layout shift

#### Touch Targets
- [ ] Measure button sizes
  - Expected: All buttons ≥ 48x48px
  - Check: Easy to tap with thumb

#### Performance
- [ ] Test on mid-range device
  - Expected: 55+ fps scrolling
  - Check: Acceptable performance
  
- [ ] Test video playback
  - Expected: Smooth playback
  - Check: No buffering on good connection

#### Overscroll
- [ ] Scroll past top/bottom
  - Expected: Glow effect (native Android)
  - Check: Acceptable behavior

---

### iPad

#### Split View
- [ ] Enable split view (iPad multitasking)
  - Expected: Layout adjusts to constrained width
  - Check: Responsive breakpoints work
  
- [ ] Resize split view
  - Expected: Layout adjusts smoothly
  - Check: No content cut off

#### Apple Pencil
- [ ] Hover over buttons (if available)
  - Expected: Hover effects work
  - Check: Visual feedback
  
- [ ] Tap with Apple Pencil
  - Expected: Same as finger tap
  - Check: All interactions work

#### Keyboard
- [ ] Connect keyboard
  - Expected: Keyboard shortcuts work
  - Check: Tab navigation works
  
- [ ] Test focus indicators
  - Expected: Visible focus ring
  - Check: Clear visual feedback

#### Orientation
- [ ] Test portrait mode
  - Expected: Mobile/tablet layout
  - Check: Proper spacing
  
- [ ] Test landscape mode
  - Expected: Desktop layout (if > 1024px)
  - Check: Sidebar visible

---

### Desktop

#### Browser Testing
- [ ] Test on Chrome 90+
- [ ] Test on Firefox 88+
- [ ] Test on Safari 14+
- [ ] Test on Edge 90+

#### Mouse Interactions
- [ ] Hover over cards
  - Expected: Lift animation + shadow
  - Check: Smooth animation
  
- [ ] Hover over buttons
  - Expected: Scale animation
  - Check: Cursor changes to pointer
  
- [ ] Click elements
  - Expected: Press animation
  - Check: Immediate feedback

#### Keyboard Navigation
- [ ] Press Tab
  - Expected: Focus moves to next element
  - Check: Visible focus indicator
  
- [ ] Press Shift+Tab
  - Expected: Focus moves to previous element
  - Check: Logical tab order
  
- [ ] Press Enter/Space
  - Expected: Activates focused element
  - Check: Same as click
  
- [ ] Press Escape
  - Expected: Closes modals/panels
  - Check: Focus returns appropriately

#### Window Resizing
- [ ] Resize window from 1920px to 1024px
  - Expected: Layout adjusts smoothly
  - Check: No horizontal scrolling
  
- [ ] Resize window from 1024px to 640px
  - Expected: Switches to tablet layout
  - Check: Sidebar hides
  
- [ ] Resize window from 640px to 375px
  - Expected: Switches to mobile layout
  - Check: Single column

---

## Performance Testing

### Scroll Performance
1. Open Chrome DevTools
2. Go to Performance tab
3. Start recording
4. Scroll through page
5. Stop recording
6. Check FPS (should be 55-60fps)

### Video Start Time
1. Open Network tab
2. Navigate to ExploreFeed
3. Note time when video starts playing
4. Should be < 300ms on good connection

### Page Load Time
1. Open Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Check "Load" time
4. Should be < 2s on good connection

### Memory Usage
1. Open Memory tab
2. Take heap snapshot
3. Interact with page
4. Take another snapshot
5. Check for memory leaks

---

## Accessibility Testing

### Screen Reader
1. Enable screen reader (VoiceOver on iOS, TalkBack on Android)
2. Navigate through page
3. Check all elements are announced
4. Check labels are descriptive

### Keyboard Navigation
1. Disconnect mouse
2. Navigate using Tab key
3. Check all interactive elements are reachable
4. Check focus indicators are visible

### Color Contrast
1. Use browser extension (e.g., WAVE)
2. Check all text meets WCAG AA standards
3. Check interactive elements have sufficient contrast

### Zoom
1. Zoom to 200%
2. Check all content is still readable
3. Check no horizontal scrolling
4. Check layout doesn't break

---

## Issue Documentation

### Screenshot Checklist
- [ ] Take screenshot of issue
- [ ] Include device/browser info in filename
- [ ] Annotate screenshot if needed
- [ ] Save to appropriate folder

### Issue Report Template
```markdown
## Issue: [Brief Description]

**Device:** iPhone 14 Pro / Samsung Galaxy S21 / iPad Air / Desktop
**Browser:** Safari 14 / Chrome 90 / Firefox 88
**Screen Size:** 390x844
**Page:** ExploreHome / ExploreFeed / ExploreShorts / ExploreMap
**Severity:** Critical / High / Medium / Low

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots
[Attach screenshots]

### Additional Context
[Any other relevant information]
```

---

## Testing Checklist Summary

### ExploreHome
- [ ] Visual layout correct
- [ ] All interactions work
- [ ] Performance acceptable
- [ ] Orientation changes smooth
- [ ] Accessibility compliant

### ExploreFeed
- [ ] Visual layout correct
- [ ] Video playback works
- [ ] All interactions work
- [ ] Performance acceptable
- [ ] Orientation changes smooth

### ExploreShorts
- [ ] Full-screen display correct
- [ ] Swipe gestures work
- [ ] Video playback smooth
- [ ] Performance excellent
- [ ] Orientation changes smooth

### ExploreMap
- [ ] Map displays correctly
- [ ] Map/feed sync works
- [ ] All interactions work
- [ ] Performance acceptable
- [ ] Orientation changes smooth

---

## Sign-Off

### Tester Information
- **Name:** _______________
- **Date:** _______________
- **Devices Tested:** _______________

### Test Results
- [ ] All tests passed
- [ ] Issues found (see issue reports)
- [ ] Ready for production
- [ ] Requires fixes

### Notes
[Any additional notes or observations]

---

## Resources

- [CROSS_DEVICE_TEST_RESULTS.md](./CROSS_DEVICE_TEST_RESULTS.md) - Expected behavior
- [CROSS_DEVICE_TESTING_QUICK_REFERENCE.md](./CROSS_DEVICE_TESTING_QUICK_REFERENCE.md) - Quick reference
- [RESPONSIVE_LAYOUT_GUIDE.md](./RESPONSIVE_LAYOUT_GUIDE.md) - Layout patterns

**Last Updated:** December 7, 2025

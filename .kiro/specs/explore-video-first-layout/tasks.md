# Tasks

## Task 1: Create useTrendingVideos Hook ✅ COMPLETE

Create a new hook to fetch trending videos with category filtering support.

### Requirements Addressed
- Requirement 1: AC 3, 5 (fetch 6-12 trending videos, prioritize by engagement)
- Requirement 4: AC 1, 2 (filter by category, handle empty results)

### Acceptance Criteria
- [x] Hook fetches trending videos using existing tRPC explore.getFeed endpoint
- [x] Supports optional categoryId parameter for filtering
- [x] Returns videos sorted by engagement (views, saves, watch time)
- [x] Limits results to videos from last 7 days
- [x] Returns isLoading, error, and refetch states
- [x] Falls back to placeholder data when no videos available

### Files to Create/Modify
- Created: `client/src/hooks/useTrendingVideos.ts`

---

## Task 2: Create TrendingVideoCard Component ✅ COMPLETE

Create a compact video card component optimized for horizontal scrolling display.

### Requirements Addressed
- Requirement 2: AC 1, 2, 3 (9:16 aspect ratio, overlay info, hover animation)

### Acceptance Criteria
- [x] Displays video thumbnail in 9:16 aspect ratio
- [x] Shows duration badge with glass effect (bottom-right)
- [x] Shows view count with glass effect (bottom-left)
- [x] Displays centered play icon overlay
- [x] Implements hover scale animation (1.02) with shadow increase
- [x] Supports onClick handler for navigation
- [x] Uses design tokens for consistent styling
- [x] Includes proper ARIA attributes for accessibility

### Files to Create/Modify
- Created: `client/src/components/explore-discovery/TrendingVideoCard.tsx`

---

## Task 3: Create TrendingVideosSection Component ✅ COMPLETE

Create the main section component with header and horizontal scrollable video row.

### Requirements Addressed
- Requirement 1: AC 1, 2 (display section after header, horizontal scroll)
- Requirement 2: AC 4, 5 (section header with "See All" link)
- Requirement 3: AC 2, 3 (skeleton loading, graceful hide when empty)

### Acceptance Criteria
- [x] Displays "Trending Now" section header with "See All" link
- [x] Renders horizontal scrollable row of TrendingVideoCard components
- [x] Implements CSS scroll-snap for smooth scrolling
- [x] Shows skeleton loaders during loading state
- [x] Hides section gracefully when no videos available
- [x] Handles "See All" click to trigger view mode change
- [x] Uses stagger animation for card entrance
- [x] Supports category filtering via props

### Files to Create/Modify
- Created: `client/src/components/explore-discovery/TrendingVideosSection.tsx`

---

## Task 4: Integrate TrendingVideosSection into ExploreHome ✅ COMPLETE

Update ExploreHome to include the TrendingVideosSection as first content after header.

### Requirements Addressed
- Requirement 1: AC 1, 4 (display after header, navigate on click)
- Requirement 3: AC 1, 4 (correct content ordering, smooth scroll)
- Requirement 4: AC 1, 3 (category filtering, smooth transition)

### Acceptance Criteria
- [x] Import and render TrendingVideosSection after header
- [x] Pass selectedCategoryId to TrendingVideosSection
- [x] Handle video click to switch to videos view mode
- [x] Handle "See All" to switch to videos view mode
- [x] Maintain content order: Header → Trending Videos → Personalized Content
- [x] Ensure smooth scroll performance with lazy loading
- [x] Animate category filter transitions

### Files to Create/Modify
- Modified: `client/src/pages/ExploreHome.tsx`

---

## Task 5: Add Empty State and Category Message ✅ COMPLETE

Handle edge cases when no trending videos match the selected category.

### Requirements Addressed
- Requirement 4: AC 2, 4 (empty category message, "All" category behavior)

### Acceptance Criteria
- [x] Display "No trending videos in this category" when filtered results empty
- [x] Include link to "View all videos" in empty state
- [x] Show all trending videos when "All" category selected
- [x] Animate transition between empty and populated states

### Files to Create/Modify
- Included in: `client/src/components/explore-discovery/TrendingVideosSection.tsx`


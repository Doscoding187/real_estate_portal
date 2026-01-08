# Tasks

## Task 1: Create useTrendingVideos Hook

Create a new hook to fetch trending videos with category filtering support.

### Requirements Addressed
- Requirement 1: AC 3, 5 (fetch 6-12 trending videos, prioritize by engagement)
- Requirement 4: AC 1, 2 (filter by category, handle empty results)

### Acceptance Criteria
- [ ] Hook fetches trending videos using existing tRPC explore.getFeed endpoint
- [ ] Supports optional categoryId parameter for filtering
- [ ] Returns videos sorted by engagement (views, saves, watch time)
- [ ] Limits results to videos from last 7 days
- [ ] Returns isLoading, error, and refetch states
- [ ] Falls back to placeholder data when no videos available

### Files to Create/Modify
- Create: `client/src/hooks/useTrendingVideos.ts`

---

## Task 2: Create TrendingVideoCard Component

Create a compact video card component optimized for horizontal scrolling display.

### Requirements Addressed
- Requirement 2: AC 1, 2, 3 (9:16 aspect ratio, overlay info, hover animation)

### Acceptance Criteria
- [ ] Displays video thumbnail in 9:16 aspect ratio
- [ ] Shows duration badge with glass effect (bottom-right)
- [ ] Shows view count with glass effect (bottom-left)
- [ ] Displays centered play icon overlay
- [ ] Implements hover scale animation (1.02) with shadow increase
- [ ] Supports onClick handler for navigation
- [ ] Uses design tokens for consistent styling
- [ ] Includes proper ARIA attributes for accessibility

### Files to Create/Modify
- Create: `client/src/components/explore-discovery/TrendingVideoCard.tsx`

---

## Task 3: Create TrendingVideosSection Component

Create the main section component with header and horizontal scrollable video row.

### Requirements Addressed
- Requirement 1: AC 1, 2 (display section after header, horizontal scroll)
- Requirement 2: AC 4, 5 (section header with "See All" link)
- Requirement 3: AC 2, 3 (skeleton loading, graceful hide when empty)

### Acceptance Criteria
- [ ] Displays "Trending Now" section header with "See All" link
- [ ] Renders horizontal scrollable row of TrendingVideoCard components
- [ ] Implements CSS scroll-snap for smooth scrolling
- [ ] Shows skeleton loaders during loading state
- [ ] Hides section gracefully when no videos available
- [ ] Handles "See All" click to trigger view mode change
- [ ] Uses stagger animation for card entrance
- [ ] Supports category filtering via props

### Files to Create/Modify
- Create: `client/src/components/explore-discovery/TrendingVideosSection.tsx`

---

## Task 4: Integrate TrendingVideosSection into ExploreHome

Update ExploreHome to include the TrendingVideosSection as first content after header.

### Requirements Addressed
- Requirement 1: AC 1, 4 (display after header, navigate on click)
- Requirement 3: AC 1, 4 (correct content ordering, smooth scroll)
- Requirement 4: AC 1, 3 (category filtering, smooth transition)

### Acceptance Criteria
- [ ] Import and render TrendingVideosSection after header
- [ ] Pass selectedCategoryId to TrendingVideosSection
- [ ] Handle video click to switch to videos view mode
- [ ] Handle "See All" to switch to videos view mode
- [ ] Maintain content order: Header → Trending Videos → Personalized Content
- [ ] Ensure smooth scroll performance with lazy loading
- [ ] Animate category filter transitions

### Files to Create/Modify
- Modify: `client/src/pages/ExploreHome.tsx`

---

## Task 5: Add Empty State and Category Message

Handle edge cases when no trending videos match the selected category.

### Requirements Addressed
- Requirement 4: AC 2, 4 (empty category message, "All" category behavior)

### Acceptance Criteria
- [ ] Display "No trending videos in this category" when filtered results empty
- [ ] Include link to "View all videos" in empty state
- [ ] Show all trending videos when "All" category selected
- [ ] Animate transition between empty and populated states

### Files to Create/Modify
- Modify: `client/src/components/explore-discovery/TrendingVideosSection.tsx`


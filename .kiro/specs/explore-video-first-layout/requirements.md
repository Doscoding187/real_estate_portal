# Requirements Document

## Introduction

This spec enhances the Explore Home page to prioritize trending videos immediately after the header, emphasizing the video-centered nature of the Explore feature. Currently, the ExploreHome page displays PersonalizedContentBlock sections first, followed by the DiscoveryCardFeed. This change reorders content to show a dedicated Trending Videos section as the first content after the header/lifestyle category selector, creating a more engaging, video-first experience that aligns with modern social media discovery patterns.

## Glossary

- **Trending Videos Section**: A dedicated horizontal scrollable section showcasing popular/trending video content
- **Video-First Layout**: Content ordering that prioritizes video content above other content types
- **Header**: The sticky navigation area containing the title, view mode tabs, and lifestyle category selector
- **PersonalizedContentBlock**: Existing component showing personalized recommendation sections
- **DiscoveryCardFeed**: Mixed content feed with properties, videos, neighbourhoods, and insights

## Requirements

### Requirement 1

**User Story:** As a property seeker, I want to see trending videos immediately after the header, so that I can quickly discover engaging video content when I open Explore.

#### Acceptance Criteria

1. WHEN a user opens the Explore Home view THEN the System SHALL display a "Trending Videos" section as the first content after the header
2. WHEN the Trending Videos section loads THEN the System SHALL display a horizontal scrollable row of video thumbnails
3. WHEN the Trending Videos section displays THEN the System SHALL show between 6 and 12 trending videos
4. WHEN a user taps a video in the Trending Videos section THEN the System SHALL navigate to the video feed starting at that video
5. WHEN the Trending Videos section loads THEN the System SHALL prioritize videos with high engagement (views, saves, watch time) from the last 7 days

### Requirement 2

**User Story:** As a property seeker, I want the trending videos section to have a modern, engaging design, so that it captures my attention and encourages exploration.

#### Acceptance Criteria

1. WHEN the Trending Videos section displays THEN the System SHALL show video thumbnails in a 9:16 aspect ratio card format
2. WHEN a video thumbnail displays THEN the System SHALL overlay the video duration, view count, and a play icon
3. WHEN a user hovers over a video thumbnail THEN the System SHALL apply a subtle scale animation and highlight effect
4. WHEN the section header displays THEN the System SHALL show "Trending Now" title with a "See All" link
5. WHEN a user taps "See All" on the Trending Videos section THEN the System SHALL switch to the Videos view mode

### Requirement 3

**User Story:** As a property seeker, I want the content ordering to flow naturally from videos to personalized content, so that I have a cohesive browsing experience.

#### Acceptance Criteria

1. WHEN the Explore Home view loads THEN the System SHALL display content in this order: Header → Trending Videos → Personalized Content Blocks → Discovery Feed
2. WHEN the Trending Videos section is loading THEN the System SHALL display skeleton placeholders matching the video card dimensions
3. WHEN no trending videos are available THEN the System SHALL gracefully hide the section and show personalized content first
4. WHEN the user scrolls past the Trending Videos section THEN the System SHALL maintain smooth scroll performance with lazy loading

### Requirement 4

**User Story:** As a property seeker, I want the trending videos to be relevant to my selected lifestyle category, so that I see content matching my interests.

#### Acceptance Criteria

1. WHEN a user selects a lifestyle category THEN the System SHALL filter the Trending Videos section to show videos matching that category
2. WHEN no videos match the selected category THEN the System SHALL display a message "No trending videos in this category" with a link to view all videos
3. WHEN the category filter changes THEN the System SHALL animate the transition between video sets smoothly
4. WHEN "All" category is selected THEN the System SHALL show trending videos across all categories


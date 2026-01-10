# Onboarding Integration Guide

## Overview

The onboarding system for Explore Partner Marketplace consists of two main components:

1. **Welcome Overlay** - First-time user introduction
2. **Progressive Tooltips** - Contextual feature education

## Components Implemented

### WelcomeOverlay
- **Location**: `client/src/components/explore-discovery/WelcomeOverlay.tsx`
- **Hook**: `client/src/hooks/useWelcomeOverlay.ts`
- **Requirements**: 16.7, 16.8, 16.9

**Features:**
- Shows on first session only
- Displays welcome message: "Discover properties, ideas, and insights—all in one place"
- Suggests 3 topics based on user profile
- Pre-filters feed when topic is selected
- Dismissible with skip option

### OnboardingTooltip
- **Location**: `client/src/components/explore-discovery/OnboardingTooltip.tsx`
- **Hook**: `client/src/hooks/useOnboardingTooltip.ts`
- **Requirements**: 16.10, 16.11, 16.12

**Tooltip Types:**
1. **Topic Navigation** (`topic_navigation`)
   - Trigger: After 5 items scrolled
   - Message: "Tap any Topic above to change your view"
   - Position: Bottom of topics navigation

2. **Partner Content** (`partner_content`)
   - Trigger: First partner content encounter
   - Message: "This is educational content from a verified partner"
   - Position: Top of partner content

## Integration Points

### ExploreHome.tsx
The main Explore page has been integrated with onboarding components:

```typescript
// Onboarding hooks
const welcomeOverlay = useWelcomeOverlay();
const topicTooltip = useTopicNavigationTooltip();
const partnerTooltip = usePartnerContentTooltip();

// Refs for tooltip positioning
const topicsRef = useRef<HTMLDivElement>(null);
const partnerContentRef = useRef<HTMLDivElement>(null);
```

**Event Handlers:**
- `handleWelcomeTopicSelect()` - Handles topic selection from welcome overlay
- `handleItemClick()` - Tracks partner content encounters
- `handleTrendingVideoClick()` - Increments scroll count for tooltip trigger

**Components Added:**
```jsx
{/* Welcome Overlay - First-time user onboarding */}
<WelcomeOverlay
  isOpen={welcomeOverlay.isOpen}
  suggestedTopics={welcomeOverlay.suggestedTopics}
  onTopicSelect={handleWelcomeTopicSelect}
  onDismiss={welcomeOverlay.onDismiss}
/>

{/* Topic Navigation Tooltip - After 5 items scrolled */}
<OnboardingTooltip
  tooltipId="topic_navigation"
  isVisible={topicTooltip.isVisible}
  onDismiss={topicTooltip.dismissTooltip}
  position="bottom"
  targetRef={topicsRef}
/>

{/* Partner Content Tooltip - On first partner content encounter */}
<OnboardingTooltip
  tooltipId="partner_content"
  isVisible={partnerTooltip.isVisible}
  onDismiss={partnerTooltip.dismissTooltip}
  position="top"
  targetRef={partnerContentRef}
/>
```

## Demo Page

A comprehensive demo page has been created at:
- **Location**: `client/src/pages/OnboardingDemo.tsx`
- **Route**: `/onboarding-demo`

**Demo Features:**
- Interactive welcome overlay flow
- Tooltip trigger simulation
- Step-by-step progress tracking
- Reset functionality for testing

## API Integration

The onboarding system integrates with the backend through:

### Endpoints
- `GET /api/onboarding/state` - Get user onboarding state
- `POST /api/onboarding/welcome/show` - Mark welcome overlay as shown
- `POST /api/onboarding/welcome/dismiss` - Mark welcome overlay as dismissed
- `POST /api/onboarding/tooltip/show` - Mark tooltip as shown

### Data Structure
```typescript
interface OnboardingState {
  userId: string;
  isFirstSession: boolean;
  welcomeOverlayShown: boolean;
  welcomeOverlayDismissed: boolean;
  suggestedTopics: string[];
  tooltipsShown: string[];
  contentViewCount: number;
  saveCount: number;
  partnerEngagementCount: number;
  featuresUnlocked: string[];
}
```

## Testing

### Unit Tests
- **Location**: `client/src/components/explore-discovery/__tests__/OnboardingIntegration.test.tsx`
- **Coverage**: Welcome overlay, tooltips, integration flow

### Manual Testing
1. Visit `/onboarding-demo` to test all functionality
2. Clear browser storage to simulate first-time user
3. Navigate through Explore to trigger tooltips naturally

## Requirements Validation

### ✅ Requirement 16.7
- Welcome overlay displays on first session
- Shows welcome message explaining Explore

### ✅ Requirement 16.8
- Suggests 3 topics based on user profile
- Topics are selectable and pre-filter feed

### ✅ Requirement 16.10
- Topic tooltip shows after 5 items scrolled
- Message: "Tap any Topic above to change your view"

### ✅ Requirement 16.11
- Partner content tooltip on first encounter
- Message: "This is educational content from a verified partner"

## Usage Instructions

### For Developers
1. Import hooks in your component:
   ```typescript
   import { useWelcomeOverlay } from '@/hooks/useWelcomeOverlay';
   import { useTopicNavigationTooltip, usePartnerContentTooltip } from '@/hooks/useOnboardingTooltip';
   ```

2. Add components to your JSX:
   ```jsx
   <WelcomeOverlay {...welcomeOverlay} />
   <OnboardingTooltip tooltipId="topic_navigation" {...topicTooltip} />
   ```

3. Track user interactions:
   ```typescript
   // Increment scroll count
   topicTooltip.incrementScrollCount();
   
   // Trigger partner content tooltip
   partnerTooltip.onPartnerContentEncounter();
   ```

### For Testing
- Use the demo page at `/onboarding-demo`
- Clear localStorage to reset onboarding state
- Use browser dev tools to simulate different screen sizes

## Performance Considerations

- Components use AnimatePresence for smooth transitions
- Tooltips are positioned dynamically using refs
- State is managed efficiently with React Query caching
- One-time display prevents tooltip spam

## Accessibility

- All components include proper ARIA labels
- Keyboard navigation supported
- Screen reader friendly
- High contrast mode compatible
- Reduced motion preferences respected

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile responsive design
- Touch gesture support
- Progressive enhancement approach
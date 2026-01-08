# Onboarding Service

## Overview

The Onboarding Service manages first-time user experience and progressive feature revelation for the Explore Partner Marketplace. It implements a sophisticated onboarding flow that gradually introduces features as users engage with the platform.

## Key Features

### 1. Welcome Overlay (Requirements 16.7, 16.8, 16.9)
- Shows on first session
- Suggests 3 topics based on user profile
- Can be dismissed by user

### 2. Progressive Disclosure (Requirements 14.2, 14.3, 14.4)
- **Filters/Save**: Unlocked after 10+ content views
- **Topics Navigation**: Unlocked after 3+ saves
- **Partner Profiles**: Unlocked after first partner engagement

### 3. Tooltip System (Requirements 16.10, 16.11, 16.12)
- **Topic Navigation**: Shown after 5 items scrolled
- **Partner Content**: Shown on first partner content encounter
- One-time display per tooltip

## Usage

### Basic Usage

```typescript
import { onboardingService } from './services/onboardingService';

// Get user's onboarding state
const state = await onboardingService.getOnboardingState(userId);

// Check if welcome overlay should be shown
if (await onboardingService.shouldShowWelcomeOverlay(userId)) {
  // Show overlay
  await onboardingService.showWelcomeOverlay(userId);
}

// Track user engagement
await onboardingService.trackOnboardingEvent(userId, {
  type: 'content_view',
});

// Check feature unlocks
const unlocks = await onboardingService.checkFeatureUnlock(userId);
```

### Welcome Overlay Flow

```typescript
// 1. Check if user should see overlay
const shouldShow = await onboardingService.shouldShowWelcomeOverlay(userId);

if (shouldShow) {
  // 2. Get suggested topics
  const state = await onboardingService.getOnboardingState(userId);
  const suggestedTopics = state.suggestedTopics;
  
  // 3. Show overlay with topics
  // ... render overlay UI ...
  
  // 4. Mark as shown
  await onboardingService.showWelcomeOverlay(userId);
  
  // 5. Handle dismissal
  await onboardingService.dismissWelcomeOverlay(userId);
}
```

### Progressive Disclosure

```typescript
// Track engagement events
await onboardingService.trackOnboardingEvent(userId, {
  type: 'content_view',
});

await onboardingService.trackOnboardingEvent(userId, {
  type: 'save',
});

await onboardingService.trackOnboardingEvent(userId, {
  type: 'partner_engagement',
});

// Check what features are unlocked
const unlocks = await onboardingService.checkFeatureUnlock(userId);

unlocks.forEach(unlock => {
  if (unlock.unlocked) {
    console.log(`Feature ${unlock.feature} is unlocked!`);
  } else {
    console.log(`Feature ${unlock.feature}: ${unlock.currentProgress}/${unlock.threshold}`);
  }
});
```

### Tooltip Management

```typescript
// Check if tooltip should be shown
const shouldShow = await onboardingService.shouldShowTooltip(userId, 'topic_navigation');

if (shouldShow) {
  // Get tooltip config
  const config = onboardingService.getTooltipConfig('topic_navigation');
  
  // Show tooltip
  // ... render tooltip UI ...
  
  // Mark as shown
  await onboardingService.showTooltip(userId, 'topic_navigation');
}
```

## API Reference

### `getOnboardingState(userId: string): Promise<UserOnboardingState>`
Get complete onboarding state for a user. Creates initial state if user doesn't exist.

### `showWelcomeOverlay(userId: string): Promise<void>`
Mark welcome overlay as shown and set isFirstSession to false.

### `dismissWelcomeOverlay(userId: string): Promise<void>`
Mark welcome overlay as dismissed by user.

### `getSuggestedTopicsForUser(userId: string): Promise<string[]>`
Get 3 suggested topics based on user profile.

### `showTooltip(userId: string, tooltipId: string): Promise<void>`
Mark tooltip as shown (one-time display).

### `dismissTooltip(userId: string, tooltipId: string): Promise<void>`
Dismiss tooltip (same as showing for one-time tooltips).

### `checkFeatureUnlock(userId: string): Promise<FeatureUnlockResult[]>`
Check which features should be unlocked based on engagement thresholds.

### `unlockFeature(userId: string, feature: string): Promise<void>`
Manually unlock a feature for a user.

### `trackOnboardingEvent(userId: string, event: OnboardingEvent): Promise<void>`
Track engagement event and update metrics. Automatically checks for feature unlocks.

### `shouldShowWelcomeOverlay(userId: string): Promise<boolean>`
Check if welcome overlay should be displayed.

### `shouldShowTooltip(userId: string, tooltipId: string): Promise<boolean>`
Check if tooltip should be displayed.

### `getTooltipConfig(tooltipId: string)`
Get configuration for a specific tooltip.

## Feature Unlock Thresholds

| Feature | Threshold | Metric |
|---------|-----------|--------|
| Filters/Save | 10 | Content views |
| Topics Navigation | 3 | Saves |
| Partner Profiles | 1 | Partner engagements |

## Tooltip Configuration

| Tooltip ID | Trigger | Message |
|------------|---------|---------|
| `topic_navigation` | After 5 items scrolled | "Tap any Topic above to change your view" |
| `partner_content` | First partner content encounter | "This is educational content from a verified partner" |

## Database Schema

```sql
CREATE TABLE user_onboarding_state (
  user_id VARCHAR(36) PRIMARY KEY,
  is_first_session BOOLEAN DEFAULT true,
  welcome_overlay_shown BOOLEAN DEFAULT false,
  welcome_overlay_dismissed BOOLEAN DEFAULT false,
  suggested_topics JSON,
  tooltips_shown JSON,
  content_view_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  partner_engagement_count INT DEFAULT 0,
  features_unlocked JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Integration Example

```typescript
// In your Explore feed endpoint
app.get('/api/explore/feed', async (req, res) => {
  const userId = req.user.id;
  
  // Get onboarding state
  const onboardingState = await onboardingService.getOnboardingState(userId);
  
  // Track content view
  await onboardingService.trackOnboardingEvent(userId, {
    type: 'content_view',
  });
  
  // Check feature unlocks
  const unlocks = await onboardingService.checkFeatureUnlock(userId);
  
  // Return feed with onboarding metadata
  res.json({
    feed: feedItems,
    onboarding: {
      isFirstSession: onboardingState.isFirstSession,
      shouldShowWelcomeOverlay: await onboardingService.shouldShowWelcomeOverlay(userId),
      suggestedTopics: onboardingState.suggestedTopics,
      featuresUnlocked: onboardingState.featuresUnlocked,
      featureUnlocks: unlocks,
    },
  });
});
```

## Testing

```typescript
// Reset onboarding state for testing
await onboardingService.resetOnboardingState(userId);

// Simulate user journey
await onboardingService.trackOnboardingEvent(userId, { type: 'content_view' });
// ... repeat 10 times ...

const unlocks = await onboardingService.checkFeatureUnlock(userId);
expect(unlocks.find(u => u.feature === 'filters_save')?.unlocked).toBe(true);
```

## Requirements Mapping

- **14.1**: First session tracking
- **14.2**: Unlock filters/save after 10+ views
- **14.3**: Unlock Topics after 3+ saves
- **14.4**: Unlock partner profiles after partner engagement
- **16.7**: Welcome overlay on first session
- **16.8**: Suggest 3 topics based on user profile
- **16.9**: Load feed with pre-filtered topic
- **16.10**: Show topic tooltip after 5 items scrolled
- **16.11**: Show partner content tooltip on first encounter
- **16.12**: Track dismissal for analytics

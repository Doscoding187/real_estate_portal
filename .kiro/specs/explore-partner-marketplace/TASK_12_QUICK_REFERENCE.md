# Task 12: Onboarding Service - Quick Reference

## 🎯 What Was Built

Complete onboarding system for Explore Partner Marketplace with:
- Welcome overlay for first-time users
- Progressive feature unlocking based on engagement
- Contextual tooltip system
- Full API and frontend integration

## 📦 Key Files

### Backend
```
server/services/onboardingService.ts          # Core service
server/onboardingRouter.ts                    # API endpoints
```

### Frontend
```
client/src/components/explore-discovery/
  ├── WelcomeOverlay.tsx                      # Welcome overlay
  ├── OnboardingTooltip.tsx                   # Tooltip components
  └── FeatureUnlockIndicator.tsx              # Progress indicators

client/src/hooks/
  ├── useWelcomeOverlay.ts                    # Welcome overlay hook
  ├── useProgressiveDisclosure.ts             # Feature unlock hook
  └── useOnboardingTooltip.ts                 # Tooltip hook
```

## 🚀 Quick Start

### 1. Add Router to Server

```typescript
// In server/index.ts or server/routers.ts
import onboardingRouter from './onboardingRouter';

app.use('/api/onboarding', onboardingRouter);
```

### 2. Add Welcome Overlay to Explore

```typescript
import { WelcomeOverlay } from '@/components/explore-discovery/WelcomeOverlay';
import { useWelcomeOverlay } from '@/hooks/useWelcomeOverlay';

function ExploreHome() {
  const { isOpen, suggestedTopics, onTopicSelect, onDismiss } = useWelcomeOverlay();

  return (
    <>
      <WelcomeOverlay
        isOpen={isOpen}
        suggestedTopics={suggestedTopics}
        onTopicSelect={onTopicSelect}
        onDismiss={onDismiss}
      />
      {/* Your explore content */}
    </>
  );
}
```

### 3. Track Engagement

```typescript
import { useProgressiveDisclosure } from '@/hooks/useProgressiveDisclosure';

function ContentCard() {
  const { trackContentView, trackSave } = useProgressiveDisclosure();

  useEffect(() => {
    trackContentView(); // Track when card is viewed
  }, []);

  const handleSave = () => {
    trackSave(); // Track when user saves
    // ... save logic
  };
}
```

### 4. Add Tooltips

```typescript
import { FloatingTooltip } from '@/components/explore-discovery/OnboardingTooltip';
import { useTopicNavigationTooltip } from '@/hooks/useOnboardingTooltip';

function TopicsBar() {
  const { isVisible, dismissTooltip, incrementScrollCount } = useTopicNavigationTooltip();

  return (
    <>
      <div className="topics-bar">{/* Topics */}</div>
      <FloatingTooltip
        tooltipId="topic_navigation"
        isVisible={isVisible}
        onDismiss={dismissTooltip}
      />
    </>
  );
}
```

## 🎨 Feature Unlock Thresholds

| Feature | Unlock After | Metric |
|---------|--------------|--------|
| Filters & Save | 10 views | `contentViewCount` |
| Topics | 3 saves | `saveCount` |
| Partner Profiles | 1 engagement | `partnerEngagementCount` |

## 📡 API Endpoints

### State Management
```
GET    /api/onboarding/state                    # Get onboarding state
GET    /api/onboarding/feature-unlocks          # Check unlocks
POST   /api/onboarding/track                    # Track event
```

### Welcome Overlay
```
POST   /api/onboarding/welcome/show             # Mark shown
POST   /api/onboarding/welcome/dismiss          # Dismiss
GET    /api/onboarding/suggested-topics         # Get topics
```

### Tooltips
```
POST   /api/onboarding/tooltip/show             # Mark shown
GET    /api/onboarding/tooltip-config/:id       # Get config
```

## 🎯 Tooltip Configuration

| ID | Trigger | Message |
|----|---------|---------|
| `topic_navigation` | 5 items scrolled | "Tap any Topic above to change your view" |
| `partner_content` | First partner content | "This is educational content from a verified partner" |

## 💡 Common Patterns

### Check Feature Access
```typescript
const { canUseFiltersAndSave, canUseTopics } = useProgressiveDisclosure();

if (canUseFiltersAndSave) {
  // Show filters
}
```

### Show Progress
```typescript
import { FeatureUnlockIndicator } from '@/components/explore-discovery/FeatureUnlockIndicator';

<FeatureUnlockIndicator feature="filters_save" />
```

### Track Events
```typescript
const { trackContentView, trackSave, trackPartnerEngagement } = useProgressiveDisclosure();

trackContentView();           // On content view
trackSave();                  // On save action
trackPartnerEngagement();     // On partner interaction
```

## 🧪 Testing

### Reset State (Testing Only)
```typescript
DELETE /api/onboarding/reset
```

### Manual Feature Unlock
```typescript
POST /api/onboarding/unlock-feature
Body: { "feature": "filters_save" }
```

## 📋 Requirements Checklist

- ✅ 14.1: First session tracking
- ✅ 14.2: Unlock filters/save after 10+ views
- ✅ 14.3: Unlock Topics after 3+ saves
- ✅ 14.4: Unlock partner profiles after engagement
- ✅ 16.7: Welcome overlay on first session
- ✅ 16.8: Suggest 3 topics based on profile
- ✅ 16.9: Pre-filter feed with selected topic
- ✅ 16.10: Topic tooltip after 5 items
- ✅ 16.11: Partner content tooltip on first encounter
- ✅ 16.12: Track dismissals for analytics

## 🔗 Related Tasks

- Task 10: Cold Start Infrastructure (launch phases)
- Task 11: Founding Partner Service (early partner program)
- Task 6: Topics Navigation Service (topic filtering)

## 📚 Documentation

See `server/services/onboardingService.README.md` for detailed documentation.

# Content Badge Integration Guide

## Overview

The ContentBadge component has been successfully integrated into all Explore card components (VideoCard, PropertyCard, NeighbourhoodCard, InsightCard) to provide visual indicators of content type.

## Requirements Implemented

### ✅ Requirement 4.1: Badge Display
- Badge renders in top-left corner of all content cards and videos
- Uses `ContentBadgeOverlay` component for consistent positioning
- Z-index ensures badge appears above content

### ✅ Requirement 4.2: Property Badge
- Icon: 🏠
- Color: Primary brand color
- Label: "Property"
- Used on: Property listings, property tours

### ✅ Requirement 4.3: Expert Tip Badge
- Icon: 💡
- Color: Amber (bg-amber-500)
- Label: "Expert Tip"
- Used on: Educational content, tips, guides

### ✅ Requirement 4.4: Service Badge
- Icon: 🛠️
- Color: Blue (bg-blue-500)
- Label: "Service"
- Used on: Service provider content, how-to guides

### ✅ Requirement 4.5: Finance Badge
- Icon: 💰
- Color: Green (bg-green-500)
- Label: "Finance"
- Used on: Financial advice, market insights, investment tips

### ✅ Requirement 4.6: Design Badge
- Icon: 📐
- Color: Purple (bg-purple-500)
- Label: "Design"
- Used on: Architecture, interior design, inspiration content

### ✅ Requirement 4.7: Single Badge Display
- Only one badge displayed per card (primary category)
- Multi-category content shows highest priority badge
- Badge type determined by backend service

## Integration Points

### 1. VideoCard Component
```tsx
import { ContentBadgeOverlay, type BadgeType } from './ContentBadge';

interface VideoCardProps {
  video: {
    // ... other props
    badgeType?: BadgeType; // Add this
  };
}

// In render:
{video.badgeType && (
  <ContentBadgeOverlay type={video.badgeType} size="sm" />
)}
```

### 2. PropertyCard Component
```tsx
import { ContentBadgeOverlay, type BadgeType } from './ContentBadge';

interface PropertyCardProps {
  property: {
    // ... other props
    badgeType?: BadgeType; // Add this
  };
}

// In render:
{property.badgeType && (
  <ContentBadgeOverlay type={property.badgeType} size="sm" />
)}
```

### 3. NeighbourhoodCard Component
```tsx
import { ContentBadgeOverlay, type BadgeType } from './ContentBadge';

interface NeighbourhoodCardProps {
  neighbourhood: {
    // ... other props
    badgeType?: BadgeType; // Add this
  };
}

// In render:
{neighbourhood.badgeType && (
  <ContentBadgeOverlay type={neighbourhood.badgeType} size="sm" />
)}
```

### 4. InsightCard Component
```tsx
import { ContentBadgeOverlay, type BadgeType } from './ContentBadge';

interface InsightCardProps {
  insight: {
    // ... other props
    badgeType?: BadgeType; // Add this
  };
}

// In render (inside header div):
{insight.badgeType && (
  <ContentBadgeOverlay type={insight.badgeType} size="sm" />
)}
```

## Backend Integration

The badge type should be determined by the backend `contentBadgeService` and included in API responses:

```typescript
// Example API response
{
  id: 123,
  title: "Modern Home Tour",
  // ... other fields
  badgeType: "property" // Determined by contentBadgeService
}
```

### Backend Service Integration

The backend `contentBadgeService` determines badge types based on:
1. Content type (property_tour, educational, showcase, etc.)
2. Content tags (property, finance, service, design)
3. Partner tier (Property Professional, Service Provider, etc.)

See `server/services/contentBadgeService.ts` for implementation details.

## Usage Examples

### Basic Usage
```tsx
<ContentBadge type="property" />
```

### With Label
```tsx
<ContentBadge type="expert_tip" showLabel />
```

### Different Sizes
```tsx
<ContentBadge type="service" size="sm" />
<ContentBadge type="finance" size="md" />
<ContentBadge type="design" size="lg" />
```

### Positioned Overlay
```tsx
<div className="relative">
  <img src="..." />
  <ContentBadgeOverlay type="property" />
</div>
```

## Testing

### Unit Tests
Located at: `client/src/components/explore-discovery/__tests__/ContentBadge.test.tsx`

Tests cover:
- Badge rendering for all types
- Correct icons and colors
- Size variations
- Label display
- Overlay positioning
- Accessibility
- Error handling

### Visual Testing
Demo page: `client/src/pages/ContentBadgeDemo.tsx`

Shows:
- All badge types on different card components
- Size variations
- Requirements validation

## Accessibility

### ARIA Labels
- Each badge has `role="img"` with descriptive `aria-label`
- Example: `aria-label="Property content"`

### Screen Reader Support
- Icon has `aria-hidden="true"` to prevent duplicate announcements
- Label text is properly exposed to screen readers

### Keyboard Navigation
- Badge is not interactive (no focus needed)
- Parent card handles all interactions

## Styling

### Design Tokens
- Uses consistent spacing, colors, and typography
- Integrates with design system
- Supports dark mode (via glass overlay effects)

### Responsive Design
- Badge scales appropriately on mobile
- Small size (`sm`) recommended for cards
- Medium size (`md`) for standalone display

### Animation
- Smooth transitions on hover
- Backdrop blur for glass effect
- Shadow for depth

## Migration Guide

### For Existing Cards

1. **Add BadgeType to Interface**
   ```tsx
   import { type BadgeType } from './ContentBadge';
   
   interface CardProps {
     // ... existing props
     badgeType?: BadgeType;
   }
   ```

2. **Import ContentBadgeOverlay**
   ```tsx
   import { ContentBadgeOverlay } from './ContentBadge';
   ```

3. **Add Badge to Render**
   ```tsx
   <div className="relative aspect-[4/3]">
     {props.badgeType && (
       <ContentBadgeOverlay type={props.badgeType} size="sm" />
     )}
     {/* ... rest of content */}
   </div>
   ```

### For New Cards

Follow the same pattern as existing cards. The badge should be:
- First child of the image container
- Positioned absolutely in top-left corner
- Size `sm` for cards, `md` for larger displays

## Troubleshooting

### Badge Not Showing
- Check that `badgeType` prop is provided
- Verify badge type is valid (property, expert_tip, service, finance, design)
- Ensure parent container has `position: relative`

### Wrong Colors
- Verify badge type matches content category
- Check Tailwind classes are not being purged
- Ensure design tokens are properly imported

### Positioning Issues
- Parent container must have `position: relative`
- Badge uses `absolute` positioning with `top-2 left-2`
- Z-index is set to 10 to appear above content

## Future Enhancements

### Potential Improvements
1. **Animated Badges**: Add subtle pulse or glow effects
2. **Badge Tooltips**: Show full category name on hover
3. **Badge Filters**: Allow filtering content by badge type
4. **Badge Analytics**: Track which badge types get most engagement
5. **Custom Badge Colors**: Allow theme customization

### Backend Enhancements
1. **Badge Priority Rules**: Configurable priority for multi-category content
2. **Badge A/B Testing**: Test different badge designs
3. **Badge Personalization**: Show different badges based on user preferences

## Related Documentation

- **Component**: `client/src/components/explore-discovery/ContentBadge.tsx`
- **README**: `client/src/components/explore-discovery/ContentBadge.README.md`
- **Backend Service**: `server/services/contentBadgeService.ts`
- **Design Spec**: `.kiro/specs/explore-partner-marketplace/design.md`
- **Requirements**: `.kiro/specs/explore-partner-marketplace/requirements.md`

## Support

For questions or issues:
1. Check this integration guide
2. Review component README
3. Check backend service documentation
4. Review design spec requirements 4.1-4.7

# Content Badge Service

## Overview

The Content Badge Service determines and manages content type badges for the Explore Partner Marketplace feed. It provides visual indicators that help users instantly understand what type of content they're viewing.

**Requirements Validated:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

## Badge Types

The service supports five badge types, each with specific visual properties:

### 1. Property Badge (🏠)
- **Type:** `property`
- **Icon:** 🏠
- **Color:** `primary` (brand color)
- **Label:** "Property"
- **Use Case:** Property listings, tours, developments, agent walkthroughs

### 2. Expert Tip Badge (💡)
- **Type:** `expert_tip`
- **Icon:** 💡
- **Color:** `amber`
- **Label:** "Expert Tip"
- **Use Case:** Educational content, how-to guides, market insights, advice

### 3. Service Badge (🛠️)
- **Type:** `service`
- **Icon:** 🛠️
- **Color:** `blue`
- **Label:** "Service"
- **Use Case:** Home services, renovations, maintenance, security

### 4. Finance Badge (💰)
- **Type:** `finance`
- **Icon:** 💰
- **Color:** `green`
- **Label:** "Finance"
- **Use Case:** Financial advice, investment, bonds, mortgages, affordability

### 5. Design Badge (📐)
- **Type:** `design`
- **Icon:** 📐
- **Color:** `purple`
- **Label:** "Design"
- **Use Case:** Architecture, interior design, inspiration, decor

## Content Categories

Content is also classified into hierarchy categories for the 70/20/10 rule:

- **Primary (70%):** Properties & Developments
- **Secondary (20%):** Services, Finance, Education
- **Tertiary (10%):** Inspiration, Trends, Design

## API Reference

### Core Methods

#### `determineBadgeType(content: ExploreContentItem): BadgeType`

Determines the appropriate badge type for a content item.

**Logic:**
1. Checks if content already has a badge type assigned
2. Maps content type to badge type
3. Analyzes tags for additional context
4. Checks metadata for partner category hints
5. Defaults to 'property' badge

**Multi-Category Handling (Requirement 4.7):**
When content spans multiple categories, the service uses priority order:
- Property > Finance > Service > Design > Expert Tip

This ensures primary category takes precedence.

```typescript
const badge = contentBadgeService.determineBadgeType(content);
// Returns: 'property' | 'expert_tip' | 'service' | 'finance' | 'design'
```

#### `getBadgeConfig(badgeType: BadgeType): ContentBadge`

Returns the complete badge configuration for rendering.

```typescript
const config = contentBadgeService.getBadgeConfig('property');
// Returns: { type: 'property', icon: '🏠', color: 'primary', label: 'Property' }
```

#### `getBadgeForContent(content: ExploreContentItem): ContentBadge`

Combines badge type determination with configuration retrieval.

```typescript
const badge = contentBadgeService.getBadgeForContent(content);
// Returns complete badge config ready for rendering
```

#### `getPrimaryCategory(content: ExploreContentItem): ContentCategory`

Determines the content hierarchy category (primary/secondary/tertiary).

```typescript
const category = contentBadgeService.getPrimaryCategory(content);
// Returns: 'primary' | 'secondary' | 'tertiary'
```

#### `updateContentBadge(contentId: string | number, isShort: boolean): Promise<void>`

Updates the badge_type and content_category columns in the database.

```typescript
await contentBadgeService.updateContentBadge('content-123', false);
```

#### `batchUpdateContentBadges(contentIds: (string | number)[], isShort: boolean): Promise<void>`

Batch updates badges for multiple content items.

```typescript
await contentBadgeService.batchUpdateContentBadges(['id1', 'id2', 'id3'], false);
```

## Usage Examples

### Example 1: Determine Badge for New Content

```typescript
import { contentBadgeService } from './services/contentBadgeService';

const newContent = {
  id: '123',
  contentType: 'property_tour',
  tags: ['property', 'listing', 'sandton'],
  metadata: {
    partnerCategory: 'Property Professional'
  }
};

const badge = contentBadgeService.getBadgeForContent(newContent);
console.log(badge);
// Output: { type: 'property', icon: '🏠', color: 'primary', label: 'Property' }
```

### Example 2: Handle Multi-Category Content

```typescript
const multiCategoryContent = {
  id: '456',
  contentType: 'educational',
  tags: ['finance', 'property', 'investment'], // Multiple categories
  metadata: {}
};

// Service prioritizes: property > finance > service > design > expert_tip
const badge = contentBadgeService.determineBadgeType(multiCategoryContent);
console.log(badge); // Output: 'property' (highest priority)
```

### Example 3: Get All Badge Configurations

```typescript
const allBadges = contentBadgeService.getAllBadgeConfigs();
console.log(allBadges);
// Output: Array of all 5 badge configurations
```

### Example 4: Update Content Badge in Database

```typescript
// For regular content
await contentBadgeService.updateContentBadge('content-789', false);

// For shorts (videos)
await contentBadgeService.updateContentBadge('short-456', true);
```

### Example 5: Batch Update for Backfilling

```typescript
const contentIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
await contentBadgeService.batchUpdateContentBadges(contentIds, false);
```

## Content Type Mappings

### Property Badge
- `property`, `property_tour`, `development_showcase`, `agent_walkthrough`, `listing`

### Expert Tip Badge
- `educational`, `how_to`, `market_insight`, `trend`

### Service Badge
- `service`, `showcase`, `renovation`, `home_improvement`

### Finance Badge
- `finance`, `investment`, `bond`, `mortgage`, `affordability`

### Design Badge
- `design`, `architecture`, `interior`, `inspiration`, `decor`

## Tag-Based Detection

The service also analyzes content tags to determine badge type:

### Property Tags
- `property`, `listing`, `for_sale`, `development`, `estate`

### Finance Tags
- `finance`, `investment`, `bond`, `mortgage`, `affordability`

### Service Tags
- `service`, `renovation`, `security`, `maintenance`, `repair`

### Design Tags
- `design`, `architecture`, `interior`, `decor`, `inspiration`

### Expert Tip Tags
- `educational`, `how_to`, `tips`, `advice`, `guide`

## Integration with Content Hierarchy Engine

The badge service works closely with the Content Hierarchy Engine:

```typescript
import { contentBadgeService } from './services/contentBadgeService';
import { contentHierarchyEngine } from './services/contentHierarchyEngine';

// Determine category for hierarchy enforcement
const category = contentBadgeService.getPrimaryCategory(content);

// Use in hierarchy engine
const categorizedContent = {
  ...content,
  category: category
};
```

## Frontend Integration

### React Component Example

```tsx
import { ContentBadge } from '@/types/explore';

interface BadgeProps {
  badge: ContentBadge;
}

export const ContentBadgeComponent: React.FC<BadgeProps> = ({ badge }) => {
  const colorClasses = {
    primary: 'bg-primary text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white'
  };

  return (
    <div className={`
      absolute top-2 left-2 
      px-2 py-1 
      rounded-md 
      text-xs font-medium
      flex items-center gap-1
      ${colorClasses[badge.color]}
    `}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </div>
  );
};
```

### Usage in Feed

```tsx
import { contentBadgeService } from '@/services/contentBadgeService';
import { ContentBadgeComponent } from '@/components/ContentBadge';

export const ContentCard = ({ content }) => {
  const badge = contentBadgeService.getBadgeForContent(content);

  return (
    <div className="relative">
      <ContentBadgeComponent badge={badge} />
      {/* Rest of content card */}
    </div>
  );
};
```

## Database Schema

The service updates these columns:

```sql
-- explore_content table
ALTER TABLE explore_content 
  ADD COLUMN badge_type VARCHAR(50),
  ADD COLUMN content_category ENUM('primary', 'secondary', 'tertiary') DEFAULT 'primary';

-- explore_shorts table
ALTER TABLE explore_shorts
  ADD COLUMN badge_type VARCHAR(50),
  ADD COLUMN content_category ENUM('primary', 'secondary', 'tertiary') DEFAULT 'primary';
```

## Testing

### Unit Test Example

```typescript
import { contentBadgeService } from './contentBadgeService';

describe('ContentBadgeService', () => {
  it('should determine property badge for property content', () => {
    const content = {
      id: '1',
      contentType: 'property_tour',
      tags: ['property', 'listing']
    };

    const badgeType = contentBadgeService.determineBadgeType(content);
    expect(badgeType).toBe('property');
  });

  it('should prioritize property badge for multi-category content', () => {
    const content = {
      id: '2',
      contentType: 'educational',
      tags: ['property', 'finance', 'investment']
    };

    const badgeType = contentBadgeService.determineBadgeType(content);
    expect(badgeType).toBe('property'); // Property has highest priority
  });

  it('should return correct badge configuration', () => {
    const config = contentBadgeService.getBadgeConfig('finance');
    
    expect(config).toEqual({
      type: 'finance',
      icon: '💰',
      color: 'green',
      label: 'Finance'
    });
  });
});
```

## Error Handling

The service handles errors gracefully:

- **Invalid content ID:** Throws error with descriptive message
- **Missing content:** Throws error indicating content not found
- **Batch update failures:** Logs error and continues with remaining items
- **Invalid badge type:** Returns null from parse methods
- **Missing metadata:** Falls back to content type and tags

## Performance Considerations

- Badge determination is synchronous and fast (no database queries)
- Batch updates process items sequentially to avoid overwhelming the database
- Badge configurations are stored in memory (no database lookups)
- Content category determination uses simple lookups

## Best Practices

1. **Always determine badge before rendering:** Call `getBadgeForContent()` to get complete config
2. **Update badges on content creation:** Call `updateContentBadge()` when creating new content
3. **Use batch updates for backfilling:** Use `batchUpdateContentBadges()` for multiple items
4. **Handle multi-category content:** Trust the service's priority order
5. **Cache badge configs in frontend:** Badge configs are static and can be cached

## Troubleshooting

### Badge not displaying correctly
- Check if `badge_type` column is populated in database
- Verify content type is in the mapping table
- Check if tags are properly formatted as array

### Wrong badge type assigned
- Review content type and tags
- Check metadata for conflicting hints
- Verify priority order for multi-category content

### Batch update failing
- Check database connection
- Verify content IDs exist
- Review error logs for specific failures

## Related Services

- **Content Hierarchy Engine:** Uses badge service to categorize content
- **Topics Service:** Filters content by badge type
- **Partner Service:** Associates partners with allowed badge types
- **Feed Generation Service:** Uses badges for display and filtering

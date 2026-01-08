# Content Badge Service - Quick Reference

## Badge Types & Colors

| Badge Type | Icon | Color | Label | Use Case |
|------------|------|-------|-------|----------|
| `property` | 🏠 | primary | Property | Listings, tours, developments |
| `expert_tip` | 💡 | amber | Expert Tip | Education, how-to, insights |
| `service` | 🛠️ | blue | Service | Home services, renovations |
| `finance` | 💰 | green | Finance | Financial advice, bonds |
| `design` | 📐 | purple | Design | Architecture, interior design |

## Quick Usage

```typescript
import { contentBadgeService } from './services/contentBadgeService';

// Get badge for content
const badge = contentBadgeService.getBadgeForContent(content);
// Returns: { type: 'property', icon: '🏠', color: 'primary', label: 'Property' }

// Determine badge type only
const type = contentBadgeService.determineBadgeType(content);
// Returns: 'property' | 'expert_tip' | 'service' | 'finance' | 'design'

// Get category for hierarchy
const category = contentBadgeService.getPrimaryCategory(content);
// Returns: 'primary' | 'secondary' | 'tertiary'

// Update badge in database
await contentBadgeService.updateContentBadge(contentId, false);

// Batch update
await contentBadgeService.batchUpdateContentBadges([id1, id2, id3], false);
```

## Content Type Mappings

### Property (Primary)
`property`, `property_tour`, `development_showcase`, `agent_walkthrough`, `listing`

### Expert Tip (Secondary)
`educational`, `how_to`, `market_insight`, `trend`

### Service (Secondary)
`service`, `showcase`, `renovation`, `home_improvement`

### Finance (Secondary)
`finance`, `investment`, `bond`, `mortgage`, `affordability`

### Design (Tertiary)
`design`, `architecture`, `interior`, `inspiration`, `decor`

## Multi-Category Priority

When content has multiple categories, priority order is:
1. **Property** (highest)
2. **Finance**
3. **Service**
4. **Design**
5. **Expert Tip** (lowest)

## Frontend Component

```tsx
export const ContentBadge = ({ badge }) => {
  const colors = {
    primary: 'bg-primary text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white'
  };

  return (
    <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${colors[badge.color]}`}>
      <span>{badge.icon}</span> <span>{badge.label}</span>
    </div>
  );
};
```

## Common Patterns

### Pattern 1: New Content Creation
```typescript
// After creating content
const badge = contentBadgeService.getBadgeForContent(newContent);
await contentBadgeService.updateContentBadge(newContent.id, false);
```

### Pattern 2: Feed Display
```typescript
// In feed component
const items = feedItems.map(item => ({
  ...item,
  badge: contentBadgeService.getBadgeForContent(item)
}));
```

### Pattern 3: Backfilling Existing Content
```typescript
// Get all content without badges
const contentIds = await getContentWithoutBadges();
await contentBadgeService.batchUpdateContentBadges(contentIds, false);
```

## Requirements Validated

- ✅ **4.1:** Map content categories to badge types
- ✅ **4.2:** Property badge (🏠, primary)
- ✅ **4.3:** Expert Tip badge (💡, amber)
- ✅ **4.4:** Service badge (🛠️, blue)
- ✅ **4.5:** Finance badge (💰, green)
- ✅ **4.6:** Design badge (📐, purple)
- ✅ **4.7:** Handle multi-category content (primary badge only)

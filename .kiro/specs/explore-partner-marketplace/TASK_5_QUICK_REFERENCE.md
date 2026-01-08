# Content Hierarchy Engine - Quick Reference

## Import

```typescript
import { hierarchyEngine } from './services/contentHierarchyEngine';
```

## Core Concepts

### Content Categories

| Category | Ratio | Content Types |
|----------|-------|---------------|
| **Primary** | 70% | Properties, Developments, Property Tours |
| **Secondary** | 20% | Services, Finance, Education, Expert Tips |
| **Tertiary** | 10% | Inspiration, Trends, Lifestyle |

### Validation Bounds

- Primary: 60-80% (triggers rebalancing below 60%)
- Secondary: 15-25%
- Tertiary: 5-15%

## Common Operations

### 1. Validate Feed Hierarchy

```typescript
const validation = hierarchyEngine.validateHierarchy(feedItems);

if (!validation.isValid) {
  console.log('Violations:', validation.violations);
  console.log('Recommendations:', validation.recommendations);
}

console.log('Ratios:', {
  primary: `${(validation.ratios.primary * 100).toFixed(1)}%`,
  secondary: `${(validation.ratios.secondary * 100).toFixed(1)}%`,
  tertiary: `${(validation.ratios.tertiary * 100).toFixed(1)}%`
});
```

### 2. Calculate Ratios

```typescript
const ratios = hierarchyEngine.calculateRatios(feedItems);

console.log({
  primary: ratios.primary,
  secondary: ratios.secondary,
  tertiary: ratios.tertiary,
  isValid: ratios.isValid,
  requiresRebalancing: ratios.requiresRebalancing
});
```

### 3. Rebalance Feed

```typescript
// Automatic rebalancing with default config
const rebalanced = await hierarchyEngine.rebalanceFeed(feedItems);

// With custom configuration
const customConfig = {
  primaryRatio: 0.75,
  secondaryRatio: 0.20,
  tertiaryRatio: 0.05,
  minPrimaryRatio: 0.70,
  segmentSize: 20
};
const rebalanced = await hierarchyEngine.rebalanceFeed(feedItems, customConfig);
```

### 4. Categorize Content

```typescript
const category = hierarchyEngine.categorizeContent(contentItem);

console.log(category.type); // 'primary' | 'secondary' | 'tertiary'
console.log(category.contentTypes); // ['property_tour']
```

### 5. Launch Period Support

```typescript
// Get launch period configuration
const launchConfig = await hierarchyEngine.getLaunchPeriodConfig();

// Apply launch period ratios (80% primary)
const launchFeed = await hierarchyEngine.applyLaunchPeriodRatios(feedItems);

// With specific day count (for transition period)
const day35Feed = await hierarchyEngine.applyLaunchPeriodRatios(feedItems, 35);
```

## Configuration

### Default (Ecosystem Maturity)

```typescript
{
  primaryRatio: 0.70,      // 70%
  secondaryRatio: 0.20,    // 20%
  tertiaryRatio: 0.10,     // 10%
  minPrimaryRatio: 0.60,   // Rebalance threshold
  segmentSize: 20          // Items per segment
}
```

### Launch Period (Weeks 1-4)

```typescript
{
  primaryRatio: 0.80,      // 80%
  secondaryRatio: 0.15,    // 15%
  tertiaryRatio: 0.05,     // 5%
  minPrimaryRatio: 0.75,   // Rebalance threshold
  segmentSize: 20
}
```

## Content Type Mapping

### Primary Content Types
- `property_tour`
- `development_showcase`
- `agent_walkthrough`
- `property_listing`
- `development_listing`
- `property_video`
- `neighbourhood_property`

### Secondary Content Types
- `educational`
- `showcase`
- `how_to`
- `market_insight`
- `finance_education`
- `service_showcase`
- `expert_tip`
- `home_improvement`

### Tertiary Content Types
- `inspiration`
- `trend`
- `lifestyle`
- `design_inspiration`
- `market_trend`
- `community_story`

## Integration Example

```typescript
import { hierarchyEngine } from './services/contentHierarchyEngine';

async function generateFeed(userId: string, topicId?: string) {
  // 1. Get raw feed items
  let feedItems = await getRawFeedItems(userId, topicId);
  
  // 2. Check if launch period is active
  const launchConfig = await hierarchyEngine.getLaunchPeriodConfig();
  
  // 3. Validate hierarchy
  const validation = hierarchyEngine.validateHierarchy(feedItems);
  
  // 4. Rebalance if needed
  if (validation.ratios.requiresRebalancing) {
    feedItems = await hierarchyEngine.rebalanceFeed(feedItems, launchConfig);
  }
  
  // 5. Apply launch period ratios if active
  if (launchConfig.primaryRatio === 0.80) {
    feedItems = await hierarchyEngine.applyLaunchPeriodRatios(feedItems);
  }
  
  return feedItems;
}
```

## Rebalancing Behavior

When primary content drops below 60%:

1. **Calculate Deficit**: Determines how many primary items needed
2. **Fetch Older Content**: Gets property content 7+ days old
3. **Prioritize Engagement**: Orders by engagement score
4. **Trim Categories**: Adjusts secondary/tertiary to maintain ratios
5. **Interleave**: Distributes content naturally across feed

## Launch Period Timeline

| Phase | Duration | Primary Ratio | Behavior |
|-------|----------|---------------|----------|
| **Launch Period** | Weeks 1-4 | 80% | Fixed high primary ratio |
| **Transition** | Weeks 5-6 | 80% → 70% | Gradual linear decrease |
| **Maturity** | Week 7+ | 70% | Standard ratio |

## Error Handling

```typescript
try {
  const rebalanced = await hierarchyEngine.rebalanceFeed(feedItems);
} catch (error) {
  console.error('Rebalancing failed:', error);
  // Fallback: return original feed
  return feedItems;
}
```

## Performance Tips

1. **Batch Processing**: Process feeds in segments of 20 items
2. **Cache Older Content**: Cache older property content queries
3. **Validate Before Rebalancing**: Only rebalance if needed
4. **Monitor Ratios**: Track ratio violations for optimization

## Monitoring

```typescript
// Track ratio violations
const validation = hierarchyEngine.validateHierarchy(feedItems);

if (!validation.isValid) {
  // Log to monitoring system
  logger.warn('Feed hierarchy violation', {
    violations: validation.violations,
    ratios: validation.ratios
  });
}
```

## Requirements Coverage

- ✅ 2.1: Primary content ~70%
- ✅ 2.2: Secondary content ~20%
- ✅ 2.3: Tertiary content ~10%
- ✅ 2.4: Rebalancing below 60%
- ✅ 2.5: Per-segment calculation
- ✅ 2.6: Older content surfacing
- ✅ 2.7: Launch period 80%
- ✅ 2.8: Gradual transition
- ✅ 16.15: Launch ratio enforcement
- ✅ 16.16: Transition support

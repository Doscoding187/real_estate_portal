# Feed Ranking Service - Quick Reference

## Import

```typescript
import { feedRankingService } from './services/feedRankingService';
```

## Core Methods

### rankFeedItems()

Rank feed items with weighted scoring algorithm.

```typescript
const rankedItems = await feedRankingService.rankFeedItems(
  items,           // Content items to rank
  userId,          // User ID for personalization
  userLocation,    // Optional: { lat, lng }
  topicId          // Optional: for topic-specific boosts
);
```

**Returns:** `RankedContent[]` sorted by ranking score (highest first)

### ensureBoostLimit()

Enforce 1:10 boost ratio limit.

```typescript
const limitedFeed = feedRankingService.ensureBoostLimit(rankedItems);
```

**Returns:** Feed with max 1 boosted item per 10 organic items

### calculateRankingScore()

Calculate ranking score from factors.

```typescript
const score = feedRankingService.calculateRankingScore({
  userInterestScore: 80,
  qualityScore: 75,
  localRelevanceScore: 90,
  recencyScore: 60,
  trustScore: 85,
  boostMultiplier: 1.0
});
```

**Returns:** Score from 0-100

### calculateRecencyScore()

Calculate time decay score.

```typescript
const score = feedRankingService.calculateRecencyScore(createdAt);
```

**Returns:** Score from 0-100 (exponential decay, 7-day half-life)

### calculateLocalRelevanceScore()

Calculate distance-based relevance.

```typescript
const score = feedRankingService.calculateLocalRelevanceScore(
  userLocation,    // { lat, lng }
  contentLocation  // { lat, lng }
);
```

**Returns:** Score from 0-100 (100 for 0-5km, decreases with distance)

## Ranking Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| User Interest | 35% | Personalization based on behavior |
| Content Quality | 25% | Metadata, engagement, production |
| Local Relevance | 20% | Distance-based scoring |
| Recency | 10% | Time decay function |
| Partner Trust | 10% | Verification, reviews, quality |

## Boost Configuration

- **Multiplier Range:** 1.2x - 2.0x
- **Ratio Limit:** 1 boosted per 10 organic (10%)
- **Status:** Only 'active' campaigns apply

## Common Patterns

### Basic Feed Generation

```typescript
// 1. Get content
const items = await getExploreFeedItems();

// 2. Rank
const ranked = await feedRankingService.rankFeedItems(
  items,
  userId,
  userLocation,
  topicId
);

// 3. Apply boost limit
const feed = feedRankingService.ensureBoostLimit(ranked);
```

### With Content Hierarchy

```typescript
import { hierarchyEngine } from './contentHierarchyEngine';

// Rank then enforce 70/20/10 ratio
const ranked = await feedRankingService.rankFeedItems(items, userId);
const limited = feedRankingService.ensureBoostLimit(ranked);
const final = await hierarchyEngine.rebalanceFeed(limited);
```

### Custom Weights

```typescript
const customService = new FeedRankingService({
  userInterest: 0.40,
  contentQuality: 0.30,
  localRelevance: 0.15,
  recency: 0.10,
  partnerTrust: 0.05
});
```

## Score Ranges

| Factor | Range | Neutral |
|--------|-------|---------|
| User Interest | 0-100 | 50 |
| Quality | 0-100 | 50 |
| Local Relevance | 0-100 | 50 |
| Recency | 0-100 | 100 (new) |
| Trust | 0-100 | 50 |
| Final Score | 0-100 | ~50 |

## Distance Scoring

| Distance | Score |
|----------|-------|
| 0-5 km | 100 |
| 5-20 km | 80 |
| 20-50 km | 60 |
| 50-100 km | 40 |
| 100+ km | 20 |

## Recency Decay

| Age | Score |
|-----|-------|
| 0 days | 100 |
| 7 days | 50 |
| 14 days | 25 |
| 21 days | 12.5 |

## Error Handling

```typescript
// Missing data defaults
qualityScore: 50      // If not in DB
trustScore: 50        // If partner not found
boostMultiplier: 1.0  // If no active campaign
userInterest: 50      // If no history

// Invalid weights
new FeedRankingService({ userInterest: 0.5, quality: 0.3 });
// Throws: "Ranking weights must sum to 1.0"
```

## Performance

- **Target:** 1000 items/second
- **With caching:** ~3000 items/second
- **DB queries:** 3 per ranking operation

## Requirements

- **10.1-10.5:** Weighted scoring (35/25/20/10/10)
- **10.6:** Boost multiplier (1.2x-2.0x)
- **8.3:** Boost ratio limit (1:10)

## Testing

```typescript
// Validate weights
FeedRankingService.validateWeights(weights); // true/false

// Get current weights
const weights = feedRankingService.getWeights();
```

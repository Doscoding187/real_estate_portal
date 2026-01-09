# Quality Scoring Service

## Overview

The Quality Scoring Service calculates and maintains quality scores for all content in the Explore Partner Marketplace. Quality scores influence content visibility in feeds and help partners understand content performance.

## Quality Score Components

Quality scores are calculated from four weighted factors:

1. **Metadata Completeness (20%)** - How complete the content metadata is
2. **Engagement Metrics (40%)** - User interaction signals (watch time, saves, shares)
3. **Production Quality (25%)** - Video/image quality assessment
4. **Negative Signals (15% penalty)** - Quick skips and reports

### Metadata Score (0-100)

Evaluates completeness of:
- Title (20 points) - Length >= 10 chars for full points
- Description (25 points) - Length >= 100 chars for full points
- Tags (20 points) - 5+ tags for full points
- Location (15 points) - Present or not
- Thumbnail (10 points) - Present or not
- Category (10 points) - Present or not

### Engagement Score (0-100)

Calculated from:
- Watch time completion rate (40 points)
- Saves (30 points) - 3 points per save, max 30
- Shares (20 points) - 5 points per share, max 20
- Click-throughs (10 points) - 2 points per click, max 10

### Production Score (0-100)

Set by video processing service based on:
- Video resolution
- Audio quality
- Image sharpness
- Encoding quality

### Negative Signals

Penalties applied for:
- Quick skips (< 3 seconds watch time) - 1 signal each
- Reports - 5 signals each
- Each signal reduces overall score by 1.5 points (max 50 point penalty)

## Quality Thresholds

- **70+**: Full visibility (1.0x multiplier)
- **50-69**: Slightly reduced visibility (0.8x multiplier)
- **40-49**: Significantly reduced visibility (0.5x multiplier)
- **< 40**: Minimal visibility (0.2x multiplier)
- **< 35**: Underperformance threshold - partner notified

## Usage Examples

### Calculate Initial Score

```typescript
import { qualityScoringService } from './qualityScoringService';

// When content is first created
const initialScore = await qualityScoringService.calculateInitialScore(
  contentId,
  {
    title: 'Beautiful 3-Bedroom Home in Sandton',
    description: 'Stunning modern home with...',
    tags: ['sandton', 'luxury', '3-bedroom', 'pool', 'security'],
    location: 'Sandton, Johannesburg',
    thumbnailUrl: 'https://...',
    category: 'property_tour'
  }
);
```

### Update from Engagement

```typescript
// When user interacts with content
await qualityScoringService.updateScoreFromEngagement(
  contentId,
  {
    watchTime: 45,      // seconds
    totalDuration: 60,  // seconds
    saves: 2,
    shares: 1,
    clickThroughs: 1
  }
);
```

### Record Negative Signal

```typescript
// When user skips quickly
await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');

// When user reports content
await qualityScoringService.recordNegativeSignal(contentId, 'report');
```

### Get Quality Score

```typescript
const score = await qualityScoringService.getQualityScore(contentId);
console.log(`Overall: ${score.overallScore}`);
console.log(`Metadata: ${score.metadataScore}`);
console.log(`Engagement: ${score.engagementScore}`);
console.log(`Production: ${score.productionScore}`);
console.log(`Negative Signals: ${score.negativeSignals}`);
```

### Check Underperforming Content

```typescript
// Get list of underperforming content for a partner
const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);

if (underperforming.length > 0) {
  await qualityScoringService.notifyPartnerOfLowQuality(partnerId, underperforming);
}
```

### Get Visibility Multiplier

```typescript
const score = await qualityScoringService.getQualityScore(contentId);
const multiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);

// Use multiplier in feed ranking
const adjustedRankingScore = baseRankingScore * multiplier;
```

## Integration Points

### Feed Ranking Service

The Feed Ranking Service uses quality scores as one of its ranking factors:

```typescript
import { qualityScoringService } from './qualityScoringService';

// In ranking calculation
const qualityScore = await qualityScoringService.getQualityScore(contentId);
const visibilityMultiplier = qualityScoringService.getVisibilityMultiplier(qualityScore.overallScore);

// Apply to ranking
const finalScore = baseRankingScore * visibilityMultiplier;
```

### Video Processing Service

After processing video, update production score:

```typescript
await qualityScoringService.updateProductionScore(contentId, productionScore);
```

### Analytics Service

Track quality score trends over time for partner dashboards.

## Database Schema

```sql
CREATE TABLE content_quality_scores (
  content_id VARCHAR(36) PRIMARY KEY,
  overall_score DECIMAL(5,2) DEFAULT 50.00,
  metadata_score DECIMAL(5,2) DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  production_score DECIMAL(5,2) DEFAULT 0,
  negative_signals INT DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quality_score (overall_score)
);
```

## Requirements Mapping

- **Requirement 11.1**: Calculate initial score from metadata completeness
- **Requirement 11.2**: Increase score for positive engagement
- **Requirement 11.3**: Decrease score for negative signals
- **Requirement 11.4**: Reduce visibility for low scores
- **Requirement 11.6**: Notify partners of underperforming content

## Testing

See `server/services/__tests__/qualityScoringService.test.ts` for unit tests.

## Performance Considerations

- Quality scores are cached and updated asynchronously
- Batch updates are preferred for production score updates
- Visibility multipliers are calculated on-demand (no caching needed)
- Underperformance checks run daily via scheduled job

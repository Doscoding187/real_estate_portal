# Quality Scoring Service - Quick Reference

## At a Glance

The Quality Scoring Service calculates and maintains quality scores (0-100) for all content, influencing feed visibility and partner notifications.

## Key Methods

### Calculate Initial Score
```typescript
await qualityScoringService.calculateInitialScore(contentId, metadata);
```

### Update from Engagement
```typescript
await qualityScoringService.updateScoreFromEngagement(contentId, {
  watchTime: 45,
  totalDuration: 60,
  saves: 1,
  shares: 1,
  clickThroughs: 1
});
```

### Record Negative Signal
```typescript
await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');
await qualityScoringService.recordNegativeSignal(contentId, 'report');
```

### Get Quality Score
```typescript
const score = await qualityScoringService.getQualityScore(contentId);
```

### Get Visibility Multiplier
```typescript
const multiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);
```

### Check Underperformance
```typescript
const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);
await qualityScoringService.notifyPartnerOfLowQuality(partnerId, underperforming);
```

## Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Metadata | 20% | Title, description, tags, location, thumbnail |
| Engagement | 40% | Watch time, saves, shares, click-throughs |
| Production | 25% | Video/image quality |
| Negative Signals | -15% | Quick skips, reports (penalty) |

## Visibility Tiers

| Score | Multiplier | Impact |
|-------|-----------|--------|
| 70-100 | 1.0x | Full visibility |
| 50-69 | 0.8x | Slight reduction |
| 40-49 | 0.5x | Major reduction |
| 0-39 | 0.2x | Minimal visibility |

## Thresholds

- **Low Quality**: < 40 (reduced visibility)
- **Underperformance**: < 35 (partner notified)

## Integration Points

### Feed Ranking
```typescript
const score = await qualityScoringService.getQualityScore(contentId);
const multiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);
const finalScore = baseRankingScore * multiplier;
```

### Content Approval
```typescript
// After approval, calculate initial score
await qualityScoringService.calculateInitialScore(contentId, metadata);
```

### Analytics Dashboard
```typescript
// Show quality metrics to partners
const score = await qualityScoringService.getQualityScore(contentId);
```

## Common Patterns

### New Content
```typescript
// 1. Calculate initial score
const initialScore = await qualityScoringService.calculateInitialScore(contentId, metadata);

// 2. Update production score after processing
await qualityScoringService.updateProductionScore(contentId, 75);
```

### User Interaction
```typescript
// Positive engagement
await qualityScoringService.updateScoreFromEngagement(contentId, engagement);

// Negative signal
await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');
```

### Daily Monitoring
```typescript
// Check all partners for underperformance
const partners = await getAllPartners();
for (const partner of partners) {
  const underperforming = await qualityScoringService.getUnderperformingContent(partner.id);
  if (underperforming.length > 0) {
    await qualityScoringService.notifyPartnerOfLowQuality(partner.id, underperforming);
  }
}
```

## Requirements Mapping

- **11.1**: Calculate initial score from metadata
- **11.2**: Increase score for positive engagement
- **11.3**: Decrease score for negative signals
- **11.4**: Reduce visibility for low scores
- **11.6**: Notify partners of underperforming content

## Files

- `qualityScoringService.ts` - Main service implementation
- `qualityScoringService.README.md` - Detailed documentation
- `qualityScoringService.example.ts` - Usage examples
- `qualityScoringService.VISIBILITY_GUIDE.md` - Visibility reduction details
- `qualityScoringService.NOTIFICATIONS_GUIDE.md` - Notification system details

## Database

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

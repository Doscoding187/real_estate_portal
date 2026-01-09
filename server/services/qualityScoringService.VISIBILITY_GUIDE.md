# Quality Score Visibility Reduction Guide

## Overview

Content with low quality scores receives reduced visibility in feeds through a visibility multiplier system. This ensures high-quality content surfaces naturally while poor content is demoted.

**Requirement**: 11.4 - Reduce feed visibility when score below threshold

## Visibility Multiplier Tiers

The visibility multiplier is applied to the base ranking score during feed generation:

| Quality Score Range | Visibility Multiplier | Impact |
|---------------------|----------------------|--------|
| 70 - 100 | 1.0x | Full visibility - no penalty |
| 50 - 69 | 0.8x | Slightly reduced - minor demotion |
| 40 - 49 | 0.5x | Significantly reduced - major demotion |
| 0 - 39 | 0.2x | Minimal visibility - severe demotion |

## How It Works

### 1. Quality Score Calculation

Quality scores are calculated from four components:
- Metadata completeness (20%)
- Engagement metrics (40%)
- Production quality (25%)
- Negative signals (15% penalty)

### 2. Visibility Multiplier Application

```typescript
import { qualityScoringService } from './qualityScoringService';

// Get quality score for content
const score = await qualityScoringService.getQualityScore(contentId);

// Get visibility multiplier
const multiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);

// Apply to ranking score
const adjustedScore = baseRankingScore * multiplier;
```

### 3. Feed Ranking Integration

The Feed Ranking Service uses the visibility multiplier as part of its ranking calculation:

```typescript
// In feedRankingService.ts
const qualityScore = await qualityScoringService.getQualityScore(contentId);
const visibilityMultiplier = qualityScoringService.getVisibilityMultiplier(qualityScore.overallScore);

// Calculate final ranking score
const finalScore = (
  userInterestScore * 0.35 +
  qualityScore.overallScore * 0.25 +
  localRelevanceScore * 0.20 +
  recencyScore * 0.10 +
  trustScore * 0.10
) * visibilityMultiplier;
```

## Examples

### Example 1: High Quality Content (Score: 85)

```typescript
const score = 85;
const multiplier = qualityScoringService.getVisibilityMultiplier(score);
// multiplier = 1.0

const baseRanking = 75;
const finalRanking = baseRanking * multiplier;
// finalRanking = 75 (no penalty)
```

### Example 2: Medium Quality Content (Score: 55)

```typescript
const score = 55;
const multiplier = qualityScoringService.getVisibilityMultiplier(score);
// multiplier = 0.8

const baseRanking = 75;
const finalRanking = baseRanking * multiplier;
// finalRanking = 60 (slight demotion)
```

### Example 3: Low Quality Content (Score: 45)

```typescript
const score = 45;
const multiplier = qualityScoringService.getVisibilityMultiplier(score);
// multiplier = 0.5

const baseRanking = 75;
const finalRanking = baseRanking * multiplier;
// finalRanking = 37.5 (major demotion)
```

### Example 4: Very Low Quality Content (Score: 30)

```typescript
const score = 30;
const multiplier = qualityScoringService.getVisibilityMultiplier(score);
// multiplier = 0.2

const baseRanking = 75;
const finalRanking = baseRanking * multiplier;
// finalRanking = 15 (severe demotion)
```

## Impact on Feed Position

### High Quality (70+)
- Appears in normal feed positions
- No visibility penalty
- Competes fairly with other content

### Medium Quality (50-69)
- Slightly lower in feed
- 20% visibility reduction
- Still appears regularly but less prominent

### Low Quality (40-49)
- Significantly lower in feed
- 50% visibility reduction
- Rarely appears in top positions
- May not appear in first page of results

### Very Low Quality (< 40)
- Minimal feed presence
- 80% visibility reduction
- Almost never appears in top positions
- Effectively hidden from most users

## Triggering Visibility Reduction

Quality scores decrease due to:

1. **Poor Engagement**
   - Low watch time (< 25% completion)
   - No saves or shares
   - No click-throughs

2. **Negative Signals**
   - Quick skips (< 3 seconds watch time)
   - User reports
   - Flags from moderation

3. **Incomplete Metadata**
   - Missing title or description
   - No tags or location
   - No thumbnail

4. **Low Production Quality**
   - Poor video resolution
   - Bad audio quality
   - Blurry images

## Recovery from Low Visibility

Content can recover visibility by:

1. **Improving Engagement**
   - Users watching longer
   - Receiving saves and shares
   - Getting click-throughs

2. **Updating Metadata**
   - Adding complete descriptions
   - Adding relevant tags
   - Adding location information

3. **Reducing Negative Signals**
   - Fewer quick skips over time
   - No new reports

4. **Improving Production**
   - Re-uploading higher quality video
   - Better thumbnails

## Monitoring Visibility Impact

### For Partners

Partners can see visibility impact in their analytics dashboard:

```typescript
const score = await qualityScoringService.getQualityScore(contentId);
const multiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);

console.log(`Quality Score: ${score.overallScore}`);
console.log(`Visibility: ${multiplier * 100}%`);

if (multiplier < 1.0) {
  console.log(`⚠️ Content visibility reduced by ${(1 - multiplier) * 100}%`);
}
```

### For Administrators

Administrators can monitor content with reduced visibility:

```sql
SELECT 
  ec.id,
  ec.title,
  ep.company_name,
  cqs.overall_score,
  CASE 
    WHEN cqs.overall_score >= 70 THEN '1.0x (Full)'
    WHEN cqs.overall_score >= 50 THEN '0.8x (Slight)'
    WHEN cqs.overall_score >= 40 THEN '0.5x (Major)'
    ELSE '0.2x (Severe)'
  END as visibility
FROM explore_content ec
JOIN content_quality_scores cqs ON ec.id = cqs.content_id
JOIN explore_partners ep ON ec.partner_id = ep.id
WHERE cqs.overall_score < 70
ORDER BY cqs.overall_score ASC;
```

## Best Practices

### For Partners

1. **Focus on Metadata First**
   - Complete all metadata fields
   - Write detailed descriptions
   - Add 5+ relevant tags

2. **Monitor Engagement**
   - Track watch time completion rates
   - Encourage saves and shares
   - Optimize for click-throughs

3. **Respond to Negative Signals**
   - If content gets quick skips, improve opening
   - If reported, review and update content
   - Consider removing consistently poor content

4. **Maintain Production Quality**
   - Use good lighting and audio
   - Shoot in high resolution
   - Create compelling thumbnails

### For Platform

1. **Set Appropriate Thresholds**
   - Review visibility tiers regularly
   - Adjust based on content distribution
   - Balance quality vs. content availability

2. **Provide Feedback**
   - Show partners their visibility status
   - Explain why content is demoted
   - Suggest improvements

3. **Monitor Impact**
   - Track how many items are demoted
   - Ensure high-quality content surfaces
   - Prevent over-penalization

## Testing Visibility Reduction

```typescript
// Test visibility multiplier calculation
describe('Visibility Multiplier', () => {
  it('should return 1.0 for high quality (70+)', () => {
    const multiplier = qualityScoringService.getVisibilityMultiplier(85);
    expect(multiplier).toBe(1.0);
  });

  it('should return 0.8 for medium quality (50-69)', () => {
    const multiplier = qualityScoringService.getVisibilityMultiplier(55);
    expect(multiplier).toBe(0.8);
  });

  it('should return 0.5 for low quality (40-49)', () => {
    const multiplier = qualityScoringService.getVisibilityMultiplier(45);
    expect(multiplier).toBe(0.5);
  });

  it('should return 0.2 for very low quality (< 40)', () => {
    const multiplier = qualityScoringService.getVisibilityMultiplier(30);
    expect(multiplier).toBe(0.2);
  });
});
```

## Related Documentation

- [Quality Scoring Service README](./qualityScoringService.README.md)
- [Feed Ranking Service](./feedRankingService.README.md)
- [Content Approval Service](./contentApprovalService.ts)

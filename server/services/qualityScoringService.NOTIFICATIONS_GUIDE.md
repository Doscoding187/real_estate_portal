# Quality Score Underperformance Notifications Guide

## Overview

The Quality Scoring Service automatically detects and notifies partners when their content consistently underperforms. This helps partners improve content quality and maintain good standing in the marketplace.

**Requirement**: 11.6 - Notify partners of consistently underperforming content

## Underperformance Threshold

Content is considered underperforming when:
- Quality score falls below **35.0**
- This is 5 points below the "low quality" threshold (40.0)
- Indicates severe quality issues requiring immediate attention

## Detection Process

### 1. Identify Underperforming Content

```typescript
import { qualityScoringService } from './qualityScoringService';

// Get all underperforming content for a partner
const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);

console.log(`Found ${underperforming.length} underperforming content pieces`);
```

### 2. Notify Partner

```typescript
if (underperforming.length > 0) {
  await qualityScoringService.notifyPartnerOfLowQuality(partnerId, underperforming);
}
```

### 3. Scheduled Monitoring

Run daily checks for all partners:

```typescript
// Daily scheduled job
async function checkAllPartnersForUnderperformance() {
  const partners = await db.execute(`
    SELECT DISTINCT partner_id 
    FROM explore_content 
    WHERE partner_id IS NOT NULL
  `);

  for (const partner of partners.rows) {
    const underperforming = await qualityScoringService.getUnderperformingContent(
      partner.partner_id
    );

    if (underperforming.length > 0) {
      await qualityScoringService.notifyPartnerOfLowQuality(
        partner.partner_id,
        underperforming
      );
    }
  }
}
```

## Notification Content

### Email Notification Template

```
Subject: Action Required: Content Quality Alert

Dear [Partner Name],

We've detected that some of your content on Explore is underperforming and may need attention.

Underperforming Content (Score < 35):
- [Content Title 1] - Score: 32.5
- [Content Title 2] - Score: 28.0
- [Content Title 3] - Score: 34.5

Why This Matters:
Content with scores below 35 receives minimal visibility (80% reduction) and rarely appears in user feeds.

Common Issues:
✗ Low watch time (users skipping quickly)
✗ Incomplete metadata (missing descriptions, tags)
✗ Poor production quality (low resolution, bad audio)
✗ Multiple user reports or flags

Recommended Actions:
1. Review the content and identify quality issues
2. Update metadata with complete descriptions and tags
3. Consider re-recording with better production quality
4. Remove content that consistently underperforms

View Details: [Link to Partner Dashboard]

Need Help? Contact our partner support team.

Best regards,
The Explore Team
```

### Dashboard Notification

```typescript
interface DashboardNotification {
  type: 'quality_alert';
  severity: 'high';
  title: 'Content Quality Alert';
  message: `${underperforming.length} content pieces are underperforming`;
  actionUrl: '/partner/analytics/quality';
  contentIds: string[];
  createdAt: Date;
}
```

## Notification Triggers

### Trigger 1: New Underperformance

Send notification when content first drops below threshold:

```typescript
async function checkForNewUnderperformance(contentId: string) {
  const score = await qualityScoringService.getQualityScore(contentId);
  
  if (score && score.overallScore < 35) {
    // Check if this is a new underperformance
    const wasUnderperforming = await checkPreviousStatus(contentId);
    
    if (!wasUnderperforming) {
      // First time below threshold - send immediate notification
      await sendImmediateAlert(contentId);
    }
  }
}
```

### Trigger 2: Daily Summary

Send daily summary of all underperforming content:

```typescript
// Run at 9 AM daily
async function sendDailySummary() {
  const partners = await getAllPartnersWithUnderperformingContent();
  
  for (const partner of partners) {
    const underperforming = await qualityScoringService.getUnderperformingContent(
      partner.id
    );
    
    await sendDailySummaryEmail(partner, underperforming);
  }
}
```

### Trigger 3: Threshold Crossed

Send alert when content crosses critical thresholds:

```typescript
const THRESHOLDS = [50, 40, 35, 30, 25];

async function checkThresholdCrossing(contentId: string, newScore: number, oldScore: number) {
  for (const threshold of THRESHOLDS) {
    if (oldScore >= threshold && newScore < threshold) {
      await sendThresholdAlert(contentId, threshold);
    }
  }
}
```

## Notification Frequency

### Rate Limiting

Prevent notification spam:

```typescript
interface NotificationRateLimit {
  partnerId: string;
  lastNotificationSent: Date;
  notificationCount: number;
  period: 'daily' | 'weekly';
}

async function shouldSendNotification(partnerId: string): Promise<boolean> {
  const rateLimit = await getNotificationRateLimit(partnerId);
  
  // Max 1 quality alert per day
  if (rateLimit.period === 'daily' && rateLimit.notificationCount >= 1) {
    return false;
  }
  
  // Max 3 quality alerts per week
  if (rateLimit.period === 'weekly' && rateLimit.notificationCount >= 3) {
    return false;
  }
  
  return true;
}
```

### Notification Schedule

- **Immediate**: When content first drops below 35
- **Daily**: Summary at 9 AM if any content is underperforming
- **Weekly**: Comprehensive report every Monday
- **Never**: More than 1 alert per day per partner

## Partner Dashboard Integration

### Quality Alerts Section

```typescript
interface QualityAlert {
  id: string;
  contentId: string;
  contentTitle: string;
  currentScore: number;
  previousScore: number;
  issues: string[];
  recommendations: string[];
  createdAt: Date;
  acknowledged: boolean;
}

async function getQualityAlerts(partnerId: string): Promise<QualityAlert[]> {
  const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);
  
  const alerts: QualityAlert[] = [];
  
  for (const contentId of underperforming) {
    const score = await qualityScoringService.getQualityScore(contentId);
    const issues = await identifyIssues(score);
    const recommendations = await generateRecommendations(issues);
    
    alerts.push({
      id: generateAlertId(),
      contentId,
      contentTitle: await getContentTitle(contentId),
      currentScore: score.overallScore,
      previousScore: await getPreviousScore(contentId),
      issues,
      recommendations,
      createdAt: new Date(),
      acknowledged: false
    });
  }
  
  return alerts;
}
```

### Issue Identification

```typescript
async function identifyIssues(score: QualityScore): Promise<string[]> {
  const issues: string[] = [];
  
  if (score.metadataScore < 50) {
    issues.push('Incomplete metadata - missing title, description, or tags');
  }
  
  if (score.engagementScore < 30) {
    issues.push('Low engagement - users are not watching, saving, or sharing');
  }
  
  if (score.productionScore < 40) {
    issues.push('Poor production quality - low resolution or bad audio');
  }
  
  if (score.negativeSignals > 10) {
    issues.push('High negative signals - users are skipping or reporting');
  }
  
  return issues;
}
```

### Recommendation Generation

```typescript
async function generateRecommendations(issues: string[]): Promise<string[]> {
  const recommendations: string[] = [];
  
  if (issues.some(i => i.includes('metadata'))) {
    recommendations.push('Add a detailed description (100+ characters)');
    recommendations.push('Add 5+ relevant tags');
    recommendations.push('Add location information');
  }
  
  if (issues.some(i => i.includes('engagement'))) {
    recommendations.push('Improve opening to hook viewers in first 3 seconds');
    recommendations.push('Add clear call-to-action');
    recommendations.push('Optimize video length (30-60 seconds ideal)');
  }
  
  if (issues.some(i => i.includes('production'))) {
    recommendations.push('Re-record in higher resolution (1080p minimum)');
    recommendations.push('Improve lighting and audio quality');
    recommendations.push('Use a better thumbnail image');
  }
  
  if (issues.some(i => i.includes('negative'))) {
    recommendations.push('Review content for policy violations');
    recommendations.push('Consider removing if consistently reported');
    recommendations.push('Analyze why users are skipping quickly');
  }
  
  return recommendations;
}
```

## Notification Channels

### 1. Email

```typescript
async function sendEmailNotification(
  partnerId: string,
  underperforming: string[]
) {
  const partner = await getPartner(partnerId);
  const contentDetails = await getContentDetails(underperforming);
  
  await emailService.send({
    to: partner.email,
    subject: 'Action Required: Content Quality Alert',
    template: 'quality-alert',
    data: {
      partnerName: partner.companyName,
      contentCount: underperforming.length,
      contentDetails,
      dashboardUrl: `${BASE_URL}/partner/analytics/quality`
    }
  });
}
```

### 2. Dashboard Banner

```typescript
async function showDashboardBanner(partnerId: string) {
  const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);
  
  if (underperforming.length > 0) {
    return {
      type: 'warning',
      message: `${underperforming.length} content pieces need attention`,
      action: 'View Details',
      actionUrl: '/partner/analytics/quality'
    };
  }
  
  return null;
}
```

### 3. In-App Notification

```typescript
async function sendInAppNotification(
  partnerId: string,
  underperforming: string[]
) {
  await notificationService.create({
    userId: partnerId,
    type: 'quality_alert',
    title: 'Content Quality Alert',
    message: `${underperforming.length} content pieces are underperforming`,
    data: { contentIds: underperforming },
    priority: 'high',
    expiresAt: addDays(new Date(), 7)
  });
}
```

### 4. SMS (Optional)

```typescript
async function sendSMSNotification(
  partnerId: string,
  underperforming: string[]
) {
  const partner = await getPartner(partnerId);
  
  if (partner.phoneNumber && partner.smsNotificationsEnabled) {
    await smsService.send({
      to: partner.phoneNumber,
      message: `Explore Alert: ${underperforming.length} content pieces need attention. Check your dashboard: ${SHORT_URL}`
    });
  }
}
```

## Monitoring and Analytics

### Track Notification Effectiveness

```typescript
interface NotificationMetrics {
  sent: number;
  opened: number;
  clicked: number;
  contentImproved: number;
  contentRemoved: number;
  averageTimeToAction: number; // hours
}

async function trackNotificationMetrics(partnerId: string): Promise<NotificationMetrics> {
  // Track how partners respond to quality alerts
  const notifications = await getQualityNotifications(partnerId);
  
  return {
    sent: notifications.length,
    opened: notifications.filter(n => n.opened).length,
    clicked: notifications.filter(n => n.clicked).length,
    contentImproved: await countImprovedContent(partnerId),
    contentRemoved: await countRemovedContent(partnerId),
    averageTimeToAction: await calculateAverageResponseTime(partnerId)
  };
}
```

## Best Practices

### For Platform

1. **Be Helpful, Not Punitive**
   - Frame notifications as helpful guidance
   - Provide specific, actionable recommendations
   - Offer support resources

2. **Avoid Notification Fatigue**
   - Limit frequency (max 1 per day)
   - Batch multiple issues into one notification
   - Allow partners to acknowledge and dismiss

3. **Provide Context**
   - Show score trends over time
   - Compare to tier averages
   - Explain impact on visibility

4. **Make It Actionable**
   - Link directly to content editor
   - Provide improvement checklist
   - Show before/after examples

### For Partners

1. **Act Quickly**
   - Address alerts within 24 hours
   - Prioritize content with lowest scores
   - Remove content that can't be improved

2. **Learn from Patterns**
   - Identify common issues across content
   - Adjust content strategy accordingly
   - Apply learnings to new content

3. **Monitor Regularly**
   - Check quality dashboard weekly
   - Track score trends
   - Celebrate improvements

## Testing

```typescript
describe('Underperformance Notifications', () => {
  it('should detect underperforming content', async () => {
    const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);
    expect(underperforming.length).toBeGreaterThan(0);
  });

  it('should send notification for underperforming content', async () => {
    await qualityScoringService.notifyPartnerOfLowQuality(partnerId, contentIds);
    // Verify notification was sent
  });

  it('should respect rate limits', async () => {
    // Send first notification
    await qualityScoringService.notifyPartnerOfLowQuality(partnerId, contentIds);
    
    // Try to send second notification same day
    const shouldSend = await shouldSendNotification(partnerId);
    expect(shouldSend).toBe(false);
  });
});
```

## Related Documentation

- [Quality Scoring Service README](./qualityScoringService.README.md)
- [Visibility Reduction Guide](./qualityScoringService.VISIBILITY_GUIDE.md)
- [Partner Analytics Dashboard](../../docs/partner-analytics.md)

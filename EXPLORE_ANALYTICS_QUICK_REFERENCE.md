# Explore Analytics - Quick Reference Guide

## Overview

The Explore Analytics system provides comprehensive engagement tracking and performance metrics for creators and administrators.

## API Endpoints

### 1. Get Video Analytics
```typescript
const analytics = await trpc.exploreAnalytics.getVideoAnalytics.query({
  videoId: 123,
  startDate: new Date('2024-01-01'), // Optional
  endDate: new Date('2024-12-31'),   // Optional
});

// Returns:
{
  videoId: 123,
  contentId: 456,
  totalViews: 1500,
  uniqueViewers: 850,
  totalWatchTime: 45000, // seconds
  averageWatchTime: 30,
  completionRate: 65.5, // percentage
  completions: 983,
  saves: 120,
  shares: 45,
  clicks: 230,
  skips: 85,
  engagementRate: 26.3, // percentage
  averageEngagementScore: 72.5 // 0-100
}
```

### 2. Get Creator Analytics
```typescript
const analytics = await trpc.exploreAnalytics.getCreatorAnalytics.query({
  creatorId: 789, // Optional, defaults to current user
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Returns:
{
  creatorId: 789,
  totalVideos: 25,
  totalViews: 50000,
  totalWatchTime: 1500000,
  averageCompletionRate: 68.2,
  totalSaves: 3500,
  totalShares: 890,
  totalClicks: 5600,
  engagementRate: 19.8,
  topPerformingVideos: [
    {
      contentId: 456,
      title: "Luxury Villa Tour",
      views: 5000,
      completionRate: 85.2,
      engagementScore: 89.5
    },
    // ... top 10 videos
  ]
}
```

### 3. Get Session Analytics
```typescript
const analytics = await trpc.exploreAnalytics.getSessionAnalytics.query({
  sessionId: 999,
});

// Returns:
{
  sessionId: 999,
  userId: 123,
  duration: 1800, // seconds
  videosViewed: 15,
  completions: 8,
  saves: 3,
  shares: 1,
  clicks: 5,
  averageWatchTime: 45,
  engagementRate: 60.0
}
```

### 4. Get Aggregated Metrics
```typescript
const metrics = await trpc.exploreAnalytics.getAggregatedMetrics.query({
  period: 'week', // 'day' | 'week' | 'month' | 'all'
  creatorId: 789, // Optional
});

// Returns:
{
  period: 'week',
  totalViews: 12000,
  totalUniqueViewers: 6500,
  totalWatchTime: 360000,
  averageSessionDuration: 1200,
  totalSessions: 3500,
  averageCompletionRate: 67.8,
  totalEngagements: 2400,
  engagementRate: 20.0
}
```

### 5. Get My Analytics Dashboard
```typescript
const dashboard = await trpc.exploreAnalytics.getMyAnalyticsDashboard.query({
  period: 'week', // 'day' | 'week' | 'month' | 'all'
});

// Returns:
{
  overview: {
    totalVideos: 25,
    totalViews: 50000,
    totalWatchTime: 1500000,
    averageCompletionRate: 68.2,
    engagementRate: 19.8
  },
  periodMetrics: {
    period: 'week',
    views: 12000,
    uniqueViewers: 6500,
    watchTime: 360000,
    sessions: 3500,
    averageSessionDuration: 1200,
    completionRate: 67.8,
    engagementRate: 20.0
  },
  topPerformingVideos: [...],
  engagement: {
    saves: 3500,
    shares: 890,
    clicks: 5600
  }
}
```

### 6. Record Engagement (Batch)
```typescript
await trpc.exploreApi.recordEngagementBatch.mutate({
  engagements: [
    {
      contentId: 456,
      engagementType: 'view',
      watchTime: 45,
      completed: true,
      sessionId: 999
    },
    {
      contentId: 457,
      engagementType: 'save',
      sessionId: 999
    },
    {
      contentId: 458,
      engagementType: 'skip',
      watchTime: 5,
      sessionId: 999
    }
  ]
});
```

## Engagement Types

| Type | Description | Tracked Metrics |
|------|-------------|-----------------|
| `view` | User viewed video | Watch time, completion |
| `save` | User saved property | Count |
| `share` | User shared video | Count |
| `click` | User clicked "View Listing" | Count |
| `skip` | User skipped video | Count (negative signal) |
| `complete` | User watched to end | Count (positive signal) |

## Engagement Score Calculation

The engagement score (0-100) is calculated using weighted metrics:

```
Completion Score: (completions / views) × 40
Save Score:       (saves / views) × 30
Share Score:      (shares / views) × 20
Click Score:      (clicks / views) × 10
Skip Penalty:     (skips / views) × -20

Total = Max(0, Min(100, sum))
```

**Interpretation:**
- **80-100**: Exceptional performance
- **60-79**: Strong performance
- **40-59**: Average performance
- **20-39**: Below average
- **0-19**: Poor performance

## Key Metrics Explained

### Completion Rate
Percentage of videos watched to the end.
```
Completion Rate = (Completions / Total Views) × 100
```

### Engagement Rate
Percentage of views that resulted in an action (save, share, or click).
```
Engagement Rate = ((Saves + Shares + Clicks) / Total Views) × 100
```

### Average Watch Time
Mean duration users spend watching videos.
```
Average Watch Time = Total Watch Time / Total Views
```

### Session Duration
Time spent in a single Explore session.
```
Session Duration = End Time - Start Time
```

## Frontend Integration Examples

### Creator Dashboard Component
```typescript
import { trpc } from '@/lib/trpc';

function CreatorDashboard() {
  const { data } = trpc.exploreAnalytics.getMyAnalyticsDashboard.useQuery({
    period: 'week'
  });

  return (
    <div>
      <h2>Overview</h2>
      <MetricCard 
        label="Total Views" 
        value={data?.overview.totalViews} 
      />
      <MetricCard 
        label="Engagement Rate" 
        value={`${data?.overview.engagementRate}%`} 
      />
      
      <h2>This Week</h2>
      <MetricCard 
        label="Views" 
        value={data?.periodMetrics.views} 
      />
      
      <h2>Top Performing Videos</h2>
      {data?.topPerformingVideos.map(video => (
        <VideoCard key={video.contentId} video={video} />
      ))}
    </div>
  );
}
```

### Video Analytics Component
```typescript
function VideoAnalytics({ videoId }: { videoId: number }) {
  const { data } = trpc.exploreAnalytics.getVideoAnalytics.useQuery({
    videoId,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  });

  return (
    <div>
      <h3>Performance</h3>
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Views" value={data?.totalViews} />
        <Metric label="Completion Rate" value={`${data?.completionRate}%`} />
        <Metric label="Engagement Score" value={data?.averageEngagementScore} />
      </div>
      
      <h3>Engagement</h3>
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Saves" value={data?.saves} />
        <Metric label="Shares" value={data?.shares} />
        <Metric label="Clicks" value={data?.clicks} />
      </div>
    </div>
  );
}
```

### Engagement Tracking Hook
```typescript
function useEngagementTracking(sessionId: number) {
  const recordEngagement = trpc.exploreApi.recordEngagementBatch.useMutation();
  
  const trackView = (contentId: number, watchTime: number, completed: boolean) => {
    recordEngagement.mutate({
      engagements: [{
        contentId,
        engagementType: 'view',
        watchTime,
        completed,
        sessionId
      }]
    });
  };
  
  const trackSave = (contentId: number) => {
    recordEngagement.mutate({
      engagements: [{
        contentId,
        engagementType: 'save',
        sessionId
      }]
    });
  };
  
  return { trackView, trackSave };
}
```

## Batch Update System

The engagement scores should be updated periodically using a cron job:

```typescript
// Run hourly
import { exploreAnalyticsService } from './services/exploreAnalyticsService';

async function updateEngagementScores() {
  await exploreAnalyticsService.batchUpdateEngagementScores();
  console.log('Engagement scores updated');
}

// Or via API (admin only)
await trpc.exploreAnalytics.batchUpdateEngagementScores.mutate();
```

## Performance Tips

1. **Use Date Ranges**: Always specify date ranges for large datasets
2. **Cache Results**: Cache analytics data on the frontend (5-10 minutes)
3. **Batch Engagements**: Record multiple engagements in a single call
4. **Periodic Updates**: Run batch updates hourly, not real-time
5. **Indexes**: Ensure database indexes on engagement tables

## Common Use Cases

### 1. Creator Performance Dashboard
Show creators their overall performance and top videos.
```typescript
const dashboard = await trpc.exploreAnalytics.getMyAnalyticsDashboard.query({
  period: 'month'
});
```

### 2. Video Performance Page
Show detailed analytics for a specific video.
```typescript
const analytics = await trpc.exploreAnalytics.getVideoAnalytics.query({
  videoId: 123
});
```

### 3. Platform-Wide Metrics (Admin)
Show aggregated metrics across all creators.
```typescript
const metrics = await trpc.exploreAnalytics.getAggregatedMetrics.query({
  period: 'week'
});
```

### 4. Comparative Analysis
Compare performance across different periods.
```typescript
const thisWeek = await trpc.exploreAnalytics.getAggregatedMetrics.query({
  period: 'week',
  creatorId: 789
});

const lastWeek = await trpc.exploreAnalytics.getAggregatedMetrics.query({
  period: 'week',
  creatorId: 789,
  startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
});
```

## Troubleshooting

### Low Engagement Scores
- Check completion rate (should be > 50%)
- Review skip rate (should be < 20%)
- Analyze watch time (should be > 50% of video duration)

### Missing Analytics
- Ensure engagements are being recorded
- Check session tracking is active
- Verify batch updates are running

### Slow Queries
- Add database indexes
- Use date range filters
- Implement caching layer
- Consider materialized views

---

**Last Updated**: December 6, 2024  
**Version**: 1.0

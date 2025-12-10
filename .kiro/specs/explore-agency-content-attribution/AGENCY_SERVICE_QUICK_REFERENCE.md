# ExploreAgencyService Quick Reference

## Overview

The `ExploreAgencyService` provides agency-level analytics and metrics for the Explore feed system. It aggregates performance data across all agency-attributed content and provides breakdowns by agent.

## Import

```typescript
import { exploreAgencyService } from '../services/exploreAgencyService';
```

## Methods

### getAgencyMetrics(agencyId: number)

Get comprehensive metrics for an agency including total content, views, engagements, agent breakdown, and top performing content.

**Parameters:**
- `agencyId` (number): The ID of the agency

**Returns:** `Promise<AgencyMetrics>`

```typescript
interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: TopContent[];
  agentBreakdown: AgentPerformance[];
}
```

**Example:**
```typescript
const metrics = await exploreAgencyService.getAgencyMetrics(123);
console.log(`Total content: ${metrics.totalContent}`);
console.log(`Total views: ${metrics.totalViews}`);
console.log(`Engagement rate: ${metrics.averageEngagementRate}%`);
```

**Caching:** Results are cached for 15 minutes

---

### getAgentBreakdown(agencyId: number)

Get performance breakdown by agent within an agency.

**Parameters:**
- `agencyId` (number): The ID of the agency

**Returns:** `Promise<AgentPerformance[]>`

```typescript
interface AgentPerformance {
  agentId: number;
  agentName: string;
  contentCount: number;
  totalViews: number;
  averagePerformanceScore: number;
}
```

**Example:**
```typescript
const breakdown = await exploreAgencyService.getAgentBreakdown(123);
breakdown.forEach(agent => {
  console.log(`${agent.agentName}: ${agent.contentCount} content, ${agent.totalViews} views`);
});
```

**Sorting:** Results are sorted by total views (descending)

---

### getTopPerformingContent(agencyId: number)

Get the top 10 performing content items for an agency.

**Parameters:**
- `agencyId` (number): The ID of the agency

**Returns:** `Promise<TopContent[]>`

```typescript
interface TopContent {
  id: number;
  title: string;
  contentType: string;
  viewCount: number;
  performanceScore: number;
  saveCount: number;
  shareCount: number;
}
```

**Example:**
```typescript
const topContent = await exploreAgencyService.getTopPerformingContent(123);
topContent.forEach((content, index) => {
  console.log(`#${index + 1}: ${content.title} - ${content.viewCount} views`);
});
```

**Limit:** Returns maximum 10 items  
**Sorting:** Ordered by performance score, then view count (descending)

---

### invalidateAgencyCache(agencyId: number)

Invalidate the cached metrics for an agency. Call this when agency content is updated.

**Parameters:**
- `agencyId` (number): The ID of the agency

**Returns:** `Promise<void>`

**Example:**
```typescript
// After publishing new content
await exploreAgencyService.invalidateAgencyCache(123);
```

**When to use:**
- After publishing new agency content
- After updating content metrics
- After deleting agency content
- When real-time data is required

---

## Usage Patterns

### Display Agency Dashboard

```typescript
async function displayAgencyDashboard(agencyId: number) {
  try {
    const metrics = await exploreAgencyService.getAgencyMetrics(agencyId);
    
    // Display overview
    console.log('=== Agency Overview ===');
    console.log(`Total Content: ${metrics.totalContent}`);
    console.log(`Total Views: ${metrics.totalViews}`);
    console.log(`Engagement Rate: ${metrics.averageEngagementRate.toFixed(2)}%`);
    
    // Display agent breakdown
    console.log('\n=== Agent Performance ===');
    metrics.agentBreakdown.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.agentName}`);
      console.log(`   Content: ${agent.contentCount} | Views: ${agent.totalViews}`);
    });
    
    // Display top content
    console.log('\n=== Top Performing Content ===');
    metrics.topPerformingContent.forEach((content, index) => {
      console.log(`${index + 1}. ${content.title}`);
      console.log(`   Views: ${content.viewCount} | Score: ${content.performanceScore}`);
    });
  } catch (error) {
    console.error('Error loading agency dashboard:', error);
  }
}
```

### Compare Agent Performance

```typescript
async function compareAgents(agencyId: number) {
  const breakdown = await exploreAgencyService.getAgentBreakdown(agencyId);
  
  // Find top performer
  const topAgent = breakdown[0];
  console.log(`Top performer: ${topAgent.agentName} with ${topAgent.totalViews} views`);
  
  // Calculate average
  const avgViews = breakdown.reduce((sum, a) => sum + a.totalViews, 0) / breakdown.length;
  console.log(`Average views per agent: ${avgViews.toFixed(0)}`);
  
  // Find agents below average
  const belowAverage = breakdown.filter(a => a.totalViews < avgViews);
  console.log(`${belowAverage.length} agents below average`);
}
```

### Monitor Content Performance

```typescript
async function monitorTopContent(agencyId: number) {
  const topContent = await exploreAgencyService.getTopPerformingContent(agencyId);
  
  // Calculate total engagement
  const totalEngagement = topContent.reduce(
    (sum, c) => sum + c.saveCount + c.shareCount, 
    0
  );
  
  console.log(`Top 10 content generated ${totalEngagement} engagements`);
  
  // Find content with high engagement rate
  const highEngagement = topContent.filter(c => {
    const engagementRate = ((c.saveCount + c.shareCount) / c.viewCount) * 100;
    return engagementRate > 10; // More than 10% engagement
  });
  
  console.log(`${highEngagement.length} pieces with >10% engagement rate`);
}
```

### Refresh Cache After Update

```typescript
async function publishAgencyContent(agencyId: number, contentData: any) {
  // Publish the content
  await publishContent(contentData);
  
  // Invalidate cache to ensure fresh data
  await exploreAgencyService.invalidateAgencyCache(agencyId);
  
  // Get updated metrics
  const metrics = await exploreAgencyService.getAgencyMetrics(agencyId);
  
  return metrics;
}
```

## Performance Notes

- **Caching:** Metrics are cached for 15 minutes to reduce database load
- **Parallel Queries:** The service uses `Promise.all()` to fetch metrics, breakdown, and top content in parallel
- **Efficient SQL:** Uses aggregation queries to minimize data transfer
- **Graceful Degradation:** Returns zero metrics for agencies with no content

## Error Handling

All methods throw errors that should be caught and handled:

```typescript
try {
  const metrics = await exploreAgencyService.getAgencyMetrics(agencyId);
  // Use metrics
} catch (error) {
  console.error('Failed to load agency metrics:', error);
  // Show error to user or use fallback data
}
```

## Integration Points

This service is designed to be consumed by:

1. **API Layer** (`exploreApiRouter.ts`)
   - `getAgencyAnalytics` endpoint

2. **Frontend Components**
   - Agency analytics dashboard
   - Agency profile pages
   - Admin analytics views

3. **Background Jobs**
   - Periodic metrics calculation
   - Report generation
   - Performance monitoring

## Requirements Coverage

- ✅ Requirement 3.1: Aggregate metrics across all agency content
- ✅ Requirement 3.2: Include view counts, engagement rates, and conversion metrics
- ✅ Requirement 3.3: Show trends over time (via top content)
- ✅ Requirement 3.4: Enable filtering by agent within agency

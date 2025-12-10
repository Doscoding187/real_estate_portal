# Agency Attribution API Endpoints - Quick Reference

## Overview

Three new tRPC endpoints have been added to support agency content attribution in the Explore feed system.

## Endpoints

### 1. getAgencyFeed

**Purpose:** Retrieve all published content attributed to a specific agency.

**Type:** Public (no authentication required)

**Usage:**
```typescript
const result = await trpc.explore.getAgencyFeed.query({
  agencyId: 123,
  includeAgentContent: true,  // optional, default: true
  limit: 20,                   // optional, default: 20
  offset: 0                    // optional, default: 0
});
```

**Parameters:**
- `agencyId` (required): The ID of the agency
- `includeAgentContent` (optional): Include content from agency agents (default: true)
- `limit` (optional): Number of items to return (1-50, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```typescript
{
  success: true,
  data: {
    shorts: ExploreShort[],
    feedType: 'agency',
    hasMore: boolean,
    offset: number,
    metadata: {
      agencyId: number,
      includeAgentContent: boolean
    }
  }
}
```

**Error Codes:**
- `404`: Agency not found
- `500`: Internal server error

---

### 2. getAgencyAnalytics

**Purpose:** Retrieve comprehensive analytics for an agency's Explore content.

**Type:** Protected (requires authentication and permission)

**Usage:**
```typescript
const result = await trpc.explore.getAgencyAnalytics.query({
  agencyId: 123,
  timeRange: '30d'  // optional, default: '30d'
});
```

**Parameters:**
- `agencyId` (required): The ID of the agency
- `timeRange` (optional): Time range for analytics ('7d', '30d', '90d', 'all', default: '30d')

**Response:**
```typescript
{
  success: true,
  data: {
    totalContent: number,
    totalViews: number,
    totalEngagements: number,
    averageEngagementRate: number,
    topPerformingContent: [
      {
        id: number,
        title: string,
        contentType: string,
        viewCount: number,
        performanceScore: number,
        saveCount: number,
        shareCount: number
      }
    ],
    agentBreakdown: [
      {
        agentId: number,
        agentName: string,
        contentCount: number,
        totalViews: number,
        averagePerformanceScore: number
      }
    ]
  }
}
```

**Permission Requirements:**
- User must be a super admin, OR
- User must be the agency owner, OR
- User must be an agent in the agency

**Error Codes:**
- `401`: Not authenticated
- `403`: Access denied to agency analytics
- `500`: Internal server error

---

### 3. getFeedByType

**Purpose:** Generic feed endpoint that routes to appropriate feed generator based on type.

**Type:** Public (no authentication required)

**Usage:**
```typescript
// Agency feed
const result = await trpc.explore.getFeedByType.query({
  feedType: 'agency',
  agencyId: 123,
  includeAgentContent: true,
  limit: 20,
  offset: 0
});

// Other feed types
const areaFeed = await trpc.explore.getFeedByType.query({
  feedType: 'area',
  location: 'Sandton'
});

const categoryFeed = await trpc.explore.getFeedByType.query({
  feedType: 'category',
  category: 'luxury_homes'
});
```

**Parameters:**
- `feedType` (required): Type of feed ('recommended', 'area', 'category', 'agent', 'developer', 'agency')
- `userId` (optional): User ID for personalized feeds
- `location` (optional): Location string (required for 'area' feed)
- `category` (optional): Category string (required for 'category' feed)
- `agentId` (optional): Agent ID (required for 'agent' feed)
- `developerId` (optional): Developer ID (required for 'developer' feed)
- `agencyId` (optional): Agency ID (required for 'agency' feed)
- `includeAgentContent` (optional): Include agent content for agency feeds (default: true)
- `limit` (optional): Number of items (1-50, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```typescript
{
  success: true,
  data: {
    shorts: ExploreShort[],
    feedType: string,
    hasMore: boolean,
    offset: number,
    metadata: Record<string, any>
  }
}
```

**Error Codes:**
- `400`: Missing required parameter for feed type
- `500`: Internal server error

---

## Frontend Integration Examples

### React Component - Agency Feed

```typescript
import { trpc } from '@/lib/trpc';

function AgencyFeed({ agencyId }: { agencyId: number }) {
  const { data, isLoading, error } = trpc.explore.getAgencyFeed.useQuery({
    agencyId,
    includeAgentContent: true,
    limit: 20,
    offset: 0
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.shorts.map(short => (
        <ShortCard key={short.id} short={short} />
      ))}
    </div>
  );
}
```

### React Component - Agency Analytics Dashboard

```typescript
import { trpc } from '@/lib/trpc';

function AgencyAnalyticsDashboard({ agencyId }: { agencyId: number }) {
  const { data, isLoading, error } = trpc.explore.getAgencyAnalytics.useQuery({
    agencyId,
    timeRange: '30d'
  });

  if (isLoading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const metrics = data?.data;

  return (
    <div>
      <h2>Agency Performance</h2>
      <div className="metrics-grid">
        <MetricCard 
          title="Total Content" 
          value={metrics?.totalContent} 
        />
        <MetricCard 
          title="Total Views" 
          value={metrics?.totalViews} 
        />
        <MetricCard 
          title="Engagement Rate" 
          value={`${metrics?.averageEngagementRate.toFixed(2)}%`} 
        />
      </div>

      <h3>Top Performing Content</h3>
      <ContentList items={metrics?.topPerformingContent} />

      <h3>Agent Breakdown</h3>
      <AgentTable agents={metrics?.agentBreakdown} />
    </div>
  );
}
```

### Infinite Scroll with Pagination

```typescript
import { trpc } from '@/lib/trpc';
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteAgencyFeed({ agencyId }: { agencyId: number }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading
  } = trpc.explore.getAgencyFeed.useInfiniteQuery(
    {
      agencyId,
      limit: 20
    },
    {
      getNextPageParam: (lastPage) => 
        lastPage.data.hasMore ? lastPage.data.offset : undefined
    }
  );

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.data.shorts.map(short => (
            <ShortCard key={short.id} short={short} />
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          Load More
        </button>
      )}
    </div>
  );
}
```

## Cache Behavior

### Agency Feed Cache
- **TTL:** 5 minutes (300 seconds)
- **Key Format:** `feed:agency:{agencyId}:{limit}:{offset}:{includeAgentContent}`
- **Invalidation:** Automatic on content publish/unpublish

### Agency Analytics Cache
- **TTL:** 15 minutes (900 seconds)
- **Key Format:** `agency:metrics:{agencyId}`
- **Invalidation:** Manual via `exploreAgencyService.invalidateAgencyCache(agencyId)`

## Testing Checklist

- [ ] Test getAgencyFeed with valid agency ID
- [ ] Test getAgencyFeed with invalid agency ID (expect 404)
- [ ] Test getAgencyFeed with includeAgentContent = false
- [ ] Test getAgencyFeed pagination (offset/limit)
- [ ] Test getAgencyAnalytics as agency owner
- [ ] Test getAgencyAnalytics as agent in agency
- [ ] Test getAgencyAnalytics as unauthorized user (expect 403)
- [ ] Test getAgencyAnalytics as super admin
- [ ] Test getFeedByType with all feed types
- [ ] Test getFeedByType with missing required parameters (expect 400)
- [ ] Verify cache behavior for repeated requests
- [ ] Test error handling for database failures

## Related Documentation

- [Task 4 Complete Summary](.kiro/specs/explore-agency-content-attribution/TASK_4_COMPLETE.md)
- [Agency Service Quick Reference](.kiro/specs/explore-agency-content-attribution/AGENCY_SERVICE_QUICK_REFERENCE.md)
- [Design Document](.kiro/specs/explore-agency-content-attribution/design.md)
- [Requirements Document](.kiro/specs/explore-agency-content-attribution/requirements.md)

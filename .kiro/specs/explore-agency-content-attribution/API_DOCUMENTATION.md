# Explore Agency Content Attribution - API Documentation

## Overview

This document provides comprehensive API documentation for the Explore Agency Content Attribution feature. The API enables agency-level content attribution, feed filtering, and analytics tracking.

**Base URL**: `/api/explore`

**Authentication**: Most endpoints require authentication via session cookies or JWT tokens.

---

## Endpoints

### 1. Get Agency Feed

Retrieve all published content attributed to a specific agency.

**Endpoint**: `POST /api/explore/getAgencyFeed`

**Authentication**: Public (no authentication required)

**Request Body**:
```typescript
{
  agencyId: number;              // Required: Agency ID to fetch content for
  includeAgentContent?: boolean; // Optional: Include individual agent content (default: true)
  limit?: number;                // Optional: Number of items per page (1-50, default: 20)
  offset?: number;               // Optional: Pagination offset (default: 0)
}
```

**Success Response** (200 OK):
```typescript
{
  success: true;
  data: {
    shorts: Array<{
      id: number;
      listingId?: number;
      developmentId?: number;
      agentId?: number;
      developerId?: number;
      agencyId?: number;
      contentType: string;
      title: string;
      caption?: string;
      mediaIds: string[];
      highlights?: string[];
      performanceScore: number;
      boostPriority: number;
      viewCount: number;
      isPublished: boolean;
      isFeatured: boolean;
      publishedAt?: string;
      createdAt: string;
      updatedAt: string;
    }>;
    feedType: 'agency';
    hasMore: boolean;
    offset: number;
    metadata: {
      agencyId: number;
      includeAgentContent: boolean;
    };
  };
}
```

**Error Responses**:

- **400 Bad Request**: Invalid input parameters
  ```json
  {
    "success": false,
    "error": "Invalid agency ID"
  }
  ```

- **404 Not Found**: Agency does not exist
  ```json
  {
    "success": false,
    "error": "Agency not found"
  }
  ```

- **500 Internal Server Error**: Server error
  ```json
  {
    "success": false,
    "error": "Internal server error"
  }
  ```

**Example Request**:
```typescript
const response = await fetch('/api/explore/getAgencyFeed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agencyId: 123,
    includeAgentContent: true,
    limit: 20,
    offset: 0
  })
});

const data = await response.json();
```

**Example using tRPC**:
```typescript
const { data } = await trpc.explore.getAgencyFeed.query({
  agencyId: 123,
  includeAgentContent: true,
  limit: 20,
  offset: 0
});
```

**Caching**: Results are cached for 5 minutes. Cache is invalidated when agency content is published or unpublished.

**Rate Limiting**: 100 requests per minute per IP address.

---

### 2. Get Agency Analytics

Retrieve comprehensive analytics and performance metrics for an agency's Explore content.

**Endpoint**: `POST /api/explore/getAgencyAnalytics`

**Authentication**: Required (user must have access to the agency)

**Request Body**:
```typescript
{
  agencyId: number;                           // Required: Agency ID
  timeRange?: '7d' | '30d' | '90d' | 'all';  // Optional: Time range (default: '30d')
}
```

**Success Response** (200 OK):
```typescript
{
  success: true;
  data: {
    totalContent: number;
    totalViews: number;
    totalEngagements: number;
    averageEngagementRate: number;
    topPerformingContent: Array<{
      id: number;
      title: string;
      contentType: string;
      viewCount: number;
      performanceScore: number;
      publishedAt: string;
    }>;
    agentBreakdown: Array<{
      agentId: number;
      agentName: string;
      contentCount: number;
      totalViews: number;
    }>;
  };
}
```

**Error Responses**:

- **400 Bad Request**: Invalid input parameters
  ```json
  {
    "success": false,
    "error": "Invalid time range"
  }
  ```

- **403 Forbidden**: User does not have access to agency analytics
  ```json
  {
    "success": false,
    "error": "Access denied to agency analytics"
  }
  ```

- **404 Not Found**: Agency does not exist
  ```json
  {
    "success": false,
    "error": "Agency not found"
  }
  ```

- **500 Internal Server Error**: Server error
  ```json
  {
    "success": false,
    "error": "Internal server error"
  }
  ```

**Example Request**:
```typescript
const response = await fetch('/api/explore/getAgencyAnalytics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    agencyId: 123,
    timeRange: '30d'
  })
});

const data = await response.json();
```

**Example using tRPC**:
```typescript
const { data } = await trpc.explore.getAgencyAnalytics.query({
  agencyId: 123,
  timeRange: '30d'
});
```

**Caching**: Results are cached for 15 minutes.

**Rate Limiting**: 50 requests per minute per user.

**Permission Requirements**:
- User must be the agency owner, OR
- User must be an admin in the agency, OR
- User must be an agent in the agency

---

### 3. Get Feed (Extended)

Retrieve content feed with support for agency feed type.

**Endpoint**: `POST /api/explore/getFeed`

**Authentication**: Public (no authentication required)

**Request Body**:
```typescript
{
  feedType: 'recommended' | 'area' | 'category' | 'agent' | 'developer' | 'agency';
  agencyId?: number;              // Required when feedType is 'agency'
  includeAgentContent?: boolean;  // Optional: For agency feeds only
  limit?: number;                 // Optional: Number of items (1-50, default: 20)
  offset?: number;                // Optional: Pagination offset (default: 0)
  // ... other feed-specific parameters
}
```

**Success Response** (200 OK):
```typescript
{
  success: true;
  data: {
    shorts: Array<ExploreShort>;
    feedType: string;
    hasMore: boolean;
    offset: number;
    metadata?: any;
  };
}
```

**Error Responses**:

- **400 Bad Request**: Invalid feed type or missing required parameters
  ```json
  {
    "success": false,
    "error": "Unknown feed type: invalid_type"
  }
  ```

- **400 Bad Request**: Missing agencyId for agency feed
  ```json
  {
    "success": false,
    "error": "Agency ID required for agency feed type"
  }
  ```

**Example Request**:
```typescript
const { data } = await trpc.explore.getFeed.query({
  feedType: 'agency',
  agencyId: 123,
  includeAgentContent: true,
  limit: 20,
  offset: 0
});
```

---

## Data Models

### ExploreShort

```typescript
interface ExploreShort {
  id: number;
  listingId?: number;
  developmentId?: number;
  agentId?: number;
  developerId?: number;
  agencyId?: number;              // NEW: Agency attribution
  contentType: string;
  title: string;
  caption?: string;
  mediaIds: string[];
  highlights?: string[];
  performanceScore: number;
  boostPriority: number;
  viewCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### ExploreContent

```typescript
interface ExploreContent {
  id: number;
  contentType: string;
  referenceId: number;
  creatorId?: number;
  creatorType: 'user' | 'agent' | 'developer' | 'agency';  // NEW
  agencyId?: number;              // NEW: Agency attribution
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  metadata?: any;
  tags?: string[];
  lifestyleCategories?: string[];
  priceMin?: number;
  priceMax?: number;
  viewCount: number;
  engagementScore: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### AgencyMetrics

```typescript
interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: Array<{
    id: number;
    title: string;
    contentType: string;
    viewCount: number;
    performanceScore: number;
    publishedAt: string;
  }>;
  agentBreakdown: Array<{
    agentId: number;
    agentName: string;
    contentCount: number;
    totalViews: number;
  }>;
}
```

---

## Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Invalid parameters, missing required fields |
| 403 | Forbidden | Insufficient permissions to access resource |
| 404 | Not Found | Agency or content does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database error, service unavailable |
| 503 | Service Unavailable | Temporary service outage |
| 504 | Gateway Timeout | Request took too long to process |

---

## Usage Examples

### Example 1: Display Agency Feed on Profile Page

```typescript
import { trpc } from '@/lib/trpc';
import { useInfiniteQuery } from '@tanstack/react-query';

function AgencyProfilePage({ agencyId }: { agencyId: number }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['agencyFeed', agencyId],
    queryFn: async ({ pageParam = 0 }) => {
      return await trpc.explore.getAgencyFeed.query({
        agencyId,
        includeAgentContent: true,
        limit: 20,
        offset: pageParam
      });
    },
    getNextPageParam: (lastPage) => 
      lastPage.data.hasMore ? lastPage.data.offset : undefined
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading feed</div>;

  return (
    <div>
      {data?.pages.map((page) => (
        page.data.shorts.map((short) => (
          <ContentCard key={short.id} content={short} />
        ))
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

### Example 2: Display Agency Analytics Dashboard

```typescript
import { trpc } from '@/lib/trpc';

function AgencyAnalyticsDashboard({ agencyId }: { agencyId: number }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const { data, isLoading, error } = trpc.explore.getAgencyAnalytics.useQuery({
    agencyId,
    timeRange
  });

  if (isLoading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Agency Performance</h2>
      
      <div className="metrics-grid">
        <MetricCard 
          title="Total Content" 
          value={data.data.totalContent} 
        />
        <MetricCard 
          title="Total Views" 
          value={data.data.totalViews} 
        />
        <MetricCard 
          title="Engagement Rate" 
          value={`${(data.data.averageEngagementRate * 100).toFixed(1)}%`} 
        />
      </div>

      <h3>Top Performing Content</h3>
      <ContentList items={data.data.topPerformingContent} />

      <h3>Agent Breakdown</h3>
      <AgentTable agents={data.data.agentBreakdown} />
    </div>
  );
}
```

### Example 3: Filter Explore Feed by Agency

```typescript
import { trpc } from '@/lib/trpc';

function ExplorePage() {
  const [selectedAgency, setSelectedAgency] = useState<number | null>(null);
  
  const { data, isLoading } = trpc.explore.getFeed.useQuery({
    feedType: selectedAgency ? 'agency' : 'recommended',
    agencyId: selectedAgency || undefined,
    limit: 20,
    offset: 0
  });

  return (
    <div>
      <AgencySelector 
        value={selectedAgency}
        onChange={setSelectedAgency}
      />
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FeedGrid items={data?.data.shorts || []} />
      )}
    </div>
  );
}
```

---

## Performance Considerations

### Caching Strategy

- **Agency Feed**: Cached for 5 minutes
- **Agency Analytics**: Cached for 15 minutes
- **Cache Invalidation**: Automatic on content publish/unpublish

### Query Optimization

All agency queries use optimized indexes:

```sql
-- Agency feed queries
CREATE INDEX idx_explore_shorts_agency_published 
  ON explore_shorts(agency_id, is_published, published_at DESC);

-- Analytics queries
CREATE INDEX idx_explore_shorts_agency_performance 
  ON explore_shorts(agency_id, performance_score DESC, view_count DESC);
```

### Rate Limiting

- Public endpoints: 100 requests/minute per IP
- Authenticated endpoints: 50 requests/minute per user
- Analytics endpoints: 20 requests/minute per user

---

## Security

### Authentication

Protected endpoints require valid session cookies or JWT tokens. Include credentials in requests:

```typescript
// Using fetch
fetch('/api/explore/getAgencyAnalytics', {
  credentials: 'include',
  // ...
});

// tRPC handles this automatically
```

### Authorization

Agency analytics access requires one of:
- Agency owner
- Agency admin
- Agent in the agency

### Data Validation

All inputs are validated using Zod schemas:

```typescript
const getAgencyFeedInput = z.object({
  agencyId: z.number().positive(),
  includeAgentContent: z.boolean().default(true),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0)
});
```

---

## Migration Notes

### Breaking Changes

None. This feature is fully backward compatible.

### New Fields

- `explore_shorts.agency_id`: Nullable foreign key to agencies table
- `explore_content.creator_type`: ENUM with default 'user'
- `explore_content.agency_id`: Nullable foreign key to agencies table

### Existing Content

Content created before this feature will have:
- `agency_id`: NULL
- `creator_type`: 'user' (default)

All queries handle NULL values gracefully.

---

## Support

For issues or questions:
- Check the [Migration Guide](./MIGRATION_GUIDE.md)
- Review [Troubleshooting](./MIGRATION_GUIDE.md#troubleshooting)
- Contact the development team

---

**Last Updated**: December 2025  
**API Version**: 1.0.0

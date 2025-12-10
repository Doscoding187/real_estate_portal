# Design Document: Explore Agency Content Attribution

## Overview

This design implements agency-level content attribution for the Explore feed system. The solution adds `agencyId` fields to both content tables, implements agency feed filtering, and extends the API to support agency-specific queries. The design prioritizes backward compatibility while enabling new agency-centric features.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Agency Feed  │  │ Agency       │  │ Content      │      │
│  │ Component    │  │ Profile      │  │ Upload       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (tRPC)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  exploreApiRouter                                     │   │
│  │  - getAgencyFeed()                                    │   │
│  │  - getAgencyAnalytics()                               │   │
│  │  - getFeed() [extended]                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ExploreFeedService                                   │   │
│  │  - getAgencyFeed(agencyId, options)                  │   │
│  │  - getRecommendedFeed() [updated]                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ExploreAnalyticsService                              │   │
│  │  - getAgencyMetrics(agencyId)                        │   │
│  │  - aggregateAgencyPerformance()                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ explore_     │  │ explore_     │  │ agencies     │      │
│  │ shorts       │  │ content      │  │              │      │
│  │ + agencyId   │  │ + agencyId   │  │              │      │
│  │              │  │ + creatorType│  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Extensions

#### explore_shorts Table
```sql
ALTER TABLE explore_shorts 
ADD COLUMN agency_id INT NULL AFTER developer_id,
ADD INDEX idx_explore_shorts_agency_id (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
```

#### explore_content Table
```sql
ALTER TABLE explore_content
ADD COLUMN creator_type ENUM('user', 'agent', 'developer', 'agency') 
    NOT NULL DEFAULT 'user' AFTER creator_id,
ADD COLUMN agency_id INT NULL AFTER creator_type,
ADD INDEX idx_explore_content_creator_type (creator_type),
ADD INDEX idx_explore_content_agency (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
ADD FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 2. Service Layer Extensions

#### ExploreFeedService

```typescript
interface AgencyFeedOptions extends FeedOptions {
  agencyId: number;
  includeAgentContent?: boolean; // Include individual agent content
}

class ExploreFeedService {
  /**
   * Get agency-specific feed
   * Shows all content attributed to an agency
   */
  async getAgencyFeed(options: AgencyFeedOptions): Promise<FeedResult> {
    const { agencyId, limit = 20, offset = 0, includeAgentContent = true } = options;
    
    // Check cache
    const cacheKey = CacheKeys.agencyFeed(agencyId, limit, offset);
    const cached = await cache.get<FeedResult>(cacheKey);
    if (cached) return cached;
    
    // Build query
    let query = db
      .select()
      .from(exploreShorts)
      .where(
        and(
          eq(exploreShorts.isPublished, 1),
          or(
            eq(exploreShorts.agencyId, agencyId),
            includeAgentContent 
              ? inAgencyAgents(agencyId) 
              : sql`false`
          )
        )
      )
      .orderBy(
        desc(exploreShorts.isFeatured),
        desc(exploreShorts.publishedAt)
      )
      .limit(limit)
      .offset(offset);
    
    const shorts = await query;
    
    const result: FeedResult = {
      shorts: shorts.map(transformShort),
      feedType: 'agency',
      hasMore: shorts.length === limit,
      offset: offset + shorts.length,
      metadata: {
        agencyId,
        includeAgentContent
      }
    };
    
    // Cache result
    await cache.set(cacheKey, result, CacheTTL.FEED);
    
    return result;
  }
  
  /**
   * Helper to check if agent belongs to agency
   */
  private async inAgencyAgents(agencyId: number) {
    return sql`agent_id IN (
      SELECT id FROM agents WHERE agency_id = ${agencyId}
    )`;
  }
}
```

#### ExploreAnalyticsService

```typescript
interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: any[];
  agentBreakdown: {
    agentId: number;
    agentName: string;
    contentCount: number;
    totalViews: number;
  }[];
}

class ExploreAnalyticsService {
  /**
   * Get comprehensive agency metrics
   */
  async getAgencyMetrics(agencyId: number): Promise<AgencyMetrics> {
    // Aggregate metrics from all agency content
    const metrics = await db
      .select({
        totalContent: sql<number>`COUNT(*)`,
        totalViews: sql<number>`SUM(view_count)`,
        totalEngagements: sql<number>`SUM(
          save_count + share_count + skip_count
        )`,
      })
      .from(exploreShorts)
      .where(eq(exploreShorts.agencyId, agencyId));
    
    // Get agent breakdown
    const agentBreakdown = await db
      .select({
        agentId: exploreShorts.agentId,
        agentName: sql<string>`CONCAT(a.first_name, ' ', a.last_name)`,
        contentCount: sql<number>`COUNT(*)`,
        totalViews: sql<number>`SUM(es.view_count)`,
      })
      .from(exploreShorts)
      .leftJoin(agents, eq(exploreShorts.agentId, agents.id))
      .where(eq(exploreShorts.agencyId, agencyId))
      .groupBy(exploreShorts.agentId);
    
    // Get top performing content
    const topContent = await db
      .select()
      .from(exploreShorts)
      .where(eq(exploreShorts.agencyId, agencyId))
      .orderBy(desc(exploreShorts.performanceScore))
      .limit(10);
    
    return {
      ...metrics[0],
      averageEngagementRate: calculateEngagementRate(metrics[0]),
      topPerformingContent: topContent,
      agentBreakdown
    };
  }
}
```

### 3. API Router Extensions

```typescript
export const exploreApiRouter = router({
  /**
   * Get agency feed
   * Requirements 2.1-2.5: Agency feed filtering
   */
  getAgencyFeed: publicProcedure
    .input(
      z.object({
        agencyId: z.number(),
        includeAgentContent: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const feed = await exploreFeedService.getAgencyFeed(input);
      
      return {
        success: true,
        data: feed
      };
    }),
  
  /**
   * Get agency analytics
   * Requirements 3.1-3.5: Agency analytics integration
   */
  getAgencyAnalytics: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d')
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to agency analytics
      await verifyAgencyAccess(ctx.user.id, input.agencyId);
      
      const metrics = await exploreAnalyticsService.getAgencyMetrics(
        input.agencyId
      );
      
      return {
        success: true,
        data: metrics
      };
    }),
  
  /**
   * Update existing getFeed to support agency type
   */
  getFeed: publicProcedure
    .input(
      z.object({
        feedType: z.enum([
          'recommended', 
          'area', 
          'category', 
          'agent', 
          'developer',
          'agency' // NEW
        ]),
        agencyId: z.number().optional(),
        // ... other existing fields
      })
    )
    .query(async ({ input }) => {
      return await exploreFeedService.getFeed(input.feedType, input);
    }),
});
```

## Data Models

### Extended Content Models

```typescript
// shared/types.ts

export type FeedType = 
  | 'recommended' 
  | 'area' 
  | 'category' 
  | 'agent' 
  | 'developer'
  | 'agency'; // NEW

export type CreatorType = 'user' | 'agent' | 'developer' | 'agency';

export interface ExploreShort {
  id: number;
  listingId?: number;
  developmentId?: number;
  agentId?: number;
  developerId?: number;
  agencyId?: number; // NEW
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

export interface ExploreContent {
  id: number;
  contentType: string;
  referenceId: number;
  creatorId?: number;
  creatorType: CreatorType; // NEW
  agencyId?: number; // NEW
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

export interface AgencyFeedMetadata {
  agencyId: number;
  agencyName: string;
  agencyLogo?: string;
  isVerified: boolean;
  totalContent: number;
  includeAgentContent: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Agency Attribution Consistency
*For any* content record with an agencyId, querying by that agencyId should return that content in the results
**Validates: Requirements 1.2, 1.3**

### Property 2: Feed Type Routing
*For any* valid feed type including 'agency', the getFeed method should route to the appropriate handler without errors
**Validates: Requirements 2.1, 8.1**

### Property 3: Backward Compatibility
*For any* existing content without agencyId, queries should return valid results with NULL agency fields
**Validates: Requirements 7.1, 7.2, 7.4**

### Property 4: Foreign Key Integrity
*For any* content with agencyId, the referenced agency must exist in the agencies table
**Validates: Requirements 4.4, 10.5**

### Property 5: Creator Type Validation
*For any* content record, if creatorType is 'agency', then agencyId must be non-NULL
**Validates: Requirements 6.5**

### Property 6: Agency Feed Pagination
*For any* agency feed query with limit N, the result should contain at most N items and hasMore should be true if more items exist
**Validates: Requirements 2.2, 2.3**

### Property 7: Cache Invalidation
*For any* agency content update, the agency feed cache should be invalidated
**Validates: Requirements 2.5**

### Property 8: Analytics Aggregation
*For any* agency, the sum of agent content metrics should equal or be less than total agency metrics
**Validates: Requirements 3.1, 3.2**

### Property 9: Permission Enforcement
*For any* agency analytics request, the user must have permission to view that agency's data
**Validates: Requirements 3.4**

### Property 10: Migration Idempotency
*For any* database state, running the migration script multiple times should produce the same final schema
**Validates: Requirements 7.5**

## Error Handling

### Database Errors
- **Foreign Key Violation**: Return 400 with message "Invalid agency ID"
- **NULL Constraint Violation**: Return 400 with message "Creator type requires agency ID"
- **Connection Timeout**: Retry up to 3 times, then return 503

### API Errors
- **Invalid Agency ID**: Return 404 with message "Agency not found"
- **Unauthorized Access**: Return 403 with message "Access denied to agency analytics"
- **Invalid Feed Type**: Return 400 with message "Unknown feed type: {type}"

### Service Errors
- **Cache Miss**: Fall back to database query
- **Empty Results**: Return empty array with appropriate metadata
- **Query Timeout**: Return 504 with message "Request timeout, please try again"

## Testing Strategy

### Unit Tests
- Test `getAgencyFeed()` with valid agency ID
- Test `getAgencyFeed()` with invalid agency ID
- Test `getAgencyMetrics()` aggregation logic
- Test creator type validation
- Test foreign key constraint enforcement

### Property-Based Tests
- **Property 1**: Generate random content with agencyId, verify retrieval
- **Property 3**: Generate content without agencyId, verify backward compatibility
- **Property 4**: Attempt to create content with non-existent agencyId, verify rejection
- **Property 6**: Generate random pagination parameters, verify result counts
- **Property 10**: Run migration multiple times, verify schema consistency

### Integration Tests
- Test end-to-end agency feed flow
- Test agency analytics calculation
- Test cache invalidation on content update
- Test permission enforcement for analytics
- Test migration rollback

### Performance Tests
- Benchmark agency feed queries with 1000+ content items
- Benchmark analytics aggregation with 100+ agents
- Test cache hit rates for agency feeds
- Measure query performance with and without indexes

## Migration Strategy

### Phase 1: Schema Migration
1. Add `agency_id` column to `explore_shorts` (nullable)
2. Add indexes for agency queries
3. Add foreign key constraints
4. Verify no data loss

### Phase 2: Service Layer
1. Implement `getAgencyFeed()` method
2. Update `getFeed()` to support 'agency' type
3. Add cache keys for agency feeds
4. Deploy service changes

### Phase 3: API Layer
1. Add `getAgencyFeed` endpoint
2. Add `getAgencyAnalytics` endpoint
3. Update API documentation
4. Deploy API changes

### Phase 4: Frontend Integration
1. Create agency feed component
2. Add agency filter to explore page
3. Integrate agency analytics dashboard
4. Deploy frontend changes

### Phase 5: Data Backfill (Optional)
1. Identify content from agency agents
2. Backfill `agency_id` for historical content
3. Verify data integrity
4. Update analytics

## Performance Considerations

### Indexing Strategy
```sql
-- Primary indexes for agency queries
CREATE INDEX idx_explore_shorts_agency_published 
  ON explore_shorts(agency_id, is_published, published_at DESC);

CREATE INDEX idx_explore_content_agency_active 
  ON explore_content(agency_id, is_active, created_at DESC);

-- Composite index for analytics
CREATE INDEX idx_explore_shorts_agency_performance 
  ON explore_shorts(agency_id, performance_score DESC, view_count DESC);
```

### Caching Strategy
- Cache agency feeds for 5 minutes
- Cache agency metrics for 15 minutes
- Invalidate on content publish/unpublish
- Use Redis for distributed caching

### Query Optimization
- Use covering indexes where possible
- Limit JOIN operations
- Paginate large result sets
- Use query result caching

## Security Considerations

### Access Control
- Verify agency ownership before allowing attribution changes
- Enforce role-based access for agency analytics
- Audit all agency-related operations
- Rate limit agency feed requests

### Data Validation
- Validate agency ID exists before insertion
- Validate creator type matches creator ID
- Sanitize all user inputs
- Prevent SQL injection through parameterized queries

## Rollback Plan

### Database Rollback
```sql
-- Remove foreign keys
ALTER TABLE explore_shorts DROP FOREIGN KEY explore_shorts_ibfk_agency;
ALTER TABLE explore_content DROP FOREIGN KEY explore_content_ibfk_agency;

-- Remove indexes
DROP INDEX idx_explore_shorts_agency_id ON explore_shorts;
DROP INDEX idx_explore_content_agency ON explore_content;
DROP INDEX idx_explore_content_creator_type ON explore_content;

-- Remove columns
ALTER TABLE explore_shorts DROP COLUMN agency_id;
ALTER TABLE explore_content DROP COLUMN agency_id;
ALTER TABLE explore_content DROP COLUMN creator_type;
```

### Service Rollback
- Revert to previous service version
- Clear agency feed caches
- Remove agency feed type from routing

### API Rollback
- Remove agency endpoints
- Revert getFeed input schema
- Update API documentation

# Agency Content Attribution - Architecture Diagram

## Database Schema Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENCIES TABLE                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ id (PK)                                                   │   │
│  │ name                                                      │   │
│  │ slug                                                      │   │
│  │ is_verified                                               │   │
│  │ ...                                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              │ FK: agency_id
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        │                                           │
┌───────▼──────────────────────┐      ┌────────────▼─────────────────┐
│   EXPLORE_SHORTS TABLE       │      │   EXPLORE_CONTENT TABLE      │
│  ┌──────────────────────┐    │      │  ┌──────────────────────┐    │
│  │ id (PK)              │    │      │  │ id (PK)              │    │
│  │ listing_id           │    │      │  │ content_type         │    │
│  │ development_id       │    │      │  │ reference_id         │    │
│  │ agent_id             │    │      │  │ creator_id           │    │
│  │ developer_id         │    │      │  │ creator_type ✨NEW   │    │
│  │ agency_id ✨NEW      │    │      │  │ agency_id ✨NEW      │    │
│  │ content_type         │    │      │  │ title                │    │
│  │ title                │    │      │  │ description          │    │
│  │ caption              │    │      │  │ view_count           │    │
│  │ media_ids            │    │      │  │ engagement_score     │    │
│  │ performance_score    │    │      │  │ is_active            │    │
│  │ view_count           │    │      │  │ is_featured          │    │
│  │ is_published         │    │      │  │ created_at           │    │
│  │ published_at         │    │      │  │ updated_at           │    │
│  │ ...                  │    │      │  │ ...                  │    │
│  └──────────────────────┘    │      │  └──────────────────────┘    │
│                               │      │                               │
│  Indexes:                     │      │  Indexes:                     │
│  • idx_agency_id ✨          │      │  • idx_creator_type ✨       │
│  • idx_agency_published ✨   │      │  • idx_agency_id ✨          │
│  • idx_agency_performance ✨ │      │  • idx_agency_active ✨      │
└───────────────────────────────┘      └───────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Agency Feed  │  │ Agency       │  │ Content      │          │
│  │ Component    │  │ Profile      │  │ Upload       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (tRPC)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  exploreApiRouter                                         │   │
│  │  • getAgencyFeed(agencyId, options)                      │   │
│  │  • getAgencyAnalytics(agencyId, timeRange)               │   │
│  │  • getFeed(feedType: 'agency', agencyId)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ExploreFeedService                                       │   │
│  │  • getAgencyFeed(agencyId, options)                      │   │
│  │    - Query by agency_id                                  │   │
│  │    - Filter by is_published                              │   │
│  │    - Order by published_at                               │   │
│  │    - Cache results (5 min TTL)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ExploreAnalyticsService                                  │   │
│  │  • getAgencyMetrics(agencyId)                            │   │
│  │    - Aggregate view counts                               │   │
│  │    - Calculate engagement rates                          │   │
│  │    - Get agent breakdown                                 │   │
│  │    - Get top performing content                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ explore_     │  │ explore_     │  │ agencies     │          │
│  │ shorts       │  │ content      │  │              │          │
│  │ + agency_id  │  │ + agency_id  │  │              │          │
│  │              │  │ + creator_   │  │              │          │
│  │              │  │   type       │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Query Optimization Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                   AGENCY FEED QUERY                              │
│                                                                   │
│  SELECT * FROM explore_shorts                                    │
│  WHERE agency_id = ?                                             │
│    AND is_published = 1                                          │
│  ORDER BY published_at DESC                                      │
│  LIMIT 20 OFFSET 0;                                              │
│                                                                   │
│  Uses Index: idx_explore_shorts_agency_published                 │
│  ✅ Covers: agency_id, is_published, published_at               │
│  ⚡ Performance: O(log n) lookup + sequential scan               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 AGENCY ANALYTICS QUERY                           │
│                                                                   │
│  SELECT                                                          │
│    COUNT(*) as total_content,                                    │
│    SUM(view_count) as total_views,                               │
│    AVG(performance_score) as avg_performance                     │
│  FROM explore_shorts                                             │
│  WHERE agency_id = ?;                                            │
│                                                                   │
│  Uses Index: idx_explore_shorts_agency_performance               │
│  ✅ Covers: agency_id, performance_score, view_count            │
│  ⚡ Performance: O(log n) lookup + aggregation                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                AGENCY CONTENT QUERY                              │
│                                                                   │
│  SELECT * FROM explore_content                                   │
│  WHERE agency_id = ?                                             │
│    AND is_active = 1                                             │
│  ORDER BY created_at DESC                                        │
│  LIMIT 20;                                                       │
│                                                                   │
│  Uses Index: idx_explore_content_agency_active                   │
│  ✅ Covers: agency_id, is_active, created_at                    │
│  ⚡ Performance: O(log n) lookup + sequential scan               │
└─────────────────────────────────────────────────────────────────┘
```

## Content Attribution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONTENT UPLOAD FLOW                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Agent uploads   │
                    │ content         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Check agent's   │
                    │ agency_id from  │
                    │ agents table    │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
          ┌─────────────────┐  ┌─────────────────┐
          │ Has agency?     │  │ No agency?      │
          │ agency_id = X   │  │ agency_id = NULL│
          └────────┬────────┘  └────────┬────────┘
                   │                    │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Create content  │
                   │ with agency_id  │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Content appears │
                   │ in agency feed  │
                   └─────────────────┘
```

## Type System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TYPE DEFINITIONS                            │
└─────────────────────────────────────────────────────────────────┘

CreatorType = 'user' | 'agent' | 'developer' | 'agency'
                │         │          │            │
                │         │          │            │
                ▼         ▼          ▼            ▼
         ┌──────────────────────────────────────────┐
         │        ExploreContent                     │
         │  {                                        │
         │    creatorType: CreatorType               │
         │    creatorId?: number                     │
         │    agencyId?: number                      │
         │    ...                                    │
         │  }                                        │
         └──────────────────────────────────────────┘

FeedType = 'recommended' | 'area' | 'category' | 'agent' | 'developer' | 'agency'
                                                                            │
                                                                            ▼
                                                                  ┌─────────────────┐
                                                                  │ Agency Feed     │
                                                                  │ Component       │
                                                                  └─────────────────┘
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHE LAYERS                                │
└─────────────────────────────────────────────────────────────────┘

Request: getAgencyFeed(agencyId: 1, limit: 20, offset: 0)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ L1: Memory Cache (Redis)                                         │
│ Key: agency_feed:1:20:0                                          │
│ TTL: 5 minutes                                                   │
│ Hit? ──YES──> Return cached result                              │
│  │                                                               │
│  NO                                                              │
└──┼──────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ L2: Database Query                                               │
│ Query: SELECT * FROM explore_shorts                              │
│        WHERE agency_id = 1 AND is_published = 1                  │
│        ORDER BY published_at DESC LIMIT 20                       │
│ Index: idx_explore_shorts_agency_published                       │
└──┬──────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Cache Result                                                     │
│ Store in Redis with 5 min TTL                                   │
│ Return to client                                                 │
└─────────────────────────────────────────────────────────────────┘

Cache Invalidation Triggers:
• Content published/unpublished
• Content updated
• Agency information changed
```

---

**Legend:**
- ✨ NEW - New field or index added by this migration
- ▲ - Foreign key relationship
- ▼ - Data flow direction
- ⚡ - Performance optimization

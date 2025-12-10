# Explore Feed Content Sourcing Analysis

## Current State

The Explore feed currently pulls content from **two main tables** with different approaches to creator attribution:

### 1. **explore_shorts** Table (Property Explore Shorts)
This is the primary content source for the Explore feed and has **explicit creator fields**:

```typescript
{
  agentId: int("agent_id"),           // Links to agents table
  developerId: int("developer_id"),   // Links to developers table
  listingId: int("listing_id"),       // Links to properties table
  developmentId: int("development_id") // Links to developments table
}
```

**Content Types Supported:**
- `property_tour` - Property listings from agents
- `development_promo` - Development projects from developers
- `agent_intro` - Agent introduction videos
- `neighbourhood_tour` - Neighbourhood content
- `market_insight` - Market analysis content
- `lifestyle` - Lifestyle content
- `education` - Educational content

**Feed Service Methods:**
- ✅ `getAgentFeed(agentId)` - Filters by `agentId`
- ✅ `getDeveloperFeed(developerId)` - Filters by `developerId`
- ✅ `getRecommendedFeed()` - Uses boost priority and performance score
- ✅ `getAreaFeed(location)` - Filters by location via JOIN with listings/developments
- ✅ `getCategoryFeed(category)` - Filters by highlight tags

### 2. **explore_content** Table (Discovery Engine)
This is the newer unified content table with a **generic creator field**:

```typescript
{
  creatorId: int("creator_id"),  // Generic link to users table
  contentType: varchar("content_type", { length: 50 }),
  referenceId: int("reference_id")
}
```

**Problem:** The `creatorId` field references the `users` table but doesn't distinguish between:
- Regular users
- Agents (users with agent profiles)
- Developers (users with developer profiles)
- Agencies (organization-level creators)

## Gap Analysis

### ❌ Missing: Agency-Level Content Attribution

**Current Limitation:**
- No `agencyId` field in either table
- Agencies cannot be credited as content creators
- Cannot filter content by agency
- Cannot show "All content from XYZ Agency"

**Impact:**
- Agencies with multiple agents cannot showcase their brand
- No agency-level analytics for Explore content
- Missing revenue opportunity for agency-branded content

### ⚠️ Inconsistent: Creator Attribution Model

**explore_shorts** uses specific creator types:
```typescript
agentId: int
developerId: int
```

**explore_content** uses generic creator:
```typescript
creatorId: int  // Could be anyone in users table
```

**Problem:**
- Need to JOIN with agents/developers tables to determine creator type
- No direct way to query "all content from agents" vs "all content from developers"
- Performance overhead for creator type resolution

## Recommendations

### Option 1: Add Agency Support to explore_shorts (Recommended)
**Pros:**
- Minimal changes to existing working system
- Clear separation of creator types
- Easy to query and filter

**Changes Needed:**
```sql
ALTER TABLE explore_shorts 
ADD COLUMN agency_id INT NULL,
ADD INDEX idx_explore_shorts_agency_id (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
```

**Service Updates:**
```typescript
// Add to ExploreFeedService
async getAgencyFeed(options: FeedOptions): Promise<FeedResult> {
  const { agencyId, limit = 20, offset = 0 } = options;
  
  const shorts = await db
    .select()
    .from(exploreShorts)
    .where(
      and(
        eq(exploreShorts.agencyId, agencyId),
        eq(exploreShorts.isPublished, 1)
      )
    )
    .orderBy(desc(exploreShorts.publishedAt))
    .limit(limit)
    .offset(offset);
    
  return {
    shorts: shorts.map(transformShort),
    feedType: 'agency',
    hasMore: shorts.length === limit,
    offset: offset + shorts.length,
    metadata: { agencyId }
  };
}
```

### Option 2: Enhance explore_content with Creator Type
**Pros:**
- More flexible for future creator types
- Unified content model

**Cons:**
- Requires migration of existing explore_shorts data
- More complex queries
- Breaking change to existing API

**Changes Needed:**
```sql
ALTER TABLE explore_content
ADD COLUMN creator_type ENUM('user', 'agent', 'developer', 'agency') NOT NULL DEFAULT 'user',
ADD COLUMN agency_id INT NULL,
ADD INDEX idx_explore_content_creator_type (creator_type),
ADD INDEX idx_explore_content_agency (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
```

### Option 3: Hybrid Approach (Most Flexible)
Keep both tables but ensure consistency:

1. **explore_shorts** - Keep as-is, add `agencyId`
2. **explore_content** - Add `creatorType` and `agencyId` fields
3. Create a unified view/service layer that abstracts the differences

## Current Feed Routing

```typescript
// server/services/exploreFeedService.ts
async getFeed(feedType: FeedType, options: FeedOptions): Promise<FeedResult> {
  switch (feedType) {
    case 'recommended': return this.getRecommendedFeed(options);
    case 'area':        return this.getAreaFeed(options);
    case 'category':    return this.getCategoryFeed(options);
    case 'agent':       return this.getAgentFeed(options);      // ✅ Exists
    case 'developer':   return this.getDeveloperFeed(options);  // ✅ Exists
    // case 'agency':   return this.getAgencyFeed(options);     // ❌ Missing
    default: throw new Error(`Unknown feed type: ${feedType}`);
  }
}
```

## Action Items

### Immediate (Quick Win)
1. ✅ Add `agencyId` column to `explore_shorts` table
2. ✅ Add `getAgencyFeed()` method to `ExploreFeedService`
3. ✅ Add `'agency'` to `FeedType` union in shared types
4. ✅ Update API router to support agency feed filtering

### Short-term (Consistency)
1. Add `creatorType` and `agencyId` to `explore_content` table
2. Create migration to backfill creator types based on existing data
3. Update recommendation engine to consider creator types

### Long-term (Enhancement)
1. Create unified creator profile system
2. Add agency-level analytics dashboard
3. Implement agency-branded content features
4. Add agency boost campaigns

## Database Schema Additions

```sql
-- Add to explore_shorts
ALTER TABLE explore_shorts 
ADD COLUMN agency_id INT NULL AFTER developer_id,
ADD INDEX idx_explore_shorts_agency_id (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;

-- Add to explore_content
ALTER TABLE explore_content
ADD COLUMN creator_type ENUM('user', 'agent', 'developer', 'agency') NOT NULL DEFAULT 'user' AFTER creator_id,
ADD COLUMN agency_id INT NULL AFTER creator_type,
ADD INDEX idx_explore_content_creator_type (creator_type),
ADD INDEX idx_explore_content_agency (agency_id),
ADD FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;

-- Update foreign key for creator_id to be more explicit
ALTER TABLE explore_content
ADD FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;
```

## Summary

**Current State:**
- ✅ Agent content is properly attributed and filterable
- ✅ Developer content is properly attributed and filterable
- ❌ Agency content has no attribution mechanism
- ⚠️ Generic users can create content but no type distinction

**Recommended Next Steps:**
1. Add `agencyId` to both content tables
2. Implement `getAgencyFeed()` service method
3. Add agency feed type to API router
4. Consider adding `creatorType` enum for better querying

This will enable agencies to:
- Be credited for content created by their agents
- Have agency-branded Explore feeds
- Track agency-level performance metrics
- Run agency-level boost campaigns

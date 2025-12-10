# Implementation Plan: Explore Agency Content Attribution

## Phase 1: Database Schema Updates

- [x] 1. Create database migration files





  - Create migration SQL for explore_shorts table
  - Create migration SQL for explore_content table
  - Create rollback SQL scripts
  - Add migration runner TypeScript file
  - _Requirements: 4.1, 4.2, 4.3, 7.5_

- [x] 1.1 Add agency_id to explore_shorts table


  - Add nullable agency_id column
  - Create index on agency_id
  - Add foreign key constraint to agencies table
  - Verify no data loss after migration
  - _Requirements: 1.2, 4.1_

- [x] 1.2 Add agency fields to explore_content table

  - Add creator_type ENUM column with default 'user'
  - Add nullable agency_id column
  - Create index on creator_type
  - Create index on agency_id
  - Add foreign key constraints
  - _Requirements: 1.2, 4.1, 6.1_

- [x] 1.3 Create composite indexes for performance

  - Create agency_published index on explore_shorts
  - Create agency_active index on explore_content
  - Create agency_performance index for analytics
  - Test query performance with indexes
  - _Requirements: Performance optimization_

- [x] 1.4 Update Drizzle schema definitions


  - Update exploreShorts schema with agencyId field
  - Update exploreContent schema with creatorType and agencyId
  - Export updated types
  - Regenerate schema types
  - _Requirements: 4.1, 4.2_

## Phase 2: Service Layer Implementation

- [x] 2. Extend ExploreFeedService





  - Add getAgencyFeed method
  - Update getFeed routing to support 'agency' type
  - Add agency feed caching logic
  - Add helper methods for agency queries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Implement getAgencyFeed method

  - Accept agencyId and pagination parameters
  - Query explore_shorts by agency_id
  - Support includeAgentContent option
  - Order by featured status and recency
  - Return FeedResult with agency metadata
  - _Requirements: 2.1, 2.2, 2.3_


- [x] 2.2 Add agency feed caching

  - Create CacheKeys.agencyFeed helper
  - Implement cache-first strategy
  - Set TTL to 5 minutes
  - Add cache invalidation on content updates
  - _Requirements: 2.5, Performance_


- [x] 2.3 Update feed routing logic


  - Add 'agency' case to getFeed switch statement
  - Validate agencyId when feedType is 'agency'
  - Pass options to getAgencyFeed
  - Handle errors gracefully
  - _Requirements: 2.1, 8.1_

- [x] 3. Create ExploreAgencyService





  - Implement getAgencyMetrics method
  - Implement getAgentBreakdown method
  - Implement getTopPerformingContent method
  - Add analytics caching
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.1 Implement agency metrics aggregation


  - Query total content count by agency
  - Aggregate view counts across agency content
  - Calculate engagement metrics
  - Compute average engagement rate
  - Return structured metrics object
  - _Requirements: 3.1, 3.2_

- [x] 3.2 Implement agent breakdown analytics

  - Query content grouped by agent within agency
  - Join with agents table for agent names
  - Calculate per-agent metrics
  - Sort by performance
  - _Requirements: 3.4_

- [x] 3.3 Implement top content retrieval

  - Query agency content ordered by performance score
  - Limit to top 10 items
  - Include full content details
  - Cache results
  - _Requirements: 3.3_

## Phase 3: API Layer Extensions

- [x] 4. Extend exploreApiRouter





  - Add getAgencyFeed endpoint
  - Add getAgencyAnalytics endpoint
  - Update getFeed input schema
  - Add permission checks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4.1 Implement getAgencyFeed endpoint


  - Define input schema with Zod
  - Call exploreFeedService.getAgencyFeed
  - Handle errors with appropriate status codes
  - Return standardized response format
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4.2 Implement getAgencyAnalytics endpoint

  - Define input schema with timeRange parameter
  - Add protectedProcedure for authentication
  - Verify user has agency access
  - Call exploreAgencyService.getAgencyMetrics
  - Return analytics data
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1_

- [x] 4.3 Update getFeed endpoint


  - Add 'agency' to feedType enum
  - Add optional agencyId parameter
  - Route to appropriate service method
  - Maintain backward compatibility
  - _Requirements: 2.1, 7.2, 7.3_

- [x] 4.4 Add permission verification

  - Create verifyAgencyAccess helper
  - Check user is agency owner or admin
  - Check user is agent in agency
  - Return 403 for unauthorized access
  - _Requirements: 3.4, Security_

## Phase 4: Type Definitions and Shared Code

- [x] 5. Update shared types





  - Add 'agency' to FeedType union
  - Create CreatorType type
  - Extend ExploreShort interface
  - Extend ExploreContent interface
  - Create AgencyFeedMetadata interface
  - Create AgencyMetrics interface
  - _Requirements: 1.3, 6.1_


- [x] 5.1 Update FeedType definition

  - Add 'agency' to type union
  - Export from shared/types.ts
  - Update all FeedType usages
  - _Requirements: 2.1, 8.1_


- [x] 5.2 Create CreatorType definition

  - Define as 'user' | 'agent' | 'developer' | 'agency'
  - Add to ExploreContent interface
  - Export from shared/types.ts
  - _Requirements: 6.1, 6.2_

- [x] 5.3 Extend content interfaces


  - Add agencyId?: number to ExploreShort
  - Add creatorType: CreatorType to ExploreContent
  - Add agencyId?: number to ExploreContent
  - Update all interface usages
  - _Requirements: 1.3, 4.2_

## Phase 5: Content Upload Attribution

- [x] 6. Update content upload flow





  - Detect agent's agency affiliation
  - Auto-populate agencyId field
  - Add agency attribution toggle
  - Validate agency relationships
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.1 Add agency detection to upload service


  - Query agent's agency_id from agents table
  - Set agencyId in content creation
  - Handle independent agents (no agency)
  - Log attribution decisions
  - _Requirements: 10.1, 10.2_


- [x] 6.2 Add agency attribution validation

  - Verify agent belongs to specified agency
  - Verify agency exists and is active
  - Prevent invalid agency attribution
  - Return clear error messages
  - _Requirements: 10.5, 4.4_


- [x] 6.3 Update upload UI components

  - Show agency attribution status
  - Add opt-out checkbox for agents
  - Display agency logo/name
  - Update form validation
  - _Requirements: 10.3, 10.4_

## Phase 6: Frontend Components

- [x] 7. Create agency feed components





  - Create AgencyFeedPage component
  - Create AgencyContentCard component
  - Create AgencyHeader component
  - Add agency filter to explore page
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.1 Implement AgencyFeedPage



  - Use useAgencyFeed hook
  - Display agency profile header
  - Render content grid/list
  - Add pagination controls
  - Handle loading and error states
  - _Requirements: 9.1, 9.2_

- [x] 7.2 Create useAgencyFeed hook


  - Call trpc.explore.getAgencyFeed
  - Implement infinite scroll
  - Handle cache invalidation
  - Return feed data and loading state
  - _Requirements: 2.1, 2.2_

- [x] 7.3 Implement AgencyHeader component


  - Display agency logo and name
  - Show verification badge if verified
  - Display total content count
  - Show engagement metrics
  - Add follow button
  - _Requirements: 9.3, 9.4_


- [x] 7.4 Add agency filter to explore

  - Add agency selector dropdown
  - Filter content by selected agency
  - Update URL with agency parameter
  - Clear filter option
  - _Requirements: 2.1, 9.5_

- [x] 8. Create agency analytics dashboard





  - Create AgencyAnalyticsDashboard component
  - Create AgencyMetricsCards component
  - Create AgentBreakdownTable component
  - Create TopContentList component
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8.1 Implement AgencyAnalyticsDashboard


  - Use useAgencyAnalytics hook
  - Display metrics overview
  - Show agent breakdown
  - Display top performing content
  - Add time range selector
  - _Requirements: 3.1, 3.3_


- [x] 8.2 Create useAgencyAnalytics hook

  - Call trpc.explore.getAgencyAnalytics
  - Handle permission errors
  - Cache analytics data
  - Return metrics and loading state
  - _Requirements: 3.1, 3.4_

- [x] 8.3 Implement metrics visualization



  - Create metric cards for key stats
  - Add trend indicators
  - Create agent performance table
  - Add top content carousel
  - _Requirements: 3.2, 3.3, 3.4_

## Phase 7: Testing

- [x] 9. Write unit tests








  - Test getAgencyFeed with valid agency ID
  - Test getAgencyFeed with invalid agency ID
  - Test getAgencyMetrics aggregation
  - Test creator type validation
  - Test foreign key constraints
  - _Requirements: All_

- [x] 10. Write integration tests





  - Test end-to-end agency feed flow
  - Test agency analytics calculation
  - Test cache invalidation
  - Test permission enforcement
  - Test migration and rollback
  - _Requirements: All_

- [ ]* 10.1 Write property-based test for agency attribution consistency
  - **Property 1: Agency Attribution Consistency**
  - **Validates: Requirements 1.2, 1.3**
  - Generate random content with agencyId
  - Query by agencyId
  - Verify content appears in results

- [ ]* 10.2 Write property-based test for backward compatibility
  - **Property 3: Backward Compatibility**
  - **Validates: Requirements 7.1, 7.2, 7.4**
  - Generate content without agencyId
  - Query content
  - Verify NULL agency fields handled gracefully

- [ ]* 10.3 Write property-based test for foreign key integrity
  - **Property 4: Foreign Key Integrity**
  - **Validates: Requirements 4.4, 10.5**
  - Attempt to create content with non-existent agencyId
  - Verify rejection with appropriate error

- [ ]* 10.4 Write property-based test for pagination
  - **Property 6: Agency Feed Pagination**
  - **Validates: Requirements 2.2, 2.3**
  - Generate random pagination parameters
  - Query agency feed
  - Verify result count and hasMore flag

- [ ]* 10.5 Write property-based test for migration idempotency
  - **Property 10: Migration Idempotency**
  - **Validates: Requirements 7.5**
  - Run migration multiple times
  - Verify schema consistency

## Phase 8: Documentation and Deployment

- [x] 11. Update documentation





  - Document new API endpoints
  - Update database schema docs
  - Create migration guide
  - Add usage examples
  - _Requirements: 8.5_


- [x] 11.1 Create API documentation

  - Document getAgencyFeed endpoint
  - Document getAgencyAnalytics endpoint
  - Add request/response examples
  - Document error codes
  - _Requirements: 8.5_


- [x] 11.2 Create migration guide

  - Document migration steps
  - Add rollback instructions
  - Include testing checklist
  - Add troubleshooting section
  - _Requirements: 7.5_

- [x] 12. Deploy to production





  - Run database migrations
  - Deploy backend services
  - Deploy frontend changes
  - Monitor for errors
  - Verify functionality
  - _Requirements: All_


- [x] 12.1 Execute database migration

  - Backup production database
  - Run migration script
  - Verify schema changes
  - Test queries
  - Monitor performance
  - _Requirements: 4.1, 4.2, 4.3_


- [x] 12.2 Deploy backend services
  - Deploy service layer changes
  - Deploy API router changes
  - Clear caches
  - Monitor error rates
  - Verify endpoints
  - _Requirements: 2.1, 4.1_


- [x] 12.3 Deploy frontend changes
  - Build production bundle
  - Deploy to CDN
  - Clear browser caches
  - Test user flows
  - Monitor analytics
  - _Requirements: 7.1, 8.1_

## Phase 9: Data Backfill (Optional)

- [x] 13. Backfill historical data





  - Identify content from agency agents
  - Create backfill script
  - Run backfill in batches
  - Verify data integrity
  - Update analytics
  - _Requirements: 1.4, 7.1_


- [x] 13.1 Create backfill script

  - Query agents with agency_id
  - Find their explore content
  - Update content with agency_id
  - Log all changes
  - Add dry-run mode
  - _Requirements: 1.4_


- [x] 13.2 Execute backfill

  - Run in dry-run mode first
  - Review proposed changes
  - Execute in small batches
  - Monitor for errors
  - Verify results
  - _Requirements: 1.4, 7.1_

## Checkpoint

- [x] 14. Final verification





  - Ensure all tests pass
  - Verify all requirements met
  - Check performance metrics
  - Review security measures
  - Confirm documentation complete
  - Ask user if questions arise

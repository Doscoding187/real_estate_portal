# Integration Tests for Explore Agency Content Attribution

## Overview

This directory contains integration tests for the Explore Agency Content Attribution feature. These tests verify the complete end-to-end functionality including:

- **End-to-end agency feed flow**: Complete workflow from content creation to feed retrieval
- **Agency analytics calculation**: Comprehensive metrics aggregation and agent breakdown
- **Cache invalidation**: Cache behavior and invalidation strategies
- **Permission enforcement**: Access control for agency analytics
- **Migration and rollback**: Database schema integrity and foreign key constraints

## Running the Tests

### Prerequisites

1. **Database Connection**: Set the `DATABASE_URL` environment variable to your MySQL database connection string:
   ```bash
   export DATABASE_URL="mysql://user:password@host:port/database"
   ```

2. **Run Migration**: Ensure the Agency Attribution migration has been executed:
   ```bash
   npm run db:migrate
   # or
   node scripts/run-agency-attribution-migration.ts
   ```

### Execute Tests

Run integration tests:
```bash
npm test -- server/services/__tests__/exploreAgencyAttribution.integration.test.ts --run
```

Run with watch mode (for development):
```bash
npm test -- server/services/__tests__/exploreAgencyAttribution.integration.test.ts
```

Run all agency attribution tests (unit + integration):
```bash
npm test -- server/services/__tests__/exploreAgency --run
```

## Test Coverage

### Integration Test 1: End-to-end Agency Feed Flow
**Requirements: 1.2, 2.1, 2.2, 2.3, 8.1, 8.2**

Tests the complete workflow:
1. Create agency
2. Create agents in agency
3. Create content attributed to agency and agents
4. Retrieve agency feed with and without agent content
5. Verify content ordering (featured first, then by date)
6. Verify pagination works correctly

### Integration Test 2: Agency Analytics Calculation
**Requirements: 3.1, 3.2, 3.3, 3.4**

Tests comprehensive analytics:
1. Create agency with multiple agents
2. Create content with various performance metrics
3. Calculate agency metrics
4. Verify total content count, views, and engagements
5. Verify agent breakdown is correct
6. Verify top content is ranked by performance score

### Integration Test 3: Cache Invalidation
**Requirements: 2.5, Performance**

Tests caching behavior:
1. Retrieve agency feed (should cache)
2. Retrieve again (should hit cache)
3. Add new content
4. Verify cache still returns old data
5. Invalidate cache
6. Verify fresh data is fetched
7. Test metrics caching separately

### Integration Test 4: Permission Enforcement
**Requirements: 3.4, Security**

Tests access control:
1. Create agency with owner
2. Create agent in agency
3. Create unrelated user
4. Create super admin user
5. Verify database relationships for access control
6. Verify owner has access
7. Verify agent has access
8. Verify unrelated user has no access
9. Verify super admin has access

### Integration Test 5: Migration and Rollback
**Requirements: 4.1, 4.2, 4.3, 7.5**

Tests database schema:
1. Verify `agency_id` column exists in `explore_shorts`
2. Verify `creator_type` and `agency_id` columns exist in `explore_content`
3. Verify indexes are created correctly
4. Verify foreign key constraints exist
5. Test data integrity with agency attribution
6. Test NULL `agency_id` handling
7. Test foreign key ON DELETE SET NULL behavior

## Test Behavior

- **Without DATABASE_URL**: Tests will be skipped with a warning message
- **With DATABASE_URL but no migration**: Tests will fail with table/column not found errors
- **With DATABASE_URL and migration**: All tests will execute and verify functionality

## Cleanup

All tests clean up their test data automatically in the `afterAll` and `afterEach` hooks. Test data is prefixed with `TEST:INTEGRATION:` to avoid conflicts with production data.

## Requirements Validated

These integration tests validate the following requirements from the Agency Content Attribution specification:

- **Requirement 1.2**: Agency content attribution storage
- **Requirement 2.1-2.5**: Agency feed filtering and caching
- **Requirement 3.1-3.4**: Agency analytics integration
- **Requirement 4.1-4.3**: Multi-table agency support
- **Requirement 7.5**: Migration and rollback capability
- **Requirement 8.1-8.3**: API endpoint functionality
- **Security**: Permission enforcement for analytics access

## Related Files

- Unit Tests: `server/services/__tests__/exploreAgencyAttribution.test.ts`
- Service Tests: `server/services/__tests__/exploreAgencyService.test.ts`
- Migration: `drizzle/migrations/add-agency-attribution.sql`
- Rollback: `drizzle/migrations/rollback-agency-attribution.sql`
- Design Document: `.kiro/specs/explore-agency-content-attribution/design.md`
- Requirements: `.kiro/specs/explore-agency-content-attribution/requirements.md`

## Troubleshooting

### Tests are skipped
- Ensure `DATABASE_URL` environment variable is set
- Verify database is accessible

### Column not found errors
- Run the migration: `node scripts/run-agency-attribution-migration.ts`
- Verify migration completed successfully

### Foreign key constraint errors
- Ensure `agencies` table exists
- Verify foreign key constraints are enabled in MySQL

### Cache-related test failures
- Ensure Redis is running if using Redis cache
- Check cache configuration in `server/lib/cache.ts`

## Performance Considerations

Integration tests interact with a real database and may take longer than unit tests. Expected execution time:
- With database: 5-10 seconds
- Without database (skipped): < 1 second

For faster development, run unit tests first, then integration tests before committing.

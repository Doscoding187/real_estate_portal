# Explore Agency Content Attribution - Unit Tests

## Overview

This directory contains comprehensive unit tests for the Explore Agency Content Attribution feature. The tests verify all core functionality including agency feed generation, metrics aggregation, creator type validation, and foreign key constraints.

## Test Coverage

### Test File: `exploreAgencyAttribution.test.ts`

This file contains 18 unit tests organized into 7 test suites:

#### 1. getAgencyFeed with valid agency ID (3 tests)
- **should return published shorts for valid agency**
  - Tests: Requirements 2.1, 2.2, 2.3, 8.1, 8.2
  - Verifies: Agency feed returns published content, ordered by featured status then recency
  - Validates: Pagination metadata and feed structure

- **should support includeAgentContent option**
  - Tests: Requirements 2.1, 2.2
  - Verifies: Agency feed can include/exclude content from agency agents
  - Validates: Content filtering based on includeAgentContent flag

- **should handle pagination correctly**
  - Tests: Requirements 2.2, 2.3
  - Verifies: Pagination works correctly with limit and offset
  - Validates: No overlap between pages, hasMore flag accuracy

#### 2. getAgencyFeed with invalid agency ID (2 tests)
- **should return empty results for non-existent agency**
  - Tests: Requirements 8.3, Error Handling
  - Verifies: Graceful handling of non-existent agency IDs
  - Validates: Empty result set with appropriate metadata

- **should throw error when agencyId is missing**
  - Tests: Requirements 8.1, Error Handling
  - Verifies: Proper error thrown when required parameter is missing
  - Validates: Error message clarity

#### 3. getAgencyMetrics aggregation (4 tests)
- **should aggregate metrics correctly**
  - Tests: Requirements 3.1, 3.2
  - Verifies: Metrics aggregation across all agency content
  - Validates: Total content, views, engagements, engagement rate

- **should return zero metrics for agency with no content**
  - Tests: Requirements 3.1, 3.2
  - Verifies: Proper handling of agencies with no content
  - Validates: Zero values for all metrics

- **should return agent breakdown correctly**
  - Tests: Requirements 3.4
  - Verifies: Per-agent metrics within agency
  - Validates: Agent performance sorting and data structure

- **should return top performing content**
  - Tests: Requirements 3.3
  - Verifies: Top 10 content items by performance score
  - Validates: Sorting by performance score descending

#### 4. Creator type validation (2 tests)
- **should accept valid agency attribution**
  - Tests: Requirements 6.1, 6.2
  - Verifies: Content can be attributed to agencies
  - Validates: Agency ID storage and retrieval

- **should handle NULL agency_id gracefully**
  - Tests: Requirements 7.1, 7.2, 7.4
  - Verifies: Backward compatibility with content without agency attribution
  - Validates: NULL values handled correctly

#### 5. Foreign key constraints (3 tests)
- **should allow valid agency_id references**
  - Tests: Requirements 4.4, 10.5
  - Verifies: Valid agency references are accepted
  - Validates: Foreign key relationship integrity

- **should reject invalid agency_id references**
  - Tests: Requirements 4.4, 10.5
  - Verifies: Invalid agency references are rejected (when FK constraints enabled)
  - Validates: Error handling for constraint violations

- **should handle agency deletion with SET NULL**
  - Tests: Requirements 4.4, Data Integrity
  - Verifies: Content persists when agency is deleted
  - Validates: CASCADE behavior (SET NULL)

#### 6. Feed type routing (2 tests)
- **should route to agency feed correctly**
  - Tests: Requirements 2.1, 8.1
  - Verifies: getFeed method routes to agency feed handler
  - Validates: Feed type metadata and routing logic

- **should throw error when agencyId is missing for agency feed**
  - Tests: Requirements 8.1, Error Handling
  - Verifies: Required parameter validation in routing
  - Validates: Error message clarity

#### 7. Backward compatibility (2 tests)
- **should handle content without agency_id**
  - Tests: Requirements 7.1, 7.2, 7.4
  - Verifies: Legacy content without agency attribution still works
  - Validates: NULL agency fields don't break queries

- **should not break existing feed types**
  - Tests: Requirements 7.1, 7.2, 7.3
  - Verifies: All existing feed types (recommended, area, category) still work
  - Validates: No regression in existing functionality

## Running the Tests

### Prerequisites

1. **Database Connection**: Set the `DATABASE_URL` environment variable to your MySQL database connection string:
   ```bash
   export DATABASE_URL="mysql://user:password@host:port/database"
   ```

2. **Run Migration**: Ensure the agency attribution migration has been executed:
   ```bash
   npm run db:migrate
   # or
   node scripts/run-agency-attribution-migration.ts
   ```

### Execute Tests

Run all agency attribution tests:
```bash
npm test -- server/services/__tests__/exploreAgencyAttribution.test.ts --run
```

Run with watch mode (for development):
```bash
npm test -- server/services/__tests__/exploreAgencyAttribution.test.ts
```

Run all service tests:
```bash
npm test -- server/services/__tests__/ --run
```

### Test Behavior

- **Without DATABASE_URL**: Tests will skip gracefully with a warning message
- **With DATABASE_URL but no migration**: Tests will fail with table not found errors
- **With DATABASE_URL and migration**: All tests will execute and verify functionality

## Test Data Management

All tests follow these conventions:

- **Test Data Prefix**: All test data uses the prefix `TEST:UNIT:` to avoid conflicts with production data
- **Automatic Cleanup**: Tests clean up their data in `beforeEach` and `afterAll` hooks
- **Isolation**: Each test creates its own test data to ensure independence
- **No Side Effects**: Tests do not modify existing production data

## Requirements Validated

These tests validate the following requirements from the Explore Agency Content Attribution specification:

- **Requirement 1.2**: Agency content attribution storage
- **Requirement 1.3**: Agency attribution information retrieval
- **Requirement 2.1**: Agency feed filtering
- **Requirement 2.2**: Agency feed ordering
- **Requirement 2.3**: Agency feed pagination
- **Requirement 2.5**: Agency feed caching
- **Requirement 3.1**: Agency metrics aggregation
- **Requirement 3.2**: Agency performance calculation
- **Requirement 3.3**: Top performing content display
- **Requirement 3.4**: Agent breakdown analytics
- **Requirement 4.4**: Foreign key validation
- **Requirement 6.1**: Creator type distinction
- **Requirement 6.2**: Creator type filtering
- **Requirement 7.1**: Backward compatibility with existing content
- **Requirement 7.2**: Backward compatibility with existing queries
- **Requirement 7.4**: NULL field handling
- **Requirement 8.1**: API endpoint routing
- **Requirement 8.2**: API response format
- **Requirement 8.3**: Error handling
- **Requirement 10.5**: Agency relationship validation

## Related Files

- **Service Implementation**: `server/services/exploreFeedService.ts`
- **Agency Service**: `server/services/exploreAgencyService.ts`
- **Migration**: `drizzle/migrations/add-agency-attribution.sql`
- **Rollback**: `drizzle/migrations/rollback-agency-attribution.sql`
- **Design Document**: `.kiro/specs/explore-agency-content-attribution/design.md`
- **Requirements**: `.kiro/specs/explore-agency-content-attribution/requirements.md`
- **Tasks**: `.kiro/specs/explore-agency-content-attribution/tasks.md`

## Test Maintenance

When updating the agency attribution feature:

1. **Add New Tests**: Create tests for new functionality following the existing patterns
2. **Update Existing Tests**: Modify tests if behavior changes
3. **Run Tests**: Ensure all tests pass before committing changes
4. **Update Documentation**: Keep this README in sync with test changes

## Troubleshooting

### Tests Skip with "Database not available"
- **Cause**: DATABASE_URL environment variable not set
- **Solution**: Set DATABASE_URL to your database connection string

### Tests Fail with "Tables not found"
- **Cause**: Migration not run
- **Solution**: Run `node scripts/run-agency-attribution-migration.ts`

### Tests Fail with Foreign Key Errors
- **Cause**: Foreign key constraints may not be enabled in your MySQL configuration
- **Solution**: This is expected behavior - the tests document actual FK behavior

### Tests Timeout
- **Cause**: Database connection issues or slow queries
- **Solution**: Check database connectivity and query performance

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add database availability checks at the start of each test
3. Clean up test data in beforeEach and afterAll hooks
4. Use descriptive test names that explain what is being tested
5. Include requirement references in test comments
6. Update this README with new test coverage information

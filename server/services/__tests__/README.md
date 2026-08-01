# Explore Discovery Engine Database Schema Tests

> **Historical test documentation — not database authority.** Do not execute
> legacy migration commands named in historical material. Database setup for
> tests must use the canonical test lifecycle and migration README.

## Overview

This directory contains unit tests for the Explore Discovery Engine database schema. The tests verify:

- **Table Creation and Constraints**: All required tables exist with correct column structures
- **Spatial Index Functionality**: Location-based queries work efficiently with proper indexes
- **Foreign Key Relationships**: Referential integrity is maintained across tables
- **Index Verification**: All performance indexes are properly created
- **Data Integrity**: JSON data storage and default values work correctly

## Running the Tests

### Prerequisites

1. **Database setup**: Use the canonical test lifecycle and migration README;
   do not set connection strings manually and do not run a feature-specific
   migration runner from this document.

### Execute Tests

Run all schema tests:
```bash
npm test -- server/services/__tests__/exploreDiscoverySchema.test.ts --run
```

Run with watch mode (for development):
```bash
npm test -- server/services/__tests__/exploreDiscoverySchema.test.ts
```

## Test Coverage

### Table Creation and Constraints (11 tests)
- ✅ explore_content table structure
- ✅ explore_discovery_videos table structure
- ✅ explore_neighbourhoods table structure
- ✅ explore_user_preferences_new table structure
- ✅ explore_feed_sessions table structure
- ✅ explore_engagements table structure
- ✅ explore_boost_campaigns table structure
- ✅ explore_saved_properties table structure
- ✅ explore_neighbourhood_follows table structure
- ✅ explore_creator_follows table structure
- ✅ explore_categories table structure

### Spatial Index Functionality (5 tests)
- ✅ Location indexes on explore_content
- ✅ Location indexes on explore_neighbourhoods
- ✅ Location-based queries on explore_content
- ✅ Location-based queries on explore_neighbourhoods
- ✅ Efficient location + engagement score queries

### Foreign Key Relationships (8 tests)
- ✅ Foreign key from explore_content to users
- ✅ Foreign key from explore_discovery_videos to explore_content
- ✅ Cascade delete from explore_content to explore_discovery_videos
- ✅ Foreign key from explore_engagements to explore_content
- ✅ Foreign key from explore_boost_campaigns to users and explore_content
- ✅ Unique constraint on explore_neighbourhoods slug
- ✅ Unique constraint on explore_user_preferences_new user_id
- ✅ Unique constraint on explore_saved_properties (user_id, content_id)

### Index Verification (7 tests)
- ✅ Indexes on explore_content table
- ✅ Indexes on explore_discovery_videos table
- ✅ Indexes on explore_neighbourhoods table
- ✅ Indexes on explore_user_preferences_new table
- ✅ Indexes on explore_feed_sessions table
- ✅ Indexes on explore_engagements table
- ✅ Indexes on explore_boost_campaigns table

### Data Integrity (2 tests)
- ✅ JSON data storage and retrieval
- ✅ Default values handling

## Test Behavior

- The canonical test lifecycle owns target selection, schema setup, and demo
  data. This document does not authorize direct database access.

## Cleanup

All tests clean up their test data automatically in the `afterAll` hook. Test data is prefixed with `TEST:` to avoid conflicts with production data.

## Requirements Validated

These tests validate the following requirements from the Explore Discovery Engine specification:

- **Requirement 1.1**: Video feed display and navigation
- **Requirement 2.1**: Personalized property recommendations
- **Requirement 3.1**: Interactive map with property feed

## Related Files

- Runtime schema authority: `drizzle/schema/`
- Database setup authority: `docs/database-authority/00-database-authority-agent-entry.md`

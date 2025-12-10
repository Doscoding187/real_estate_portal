# Requirements Document: Explore Agency Content Attribution

## Introduction

This feature adds agency-level content attribution to the Explore feed system, enabling agencies to be credited as content creators alongside agents and developers. This fills a critical gap where agencies with multiple agents cannot showcase their brand or track agency-level performance metrics.

## Glossary

- **Agency**: An organization entity in the system that manages multiple agents
- **Content Creator**: An entity (user, agent, developer, or agency) that creates Explore content
- **Explore Content**: Videos, property tours, and other media in the Explore feed
- **Agency Feed**: A filtered view showing all content attributed to a specific agency
- **Content Attribution**: The process of linking content to its creator entity

## Requirements

### Requirement 1: Agency Content Attribution

**User Story:** As an agency owner, I want my agency to be credited for content created by our agents, so that we can build our brand presence in the Explore feed.

#### Acceptance Criteria

1. WHEN an agent creates Explore content, THE system SHALL allow attribution to their associated agency
2. WHEN content is attributed to an agency, THE system SHALL store the agency ID alongside the content
3. WHEN querying content, THE system SHALL return agency attribution information
4. WHEN an agent leaves an agency, THE system SHALL maintain historical agency attribution for their past content
5. THE system SHALL support content attributed to both individual agents and their agencies simultaneously

### Requirement 2: Agency Feed Filtering

**User Story:** As a user browsing Explore, I want to view all content from a specific agency, so that I can discover properties from agencies I trust.

#### Acceptance Criteria

1. WHEN a user requests an agency feed, THE system SHALL return all published content attributed to that agency
2. WHEN displaying agency feed results, THE system SHALL order content by featured status then recency
3. WHEN paginating agency feed results, THE system SHALL support limit and offset parameters
4. WHEN an agency has no content, THE system SHALL return an empty result set with appropriate metadata
5. THE system SHALL cache agency feed results for performance optimization

### Requirement 3: Agency Analytics Integration

**User Story:** As an agency owner, I want to track performance metrics for all our agency's Explore content, so that I can measure our marketing effectiveness.

#### Acceptance Criteria

1. WHEN viewing agency analytics, THE system SHALL aggregate metrics across all agency-attributed content
2. WHEN calculating agency performance, THE system SHALL include view counts, engagement rates, and conversion metrics
3. WHEN displaying agency analytics, THE system SHALL show trends over time
4. WHEN comparing performance, THE system SHALL enable filtering by agent within the agency
5. THE system SHALL update agency analytics in real-time as content performance changes

### Requirement 4: Multi-Table Agency Support

**User Story:** As a system architect, I want agency attribution in both content tables, so that the system maintains consistency across legacy and new content.

#### Acceptance Criteria

1. WHEN adding agency support, THE system SHALL update both explore_shorts and explore_content tables
2. WHEN querying either table, THE system SHALL provide consistent agency attribution data
3. WHEN migrating existing data, THE system SHALL preserve all existing content relationships
4. WHEN creating new content, THE system SHALL validate agency relationships before insertion
5. THE system SHALL maintain referential integrity between content and agency tables

### Requirement 5: Agency Boost Campaigns

**User Story:** As an agency owner, I want to run boost campaigns at the agency level, so that I can promote our entire portfolio of properties.

#### Acceptance Criteria

1. WHEN creating a boost campaign, THE system SHALL allow targeting by agency ID
2. WHEN a boost campaign is active, THE system SHALL prioritize agency-attributed content in feeds
3. WHEN calculating boost priority, THE system SHALL consider both content-level and agency-level campaigns
4. WHEN a campaign ends, THE system SHALL revert to standard content ranking
5. THE system SHALL track campaign performance metrics separately for agency campaigns

### Requirement 6: Creator Type Distinction

**User Story:** As a developer, I want to query content by creator type, so that I can efficiently filter between user, agent, developer, and agency content.

#### Acceptance Criteria

1. WHEN storing content, THE system SHALL record the creator type (user, agent, developer, agency)
2. WHEN querying content, THE system SHALL support filtering by creator type
3. WHEN indexing content, THE system SHALL optimize queries by creator type
4. WHEN displaying content, THE system SHALL show appropriate creator badges based on type
5. THE system SHALL validate creator type matches the creator ID reference

### Requirement 7: Backward Compatibility

**User Story:** As a system maintainer, I want existing content to continue working, so that the migration doesn't break current functionality.

#### Acceptance Criteria

1. WHEN migrating the schema, THE system SHALL preserve all existing content records
2. WHEN querying legacy content without agency attribution, THE system SHALL return valid results
3. WHEN existing APIs are called, THE system SHALL maintain backward compatibility
4. WHEN new fields are NULL, THE system SHALL handle gracefully without errors
5. THE system SHALL provide migration scripts that can be rolled back if needed

### Requirement 8: API Endpoint Extensions

**User Story:** As a frontend developer, I want API endpoints for agency feeds, so that I can display agency-specific content to users.

#### Acceptance Criteria

1. WHEN calling the agency feed endpoint, THE system SHALL accept agency ID as a required parameter
2. WHEN the endpoint returns results, THE system SHALL include pagination metadata
3. WHEN an invalid agency ID is provided, THE system SHALL return a 404 error with clear messaging
4. WHEN the endpoint is called, THE system SHALL enforce rate limiting per agency
5. THE system SHALL document the new endpoint in the API specification

### Requirement 9: Agency Profile Integration

**User Story:** As a user, I want to view an agency's profile with their Explore content, so that I can learn about the agency while browsing their properties.

#### Acceptance Criteria

1. WHEN viewing an agency profile, THE system SHALL display a feed of their Explore content
2. WHEN an agency has featured content, THE system SHALL highlight it prominently
3. WHEN displaying agency information, THE system SHALL show total content count and engagement metrics
4. WHEN an agency is verified, THE system SHALL display a verification badge
5. THE system SHALL link from content cards to the agency profile page

### Requirement 10: Content Upload Attribution

**User Story:** As an agent, I want to attribute my uploaded content to my agency, so that my work contributes to our agency's brand.

#### Acceptance Criteria

1. WHEN uploading content, THE system SHALL automatically detect the agent's agency affiliation
2. WHEN an agent belongs to an agency, THE system SHALL default to agency attribution
3. WHEN an agent is independent, THE system SHALL attribute content only to the agent
4. WHEN uploading content, THE system SHALL allow agents to opt-out of agency attribution
5. THE system SHALL validate agency relationships before accepting attribution

## Non-Functional Requirements

### Performance
- Agency feed queries SHALL complete within 200ms for cached results
- Agency feed queries SHALL complete within 500ms for uncached results
- Database indexes SHALL optimize agency-based queries

### Scalability
- THE system SHALL support agencies with up to 1000 agents
- THE system SHALL handle up to 10,000 content items per agency
- THE system SHALL cache agency feeds for 5 minutes

### Security
- THE system SHALL validate agency ownership before allowing content attribution changes
- THE system SHALL enforce permissions for agency-level analytics access
- THE system SHALL audit all agency attribution changes

### Data Integrity
- THE system SHALL maintain foreign key constraints between content and agencies
- THE system SHALL prevent orphaned content when agencies are deleted
- THE system SHALL cascade updates when agency information changes

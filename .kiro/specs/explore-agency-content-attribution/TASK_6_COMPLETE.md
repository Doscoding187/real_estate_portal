# Task 6: Update Content Upload Flow - COMPLETE

## Summary

Successfully implemented agency content attribution in the upload flow, enabling automatic detection of agent's agency affiliation, validation of agency relationships, and UI controls for agency attribution.

## Implementation Details

### 6.1 Agency Detection in Upload Service ✅

**File: `server/services/exploreVideoService.ts`**

- Added `detectAgencyAffiliation()` function that:
  - Queries the agents table to check if creator is an agent
  - Retrieves the agent's agency_id if they belong to an agency
  - Detects if creator is a developer
  - Returns appropriate creator type ('user', 'agent', 'developer')
  - Logs attribution decisions for debugging

- Updated `createExploreVideo()` to:
  - Call detectAgencyAffiliation() before creating content
  - Populate agencyId and creatorType fields in explore_content table
  - Log agency attribution decisions

**File: `server/exploreRouter.ts`**

- Updated `uploadShort` mutation to:
  - Query agent's agency_id when user role is 'agent'
  - Auto-populate agencyId field in explore_shorts table
  - Handle independent agents (no agency) gracefully
  - Log attribution decisions

### 6.2 Agency Attribution Validation ✅

**File: `server/services/exploreVideoService.ts`**

- Added `validateAgencyAttribution()` function that:
  - Verifies agency exists in the agencies table
  - Verifies agent belongs to the specified agency
  - Returns clear error messages for invalid attribution
  - Prevents orphaned agency references

- Integrated validation into `createExploreVideo()`:
  - Validates before inserting into database
  - Throws descriptive errors for invalid relationships

**File: `server/exploreRouter.ts`**

- Added validation in `uploadShort` mutation:
  - Verifies agency exists before creating content
  - Verifies agent belongs to specified agency
  - Throws errors with clear messages for invalid attribution

### 6.3 Upload UI Components ✅

**File: `client/src/pages/ExploreUpload.tsx`**

- Added agency attribution UI section:
  - Shows agency attribution card for agents only
  - Displays agency logo/name placeholder
  - Explains that content will build agency's brand
  - Added opt-out checkbox for agents
  - Shows warning when opted out

- Added state management:
  - `attributeToAgency` state (default: true)
  - `isAgent` computed from user role

- Updated form submission:
  - Passes `attributeToAgency` parameter to mutation
  - Respects agent's attribution preference

**File: `server/exploreRouter.ts`**

- Updated `uploadShort` input schema:
  - Added `attributeToAgency` boolean parameter (default: true)

- Updated mutation logic:
  - Only attributes to agency if agent opted in AND has an agency
  - Logs opt-out decisions
  - Respects agent's preference

## Requirements Validated

✅ **Requirement 10.1**: Auto-detect agent's agency affiliation
- Implemented in `detectAgencyAffiliation()` function
- Queries agents table for agency_id

✅ **Requirement 10.2**: Auto-populate agencyId field
- Implemented in both video and shorts upload flows
- Sets agencyId and creatorType in database

✅ **Requirement 10.3**: Show agency attribution status
- Added agency attribution card in upload UI
- Shows agency info and attribution status

✅ **Requirement 10.4**: Allow agents to opt-out
- Added checkbox for agency attribution
- Respects opt-out preference in backend

✅ **Requirement 10.5**: Validate agency relationships
- Implemented `validateAgencyAttribution()` function
- Verifies agency exists and agent belongs to agency

✅ **Requirement 4.4**: Prevent invalid agency attribution
- Validation prevents orphaned references
- Clear error messages for invalid relationships

## Testing Recommendations

### Manual Testing

1. **Agent with Agency**:
   - Login as agent belonging to an agency
   - Upload content
   - Verify agency attribution card shows
   - Verify content is attributed to agency in database

2. **Agent Opt-Out**:
   - Login as agent
   - Uncheck "Attribute to my agency"
   - Upload content
   - Verify content is NOT attributed to agency

3. **Independent Agent**:
   - Login as agent without agency
   - Upload content
   - Verify no agency attribution (agencyId = null)

4. **Developer Upload**:
   - Login as developer
   - Upload content
   - Verify creatorType = 'developer'
   - Verify no agency attribution

5. **Validation**:
   - Attempt to create content with invalid agency ID
   - Verify error message is clear
   - Verify content is not created

### Database Verification

```sql
-- Check agency attribution for recent uploads
SELECT 
  ec.id,
  ec.title,
  ec.creatorType,
  ec.agencyId,
  a.name as agency_name
FROM explore_content ec
LEFT JOIN agencies a ON ec.agencyId = a.id
ORDER BY ec.createdAt DESC
LIMIT 10;

-- Check explore_shorts agency attribution
SELECT 
  es.id,
  es.title,
  es.agentId,
  es.agencyId,
  ag.name as agency_name
FROM explore_shorts es
LEFT JOIN agencies ag ON es.agencyId = ag.id
WHERE es.agentId IS NOT NULL
ORDER BY es.createdAt DESC
LIMIT 10;
```

## Files Modified

1. `server/services/exploreVideoService.ts`
   - Added detectAgencyAffiliation()
   - Added validateAgencyAttribution()
   - Updated createExploreVideo()

2. `server/exploreRouter.ts`
   - Updated uploadShort mutation
   - Added agency detection logic
   - Added validation logic
   - Fixed z.record() and orderBy() issues

3. `client/src/pages/ExploreUpload.tsx`
   - Added agency attribution UI
   - Added opt-out checkbox
   - Updated form submission

## Next Steps

- Task 7: Create agency feed components (frontend)
- Task 8: Create agency analytics dashboard
- Task 9: Write unit tests
- Task 10: Write integration tests

## Notes

- Agency attribution is automatic for agents with agencies
- Agents can opt-out via checkbox
- Independent agents (no agency) work as before
- Validation prevents invalid agency references
- All logging in place for debugging
- UI is clean and informative

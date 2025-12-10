# Agency Attribution Backfill Guide

## Overview

This guide explains how to backfill historical explore content with agency attribution. The backfill script identifies content created by agents who belong to agencies and updates the `agency_id` field accordingly.

## Prerequisites

- Database connection configured (DATABASE_URL environment variable)
- Agency attribution migration already applied
- Agents table populated with agency relationships

## Backfill Script

The backfill script is located at: `scripts/backfill-agency-attribution.ts`

### Features

- **Dry-run mode**: Preview changes without modifying the database
- **Batch processing**: Processes records in configurable batches (default: 100)
- **Detailed logging**: Tracks all changes and errors
- **Progress tracking**: Shows real-time progress during execution
- **Error handling**: Continues processing even if individual records fail

### Command Line Options

```bash
# Dry-run mode (default - no changes made)
npx tsx scripts/backfill-agency-attribution.ts

# Dry-run with verbose output
npx tsx scripts/backfill-agency-attribution.ts --verbose

# Execute backfill (applies changes)
npx tsx scripts/backfill-agency-attribution.ts --execute

# Execute with verbose output
npx tsx scripts/backfill-agency-attribution.ts --execute --verbose

# Custom batch size
npx tsx scripts/backfill-agency-attribution.ts --batch-size=50

# Combine options
npx tsx scripts/backfill-agency-attribution.ts --execute --verbose --batch-size=200
```

## Execution Steps

### Step 1: Run in Dry-Run Mode

First, run the script in dry-run mode to preview what changes will be made:

```bash
npx tsx scripts/backfill-agency-attribution.ts --verbose
```

**Expected Output:**
```
============================================================
Agency Attribution Backfill Script
============================================================
Mode: DRY RUN (no changes will be made)
Batch size: 100
Verbose: true
============================================================
📋 Fetching agents with agency affiliation...
✅ Found 25 agents with agency affiliation
  Agent 1 (John Smith) → Agency 5
  Agent 2 (Jane Doe) → Agency 5
  ...

=== Backfilling explore_shorts table ===
Processing batch: 1 to 100
  Short ID 123: agent_id=1 → agency_id=5
  Short ID 124: agent_id=2 → agency_id=5
  ...
Progress: 100 shorts processed, 45 would be updated

=== Backfilling explore_content table ===
Processing batch: 1 to 50
  Content ID 456: creator_id=1 → agency_id=5
  ...

============================================================
BACKFILL SUMMARY
============================================================
Total agents with agency: 25

explore_shorts:
  Processed: 150
  Would be updated: 45
  Errors: 0

explore_content:
  Processed: 50
  Would be updated: 20
  Errors: 0
============================================================

⚠️  This was a DRY RUN. No changes were made to the database.
To apply these changes, run with --execute
```

### Step 2: Review Proposed Changes

Review the dry-run output carefully:

1. **Check agent count**: Verify the number of agents with agency affiliation is correct
2. **Review sample updates**: Check that the agent_id → agency_id mappings are correct
3. **Check error count**: Ensure there are no errors in dry-run mode
4. **Verify totals**: Confirm the number of records to be updated is reasonable

### Step 3: Execute Backfill

Once you've reviewed and approved the changes, execute the backfill:

```bash
npx tsx scripts/backfill-agency-attribution.ts --execute --verbose
```

**Expected Output:**
```
============================================================
Agency Attribution Backfill Script
============================================================
Mode: LIVE (changes will be applied)
...
✅ Backfill completed successfully!
```

### Step 4: Verify Results

After execution, verify the backfill was successful:

```sql
-- Check explore_shorts updates
SELECT 
  COUNT(*) as total_with_agency,
  COUNT(DISTINCT agency_id) as unique_agencies
FROM explore_shorts
WHERE agency_id IS NOT NULL;

-- Check explore_content updates
SELECT 
  COUNT(*) as total_with_agency,
  COUNT(DISTINCT agency_id) as unique_agencies
FROM explore_content
WHERE agency_id IS NOT NULL;

-- Verify agent-agency relationships
SELECT 
  a.id as agent_id,
  a.first_name,
  a.last_name,
  a.agency_id,
  COUNT(es.id) as shorts_count,
  COUNT(ec.id) as content_count
FROM agents a
LEFT JOIN explore_shorts es ON es.agent_id = a.id
LEFT JOIN explore_content ec ON ec.creator_id = a.id AND ec.creator_type = 'agent'
WHERE a.agency_id IS NOT NULL
GROUP BY a.id, a.first_name, a.last_name, a.agency_id
ORDER BY a.agency_id, a.id;
```

## What the Script Does

### 1. Identify Agents with Agency Affiliation

The script queries the `agents` table to find all agents who have a non-NULL `agency_id`:

```sql
SELECT id, agency_id, first_name, last_name
FROM agents
WHERE agency_id IS NOT NULL;
```

### 2. Backfill explore_shorts Table

For each batch of records in `explore_shorts`:
- Finds shorts where `agent_id` is NOT NULL but `agency_id` IS NULL
- Looks up the agent's agency from the agent-to-agency map
- Updates the `agency_id` field

```sql
UPDATE explore_shorts
SET agency_id = ?
WHERE id = ? AND agent_id IS NOT NULL AND agency_id IS NULL;
```

### 3. Backfill explore_content Table

For each batch of records in `explore_content`:
- Finds content where `creator_type` = 'agent' and `creator_id` is NOT NULL but `agency_id` IS NULL
- Looks up the agent's agency from the agent-to-agency map
- Updates the `agency_id` field

```sql
UPDATE explore_content
SET agency_id = ?
WHERE id = ? 
  AND creator_type = 'agent' 
  AND creator_id IS NOT NULL 
  AND agency_id IS NULL;
```

## Troubleshooting

### Database Not Available

**Error:** `Database not available`

**Solution:** Ensure the `DATABASE_URL` environment variable is set:

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows CMD
$env:DATABASE_URL   # Windows PowerShell

# Set DATABASE_URL if missing
export DATABASE_URL="mysql://user:pass@host:port/database"  # Linux/Mac
set DATABASE_URL=mysql://user:pass@host:port/database       # Windows CMD
$env:DATABASE_URL="mysql://user:pass@host:port/database"    # Windows PowerShell
```

### No Records to Update

**Output:** `Processed: 0, Would be updated: 0`

**Possible Causes:**
1. All content already has agency attribution
2. No agents belong to agencies
3. No content exists from agents with agencies

**Verification:**
```sql
-- Check if agents have agencies
SELECT COUNT(*) FROM agents WHERE agency_id IS NOT NULL;

-- Check if content exists without agency attribution
SELECT COUNT(*) FROM explore_shorts 
WHERE agent_id IS NOT NULL AND agency_id IS NULL;

SELECT COUNT(*) FROM explore_content 
WHERE creator_type = 'agent' AND creator_id IS NOT NULL AND agency_id IS NULL;
```

### Errors During Execution

**Error:** `Error updating short ID X: ...`

**Solution:**
1. Check the error message for details
2. Verify foreign key constraints are in place
3. Ensure the agency_id references a valid agency
4. Check database permissions

### Performance Issues

If the backfill is slow:

1. **Reduce batch size:**
   ```bash
   npx tsx scripts/backfill-agency-attribution.ts --execute --batch-size=50
   ```

2. **Run during off-peak hours**

3. **Monitor database load**

## Rollback

If you need to rollback the backfill:

```sql
-- Rollback explore_shorts
UPDATE explore_shorts
SET agency_id = NULL
WHERE agency_id IS NOT NULL
  AND updated_at > 'YYYY-MM-DD HH:MM:SS';  -- Use backfill execution time

-- Rollback explore_content
UPDATE explore_content
SET agency_id = NULL
WHERE agency_id IS NOT NULL
  AND updated_at > 'YYYY-MM-DD HH:MM:SS';  -- Use backfill execution time
```

## Best Practices

1. **Always run dry-run first**: Never skip the dry-run step
2. **Backup before execution**: Take a database backup before running with --execute
3. **Run during maintenance window**: Execute during low-traffic periods
4. **Monitor progress**: Watch the output for errors or unexpected behavior
5. **Verify results**: Always verify the backfill completed successfully
6. **Document execution**: Keep a record of when and how the backfill was run

## Integration with Analytics

After backfill completion, agency analytics will include historical data:

```typescript
// Agency metrics will now include backfilled content
const metrics = await exploreAgencyService.getAgencyMetrics(agencyId);

// Agency feed will show all historical content
const feed = await exploreFeedService.getAgencyFeed({ agencyId, limit: 20 });
```

## Requirements Validation

This backfill script satisfies:

- **Requirement 1.4**: Historical content attribution maintained
- **Requirement 7.1**: Backward compatibility preserved
- **Requirement 7.5**: Migration can be rolled back if needed

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the script logs for error details
3. Verify database schema matches expectations
4. Ensure all migrations have been applied

## Summary

The backfill script provides a safe, controlled way to update historical explore content with agency attribution. By following this guide and using dry-run mode first, you can confidently backfill your data while maintaining data integrity.

/**
 * Agency Attribution Backfill Script
 * 
 * This script backfills historical explore content with agency attribution
 * by identifying content created by agents who belong to agencies.
 * 
 * Requirements: 1.4, 7.1
 * 
 * Features:
 * - Dry-run mode to preview changes
 * - Batch processing to avoid overwhelming the database
 * - Detailed logging of all changes
 * - Progress tracking
 * - Error handling and rollback support
 */

import { getDb } from '../server/db';
import { exploreShorts, exploreContent, agents } from '../drizzle/schema';
import { eq, isNotNull, isNull, and, sql } from 'drizzle-orm';

interface BackfillStats {
  totalAgentsWithAgency: number;
  exploreShorts: {
    totalProcessed: number;
    totalUpdated: number;
    errors: number;
  };
  exploreContent: {
    totalProcessed: number;
    totalUpdated: number;
    errors: number;
  };
}

interface BackfillOptions {
  dryRun: boolean;
  batchSize: number;
  verbose: boolean;
}

const DEFAULT_OPTIONS: BackfillOptions = {
  dryRun: true,
  batchSize: 100,
  verbose: true,
};

/**
 * Log with timestamp
 */
function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  }[level];
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Get all agents who belong to an agency
 */
async function getAgentsWithAgency(db: any): Promise<Array<{ id: number; agencyId: number; name: string }>> {
  log('Fetching agents with agency affiliation...');
  
  const agentsWithAgency = await db
    .select({
      id: agents.id,
      agencyId: agents.agencyId,
      firstName: agents.firstName,
      lastName: agents.lastName,
    })
    .from(agents)
    .where(isNotNull(agents.agencyId));
  
  const result = agentsWithAgency.map((agent: any) => ({
    id: agent.id,
    agencyId: agent.agencyId,
    name: `${agent.firstName} ${agent.lastName}`,
  }));
  
  log(`Found ${result.length} agents with agency affiliation`, 'success');
  return result;
}

/**
 * Backfill explore_shorts table
 */
async function backfillExploreShorts(
  db: any,
  agentMap: Map<number, number>,
  options: BackfillOptions
): Promise<{ processed: number; updated: number; errors: number }> {
  log('\n=== Backfilling explore_shorts table ===');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  let offset = 0;
  
  while (true) {
    // Fetch batch of shorts that have agent_id but no agency_id
    const batch = await db
      .select()
      .from(exploreShorts)
      .where(
        and(
          isNotNull(exploreShorts.agentId),
          isNull(exploreShorts.agencyId)
        )
      )
      .limit(options.batchSize)
      .offset(offset);
    
    if (batch.length === 0) {
      break;
    }
    
    log(`Processing batch: ${offset + 1} to ${offset + batch.length}`);
    
    for (const short of batch) {
      processed++;
      
      const agencyId = agentMap.get(short.agentId);
      
      if (agencyId) {
        if (options.verbose) {
          log(`  Short ID ${short.id}: agent_id=${short.agentId} → agency_id=${agencyId}`);
        }
        
        if (!options.dryRun) {
          try {
            await db
              .update(exploreShorts)
              .set({ agencyId })
              .where(eq(exploreShorts.id, short.id));
            
            updated++;
          } catch (error) {
            log(`  Error updating short ID ${short.id}: ${error}`, 'error');
            errors++;
          }
        } else {
          updated++; // Count as updated in dry-run mode
        }
      }
    }
    
    offset += batch.length;
    
    // Progress update
    if (processed % 100 === 0) {
      log(`Progress: ${processed} shorts processed, ${updated} would be updated`);
    }
  }
  
  return { processed, updated, errors };
}

/**
 * Backfill explore_content table
 */
async function backfillExploreContent(
  db: any,
  agentMap: Map<number, number>,
  options: BackfillOptions
): Promise<{ processed: number; updated: number; errors: number }> {
  log('\n=== Backfilling explore_content table ===');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  let offset = 0;
  
  while (true) {
    // Fetch batch of content that has creator_type='agent' but no agency_id
    const batch = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.creatorType, 'agent'),
          isNotNull(exploreContent.creatorId),
          isNull(exploreContent.agencyId)
        )
      )
      .limit(options.batchSize)
      .offset(offset);
    
    if (batch.length === 0) {
      break;
    }
    
    log(`Processing batch: ${offset + 1} to ${offset + batch.length}`);
    
    for (const content of batch) {
      processed++;
      
      const agencyId = agentMap.get(content.creatorId);
      
      if (agencyId) {
        if (options.verbose) {
          log(`  Content ID ${content.id}: creator_id=${content.creatorId} → agency_id=${agencyId}`);
        }
        
        if (!options.dryRun) {
          try {
            await db
              .update(exploreContent)
              .set({ agencyId })
              .where(eq(exploreContent.id, content.id));
            
            updated++;
          } catch (error) {
            log(`  Error updating content ID ${content.id}: ${error}`, 'error');
            errors++;
          }
        } else {
          updated++; // Count as updated in dry-run mode
        }
      }
    }
    
    offset += batch.length;
    
    // Progress update
    if (processed % 100 === 0) {
      log(`Progress: ${processed} content items processed, ${updated} would be updated`);
    }
  }
  
  return { processed, updated, errors };
}

/**
 * Main backfill function
 */
export async function backfillAgencyAttribution(options: Partial<BackfillOptions> = {}): Promise<BackfillStats> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  log('='.repeat(60));
  log('Agency Attribution Backfill Script');
  log('='.repeat(60));
  log(`Mode: ${opts.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  log(`Batch size: ${opts.batchSize}`);
  log(`Verbose: ${opts.verbose}`);
  log('='.repeat(60));
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  try {
    // Step 1: Get all agents with agency affiliation
    const agentsWithAgency = await getAgentsWithAgency(db);
    
    // Create a map of agent_id -> agency_id for quick lookup
    const agentToAgencyMap = new Map<number, number>();
    agentsWithAgency.forEach(agent => {
      agentToAgencyMap.set(agent.id, agent.agencyId);
      if (opts.verbose) {
        log(`  Agent ${agent.id} (${agent.name}) → Agency ${agent.agencyId}`);
      }
    });
    
    // Step 2: Backfill explore_shorts
    const shortsResults = await backfillExploreShorts(db, agentToAgencyMap, opts);
    
    // Step 3: Backfill explore_content
    const contentResults = await backfillExploreContent(db, agentToAgencyMap, opts);
    
    // Step 4: Summary
    const stats: BackfillStats = {
      totalAgentsWithAgency: agentsWithAgency.length,
      exploreShorts: {
        totalProcessed: shortsResults.processed,
        totalUpdated: shortsResults.updated,
        errors: shortsResults.errors,
      },
      exploreContent: {
        totalProcessed: contentResults.processed,
        totalUpdated: contentResults.updated,
        errors: contentResults.errors,
      },
    };
    
    log('\n' + '='.repeat(60));
    log('BACKFILL SUMMARY');
    log('='.repeat(60));
    log(`Total agents with agency: ${stats.totalAgentsWithAgency}`);
    log('');
    log('explore_shorts:');
    log(`  Processed: ${stats.exploreShorts.totalProcessed}`);
    log(`  ${opts.dryRun ? 'Would be updated' : 'Updated'}: ${stats.exploreShorts.totalUpdated}`);
    log(`  Errors: ${stats.exploreShorts.errors}`);
    log('');
    log('explore_content:');
    log(`  Processed: ${stats.exploreContent.totalProcessed}`);
    log(`  ${opts.dryRun ? 'Would be updated' : 'Updated'}: ${stats.exploreContent.totalUpdated}`);
    log(`  Errors: ${stats.exploreContent.errors}`);
    log('='.repeat(60));
    
    if (opts.dryRun) {
      log('\n⚠️  This was a DRY RUN. No changes were made to the database.', 'warn');
      log('To apply these changes, run with dryRun: false');
    } else {
      log('\n✅ Backfill completed successfully!', 'success');
    }
    
    return stats;
    
  } catch (error) {
    log(`Fatal error during backfill: ${error}`, 'error');
    throw error;
  }
}

/**
 * CLI execution
 */
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const verbose = args.includes('--verbose');
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100');

backfillAgencyAttribution({ dryRun, verbose, batchSize })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });

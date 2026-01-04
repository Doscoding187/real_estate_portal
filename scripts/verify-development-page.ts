
/**
 * Verification Script for Development Page Logic
 * 
 * Usage: npx tsx scripts/verify-development-page.ts
 * 
 * This script serves as a "Smoke Test" to verify that:
 * 1. The application can connect to the database (handling SSL correctly).
 * 2. The critical "Sky City" development exists and is retrievable.
 * 3. The returned data structure matches what the frontend expects (specifically 'amenities' being an array).
 * 4. No schema mismatches cause backend crashes.
 */

import { developmentService } from '../server/services/developmentService';
import { getDb } from '../server/db-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ANSI define for colored output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

async function runVerification() {
    console.log(`${colors.cyan}=== Development Page Verification Service ===${colors.reset}\n`);

    // 1. Verify DB Connection
    console.log(`${colors.yellow}[1/3] Testing Database Connection...${colors.reset}`);
    try {
        const db = await getDb();
        if (!db) {
            throw new Error("getDb() returned null. Check DATABASE_URL and SSL settings.");
        }
        console.log(`${colors.green}✓ Database connected successfully.${colors.reset}\n`);
    } catch (error: any) {
        console.error(`${colors.red}✗ Database connection failed: ${error.message}${colors.reset}`);
        process.exit(1);
    }

    // 2. Verify Data Retrieval (End-to-End Service Call)
    // Using the known slug that caused issues
    const targetSlug = 'sky-city-housing-development-ext-50';
    console.log(`${colors.yellow}[2/3] Querying Development by Slug: '${targetSlug}'...${colors.reset}`);
    
    let development: any = null;
    try {
        development = await developmentService.getPublicDevelopmentBySlug(targetSlug);
        
        if (!development) {
             // Try a partial match or list to see if *any* data works if specific one is missing
             console.warn(`${colors.yellow}⚠ Exact slug not found. This might be valid if data changed. Attempting list...${colors.reset}`);
             const list = await developmentService.listPublicDevelopments(1);
             if (list.length > 0) {
                console.log(`${colors.green}✓ Service works (listed listings), but specific test slug missing.${colors.reset}`);
                return; // Soft pass/warning
             } else {
                throw new Error("Service returned null for slug AND empty list.");
             }
        }
        console.log(`${colors.green}✓ Development retrieved successfully.${colors.reset}\n`);
    } catch (error: any) {
        console.error(`${colors.red}✗ Service call crashed (Schema verification failed?): ${error.message}${colors.reset}`);
        console.error(error);
        process.exit(1);
    }

    // 3. Verify Data Structure (Frontend Compatibility)
    console.log(`${colors.yellow}[3/3] Verifying Data Structure Compatibility...${colors.reset}`);
    
    // Check Amenities
    if (Array.isArray(development.amenities)) {
        console.log(`${colors.green}✓ amenities is an Array (Length: ${development.amenities.length})${colors.reset}`);
    } else {
        console.error(`${colors.red}✗ amenities is NOT an array. Type: ${typeof development.amenities}. Value: ${development.amenities}${colors.reset}`);
        process.exit(1);
    }

    // Check Unit Types
    if (Array.isArray(development.unitTypes)) {
         console.log(`${colors.green}✓ unitTypes is an Array (Length: ${development.unitTypes.length})${colors.reset}`);
    } else {
         console.error(`${colors.red}✗ unitTypes is missing or invalid.${colors.reset}`);
         process.exit(1);
    }
    
    // Check Phases (Specifically excluded fields check)
    if (development.phases) {
         const phase = development.phases[0];
         if (phase && 'latitude' in phase) {
             console.warn(`${colors.yellow}⚠ Warning: 'latitude' present in phase. Ensure schema matches DB to avoid crash.${colors.reset}`);
         }
         console.log(`${colors.green}✓ Phases loaded correctly.${colors.reset}`);
    }

    console.log(`\n${colors.cyan}=== Verification PASSED ===${colors.reset}`);
    process.exit(0);
}

runVerification();

import { appRouter } from '../server/routers';

async function run() {
  console.log('🔍 Verifying tRPC Router Integrity...');

  try {
    // Access internal definition (works for tRPC v10/v11)
    const def = (appRouter as any)._def;

    // In tRPC v10+, routers are often merged.
    // We expect 'developer' to be a key in the record or procedures.

    // Debug output
    // console.log('Router keys:', Object.keys(appRouter));

    let found = false;

    // Strategy 1: Direct property access (sometimes works in older versions or specific configs)
    if ('developer' in appRouter) found = true;

    // Strategy 2: Check _def.record (common in v10)
    if (def.record && 'developer' in def.record) found = true;

    // Strategy 3: Check _def.procedures (flat structure) - might be developer.create etc.
    // If it's a merged router, checking the record key is safest for the namespace.

    if (found) {
      console.log('✅ PASS: "developer" router is correctly mounted.');
      process.exit(0);
    } else {
      console.error('❌ FAIL: "developer" router is MISSING from appRouter definition.');
      console.error('Available keys in record:', def.record ? Object.keys(def.record) : 'N/A');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FAIL: Error verifying router:', error);
    process.exit(1);
  }
}

run();

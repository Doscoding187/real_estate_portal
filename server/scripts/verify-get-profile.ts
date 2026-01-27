import { developerRouter } from '../developerRouter';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import * as details from '../db-connection';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env
// Load .env.local first, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function assert(condition: any, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function run() {
  console.log('Starting verification for developer.getProfile...');
  console.log(
    'Environment check: DATABASE_URL is ' + (process.env.DATABASE_URL ? 'PRESENT' : 'MISSING'),
  );

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing. Failing.');
    process.exit(1);
  }

  // Real developer ID from list_developers.ts output
  const knownDeveloperUserId = 240003;
  let failed = false;

  // ✅ Valid role
  console.log('\nTest 1: Valid Role (property_developer)');
  try {
    const ctx: any = {
      user: { id: knownDeveloperUserId, role: 'property_developer' },
    };

    const caller = developerRouter.createCaller(ctx);
    const res: any = await caller.getProfile();
    console.log('Response:', JSON.stringify(res, null, 2));

    assert(res, 'response should exist');
    assert(typeof res.name === 'string', 'name should be string');
    assert(typeof res.status === 'string', 'status should be string');

    // Check if brandProfile is returned as expected (structure check)
    if (res.brandProfile !== null) {
      assert(typeof res.brandProfile === 'object', 'brandProfile should be object if not null');
    }

    console.log('✅ getProfile valid role passed');
  } catch (error) {
    console.error('❌ Test 1 Failed:', error);
    failed = true;
  }

  // ❌ Invalid role => FORBIDDEN
  console.log('\nTest 2: Invalid Role (buyer)');
  try {
    const ctx: any = {
      user: { id: knownDeveloperUserId, role: 'buyer' },
    };

    const caller = developerRouter.createCaller(ctx);
    await caller.getProfile();
    throw new Error('Expected FORBIDDEN but call succeeded');
  } catch (e: any) {
    const code = (e as TRPCError).code ?? e?.data?.code;
    if (code === 'FORBIDDEN') {
      console.log('✅ getProfile invalid role throws FORBIDDEN');
    } else {
      console.error(`❌ Expected FORBIDDEN, got ${code}`, e);
      failed = true;
    }
  }

  // ❌ Non-existent developer => NOT_FOUND
  console.log('\nTest 3: Non-existent Developer');
  try {
    const ctx: any = {
      user: { id: 999999999, role: 'property_developer' },
    };

    const caller = developerRouter.createCaller(ctx);
    await caller.getProfile();
    throw new Error('Expected NOT_FOUND but call succeeded');
  } catch (e: any) {
    const code = (e as TRPCError).code ?? e?.data?.code;
    if (code === 'NOT_FOUND') {
      console.log('✅ getProfile missing dev throws NOT_FOUND');
    } else {
      console.error(`❌ Expected NOT_FOUND, got ${code}`, e);
      failed = true;
    }
  }

  if (failed) {
    console.error('\n❌ Verification FAILED');
    process.exit(1);
  } else {
    console.log('\n🎉 All checks passed');
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

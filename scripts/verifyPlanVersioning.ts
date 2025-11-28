
import { appRouter } from '../server/routers';
import { createContext } from '../server/context';
import { getDb } from '../server/db';
import { plans } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function verifyPlanVersioning() {
  console.log('Starting Plan Versioning Verification...');

  // Mock Context (Super Admin)
  const ctx = {
    user: { id: 1, role: 'super_admin', agencyId: 1 },
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(ctx);

  try {
    // 1. Create a Plan
    console.log('1. Creating Plan...');
    const createRes = await caller.subscription.createPlan({
      name: 'test-plan-v1',
      displayName: 'Test Plan V1',
      price: 100,
      interval: 'month',
      features: ['Feature A'],
      limits: { revenueCategory: 'agency' },
    });
    console.log('   Created Plan ID:', createRes.planId);

    // 2. Update with Versioning (createNewVersion: true)
    console.log('2. Updating Plan (New Version)...');
    const updateRes = await caller.subscription.updatePlan({
      planId: createRes.planId,
      changes: {
        price: 200,
        displayName: 'Test Plan V2',
      },
      createNewVersion: true,
    });
    
    if ('newPlanId' in updateRes) {
        console.log('   Versioned! Old ID:', updateRes.oldPlanId, 'New ID:', updateRes.newPlanId);
    } else {
        console.error('   FAILED: Did not return newPlanId');
    }

    // 3. Verify Old Plan is Inactive
    const db = await getDb();
    const oldPlan = await db.query.plans.findFirst({ where: eq(plans.id, createRes.planId) });
    console.log('   Old Plan Active:', oldPlan?.isActive === 1 ? 'YES (FAIL)' : 'NO (PASS)');

    // 4. Verify New Plan is Active and has new price
    // @ts-ignore
    const newPlan = await db.query.plans.findFirst({ where: eq(plans.id, updateRes.newPlanId) });
    console.log('   New Plan Active:', newPlan?.isActive === 1 ? 'YES (PASS)' : 'NO (FAIL)');
    console.log('   New Plan Price:', newPlan?.price === 20000 ? '20000 (PASS)' : `${newPlan?.price} (FAIL)`);

    // 5. Update In-Place (createNewVersion: false)
    console.log('5. Updating Plan (In-Place)...');
    // @ts-ignore
    await caller.subscription.updatePlan({
      planId: newPlan!.id,
      changes: {
        displayName: 'Test Plan V2 Updated',
      },
      createNewVersion: false,
    });

    const updatedPlan = await db.query.plans.findFirst({ where: eq(plans.id, newPlan!.id) });
    console.log('   Plan Name Updated:', updatedPlan?.displayName === 'Test Plan V2 Updated' ? 'YES (PASS)' : 'NO (FAIL)');
    console.log('   Plan ID Same:', updatedPlan?.id === newPlan!.id ? 'YES (PASS)' : 'NO (FAIL)');

    console.log('Verification Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Verification Failed:', JSON.stringify(error, null, 2));
    if ((error as any).shape) {
        console.error('Error Shape:', JSON.stringify((error as any).shape, null, 2));
    }
    process.exit(1);
  }
}

verifyPlanVersioning();

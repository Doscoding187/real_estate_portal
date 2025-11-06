import { getDb } from './server/db';
import { plans } from './drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed script to create basic subscription plans for Phase 3 monetization
 * Run with: tsx seed-plans.ts
 */

const PLAN_DATA = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    currency: 'ZAR',
    interval: 'month',
    stripePriceId: null,
    features: JSON.stringify([
      'Up to 5 properties',
      '1 agent account',
      'Basic analytics',
      'Email support',
    ]),
    limits: JSON.stringify({
      properties: 5,
      agents: 1,
      storage_gb: 1,
    }),
    isActive: 1,
    isPopular: 0,
    sortOrder: 1,
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'Ideal for small agencies',
    price: 8900, // R899/month
    currency: 'ZAR',
    interval: 'month',
    stripePriceId: 'price_starter_monthly', // Replace with actual Stripe price ID
    features: JSON.stringify([
      'Up to 50 properties',
      '5 agent accounts',
      'Advanced analytics',
      'Lead management',
      'Priority email support',
      'Basic branding',
    ]),
    limits: JSON.stringify({
      properties: 50,
      agents: 5,
      storage_gb: 10,
    }),
    isActive: 1,
    isPopular: 0,
    sortOrder: 2,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    description: 'For growing real estate agencies',
    price: 18900, // R1899/month
    currency: 'ZAR',
    interval: 'month',
    stripePriceId: 'price_professional_monthly', // Replace with actual Stripe price ID
    features: JSON.stringify([
      'Unlimited properties',
      '25 agent accounts',
      'Advanced analytics & reports',
      'Full CRM functionality',
      'Lead conversion tracking',
      'Custom branding',
      'API access',
      'Priority phone support',
    ]),
    limits: JSON.stringify({
      properties: -1, // unlimited
      agents: 25,
      storage_gb: 100,
    }),
    isActive: 1,
    isPopular: 1,
    sortOrder: 3,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large real estate networks',
    price: 39900, // R3999/month
    currency: 'ZAR',
    interval: 'month',
    stripePriceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    features: JSON.stringify([
      'Everything in Professional',
      'Unlimited agents',
      'White-label solution',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantees',
      'Custom domain',
      '24/7 phone support',
    ]),
    limits: JSON.stringify({
      properties: -1, // unlimited
      agents: -1, // unlimited
      storage_gb: 1000,
    }),
    isActive: 1,
    isPopular: 0,
    sortOrder: 4,
  },
] as const;

async function seedPlans() {
  console.log('🌱 Seeding subscription plans...');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    // Clear existing plans (optional - remove if you want to preserve existing data)
    await db.delete(plans);

    // Insert new plans
    const insertedPlans = await db.insert(plans).values(PLAN_DATA).returning();

    console.log(`✅ Successfully seeded ${insertedPlans.length} plans:`);
    insertedPlans.forEach((plan) => {
      console.log(`  - ${plan.displayName} (${plan.name}): R${(plan.price / 100).toFixed(2)}/${plan.interval}`);
    });

    console.log('\n📝 Next steps:');
    console.log('1. Create corresponding prices in your Stripe dashboard');
    console.log('2. Update stripePriceId fields with actual Stripe price IDs');
    console.log('3. Test plan selection and checkout flow');

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPlans();
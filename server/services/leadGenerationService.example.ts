/**
 * Lead Generation Service - Example Usage
 * 
 * This file demonstrates how to use the Lead Generation Service
 * in various scenarios.
 */

import { leadGenerationService, LeadCreate } from './leadGenerationService';

// ============================================================================
// Example 1: Create a Quote Request Lead
// ============================================================================

async function createQuoteRequestLead() {
  console.log('\n=== Example 1: Create Quote Request Lead ===\n');

  const leadData: LeadCreate = {
    partnerId: 'partner-123',
    userId: 'user-456',
    contentId: 'content-789', // Optional: the content that drove the lead
    type: 'quote_request',
    contactInfo: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+27821234567',
      preferredContactMethod: 'email'
    },
    intentDetails: 'Looking for a quote to renovate my kitchen. Interested in modern finishes and smart appliances.'
  };

  try {
    const lead = await leadGenerationService.createLead(leadData);
    console.log('Lead created successfully:');
    console.log(`  ID: ${lead.id}`);
    console.log(`  Type: ${lead.type}`);
    console.log(`  Price: R${lead.price}`);
    console.log(`  Status: ${lead.status}`);
    console.log(`  Partner notified: ✓`);
    return lead;
  } catch (error) {
    console.error('Failed to create lead:', error);
    throw error;
  }
}

// ============================================================================
// Example 2: Create a Consultation Lead
// ============================================================================

async function createConsultationLead() {
  console.log('\n=== Example 2: Create Consultation Lead ===\n');

  const leadData: LeadCreate = {
    partnerId: 'financial-partner-456',
    userId: 'user-789',
    type: 'consultation',
    contactInfo: {
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      phone: '+27823456789',
      preferredContactMethod: 'phone'
    },
    intentDetails: 'First-time home buyer. Need advice on bond applications and affordability.'
  };

  try {
    const lead = await leadGenerationService.createLead(leadData);
    console.log('Consultation lead created:');
    console.log(`  Price: R${lead.price} (R100-R300 range)`);
    console.log(`  Contact preference: ${lead.contactInfo.preferredContactMethod}`);
    return lead;
  } catch (error) {
    console.error('Failed to create consultation lead:', error);
    throw error;
  }
}

// ============================================================================
// Example 3: Create an Eligibility Check Lead
// ============================================================================

async function createEligibilityCheckLead() {
  console.log('\n=== Example 3: Create Eligibility Check Lead ===\n');

  const leadData: LeadCreate = {
    partnerId: 'bank-partner-789',
    userId: 'user-101',
    type: 'eligibility_check',
    contactInfo: {
      name: 'Thandi Mthembu',
      email: 'thandi.m@example.com',
      phone: '+27824567890',
      preferredContactMethod: 'whatsapp'
    },
    intentDetails: 'Want to check if I qualify for a home loan. Monthly income: R45,000. No existing debt.'
  };

  try {
    const lead = await leadGenerationService.createLead(leadData);
    console.log('Eligibility check lead created:');
    console.log(`  Price: R${lead.price} (R500-R1000 range)`);
    console.log(`  High-value lead for financial partner`);
    return lead;
  } catch (error) {
    console.error('Failed to create eligibility check lead:', error);
    throw error;
  }
}

// ============================================================================
// Example 4: Get Partner Leads with Filters
// ============================================================================

async function getPartnerLeadsExample() {
  console.log('\n=== Example 4: Get Partner Leads ===\n');

  const partnerId = 'partner-123';

  // Get all new leads
  const newLeads = await leadGenerationService.getPartnerLeads(partnerId, {
    status: 'new',
    limit: 10
  });
  console.log(`New leads: ${newLeads.length}`);

  // Get consultation leads
  const consultationLeads = await leadGenerationService.getPartnerLeads(partnerId, {
    type: 'consultation',
    limit: 20
  });
  console.log(`Consultation leads: ${consultationLeads.length}`);

  // Get all leads with pagination
  const allLeads = await leadGenerationService.getPartnerLeads(partnerId, {
    limit: 50,
    offset: 0
  });
  console.log(`Total leads (page 1): ${allLeads.length}`);

  return allLeads;
}

// ============================================================================
// Example 5: Calculate Lead Pricing
// ============================================================================

async function calculatePricingExample() {
  console.log('\n=== Example 5: Calculate Lead Pricing ===\n');

  const partnerId = 'partner-123';

  // Calculate price for each lead type
  const quotePrice = await leadGenerationService.calculateLeadPrice('quote_request', partnerId);
  console.log(`Quote Request: R${quotePrice} (R50-R200 range)`);

  const consultationPrice = await leadGenerationService.calculateLeadPrice('consultation', partnerId);
  console.log(`Consultation: R${consultationPrice} (R100-R300 range)`);

  const eligibilityPrice = await leadGenerationService.calculateLeadPrice('eligibility_check', partnerId);
  console.log(`Eligibility Check: R${eligibilityPrice} (R500-R1000 range)`);

  console.log('\nPricing factors:');
  console.log('  - Partner trust score (50%)');
  console.log('  - Content engagement (30%)');
  console.log('  - User quality (20%)');
}

// ============================================================================
// Example 6: Lead Lifecycle Management
// ============================================================================

async function leadLifecycleExample() {
  console.log('\n=== Example 6: Lead Lifecycle ===\n');

  // Create a lead
  const lead = await createQuoteRequestLead();

  // Partner contacts the user
  console.log('\n1. Partner contacts user...');
  await leadGenerationService.updateLeadStatus(lead.id, 'contacted');
  console.log('   Status: contacted ✓');

  // User becomes a customer
  console.log('\n2. User converts to customer...');
  await leadGenerationService.updateLeadStatus(lead.id, 'converted');
  console.log('   Status: converted ✓');
  console.log('   Success! 🎉');

  return lead;
}

// ============================================================================
// Example 7: Dispute Handling
// ============================================================================

async function disputeHandlingExample() {
  console.log('\n=== Example 7: Dispute Handling ===\n');

  // Create a lead
  const lead = await createQuoteRequestLead();

  // Partner disputes the lead
  console.log('\n1. Partner disputes lead...');
  await leadGenerationService.disputeLead(
    lead.id,
    'User did not respond to 3 contact attempts over 5 days. Phone number appears to be incorrect.'
  );
  console.log('   Dispute submitted ✓');
  console.log('   Admin team will review within 48 hours');

  // Admin reviews and approves refund
  console.log('\n2. Admin reviews dispute...');
  await leadGenerationService.processDispute(lead.id, 'refund');
  console.log('   Dispute approved ✓');
  console.log('   Refund processed');

  return lead;
}

// ============================================================================
// Example 8: Conversion Funnel Analysis
// ============================================================================

async function conversionFunnelExample() {
  console.log('\n=== Example 8: Conversion Funnel ===\n');

  const partnerId = 'partner-123';

  const funnel = await leadGenerationService.getLeadConversionFunnel(partnerId);

  console.log('Lead Conversion Funnel:');
  console.log(`  Total Leads: ${funnel.totalLeads}`);
  console.log(`  Contacted: ${funnel.contacted} (${((funnel.contacted / funnel.totalLeads) * 100).toFixed(1)}%)`);
  console.log(`  Converted: ${funnel.converted} (${funnel.conversionRate.toFixed(1)}%)`);
  console.log(`  Disputed: ${funnel.disputed}`);
  console.log(`  Refunded: ${funnel.refunded}`);
  console.log(`  Average Price: R${funnel.averagePrice.toFixed(2)}`);

  // Calculate metrics
  const contactRate = (funnel.contacted / funnel.totalLeads) * 100;
  const disputeRate = (funnel.disputed / funnel.totalLeads) * 100;

  console.log('\nPerformance Metrics:');
  console.log(`  Contact Rate: ${contactRate.toFixed(1)}% ${contactRate > 80 ? '✓' : '⚠️'}`);
  console.log(`  Conversion Rate: ${funnel.conversionRate.toFixed(1)}% ${funnel.conversionRate > 30 ? '✓' : '⚠️'}`);
  console.log(`  Dispute Rate: ${disputeRate.toFixed(1)}% ${disputeRate < 10 ? '✓' : '⚠️'}`);

  return funnel;
}

// ============================================================================
// Example 9: Bulk Lead Processing
// ============================================================================

async function bulkLeadProcessingExample() {
  console.log('\n=== Example 9: Bulk Lead Processing ===\n');

  const partnerId = 'partner-123';

  // Get all new leads
  const newLeads = await leadGenerationService.getPartnerLeads(partnerId, {
    status: 'new'
  });

  console.log(`Processing ${newLeads.length} new leads...`);

  // Simulate partner processing leads
  for (const lead of newLeads.slice(0, 5)) { // Process first 5 for demo
    console.log(`\nLead ${lead.id}:`);
    console.log(`  Type: ${lead.type}`);
    console.log(`  Contact: ${lead.contactInfo.name}`);
    console.log(`  Intent: ${lead.intentDetails?.substring(0, 50)}...`);

    // Mark as contacted
    await leadGenerationService.updateLeadStatus(lead.id, 'contacted');
    console.log(`  Status updated: contacted ✓`);
  }

  console.log(`\nProcessed ${Math.min(5, newLeads.length)} leads`);
}

// ============================================================================
// Example 10: Error Handling
// ============================================================================

async function errorHandlingExample() {
  console.log('\n=== Example 10: Error Handling ===\n');

  // Invalid lead type
  try {
    await leadGenerationService.createLead({
      partnerId: 'partner-123',
      userId: 'user-456',
      type: 'invalid_type' as any,
      contactInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+27821234567'
      }
    });
  } catch (error: any) {
    console.log('✓ Caught invalid lead type error');
    console.log(`  Error: ${error.message}`);
  }

  // Non-existent partner
  try {
    await leadGenerationService.calculateLeadPrice('quote_request', 'non-existent-partner');
  } catch (error: any) {
    console.log('✓ Caught non-existent partner error');
    console.log(`  Error: ${error.message}`);
  }

  // Missing required fields
  try {
    await leadGenerationService.createLead({
      partnerId: 'partner-123',
      userId: 'user-456',
      type: 'quote_request',
      contactInfo: {
        name: '',
        email: '',
        phone: ''
      }
    });
  } catch (error: any) {
    console.log('✓ Caught missing required fields error');
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Lead Generation Service - Example Usage               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await createQuoteRequestLead();
    await createConsultationLead();
    await createEligibilityCheckLead();
    await getPartnerLeadsExample();
    await calculatePricingExample();
    await leadLifecycleExample();
    await disputeHandlingExample();
    await conversionFunnelExample();
    await bulkLeadProcessingExample();
    await errorHandlingExample();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     All examples completed successfully! ✓                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Export examples for testing
export {
  createQuoteRequestLead,
  createConsultationLead,
  createEligibilityCheckLead,
  getPartnerLeadsExample,
  calculatePricingExample,
  leadLifecycleExample,
  disputeHandlingExample,
  conversionFunnelExample,
  bulkLeadProcessingExample,
  errorHandlingExample,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

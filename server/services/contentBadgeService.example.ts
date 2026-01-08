/**
 * Content Badge Service - Usage Examples
 * 
 * This file demonstrates practical usage patterns for the Content Badge Service
 */

import { contentBadgeService, ExploreContentItem } from './contentBadgeService';

// ============================================================================
// Example 1: Determine Badge for Property Content
// ============================================================================

export async function example1_PropertyContent() {
  const propertyContent: ExploreContentItem = {
    id: '123',
    contentType: 'property_tour',
    tags: ['property', 'listing', 'sandton', 'luxury'],
    metadata: {
      partnerCategory: 'Property Professional',
      price: 2500000,
      bedrooms: 3
    }
  };

  // Get complete badge configuration
  const badge = contentBadgeService.getBadgeForContent(propertyContent);
  console.log('Property Badge:', badge);
  // Output: { type: 'property', icon: '🏠', color: 'primary', label: 'Property' }

  // Get just the badge type
  const badgeType = contentBadgeService.determineBadgeType(propertyContent);
  console.log('Badge Type:', badgeType);
  // Output: 'property'

  // Get content category for hierarchy
  const category = contentBadgeService.getPrimaryCategory(propertyContent);
  console.log('Category:', category);
  // Output: 'primary'
}

// ============================================================================
// Example 2: Handle Multi-Category Content (Requirement 4.7)
// ============================================================================

export async function example2_MultiCategoryContent() {
  // Content with multiple category tags
  const multiCategoryContent: ExploreContentItem = {
    id: '456',
    contentType: 'educational',
    tags: ['property', 'finance', 'investment', 'first_time_buyer'],
    metadata: {
      partnerCategory: 'Financial Partner'
    }
  };

  // Service prioritizes: property > finance > service > design > expert_tip
  const badge = contentBadgeService.determineBadgeType(multiCategoryContent);
  console.log('Multi-Category Badge:', badge);
  // Output: 'property' (highest priority despite being educational content)

  // If we remove property tags, finance takes priority
  const financeContent: ExploreContentItem = {
    id: '457',
    contentType: 'educational',
    tags: ['finance', 'investment', 'service'],
    metadata: {}
  };

  const financeBadge = contentBadgeService.determineBadgeType(financeContent);
  console.log('Finance Priority Badge:', financeBadge);
  // Output: 'finance' (second priority)
}

// ============================================================================
// Example 3: Service Content with Tags
// ============================================================================

export async function example3_ServiceContent() {
  const serviceContent: ExploreContentItem = {
    id: '789',
    contentType: 'showcase',
    tags: ['renovation', 'home_improvement', 'kitchen'],
    metadata: {
      partnerCategory: 'Home Service Provider',
      serviceType: 'Renovation'
    }
  };

  const badge = contentBadgeService.getBadgeForContent(serviceContent);
  console.log('Service Badge:', badge);
  // Output: { type: 'service', icon: '🛠️', color: 'blue', label: 'Service' }
}

// ============================================================================
// Example 4: Finance Content
// ============================================================================

export async function example4_FinanceContent() {
  const financeContent: ExploreContentItem = {
    id: '101',
    contentType: 'finance',
    tags: ['bond', 'mortgage', 'affordability'],
    metadata: {
      partnerCategory: 'Financial Partner',
      topic: 'Bond Eligibility'
    }
  };

  const badge = contentBadgeService.getBadgeForContent(financeContent);
  console.log('Finance Badge:', badge);
  // Output: { type: 'finance', icon: '💰', color: 'green', label: 'Finance' }
}

// ============================================================================
// Example 5: Design/Inspiration Content
// ============================================================================

export async function example5_DesignContent() {
  const designContent: ExploreContentItem = {
    id: '202',
    contentType: 'inspiration',
    tags: ['design', 'architecture', 'modern', 'interior'],
    metadata: {
      partnerCategory: 'Content Educator',
      style: 'Modern Minimalist'
    }
  };

  const badge = contentBadgeService.getBadgeForContent(designContent);
  console.log('Design Badge:', badge);
  // Output: { type: 'design', icon: '📐', color: 'purple', label: 'Design' }
}

// ============================================================================
// Example 6: Expert Tip Content
// ============================================================================

export async function example6_ExpertTipContent() {
  const expertContent: ExploreContentItem = {
    id: '303',
    contentType: 'how_to',
    tags: ['educational', 'tips', 'first_time_buyer', 'guide'],
    metadata: {
      partnerCategory: 'Content Educator',
      topic: 'Home Buying Tips'
    }
  };

  const badge = contentBadgeService.getBadgeForContent(expertContent);
  console.log('Expert Tip Badge:', badge);
  // Output: { type: 'expert_tip', icon: '💡', color: 'amber', label: 'Expert Tip' }
}

// ============================================================================
// Example 7: Update Badge in Database
// ============================================================================

export async function example7_UpdateBadge() {
  const contentId = '123';

  // Update badge for regular content
  await contentBadgeService.updateContentBadge(contentId, false);
  console.log('Badge updated for content:', contentId);

  // Update badge for short (video)
  const shortId = '456';
  await contentBadgeService.updateContentBadge(shortId, true);
  console.log('Badge updated for short:', shortId);
}

// ============================================================================
// Example 8: Batch Update for Backfilling
// ============================================================================

export async function example8_BatchUpdate() {
  // Simulate getting content IDs that need badge updates
  const contentIds = ['id1', 'id2', 'id3', 'id4', 'id5'];

  console.log('Starting batch update for', contentIds.length, 'items...');
  
  await contentBadgeService.batchUpdateContentBadges(contentIds, false);
  
  console.log('Batch update complete!');
}

// ============================================================================
// Example 9: Get All Badge Configurations
// ============================================================================

export async function example9_AllBadgeConfigs() {
  const allBadges = contentBadgeService.getAllBadgeConfigs();
  
  console.log('All Badge Configurations:');
  allBadges.forEach(badge => {
    console.log(`- ${badge.label}: ${badge.icon} (${badge.color})`);
  });
  
  // Output:
  // - Property: 🏠 (primary)
  // - Expert Tip: 💡 (amber)
  // - Service: 🛠️ (blue)
  // - Finance: 💰 (green)
  // - Design: 📐 (purple)
}

// ============================================================================
// Example 10: Integration with Feed Generation
// ============================================================================

export async function example10_FeedIntegration() {
  // Simulate feed items
  const feedItems: ExploreContentItem[] = [
    {
      id: '1',
      contentType: 'property_tour',
      tags: ['property', 'listing']
    },
    {
      id: '2',
      contentType: 'how_to',
      tags: ['educational', 'tips']
    },
    {
      id: '3',
      contentType: 'service',
      tags: ['renovation', 'home_improvement']
    }
  ];

  // Add badges to all feed items
  const feedWithBadges = feedItems.map(item => ({
    ...item,
    badge: contentBadgeService.getBadgeForContent(item),
    category: contentBadgeService.getPrimaryCategory(item)
  }));

  console.log('Feed with badges:', feedWithBadges);
  
  // Can now use badges for display and category for hierarchy enforcement
}

// ============================================================================
// Example 11: Content Without Explicit Type
// ============================================================================

export async function example11_ContentWithoutType() {
  // Content with only tags, no explicit content type
  const vagueContent: ExploreContentItem = {
    id: '404',
    contentType: '', // Empty content type
    tags: ['security', 'home_security', 'alarm_system'],
    metadata: {}
  };

  // Service will determine badge from tags
  const badge = contentBadgeService.determineBadgeType(vagueContent);
  console.log('Badge from tags only:', badge);
  // Output: 'service' (detected from security-related tags)
}

// ============================================================================
// Example 12: Content with Metadata Hints
// ============================================================================

export async function example12_MetadataHints() {
  const contentWithMetadata: ExploreContentItem = {
    id: '505',
    contentType: 'showcase',
    tags: [],
    metadata: {
      partnerCategory: 'Financial Partner',
      categoryHint: 'finance'
    }
  };

  // Service will use metadata hints when tags are absent
  const badge = contentBadgeService.determineBadgeType(contentWithMetadata);
  console.log('Badge from metadata:', badge);
  // Output: 'finance' (detected from metadata)
}

// ============================================================================
// Example 13: Default Fallback
// ============================================================================

export async function example13_DefaultFallback() {
  // Content with no clear indicators
  const unknownContent: ExploreContentItem = {
    id: '606',
    contentType: 'unknown',
    tags: [],
    metadata: {}
  };

  // Service defaults to property badge
  const badge = contentBadgeService.determineBadgeType(unknownContent);
  console.log('Default badge:', badge);
  // Output: 'property' (default fallback)
}

// ============================================================================
// Example 14: Parse and Validate Badge Types
// ============================================================================

export async function example14_ParseValidate() {
  // Valid badge type
  const validType = contentBadgeService.parseBadgeType('finance');
  console.log('Valid type:', validType);
  // Output: 'finance'

  // Invalid badge type
  const invalidType = contentBadgeService.parseBadgeType('invalid');
  console.log('Invalid type:', invalidType);
  // Output: null

  // Valid category
  const validCategory = contentBadgeService.parseContentCategory('secondary');
  console.log('Valid category:', validCategory);
  // Output: 'secondary'

  // Invalid category
  const invalidCategory = contentBadgeService.parseContentCategory('invalid');
  console.log('Invalid category:', invalidCategory);
  // Output: null
}

// ============================================================================
// Example 15: Real-World API Endpoint Usage
// ============================================================================

export async function example15_APIEndpoint() {
  // Simulated API endpoint that returns content with badges
  
  interface ContentResponse {
    id: string;
    title: string;
    contentType: string;
    badge: {
      type: string;
      icon: string;
      color: string;
      label: string;
    };
    category: string;
  }

  // Simulate fetching content from database
  const dbContent: ExploreContentItem = {
    id: '707',
    contentType: 'property_tour',
    tags: ['property', 'luxury', 'estate'],
    metadata: { price: 5000000 }
  };

  // Prepare response with badge
  const response: ContentResponse = {
    id: dbContent.id.toString(),
    title: 'Luxury Estate Tour',
    contentType: dbContent.contentType,
    badge: contentBadgeService.getBadgeForContent(dbContent),
    category: contentBadgeService.getPrimaryCategory(dbContent)
  };

  console.log('API Response:', response);
  
  // Frontend can now render the badge directly
  return response;
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('\n=== Example 1: Property Content ===');
  await example1_PropertyContent();

  console.log('\n=== Example 2: Multi-Category Content ===');
  await example2_MultiCategoryContent();

  console.log('\n=== Example 3: Service Content ===');
  await example3_ServiceContent();

  console.log('\n=== Example 4: Finance Content ===');
  await example4_FinanceContent();

  console.log('\n=== Example 5: Design Content ===');
  await example5_DesignContent();

  console.log('\n=== Example 6: Expert Tip Content ===');
  await example6_ExpertTipContent();

  console.log('\n=== Example 7: Update Badge ===');
  await example7_UpdateBadge();

  console.log('\n=== Example 8: Batch Update ===');
  await example8_BatchUpdate();

  console.log('\n=== Example 9: All Badge Configs ===');
  await example9_AllBadgeConfigs();

  console.log('\n=== Example 10: Feed Integration ===');
  await example10_FeedIntegration();

  console.log('\n=== Example 11: Content Without Type ===');
  await example11_ContentWithoutType();

  console.log('\n=== Example 12: Metadata Hints ===');
  await example12_MetadataHints();

  console.log('\n=== Example 13: Default Fallback ===');
  await example13_DefaultFallback();

  console.log('\n=== Example 14: Parse and Validate ===');
  await example14_ParseValidate();

  console.log('\n=== Example 15: API Endpoint Usage ===');
  await example15_APIEndpoint();
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

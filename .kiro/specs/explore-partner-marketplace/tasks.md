# Implementation Plan: Explore Partner Marketplace System

## Overview

This implementation plan follows a phased approach aligned with the Cold Start strategy:
- **Sprint 0 (Pre-Launch, Weeks 1-8)**: Partner system, content governance, cold start infrastructure, admin tools
- **Sprint 1 (Launch, Weeks 9-12)**: Feed hierarchy, Topics, ranking, onboarding, public launch
- **Sprint 2 (Ramp-Up, Weeks 13-20)**: Monitor, optimize, scale, algorithm training
- **Sprint 3 (Monetization, Weeks 21-24)**: Subscriptions, boosts, leads, bundles

## Critical Path Dependencies

**Longest lead time items (start immediately):**
1. Founding partner recruitment (8 weeks) - Cannot be shortened
2. Content creation (6 weeks) - Requires templates first
3. Algorithm training (ongoing) - Requires 4+ weeks of user data

## Launch Decision Criteria

Launch when ALL are true:
- ✅ 200+ pieces of content across all categories
- ✅ 15 founding partners enrolled and trained
- ✅ Launch readiness dashboard all green
- ✅ First-time user onboarding tested with 10+ users
- ✅ Feed performance <200ms consistently
- ✅ Admin moderation queue functional

## Tasks

- [x] 1. Set up database schema and core infrastructure
  - [x] 1.1 Create partner_tiers table with seed data for 4 tiers
    - Define tier permissions (content types, CTAs)
    - Insert seed data for Property Professional, Home Service Provider, Financial Partner, Content Educator
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Create partners table with indexes
    - Include tier_id, verification_status, trust_score, service_locations
    - Add foreign key to users table
    - _Requirements: 1.1, 5.1_
  - [x] 1.3 Create topics table with seed data
    - Insert 8 core topics (Find Your Home, Home Security, etc.)
    - Include content_tags, property_features, partner_categories
    - _Requirements: 3.1_
  - [x] 1.4 Create content_topics mapping table
    - Enable many-to-many relationship between content and topics
    - Include relevance_score field
    - _Requirements: 3.2, 3.4_
  - [x] 1.5 Create content_approval_queue table
    - Track submission status, reviewer, feedback
    - Include auto_approval_eligible flag
    - _Requirements: 6.1, 6.2_
  - [x] 1.6 Extend explore_content and explore_shorts tables
    - Add partner_id, content_category, badge_type columns
    - Add is_launch_content flag for cold start tracking
    - _Requirements: 4.1, 16.4_
  - [ ]* 1.7 Write property test for partner tier validation
    - **Property 1: Partner Tier Content Validation**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 2. Implement Partner Management Service
  - [x] 2.1 Create PartnerService with registration and tier assignment
    - Implement registerPartner() with tier validation
    - Implement assignTier() with permission checks
    - _Requirements: 1.1, 1.6_
  - [x] 2.2 Implement partner profile management
    - Create updateProfile() for company info, logo, description
    - Implement getPartnerProfile() with aggregated data
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 2.3 Implement partner verification workflow
    - Create verifyPartner() with credential validation
    - Implement verification badge propagation to content
    - _Requirements: 5.5, 5.6_
  - [x] 2.4 Implement trust score calculation
    - Calculate based on verification, reviews, content quality, engagement
    - Update score on relevant events
    - _Requirements: 10.5_
  - [ ]* 2.5 Write property test for verification badge propagation
    - **Property 5: Partner Verification Badge Propagation**
    - **Validates: Requirements 5.5**

- [x] 3. Implement Content Approval Service
  - [x] 3.1 Create ApprovalService with submission routing
    - Route first 3 submissions to manual queue
    - Enable auto-approval after 3 approved pieces
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 Implement content validation rules
    - Validate content type against tier permissions
    - Validate CTAs against tier permissions
    - Validate metadata completeness
    - _Requirements: 1.6, 15.2, 15.3_
  - [x] 3.3 Implement content flagging and review routing
    - Create flagContent() for user reports
    - Route flagged content to manual review
    - _Requirements: 6.3_
  - [x] 3.4 Implement review decision workflow
    - Create reviewContent() with approve/reject/revision actions
    - Provide feedback on rejection
    - _Requirements: 6.5_
  - [ ]* 3.5 Write property test for approval routing
    - **Property 6: Content Approval Routing**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 4. Checkpoint - Ensure partner system tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Content Hierarchy Engine
  - [x] 5.1 Create HierarchyEngine with content categorization
    - Categorize content as primary/secondary/tertiary
    - Map content types to categories
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.2 Implement ratio calculation and validation
    - Calculate ratios per 20-item segments
    - Validate against 70/20/10 bounds (60-80% primary)
    - _Requirements: 2.4, 2.5_
  - [x] 5.3 Implement feed rebalancing logic
    - Rebalance when primary drops below 60%
    - Surface older property content when needed
    - _Requirements: 2.4, 2.6_
  - [x] 5.4 Implement launch period ratio override
    - Use 80% primary during launch period
    - Gradually transition to 70% over 2 weeks
    - _Requirements: 2.7, 2.8, 16.15, 16.16_
  - [ ]* 5.5 Write property test for content hierarchy ratios
    - **Property 2: Content Hierarchy Ratio Enforcement**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 6. Implement Topics Navigation Service
  - [x] 6.1 Create TopicsService with CRUD operations
    - Implement getAllTopics() with display ordering
    - Implement getTopicBySlug() for URL routing
    - _Requirements: 3.1_
  - [x] 6.2 Implement topic-based content filtering
    - Filter by content_tags, property_features, partner_categories
    - Apply to all content types (videos, cards, neighbourhoods)
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 6.3 Implement topic content tagging
    - Create tagContentWithTopics() for content-topic mapping
    - Calculate relevance scores
    - _Requirements: 3.2_
  - [x] 6.4 Implement insufficient content handling
    - Show "Coming Soon" for topics with <20 items
    - Suggest related topics
    - _Requirements: 3.6, 16.36_
  - [ ]* 6.5 Write property test for topic filtering
    - **Property 3: Topic Feed Filtering**
    - **Validates: Requirements 3.2, 3.4**

- [x] 7. Implement Content Badge Service
  - [x] 7.1 Create BadgeService with type determination
    - Map content categories to badge types
    - Handle multi-category content (primary badge only)
    - _Requirements: 4.1, 4.7_
  - [x] 7.2 Implement badge rendering configuration
    - Define icons, colors, labels for each badge type
    - Property (🏠, primary), Expert Tip (💡, amber), Service (🛠️, blue), Finance (💰, green), Design (📐, purple)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 7.3 Write property test for badge consistency
    - **Property 4: Content Badge Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [x] 8. Implement Feed Ranking Service
  - [x] 8.1 Create RankingService with weighted scoring
    - Implement calculateRankingScore() with 5 factors
    - User Interest (35%), Quality (25%), Local (20%), Recency (10%), Trust (10%)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 8.2 Implement boost multiplier application
    - Apply boost multipliers to ranking scores
    - Ensure boosted content doesn't dominate
    - _Requirements: 10.6_
  - [x] 8.3 Implement boost ratio enforcement
    - Limit boosted content to 1 per 10 organic items
    - _Requirements: 8.3_
  - [ ]* 8.4 Write property test for ranking weights
    - **Property 14: Ranking Weight Sum**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  - [ ]* 8.5 Write property test for boost ratio
    - **Property 10: Boost Ratio Limit**
    - **Validates: Requirements 8.3, 10.6**

- [x] 9. Checkpoint - Ensure feed generation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. Implement Cold Start Infrastructure
  - [x] 10.1 Create launch_phases table and LaunchService
    - Track current phase (pre_launch, launch_period, ramp_up, ecosystem_maturity)
    - Store phase configuration (ratios, weights)
    - _Requirements: 16.13, 16.19_
  - [x] 10.2 Implement content quota tracking
    - Create launch_content_quotas table
    - Track progress toward 200+ content pieces
    - _Requirements: 16.3, 16.5_
  - [-] 10.3 Implement launch readiness check
    - Validate all quotas are met before launch
    - Block launch if quotas not met
    - _Requirements: 16.6_
  - [ ] 10.4 Implement launch metrics tracking
    - Track topic engagement, partner content watch rate, save/share rate
    - Calculate algorithm confidence score
    - _Requirements: 16.17, 16.22, 16.31_
  - [ ]* 10.5 Write property test for launch quota enforcement
    - **Property 23: Launch Content Quota Enforcement**
    - **Validates: Requirements 16.3, 16.5, 16.6**

- [x] 11. Implement Founding Partner Service
  - [x] 11.1 Create founding_partners table and service
    - Track enrollment, benefits, content commitments
    - Limit to 15 founding partners
    - _Requirements: 16.25, 16.29_
  - [x] 11.2 Implement founding partner benefits
    - Grant 3 months Featured tier, founding badge, fast-track review
    - _Requirements: 16.26, 16.28_
  - [x] 11.3 Implement content commitment tracking
    - Track pre-launch (5-10 pieces) and weekly (2/week) commitments
    - Issue warnings for missed commitments
    - _Requirements: 16.30_
  - [ ]* 11.4 Write property test for founding partner limits
    - **Property 25: Founding Partner Enrollment Limit**
    - **Validates: Requirements 16.29**

- [x] 12. Implement Onboarding Service
  - [x] 12.1 Create user_onboarding_state table and service
    - Track first session, tooltips shown, features unlocked
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x] 12.2 Implement welcome overlay flow
    - Show overlay on first session
    - Suggest 3 topics based on user profile
    - _Requirements: 16.7, 16.8, 16.9_
  - [x] 12.3 Implement progressive disclosure logic
    - Unlock filters/save after 10+ views
    - Unlock Topics after 3+ saves
    - Unlock partner profiles after partner engagement
    - _Requirements: 14.2, 14.3, 14.4_
  - [x] 12.4 Implement tooltip system
    - Show topic tooltip after 5 items scrolled
    - Show partner content tooltip on first encounter
    - _Requirements: 16.10, 16.11, 16.12_
  - [ ]* 12.5 Write property test for progressive disclosure
    - **Property 20: Progressive Disclosure Thresholds**
    - **Validates: Requirements 14.2, 14.3, 14.4**

- [x] 13. Checkpoint - Ensure cold start tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Quality Scoring Service
  - [x] 14.1 Create content_quality_scores table and service
    - Calculate initial score from metadata completeness
    - _Requirements: 11.1_
  - [x] 14.2 Implement engagement-based score updates
    - Increase score for watch time, saves, click-throughs
    - Decrease score for quick skips, reports
    - _Requirements: 11.2, 11.3_
  - [x] 14.3 Implement visibility reduction for low scores
    - Reduce feed visibility when score below threshold
    - _Requirements: 11.4_
  - [x] 14.4 Implement underperformance notifications
    - Notify partners of consistently underperforming content
    - _Requirements: 11.6_
  - [ ]* 14.5 Write property test for quality score updates
    - **Property 15: Quality Score Engagement Update**
    - **Validates: Requirements 11.2, 11.3**

- [x] 15. Implement Subscription Service
  - [x] 15.1 Create partner_subscriptions table and service
    - Define tiers: free, basic (R500), premium (R2000), featured (R5000)
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  - [x] 15.2 Implement feature access control
    - Map features to subscription tiers
    - Check feature access on relevant operations
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 15.3 Implement subscription state transitions
    - Handle upgrades with immediate benefit application
    - Handle lapses with downgrade to basic
    - _Requirements: 7.4, 7.5_
  - [ ]* 15.4 Write property test for subscription features
    - **Property 7: Subscription Feature Access**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**

- [-] 16. Implement Boost Campaign Service
  - [x] 16.1 Create boost_campaigns table and service
    - Require topic selection for targeting
    - Track budget, spent, impressions, clicks
    - _Requirements: 8.1, 8.4_
  - [x] 16.2 Implement boost activation and budget tracking
    - Record impressions and clicks
    - Auto-pause when budget depleted
    - _Requirements: 8.5_
  - [x] 16.3 Implement sponsored label display
    - Add "Sponsored" label to boosted content
    - _Requirements: 8.2_
  - [x] 16.4 Implement boost eligibility validation
    - Reject boosts that violate content hierarchy
    - _Requirements: 8.6_
  - [ ]* 16.5 Write property test for budget depletion
    - **Property 11: Boost Budget Depletion**
    - **Validates: Requirements 8.5**

- [x] 17. Implement Lead Generation Service
  - [x] 17.1 Create leads table and service
    - Define lead types and pricing ranges
    - Capture contact info and intent details
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 17.2 Implement lead pricing calculation
    - Quote request: R50-R200
    - Consultation: R100-R300
    - Eligibility check: R500-R1000
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 17.3 Implement partner notification
    - Send email and dashboard notification on new lead
    - _Requirements: 9.5_
  - [x] 17.4 Implement dispute handling
    - Allow lead disputes with reason
    - Process refunds for valid disputes
    - _Requirements: 9.6_
  - [ ]* 17.5 Write property test for lead pricing
    - **Property 12: Lead Pricing Bounds**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 18. Implement Marketplace Bundles
  - [x] 18.1 Create marketplace_bundles and bundle_partners tables
    - Define bundle categories (Finance, Legal, Inspection, Insurance)
    - _Requirements: 12.1_
  - [x] 18.2 Implement bundle display with partner info
    - Show partner ratings and verification status
    - _Requirements: 12.4_
  - [x] 18.3 Implement bundle attribution tracking
    - Track user engagements with bundle partners
    - _Requirements: 12.3_
  - [ ]* 18.4 Write property test for bundle attribution
    - **Property 18: Bundle Attribution Tracking**
    - **Validates: Requirements 12.3**

- [x] 19. Implement Partner Analytics Dashboard
  - [x] 19.1 Create analytics aggregation queries
    - Calculate total views, engagement rate, lead conversions
    - _Requirements: 13.1_
  - [x] 19.2 Implement trend calculations
    - Show daily, weekly, monthly performance trends
    - _Requirements: 13.2_
  - [x] 19.3 Implement content ranking by performance
    - Rank partner's content pieces by engagement
    - _Requirements: 13.3_
  - [x] 19.4 Implement conversion funnel analytics
    - Track view → engagement → lead funnel
    - _Requirements: 13.4_
  - [x] 19.5 Implement benchmark comparisons
    - Compare partner performance to tier averages
    - _Requirements: 13.5_
  - [x] 19.6 Implement boost ROI metrics
    - Calculate ROI for each boost campaign
    - _Requirements: 13.6_
  - [ ]* 19.7 Write property test for analytics consistency
    - **Property 19: Analytics Metrics Calculation**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

- [x] 20. Checkpoint - Ensure monetization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement API Endpoints
  - [x] 21.1 Create Partner API routes
    - POST /api/partners - Register partner
    - GET /api/partners/:id - Get partner profile
    - PUT /api/partners/:id - Update partner profile
    - POST /api/partners/:id/verify - Submit verification
    - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4_
  - [x] 21.2 Create Content API routes
    - POST /api/content/submit - Submit content for approval
    - GET /api/content/approval-queue - Get approval queue (admin)
    - POST /api/content/:id/review - Review content (admin)
    - POST /api/content/:id/flag - Flag content
    - _Requirements: 6.1, 6.3, 6.5_
  - [x] 21.3 Create Topics API routes
    - GET /api/topics - Get all topics
    - GET /api/topics/:slug/feed - Get topic-filtered feed
    - _Requirements: 3.1, 3.2_
  - [x] 21.4 Create Subscription API routes
    - POST /api/subscriptions - Create subscription
    - PUT /api/subscriptions/:id - Upgrade subscription
    - DELETE /api/subscriptions/:id - Cancel subscription
    - _Requirements: 7.1, 7.4, 7.5_
  - [x] 21.5 Create Boost API routes
    - POST /api/boosts - Create boost campaign
    - PUT /api/boosts/:id/activate - Activate campaign
    - PUT /api/boosts/:id/pause - Pause campaign
    - GET /api/boosts/:id/analytics - Get campaign analytics
    - _Requirements: 8.1, 8.4, 8.5_
  - [x] 21.6 Create Lead API routes
    - POST /api/leads - Create lead
    - GET /api/partners/:id/leads - Get partner leads
    - POST /api/leads/:id/dispute - Dispute lead
    - _Requirements: 9.4, 9.5, 9.6_

- [-] 22. Implement Frontend Components
  - [x] 22.1 Create Topics navigation component
    - Horizontal scrollable topic list
    - Active topic highlighting
    - _Requirements: 3.1_
  - [x] 22.2 Create Content Badge component
    - Render badge in top-left corner
    - Support all badge types with correct colors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 22.3 Create Partner Profile page
    - Display verification badge, reviews, locations, metrics
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 22.4 Create Onboarding overlay and tooltips
    - Welcome overlay with topic suggestions
    - Progressive disclosure tooltips
    - _Requirements: 16.7, 16.8, 16.10, 16.11_
  - [x] 22.5 Create Partner Dashboard
    - Analytics overview, content list, lead management
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ] 23. Final checkpoint - Full integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify end-to-end flows work correctly
  - Validate cold start readiness checks

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation follows phased approach: Partner System → Feed Generation → Cold Start → Monetization


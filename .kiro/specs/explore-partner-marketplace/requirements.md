# Requirements Document: Explore Partner Marketplace System

## Introduction

The Explore Partner Marketplace System transforms Explore from a property discovery feature into a comprehensive Home & Lifestyle Operating System. This system introduces a structured partner ecosystem with tiered governance, intent-based navigation through Topics, enforced content hierarchy (70/20/10 rule), and integrated monetization. The core principle is that Explore must feel like entertainment that happens to convert — never like a marketplace.

This spec builds upon the existing Explore Discovery Engine by adding the partner layer, content governance, and monetization framework that enables sustainable growth while maintaining content quality.

## Glossary

- **Partner**: Any entity (agent, developer, agency, service provider, financial institution, educator) that creates content for Explore
- **Partner Tier**: Classification level determining content types, CTAs, and governance rules for partners
- **Topics**: Intent-based navigation categories that dynamically reconfigure the feed (e.g., "Find Your Home", "Home Security")
- **Content Hierarchy**: The 70/20/10 distribution rule for Primary (Properties), Secondary (Services/Education), and Tertiary (Inspiration) content
- **Content Badge**: Visual indicator showing content type (🏠 Property, 💡 Expert Tip, 🛠️ Service, 💰 Finance, 📐 Design)
- **Partner Profile**: Trust-building page displaying verification, reviews, service locations, and content performance
- **Boost**: Paid promotion that increases content visibility within topic-specific feeds
- **Lead**: A qualified user action (quote request, consultation booking, eligibility check) that partners pay for
- **Content Approval**: Manual or automated review process ensuring content meets quality and governance standards
- **Trust Score**: Calculated metric based on verification status, reviews, content quality, and engagement

## Requirements

### Requirement 1: Partner Tier System

**User Story:** As a platform administrator, I want to classify partners into tiers with specific content rules, so that the feed maintains quality and appropriate content types.

#### Acceptance Criteria

1. WHEN a partner registers, THE System SHALL assign them to one of four tiers: Property Professional, Home Service Provider, Financial Partner, or Content Educator
2. WHEN a Tier 1 (Property Professional) partner creates content, THE System SHALL restrict them to property-only content with View Listing, Contact, and Save CTAs
3. WHEN a Tier 2 (Home Service Provider) partner creates content, THE System SHALL allow educational and showcase content with Request Quote and Book Consult CTAs
4. WHEN a Tier 3 (Financial Partner) partner creates content, THE System SHALL restrict them to educational-only content with Check Eligibility and Learn More CTAs
5. WHEN a Tier 4 (Content Educator) partner creates content, THE System SHALL allow pure education and inspiration content with Follow, Save, and Share CTAs
6. WHERE a partner attempts to create content outside their tier permissions, THE System SHALL reject the submission with clear guidance

### Requirement 2: Content Hierarchy Enforcement

**User Story:** As a platform administrator, I want the feed to maintain a strict content ratio, so that users primarily associate Explore with finding homes.

#### Acceptance Criteria

1. WHEN the System generates any feed, THE System SHALL maintain approximately 70% Primary content (Properties & Developments)
2. WHEN the System generates any feed, THE System SHALL include approximately 20% Secondary content (Home Services, Finance, Education)
3. WHEN the System generates any feed, THE System SHALL include approximately 10% Tertiary content (Inspiration, Trends, Market Context)
4. WHEN Primary content drops below 60% in any feed segment, THE System SHALL automatically rebalance by prioritizing property content
5. WHEN calculating content ratios, THE System SHALL evaluate per 20-item feed segments
6. WHERE insufficient Primary content exists, THE System SHALL surface older property content before allowing ratio violation

### Requirement 3: Topics Navigation System

**User Story:** As a property seeker, I want to select topics that match my intent, so that the feed reconfigures to show relevant content across all types.

#### Acceptance Criteria

1. WHEN a user views Explore, THE System SHALL display a horizontal scrollable list of Topics including: Find Your Home, Home Security, Renovations & Upgrades, Finance & Investment, Architecture & Design, First-Time Buyers, Smart Homes, Estate Living
2. WHEN a user selects a Topic, THE System SHALL reconfigure the entire feed to prioritize content matching that intent
3. WHEN "Home Security" Topic is selected, THE System SHALL surface properties with security features, security partner content, and security-related educational videos
4. WHEN a Topic is active, THE System SHALL filter all content types (videos, cards, neighbourhoods) to match the Topic context
5. WHEN no Topic is selected, THE System SHALL display the default personalized feed
6. WHERE a Topic has insufficient content, THE System SHALL display a message and suggest related Topics

### Requirement 4: Content Badge System

**User Story:** As a user browsing Explore, I want to instantly understand what type of content I'm viewing, so that I can make informed decisions about engagement.

#### Acceptance Criteria

1. WHEN displaying any content card or video, THE System SHALL show a content badge in the top-left corner
2. WHEN content is property-related, THE System SHALL display a 🏠 Property badge in the primary brand colour
3. WHEN content is educational tips, THE System SHALL display a 💡 Expert Tip badge in amber
4. WHEN content is service-related, THE System SHALL display a 🛠️ Service badge in blue
5. WHEN content is finance-related, THE System SHALL display a 💰 Finance badge in green
6. WHEN content is design-related, THE System SHALL display a 📐 Design badge in purple
7. WHERE content spans multiple categories, THE System SHALL display the primary category badge only

### Requirement 5: Partner Profile Trust Layer

**User Story:** As a user considering a partner's services, I want to view their credibility information, so that I can make informed decisions about engagement.

#### Acceptance Criteria

1. WHEN a user views a partner profile, THE System SHALL display verification badge status
2. WHEN a partner profile loads, THE System SHALL show aggregated reviews and ratings from users
3. WHEN a partner profile displays, THE System SHALL list service locations and coverage areas
4. WHEN a partner profile loads, THE System SHALL show content performance metrics (views, saves, engagement rate)
5. WHEN a partner is verified, THE System SHALL display a prominent verification badge on all their content
6. WHERE a partner has no reviews, THE System SHALL display "New Partner" indicator instead of empty ratings

### Requirement 6: Content Approval Workflow

**User Story:** As a platform administrator, I want content to be reviewed before publication, so that quality standards are maintained.

#### Acceptance Criteria

1. WHEN a new partner submits their first 3 pieces of content, THE System SHALL route them to manual review queue
2. WHEN a partner has 3 approved pieces of content, THE System SHALL enable automated approval for subsequent submissions
3. WHEN content is flagged by users, THE System SHALL route it to manual review regardless of partner status
4. WHEN reviewing content, THE System SHALL apply the "Would I watch this even if I wasn't buying?" test
5. WHEN content fails review, THE System SHALL provide specific feedback and allow resubmission
6. WHERE content is purely promotional without educational value, THE System SHALL reject with guidance to add value

### Requirement 7: Partner Subscription Tiers

**User Story:** As a partner, I want to choose a subscription level that matches my business needs, so that I can access appropriate features and reach.

#### Acceptance Criteria

1. WHEN a partner subscribes to Basic tier (R500/month), THE System SHALL provide standard profile, basic analytics, and organic reach
2. WHEN a partner subscribes to Premium tier (R2,000/month), THE System SHALL provide enhanced profile, detailed analytics, priority support, and increased reach
3. WHEN a partner subscribes to Featured tier (R5,000/month), THE System SHALL provide premium profile placement, advanced analytics, dedicated support, and maximum organic reach
4. WHEN a subscription lapses, THE System SHALL downgrade partner to Basic tier features
5. WHEN a partner upgrades, THE System SHALL apply new benefits immediately
6. WHERE a partner has no subscription, THE System SHALL allow limited free content with reduced visibility

### Requirement 8: Boosted Discovery

**User Story:** As a partner, I want to boost my content visibility within specific Topics, so that I can reach more relevant users.

#### Acceptance Criteria

1. WHEN a partner creates a boost campaign, THE System SHALL require Topic selection for targeting
2. WHEN boosted content appears in feeds, THE System SHALL display a subtle "Sponsored" label
3. WHEN calculating feed composition, THE System SHALL limit boosted content to 1 per every 10 organic items
4. WHEN a boost campaign is active, THE System SHALL provide real-time performance analytics
5. WHEN boost budget is depleted, THE System SHALL automatically pause the campaign and notify the partner
6. WHERE boosted content violates content hierarchy rules, THE System SHALL reject the boost request

### Requirement 9: Lead Generation System

**User Story:** As a partner, I want to receive qualified leads from interested users, so that I can convert Explore engagement into business.

#### Acceptance Criteria

1. WHEN a user requests a quote from a Tier 2 partner, THE System SHALL charge the partner R50-R200 per lead
2. WHEN a user books a consultation, THE System SHALL charge the partner R100-R300 per lead
3. WHEN a user checks bond eligibility with a Tier 3 partner, THE System SHALL charge the partner R500-R1,000 per lead
4. WHEN a lead is generated, THE System SHALL capture user contact information and intent details
5. WHEN a partner receives a lead, THE System SHALL notify them immediately via email and dashboard
6. WHERE a lead is disputed as invalid, THE System SHALL review and potentially refund within 48 hours

### Requirement 10: Feed Ranking Algorithm

**User Story:** As a platform administrator, I want the feed ranking to balance user interest, content quality, and partner trust, so that users see the best content.

#### Acceptance Criteria

1. WHEN calculating content ranking score, THE System SHALL weight User Interest at 35%
2. WHEN calculating content ranking score, THE System SHALL weight Content Quality at 25%
3. WHEN calculating content ranking score, THE System SHALL weight Local Relevance at 20%
4. WHEN calculating content ranking score, THE System SHALL weight Recency at 10%
5. WHEN calculating content ranking score, THE System SHALL weight Partner Trust at 10%
6. WHEN applying boost multipliers, THE System SHALL ensure boosted content never dominates organic content
7. WHERE a small partner has high-quality content, THE System SHALL allow them to outperform larger partners

### Requirement 11: Content Quality Scoring

**User Story:** As a platform administrator, I want content to be scored for quality, so that high-quality content surfaces naturally.

#### Acceptance Criteria

1. WHEN content is published, THE System SHALL calculate an initial quality score based on metadata completeness
2. WHEN users engage with content, THE System SHALL update quality score based on watch time, saves, and click-throughs
3. WHEN content receives negative signals (quick skips, reports), THE System SHALL decrease quality score
4. WHEN quality score drops below threshold, THE System SHALL reduce content visibility in feeds
5. WHEN calculating quality, THE System SHALL consider video production quality, caption accuracy, and metadata accuracy
6. WHERE content consistently underperforms, THE System SHALL notify the partner with improvement suggestions

### Requirement 12: Marketplace Bundles

**User Story:** As a first-time buyer, I want to access curated service bundles, so that I can find all the services I need in one place.

#### Acceptance Criteria

1. WHEN a user views a bundle (e.g., First-Time Buyer Bundle), THE System SHALL display curated partners for Finance, Legal, Inspection, and Insurance
2. WHEN partners are included in bundles, THE System SHALL charge them for inclusion based on bundle prominence
3. WHEN a user engages with a bundle partner, THE System SHALL track attribution for the bundle
4. WHEN displaying bundles, THE System SHALL show partner ratings and verification status
5. WHEN a bundle partner underperforms, THE System SHALL review and potentially remove them from the bundle
6. WHERE bundles are displayed, THE System SHALL integrate them naturally within the feed without disrupting content flow

### Requirement 13: Partner Analytics Dashboard

**User Story:** As a partner, I want to view detailed analytics about my content performance, so that I can optimize my Explore strategy.

#### Acceptance Criteria

1. WHEN a partner views their dashboard, THE System SHALL display total views, engagement rate, and lead conversions
2. WHEN viewing analytics, THE System SHALL show performance trends over time (daily, weekly, monthly)
3. WHEN a partner has multiple content pieces, THE System SHALL rank them by performance
4. WHEN viewing lead analytics, THE System SHALL show conversion funnel from view to lead
5. WHEN comparing to benchmarks, THE System SHALL show partner performance relative to tier averages
6. WHERE a partner has boost campaigns, THE System SHALL show ROI metrics for each campaign

### Requirement 14: Progressive Disclosure UX

**User Story:** As a new user, I want a simple initial experience that reveals complexity as I engage, so that I'm not overwhelmed.

#### Acceptance Criteria

1. WHEN a first-time user views Explore, THE System SHALL display video-first content with minimal controls
2. WHEN a user has viewed 10+ pieces of content, THE System SHALL reveal filter and save functionality
3. WHEN a user has saved 3+ items, THE System SHALL reveal Topics navigation
4. WHEN a user has engaged with partner content, THE System SHALL reveal partner profile links
5. WHEN complexity is revealed, THE System SHALL use subtle animations to introduce new features
6. WHERE a user explicitly requests advanced features, THE System SHALL unlock them immediately

### Requirement 15: Content Rule Enforcement

**User Story:** As a platform administrator, I want content rules to be automatically enforced, so that the feed maintains quality without manual intervention.

#### Acceptance Criteria

1. WHEN content contains promotional language without educational value, THE System SHALL flag for review
2. WHEN content CTAs don't match partner tier permissions, THE System SHALL reject the submission
3. WHEN content metadata is incomplete, THE System SHALL require completion before publication
4. WHEN content violates community guidelines, THE System SHALL remove immediately and notify partner
5. WHEN a partner repeatedly violates rules, THE System SHALL escalate to account review
6. WHERE automated detection is uncertain, THE System SHALL route to manual review queue


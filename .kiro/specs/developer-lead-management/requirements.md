# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive Developer Sales Engine designed to transform property developers' sales velocity through high-quality lead generation, intelligent affordability matching, automated sales workflows, and strategic pricing intelligence. Unlike traditional property listing portals that simply generate traffic, this platform positions itself as a complete sales partner for property developers in South Africa, focusing on qualified leads, conversion optimization, and data-driven decision making rather than attempting to replace existing ERP systems.

The platform's core differentiators include real-time affordability-based unit matching (ensuring 95% qualified leads instead of 20%), one-click unit reservations with auto-generated Offer to Purchase documents, integrated bond originator workflows, market demand heatmaps for pricing strategy, and automated sales funnels with lead journey tracking. These features transform the platform from a passive listing site into an active sales acceleration tool.

The system will serve developers of all sizes (boutique, mid-size, and large-scale) with priority given to residential developments, while maintaining flexibility for commercial, mixed-use, and other development types. The platform implements a three-tier subscription model with free trial access, enabling developers to experience value before committing.

## Glossary

- **Developer**: A property development company or individual that creates new residential, commercial, or mixed-use real estate projects
- **Development**: A real estate project consisting of multiple units (apartments, houses, commercial spaces) being built or marketed by a Developer
- **Unit**: An individual property within a Development (e.g., apartment 2B, house plot 15)
- **Lead**: A potential buyer who has expressed interest in a Development or Unit through the Platform
- **Qualified Lead**: A Lead that has passed affordability pre-qualification criteria and meets Developer-specified requirements
- **Platform**: The web-based system providing lead management, analytics, and marketing tools to Developers
- **Lead Routing**: The automated process of assigning Leads to specific agents or sales team members based on predefined rules
- **Inventory Management**: The system for tracking Unit availability status (available, reserved, sold)
- **Affordability Calculator**: A tool that estimates a buyer's purchasing power based on income, expenses, and deposit
- **Bond Originator**: A financial services partner that facilitates home loan applications and pre-qualifications
- **CRM Integration**: The ability to connect the Platform with external Customer Relationship Management systems
- **Analytics Dashboard**: A visual interface displaying metrics, trends, and performance data for Developments and Leads
- **Development Landing Page**: A dedicated, branded web page showcasing a specific Development with media, pricing, and unit information
- **Phase**: A distinct stage or section of a Development with its own timeline, pricing, and inventory
- **Subscription Tier**: A pricing level (Free Trial, Basic, Premium) that determines feature access and limits
- **Internal Marketing**: Marketing activities and campaigns conducted within the Platform (not external advertising platforms)
- **Lead Source**: The origin channel through which a Lead discovered the Development (organic search, social media, referral, etc.)
- **Conversion Rate**: The percentage of Leads that progress to a desired action (viewing, offer, sale)
- **Unit Performance**: Analytics showing which Unit types receive the most interest and engagement
- **Real-time Update**: Information that is synchronized immediately or within seconds of a change occurring
- **Affordability Matching**: The process of filtering and highlighting Units that fall within a buyer's calculated affordable price range
- **OTP (Offer to Purchase)**: A legal document outlining the terms of a property purchase offer, generated automatically by the Platform
- **Unit Reservation**: A temporary hold on a Unit preventing other buyers from reserving it, typically with a time limit
- **Bond Originator Partner**: A financial services company (e.g., BetterBond, Ooba) that facilitates home loan applications and pre-approvals
- **Demand Heatmap**: A visual analytics display showing which Unit types, price points, and features generate the most buyer interest
- **Sales Funnel**: A structured sequence of stages that Leads progress through from initial interest to final sale
- **Funnel Stage**: A specific step in the sales process (e.g., Interest, Affordability Check, Qualification, Tour Booking, OTP, Bond Application, Sale)
- **Lead Journey**: The complete path a Lead takes through the sales funnel, including all interactions and stage progressions
- **Pricing Intelligence**: Analytics-driven insights and recommendations for optimal Unit pricing based on demand patterns and market data
- **Qualified Lead Score**: A numerical or categorical rating indicating how likely a Lead is to convert based on affordability and engagement

## Requirements

### Requirement 1: Developer Account Management

**User Story:** As a property developer, I want to create and manage my developer account with subscription tiers, so that I can access platform features appropriate to my business needs and budget.

#### Acceptance Criteria

1. WHEN a new developer registers THEN the Platform SHALL create a developer account with free trial status
2. WHEN a developer account is created THEN the Platform SHALL assign the account to one of three subscription tiers (Free Trial, Basic, Premium)
3. WHEN a developer's free trial period expires THEN the Platform SHALL prompt the developer to select a paid subscription tier
4. WHEN a developer updates their subscription tier THEN the Platform SHALL immediately apply the new feature access limits and capabilities
5. WHEN a developer views their account settings THEN the Platform SHALL display company information, branding options, and subscription details

### Requirement 2: Development Profile Creation

**User Story:** As a property developer, I want to create detailed development profiles with rich media and comprehensive information, so that potential buyers can fully understand and visualize my projects.

#### Acceptance Criteria

1. WHEN a developer creates a new development profile THEN the Platform SHALL capture development name, type, location, description, and status
2. WHEN a developer uploads media to a development profile THEN the Platform SHALL support images, videos, 3D renders, floor plans, and PDF brochures
3. WHEN a developer specifies development phases THEN the Platform SHALL allow creation of multiple phases with independent timelines, pricing, and inventory
4. WHEN a developer adds amenities to a development THEN the Platform SHALL store and display amenity information on the development landing page
5. WHEN a developer sets a completion date THEN the Platform SHALL display the construction timeline to potential buyers

### Requirement 3: Unit Inventory Management

**User Story:** As a property developer, I want to manage unit inventory in real-time with availability tracking, so that buyers always see accurate information and I can prevent double-bookings.

#### Acceptance Criteria

1. WHEN a developer adds units to a development THEN the Platform SHALL capture unit type, size, price, floor plan, and unique identifier
2. WHEN a developer updates unit status THEN the Platform SHALL support status values of available, reserved, and sold
3. WHEN a unit is marked as reserved THEN the Platform SHALL display the reservation to other users and prevent duplicate reservations
4. WHEN a developer views the inventory dashboard THEN the Platform SHALL display an availability grid showing all units and their current status
5. WHEN a unit status changes THEN the Platform SHALL update the development landing page availability in real-time

### Requirement 4: Buyer Affordability Calculator

**User Story:** As a potential buyer, I want to check my affordability before contacting a developer, so that I can determine if a development matches my budget and avoid wasting time on unsuitable properties.

#### Acceptance Criteria

1. WHEN a buyer accesses the affordability calculator THEN the Platform SHALL request monthly income, monthly expenses, and available deposit
2. WHEN a buyer submits affordability information THEN the Platform SHALL calculate maximum affordable purchase price using standard lending criteria
3. WHEN the affordability calculation completes THEN the Platform SHALL display the estimated affordable price range to the buyer
4. WHEN a buyer's affordability matches a development's price range THEN the Platform SHALL mark the resulting lead as qualified
5. WHEN a buyer's affordability does not match a development's price range THEN the Platform SHALL still allow lead submission but mark it as unqualified

### Requirement 5: Lead Capture and Qualification

**User Story:** As a property developer, I want to capture leads with automatic qualification scoring, so that my sales team can prioritize high-quality prospects and improve conversion rates.

#### Acceptance Criteria

1. WHEN a buyer expresses interest in a development THEN the Platform SHALL capture name, email, phone number, and message
2. WHEN a lead is captured THEN the Platform SHALL record the lead source, referrer URL, and timestamp
3. WHEN a lead includes affordability calculator results THEN the Platform SHALL attach the affordability data to the lead record
4. WHEN a lead is created THEN the Platform SHALL assign a qualification status (qualified, unqualified, pending)
5. WHEN a qualified lead is created THEN the Platform SHALL trigger lead routing rules to assign the lead to an appropriate sales team member

### Requirement 6: Lead Routing and Assignment

**User Story:** As a property developer, I want leads to be automatically routed to the right sales team members based on rules I configure, so that leads receive prompt attention and my team's workload is balanced.

#### Acceptance Criteria

1. WHEN a developer configures lead routing rules THEN the Platform SHALL support routing based on development, unit type, lead source, and team member availability
2. WHEN a new lead arrives THEN the Platform SHALL evaluate routing rules and assign the lead to a specific team member
3. WHEN a lead is assigned THEN the Platform SHALL send a notification to the assigned team member via email and in-platform alert
4. WHEN no team member matches routing rules THEN the Platform SHALL assign the lead to a default queue for manual assignment
5. WHEN a team member is unavailable THEN the Platform SHALL skip that team member in the routing process

### Requirement 7: Lead Management Dashboard

**User Story:** As a property developer, I want a centralized dashboard to view and manage all leads with filtering and status tracking, so that I can monitor my sales pipeline and ensure no leads are neglected.

#### Acceptance Criteria

1. WHEN a developer accesses the lead management dashboard THEN the Platform SHALL display all leads with name, contact information, development, status, and assigned team member
2. WHEN a developer filters leads THEN the Platform SHALL support filtering by status, development, date range, qualification level, and assigned team member
3. WHEN a developer updates a lead status THEN the Platform SHALL support status values of new, contacted, qualified, viewing scheduled, offer made, converted, and lost
4. WHEN a developer views a lead detail THEN the Platform SHALL display full lead history including all interactions, status changes, and notes
5. WHEN a developer adds notes to a lead THEN the Platform SHALL timestamp the note and associate it with the user who created it

### Requirement 8: Development Analytics Dashboard

**User Story:** As a property developer, I want comprehensive analytics on development performance and lead behavior, so that I can make data-driven decisions about pricing, marketing, and future projects.

#### Acceptance Criteria

1. WHEN a developer views development analytics THEN the Platform SHALL display total views, unique visitors, and view trends over time
2. WHEN a developer views lead analytics THEN the Platform SHALL display total leads, lead sources, conversion rates, and cost per lead
3. WHEN a developer views unit performance analytics THEN the Platform SHALL display interest levels for each unit type with percentage breakdowns
4. WHEN a developer views conversion funnel analytics THEN the Platform SHALL display progression rates from view to lead to viewing to offer to sale
5. WHEN a developer exports analytics data THEN the Platform SHALL generate a downloadable report in CSV or PDF format

### Requirement 9: Development Landing Pages

**User Story:** As a property developer, I want branded landing pages for each development with custom styling, so that I can present a professional, cohesive brand experience to potential buyers.

#### Acceptance Criteria

1. WHEN a development is published THEN the Platform SHALL generate a unique URL for the development landing page
2. WHEN a buyer visits a development landing page THEN the Platform SHALL display development name, description, media gallery, pricing table, availability grid, and amenities
3. WHEN a developer customizes landing page branding THEN the Platform SHALL apply custom logo, colors, and tagline to the development landing page
4. WHEN a buyer views the pricing table THEN the Platform SHALL display unit types, size ranges, and price ranges organized by phase
5. WHEN a buyer clicks a call-to-action on the landing page THEN the Platform SHALL display a lead capture form with affordability calculator option

### Requirement 10: Internal Marketing Campaign Management

**User Story:** As a property developer, I want to create and track internal marketing campaigns for my developments, so that I can measure marketing effectiveness and optimize my promotional strategies.

#### Acceptance Criteria

1. WHEN a developer creates a marketing campaign THEN the Platform SHALL capture campaign name, target development, start date, end date, and budget
2. WHEN a campaign is active THEN the Platform SHALL track impressions, clicks, and leads generated from the campaign
3. WHEN a developer views campaign analytics THEN the Platform SHALL display click-through rate, cost per lead, and conversion rate
4. WHEN a campaign ends THEN the Platform SHALL generate a campaign performance report with all metrics and ROI calculation
5. WHEN a developer creates campaign content THEN the Platform SHALL support featured placement on homepage, search results, and development listings

### Requirement 11: Social Media Content Generation

**User Story:** As a property developer, I want to automatically generate social media content for my developments, so that I can maintain consistent marketing presence without manual design work.

#### Acceptance Criteria

1. WHEN a developer requests social media content THEN the Platform SHALL generate Instagram story, carousel post, and WhatsApp shareable formats
2. WHEN social media content is generated THEN the Platform SHALL include development images, key details, pricing, and contact information
3. WHEN a developer customizes social media content THEN the Platform SHALL allow selection of specific images, text overlays, and branding elements
4. WHEN social media content is ready THEN the Platform SHALL provide downloadable files in appropriate dimensions for each platform
5. WHEN a developer shares content THEN the Platform SHALL include trackable UTM parameters to measure campaign effectiveness

### Requirement 12: CRM Integration Preparation

**User Story:** As a property developer, I want the platform to prepare for future CRM integration, so that I can eventually connect my existing systems while using the platform's lead management as a fallback.

#### Acceptance Criteria

1. WHEN a developer enables CRM integration THEN the Platform SHALL provide webhook endpoints for lead data export
2. WHEN a lead is created THEN the Platform SHALL format lead data in a standardized JSON structure suitable for CRM import
3. WHEN a developer configures CRM settings THEN the Platform SHALL store CRM webhook URL and authentication credentials securely
4. WHEN CRM integration is disabled THEN the Platform SHALL continue to function fully using internal lead management
5. WHEN a lead is synced to external CRM THEN the Platform SHALL mark the lead as synced and store the external CRM identifier

### Requirement 13: Subscription Tier Feature Access

**User Story:** As a platform administrator, I want to enforce feature access based on subscription tiers, so that developers receive appropriate value at each pricing level and are incentivized to upgrade.

#### Acceptance Criteria

1. WHEN a developer on Free Trial tier accesses features THEN the Platform SHALL allow one development, basic analytics, and up to 50 leads per month
2. WHEN a developer on Basic tier accesses features THEN the Platform SHALL allow up to 5 developments, full analytics, lead management, and up to 200 leads per month
3. WHEN a developer on Premium tier accesses features THEN the Platform SHALL allow unlimited developments, advanced analytics, CRM integration, and unlimited leads
4. WHEN a developer exceeds tier limits THEN the Platform SHALL display an upgrade prompt and prevent access to restricted features
5. WHEN a developer upgrades their tier THEN the Platform SHALL immediately unlock additional features and increase limits

### Requirement 14: Lead Source Tracking and Attribution

**User Story:** As a property developer, I want detailed tracking of where my leads originate, so that I can optimize my marketing spend and focus on the most effective channels.

#### Acceptance Criteria

1. WHEN a lead is captured THEN the Platform SHALL record the referrer URL, UTM parameters, and landing page
2. WHEN a developer views lead source analytics THEN the Platform SHALL display leads grouped by source (organic search, social media, direct, referral, campaign)
3. WHEN a developer views source performance THEN the Platform SHALL display conversion rates and average lead quality for each source
4. WHEN a lead converts to a sale THEN the Platform SHALL attribute the conversion to the original lead source
5. WHEN a developer exports lead data THEN the Platform SHALL include source attribution information in the export

### Requirement 15: Multi-Phase Development Support

**User Story:** As a property developer, I want to manage developments with multiple phases independently, so that I can market and sell phases at different times with different pricing and timelines.

#### Acceptance Criteria

1. WHEN a developer creates a development phase THEN the Platform SHALL capture phase name, number, timeline, and status
2. WHEN a developer assigns units to a phase THEN the Platform SHALL associate units with the specific phase for inventory tracking
3. WHEN a buyer views a multi-phase development THEN the Platform SHALL display phases separately with individual availability and pricing
4. WHEN a developer updates phase status THEN the Platform SHALL support status values of planning, pre-launch, selling, sold out, and completed
5. WHEN analytics are generated THEN the Platform SHALL provide phase-level performance metrics in addition to overall development metrics

### Requirement 16: Real-Time Affordability-Based Unit Matching

**User Story:** As a potential buyer, I want to instantly see which specific units I can afford based on my financial profile, so that I only view and inquire about properties within my budget and avoid wasting time on unsuitable units.

#### Acceptance Criteria

1. WHEN a buyer completes the affordability calculator THEN the Platform SHALL filter and highlight all units within the buyer's affordable price range
2. WHEN a buyer views a development with affordability data THEN the Platform SHALL display units with visual indicators showing affordable, stretch, and out-of-range categories
3. WHEN a buyer's affordability matches specific units THEN the Platform SHALL sort matching units to the top of the unit list
4. WHEN a buyer submits a lead for an affordable unit THEN the Platform SHALL automatically mark the lead as highly qualified
5. WHEN a buyer attempts to inquire about an unaffordable unit THEN the Platform SHALL display a warning message but still allow the inquiry with lower qualification status

### Requirement 17: One-Click Unit Reservation with Auto-Generated OTP

**User Story:** As a potential buyer, I want to reserve a unit and receive an Offer to Purchase document instantly, so that I can secure my preferred unit quickly without waiting for manual paperwork.

#### Acceptance Criteria

1. WHEN a qualified buyer clicks Reserve Unit THEN the Platform SHALL mark the unit as reserved and start a reservation timer
2. WHEN a unit is reserved THEN the Platform SHALL automatically generate an Offer to Purchase document with buyer details, unit details, and pricing
3. WHEN the OTP is generated THEN the Platform SHALL send the document to both the buyer and the developer via email
4. WHEN a reservation timer expires THEN the Platform SHALL release the unit back to available status if no deposit is confirmed
5. WHEN a developer confirms a deposit THEN the Platform SHALL convert the reservation to sold status and notify all parties

### Requirement 18: Integrated Bond Originator Application Flow

**User Story:** As a potential buyer, I want to submit my bond application directly through the platform to partner originators, so that I can streamline my financing process and receive faster pre-approval.

#### Acceptance Criteria

1. WHEN a qualified buyer requests bond assistance THEN the Platform SHALL display partner bond originator options (BetterBond, Ooba, or configured partners)
2. WHEN a buyer selects a bond originator THEN the Platform SHALL pre-populate the application form with buyer information and unit details
3. WHEN a buyer submits a bond application THEN the Platform SHALL send the application data to the selected originator via API or webhook
4. WHEN a bond application is submitted THEN the Platform SHALL create a tracking record showing application status (submitted, in review, approved, declined)
5. WHEN a bond application status changes THEN the Platform SHALL update the developer dashboard and send notifications to relevant parties

### Requirement 19: Market Demand Heatmap and Pricing Intelligence

**User Story:** As a property developer, I want to see detailed demand patterns and pricing insights for my developments, so that I can make strategic pricing decisions and optimize my unit mix for future projects.

#### Acceptance Criteria

1. WHEN a developer views the demand heatmap THEN the Platform SHALL display which unit types receive the most views, leads, and conversions
2. WHEN a developer analyzes pricing performance THEN the Platform SHALL show which price points generate the most qualified leads and highest conversion rates
3. WHEN a developer reviews the sales funnel THEN the Platform SHALL identify where potential buyers drop off (viewing, affordability check, inquiry, reservation)
4. WHEN a developer views affordability analytics THEN the Platform SHALL display the average affordability range of all leads and visitors
5. WHEN pricing insights are generated THEN the Platform SHALL provide recommended price adjustments based on demand patterns, conversion rates, and market comparisons

### Requirement 20: Automated Sales Funnel with Lead Journey Tracking

**User Story:** As a property developer, I want to track each lead's progress through a structured sales funnel automatically, so that I can identify bottlenecks, optimize conversion, and ensure no leads fall through the cracks.

#### Acceptance Criteria

1. WHEN a lead is created THEN the Platform SHALL place the lead in the first stage of a pre-built sales funnel (Interest → Affordability → Qualification → Tour Booking → OTP → Bond Application → Sale)
2. WHEN a lead progresses through the funnel THEN the Platform SHALL automatically update the lead's stage based on their actions (completed affordability check, booked viewing, reserved unit)
3. WHEN a developer views the funnel dashboard THEN the Platform SHALL display all leads organized by funnel stage with conversion rates between stages
4. WHEN a lead stalls at a funnel stage THEN the Platform SHALL flag the lead for follow-up and suggest next actions to the assigned team member
5. WHEN a developer analyzes funnel performance THEN the Platform SHALL show average time spent at each stage, drop-off rates, and overall funnel conversion rate

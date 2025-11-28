# Design Document

## Overview

The Developer Sales Engine is a comprehensive web-based platform that transforms property developers' sales processes through intelligent lead qualification, automated workflows, and data-driven insights. The system architecture prioritizes real-time affordability matching, seamless unit reservations, integrated bond origination, and predictive analytics to maximize conversion rates and sales velocity.

The platform consists of three primary user interfaces: the Developer Dashboard (for property developers and their sales teams), the Public Development Landing Pages (for potential buyers), and the Admin Portal (for platform administrators). The system integrates with external services including bond originators, payment processors, and optional CRM systems while maintaining a robust internal lead management system as the core fallback.

Key architectural principles include:
- **Affordability-First Design**: Every buyer interaction centers around what they can actually afford
- **Conversion Optimization**: Minimize friction from interest to reservation to sale
- **Real-Time Intelligence**: Provide developers with actionable insights as data flows in
- **Scalable Multi-Tenancy**: Support developers of all sizes with tier-based feature access
- **Integration-Ready**: Prepare for external system connections while maintaining internal functionality

## Architecture

### System Components

The platform follows a modern three-tier architecture:

**Presentation Layer:**
- React-based Single Page Application (SPA) for Developer Dashboard
- Server-side rendered Development Landing Pages for SEO optimization
- Responsive mobile-first design for buyer interactions
- Admin portal for platform management

**Application Layer:**
- Node.js/Express REST API server
- Real-time WebSocket server for live updates (inventory, lead notifications)
- Background job processor for async tasks (OTP generation, email sending, analytics aggregation)
- Webhook handler for external integrations (bond originators, CRM systems)

**Data Layer:**
- MySQL primary database (existing Drizzle ORM schema)
- Redis cache for session management and real-time data
- S3-compatible object storage for media files (images, videos, PDFs, generated documents)
- Analytics data warehouse (can use same MySQL with optimized tables)

### Data Flow Architecture

**Lead Capture Flow:**
1. Buyer visits Development Landing Page
2. Buyer completes Affordability Calculator
3. System calculates affordable price range
4. System filters and highlights matching units
5. Buyer submits inquiry for specific unit
6. System creates Lead record with qualification score
7. System evaluates Lead Routing Rules
8. System assigns Lead to sales team member
9. System sends notifications (email, in-app, optional webhook to CRM)

**Unit Reservation Flow:**
1. Qualified buyer clicks "Reserve Unit"
2. System validates unit availability and buyer qualification
3. System creates Reservation record with expiration timer
4. System marks unit as "reserved" in inventory
5. System generates OTP document (PDF) with buyer and unit details
6. System sends OTP to buyer and developer via email
7. System starts background job to monitor reservation expiration
8. Developer confirms deposit → System updates unit to "sold"
9. OR Timer expires → System releases unit back to "available"

**Bond Application Flow:**
1. Buyer clicks "Apply for Bond" on qualified unit
2. System displays partner bond originator options
3. Buyer selects originator and confirms pre-populated data
4. System sends application payload to originator API/webhook
5. System creates Bond Application tracking record
6. Originator processes application (external)
7. Originator sends status updates via webhook
8. System updates Bond Application status
9. System notifies developer and buyer of status changes

**Analytics Aggregation Flow:**
1. User actions trigger event logging (view, lead, reservation, etc.)
2. Background job runs hourly to aggregate raw events
3. System calculates metrics (conversion rates, demand scores, pricing performance)
4. System updates analytics tables and cache
5. Developer Dashboard queries aggregated data for real-time display
6. System generates Demand Heatmap and Pricing Intelligence insights

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- TanStack Query for server state management
- Zustand for client state management
- Tailwind CSS for styling
- Recharts for analytics visualizations
- React Hook Form for form management
- Zod for validation

**Backend:**
- Node.js with Express
- Drizzle ORM for database access
- Bull/BullMQ for job queues
- Socket.io for real-time updates
- Nodemailer for email sending
- PDFKit or Puppeteer for OTP document generation
- JWT for authentication

**Infrastructure:**
- MySQL 8+ database
- Redis for caching and job queues
- AWS S3 or compatible for file storage
- Vercel/Railway for hosting (existing setup)

## Components and Interfaces

### Developer Dashboard Components

**DeveloperAccountManager**
- Manages developer profile, team members, and subscription
- Displays current tier, usage limits, and upgrade prompts
- Handles billing and payment method management
- Props: `developerId`, `currentTier`, `usageLimits`
- Events: `onUpgrade`, `onUpdateProfile`, `onInviteTeamMember`

**DevelopmentProfileEditor**
- Multi-step wizard for creating/editing developments
- Handles media uploads, phase management, amenity selection
- Validates required fields and enforces tier limits
- Props: `developmentId?`, `mode: 'create' | 'edit'`
- Events: `onSave`, `onPublish`, `onCancel`

**UnitInventoryGrid**
- Real-time grid display of all units with status indicators
- Supports bulk actions (update pricing, change status)
- Filterable by phase, type, status, price range
- Props: `developmentId`, `phaseId?`
- Events: `onUnitSelect`, `onStatusChange`, `onBulkUpdate`

**LeadManagementDashboard**
- Tabular view of all leads with advanced filtering
- Displays qualification scores, affordability data, funnel stage
- Supports bulk assignment and status updates
- Props: `developerId`, `filters`, `sortBy`
- Events: `onLeadSelect`, `onAssign`, `onStatusChange`, `onExport`

**LeadDetailPanel**
- Comprehensive view of single lead with full history
- Shows affordability calculation, unit preferences, interactions
- Displays funnel progression timeline
- Allows notes, status updates, and manual actions
- Props: `leadId`
- Events: `onUpdateStatus`, `onAddNote`, `onAssign`

**AnalyticsDashboard**
- Multi-tab interface for different analytics views
- Development Performance: views, leads, conversions over time
- Unit Performance: demand heatmap by unit type
- Funnel Analytics: conversion rates between stages
- Pricing Intelligence: optimal price points and recommendations
- Lead Sources: attribution and ROI by channel
- Props: `developerId`, `developmentId?`, `dateRange`
- Events: `onExport`, `onDrillDown`

**DemandHeatmap**
- Visual representation of unit type popularity
- Color-coded cells showing interest levels
- Hover tooltips with detailed metrics
- Clickable to drill into specific unit type analytics
- Props: `developmentId`, `phaseId?`, `metric: 'views' | 'leads' | 'conversions'`
- Events: `onUnitTypeSelect`

**PricingIntelligencePanel**
- Displays current pricing vs. optimal pricing recommendations
- Shows conversion rates at different price points
- Highlights underperforming and overperforming units
- Provides actionable pricing adjustment suggestions
- Props: `developmentId`
- Events: `onApplyRecommendation`, `onDismiss`

**SalesFunnelVisualizer**
- Funnel chart showing lead progression through stages
- Displays conversion rates and drop-off points
- Filterable by development, phase, date range
- Shows average time spent at each stage
- Props: `developerId`, `developmentId?`, `dateRange`
- Events: `onStageClick`, `onLeadClick`

**MarketingCampaignManager**
- Create and manage internal marketing campaigns
- Track impressions, clicks, leads, and ROI
- Generate social media content assets
- Props: `developerId`
- Events: `onCreateCampaign`, `onGenerateContent`, `onViewReport`

### Public-Facing Components

**DevelopmentLandingPage**
- SEO-optimized page showcasing single development
- Hero section with media gallery (images, videos, 3D renders)
- Inline affordability calculator
- Unit availability grid with real-time updates
- Phase selector for multi-phase developments
- Amenities showcase
- Location map and nearby points of interest
- Lead capture form with qualification
- Props: `developmentSlug`
- Events: `onLeadSubmit`, `onUnitReserve`, `onAffordabilityCalculate`

**AffordabilityCalculator**
- Inline widget for buyer affordability assessment
- Inputs: monthly income, monthly expenses, available deposit
- Calculates maximum affordable purchase price
- Displays results with confidence indicator
- Triggers unit filtering when embedded in landing page
- Props: `developmentId?`, `onCalculate: (result) => void`
- Events: `onCalculate`, `onReset`

**UnitMatchDisplay**
- Shows units filtered by buyer's affordability
- Visual indicators: green (affordable), yellow (stretch), red (out of range)
- Sortable by price, size, availability
- Quick view modal for unit details
- Props: `units`, `affordableRange`, `onUnitSelect`
- Events: `onUnitSelect`, `onReserve`

**UnitReservationModal**
- Confirmation dialog for unit reservation
- Displays unit details, pricing, and reservation terms
- Collects additional buyer information if needed
- Shows reservation timer countdown
- Props: `unit`, `buyer`, `onConfirm`, `onCancel`
- Events: `onConfirm`, `onCancel`

**BondApplicationWidget**
- Embedded widget for bond originator selection
- Displays partner logos and brief descriptions
- Pre-populates application form with known data
- Shows application status after submission
- Props: `leadId`, `unitId`, `buyerInfo`
- Events: `onOriginatorSelect`, `onSubmit`, `onStatusCheck`

### API Endpoints

**Developer Management:**
- `POST /api/developers` - Register new developer account
- `GET /api/developers/:id` - Get developer profile
- `PATCH /api/developers/:id` - Update developer profile
- `GET /api/developers/:id/subscription` - Get subscription details
- `POST /api/developers/:id/subscription/upgrade` - Upgrade subscription tier

**Development Management:**
- `POST /api/developments` - Create new development
- `GET /api/developments/:id` - Get development details
- `PATCH /api/developments/:id` - Update development
- `DELETE /api/developments/:id` - Archive development
- `POST /api/developments/:id/phases` - Add phase to development
- `POST /api/developments/:id/media` - Upload development media
- `GET /api/developments/:id/analytics` - Get development analytics

**Unit Management:**
- `POST /api/developments/:devId/units` - Create units (bulk supported)
- `GET /api/developments/:devId/units` - List units with filters
- `PATCH /api/units/:id` - Update unit details
- `PATCH /api/units/:id/status` - Update unit status
- `GET /api/units/:id/availability` - Check real-time availability

**Lead Management:**
- `POST /api/leads` - Create new lead (public endpoint)
- `GET /api/leads` - List leads with filters (developer-scoped)
- `GET /api/leads/:id` - Get lead details
- `PATCH /api/leads/:id` - Update lead status/notes
- `POST /api/leads/:id/assign` - Assign lead to team member
- `GET /api/leads/:id/history` - Get lead interaction history

**Affordability & Qualification:**
- `POST /api/affordability/calculate` - Calculate buyer affordability
- `POST /api/units/match` - Get units matching affordability range
- `GET /api/leads/:id/qualification` - Get lead qualification details

**Reservations:**
- `POST /api/units/:id/reserve` - Reserve a unit
- `GET /api/reservations/:id` - Get reservation details
- `PATCH /api/reservations/:id/confirm` - Confirm deposit received
- `DELETE /api/reservations/:id` - Cancel reservation

**Bond Applications:**
- `POST /api/bond-applications` - Submit bond application
- `GET /api/bond-applications/:id` - Get application status
- `POST /api/webhooks/bond-status` - Webhook for originator updates

**Analytics:**
- `GET /api/analytics/development/:id` - Development performance metrics
- `GET /api/analytics/demand-heatmap/:devId` - Unit type demand analysis
- `GET /api/analytics/funnel/:devId` - Sales funnel metrics
- `GET /api/analytics/pricing-intelligence/:devId` - Pricing recommendations
- `GET /api/analytics/lead-sources/:devId` - Lead attribution data

**Marketing:**
- `POST /api/campaigns` - Create marketing campaign
- `GET /api/campaigns/:id` - Get campaign details and metrics
- `POST /api/campaigns/:id/content` - Generate social media content
- `GET /api/campaigns/:id/report` - Get campaign performance report

## Data Models

### Developer
```typescript
{
  id: number
  userId: number // references users table
  name: string
  description: string
  logo: string // S3 URL
  website: string
  email: string
  phone: string
  address: string
  city: string
  province: string
  category: 'residential' | 'commercial' | 'mixed_use' | 'industrial'
  establishedYear: number
  totalProjects: number
  rating: number
  reviewCount: number
  isVerified: boolean
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  approvedBy: number
  approvedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Development
```typescript
{
  id: number
  developerId: number
  name: string
  slug: string // URL-friendly identifier
  description: string
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex'
  status: 'planning' | 'under_construction' | 'completed' | 'coming_soon'
  address: string
  city: string
  province: string
  latitude: number
  longitude: number
  totalUnits: number
  availableUnits: number
  priceFrom: number
  priceTo: number
  amenities: string[] // JSON array
  images: string[] // S3 URLs
  videos: string[] // S3 URLs
  floorPlans: string[] // S3 URLs
  brochures: string[] // S3 URLs
  completionDate: timestamp
  isFeatured: boolean
  views: number
  createdAt: timestamp
  updatedAt: timestamp
  publishedAt: timestamp
}
```

### DevelopmentPhase
```typescript
{
  id: number
  developmentId: number
  name: string
  phaseNumber: number
  description: string
  status: 'planning' | 'pre_launch' | 'selling' | 'sold_out' | 'completed'
  totalUnits: number
  availableUnits: number
  priceFrom: number
  priceTo: number
  launchDate: timestamp
  completionDate: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Unit
```typescript
{
  id: number
  developmentId: number
  phaseId: number
  unitNumber: string
  unitType: 'studio' | '1bed' | '2bed' | '3bed' | '4bed+' | 'penthouse' | 'townhouse' | 'house'
  bedrooms: number
  bathrooms: number
  size: number // square meters
  price: number
  floorPlan: string // S3 URL
  floor: number
  facing: string // e.g., 'north', 'sea-facing'
  features: string[] // JSON array
  status: 'available' | 'reserved' | 'sold'
  reservedAt: timestamp
  reservedBy: number // leadId
  soldAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Lead
```typescript
{
  id: number
  developmentId: number
  unitId: number // optional, specific unit of interest
  name: string
  email: string
  phone: string
  message: string
  leadSource: string // 'organic', 'social', 'campaign', 'referral'
  referrerUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  qualificationStatus: 'qualified' | 'partially_qualified' | 'unqualified' | 'pending'
  qualificationScore: number // 0-100
  affordabilityData: {
    monthlyIncome: number
    monthlyExpenses: number
    availableDeposit: number
    maxAffordable: number
    calculatedAt: timestamp
  }
  funnelStage: 'interest' | 'affordability' | 'qualification' | 'viewing' | 'offer' | 'bond' | 'sale'
  assignedTo: number // userId of sales team member
  assignedAt: timestamp
  status: 'new' | 'contacted' | 'qualified' | 'viewing_scheduled' | 'offer_made' | 'converted' | 'lost'
  lostReason: string
  createdAt: timestamp
  updatedAt: timestamp
  convertedAt: timestamp
}
```

### LeadInteraction
```typescript
{
  id: number
  leadId: number
  userId: number // team member who performed action
  interactionType: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'stage_change'
  content: string
  metadata: object // additional structured data
  createdAt: timestamp
}
```

### Reservation
```typescript
{
  id: number
  unitId: number
  leadId: number
  developmentId: number
  reservationCode: string // unique identifier
  expiresAt: timestamp
  status: 'active' | 'confirmed' | 'expired' | 'cancelled'
  depositAmount: number
  depositConfirmedAt: timestamp
  otpDocumentUrl: string // S3 URL of generated OTP PDF
  otpGeneratedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### BondApplication
```typescript
{
  id: number
  leadId: number
  unitId: number
  originatorName: string // 'BetterBond', 'Ooba', etc.
  originatorApplicationId: string // external reference
  applicantData: {
    name: string
    email: string
    phone: string
    idNumber: string
    monthlyIncome: number
    employmentStatus: string
    // additional fields as required by originator
  }
  loanAmount: number
  depositAmount: number
  status: 'submitted' | 'in_review' | 'pre_approved' | 'approved' | 'declined'
  statusUpdatedAt: timestamp
  declineReason: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### DevelopmentAnalytics
```typescript
{
  id: number
  developmentId: number
  date: date // aggregation date
  totalViews: number
  uniqueVisitors: number
  totalLeads: number
  qualifiedLeads: number
  conversionRate: number // percentage
  averageAffordability: number
  unitTypeInterest: {
    [unitType: string]: {
      views: number
      leads: number
      conversions: number
    }
  }
  pricePointPerformance: {
    [priceRange: string]: {
      views: number
      leads: number
      conversions: number
    }
  }
  leadSources: {
    [source: string]: {
      leads: number
      qualifiedLeads: number
      conversions: number
    }
  }
  funnelMetrics: {
    [stage: string]: {
      count: number
      averageTimeInStage: number // hours
      conversionToNext: number // percentage
    }
  }
  createdAt: timestamp
}
```

### MarketingCampaign
```typescript
{
  id: number
  developerId: number
  developmentId: number
  name: string
  description: string
  campaignType: 'featured_listing' | 'homepage_banner' | 'email' | 'social'
  status: 'draft' | 'active' | 'paused' | 'completed'
  startDate: timestamp
  endDate: timestamp
  budget: number
  spentAmount: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  ctr: number // click-through rate percentage
  costPerLead: number
  roi: number // return on investment percentage
  createdAt: timestamp
  updatedAt: timestamp
}
```

### DeveloperSubscription
```typescript
{
  id: number
  developerId: number
  tier: 'free_trial' | 'basic' | 'premium'
  status: 'active' | 'cancelled' | 'expired'
  trialEndsAt: timestamp
  currentPeriodStart: timestamp
  currentPeriodEnd: timestamp
  limits: {
    maxDevelopments: number
    maxLeadsPerMonth: number
    maxTeamMembers: number
    analyticsRetentionDays: number
    crmIntegrationEnabled: boolean
    advancedAnalyticsEnabled: boolean
  }
  usage: {
    developmentsCount: number
    leadsThisMonth: number
    teamMembersCount: number
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Error Handling

### Error Categories

**Validation Errors (400)**
- Invalid input data format
- Missing required fields
- Data constraint violations (e.g., price must be positive)
- Tier limit exceeded (e.g., max developments reached)

**Authentication Errors (401)**
- Missing or invalid JWT token
- Expired session
- Insufficient permissions for resource

**Authorization Errors (403)**
- User not authorized for requested action
- Subscription tier does not include feature
- Resource belongs to different developer

**Not Found Errors (404)**
- Requested resource does not exist
- Development/unit/lead not found

**Conflict Errors (409)**
- Unit already reserved by another buyer
- Duplicate reservation attempt
- Concurrent modification conflict

**External Service Errors (502/503)**
- Bond originator API unavailable
- Email service failure
- PDF generation service timeout

### Error Response Format

All API errors return consistent JSON structure:
```typescript
{
  error: {
    code: string // machine-readable error code
    message: string // human-readable error message
    details: object // additional context (validation errors, etc.)
    timestamp: string
    requestId: string // for support tracking
  }
}
```

### Error Handling Strategies

**Validation Errors:**
- Return detailed field-level errors to guide user corrections
- Highlight specific fields in UI
- Provide inline help text with examples

**Reservation Conflicts:**
- Display real-time availability before reservation attempt
- Show "Unit just reserved" message if conflict occurs
- Suggest similar available units

**External Service Failures:**
- Retry with exponential backoff for transient failures
- Queue requests for later processing if service unavailable
- Display user-friendly message: "Bond application submitted, processing may take a few minutes"
- Send email confirmation when processing completes

**Tier Limit Exceeded:**
- Display clear upgrade prompt with benefit comparison
- Allow viewing but block creation/modification
- Provide grace period for recently downgraded accounts

**Session Expiration:**
- Auto-refresh JWT tokens before expiration
- Preserve form data in localStorage
- Redirect to login with return URL
- Restore form data after re-authentication

## Testing Strategy

### Unit Testing

**Backend Unit Tests:**
- Affordability calculation logic with various income/expense scenarios
- Lead qualification scoring algorithm
- Pricing intelligence recommendation engine
- Funnel stage progression rules
- Reservation expiration timer logic
- OTP document generation with correct data population
- Tier limit enforcement logic
- Lead routing rule evaluation

**Frontend Unit Tests:**
- Form validation logic (affordability calculator, lead capture)
- Unit filtering by affordability range
- Analytics data transformation and aggregation
- Date range selection and formatting
- Currency formatting and display
- Subscription tier feature gating

### Integration Testing

**API Integration Tests:**
- Complete lead capture flow from affordability to assignment
- Unit reservation flow with OTP generation
- Bond application submission and status tracking
- Development creation with media uploads
- Analytics aggregation and retrieval
- Marketing campaign creation and tracking
- CRM webhook payload formatting and delivery

**Database Integration Tests:**
- Concurrent reservation attempts on same unit
- Lead routing with multiple matching rules
- Analytics aggregation with large datasets
- Subscription tier limit enforcement across operations

### End-to-End Testing

**Critical User Journeys:**
1. Buyer discovers development → calculates affordability → sees matching units → submits lead → receives confirmation
2. Buyer reserves unit → receives OTP → applies for bond → tracks application status
3. Developer creates development → adds units → publishes → receives first lead → assigns to team member
4. Developer views analytics → identifies underperforming units → adjusts pricing → tracks improvement
5. Developer creates campaign → generates social content → tracks leads → measures ROI

**Cross-Browser Testing:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile browsers: iOS Safari, Chrome Android
- Responsive design breakpoints: mobile (320px), tablet (768px), desktop (1024px+)

### Performance Testing

**Load Testing Scenarios:**
- 100 concurrent buyers viewing development landing pages
- 50 concurrent affordability calculations
- 20 concurrent unit reservations
- Analytics dashboard with 1 year of data
- Media gallery with 50+ images and videos

**Performance Targets:**
- API response time: p95 < 500ms, p99 < 1000ms
- Landing page load: < 2 seconds (3G connection)
- Affordability calculation: < 200ms
- Real-time inventory update: < 1 second
- Analytics dashboard load: < 3 seconds

### Security Testing

**Authentication & Authorization:**
- JWT token validation and expiration
- Role-based access control enforcement
- Cross-developer data isolation
- API rate limiting

**Input Validation:**
- SQL injection prevention
- XSS attack prevention
- File upload validation (type, size, malware scanning)
- CSRF protection

**Data Protection:**
- PII encryption at rest
- Secure document storage (OTP, bond applications)
- HTTPS enforcement
- Secure cookie configuration

## Deployment Strategy

### Environment Configuration

**Development Environment:**
- Local MySQL database
- Local Redis instance
- S3-compatible local storage (MinIO)
- Hot module reloading for frontend
- Detailed error logging and stack traces

**Staging Environment:**
- Mirrors production infrastructure
- Separate database with anonymized production data
- Integration with sandbox bond originator APIs
- Full logging and monitoring
- Used for QA and client demos

**Production Environment:**
- Managed MySQL database (Railway/PlanetScale)
- Managed Redis (Railway/Upstash)
- AWS S3 for file storage
- CDN for static assets and media
- Production bond originator API credentials
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)

### Deployment Process

**CI/CD Pipeline:**
1. Code pushed to GitHub
2. Automated tests run (unit, integration)
3. Build frontend and backend
4. Deploy to staging environment
5. Run smoke tests on staging
6. Manual approval for production deployment
7. Deploy to production with zero-downtime strategy
8. Run post-deployment health checks
9. Monitor error rates and performance metrics

**Database Migrations:**
- Use Drizzle migrations for schema changes
- Test migrations on staging first
- Backup production database before migration
- Run migrations during low-traffic window
- Rollback plan for failed migrations

**Feature Flags:**
- Use feature flags for gradual rollout of new features
- Enable for specific developers first (beta testers)
- Monitor metrics and feedback
- Gradually increase rollout percentage
- Full rollout or rollback based on results

### Monitoring and Alerting

**Application Monitoring:**
- Error rate by endpoint
- API response times (p50, p95, p99)
- Database query performance
- Background job success/failure rates
- WebSocket connection stability

**Business Metrics:**
- New developer signups
- Active developments
- Leads captured per day
- Reservation conversion rate
- Bond application submission rate
- Subscription upgrades

**Alerts:**
- Error rate > 5% for 5 minutes
- API response time p95 > 2 seconds
- Database connection pool exhausted
- Background job queue length > 1000
- Reservation expiration job failures
- External service (bond originator) unavailable

### Backup and Disaster Recovery

**Database Backups:**
- Automated daily full backups
- Hourly incremental backups
- 30-day retention period
- Backups stored in separate region
- Monthly restore testing

**File Storage Backups:**
- S3 versioning enabled
- Cross-region replication for critical documents (OTPs)
- 90-day retention for deleted files

**Disaster Recovery Plan:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Documented recovery procedures
- Quarterly disaster recovery drills
- Failover to backup region capability


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Developer Account Creation Assigns Valid Tier

*For any* new developer registration, the created account should have a subscription tier that is one of the three valid values (Free Trial, Basic, Premium), with Free Trial as the default.

**Validates: Requirements 1.1, 1.2**

### Property 2: Subscription Tier Changes Apply Immediately

*For any* developer account and any valid tier upgrade or downgrade, the new feature access limits and capabilities should be applied immediately without requiring logout or page refresh.

**Validates: Requirements 1.4**

### Property 3: Development Profile Captures All Required Fields

*For any* development creation request, if the request is successful, then all required fields (name, type, location, description, status) should be present in the stored development record.

**Validates: Requirements 2.1**

### Property 4: Development Amenities Round-Trip Consistency

*For any* development with amenities added, retrieving the development landing page should display all the same amenities that were originally added.

**Validates: Requirements 2.4**

### Property 5: Unit Status Transitions Are Valid

*For any* unit status update, the new status should be one of the three valid values (available, reserved, sold), and invalid status values should be rejected.

**Validates: Requirements 3.2**

### Property 6: Concurrent Reservation Prevention

*For any* unit, if two buyers attempt to reserve the same unit simultaneously, only one reservation should succeed and the other should receive a conflict error.

**Validates: Requirements 3.3**

### Property 7: Inventory Grid Completeness

*For any* development, the inventory dashboard grid should contain all units belonging to that development with their current status accurately reflected.

**Validates: Requirements 3.4**

### Property 8: Affordability Calculation Consistency

*For any* set of buyer financial inputs (income, expenses, deposit), calculating affordability multiple times with the same inputs should produce the same maximum affordable purchase price.

**Validates: Requirements 4.2**

### Property 9: Lead Qualification Based on Affordability Match

*For any* lead submission where the buyer's calculated affordability falls within the development's price range, the lead should be marked as qualified; otherwise, it should be marked as unqualified.

**Validates: Requirements 4.4, 4.5**

### Property 10: Lead Capture Completeness

*For any* successful lead submission, all required fields (name, email, phone, message, source, timestamp) should be present in the stored lead record.

**Validates: Requirements 5.1, 5.2**

### Property 11: Affordability Data Association

*For any* lead created with affordability calculator results, the affordability data should be attached to the lead record and retrievable when viewing lead details.

**Validates: Requirements 5.3**

### Property 12: Qualified Lead Triggers Routing

*For any* lead created with qualified status, the lead routing rules should be evaluated and the lead should be assigned to a team member or placed in the default queue.

**Validates: Requirements 5.5**

### Property 13: Lead Routing Rule Evaluation

*For any* new lead and configured routing rules, if the lead matches a rule's criteria (development, unit type, source), then the lead should be assigned to the team member specified in that rule.

**Validates: Requirements 6.2**

### Property 14: Routing Fallback to Default Queue

*For any* lead that does not match any configured routing rules, the lead should be assigned to the default queue for manual assignment.

**Validates: Requirements 6.4**

### Property 15: Unavailable Team Members Excluded from Routing

*For any* lead routing evaluation, team members marked as unavailable should not receive lead assignments even if they match routing rules.

**Validates: Requirements 6.5**

### Property 16: Lead Dashboard Filter Accuracy

*For any* lead filter criteria (status, development, date range, qualification level, assigned team member), the filtered results should contain only leads that match all specified criteria.

**Validates: Requirements 7.2**

### Property 17: Lead Status Transitions Are Valid

*For any* lead status update, the new status should be one of the valid values (new, contacted, qualified, viewing scheduled, offer made, converted, lost), and invalid status values should be rejected.

**Validates: Requirements 7.3**

### Property 18: Lead History Completeness

*For any* lead with interactions (notes, status changes, assignments), viewing the lead detail should display all interactions in chronological order with timestamps and user attribution.

**Validates: Requirements 7.4, 7.5**

### Property 19: Analytics View Aggregation Accuracy

*For any* development with recorded views, the analytics dashboard should display the correct total views, unique visitors, and view trends calculated from the raw event data.

**Validates: Requirements 8.1**

### Property 20: Lead Analytics Calculation Accuracy

*For any* development with leads, the conversion rate displayed in analytics should equal (number of converted leads / total leads) * 100.

**Validates: Requirements 8.2**

### Property 21: Unit Performance Percentage Breakdown

*For any* development with multiple unit types, the sum of all unit type interest percentages should equal 100%.

**Validates: Requirements 8.3**

### Property 22: Development Landing Page URL Uniqueness

*For any* two published developments, their generated landing page URLs should be unique and not conflict with each other.

**Validates: Requirements 9.1**

### Property 23: Landing Page Content Completeness

*For any* published development, the landing page should contain all required sections (name, description, media gallery, pricing table, availability grid, amenities).

**Validates: Requirements 9.2**

### Property 24: Branding Application Consistency

*For any* development with custom branding (logo, colors, tagline), the landing page should display the custom branding elements and not the default platform branding.

**Validates: Requirements 9.3**

### Property 25: Campaign Metrics Tracking

*For any* active marketing campaign, all impressions, clicks, and leads generated from the campaign should be tracked and associated with the campaign record.

**Validates: Requirements 10.2**

### Property 26: Campaign ROI Calculation

*For any* completed campaign, the ROI should be calculated as ((revenue from campaign leads - campaign budget) / campaign budget) * 100.

**Validates: Requirements 10.4**

### Property 27: Social Media Content Format Completeness

*For any* social media content generation request, the platform should generate all three formats (Instagram story, carousel post, WhatsApp shareable) with appropriate dimensions for each platform.

**Validates: Requirements 11.1, 11.4**

### Property 28: Social Media Content UTM Parameters

*For any* generated social media content with shareable links, the links should include trackable UTM parameters (utm_source, utm_medium, utm_campaign).

**Validates: Requirements 11.5**

### Property 29: CRM Lead Data Format Consistency

*For any* lead created when CRM integration is enabled, the lead data should be formatted in a standardized JSON structure that includes all required fields for CRM import.

**Validates: Requirements 12.2**

### Property 30: Platform Functions Without CRM Integration

*For any* developer with CRM integration disabled, all lead management features should function normally using the internal lead management system.

**Validates: Requirements 12.4**

### Property 31: Subscription Tier Limit Enforcement

*For any* developer on Free Trial tier attempting to create a second development, the platform should prevent the creation and display an upgrade prompt.

**Validates: Requirements 13.1, 13.4**

### Property 32: Tier Upgrade Unlocks Features Immediately

*For any* developer upgrading from Free Trial to Basic tier, the new development limit (5 developments) should be applied immediately and allow creation of additional developments.

**Validates: Requirements 13.5**

### Property 33: Lead Source Attribution Persistence

*For any* lead that converts to a sale, the original lead source (organic, social, campaign, referral) should remain associated with the conversion record for attribution reporting.

**Validates: Requirements 14.4**

### Property 34: Phase-Unit Association Integrity

*For any* unit assigned to a specific phase, querying units by phase should include that unit, and the unit should not appear in queries for other phases.

**Validates: Requirements 15.2**

### Property 35: Phase Status Transitions Are Valid

*For any* phase status update, the new status should be one of the valid values (planning, pre-launch, selling, sold out, completed), and invalid status values should be rejected.

**Validates: Requirements 15.4**

### Property 36: Affordability-Based Unit Filtering

*For any* buyer with calculated affordability and a development with multiple units, the filtered unit list should contain only units with prices less than or equal to the buyer's maximum affordable price.

**Validates: Requirements 16.1**

### Property 37: Unit Categorization by Affordability

*For any* unit and buyer affordability, the unit should be categorized as "affordable" if price ≤ max affordable, "stretch" if price ≤ max affordable * 1.1, and "out-of-range" otherwise.

**Validates: Requirements 16.2**

### Property 38: Affordable Unit Lead Auto-Qualification

*For any* lead submitted for a unit categorized as "affordable" for the buyer, the lead should automatically be marked with high qualification status.

**Validates: Requirements 16.4**

### Property 39: Unit Reservation Atomicity

*For any* unit reservation attempt, either the unit should be successfully reserved with status changed to "reserved" and timer started, or the reservation should fail completely with no partial state changes.

**Validates: Requirements 17.1**

### Property 40: OTP Generation Completeness

*For any* successful unit reservation, an OTP document should be generated containing buyer details, unit details, pricing, and terms, and the document URL should be stored in the reservation record.

**Validates: Requirements 17.2**

### Property 41: Reservation Timer Expiration Release

*For any* reservation with an expired timer and no confirmed deposit, the unit status should automatically revert to "available" and the reservation status should be marked as "expired".

**Validates: Requirements 17.4**

### Property 42: Bond Application Form Pre-Population

*For any* bond application initiated by a buyer with existing lead data, the application form should be pre-populated with the buyer's name, email, phone, and the selected unit details.

**Validates: Requirements 18.2**

### Property 43: Bond Application Tracking Record Creation

*For any* submitted bond application, a tracking record should be created with initial status "submitted" and associated with the lead and unit.

**Validates: Requirements 18.4**

### Property 44: Demand Heatmap Aggregation Accuracy

*For any* development with unit activity (views, leads, conversions), the demand heatmap should accurately reflect which unit types received the most activity based on aggregated event data.

**Validates: Requirements 19.1**

### Property 45: Pricing Performance Analysis

*For any* development with leads at various price points, the pricing performance analysis should correctly identify which price ranges generate the highest qualified lead percentages.

**Validates: Requirements 19.2**

### Property 46: Affordability Analytics Average Calculation

*For any* development with multiple leads containing affordability data, the average affordability range should be calculated as the mean of all leads' maximum affordable prices.

**Validates: Requirements 19.4**

### Property 47: Lead Funnel Initial Stage Placement

*For any* newly created lead, the lead should be automatically placed in the "Interest" stage of the sales funnel.

**Validates: Requirements 20.1**

### Property 48: Funnel Stage Auto-Progression

*For any* lead that completes an affordability check, the lead's funnel stage should automatically progress from "Interest" to "Affordability".

**Validates: Requirements 20.2**

### Property 49: Funnel Conversion Rate Calculation

*For any* two adjacent funnel stages, the conversion rate should be calculated as (number of leads that reached next stage / number of leads that reached current stage) * 100.

**Validates: Requirements 20.3**

### Property 50: Funnel Stall Detection

*For any* lead that remains in the same funnel stage for longer than the configured threshold time, the lead should be flagged for follow-up with suggested next actions.

**Validates: Requirements 20.4**

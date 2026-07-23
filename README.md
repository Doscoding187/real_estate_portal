# 🏢 SA Property Portal - Real Estate Portal with Gamified Prospect Pre-Qualification

A comprehensive multi-tenant real estate portal built with modern TypeScript stack, featuring advanced gamification and AI-powered prospect pre-qualification.

## 🎯 Overview

The SA Property Portal is a full-stack real estate platform that transforms anonymous property browsers into qualified leads through:

- **Gamified Prospect Pre-Qualification** - Interactive buyability calculator with progress tracking
- **Advanced Financial Algorithms** - South African-specific lending rules and transfer duties
- **Smart Lead Generation** - Real-time prospect scoring and agent notifications
- **Multi-Tenant Architecture** - Agency white-labeling and subscription management

## 🏗️ Tech Stack

### Frontend

- **React 19** with TypeScript
- **TailwindCSS v4** + shadcn/ui components
- **Framer Motion** for animations
- **Wouter** for routing (with custom patches)
- **tRPC** for type-safe API calls
- **TanStack Query** for state management

### Backend

- **Node.js/Express** with TypeScript
- **tRPC** for API layer
- **Drizzle ORM** with MySQL
- **JWT authentication** (custom implementation)
- **AWS S3** for image uploads

### Infrastructure

- **MySQL 8.0+** database
- **AWS S3** for file storage
- **Email service** integration (SendGrid/SES ready)
- **Docker** containerization

## 🚀 Key Features

### 🎮 Gamified Prospect Dashboard

- **Progressive Form Steps** - 3-step guided experience
- **Real-time Calculations** - Instant affordability estimates
- **Badge System** - Achievement unlocks and progress tracking
- **Smart Recommendations** - AI-powered property matching
- **Session Persistence** - Anonymous user tracking

### 💰 Advanced Buyability Calculator

- **SA Financial Rules** - Prime rate 11.75%, LTV ratios
- **Transfer Duties** - Progressive tax calculation (0-13%)
- **Bond Affordability** - Lending institution algorithms
- **Risk Assessment** - DTI/PTI ratio analysis
- **Confidence Scoring** - Based on data completeness

### 🤖 Agent Intelligence

- **Instant Notifications** - Rich email templates with prospect profiles
- **Lead Scoring** - High/Medium/Low priority classification
- **Financial Context** - Complete affordability details upfront
- **Automated Workflows** - Follow-up scheduling and tracking

### 🏢 Multi-Tenant Platform

- **Agency Management** - Subscription-based access
- **White-label Branding** - Custom domains and themes
- **Agent Onboarding** - Invitation system with role management
- **Billing Integration** - Stripe subscription management

## 📊 Database Schema

### Core Tables (17 total)

- `users` - Authentication and profiles
- `properties` - Property listings with media
- `agencies` - Real estate companies
- `agents` - Individual realtors
- `prospects` - Anonymous buyer profiles ⭐ **NEW**
- `prospect_favorites` - Property favorites ⭐ **NEW**
- `scheduled_viewings` - Viewing appointments ⭐ **NEW**
- `recently_viewed` - Browsing history ⭐ **NEW**

### Supporting Tables

- `favorites`, `leads`, `reviews`, `services`
- `developments`, `locations`, `exploreVideos`
- `commissions`, `invoices`, `paymentMethods`
- `platform_settings`, `audit_logs`

## 🛠️ Local Development

### Prerequisites

- **Node.js 22.x**. This is enforced by `package.json`.
- **pnpm 10+**. pnpm is the supported package manager; do not use npm or yarn for installs.
- **MySQL 8.0+**
- **AWS S3 bucket** (for images)
- **Stripe account** (for payments)

### Recommended Git Workflow

Keep `main` clean and create a fresh worktree for each task:

```bash
git fetch origin
git worktree add ../listify-<task-name> -b codex/<task-name> origin/main
```

Do feature, fix, and hygiene work inside the task worktree. This keeps local setup experiments and generated files from leaking into unrelated changes.

### Setup Instructions

1. **Clone and Install**

```bash
git clone <repository-url>
cd real_estate_portal
pnpm install
```

2. **Database Setup**

```bash
# Apply the canonical local migration workflow
pnpm db:migrate:local
```

Do not apply files under root `migrations/`, `drizzle/`, or root SQL directly.
See [`server/migrations/README.md`](server/migrations/README.md) for production,
CI/test, and local authority. Data repair and seed operations are separate,
approved workflows and are not migrations.

3. **Environment Configuration**

```bash
# Copy and configure environment files
cp .env.example .env
cp client/.env.example client/.env

# Edit .env with your values:
DATABASE_URL=mysql://user:password@localhost:3306/real_estate_portal
JWT_SECRET=your-super-secret-key
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. **Seed Data (Optional)**

Legacy seed files are not part of schema migration. Use only a separately
approved local/test seed workflow; do not execute root SQL or manual utilities
as setup instructions.

5. **Start Development Server**

```bash
pnpm dev
```

Access the application at `http://localhost:3009`. The backend API runs on `http://localhost:5000`.

## 🎮 Using the Gamified Prospect Dashboard

### For Users (Prospects)

1. **Browse Properties** - The dashboard triggers automatically after scrolling or time
2. **Enter Financial Info** - Progressive 3-step form with real-time calculations
3. **Get Buyability Score** - High/Medium/Low classification with affordability range
4. **Earn Badges** - Achievement system encourages profile completion
5. **Schedule Viewings** - One-click booking with agent notifications

### For Agents

1. **Receive Notifications** - Instant emails with complete prospect profiles
2. **Review Financials** - Pre-qualified affordability details
3. **Prioritize Leads** - High/Medium/Low scoring for lead management
4. **Track Interactions** - Viewing history and engagement metrics

### For Agencies

1. **Access Dashboard** - Agency-wide analytics and agent management
2. **Manage Branding** - White-label customization options
3. **Handle Billing** - Stripe integration for subscriptions
4. **Monitor Performance** - Lead conversion and agent productivity metrics

## 📈 API Documentation

### Prospect Management Endpoints

```typescript
// Profile Management
(createProspect, updateProspect, getProspect);
(calculateBuyability, getProspectProgress);

// Property Interactions
(addFavoriteProperty, removeFavoriteProperty, getFavorites);
(trackPropertyView, getRecentlyViewed);

// Viewing Management
(scheduleViewing, getScheduledViewings, updateViewingStatus);

// Recommendations
(getRecommendedListings, earnBadge, updateProfileProgress);
```

### Authentication Flow

```typescript
// JWT-based with role management
publicProcedure; // No auth required
protectedProcedure; // Any authenticated user
agentProcedure; // Agent or higher
agencyAdminProcedure; // Agency admin or super_admin
superAdminProcedure; // Platform admin only
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Check lint without changing files
pnpm lint:check

# Auto-fix lint issues
pnpm lint:fix

# Type checking
pnpm type-check
```

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose exec app pnpm db:migrate
```

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=mysql://prod-db:3306/real_estate_portal
REDIS_URL=redis://redis:6379
EMAIL_SERVICE_API_KEY=your-email-service-key
CDN_BASE_URL=https://cdn.yourdomain.com

> [!IMPORTANT]
> **VITE_API_URL Configuration**
> - **Monolith (Single Service)**: Leave empty or set to `/`.
> - **Split Services**: Set to `https://your-backend.com` (Do NOT append `/api`).
> - The application automatically appends `/api` where needed. Adding it here will break routing.
```

## 📊 Monitoring & Analytics

### Key Metrics

- **User Engagement**: Dashboard open rate, profile completion, badge earnings
- **Lead Quality**: Pre-qualification rate, viewing conversion, sale closures
- **Agent Productivity**: Response time, conversion rates, satisfaction scores
- **Platform Health**: API response times, error rates, database performance

### Logging

```typescript
// Structured logging with Winston
logger.info('Prospect created', { prospectId, sessionId, buyabilityScore });
logger.error('Email notification failed', { error, agentId, viewingId });
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style

- **ESLint** + **Prettier** configuration
- **TypeScript strict mode** enabled
- **Conventional commits** for versioning
- **Component documentation** required

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation

- [API Reference](./docs/api.md)
- [Database Schema](./docs/schema.md)
- [Deployment Guide](./docs/deployment.md)

### Issues & Bugs

- Use GitHub Issues for bug reports
- Include reproduction steps and environment details
- Tag with appropriate labels (bug, enhancement, question)

### Community

- **Discord**: Join our developer community
- **Newsletter**: Subscribe for updates and tips
- **Blog**: Technical articles and best practices

---

## 🎯 Roadmap

### Phase 5: Advanced Features

- [ ] **Credit Bureau Integration** - Real-time credit scoring
- [ ] **AI-Powered Recommendations** - Machine learning personalization
- [ ] **Mobile App** - Native iOS/Android experience
- [ ] **Market Intelligence** - Local market data integration
- [ ] **Agent CRM** - Full customer relationship management

### Phase 6: Enterprise Features

- [ ] **Multi-Market Support** - International expansion
- [ ] **Advanced Analytics** - Business intelligence dashboard
- [ ] **API Marketplace** - Third-party integrations
- [ ] **White-label API** - Custom implementations

## 🔄 Future Dashboards

### Agency Dashboard (`/agency/*`)

- **Target Users**: Agency administrators
- **Purpose**: Manage agency operations, agents, listings, and performance
- **Current Status**: Placeholder implemented
- **Components**: `client/src/pages/agency/AgencyDashboard.tsx`

### Agent Dashboard (`/agent/*`)

- **Target Users**: Individual real estate agents
- **Purpose**: Manage personal listings, leads, showings, and commissions
- **Current Status**: Placeholder implemented
- **Components**: `client/src/pages/agent/AgentDashboard.tsx`

### Partner Dashboard (`/partner/*`)

- **Target Users**: Third-party partners and service providers
- **Purpose**: Manage partnerships, integrations, and shared resources
- **Current Status**: Placeholder implemented
- **Components**: `client/src/pages/partner/PartnerDashboard.tsx`

### Implementation Notes

- All future dashboards use the shared `DashboardLayout` component for consistent UI
- Role-based access control will be implemented with dedicated guard components
- Routes are already scaffolded in `client/src/App.tsx` with temporary `RequireSuperAdmin` guards

## 🔐 Route Guards (client/src/components)

### `RequireSuperAdmin`

- Protects any component tree behind a `super_admin` role.
- Shows a loading spinner while the auth context resolves.
- Uses **wouter**'s `useLocation` for client‑side navigation.
- Includes infinite‑loop protection (`if (window.location.pathname !== '/login')`).

### `RequireRole`

- Generic version that accepts a `role: string` prop.
- Works the same way as `RequireSuperAdmin` but can be used for `agency_admin`, `agent`, `partner`, etc.
- Example:

```tsx
<RequireRole role="agency_admin">
  <AgencyDashboard />
</RequireRole>
```

Both components live in `src/components/` and include comprehensive unit tests.

Built with ❤️ for the South African real estate industry/ /   T r i g g e r   r e d e p l o y 
 
 

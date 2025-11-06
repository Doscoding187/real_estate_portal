# Frontend Architecture - Real Estate Portal

## Overview

A comprehensive React-based real estate platform with multi-tenant white-label capabilities, built using modern technologies and best practices.

---

## Technical Stack

### Core Technologies
- **Framework**: React 19.1.1 with TypeScript 5.9.3
- **Build Tool**: Vite 7.1.7
- **Routing**: Wouter 3.3.5 (patched)
- **State Management**: TanStack Query 5.90.2 + tRPC 11.6.0
- **Styling**: Tailwind CSS 4.1.14 + shadcn/ui components
- **Forms**: React Hook Form 7.64.0 + Zod 4.1.12
- **Animations**: Framer Motion 12.23.22

### Key Libraries
- **UI Components**: Radix UI primitives
- **Charts**: Recharts 2.15.2
- **Notifications**: Sonner 2.0.7
- **Carousels**: Embla Carousel
- **Drag & Drop**: @hello-pangea/dnd 18.0.1
- **Date Handling**: date-fns 4.1.0

---

## Project Structure

```
client/src/
├── _core/                      # Core utilities and hooks
│   └── hooks/
│       └── useAuth.ts          # Authentication hook
│
├── components/                 # React components
│   ├── ui/                     # shadcn/ui base components (53 files)
│   ├── agency/                 # Agency-specific components
│   │   ├── AgencyPerformanceChart.tsx
│   │   ├── AgencyStatsCards.tsx
│   │   ├── AgentPerformanceLeaderboard.tsx
│   │   ├── CommissionEarningsDashboard.tsx
│   │   ├── LeadConversionAnalytics.tsx
│   │   ├── RecentLeadsTable.tsx
│   │   └── RecentListingsTable.tsx
│   ├── agent/                  # Agent dashboard components
│   │   ├── CommissionTracker.tsx
│   │   ├── LeadPipeline.tsx
│   │   ├── NotificationCenter.tsx
│   │   └── ShowingsCalendar.tsx
│   ├── analytics/              # Analytics & visualizations
│   │   └── PropertyPriceHeatmap.tsx
│   ├── explore/                # Explore feed features
│   │   ├── ContactAgentModal.tsx
│   │   ├── VideoCard.tsx
│   │   └── VideoUploadModal.tsx
│   ├── location/               # Location-based features
│   │   ├── AdvancedPropertySearch.tsx
│   │   ├── LocationAutocomplete.tsx
│   │   ├── LocationHierarchyFilter.tsx
│   │   ├── NearbyAmenitiesMap.tsx
│   │   └── PropertyMap.tsx
│   ├── maps/                   # Google Maps integration
│   │   ├── GoogleAmenitiesMap.tsx
│   │   ├── GoogleLocationAutocomplete.tsx
│   │   ├── GooglePropertyMap.tsx
│   │   └── StreetViewPanel.tsx
│   └── [root level components] # Global components
│       ├── DashboardLayout.tsx
│       ├── EnhancedHero.tsx
│       ├── EnhancedNavbar.tsx
│       ├── ErrorBoundary.tsx
│       ├── ImageUploader.tsx
│       ├── PropertyCard.tsx
│       ├── PropertyCardWithProspect.tsx
│       ├── PropertyInsights.tsx
│       ├── ProspectDashboard.tsx
│       └── [20+ more components]
│
├── contexts/                   # React Context providers
│   ├── BrandingContext.tsx     # White-label branding system
│   └── ThemeContext.tsx        # Theme management (light/dark)
│
├── hooks/                      # Custom React hooks
│   ├── use-toast.ts            # Toast notifications
│   ├── useComposition.ts       # Composition utilities
│   ├── useMobile.tsx           # Mobile detection
│   ├── useOnboardingDraft.ts   # Onboarding draft management
│   └── usePersistFn.ts         # Persistent function reference
│
├── lib/                        # Utilities and configurations
│   ├── config/                 # Configuration files
│   ├── normalizers.ts          # Data normalization utilities
│   ├── trpc.ts                 # tRPC client setup
│   └── utils.ts                # General utilities
│
├── pages/                      # Page components (route handlers)
│   ├── admin/                  # Admin dashboard pages
│   │   ├── AgencyList.tsx
│   │   ├── AuditLogs.tsx
│   │   ├── CreateAgency.tsx
│   │   ├── ListingOversight.tsx
│   │   ├── PlatformSettings.tsx
│   │   ├── SubscriptionManagement.tsx
│   │   └── UserManagement.tsx
│   ├── agency/                 # Agency dashboard pages
│   │   ├── AgentManagement.tsx
│   │   ├── BillingDashboard.tsx
│   │   └── InviteAgents.tsx
│   └── [root level pages]      # Main application pages
│       ├── Home.tsx
│       ├── Properties.tsx
│       ├── PropertyDetail.tsx
│       ├── AgentDashboard.tsx
│       ├── AgencyDashboard.tsx
│       ├── ExploreFeed.tsx
│       ├── Login.tsx
│       └── [15+ more pages]
│
├── App.tsx                     # Root application component
├── main.tsx                    # Application entry point
├── index.css                   # Global styles & Tailwind config
└── const.ts                    # Application constants
```

---

## Architecture Patterns

### 1. **State Management**

#### tRPC + TanStack Query
```typescript
// client/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers';

export const trpc = createTRPCReact<AppRouter>();
```

**Usage in Components:**
```typescript
// Query
const { data, isLoading } = trpc.properties.featured.useQuery({ limit: 6 });

// Mutation
const mutation = trpc.properties.create.useMutation({
  onSuccess: () => {
    // Handle success
  }
});
```

**Global Error Handling:**
- Automatic redirect to login on 401 (Unauthorized)
- Error logging to console
- Configured in `main.tsx`

### 2. **Authentication**

**Hook: `useAuth`**
```typescript
const { user, isAuthenticated, loading, logout, refresh } = useAuth({
  redirectOnUnauthenticated: true,
  redirectPath: '/login'
});
```

**User Roles:**
- `super_admin` - Platform super administrator
- `agency_admin` - Agency owner/administrator
- `agent` - Real estate agent
- `user` - Regular user/prospect

### 3. **Multi-Tenant White-Label System**

**Branding Context:**
```typescript
const { branding, isWhiteLabel, isLoading, refreshBranding } = useBranding();
```

**Features:**
- Custom domains and subdomains
- Dynamic color schemes (CSS variables)
- Custom logos and favicons
- Meta title/description injection
- Custom CSS injection
- Social links configuration

**Branding Detection:**
1. Server-injected branding data in `<script id="agency-branding">`
2. Fallback to API call if injection fails
3. URL-based detection (custom domains/subdomains)

### 4. **Routing Architecture**

**Router: Wouter (Patched)**
- File: `client/src/App.tsx`
- Routes organized by user role
- Protected routes handled via `useAuth`

**Route Groups:**
- **Public Routes**: Home, Properties, Agents, Explore
- **Auth Routes**: Login, Accept Invitation
- **User Routes**: Dashboard, Favorites, Property Listing
- **Agent Routes**: Agent Dashboard
- **Agency Routes**: Agency Dashboard, Onboarding, Agent Management
- **Admin Routes**: Platform Administration

### 5. **Theme System**

**ThemeContext Features:**
- Light/Dark mode support
- Optional theme switching
- LocalStorage persistence
- CSS class-based theming

**Usage:**
```typescript
const { theme, toggleTheme, switchable } = useTheme();
```

---

## API Integration (tRPC Routers)

### Available Routers

#### **Core Routers**
1. **`auth`** - Authentication (me, logout)
2. **`properties`** - Property CRUD, search, images
3. **`agents`** - Agent listing and details
4. **`developments`** - Developer properties
5. **`favorites`** - User favorites management
6. **`prospects`** - Lead qualification system
7. **`upload`** - Image upload (presigned URLs)

#### **Domain Routers**
8. **`admin`** - Platform administration
9. **`agency`** - Agency management
10. **`agent`** - Agent-specific features
11. **`user`** - User profile management
12. **`billing`** - Subscription & payments (Stripe)
13. **`invitation`** - Agent invitations
14. **`video`** - Video content management
15. **`location`** - Location hierarchy
16. **`enhancedLocation`** - Advanced location features
17. **`googleMaps`** - Google Maps integration
18. **`priceInsights`** - Property analytics

---

## Key Features & Implementations

### 1. **Prospect Qualification System**

**Components:**
- `ProspectDashboard.tsx` - Main prospect interface
- `ProspectQuickView.tsx` - Quick prospect summary
- `PropertyCardWithProspect.tsx` - Property cards with affordability

**Flow:**
1. Session-based tracking (anonymous users)
2. Income & expense collection
3. Buyability calculation (server-side)
4. Property recommendations based on affordability
5. Progress tracking & gamification (badges)

**Features:**
- Affordability ranges
- Credit score integration
- Monthly payment estimation
- Debt-to-income ratio
- Property viewings scheduling
- Recently viewed properties

### 2. **Agent Dashboard**

**Components:**
- `AgentDashboard.tsx` - Main dashboard
- `CommissionTracker.tsx` - Commission tracking
- `LeadPipeline.tsx` - Lead management
- `ShowingsCalendar.tsx` - Viewing appointments
- `NotificationCenter.tsx` - Activity notifications

**Features:**
- Lead pipeline (Kanban-style)
- Commission calculations
- Scheduled viewings calendar
- Performance metrics
- Notification system

### 3. **Agency Dashboard**

**Components:**
- `AgencyDashboard.tsx` - Overview
- `AgencyPerformanceChart.tsx` - Analytics
- `AgentPerformanceLeaderboard.tsx` - Agent rankings
- `CommissionEarningsDashboard.tsx` - Financial tracking
- `LeadConversionAnalytics.tsx` - Conversion metrics

**Features:**
- Multi-agent management
- Performance analytics
- Lead distribution
- Commission tracking
- Agent invitations
- White-label branding configuration

### 4. **Admin Dashboard**

**Pages:**
- Platform-wide user management
- Agency oversight
- Subscription management
- Audit logs
- Listing moderation
- System settings

### 5. **Property Features**

**Search & Discovery:**
- Advanced filtering (price, bedrooms, location, type)
- Location hierarchy (province → city → suburb → neighborhood)
- Google Maps integration
- Street View
- Nearby amenities mapping
- Price insights & heatmaps

**Property Management:**
- Image upload (multi-image support)
- Virtual tours
- Video content
- Property insights
- View tracking

### 6. **Explore Feed**

**Components:**
- `ExploreFeed.tsx` - TikTok-style video feed
- `VideoCard.tsx` - Video player cards
- `VideoUploadModal.tsx` - Video upload interface

**Features:**
- Short-form video content
- Agent contact integration
- View tracking
- Swipeable cards

### 7. **Location Intelligence**

**Components:**
- `LocationAutocomplete.tsx` / `GoogleLocationAutocomplete.tsx`
- `PropertyMap.tsx` / `GooglePropertyMap.tsx`
- `NearbyAmenitiesMap.tsx` / `GoogleAmenitiesMap.tsx`
- `LocationHierarchyFilter.tsx`
- `AdvancedPropertySearch.tsx`

**Features:**
- Hierarchical location filtering
- Map-based property search
- Amenities proximity search
- Google Places integration
- Custom location data

---

## UI Component Library (shadcn/ui)

### Base Components (53 files)
Located in `client/src/components/ui/`

**Layout:**
- `card`, `sidebar`, `resizable`, `scroll-area`, `separator`

**Forms:**
- `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`
- `calendar`, `input-otp`, `form`, `field`, `label`

**Navigation:**
- `navigation-menu`, `menubar`, `dropdown-menu`, `context-menu`
- `breadcrumb`, `pagination`, `tabs`

**Feedback:**
- `alert`, `alert-dialog`, `dialog`, `drawer`, `sheet`, `sonner` (toast)
- `tooltip`, `hover-card`, `popover`, `progress`, `spinner`, `skeleton`

**Data Display:**
- `table`, `badge`, `avatar`, `aspect-ratio`, `chart`

**Interactive:**
- `button`, `button-group`, `toggle`, `toggle-group`, `command`
- `accordion`, `collapsible`, `carousel`

**Utilities:**
- `kbd`, `empty`, `item`

---

## Styling System

### Tailwind CSS Configuration

**Theme Variables (CSS Custom Properties):**
```css
:root {
  --primary: oklch(0.20 0.08 240);      /* Deep navy blue */
  --secondary: oklch(0.65 0.15 195);    /* Teal/Cyan */
  --accent: oklch(0.60 0.18 145);       /* Green for CTAs */
  --radius: 0.65rem;
  /* ... + 30+ more variables */
}
```

**Dark Mode:**
- Class-based: `.dark` class on root element
- Automatic variable overrides for dark theme

**Custom Container:**
```css
.container {
  width: 100%;
  max-width: 1280px;
  padding: 1rem; /* Responsive padding */
}
```

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px+
- Desktop: 1024px+

### Font System
- Primary: 'Inter', system fonts fallback
- Applied globally to `body`

---

## Build & Development

### Vite Configuration

**Path Aliases:**
```typescript
{
  "@": "client/src",
  "@shared": "shared",
  "@assets": "attached_assets"
}
```

**Plugins:**
- `@vitejs/plugin-react` - React support
- `@tailwindcss/vite` - Tailwind CSS
- `vite-plugin-manus-runtime` - Manus IDE integration
- `@builder.io/vite-plugin-jsx-loc` - JSX location tracking

**Build Output:**
- Directory: `dist/public`
- Empty on rebuild

**Dev Server:**
- Hot Module Replacement (HMR)
- CORS configured for multiple domains
- Strict file system access

### TypeScript Configuration

**Compiler Options:**
```json
{
  "module": "ESNext",
  "jsx": "preserve",
  "strict": true,
  "moduleResolution": "bundler",
  "skipLibCheck": true
}
```

**Path Mapping:**
```json
{
  "@/*": ["./client/src/*"],
  "@shared/*": ["./shared/*"]
}
```

---

## Environment Variables

**Client-Side Variables:**
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=Real Estate Portal
VITE_APP_LOGO=/logo.png
VITE_ANALYTICS_ENDPOINT=http://localhost:3000/analytics
VITE_ANALYTICS_WEBSITE_ID=local-test-site
```

**Access Pattern:**
```typescript
import.meta.env.VITE_API_URL
```

---

## Data Flow Architecture

### 1. **Server → Client**

```
Server Router (tRPC)
    ↓
HTTP Batch Link (SuperJSON serialization)
    ↓
TanStack Query Cache
    ↓
React Component
```

### 2. **Client → Server**

```
React Component
    ↓
tRPC Mutation/Query
    ↓
HTTP Request (credentials: 'include')
    ↓
Server Router Handler
    ↓
Database (MySQL via Drizzle ORM)
```

### 3. **Error Handling Flow**

```
Server Error
    ↓
tRPC Error Response
    ↓
TanStack Query Error Handler
    ↓
Global Error Subscriber (main.tsx)
    ↓
- Log to console
- Redirect if UNAUTHORIZED
- Component error state
```

---

## Performance Optimizations

### 1. **Code Splitting**
- Route-based splitting via dynamic imports
- Lazy loading for heavy components

### 2. **Query Caching**
- TanStack Query automatic caching
- Stale-while-revalidate strategy
- Background refetching

### 3. **Image Optimization**
- S3 presigned URLs for uploads
- Image lazy loading
- Multiple image sizes

### 4. **Memoization**
- React.memo for expensive renders
- useMemo for computed values
- useCallback for function props

---

## Security Patterns

### 1. **Authentication**
- Cookie-based sessions
- HTTP-only cookies
- Automatic token refresh
- Protected procedures (tRPC)

### 2. **Authorization**
- Role-based access control (RBAC)
- Route-level protection
- Component-level permission checks
- Server-side validation

### 3. **Input Validation**
- Zod schema validation
- Client + Server validation
- Type-safe inputs

### 4. **XSS Protection**
- React automatic escaping
- Sanitized user inputs
- Content Security Policy ready

---

## Testing Strategy

### Testing Tools
- Vitest 2.1.4 - Test runner
- React Testing Library (implied)

### Test Locations
- Component tests: `*.test.tsx`
- Utility tests: `*.test.ts`
- Integration tests: `tests/` directory

---

## Development Workflow

### Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm check        # TypeScript type checking
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm test         # Run tests
```

### Code Quality
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Type Safety**: Strict TypeScript
- **Pre-commit**: (Not configured, recommended)

---

## Recommended Improvements

### High Priority
1. **Add E2E Testing** - Playwright/Cypress for critical flows
2. **Implement Error Boundaries** - Per-route error handling
3. **Add Loading States** - Skeleton screens for all async operations
4. **Performance Monitoring** - Web Vitals tracking
5. **Accessibility Audit** - WCAG 2.1 AA compliance

### Medium Priority
6. **Service Worker** - Offline support
7. **Image CDN** - CloudFront/Cloudflare for images
8. **Bundle Analysis** - Webpack Bundle Analyzer
9. **Code Coverage** - 80%+ target
10. **Documentation** - Storybook for components

### Low Priority
11. **Internationalization** - i18n support
12. **Analytics Integration** - Google Analytics/Mixpanel
13. **A/B Testing** - Feature flags
14. **PWA Features** - Install prompts, notifications

---

## Common Patterns & Best Practices

### 1. **Component Structure**
```typescript
// Imports
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

// Types
interface Props {
  // ...
}

// Component
export function ComponentName({ prop }: Props) {
  // Hooks
  const { data } = trpc.router.procedure.useQuery();
  
  // Event handlers
  const handleClick = () => {
    // ...
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### 2. **Form Handling**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  // validation
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
});
```

### 3. **Protected Routes**
```typescript
function ProtectedPage() {
  const { user, loading } = useAuth({ 
    redirectOnUnauthenticated: true 
  });
  
  if (loading) return <LoadingSkeleton />;
  
  return <div>Protected Content</div>;
}
```

### 4. **Conditional Branding**
```typescript
function Component() {
  const { branding, isWhiteLabel } = useBranding();
  
  return (
    <div style={{ 
      color: branding?.primaryColor 
    }}>
      {isWhiteLabel ? branding?.companyName : 'Default Name'}
    </div>
  );
}
```

---

## Troubleshooting

### Common Issues

**1. tRPC Type Errors**
```bash
pnpm check  # Verify types are in sync
```

**2. Build Failures**
- Check Node version (18+)
- Clear node_modules and reinstall
- Check for circular dependencies

**3. Hot Reload Not Working**
- Check file system watchers limit (Linux)
- Restart dev server
- Clear browser cache

**4. Authentication Issues**
- Check cookie settings
- Verify CORS configuration
- Check credentials: 'include'

---

## Contact & Support

For frontend-specific issues:
1. Check browser console for errors
2. Review React DevTools component tree
3. Inspect Network tab for API calls
4. Verify TanStack Query DevTools

---

## Appendix: File Counts

- **UI Components**: 53 files
- **Pages**: 23+ files (12 root + 7 admin + 3 agency + others)
- **Feature Components**: 40+ files
- **Total Components**: 116+ files
- **Custom Hooks**: 5 files
- **Context Providers**: 2 files

---

**Last Updated**: 2025-11-05  
**Version**: 1.0.0  
**Maintained By**: Development Team

import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/NotFound';
import { Route, Switch, Redirect } from 'wouter';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { ComparisonProvider } from './contexts/ComparisonContext';
import { ComparisonBar } from './components/ComparisonBar';
import { GuestActivityProvider } from './contexts/GuestActivityContext';
import { GuestUserBanner } from './components/GuestUserBanner';
import { useGuestDataMigration } from './hooks/useGuestDataMigration';
import { useKeyboardMode } from './hooks/useKeyboardMode';
import { SkipToContent } from './components/ui/SkipToContent';
import '@/styles/keyboard-navigation.css';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Eager Imports (Critical Path)
import Home from './pages/Home';
import { RequireSuperAdmin } from '@/components/RequireSuperAdmin';
import { RequireRole } from '@/components/RequireRole';
import {
  LegacyCityRedirect,
  LegacySuburbRedirect,
  LegacyProvinceRedirect,
  OldLegacyCityRedirect,
} from './components/LegacyRouteHandler';

// Lazy Imports (Code Split)
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Agents = lazy(() => import('./pages/Agents'));
const AgentDetail = lazy(() => import('./pages/AgentDetail'));
const AgentPublicProfile = lazy(() => import('./pages/AgentPublicProfile'));
const ProvincePage = lazy(() => import('./pages/ProvincePage'));
const CityPage = lazy(() => import('./pages/CityPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));

const AgencyDashboard = lazy(() => import('./pages/AgencyDashboard'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const AgentListings = lazy(() => import('./pages/agent/AgentListings'));
const AgentLeadsEnhanced = lazy(() => import('./pages/agent/AgentLeadsEnhanced'));
const AgentMarketingHub = lazy(() => import('./pages/agent/AgentMarketingHub'));
const AgentEarnings = lazy(() => import('./pages/agent/AgentEarnings'));
const AgentAnalytics = lazy(() => import('./pages/AgentAnalytics'));
const AgentProductivity = lazy(() => import('./pages/agent/AgentProductivity'));
const AgentTrainingSupport = lazy(() => import('./pages/agent/AgentTrainingSupport'));
const AgentSettings = lazy(() => import('./pages/AgentSettings'));
const AgentSetup = lazy(() => import('./pages/AgentSetup'));
const AgencyList = lazy(() => import('./pages/admin/AgencyList'));
const CreateAgency = lazy(() => import('./pages/admin/CreateAgency'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const ListingOversight = lazy(() => import('./pages/admin/ListingOversight'));
const SubscriptionManagement = lazy(() => import('./pages/admin/SubscriptionManagement'));
const PlatformSettings = lazy(() => import('./pages/admin/PlatformSettings'));
const InviteAgents = lazy(() => import('./pages/agency/InviteAgents'));
const AgentManagement = lazy(() => import('./pages/agency/AgentManagement'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const ExploreFeed = lazy(() => import('./pages/ExploreFeed'));
const ExploreHome = lazy(() => import('./pages/ExploreHome'));
const ExploreShorts = lazy(() => import('./pages/ExploreShorts'));
const ExploreUpload = lazy(() => import('./pages/ExploreUpload'));
const ExploreDiscovery = lazy(() => import('./pages/ExploreDiscovery'));
const ExploreMap = lazy(() => import('./pages/ExploreMap'));
const PartnerProfile = lazy(() => import('./pages/PartnerProfile'));
const AgencyOnboarding = lazy(() => import('./pages/AgencyOnboarding'));
const OnboardingSuccess = lazy(() => import('./pages/OnboardingSuccess'));
const AgencySubscriptionPage = lazy(() => import('./pages/agency/SubscriptionPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
// Super Admin Dashboard Pages
const OverviewPage = lazy(() => import('./pages/admin/OverviewPage'));
const AgenciesPage = lazy(() => import('./pages/admin/AgenciesPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const DevelopersPage = lazy(() => import('./pages/admin/DevelopersPage'));
const PropertiesPage = lazy(() => import('./pages/admin/PropertiesPage'));
const AdminPropertyReview = lazy(() => import('./pages/admin/AdminPropertyReview'));
const RevenueCenterPage = lazy(() => import('./pages/admin/RevenueCenterPage'));
const LocationMonetizationPage = lazy(() => import('./pages/admin/LocationMonetizationPage'));
const SubscriptionManagementPage = lazy(() => import('./pages/admin/SubscriptionManagementPage'));
const PlanEditor = lazy(() => import('./pages/admin/PlanEditor'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const MarketingCampaignsPage = lazy(() => import('./pages/admin/MarketingCampaignsPage'));
const CreateCampaignWizard = lazy(() => import('./pages/admin/CreateCampaignWizard'));
const AgentApprovals = lazy(() => import('./pages/admin/AgentApprovals'));
const CampaignDetailsPage = lazy(() => import('./pages/admin/CampaignDetailsPage'));
const CampaignInsights = lazy(() => import('./pages/admin/CampaignInsights'));
const DevelopmentOversight = lazy(() => import('./pages/admin/DevelopmentOversight'));
const UnifiedApprovalsPage = lazy(() => import('./pages/admin/UnifiedApprovalsPage'));
const EcosystemOverviewPage = lazy(() => import('./pages/admin/EcosystemOverviewPage'));
const PartnerNetworkPage = lazy(() => import('./pages/admin/PartnerNetworkPage'));
const SuperAdminPublisher = lazy(() => import('./pages/admin/publisher/SuperAdminPublisher'));

// Import new role-based dashboards
const UserDashboard = lazy(() => import('./pages/UserDashboard'));

// Lovable Integration Hub
const LovableIntegrationHub = lazy(() => import('./pages/LovableIntegrationHub'));

// Import the new Listing Wizard
const ListingWizard = lazy(() => import('./components/listing-wizard/ListingWizard'));
const ListingTemplate = lazy(() => import('./pages/ListingTemplate'));

// Import Development Wizard
const CreateDevelopment = lazy(() => import('./pages/CreateDevelopment'));
const DevelopmentsDemo = lazy(() => import('./pages/DevelopmentsDemo'));
const DevelopmentDetail = lazy(() => import('./pages/DevelopmentDetail'));
// DeveloperSetupWizard (unused in routes?) - keeping imported if it was used, but checking usage...
// It was imported but not used in the Route list in the original file! I will comment it out or lazy load it if I see it.
// Ah, checking original file... L98 imported it. L230 uses CreateDevelopment.
// I don't see DeveloperSetupWizard used in the Switch. I'll omit it or lazy load it just in case.
// Better to follow the pattern and lazy load relevant page-like components.
const DeveloperSetupWizard = lazy(
  () => import('./components/developer/DeveloperSetupWizardEnhanced'),
);
const DevelopmentsList = lazy(() => import('./components/developer/DevelopmentsList'));
const AgencySetupWizard = lazy(() => import('./components/agency/AgencySetupWizard'));

const ExploreComponentDemo = lazy(() => import('./pages/ExploreComponentDemo'));
const MapPreviewDemo = lazy(() => import('./pages/MapPreviewDemo'));

// Import Developer Dashboard Pages
const DeveloperCampaignsPage = lazy(() => import('./pages/DeveloperCampaignsPage'));
const DeveloperPerformancePage = lazy(() => import('./pages/DeveloperPerformancePage'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const DeveloperPlans = lazy(() => import('./pages/DeveloperPlans'));
// Import Developer Layout directly for specific tab routing
const DeveloperRoutes = lazy(() => import('./pages/DeveloperRoutes'));
// Import MyDrafts removed to prevent circular dependency with DeveloperLayout's lazy load
const DeveloperDirectoryPage = lazy(() => import('./pages/DeveloperDirectoryPage'));
const DeveloperBrandProfilePage = lazy(() => import('./pages/DeveloperBrandProfilePage'));

// Import Comparison Page
const CompareProperties = lazy(() => import('./pages/CompareProperties'));
const AdvertiseWithUs = lazy(() => import('./pages/AdvertiseWithUs'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));

// Import SearchResults page for SEO-friendly URLs
const SearchResults = lazy(() => import('./pages/SearchResults'));
const SuburbPage = lazy(() => import('./pages/SuburbPage'));

function Router() {
  // Auto-migrate guest data on login
  useGuestDataMigration();

  // Enable keyboard navigation mode detection
  useKeyboardMode();

  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <SkipToContent targetId="main-content" />
      {/* Route-based Code Splitting */}
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <LoadingSpinner size="xl" variant="primary" label="Loading content..." />
          </div>
        }
      >
        <Switch>
          <Route path={'/'} component={Home} />

          {/* ============================================================== */}
          {/* 1. TRANSACTION ROOTS (Query-Based SRP) - MUST BE FIRST         */}
          {/* These catch /property-for-sale?city=alberton style URLs        */}
          {/* ============================================================== */}
          <Route path="/property-for-sale" component={SearchResults} />
          <Route path="/property-to-rent" component={SearchResults} />

          {/* ============================================================== */}
          {/* 2. CANONICAL SEO PAGES (Path-Based Discovery)                  */}
          {/* Order: Most specific (4 segments) to least specific (2 segments) */}
          {/* ============================================================== */}

          {/* Suburb Pages: /property-for-sale/gauteng/johannesburg/sandton */}
          <Route path="/property-for-sale/:province/:city/:suburb" component={SuburbPage} />
          <Route path="/property-to-rent/:province/:city/:suburb" component={SuburbPage} />

          {/* City Pages: /property-for-sale/gauteng/johannesburg */}
          <Route path="/property-for-sale/:province/:city" component={CityPage} />
          <Route path="/property-to-rent/:province/:city" component={CityPage} />

          {/* Province Pages: /property-for-sale/gauteng */}
          <Route path="/property-for-sale/:province" component={ProvincePage} />
          <Route path="/property-to-rent/:province" component={ProvincePage} />

          {/* ============================================================== */}
          {/* 2A. DEVELOPER DASHBOARD ROUTES                                 */}
          {/* All /developer/* routes are handled by DeveloperRoutes         */}
          {/* ============================================================== */}

          {/* We use a wildcard to let DeveloperRoutes handle sub-routing */}
          <Route path="/developer/:rest*" component={DeveloperRoutes} />

          {/* Developer Brand Directory (public) */}
          <Route path="/developers" component={DeveloperDirectoryPage} />
          {/* Developer Brand Profile Page (public) - MUST be after all /developer/* routes */}
          <Route path="/developer/:slug" component={DeveloperBrandProfilePage} />

          {/* ============================================================== */}
          {/* 3. LEGACY / P24-STYLE ROUTES (Lower Priority)                  */}
          {/* ============================================================== */}

          {/* IMPORTANT: Admin Review must be BEFORE legacy wildcards */}
          {/* Otherwise /:action/:province/:locationId matches /admin/review/360002 */}
          <Route path="/admin/review/:id" component={AdminPropertyReview} />

          {/* Property24-style Routes (Inverted Hierarchy + Location ID) */}
          {/* Suburb Page: /houses-for-sale/sky-city/alberton/gauteng/17552 */}
          <Route path="/:action/:suburb/:city/:province/:locationId" component={SuburbPage} />

          {/* City Page: /houses-for-sale/sandton/gauteng/109 */}
          <Route path="/:action/:city/:province/:locationId" component={CityPage} />

          {/* Province Page (Legacy Pattern): /houses-for-sale/gauteng/1 */}
          <Route path="/:action/:province/:locationId" component={ProvincePage} />

          {/* Legacy properties route (query params) */}
          <Route path="/properties" component={SearchResults} />
          <Route path="/property/:id" component={PropertyDetail} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/agents" component={Agents} />
          <Route path="/agent/dashboard" component={AgentDashboard} />
          <Route path="/agent/listings" component={AgentListings} />
          <Route path="/agent/leads" component={AgentLeadsEnhanced} />
          <Route path="/agent/marketing" component={AgentMarketingHub} />
          <Route path="/agent/earnings" component={AgentEarnings} />
          <Route path="/agent/analytics" component={AgentAnalytics} />
          <Route path="/agent/productivity" component={AgentProductivity} />
          <Route path="/agent/training" component={AgentTrainingSupport} />
          <Route path="/agent/settings" component={AgentSettings} />
          <Route path="/agent/setup" component={AgentSetup} />
          <Route path="/agent/profile/:agentId" component={AgentPublicProfile} />
          <Route path="/agent/:id" component={AgentDetail} />

          {/* Redirects for Old Route Structures */}
          {/* Very Old Format: /city/johannesburg */}
          <Route path="/city/:slug" component={OldLegacyCityRedirect} />
          {/* Very Old Format: /suburb/johannesburg/sandton */}
          <Route path="/suburb/:city/:suburb">
            {params => <LegacySuburbRedirect params={{ ...params, province: 'gauteng' }} />}
          </Route>

          {/* Route Handlers / Wizards */}
          <Route path="/listings/create" component={ListingWizard} />
          <Route path="/listing-template" component={ListingTemplate} />
          <Route path="/developments/create" component={CreateDevelopment} />
          <Route path="/development-wizard" component={CreateDevelopment} />

          {/* Canonical Developments Root */}
          <Route path="/new-developments" component={DevelopmentsDemo} />
          {/* Redirect Legacy /developments to /new-developments */}
          <Route
            path="/developments"
            component={() => {
              window.location.replace('/new-developments');
              return null;
            }}
          />
          <Route path="/development/:slug" component={DevelopmentDetail} />

          {/* NOTE: Developer routes moved to section 2A above legacy wildcards */}

          <Route path="/agency/setup" component={AgencySetupWizard} />
          <Route path="/agency/success" component={() => <RegistrationSuccess role="agency" />} />
          <Route path="/agent/success" component={() => <RegistrationSuccess role="agent" />} />

          {/* Explore routes */}
          <Route path="/explore/home" component={ExploreHome} />
          <Route path="/explore/shorts" component={ExploreShorts} />
          <Route path="/explore/upload" component={ExploreUpload} />
          <Route path="/explore/component-demo" component={ExploreComponentDemo} />
          <Route path="/map-preview-demo" component={MapPreviewDemo} />

          {/* New Explore Pages */}
          <Route path="/explore/discovery" component={ExploreDiscovery} />
          <Route path="/explore/map" component={ExploreMap} />

          {/* Legacy Feed */}
          <Route path="/explore/feed" component={ExploreFeed} />

          {/* Explore Entry Rule (MUST be after the specific routes) */}
          <Route path="/explore">
            <Redirect to="/explore/home" />
          </Route>

          {/* Partner Profile */}
          <Route path="/partner/:partnerId" component={PartnerProfile} />

          <Route path="/compare" component={CompareProperties} />

          {/* Auth */}
          <Route path="/login" component={Login} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/accept-invitation" component={AcceptInvitation} />
          <Route path="/role-selection" component={RoleSelection} />
          <Route path="/advertise" component={AdvertiseWithUs} />
          <Route
            path="/advertise-with-us"
            component={() => {
              window.location.href = '/advertise';
              return null;
            }}
          />
          <Route
            path="/advertise with us"
            component={() => {
              window.location.href = '/advertise';
              return null;
            }}
          />
          <Route path="/subscription-plans" component={SubscriptionPlans} />

          {/* Super Admin Dashboard Routes */}
          <Route
            path="/admin"
            component={() => (
              <SuperAdminDashboard>
                <OverviewPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/ecosystem"
            component={() => (
              <SuperAdminDashboard>
                <EcosystemOverviewPage />
              </SuperAdminDashboard>
            )}
          />

          <Route
            path="/admin/overview"
            component={() => (
              <SuperAdminDashboard>
                <OverviewPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/agencies"
            component={() => (
              <SuperAdminDashboard>
                <AgenciesPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/users"
            component={() => (
              <SuperAdminDashboard>
                <UsersPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/developers"
            component={() => (
              <SuperAdminDashboard>
                <DevelopersPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/properties"
            component={() => (
              <SuperAdminDashboard>
                <PropertiesPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/revenue"
            component={() => (
              <SuperAdminDashboard>
                <RevenueCenterPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/monetization"
            component={() => (
              <SuperAdminDashboard>
                <LocationMonetizationPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/subscriptions"
            component={() => (
              <SuperAdminDashboard>
                <SubscriptionManagementPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/marketing"
            component={() => (
              <SuperAdminDashboard>
                <MarketingCampaignsPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/marketing/create"
            component={() => (
              <SuperAdminDashboard>
                <CreateCampaignWizard />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/marketing/:id"
            component={() => (
              <SuperAdminDashboard>
                <CampaignDetailsPage />
              </SuperAdminDashboard>
            )}
          />
          <Route
            path="/admin/analytics"
            component={() => (
              <SuperAdminDashboard>
                <AnalyticsPage />
              </SuperAdminDashboard>
            )}
          />

          {/* Campaign Insights Route */}
          <Route
            path="/admin/marketing/campaign/:id"
            component={() => (
              <SuperAdminDashboard>
                <CampaignInsights />
              </SuperAdminDashboard>
            )}
          />

          {/* Lovable Integration Hub Route */}
          <Route
            path="/admin/lovable-hub"
            component={() => (
              <SuperAdminDashboard>
                <LovableIntegrationHub />
              </SuperAdminDashboard>
            )}
          />
          {/* Unified Approvals Route */}
          <Route
            path="/admin/approvals"
            component={() => (
              <SuperAdminDashboard>
                <UnifiedApprovalsPage />
              </SuperAdminDashboard>
            )}
          />

          {/* Listing Approval Queue Route */}
          <Route
            path="/admin/listing-approvals"
            component={() => (
              <SuperAdminDashboard>
                <ListingOversight />
              </SuperAdminDashboard>
            )}
          />

          {/* Agent Approval Queue Route */}
          <Route
            path="/admin/agent-approvals"
            component={() => (
              <SuperAdminDashboard>
                <AgentApprovals />
              </SuperAdminDashboard>
            )}
          />

          {/* Development Approval Queue Route */}
          <Route
            path="/admin/development-approvals"
            component={() => (
              <SuperAdminDashboard>
                <DevelopmentOversight />
              </SuperAdminDashboard>
            )}
          />

          {/* Partner Network Route */}
          <Route
            path="/admin/partners"
            component={() => (
              <SuperAdminDashboard>
                <PartnerNetworkPage />
              </SuperAdminDashboard>
            )}
          />

          {/* Developer Publisher Route */}
          <Route
            path="/admin/publisher"
            component={() => (
              <SuperAdminDashboard>
                <SuperAdminPublisher />
              </SuperAdminDashboard>
            )}
          />

          {/* Other routes that might conflict */}
          <Route path="/dashboard" component={Dashboard} />

          <Route path="/agency/dashboard" component={AgencyDashboard} />
          <Route path="/agency/subscription" component={AgencySubscriptionPage} />
          <Route path="/agency/onboarding" component={AgencyOnboarding} />
          <Route path="/admin/subscription-management" component={SubscriptionManagementPage} />
          <Route path="/admin/plan-editor" component={PlanEditor} />
          <Route path="/admin/revenue-center" component={RevenueCenterPage} />
          <Route path="/agency/onboarding/success" component={OnboardingSuccess} />
          <Route path="/agency/invite" component={InviteAgents} />
          <Route path="/agency/agents" component={AgentManagement} />

          {/* NOTE: Developer routes are defined in section 2A above */}

          {/* User Dashboard Route */}
          <Route path="/user/dashboard">
            <RequireRole role="user">
              <UserDashboard />
            </RequireRole>
          </Route>

          {/* Future Dashboard Routes - TODO: Add proper role-based guards */}
          <Route path="/agency/*">
            <RequireRole role="agency_admin">
              <AgencyDashboard />
            </RequireRole>
          </Route>

          <Route path="/agent/*">
            <RequireRole role="agent">
              <AgentDashboard />
            </RequireRole>
          </Route>

          {/* CATCH-ALL ROUTES & LEGACY REDIRECTS - MUST BE LAST */}
          {/* Redirect /:province/:city/:suburb -> /property-for-sale/:province/:city/:suburb */}
          <Route path="/:province/:city/:suburb" component={LegacySuburbRedirect} />
          {/* Redirect /:province/:city -> /property-for-sale/:province/:city */}
          <Route path="/:province/:city" component={LegacyCityRedirect} />
          {/* Redirect /:province -> /property-for-sale/:province */}
          <Route path="/:province" component={LegacyProvinceRedirect} />

          <Route path={'/404'} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <BrandingProvider>
        <ThemeProvider
          defaultTheme="light"
          // switchable
        >
          <GuestActivityProvider>
            <ComparisonProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
                <ComparisonBar />
                <GuestUserBanner />
              </TooltipProvider>
            </ComparisonProvider>
          </GuestActivityProvider>
        </ThemeProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

export default App;

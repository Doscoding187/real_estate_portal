import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/NotFound';
import { Route, Switch } from 'wouter';
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
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Favorites from './pages/Favorites';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import AgentPublicProfile from './pages/AgentPublicProfile';
import ProvincePage from './pages/ProvincePage';
import CityPage from './pages/CityPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

import AgencyDashboard from './pages/AgencyDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AgentListings from './pages/agent/AgentListings';
import AgentLeadsEnhanced from './pages/agent/AgentLeadsEnhanced';
import AgentMarketingHub from './pages/agent/AgentMarketingHub';
import AgentEarnings from './pages/agent/AgentEarnings';
import AgentAnalytics from './pages/AgentAnalytics';
import AgentProductivity from './pages/agent/AgentProductivity';
import AgentTrainingSupport from './pages/agent/AgentTrainingSupport';
import AgentSettings from './pages/AgentSettings';
import AgentSetup from './pages/AgentSetup';
import AgencyList from './pages/admin/AgencyList';
import CreateAgency from './pages/admin/CreateAgency';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import ListingOversight from './pages/admin/ListingOversight';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import PlatformSettings from './pages/admin/PlatformSettings';
import InviteAgents from './pages/agency/InviteAgents';
import AgentManagement from './pages/agency/AgentManagement';
import AcceptInvitation from './pages/AcceptInvitation';
import ExploreFeed from './pages/ExploreFeed';
import ExploreHome from './pages/ExploreHome';
import ExploreShorts from './pages/ExploreShorts';
import ExploreUpload from './pages/ExploreUpload';
import AgencyOnboarding from './pages/AgencyOnboarding';
import OnboardingSuccess from './pages/OnboardingSuccess';
import AgencySubscriptionPage from './pages/agency/SubscriptionPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { RequireSuperAdmin } from '@/components/RequireSuperAdmin';
import { RequireRole } from '@/components/RequireRole';
import SuperAdminDashboard from '@/pages/admin/SuperAdminDashboard';
// Super Admin Dashboard Pages
import OverviewPage from './pages/admin/OverviewPage';
import AgenciesPage from './pages/admin/AgenciesPage';
import UsersPage from './pages/admin/UsersPage';
import DevelopersPage from './pages/admin/DevelopersPage';
import PropertiesPage from './pages/admin/PropertiesPage';
import AdminPropertyReview from './pages/admin/AdminPropertyReview';
import RevenueCenterPage from './pages/admin/RevenueCenterPage';
import SubscriptionManagementPage from './pages/admin/SubscriptionManagementPage';
import PlanEditor from './pages/admin/PlanEditor';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import MarketingCampaignsPage from './pages/admin/MarketingCampaignsPage';
import CreateCampaignWizard from './pages/admin/CreateCampaignWizard';
import AgentApprovals from './pages/admin/AgentApprovals';
import CampaignDetailsPage from './pages/admin/CampaignDetailsPage';
import CampaignInsights from './pages/admin/CampaignInsights';

// Import new role-based dashboards
import UserDashboard from './pages/UserDashboard';
import PropertyDeveloperDashboard from './pages/PropertyDeveloperDashboard';

// Lovable Integration Hub
import LovableIntegrationHub from './pages/LovableIntegrationHub';

// Import the new Listing Wizard
import ListingWizard from './components/listing-wizard/ListingWizard';
import ListingTemplate from './pages/ListingTemplate';

// Import Development Wizard
import CreateDevelopment from './pages/CreateDevelopment';
import DevelopmentsDemo from './pages/DevelopmentsDemo';
import DevelopmentDetail from './pages/DevelopmentDetail';
import DeveloperSetupWizard from './components/developer/DeveloperSetupWizardEnhanced';
import DevelopmentsList from './components/developer/DevelopmentsList';
import AgencySetupWizard from './components/agency/AgencySetupWizard';
import UnitTypesDemo from './pages/UnitTypesDemo';
import ExploreComponentDemo from './pages/ExploreComponentDemo';

// Import Developer Dashboard Pages
import DeveloperDevelopmentsPage from './pages/DeveloperDevelopmentsPage';
import DeveloperLeadsPage from './pages/DeveloperLeadsPage';
import DeveloperMessagesPage from './pages/DeveloperMessagesPage';
import DeveloperTasksPage from './pages/DeveloperTasksPage';
import DeveloperReportsPage from './pages/DeveloperReportsPage';
import DeveloperAnalyticsPage from './pages/DeveloperAnalyticsPage';
import DeveloperCampaignsPage from './pages/DeveloperCampaignsPage';
import DeveloperPerformancePage from './pages/DeveloperPerformancePage';
import DeveloperSettingsPage from './pages/DeveloperSettingsPage';
import DeveloperTeamPage from './pages/DeveloperTeamPage';
import DeveloperSubscriptionPage from './pages/DeveloperSubscriptionPage';
import MyDrafts from './pages/developer/MyDrafts';

// Import Comparison Page
import CompareProperties from './pages/CompareProperties';
import AdvertisePage from './pages/AdvertisePage';
import RoleSelection from './pages/RoleSelection';
import RegistrationSuccess from './pages/RegistrationSuccess';

// Import SearchResults page for SEO-friendly URLs
import SearchResults from './pages/SearchResults';
import SuburbPage from './pages/SuburbPage';
import { LegacyCityRedirect, LegacySuburbRedirect } from './components/LegacyRouteHandler';

function Router() {
  // Auto-migrate guest data on login
  useGuestDataMigration();
  
  // Enable keyboard navigation mode detection
  useKeyboardMode();
  
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <SkipToContent targetId="main-content" />
      <Switch>
      <Route path={'/'} component={Home} />
      
      {/* SEO-friendly property search routes (more specific first) */}
      <Route path="/properties/:listingType/:propertyType/:location/:suburb" component={SearchResults} />
      <Route path="/properties/:listingType/:propertyType/:location" component={SearchResults} />
      <Route path="/properties/:listingType/:propertyType" component={SearchResults} />
      <Route path="/properties/:listingType" component={SearchResults} />
      
      {/* Legacy properties route (query params) */}
      <Route path="/properties" component={Properties} />
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
      <Route path="/agent/:id" component={AgentDetail} />
      
      {/* Legacy Route Redirects */}
      <Route path="/city/:slug" component={LegacyCityRedirect} />
      <Route path="/suburb/:city/:suburb" component={LegacySuburbRedirect} />
      <Route path="/listings/create" component={ListingWizard} />
      <Route path="/listing-template" component={ListingTemplate} />
      <Route path="/developments/create" component={CreateDevelopment} />
      <Route path="/developments" component={DevelopmentsDemo} />
      <Route path="/development/:id" component={DevelopmentDetail} />
      <Route path="/developer/setup" component={DeveloperSetupWizard} />
      <Route path="/developer/success" component={() => <RegistrationSuccess role="developer" />} />
      <Route path="/agency/setup" component={AgencySetupWizard} />
      <Route path="/agency/success" component={() => <RegistrationSuccess role="agency" />} />
      <Route path="/agent/success" component={() => <RegistrationSuccess role="agent" />} />
      
      {/* Explore routes - MUST come before location catch-all routes */}
      <Route path="/explore/home" component={ExploreHome} />
      <Route path="/explore/shorts" component={ExploreShorts} />
      <Route path="/explore/upload" component={ExploreUpload} />
      <Route path="/explore/component-demo" component={ExploreComponentDemo} />
      <Route path="/explore" component={ExploreFeed} />
      
      <Route path="/compare" component={CompareProperties} />
      
      {/* Login and authentication routes should be early in the route list */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/accept-invitation" component={AcceptInvitation} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/advertise" component={AdvertisePage} />


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
      
      {/* Admin Property Review Route */}
      <Route
        path="/admin/review/:id"
        component={AdminPropertyReview}
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

      {/* Property Developer Dashboard Routes */}
      <Route path="/developer" component={PropertyDeveloperDashboard} />
      <Route path="/developer/dashboard" component={PropertyDeveloperDashboard} />
      <Route path="/developer/developments" component={DeveloperDevelopmentsPage} />
      <Route path="/developer/developments/new" component={CreateDevelopment} />
      <Route path="/developer/create-development" component={CreateDevelopment} />
      <Route path="/developer/unit-types-demo" component={UnitTypesDemo} />
      <Route path="/developer/drafts" component={MyDrafts} />
      <Route path="/developer/leads" component={DeveloperLeadsPage} />
      <Route path="/developer/messages" component={DeveloperMessagesPage} />
      <Route path="/developer/tasks" component={DeveloperTasksPage} />
      <Route path="/developer/reports" component={DeveloperReportsPage} />
      <Route path="/developer/analytics" component={DeveloperAnalyticsPage} />
      <Route path="/developer/campaigns" component={DeveloperCampaignsPage} />
      <Route path="/developer/campaigns/new" component={DeveloperCampaignsPage} />
      <Route path="/developer/performance" component={DeveloperPerformancePage} />
      <Route path="/developer/settings" component={DeveloperSettingsPage} />
      <Route path="/developer/settings/team" component={DeveloperTeamPage} />
      <Route path="/developer/settings/subscription" component={DeveloperSubscriptionPage} />

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

      <Route path="/:province/:city/:suburb" component={SuburbPage} />
      <Route path="/:province/:city" component={CityPage} />
      <Route path="/:province" component={ProvincePage} />

      <Route path={'/404'} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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

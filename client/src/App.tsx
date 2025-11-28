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
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Favorites from './pages/Favorites';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import CityPage from './pages/CityPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

import AgencyDashboard from './pages/AgencyDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AgentListings from './pages/agent/AgentListings';
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

// Import Comparison Page
import CompareProperties from './pages/CompareProperties';

function Router() {
  // Auto-migrate guest data on login
  useGuestDataMigration();
  
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={'/'} component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/agents" component={Agents} />
      <Route path="/agent/dashboard" component={AgentDashboard} />
      <Route path="/agent/listings" component={AgentListings} />
      <Route path="/agent/setup" component={AgentSetup} />
      <Route path="/agent/:id" component={AgentDetail} />
      <Route path="/city/:slug" component={CityPage} />
      <Route path="/listings/create" component={ListingWizard} />
      <Route path="/listing-template" component={ListingTemplate} />
      <Route path="/developments/create" component={CreateDevelopment} />
      <Route path="/developments" component={DevelopmentsDemo} />
      <Route path="/development/:id" component={DevelopmentDetail} />
      <Route path="/explore" component={ExploreFeed} />
      <Route path="/compare" component={CompareProperties} />

      {/* Login and authentication routes should be early in the route list */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/accept-invitation" component={AcceptInvitation} />

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

      {/* Property Developer Dashboard Route */}
      <Route path="/developer/dashboard">
        <RequireRole role="property_developer">
          <PropertyDeveloperDashboard />
        </RequireRole>
      </Route>

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

      <Route path={'/404'} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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

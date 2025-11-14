import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/NotFound';
import { Route, Switch } from 'wouter';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrandingProvider } from './contexts/BrandingContext';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Favorites from './pages/Favorites';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import CityPage from './pages/CityPage';
import ListProperty from './pages/ListProperty';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

import AgencyDashboard from './pages/AgencyDashboard';
import AgentDashboard from './pages/AgentDashboard';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { RequireSuperAdmin } from '@/components/RequireSuperAdmin';
import { RequireRole } from '@/components/RequireRole';
import SuperAdminDashboard from '@/pages/admin/SuperAdminDashboard';
// Super Admin Dashboard Pages
import Overview from './pages/admin/Overview';
import Agencies from './pages/admin/Agencies';
import Listings from './pages/admin/Listings';
import Users from './pages/admin/Users';
import Tickets from './pages/admin/Tickets';
import Audit from './pages/admin/Audit';
import Settings from './pages/admin/Settings';
// Future Dashboard Components
import PartnerDashboard from './pages/partner/PartnerDashboard';

// Import new admin pages
import OverviewPage from './pages/admin/OverviewPage';
import AgenciesPage from './pages/admin/AgenciesPage';
import UsersPage from './pages/admin/UsersPage';
import DevelopersPage from './pages/admin/DevelopersPage';

// Import new role-based dashboards
import UserDashboard from './pages/UserDashboard';
import PropertyDeveloperDashboard from './pages/PropertyDeveloperDashboard';

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={'/'} component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/agents" component={Agents} />
      <Route path="/agent/dashboard" component={AgentDashboard} />
      <Route path="/agent/:id" component={AgentDetail} />
      <Route path="/city/:slug" component={CityPage} />
      <Route path="/list-property" component={ListProperty} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/explore" component={ExploreFeed} />
      {/* Super Admin Dashboard Routes */}
      <Route path="/admin/*">
        <RequireSuperAdmin>
          <SuperAdminDashboard />
        </RequireSuperAdmin>
      </Route>

      {/* Super Admin Dashboard Pages */}
      <Route path="/admin/overview" component={OverviewPage} />
      <Route path="/admin/agencies" component={AgenciesPage} />
      <Route path="/admin/users" component={UsersPage} />
      <Route path="/admin/developers" component={DevelopersPage} />

      <Route path="/agency/dashboard" component={AgencyDashboard} />
      <Route path="/agency/onboarding" component={AgencyOnboarding} />
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

      <Route path="/accept-invitation" component={AcceptInvitation} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

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

      <Route path="/partner/*">
        <RequireRole role="partner">
          <PartnerDashboard />
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
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

export default App;

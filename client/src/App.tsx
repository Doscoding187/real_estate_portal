// @ts-nocheck
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
import { useGuestDataMigration } from './hooks/useGuestDataMigration';
import { useKeyboardMode } from './hooks/useKeyboardMode';
import { SkipToContent } from './components/ui/SkipToContent';
import '@/styles/keyboard-navigation.css';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ADMIN_DASHBOARD_ROUTES } from '@/pages/admin/adminRouteRegistry';
import { isCanonicalProvinceSlug } from './lib/locationDiscovery';
import { buildPropertiesCompatibilityRedirect } from './lib/searchNavigation';

// Eager Imports (Critical Path)
import Home from './pages/Home';
import { RequireRole } from '@/components/RequireRole';
import AgencySetupAccountBoundary from '@/components/AgencySetupAccountBoundary';

// Stable element identity so RequireRole's effect does not re-run per render.
const AGENCY_SETUP_ROLE_MISMATCH_FALLBACK = <AgencySetupAccountBoundary />;

// Lazy Imports (Code Split)
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Agents = lazy(() => import('./pages/Agents'));
const AgentPublicProfile = lazy(() => import('./pages/AgentPublicProfile'));
const AgentMicrosite = lazy(() => import('./pages/AgentMicrosite'));
const ProvincePage = lazy(() => import('./pages/ProvincePage'));
const CityPage = lazy(() => import('./pages/CityPage'));
const SmartDashboardRedirect = lazy(() => import('./components/SmartDashboardRedirect'));
const Login = lazy(() => import('./pages/Login'));

const AgencyDashboard = lazy(() => import('./pages/agency/AgencyDashboard'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const AgentListings = lazy(() => import('./pages/agent/AgentListings'));
const AgentLeads = lazy(() => import('./pages/AgentLeads'));
const AgentCanvassing = lazy(() => import('./pages/agent/AgentCanvassing'));
const AgentMarketingHub = lazy(() => import('./pages/agent/AgentMarketingHub'));
const AgentEarnings = lazy(() => import('./pages/agent/AgentEarnings'));
const AgentReferrals = lazy(() => import('./pages/agent/AgentReferrals'));
const AgentAnalytics = lazy(() => import('./pages/AgentAnalytics'));
const AgentProductivity = lazy(() => import('./pages/agent/AgentProductivity'));
const AgentTrainingSupport = lazy(() => import('./pages/agent/AgentTrainingSupport'));
const AgentSettings = lazy(() => import('./pages/AgentSettings'));
const AgentSetup = lazy(() => import('./pages/AgentSetup'));
const AgentPackageSelection = lazy(() => import('./pages/agent/AgentPackageSelection'));
const LandAuthoringWorkspace = lazy(() => import('./pages/agent/LandAuthoringWorkspace'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const ExploreFeed = lazy(() => import('./pages/ExploreFeed'));
const ExploreHome = lazy(() => import('./pages/ExploreHome'));
const ExploreShorts = lazy(() => import('./pages/ExploreShorts'));
const ExploreMap = lazy(() => import('./pages/ExploreMap'));
const OnboardingSuccess = lazy(() => import('./pages/OnboardingSuccess'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const ActivationComplete = lazy(() => import('./pages/ActivationComplete'));
const SavedSearchManagePage = lazy(() => import('./pages/SavedSearchManagePage'));
const ServicesHomePage = lazy(() => import('./pages/services/ServicesHomePage'));
const ServicesCategoryPage = lazy(() => import('./pages/services/ServicesCategoryPage'));
const ServicesLocalizedCategoryPage = lazy(
  () => import('./pages/services/ServicesLocalizedCategoryPage'),
);
const ServicesRequestPage = lazy(() => import('./pages/services/ServicesRequestPage'));
const ServicesResultsPage = lazy(() => import('./pages/services/ServicesResultsPage'));
const ServiceProviderProfilePage = lazy(
  () => import('./pages/services/ServiceProviderProfilePage'),
);
const ServiceProviderReviewsPage = lazy(
  () => import('./pages/services/ServiceProviderReviewsPage'),
);
const NavLandingPage = lazy(() => import('./pages/NavLandingPage'));
const ProDashboardPage = lazy(() => import('./pages/pro/ProDashboardPage'));
const ProProfilePage = lazy(() => import('./pages/pro/ProProfilePage'));
const ProviderOnboardingWizard = lazy(() =>
  import('./features/services/onboarding/ProviderOnboardingWizard').then(m => ({
    default: m.ProviderOnboardingWizard,
  })),
);
const ProExplorePage = lazy(() => import('./pages/pro/ProExplorePage'));

const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const AdminPropertyReview = lazy(() => import('./pages/admin/AdminPropertyReview'));
const LandReviewWorkspace = lazy(() => import('./pages/admin/LandReviewWorkspace'));
const SharedLivingReviewWorkspace = lazy(() => import('./pages/admin/SharedLivingReviewWorkspace'));
const PlotsAndLand = lazy(() => import('./pages/PlotsAndLand'));
const FarmsAndSmallholdings = lazy(() => import('./pages/FarmsAndSmallholdings'));
const LandDetail = lazy(() => import('./pages/LandDetail'));
const CommercialOffice = lazy(() => import('./pages/CommercialOffice'));
const SharedLiving = lazy(() => import('./pages/SharedLiving'));
const SharedLivingDetail = lazy(() => import('./pages/SharedLivingDetail'));
const SharedLivingThread = lazy(() => import('./pages/SharedLivingThread'));
const SharedLivingLister = lazy(() => import('./pages/SharedLivingLister'));
const CommercialOfficeDetail = lazy(() => import('./pages/CommercialOfficeDetail'));
const CommercialOfficeAuthoringWorkspace = lazy(
  () => import('./pages/agent/CommercialOfficeAuthoringWorkspace'),
);
const CommercialInventory = lazy(() => import('./pages/agent/CommercialInventory'));

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
const DevelopmentUnitDetailPage = lazy(() => import('./pages/DevelopmentUnitDetailPage'));
const DevelopmentQualificationPage = lazy(() => import('./pages/DevelopmentQualificationPage'));
const AgencyOnboarding = lazy(() => import('./pages/AgencyOnboarding'));
const DeveloperSetupWizardEnhanced = lazy(
  () => import('./components/developer/DeveloperSetupWizardEnhanced'),
);

// Import Developer Dashboard Pages
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
// Import Developer Layout directly for specific tab routing
const DeveloperRouteBoundary = lazy(() =>
  import('./pages/DeveloperRoutes').then(module => ({
    default: module.DeveloperRouteBoundary,
  })),
);
// Import MyDrafts removed to prevent circular dependency with DeveloperLayout's lazy load
const DeveloperDirectoryPage = lazy(() => import('./pages/DeveloperDirectoryPage'));
const DeveloperPublisherPage = lazy(() => import('./pages/DeveloperPublisherPage'));

// Import Comparison Page
const CompareProperties = lazy(() => import('./pages/CompareProperties'));
const AdvertiseWithUs = lazy(() => import('./pages/AdvertiseWithUs'));
const AdvertiseSellPage = lazy(() => import('./pages/advertise/AdvertiseSellPage'));
const AdvertiseFinancePage = lazy(() => import('./pages/advertise/AdvertiseFinancePage'));
const AdvertiseServicesPage = lazy(() => import('./pages/advertise/AdvertiseServicesPage'));
const AgentFunnelPage = lazy(() => import('./pages/advertise/AgentFunnelPage'));
const DeveloperFunnelPage = lazy(() => import('./pages/advertise/DeveloperFunnelPage'));
const BankFunnelPage = lazy(() => import('./pages/advertise/BankFunnelPage'));
const OriginatorFunnelPage = lazy(() => import('./pages/advertise/OriginatorFunnelPage'));
const AgencyProductLandingPage = lazy(() => import('./pages/advertise/AgencyProductLandingPage'));
const ActivationGate = lazy(() => import('./pages/dashboard/ActivationGate'));
const BookStrategy = lazy(() => import('./pages/BookStrategy'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));
const DistributionManagerDashboard = lazy(
  () => import('./pages/distribution/DistributionManagerDashboard'),
);
const ManagerDevelopmentOpsPage = lazy(
  () => import('./pages/distribution/ManagerDevelopmentOpsPage'),
);
const ManagerDevelopmentDealsPage = lazy(
  () => import('./pages/distribution/ManagerDevelopmentDealsPage'),
);
const ManagerDealChecklistPage = lazy(
  () => import('./pages/distribution/ManagerDealChecklistPage'),
);
const PartnerDashboardPage = lazy(() => import('./pages/distribution/PartnerDashboardPage'));
const PartnerSubmitReferralPage = lazy(
  () => import('./pages/distribution/PartnerSubmitReferralPage'),
);
const PartnerMyReferralsPage = lazy(() => import('./pages/distribution/PartnerMyReferralsPage'));
const PartnerReferralDetailPage = lazy(
  () => import('./pages/distribution/PartnerReferralDetailPage'),
);
const PartnerCommissionsPage = lazy(() => import('./pages/distribution/PartnerCommissionsPage'));
const PartnerReferralAcceleratorPage = lazy(
  () => import('./pages/distribution/PartnerReferralAcceleratorPage'),
);
const PartnerDevelopmentsPage = lazy(() => import('./pages/distribution/PartnerDevelopmentsPage'));
const ManagerInviteOnboardingPage = lazy(
  () => import('./pages/distribution/ManagerInviteOnboardingPage'),
);
const DistributionNetworkPublicPage = lazy(
  () => import('./pages/distribution/DistributionNetworkPublicPage'),
);
const DistributionReferralApplyPage = lazy(
  () => import('./pages/distribution/DistributionReferralApplyPage'),
);

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
      <nav aria-label="Skip navigation">
        <SkipToContent targetId="main-content" />
      </nav>
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
          {/* 1. EXPLICIT PRODUCT AND DETAIL ROUTES                          */}
          {/* ============================================================== */}

          {/* ============================================================== */}
          {/* 1A. DEVELOPER DASHBOARD ROUTES                                */}
          {/* All /developer/* routes are handled by DeveloperRoutes         */}
          {/* ============================================================== */}

          <Route path="/developer/setup">
            <RequireRole role="property_developer">
              <DeveloperSetupWizardEnhanced />
            </RequireRole>
          </Route>
          <Route path="/developer/success">
            <Redirect to="/developer/dashboard?setup=complete" />
          </Route>

          {/* Resolve public brand slugs before entering the authenticated developer workspace. */}
          <Route path="/developer/developments/:developmentId" component={DeveloperRouteBoundary} />
          <Route path="/developer/:rest*" component={DeveloperRouteBoundary} />

          {/* Developer Brand Directory (public) */}
          <Route path="/developers" component={DeveloperDirectoryPage} />
          {/* Governed public publisher projection - MUST be after all /developer/* routes */}
          <Route path="/developer/:slug" component={DeveloperPublisherPage} />

          {/* ============================================================== */}
          {/* 1B. PUBLIC AND LEGACY PRODUCT ROUTES                           */}
          {/* ============================================================== */}

          {/* IMPORTANT: Admin Review must be BEFORE legacy wildcards */}
          {/* Otherwise /:action/:province/:locationId matches /admin/review/360002 */}
          <Route path="/admin/review/:id" component={AdminPropertyReview} />
          <Route path="/admin/land-review">
            <RequireRole role="super_admin">
              <LandReviewWorkspace />
            </RequireRole>
          </Route>
          <Route path="/admin/shared-living-review">
            <RequireRole role="super_admin">
              <SharedLivingReviewWorkspace />
            </RequireRole>
          </Route>

          {/* Compatibility edge: preserve inbound query state, then hand off
              immediately to the canonical Buy transaction root. */}
          <Route
            path="/properties"
            component={() => {
              window.location.replace(buildPropertiesCompatibilityRedirect(window.location.search));
              return null;
            }}
          />
          <Route path="/property/:id" component={PropertyDetail} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/agents" component={Agents} />
          <Route path="/agent/dashboard">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentDashboard />
            </RequireRole>
          </Route>
          <Route path="/agent/listings">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentListings />
            </RequireRole>
          </Route>
          <Route path="/agent/land/create">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <LandAuthoringWorkspace />
            </RequireRole>
          </Route>
          <Route path="/agent/commercial/create">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <CommercialOfficeAuthoringWorkspace />
            </RequireRole>
          </Route>
          <Route path="/agent/commercial">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <CommercialInventory />
            </RequireRole>
          </Route>
          <Route path="/agent/commercial/office/create">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <CommercialOfficeAuthoringWorkspace />
            </RequireRole>
          </Route>
          <Route path="/agency/commercial/create">
            <RequireRole role="agency_admin">
              <CommercialOfficeAuthoringWorkspace />
            </RequireRole>
          </Route>
          <Route path="/agency/commercial">
            <RequireRole role="agency_admin">
              <CommercialInventory />
            </RequireRole>
          </Route>
          <Route path="/agent/leads">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentLeads />
            </RequireRole>
          </Route>
          <Route path="/agent/canvassing">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentCanvassing />
            </RequireRole>
          </Route>
          <Route path="/agent/marketing">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentMarketingHub />
            </RequireRole>
          </Route>
          <Route path="/agent/earnings">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentEarnings />
            </RequireRole>
          </Route>
          <Route path="/agent/analytics">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentAnalytics />
            </RequireRole>
          </Route>
          <Route path="/agent/calendar">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <Redirect to="/agent/productivity" />
            </RequireRole>
          </Route>
          <Route path="/agent/productivity">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentProductivity />
            </RequireRole>
          </Route>
          <Route path="/agent/training-support">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentTrainingSupport />
            </RequireRole>
          </Route>
          <Route path="/agent/settings">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentSettings />
            </RequireRole>
          </Route>
          <Route path="/agent/select-package">
            {/* Conversion entry: prospects without an account land on the
                register tab with the agent role preselected; returning agents
                switch to sign-in on the same surface. */}
            <RequireRole role="agent" unauthenticatedAuthEntry="register">
              <AgentPackageSelection />
            </RequireRole>
          </Route>
          <Route path="/agent/setup">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentSetup />
            </RequireRole>
          </Route>
          <Route path="/onboarding/agent-profile">
            <RequireRole role="agent">
              <AgentSetup />
            </RequireRole>
          </Route>
          <Route path="/agent/referrals">
            <RequireRole role="agent" unauthenticatedAuthEntry="signin">
              <AgentReferrals />
            </RequireRole>
          </Route>
          <Route path="/agents/:slug" component={AgentMicrosite} />
          <Route path="/a/:slug" component={AgentMicrosite} />
          <Route path="/agent/profile/:agentId" component={AgentPublicProfile} />
          <Route path="/agent/:id" component={AgentPublicProfile} />

          {/* Route Handlers / Wizards */}
          <Route path="/listings/create">
            <RequireRole role={['agent', 'agency_admin']} unauthenticatedAuthEntry="register">
              <ListingWizard />
            </RequireRole>
          </Route>
          <Route path="/listing-template" component={ListingTemplate} />
          <Route path="/developments/create" component={CreateDevelopment} />
          <Route path="/development-wizard" component={CreateDevelopment} />

          {/* Canonical Developments Root */}
          <Route path="/new-developments" component={DevelopmentsDemo} />
          <Route path="/commercial" component={CommercialOffice} />
          <Route path="/shared-living" component={SharedLiving} />
          <Route path="/shared-living/list">
            <RequireRole role={['visitor', 'agent']} unauthenticatedAuthEntry="register">
              <SharedLivingLister />
            </RequireRole>
          </Route>
          <Route path="/shared-living/thread/:token" component={SharedLivingThread} />
          <Route path="/shared-living/:slug" component={SharedLivingDetail} />
          <Route path="/commercial/:slug" component={CommercialOfficeDetail} />
          {/* Redirect Legacy /developments to /new-developments */}
          <Route
            path="/developments"
            component={() => {
              window.location.replace(`/new-developments${window.location.search}`);
              return null;
            }}
          />
          <Route path="/development/:slug/unit/:unitId" component={DevelopmentUnitDetailPage} />
          <Route path="/development/:slug/qualification" component={DevelopmentQualificationPage} />
          <Route path="/development/:slug" component={DevelopmentDetail} />

          {/* NOTE: Developer routes moved to section 2A above legacy wildcards */}

          <Route path="/agency/setup">
            <RequireRole
              role="agency_admin"
              unauthenticatedAuthEntry="register"
              roleMismatchFallback={AGENCY_SETUP_ROLE_MISMATCH_FALLBACK}
            >
              <AgencyOnboarding />
            </RequireRole>
          </Route>
          <Route path="/agency/success" component={() => <RegistrationSuccess role="agency" />} />
          <Route path="/agent/success" component={() => <RegistrationSuccess role="agent" />} />

          {/* Explore routes */}
          <Route path="/explore/home">
            <Redirect to="/explore" />
          </Route>
          <Route path="/explore/shorts" component={ExploreShorts} />

          {/* New Explore Pages */}
          <Route path="/explore/discovery">
            <Redirect to="/explore/feed" />
          </Route>
          <Route path="/explore/map" component={ExploreMap} />

          {/* Legacy Feed */}
          <Route path="/explore/feed" component={ExploreFeed} />
          <Route path="/explore/@:handle/:slug">
            <Redirect to="/explore/feed" />
          </Route>

          {/* Explore Entry Rule (MUST be after the specific routes) */}
          <Route path="/explore">
            <ExploreHome />
          </Route>

          <Route path="/referrer/dashboard">
            <Redirect to="/distribution/partner/overview" />
          </Route>
          <Route path="/service/dashboard">
            <RequireRole role="service_provider">
              <ProDashboardPage />
            </RequireRole>
          </Route>
          <Route path="/service/profile">
            <RequireRole role="service_provider">
              <ProviderOnboardingWizard />
            </RequireRole>
          </Route>
          <Route path="/service/explore">
            <RequireRole role="service_provider">
              <ProExplorePage />
            </RequireRole>
          </Route>
          <Route path="/service">
            <Redirect to="/service/dashboard" />
          </Route>
          <Route path="/pro/dashboard">
            <Redirect to="/service/dashboard" />
          </Route>
          <Route path="/pro/profile">
            <Redirect to="/service/profile" />
          </Route>
          <Route path="/pro/explore">
            <Redirect to="/service/explore" />
          </Route>

          {/* Services marketplace routes */}
          <Route path="/services/request/:category" component={ServicesRequestPage} />
          <Route path="/services/results/:leadId" component={ServicesResultsPage} />
          <Route path="/services/provider/:slug" component={ServiceProviderProfilePage} />
          <Route path="/services/reviews/:providerId" component={ServiceProviderReviewsPage} />
          <Route
            path="/services/:category/:city/:province"
            component={ServicesLocalizedCategoryPage}
          />
          <Route path="/services/:category" component={ServicesCategoryPage} />
          <Route path="/services" component={ServicesHomePage} />

          {/* Thin SEO landing pages for non-listing engines */}
          <Route path="/insights/:slug" component={NavLandingPage} />
          <Route path="/guides/:slug" component={NavLandingPage} />
          <Route path="/tools/:slug" component={NavLandingPage} />
          <Route path="/legal/:slug" component={NavLandingPage} />
          <Route path="/support/:slug" component={NavLandingPage} />
          <Route path="/company/:slug" component={NavLandingPage} />
          <Route path="/about" component={NavLandingPage} />
          <Route path="/contact" component={NavLandingPage} />
          <Route path="/careers" component={NavLandingPage} />
          <Route path="/press" component={NavLandingPage} />
          <Route path="/partners" component={NavLandingPage} />
          <Route path="/help" component={NavLandingPage} />
          <Route path="/safety" component={NavLandingPage} />
          <Route path="/faq" component={NavLandingPage} />
          <Route path="/terms" component={NavLandingPage} />
          <Route path="/privacy" component={NavLandingPage} />
          <Route path="/cookies" component={NavLandingPage} />
          <Route path="/compliance" component={NavLandingPage} />
          <Route path="/agencies" component={NavLandingPage} />

          <Route path="/compare" component={CompareProperties} />

          {/* Auth */}
          <Route path="/login" component={Login} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/set-password" component={SetPassword} />
          <Route path="/activation-complete" component={ActivationComplete} />
          <Route path="/saved-search/manage" component={SavedSearchManagePage} />
          <Route path="/accept-invitation" component={AcceptInvitation} />
          <Route path="/referral-upload/:token">
            <Redirect to="/distribution-network/apply" />
          </Route>
          <Route path="/get-started/referral">
            <Redirect to="/distribution-network/apply" />
          </Route>
          <Route path="/get-started/referrer">
            <Redirect to="/distribution-network/apply" />
          </Route>
          <Route path="/get-started/:role/confirmation">
            <Redirect to="/advertise/sell/agents" />
          </Route>
          <Route path="/get-started/:role">
            <Redirect to="/advertise/sell/agents" />
          </Route>
          <Route path="/get-started">
            <Redirect to="/advertise/sell/agents" />
          </Route>
          <Route path="/book-strategy" component={BookStrategy} />
          <Route path="/role-selection" component={RoleSelection} />
          <Route path="/advertise/sell/agents/onboarding">
            <Redirect to="/role-selection" />
          </Route>
          <Route path="/advertise/sell/agents" component={AgentFunnelPage} />
          <Route path="/advertise/sell/agencies" component={AgencyProductLandingPage} />
          <Route path="/advertise/sell/developers" component={DeveloperFunnelPage} />
          <Route path="/advertise/sell" component={AdvertiseSellPage} />
          <Route path="/advertise/finance/banks" component={BankFunnelPage} />
          <Route path="/advertise/finance/originators" component={OriginatorFunnelPage} />
          <Route path="/advertise/finance" component={AdvertiseFinancePage} />
          <Route path="/advertise/services" component={AdvertiseServicesPage} />
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
          {ADMIN_DASHBOARD_ROUTES.map(route => (
            <Route
              key={route.path}
              path={route.path}
              component={() => <SuperAdminDashboard>{route.render()}</SuperAdminDashboard>}
            />
          ))}

          {/* Keep the legacy account URL as a role-aware handoff. The old
              generic property dashboard made agents, agencies and buyers
              share a surface with incompatible actions. */}
          <Route path="/dashboard" component={SmartDashboardRedirect} />
          <Route path="/dashboard/settings">
            <Redirect to="/agent/settings" />
          </Route>

          <Route path="/activation">
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              <ActivationGate />
            </Suspense>
          </Route>

          <Route path="/agency">
            <Redirect to="/agency/overview" />
          </Route>
          <Route path="/agency/dashboard">
            <Redirect to="/agency/overview" />
          </Route>
          <Route path="/distribution/manager">
            <Redirect to="/distribution/manager/developments" />
          </Route>
          <Route path="/distribution/manager/legacy" component={DistributionManagerDashboard} />
          <Route path="/distribution/manager/developments" component={ManagerDevelopmentOpsPage} />
          <Route
            path="/distribution/manager/developments/:developmentId"
            component={ManagerDevelopmentDealsPage}
          />
          <Route path="/distribution/manager/deals/:dealId" component={ManagerDealChecklistPage} />
          <Route path="/distribution/manager/onboarding" component={ManagerInviteOnboardingPage} />
          <Route path="/distribution/partner">
            <Redirect to="/distribution/partner/overview" />
          </Route>
          <Route path="/distribution/partner/overview" component={PartnerDashboardPage} />
          <Route path="/distribution/partner/developments" component={PartnerDevelopmentsPage} />
          <Route
            path="/distribution/partner/accelerator"
            component={PartnerReferralAcceleratorPage}
          />
          <Route path="/partner/referrals/accelerator" component={PartnerReferralAcceleratorPage} />
          <Route path="/distribution/partner/submit" component={PartnerSubmitReferralPage} />
          <Route path="/distribution/partner/referrals" component={PartnerMyReferralsPage} />
          <Route path="/distribution/partner/commissions" component={PartnerCommissionsPage} />
          <Route
            path="/distribution/partner/referrals/:dealId"
            component={PartnerReferralDetailPage}
          />
          <Route path="/distribution-network/apply" component={DistributionReferralApplyPage} />
          <Route path="/distribution-network/login">
            <Redirect to="/login?next=/distribution/partner/developments" />
          </Route>
          <Route path="/distribution-network" component={DistributionNetworkPublicPage} />
          <Route path="/referral/apply">
            <Redirect to="/distribution-network/apply" />
          </Route>
          <Route path="/agency/subscription">
            <Redirect to="/agency/billing" />
          </Route>
          <Route path="/agency/onboarding">
            <Redirect to="/agency/setup" />
          </Route>
          <Route path="/agency/onboarding/success" component={OnboardingSuccess} />
          <Route path="/agency/invite">
            <Redirect to="/agency/team/invitations" />
          </Route>
          <Route path="/agency/agents">
            <Redirect to="/agency/team" />
          </Route>

          {/* NOTE: Developer routes are defined in section 1A above */}

          {/* User Dashboard Route */}
          <Route path="/user/dashboard">
            <RequireRole role="visitor">
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

          {/* ============================================================== */}
          {/* 2. TRANSACTION ROOTS (Query-Based SRP)                         */}
          {/* Geography remains canonical query state on these roots.        */}
          {/* ============================================================== */}
          <Route
            path="/property-for-sale"
            component={() => {
              const params = new URLSearchParams(window.location.search);
              if (params.get('propertyType') === 'plot') {
                params.delete('propertyType');
                window.location.replace(`/plots-and-land${params.toString() ? `?${params}` : ''}`);
                return null;
              }
              return <SearchResults />;
            }}
          />
          <Route path="/plots-and-land" component={PlotsAndLand} />
          <Route path="/land/:slug" component={LandDetail} />
          <Route path="/property-to-rent" component={SearchResults} />
          <Route path="/farms-and-smallholdings" component={FarmsAndSmallholdings} />

          <Route path={'/404'} component={NotFound} />

          {/* ============================================================== */}
          {/* 3. VALIDATED NEUTRAL GEOGRAPHY AUTHORITY                       */}
          {/* Static/product/detail routes and transaction roots are above.  */}
          {/* ============================================================== */}
          <Route path="/:province/:city/:suburb">
            {params =>
              isCanonicalProvinceSlug(params.province) ? (
                <SuburbPage params={params as any} />
              ) : (
                <NotFound />
              )
            }
          </Route>
          <Route path="/:province/:city">
            {params =>
              isCanonicalProvinceSlug(params.province) ? (
                <CityPage params={params as any} />
              ) : (
                <NotFound />
              )
            }
          </Route>
          <Route path="/:province">
            {params =>
              isCanonicalProvinceSlug(params.province) ? (
                <ProvincePage params={params as any} />
              ) : (
                <NotFound />
              )
            }
          </Route>

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
              </TooltipProvider>
            </ComparisonProvider>
          </GuestActivityProvider>
        </ThemeProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

export default App;

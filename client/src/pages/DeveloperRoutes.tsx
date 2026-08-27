import { Route, Switch, Redirect, Link } from 'wouter';
import { useMemo } from 'react';
import { DeveloperLayout } from '@/components/developer/DeveloperLayout';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { useDeveloperOnboardingStatus } from '@/hooks/useDeveloperOnboardingStatus';
import { getAccountAuthHref } from '@/lib/publicNavigation';

// Import content components
import Overview from '@/components/developer/Overview';
import DevelopmentsList from '@/components/developer/DevelopmentsList';
import MessagesCenter from '@/components/developer/MessagesCenter';
import LeadsManager from '@/components/developer/LeadsManager';
import SettingsPanel from '@/components/developer/SettingsPanel';
import TeamManagement from '@/components/developer/TeamManagement';
import AnalyticsPanel from '@/components/developer/AnalyticsPanel';
import BillingPanel from '@/components/developer/BillingPanel';
import CreateDevelopment from '@/pages/CreateDevelopment';
import DeveloperPerformancePage from '@/pages/DeveloperPerformancePage';
import DeveloperPlans from '@/pages/DeveloperPlans';
import DeveloperPublisherPage from '@/pages/DeveloperPublisherPage';
import DevelopmentHome from '@/pages/developer/DevelopmentHome';
import { isPublicDeveloperProfilePath } from '@/lib/developerRouteBoundary';

// Lazy load drafts page if needed, or import directly
import { lazy, Suspense } from 'react';
const MyDrafts = lazy(() => import('@/pages/developer/MyDrafts'));

const getRoleHomePath = (role?: string | null) => {
  switch (role) {
    case 'super_admin':
      return '/admin/overview';
    case 'agency_admin':
      return '/agency/dashboard';
    case 'agent':
      return '/agent/dashboard';
    case 'service_provider':
      return '/service/dashboard';
    case 'visitor':
      return '/user/dashboard';
    default:
      return '/login';
  }
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

/**
 * Keeps `/developer/<brand-slug>` public while reserving known workspace paths
 * for the authenticated developer operating system.
 */
export function DeveloperRouteBoundary() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (isPublicDeveloperProfilePath(pathname)) {
    return <DeveloperPublisherPage />;
  }

  return <DeveloperRoutes />;
}

export default function DeveloperRoutes() {
  // Commercial entry routes keep the prospect's intent through registration;
  // every other deep link returns to its original destination after sign-in.
  const authRedirectPath = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const currentPath = `${window.location.pathname}${window.location.search || ''}`;
    const isCommercialEntry =
      currentPath.startsWith('/developer/plans') ||
      currentPath.startsWith('/developer/subscription');
    return isCommercialEntry
      ? getAccountAuthHref('register', currentPath, { registerRole: 'property_developer' })
      : getAccountAuthHref('signin', currentPath);
  }, []);
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: authRedirectPath,
  });
  const { context: publisherContext } = usePublisherContext();
  const {
    status,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useDeveloperOnboardingStatus();
  const isSuperAdmin = user?.role === 'super_admin';
  const isDeveloper = user?.role === 'property_developer';
  const hasPublisherContext = !!publisherContext?.cataloguePublisherId;
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/developer/dashboard';

  if (authLoading || (isDeveloper && statusLoading)) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Preparing your developer workspace...</p>
        </div>
      </div>
    );
  }

  if (user && !isDeveloper && !isSuperAdmin) {
    return <Redirect to={getRoleHomePath(user.role)} />;
  }

  if (isSuperAdmin && !hasPublisherContext) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-100 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Select a brand to continue</h1>
          <p className="text-slate-600 mb-6">
            You need to choose a brand context before accessing the developer dashboard.
          </p>
          <Link href="/admin/publisher">
            <a className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition-colors">
              Go to Brand Selector
            </a>
          </Link>
        </div>
      </div>
    );
  }

  if (isDeveloper && statusError) {
    // A failed onboarding-status query is an infrastructure problem, not proof
    // that the developer has no organisation. Never bounce an established
    // developer into setup because of a transient API failure.
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-100 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Unable to verify your developer account state
          </h1>
          <p className="text-slate-600 mb-6">
            We could not load your onboarding status. Your organisation and its information are
            safe. Please retry in a moment.
          </p>
          <button
            type="button"
            onClick={() => refetchStatus()}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isDeveloper && (!status?.hasProfile || status.profileRejected)) {
    return <Redirect to="/developer/setup" />;
  }

  if (
    isDeveloper &&
    status?.profileStatus === 'pending' &&
    pathname !== '/developer' &&
    pathname !== '/developer/dashboard'
  ) {
    return <Redirect to="/developer/dashboard" />;
  }

  return (
    <DeveloperLayout>
      <Switch>
        {/* Main */}
        <Route path="/developer" component={Overview} />
        <Route path="/developer/dashboard" component={Overview} />

        {/* Developments */}
        <Route path="/developer/developments/new">
          <Redirect to="/developer/create-development" />
        </Route>
        <Route path="/developer/developments/:developmentId" component={DevelopmentHome} />
        <Route path="/developer/developments" component={DevelopmentsList} />
        <Route path="/developer/create-development" component={CreateDevelopment} />

        {/* Drafts */}
        <Route path="/developer/drafts">
          <Suspense fallback={<LoadingSpinner />}>
            <MyDrafts />
          </Suspense>
        </Route>

        {/* Operations */}
        <Route path="/developer/leads" component={LeadsManager} />
        <Route path="/developer/messages" component={MessagesCenter} />

        {/* Growth */}
        <Route path="/developer/analytics" component={AnalyticsPanel} />
        <Route path="/developer/performance" component={DeveloperPerformancePage} />

        {/* Settings */}
        <Route path="/developer/settings" component={SettingsPanel} />
        <Route path="/developer/settings/team" component={TeamManagement} />
        <Route path="/developer/subscription" component={BillingPanel} />
        <Route path="/developer/settings/subscription" component={BillingPanel} />
        <Route path="/developer/plans" component={DeveloperPlans} />

        {/* Default fallback */}
        <Route>
          <Redirect to="/developer/dashboard" />
        </Route>
      </Switch>
    </DeveloperLayout>
  );
}

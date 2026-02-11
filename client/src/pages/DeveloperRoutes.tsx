import { Route, Switch, Redirect, Link } from 'wouter';
import { DeveloperLayout } from '@/components/developer/DeveloperLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePublisherContext } from '@/hooks/usePublisherContext';

// Import content components
import Overview from '@/components/developer/Overview';
import DevelopmentsList from '@/components/developer/DevelopmentsList';
import MessagesCenter from '@/components/developer/MessagesCenter';
import LeadsManager from '@/components/developer/LeadsManager';
import SettingsPanel from '@/components/developer/SettingsPanel';
import TeamManagement from '@/components/developer/TeamManagement';
import AnalyticsPanel from '@/components/developer/AnalyticsPanel';
import MarketingCampaigns from '@/components/developer/MarketingCampaigns';
import BillingPanel from '@/components/developer/BillingPanel';
import CreateDevelopment from '@/pages/CreateDevelopment';
import DeveloperCampaignsPage from '@/pages/DeveloperCampaignsPage';
import DeveloperPerformancePage from '@/pages/DeveloperPerformancePage';
import DeveloperPlans from '@/pages/DeveloperPlans';

// Placeholder components for missing pages
function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-500">This module is coming soon!</p>
    </div>
  );
}

// Lazy load drafts page if needed, or import directly
import { lazy, Suspense } from 'react';
const MyDrafts = lazy(() => import('@/pages/developer/MyDrafts'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function DeveloperRoutes() {
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const hasPublisherContext = !!publisherContext?.brandProfileId;

  if (isSuperAdmin && !hasPublisherContext) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-100 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Select a brand to continue
          </h1>
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

  return (
    <DeveloperLayout>
      <Switch>
        {/* Main */}
        <Route path="/developer" component={Overview} />
        <Route path="/developer/dashboard" component={Overview} />

        {/* Developments */}
        <Route path="/developer/developments" component={DevelopmentsList} />
        <Route path="/developer/developments/new">
          <Redirect to="/developer/create-development" />
        </Route>
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
        <Route path="/developer/tasks" component={() => <PlaceholderContent title="Tasks" />} />
        <Route path="/developer/reports" component={() => <PlaceholderContent title="Reports" />} />

        {/* Growth */}
        <Route path="/developer/analytics" component={AnalyticsPanel} />
        <Route
          path="/developer/explore"
          component={() => <PlaceholderContent title="Explore Analytics" />}
        />
        <Route path="/developer/campaigns" component={MarketingCampaigns} />
        <Route path="/developer/campaigns/new" component={DeveloperCampaignsPage} />
        <Route path="/developer/performance" component={DeveloperPerformancePage} />

        {/* Settings */}
        <Route path="/developer/settings" component={SettingsPanel} />
        <Route path="/developer/settings/team" component={TeamManagement} />
        <Route path="/developer/subscription" component={BillingPanel} />
        <Route path="/developer/settings/subscription" component={BillingPanel} />
        <Route path="/developer/plans" component={DeveloperPlans} />
        <Route
          path="/developer/notifications"
          component={() => <PlaceholderContent title="Notifications" />}
        />

        {/* Default fallback */}
        <Route>
          <Redirect to="/developer/dashboard" />
        </Route>
      </Switch>
    </DeveloperLayout>
  );
}

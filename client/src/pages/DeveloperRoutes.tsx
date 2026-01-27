import { Route, Switch, Redirect } from 'wouter';
import { DeveloperLayout } from '@/components/developer/DeveloperLayout';

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
        <Route path="/developer/explore" component={() => <PlaceholderContent title="Explore Analytics" />} />
        <Route path="/developer/campaigns" component={MarketingCampaigns} />
        <Route path="/developer/campaigns/new" component={DeveloperCampaignsPage} />
        <Route path="/developer/performance" component={DeveloperPerformancePage} />

        {/* Settings */}
        <Route path="/developer/settings" component={SettingsPanel} />
        <Route path="/developer/settings/team" component={TeamManagement} />
        <Route path="/developer/subscription" component={BillingPanel} />
        <Route path="/developer/settings/subscription" component={BillingPanel} />
        <Route path="/developer/plans" component={DeveloperPlans} />
        <Route path="/developer/notifications" component={() => <PlaceholderContent title="Notifications" />} />

        {/* Default fallback */}
        <Route>
          <Redirect to="/developer/dashboard" />
        </Route>
      </Switch>
    </DeveloperLayout>
  );
}

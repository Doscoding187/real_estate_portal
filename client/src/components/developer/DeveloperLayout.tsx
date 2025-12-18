import { useState, ReactNode, lazy, Suspense } from 'react';
import { EnhancedSidebar } from './EnhancedSidebar';
import { DeveloperTopNav } from './DeveloperTopNav';

// Import content components
import Overview from './Overview';
import DevelopmentsList from './DevelopmentsList';
import MessagesCenter from './MessagesCenter';
import LeadsManager from './LeadsManager';
import SettingsPanel from './SettingsPanel';
import TeamManagement from './TeamManagement';
import AnalyticsPanel from './AnalyticsPanel';
import MarketingCampaigns from './MarketingCampaigns';

// Lazy load drafts page
const MyDrafts = lazy(() => import('@/pages/developer/MyDrafts'));

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Placeholder for modules not yet implemented
function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-500">This module is coming soon!</p>
    </div>
  );
}

export type TabId = 
  | 'overview' 
  | 'developments' 
  | 'drafts' 
  | 'leads'
  | 'messages'
  | 'tasks'
  | 'reports'
  | 'analytics'
  | 'explore'
  | 'campaigns'
  | 'performance'
  | 'team'
  | 'subscription'
  | 'settings'
  | 'notifications';

interface DeveloperLayoutProps {
  children?: ReactNode;
  defaultTab?: TabId;
}

export function DeveloperLayout({ children, defaultTab = 'overview' }: DeveloperLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Render content based on active tab
  const renderContent = () => {
    // If children provided, use them (for backward compatibility)
    if (children) {
      return children;
    }

    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'developments':
        return <DevelopmentsList />;
      case 'drafts':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MyDrafts />
          </Suspense>
        );
      case 'leads':
        return <LeadsManager />;
      case 'messages':
        return <MessagesCenter />;
      case 'tasks':
        return <PlaceholderContent title="Tasks" />;
      case 'reports':
        return <PlaceholderContent title="Reports" />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'explore':
        return <PlaceholderContent title="Explore Analytics" />;
      case 'campaigns':
        return <MarketingCampaigns />;
      case 'performance':
        return <PlaceholderContent title="Performance" />;
      case 'team':
        return <TeamManagement />;
      case 'subscription':
        return <PlaceholderContent title="Subscription" />;
      case 'settings':
        return <SettingsPanel />;
      case 'notifications':
        return <PlaceholderContent title="Notifications" />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F4F7FA] overflow-hidden">
      <EnhancedSidebar 
        activeTab={activeTab} 
        onTabChange={(tabId) => setActiveTab(tabId as TabId)} 
      />
      <div className="flex flex-col flex-1 min-w-0">
        <DeveloperTopNav />
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

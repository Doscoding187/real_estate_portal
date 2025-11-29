import React, { useState } from 'react';
import DeveloperSidebar, { DeveloperSection } from '../components/developer/DeveloperSidebar';
import DevelopmentsList from '../components/developer/DevelopmentsList';
import AnalyticsPanel from '../components/developer/AnalyticsPanel';
import MessagesCenter from '../components/developer/MessagesCenter';
import SettingsPanel from '../components/developer/SettingsPanel';
import MarketingTools from '../components/developer/MarketingTools';
import Overview from '../components/developer/Overview';
import { SidebarProvider } from '@/components/ui/sidebar';

const PropertyDeveloperDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DeveloperSection>('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Overview />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'messages':
        return <MessagesCenter />;
      case 'settings':
        return <SettingsPanel />;
      case 'marketing':
        return <MarketingTools />;
      default:
        return <DevelopmentsList />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 overflow-hidden">
        <DeveloperSidebar active={activeSection} onChange={setActiveSection} />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 z-10 flex-shrink-0">
            <div className="flex items-center justify-between p-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Property Developer Dashboard
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                  Manage your developments and track performance
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 ring-2 ring-white"></span>
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
                    SD
                  </div>
                  <div className="hidden md:block">
                    <p className="font-semibold text-slate-800 text-sm">Skyline Developments</p>
                    <p className="text-xs text-slate-500">Premium Account</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PropertyDeveloperDashboard;

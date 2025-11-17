import React, { useState } from 'react';
import DeveloperSidebar, { DeveloperSection } from '../components/developer/DeveloperSidebar';
import DevelopmentsList from '../components/developer/DevelopmentsList';
import AnalyticsPanel from '../components/developer/AnalyticsPanel';
import MessagesCenter from '../components/developer/MessagesCenter';
import SettingsPanel from '../components/developer/SettingsPanel';
import MarketingTools from '../components/developer/MarketingTools';

const PropertyDeveloperDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DeveloperSection>('developments');

  const renderContent = () => {
    switch (activeSection) {
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
    <div className="flex h-screen bg-gray-50">
      <DeveloperSidebar active={activeSection} onChange={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="typ-h1">Property Developer Dashboard</h1>
              <p className="text-gray-500 text-sm">
                Manage your developments and track performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  SD
                </div>
                <span className="ml-2 font-medium">Skyline Developments</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
};

export default PropertyDeveloperDashboard;

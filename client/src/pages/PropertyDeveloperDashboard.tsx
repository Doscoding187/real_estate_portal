import React from 'react';
import Overview from '../components/developer/Overview';
import { EnhancedSidebar } from '../components/developer/EnhancedSidebar';
import { DeveloperTopNav } from '../components/developer/DeveloperTopNav';
import { trpc } from '@/lib/trpc';

const PropertyDeveloperDashboard: React.FC = () => {
  // Fetch developer profile for name
  const { data: developerProfile } = trpc.developer.getProfile.useQuery();

  return (
    <div className="flex h-screen w-screen bg-[#F4F7FA] overflow-hidden">
      <EnhancedSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Navigation */}
        <DeveloperTopNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Overview />
        </main>
      </div>
    </div>
  );
};

export default PropertyDeveloperDashboard;

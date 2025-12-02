import React from 'react';
import Overview from '../components/developer/Overview';
import { DeveloperLayout } from '../components/developer/DeveloperLayout';
import { trpc } from '@/lib/trpc';

const PropertyDeveloperDashboard: React.FC = () => {
  // Fetch developer profile for name
  const { data: developerProfile } = trpc.developer.getProfile.useQuery();

  return (
    <DeveloperLayout>
      <Overview />
    </DeveloperLayout>
  );
};

export default PropertyDeveloperDashboard;

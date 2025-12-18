import React from 'react';
import { DeveloperLayout } from '../components/developer/DeveloperLayout';

/**
 * Property Developer Dashboard
 * Uses tab-based navigation within DeveloperLayout
 * No children needed - DeveloperLayout manages content rendering
 */
const PropertyDeveloperDashboard: React.FC = () => {
  return (
    <DeveloperLayout defaultTab="overview" />
  );
};

export default PropertyDeveloperDashboard;

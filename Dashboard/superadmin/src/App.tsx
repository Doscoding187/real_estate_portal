import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/dashboard/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import AgenciesPage from './pages/AgenciesPage';
import AgentsPage from './pages/AgentsPage';
import PropertyListingsPage from './pages/PropertyListingsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import FinancialsPage from './pages/FinancialsPage';
import ContentManagerPage from './pages/ContentManagerPage';
import CommunicationsPage from './pages/CommunicationsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import SystemSecurityPage from './pages/SystemSecurityPage';
import RevenueCenterPage from './pages/RevenueCenterPage';
import AnalyticsReportsPage from './pages/AnalyticsReportsPage';
import MarketingCampaignsPage from './pages/MarketingCampaignsPage';
import PartnerNetworkPage from './pages/PartnerNetworkPage';
import DevelopersPage from './pages/DevelopersPage';
import FeaturedPlacementsPage from './pages/FeaturedPlacementsPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<DashboardLayout />}>
        <Route path="overview" element={<OverviewPage />} />
        <Route path="agencies" element={<AgenciesPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="properties" element={<PropertyListingsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="financials" element={<FinancialsPage />} />
        <Route path="content" element={<ContentManagerPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="system" element={<SystemSecurityPage />} />
        <Route path="revenue" element={<RevenueCenterPage />} />
        <Route path="analytics" element={<AnalyticsReportsPage />} />
        <Route path="marketing" element={<MarketingCampaignsPage />} />
        <Route path="partners" element={<PartnerNetworkPage />} />
        <Route path="developers" element={<DevelopersPage />} />
        <Route path="end-users" element={<UsersPage />} />
        <Route path="placements" element={<FeaturedPlacementsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
